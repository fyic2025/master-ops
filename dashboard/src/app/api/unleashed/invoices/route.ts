import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store') || 'teelixir';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('ul_invoices')
      .select('*', { count: 'exact' })
      .eq('store', store)
      .order('invoice_date', { ascending: false });

    // Filter by status
    if (status !== 'all') {
      query = query.eq('invoice_status', status);
    }

    // Search by invoice number or customer
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get summary stats
    const { data: statsData } = await supabase
      .from('ul_invoices')
      .select('invoice_status, sub_total, bc_status')
      .eq('store', store);

    const stats = {
      total: statsData?.length || 0,
      completed: statsData?.filter(i => i.invoice_status === 'Completed').length || 0,
      parked: statsData?.filter(i => i.invoice_status === 'Parked').length || 0,
      credited: statsData?.filter(i => i.invoice_status === 'Credited').length || 0,
      totalValue: statsData?.reduce((sum, i) => sum + (i.sub_total || 0), 0) || 0,
      paid: statsData?.filter(i => i.bc_status === 'Paid').length || 0,
      unpaid: statsData?.filter(i => i.bc_status === 'Unpaid' || !i.bc_status).length || 0,
    };

    // Get last sync info
    const { data: syncData } = await supabase
      .from('ul_sync_runs')
      .select('*')
      .eq('store', store)
      .eq('sync_type', 'invoices')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      invoices: invoices || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      lastSync: syncData?.completed_at || syncData?.started_at || null,
    });
  } catch (error) {
    console.error('Error in invoices API:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
