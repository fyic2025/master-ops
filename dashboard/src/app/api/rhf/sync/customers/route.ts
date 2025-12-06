import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// WooCommerce REST API client
async function wooRequest(endpoint: string, params: Record<string, string> = {}) {
  const baseUrl = process.env.REDHILLFRESH_WP_URL || 'https://redhillfresh.com.au'
  const consumerKey = process.env.REDHILLFRESH_WC_CONSUMER_KEY
  const consumerSecret = process.env.REDHILLFRESH_WC_CONSUMER_SECRET

  if (!consumerKey || !consumerSecret) {
    throw new Error('Missing WooCommerce credentials')
  }

  const url = new URL(`${baseUrl}/wp-json/wc/v3/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    throw new Error(`WooCommerce API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// Trigger customer sync - called by n8n on schedule
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify auth header for n8n calls
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.N8N_WEBHOOK_SECRET || 'rhf-sync-2024'

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body.action || 'sync'

    // Log sync start
    await supabase.from('integration_logs').insert({
      source: 'rhf',
      service: 'customer_sync',
      operation: 'sync_start',
      level: 'info',
      status: 'pending',
      message: `Starting customer sync (action: ${action})`,
      details_json: { action, triggered_by: 'n8n' }
    })

    if (action === 'recalculate_rfm') {
      // Just recalculate RFM scores
      const { error } = await supabase.rpc('rhf_calculate_rfm')

      if (error) {
        throw new Error(`RFM calculation failed: ${error.message}`)
      }

      const elapsed = Date.now() - startTime

      await supabase.from('integration_logs').insert({
        source: 'rhf',
        service: 'customer_sync',
        operation: 'rfm_recalculate',
        level: 'info',
        status: 'success',
        message: `RFM recalculated in ${elapsed}ms`,
        details_json: { elapsed_ms: elapsed }
      })

      return NextResponse.json({
        success: true,
        action: 'recalculate_rfm',
        message: 'RFM scores recalculated',
        elapsed_ms: elapsed
      })
    }

    // Full sync - get recent orders from WooCommerce
    const daysBack = body.days || 30
    const afterDate = new Date()
    afterDate.setDate(afterDate.getDate() - daysBack)

    let ordersProcessed = 0
    let customersUpdated = 0
    let page = 1

    while (page <= 10) { // Max 10 pages (1000 orders)
      const orders = await wooRequest('orders', {
        page: String(page),
        per_page: '100',
        after: afterDate.toISOString(),
        status: 'completed'
      })

      if (!orders || orders.length === 0) break

      for (const order of orders) {
        // Upsert order
        const { error: orderError } = await supabase
          .from('rhf_woo_orders')
          .upsert({
            woo_id: order.id,
            woo_customer_id: order.customer_id,
            status: order.status,
            total: parseFloat(order.total),
            subtotal: order.subtotal ? parseFloat(order.subtotal) : null,
            shipping_total: parseFloat(order.shipping_total),
            date_created: order.date_created,
            date_completed: order.date_completed,
            line_items: order.line_items,
            item_count: order.line_items?.length || 0,
            shipping_address: order.shipping,
            last_synced_at: new Date().toISOString()
          }, { onConflict: 'woo_id' })

        if (!orderError) ordersProcessed++
      }

      page++
    }

    // Update customer stats for affected customers
    const { data: customers } = await supabase
      .from('rhf_customers')
      .select('id, woo_id')

    for (const customer of customers || []) {
      const { data: orders } = await supabase
        .from('rhf_woo_orders')
        .select('total, date_created')
        .eq('woo_customer_id', customer.woo_id)
        .eq('status', 'completed')
        .order('date_created', { ascending: false })

      if (orders && orders.length > 0) {
        const orderCount = orders.length
        const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0)
        const lastOrderDate = orders[0].date_created
        const firstOrderDate = orders[orders.length - 1].date_created
        const daysSinceOrder = Math.floor(
          (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        const { error: updateError } = await supabase
          .from('rhf_customers')
          .update({
            order_count: orderCount,
            total_spent: totalSpent,
            first_order_date: firstOrderDate,
            last_order_date: lastOrderDate,
            days_since_order: daysSinceOrder,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id)

        if (!updateError) customersUpdated++
      }
    }

    // Recalculate RFM
    await supabase.rpc('rhf_calculate_rfm')

    const elapsed = Date.now() - startTime

    // Log success
    await supabase.from('integration_logs').insert({
      source: 'rhf',
      service: 'customer_sync',
      operation: 'sync_complete',
      level: 'info',
      status: 'success',
      message: `Customer sync completed: ${ordersProcessed} orders, ${customersUpdated} customers updated`,
      details_json: {
        orders_processed: ordersProcessed,
        customers_updated: customersUpdated,
        elapsed_ms: elapsed
      }
    })

    return NextResponse.json({
      success: true,
      orders_processed: ordersProcessed,
      customers_updated: customersUpdated,
      rfm_recalculated: true,
      elapsed_ms: elapsed
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    await supabase.from('integration_logs').insert({
      source: 'rhf',
      service: 'customer_sync',
      operation: 'sync_error',
      level: 'error',
      status: 'failed',
      message: errorMessage,
      details_json: { error: errorMessage }
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// GET - Check sync status and customer stats
export async function GET() {
  try {
    // Get segment summary
    const { data: customers } = await supabase
      .from('rhf_customers')
      .select('customer_segment, total_spent')
      .gt('order_count', 0)

    const segments: Record<string, { count: number; revenue: number }> = {
      champions: { count: 0, revenue: 0 },
      loyal: { count: 0, revenue: 0 },
      regular: { count: 0, revenue: 0 },
      new: { count: 0, revenue: 0 },
      at_risk: { count: 0, revenue: 0 },
      lost: { count: 0, revenue: 0 }
    }

    customers?.forEach(c => {
      if (c.customer_segment && segments[c.customer_segment]) {
        segments[c.customer_segment].count++
        segments[c.customer_segment].revenue += Number(c.total_spent) || 0
      }
    })

    // Get latest sync logs
    const { data: logs } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('source', 'rhf')
      .eq('service', 'customer_sync')
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      status: 'ok',
      total_customers: customers?.length || 0,
      segments,
      recent_logs: logs
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
