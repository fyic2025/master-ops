import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Get sequential application number
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get('id');

  if (!applicationId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the row number for this application (sequential order based on created_at)
  const { data, error } = await supabase
    .from('brand_applications')
    .select('id, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Find the position of this application in the list
  const position = data?.findIndex(app => app.id === applicationId);

  if (position === -1 || position === undefined) {
    // Application not found, generate a number from UUID
    const numFromUuid = parseInt(applicationId.replace(/-/g, '').slice(0, 8), 16) % 10000;
    return NextResponse.json({ number: numFromUuid });
  }

  // Return 1-based position (first application = 1)
  return NextResponse.json({ number: position + 1 });
}
