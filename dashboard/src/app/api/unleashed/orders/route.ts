import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Generate next order number
async function getNextOrderNumber(supabase: any, store: string): Promise<string> {
  // Get the highest order number that starts with 'SO-'
  const { data } = await supabase
    .from('ul_sales_orders')
    .select('order_number')
    .eq('store', store)
    .like('order_number', 'SO-%')
    .order('order_number', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNumber = data[0].order_number;
    const numPart = parseInt(lastNumber.replace('SO-', '')) || 0;
    return `SO-${String(numPart + 1).padStart(6, '0')}`;
  }
  return 'SO-000001';
}

// POST - Create new sales order
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { store, customer_guid, lines, notes, required_date, warehouse_code } = body;

    if (!store || !customer_guid || !lines || lines.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('ul_customers')
      .select('*')
      .eq('store', store)
      .eq('guid', customer_guid)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Calculate order totals
    let subTotal = 0;
    const orderLines = [];

    for (const line of lines) {
      const lineTotal = (line.unit_price || 0) * (line.quantity || 0);
      subTotal += lineTotal;
      orderLines.push({
        product_guid: line.product_guid,
        product_code: line.product_code,
        product_description: line.product_description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: lineTotal,
        discount_rate: line.discount_rate || 0,
      });
    }

    const taxRate = 0.1; // 10% GST
    const taxTotal = subTotal * taxRate;
    const total = subTotal + taxTotal;

    // Generate order number and GUID
    const orderNumber = await getNextOrderNumber(supabase, store);
    const orderGuid = uuidv4();

    // Create the order
    const newOrder = {
      store,
      guid: orderGuid,
      order_number: orderNumber,
      order_date: new Date().toISOString(),
      required_date: required_date || new Date().toISOString(),
      order_status: 'Placed',
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      customer_guid: customer.guid,
      sub_total: subTotal,
      tax_total: taxTotal,
      total,
      warehouse_code: warehouse_code || 'MAIN',
      sales_order_lines: orderLines,
      notes,
      source: 'dashboard', // Track that this was created in our system
      raw_data: {
        created_in_dashboard: true,
        created_at: new Date().toISOString(),
        lines: orderLines,
      },
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: order, error: orderError } = await supabase
      .from('ul_sales_orders')
      .insert(newOrder)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order,
      order_number: orderNumber,
    });
  } catch (error) {
    console.error('Error in orders POST:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

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
