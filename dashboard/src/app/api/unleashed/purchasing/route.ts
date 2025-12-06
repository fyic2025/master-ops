import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const store = searchParams.get('store') || 'teelixir';
    const view = searchParams.get('view') || 'orders'; // orders or suppliers
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (view === 'suppliers') {
      // Fetch suppliers
      let query = supabase
        .from('ul_suppliers')
        .select('*', { count: 'exact' })
        .eq('store', store)
        .order('supplier_name', { ascending: true });

      if (search) {
        query = query.or(`supplier_name.ilike.%${search}%,supplier_code.ilike.%${search}%,email.ilike.%${search}%`);
      }

      query = query.range(offset, offset + limit - 1);

      const { data: suppliers, error, count } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get supplier stats
      const { data: allSuppliers } = await supabase
        .from('ul_suppliers')
        .select('obsolete')
        .eq('store', store);

      return NextResponse.json({
        suppliers: suppliers || [],
        stats: {
          total: allSuppliers?.length || 0,
          active: allSuppliers?.filter(s => !s.obsolete).length || 0,
          obsolete: allSuppliers?.filter(s => s.obsolete).length || 0,
        },
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // Fetch purchase orders
    let query = supabase
      .from('ul_purchase_orders')
      .select('*', { count: 'exact' })
      .eq('store', store)
      .order('order_date', { ascending: false });

    if (status !== 'all') {
      query = query.eq('order_status', status);
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get PO stats
    const { data: statsData } = await supabase
      .from('ul_purchase_orders')
      .select('order_status, sub_total')
      .eq('store', store);

    const stats = {
      total: statsData?.length || 0,
      completed: statsData?.filter(o => o.order_status === 'Completed').length || 0,
      parked: statsData?.filter(o => o.order_status === 'Parked').length || 0,
      placed: statsData?.filter(o => o.order_status === 'Placed').length || 0,
      totalValue: statsData?.reduce((sum, o) => sum + (o.sub_total || 0), 0) || 0,
    };

    // Get last sync info
    const { data: syncData } = await supabase
      .from('ul_sync_runs')
      .select('*')
      .eq('store', store)
      .eq('sync_type', 'purchasing')
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
    console.error('Error in purchasing API:', error);
    return NextResponse.json({ error: 'Failed to fetch purchasing data' }, { status: 500 });
  }
}
