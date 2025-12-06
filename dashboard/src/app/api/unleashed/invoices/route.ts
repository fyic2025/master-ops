import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Generate next invoice number in sequence
async function getNextInvoiceNumber(supabase: any, store: string): Promise<string> {
  const { data } = await supabase
    .from('ul_invoices')
    .select('invoice_number')
    .eq('store', store)
    .like('invoice_number', 'INV-%')
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number;
    const numPart = parseInt(lastNumber.replace('INV-', '')) || 0;
    return `INV-${String(numPart + 1).padStart(6, '0')}`;
  }
  return 'INV-000001';
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

// POST - Create invoice from sales order
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { store, order_id, due_days = 14 } = body;

    if (!store || !order_id) {
      return NextResponse.json(
        { error: 'Missing required fields: store, order_id' },
        { status: 400 }
      );
    }

    // Fetch the sales order
    const { data: order, error: orderError } = await supabase
      .from('ul_sales_orders')
      .select('*')
      .eq('id', order_id)
      .eq('store', store)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await supabase
      .from('ul_invoices')
      .select('invoice_number')
      .eq('sales_order_number', order.order_number)
      .eq('store', store)
      .single();

    if (existingInvoice) {
      return NextResponse.json(
        { error: `Invoice already exists: ${existingInvoice.invoice_number}` },
        { status: 400 }
      );
    }

    // Generate invoice number
    const invoiceNumber = await getNextInvoiceNumber(supabase, store);
    const invoiceGuid = uuidv4();
    const invoiceDate = new Date().toISOString();
    const dueDate = new Date(Date.now() + due_days * 24 * 60 * 60 * 1000).toISOString();

    // Create invoice record
    const invoiceData = {
      guid: invoiceGuid,
      store,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      invoice_status: 'Completed',
      customer_guid: order.customer_guid,
      customer_code: order.customer_code,
      customer_name: order.customer_name,
      sub_total: order.sub_total,
      tax_total: order.tax_total,
      total: order.total,
      bc_status: 'Unpaid',
      sales_order_number: order.order_number,
      warehouse_code: order.warehouse_code,
      invoice_lines: order.sales_order_lines,
      source: 'dashboard',
      raw_data: {
        created_from_order: order_id,
        created_at: invoiceDate,
        order_data: order,
      },
      created_at: invoiceDate,
      updated_at: invoiceDate,
    };

    const { error: insertError } = await supabase
      .from('ul_invoices')
      .insert(invoiceData);

    if (insertError) {
      console.error('Error creating invoice:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Update sales order status to Completed
    await supabase
      .from('ul_sales_orders')
      .update({
        order_status: 'Completed',
        updated_at: invoiceDate,
      })
      .eq('id', order_id);

    return NextResponse.json({
      success: true,
      invoice_number: invoiceNumber,
      invoice_guid: invoiceGuid,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
