import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface TrendDataPoint {
  period: string
  period_label: string
  product_type: string
  units_sold: number
  revenue: number
  gross: number
  margin: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const searchParams = request.nextUrl.searchParams

    // Get params
    const groupCode = searchParams.get('group') // Optional - filter by distributor group
    const periodType = searchParams.get('period') || 'monthly' // 'monthly' or 'quarterly'
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    // Get distributors (optionally filtered by group)
    let distributorsQuery = supabase
      .from('tlx_distributors')
      .select(`
        id,
        customer_code,
        distributor_group_id,
        tlx_distributor_groups(group_code, group_name)
      `)
      .eq('is_distributor', true)

    const { data: distributors, error: distError } = await distributorsQuery

    if (distError) {
      console.error('Distributors error:', distError)
      return NextResponse.json({ error: distError.message }, { status: 500 })
    }

    // Filter by group if specified
    let filteredDistributors = distributors || []
    if (groupCode) {
      filteredDistributors = distributors?.filter(d => {
        const group = d.tlx_distributor_groups as any
        return group?.group_code === groupCode
      }) || []
    }

    const distributorIds = filteredDistributors.map(d => d.id)

    if (distributorIds.length === 0) {
      return NextResponse.json({
        trends: [],
        groups: [],
        productTypes: []
      })
    }

    // Get orders with date filter
    let ordersQuery = supabase
      .from('tlx_distributor_orders')
      .select('id, distributor_id, order_date')
      .in('distributor_id', distributorIds)

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

    const orderIds = orders?.map(o => o.id) || []

    if (orderIds.length === 0) {
      return NextResponse.json({
        trends: [],
        groups: await getDistributorGroups(supabase),
        productTypes: await getProductTypes(supabase)
      })
    }

    // Get line items with product info (including product_type)
    let lineItemsData: any[] = []
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
          tlx_products(product_type, cost_price)
        `)
        .in('order_id', batchIds)

      if (batchItems) {
        lineItemsData.push(...batchItems)
      }
    }

    // Create order lookup with dates
    const orderDateMap = new Map<string, string>()
    for (const order of orders || []) {
      orderDateMap.set(order.id, order.order_date)
    }

    // Aggregate by period and product_type
    const trendMap = new Map<string, TrendDataPoint>()

    for (const item of lineItemsData) {
      const orderDate = orderDateMap.get(item.order_id)
      if (!orderDate) continue

      const product = item.tlx_products as any
      const productType = product?.product_type || 'Other'
      const costPrice = Number(product?.cost_price) || 0

      const quantity = Number(item.quantity_ordered) || 0
      const unitPrice = Number(item.unit_price) || 0
      const lineTotal = Number(item.line_total) || 0

      // Calculate period key
      const date = new Date(orderDate)
      let periodKey: string
      let periodLabel: string

      if (periodType === 'quarterly') {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        const year = date.getFullYear()
        periodKey = `${year}-Q${quarter}`
        periodLabel = `Q${quarter} ${year}`
      } else {
        // Monthly
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        periodKey = `${year}-${String(month).padStart(2, '0')}`
        periodLabel = date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
      }

      const mapKey = `${periodKey}|${productType}`

      if (!trendMap.has(mapKey)) {
        trendMap.set(mapKey, {
          period: periodKey,
          period_label: periodLabel,
          product_type: productType,
          units_sold: 0,
          revenue: 0,
          gross: 0,
          margin: 0
        })
      }

      const point = trendMap.get(mapKey)!
      point.units_sold += quantity
      point.revenue += lineTotal
      point.gross += lineTotal
      if (costPrice > 0) {
        point.margin += (unitPrice - costPrice) * quantity
      }
    }

    // Convert to array and sort by period
    const trends = Array.from(trendMap.values()).sort((a, b) => {
      if (a.period !== b.period) return a.period.localeCompare(b.period)
      return a.product_type.localeCompare(b.product_type)
    })

    // Get available groups and product types
    const groups = await getDistributorGroups(supabase)
    const productTypes = await getProductTypes(supabase)

    return NextResponse.json({
      trends,
      groups,
      productTypes,
      dateRange: { from: fromDate, to: toDate },
      groupFilter: groupCode
    })
  } catch (error: any) {
    console.error('Trends API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getDistributorGroups(supabase: any) {
  const { data } = await supabase
    .from('tlx_distributor_groups')
    .select('group_code, group_name, region')
    .eq('is_active', true)
    .order('group_name')

  return data || []
}

async function getProductTypes(supabase: any) {
  const { data } = await supabase
    .from('tlx_products')
    .select('product_type')
    .not('product_type', 'is', null)
    .eq('is_sellable', true)

  // Get unique types
  const types = new Set<string>()
  for (const p of data || []) {
    if (p.product_type) types.add(p.product_type)
  }

  return Array.from(types).sort()
}
