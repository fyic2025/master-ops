import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// This endpoint is called by n8n or a cron job to send reminder emails
// to applicants who haven't uploaded their product catalog yet

export async function POST(request: NextRequest) {
  try {
    // Verify API key for security
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.INTERNAL_API_KEY || 'brand-connections-internal';

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Find applications that:
    // 1. Completed price test but haven't uploaded final catalog
    // 2. Were created more than 24 hours ago
    // 3. Haven't been reminded in the last 3 days
    const { data: pendingApplications, error } = await supabase
      .from('brand_applications')
      .select('id, email, contact_name, brand_name, created_at')
      .eq('status', 'pending')
      .eq('price_test_completed', true)
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const reminderEmails = [];

    for (const app of pendingApplications || []) {
      // Generate upload URL with application ID
      const uploadUrl = `https://brandconnections.com.au/upload?id=${app.id}`;

      reminderEmails.push({
        to: app.email,
        name: app.contact_name,
        brandName: app.brand_name,
        applicationId: app.id,
        uploadUrl,
        subject: `${app.brand_name} - Complete Your Product Catalog Upload`,
        template: 'product-upload-reminder',
      });
    }

    // If using n8n, you can forward these to n8n webhook
    // For now, we return the list of emails to send
    // In production, this would integrate with SendGrid, Resend, or n8n

    if (process.env.N8N_WEBHOOK_URL) {
      // Send to n8n for email processing
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_reminder_emails',
          emails: reminderEmails,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      pendingCount: pendingApplications?.length || 0,
      remindersSent: reminderEmails.length,
      applications: reminderEmails.map(e => ({
        email: e.to,
        brandName: e.brandName,
        uploadUrl: e.uploadUrl,
      })),
    });

  } catch (error) {
    console.error('Reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check pending applications
export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('brand_applications')
    .select('id, brand_name, email, contact_name, status, price_test_completed, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Summary stats
  const stats = {
    total: data?.length || 0,
    pending: data?.filter(a => a.status === 'pending').length || 0,
    reviewing: data?.filter(a => a.status === 'reviewing').length || 0,
    needsUpload: data?.filter(a => a.status === 'pending' && a.price_test_completed).length || 0,
  };

  return NextResponse.json({
    stats,
    applications: data?.map(a => ({
      id: a.id,
      brandName: a.brand_name,
      email: a.email,
      status: a.status,
      priceTestDone: a.price_test_completed,
      createdAt: a.created_at,
      uploadUrl: `https://brandconnections.com.au/upload?id=${a.id}`,
    })),
  });
}
