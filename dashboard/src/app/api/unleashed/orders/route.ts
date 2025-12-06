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
      .from('ul_sales_orders')
      .select('*', { count: 'exact' })
      .eq('store', store)
      .order('order_date', { ascending: false });

    // Filter by status
    if (status !== 'all') {
      query = query.eq('order_status', status);
    }

    // Search by order number or customer
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get summary stats
    const { data: statsData } = await supabase
      .from('ul_sales_orders')
      .select('order_status, sub_total')
      .eq('store', store);

    const stats = {
      total: statsData?.length || 0,
      completed: statsData?.filter(o => o.order_status === 'Completed').length || 0,
      parked: statsData?.filter(o => o.order_status === 'Parked').length || 0,
      placed: statsData?.filter(o => o.order_status === 'Placed').length || 0,
      backordered: statsData?.filter(o => o.order_status === 'Backordered').length || 0,
      totalValue: statsData?.reduce((sum, o) => sum + (o.sub_total || 0), 0) || 0,
    };

    // Get last sync info
    const { data: syncData } = await supabase
      .from('ul_sync_runs')
      .select('*')
      .eq('store', store)
      .eq('sync_type', 'orders')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      orders: orders || [],
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
    console.error('Error in orders API:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
