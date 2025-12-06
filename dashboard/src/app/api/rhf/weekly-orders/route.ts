import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Get current week's Monday
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('week_start') || getWeekStart()

  try {
    // Get suppliers
    const { data: suppliers } = await getSupabase()
      .from('rhf_suppliers')
      .select('id, name, code')
      .eq('active', true)
      .order('name')

    // Get box types
    const { data: boxes } = await getSupabase()
      .from('rhf_boxes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    // Get existing orders for this week
    const { data: orders } = await getSupabase()
      .from('rhf_weekly_orders')
      .select(`
        *,
        rhf_suppliers(name, code)
      `)
      .eq('week_start', weekStart)

    // Get order lines
    const orderIds = orders?.map(o => o.id) || []
    const { data: orderLines } = await getSupabase()
      .from('rhf_order_lines')
      .select(`
        *,
        rhf_supplier_products(name, unit, cost_price)
      `)
      .in('order_id', orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000'])

    // Get latest available products from each supplier
    const { data: availableProducts } = await getSupabase()
      .from('rhf_supplier_products')
      .select(`
        id,
        supplier_id,
        name,
        unit,
        cost_price,
        category,
        is_available,
        quality_days,
        weight_kg
      `)
      .eq('is_available', true)
      .order('name')
      .limit(1000)

    // Group products by supplier
    const productsBySupplier: Record<string, any[]> = {}
    for (const product of availableProducts || []) {
      if (!productsBySupplier[product.supplier_id]) {
        productsBySupplier[product.supplier_id] = []
      }
      productsBySupplier[product.supplier_id].push(product)
    }

    // Build summary
    const summary = {
      week_start: weekStart,
      total_orders: orders?.length || 0,
      total_value: orders?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0,
      by_supplier: suppliers?.map(s => {
        const order = orders?.find(o => o.supplier_id === s.id)
        return {
          id: s.id,
          name: s.name,
          code: s.code,
          order_id: order?.id,
          status: order?.status || 'none',
          total: order?.total || 0,
          line_count: order?.line_count || 0,
          available_products: productsBySupplier[s.id]?.length || 0
        }
      }) || []
    }

    return NextResponse.json({
      summary,
      suppliers,
      boxes,
      orders,
      orderLines: orderLines || [],
      productsBySupplier
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// Create or update an order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplier_id, week_start, lines } = body

    // Calculate totals
    const subtotal = lines.reduce((sum: number, line: any) =>
      sum + (Number(line.quantity) * Number(line.unit_price)), 0)
    const gst = subtotal * 0.1
    const total = subtotal + gst

    // Upsert the order
    const { data: order, error: orderError } = await getSupabase()
      .from('rhf_weekly_orders')
      .upsert({
        supplier_id,
        week_start,
        status: 'draft',
        subtotal,
        gst,
        total,
        line_count: lines.length
      }, {
        onConflict: 'supplier_id,week_start'
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order error:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Delete existing lines and insert new ones
    await getSupabase()
      .from('rhf_order_lines')
      .delete()
      .eq('order_id', order.id)

    if (lines.length > 0) {
      const { error: linesError } = await getSupabase()
        .from('rhf_order_lines')
        .insert(lines.map((line: any) => ({
          order_id: order.id,
          supplier_product_id: line.supplier_product_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          line_total: line.quantity * line.unit_price,
          notes: line.notes
        })))

      if (linesError) {
        console.error('Lines error:', linesError)
        return NextResponse.json({ error: linesError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
  }
}

// Update order status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, status } = body

    const { data, error } = await getSupabase()
      .from('rhf_weekly_orders')
      .update({
        status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : undefined
      })
      .eq('id', order_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, order: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
