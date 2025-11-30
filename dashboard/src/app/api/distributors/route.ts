import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Get date range params (optional)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    // Get distributor groups
    const { data: groups, error: groupsError } = await supabase
      .from('tlx_distributor_groups')
      .select('id, group_code, group_name, region')
      .eq('is_active', true)
      .order('group_name')

    if (groupsError) {
      console.error('Groups error:', groupsError)
      return NextResponse.json({ error: groupsError.message }, { status: 500 })
    }

    // Get distributors
    const { data: distributors, error: distError } = await supabase
      .from('tlx_distributors')
      .select(`
        id,
        customer_code,
        customer_name,
        distributor_group_id,
        first_order_date,
        last_order_date,
        tlx_distributor_groups(group_code, group_name, region)
      `)
      .eq('is_distributor', true)

    if (distError) {
      console.error('Distributors error:', distError)
      return NextResponse.json({ error: distError.message }, { status: 500 })
    }

    // Get orders with date filter
    let ordersQuery = supabase
      .from('tlx_distributor_orders')
      .select(`
        id,
        distributor_id,
        order_date,
        total
      `)

    if (fromDate) {
      ordersQuery = ordersQuery.gte('order_date', fromDate)
    }
    if (toDate) {
      ordersQuery = ordersQuery.lte('order_date', toDate)
    }

    const { data: orders, error: ordersError } = await ordersQuery

    if (ordersError) {
      console.error('Orders error:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Get line items with product costs for margin calculation
    const orderIds = orders?.map(o => o.id) || []

    let lineItemsData: any[] = []
    if (orderIds.length > 0) {
      // Batch fetch line items (Supabase has limits)
      const batchSize = 100
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batchIds = orderIds.slice(i, i + batchSize)
        const { data: batchItems } = await supabase
          .from('tlx_order_line_items')
          .select(`
            order_id,
            quantity_ordered,
            unit_price,
            line_total,
            product_code,
            tlx_products(cost_price)
          `)
          .in('order_id', batchIds)

        if (batchItems) {
          lineItemsData.push(...batchItems)
        }
      }
    }

    // Create order lookup maps
    const ordersByDistributor = new Map<string, typeof orders>()
    for (const order of orders || []) {
      const distId = order.distributor_id
      if (!ordersByDistributor.has(distId)) {
        ordersByDistributor.set(distId, [])
      }
      ordersByDistributor.get(distId)!.push(order)
    }

    // Create line items by order lookup
    const lineItemsByOrder = new Map<string, typeof lineItemsData>()
    for (const item of lineItemsData) {
      if (!lineItemsByOrder.has(item.order_id)) {
        lineItemsByOrder.set(item.order_id, [])
      }
      lineItemsByOrder.get(item.order_id)!.push(item)
    }

    // Aggregate by group with margin calculation
    const groupSummary: Record<string, {
      group_code: string
      group_name: string
      region: string
      accounts: number
      total_orders: number
      total_revenue: number
      gross: number
      margin: number
      distributors: any[]
    }> = {}

    for (const dist of distributors || []) {
      const group = dist.tlx_distributor_groups as any
      if (!group) continue

      const key = group.group_code
      if (!groupSummary[key]) {
        groupSummary[key] = {
          group_code: group.group_code,
          group_name: group.group_name,
          region: group.region,
          accounts: 0,
          total_orders: 0,
          total_revenue: 0,
          gross: 0,
          margin: 0,
          distributors: []
        }
      }

      // Get orders for this distributor
      const distOrders = ordersByDistributor.get(dist.id) || []
      const orderCount = distOrders.length

      // Calculate totals from line items
      let distRevenue = 0
      let distGross = 0
      let distMargin = 0

      for (const order of distOrders) {
        const items = lineItemsByOrder.get(order.id) || []
        for (const item of items) {
          const lineTotal = Number(item.line_total) || 0
          const quantity = Number(item.quantity_ordered) || 0
          const unitPrice = Number(item.unit_price) || 0
          const costPrice = Number((item.tlx_products as any)?.cost_price) || 0

          distRevenue += lineTotal
          distGross += lineTotal  // Gross = line_total (no discounts in Unleashed)

          // Margin = (unit_price - cost_price) * quantity
          if (costPrice > 0) {
            distMargin += (unitPrice - costPrice) * quantity
          }
        }
      }

      groupSummary[key].accounts++
      groupSummary[key].total_orders += orderCount
      groupSummary[key].total_revenue += distRevenue
      groupSummary[key].gross += distGross
      groupSummary[key].margin += distMargin

      groupSummary[key].distributors.push({
        customer_code: dist.customer_code,
        customer_name: dist.customer_name,
        total_orders: orderCount,
        total_revenue: distRevenue,
        gross: distGross,
        margin: distMargin,
        first_order_date: dist.first_order_date,
        last_order_date: dist.last_order_date
      })
    }

    // Sort by revenue descending
    const sortedGroups = Object.values(groupSummary)
      .sort((a, b) => b.total_revenue - a.total_revenue)

    // Calculate totals
    const totals = {
      accounts: sortedGroups.reduce((sum, g) => sum + g.accounts, 0),
      total_orders: sortedGroups.reduce((sum, g) => sum + g.total_orders, 0),
      total_revenue: sortedGroups.reduce((sum, g) => sum + g.total_revenue, 0),
      gross: sortedGroups.reduce((sum, g) => sum + g.gross, 0),
      margin: sortedGroups.reduce((sum, g) => sum + g.margin, 0)
    }

    // Calculate Oborne national total
    const oborneGroups = sortedGroups.filter(g => g.group_code.startsWith('OBORNE_'))
    const oborneNational = {
      accounts: oborneGroups.reduce((sum, g) => sum + g.accounts, 0),
      total_orders: oborneGroups.reduce((sum, g) => sum + g.total_orders, 0),
      total_revenue: oborneGroups.reduce((sum, g) => sum + g.total_revenue, 0),
      gross: oborneGroups.reduce((sum, g) => sum + g.gross, 0),
      margin: oborneGroups.reduce((sum, g) => sum + g.margin, 0)
    }

    return NextResponse.json({
      groups: sortedGroups,
      totals,
      oborneNational,
      distributorCount: distributors?.length || 0,
      dateRange: { from: fromDate, to: toDate }
    })
  } catch (error: any) {
    console.error('Distributors API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
