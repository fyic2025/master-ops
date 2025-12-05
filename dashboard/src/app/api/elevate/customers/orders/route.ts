import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering - this route uses runtime environment variables
export const dynamic = 'force-dynamic'

// Create Supabase client lazily to avoid build-time errors
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

interface OrderLineItem {
  title: string
  vendor: string
  quantity: number
  price: string
  totalPrice: string
}

interface CustomerOrder {
  id: string
  name: string
  createdAt: string
  totalPrice: string
  source: 'shopify' | 'unleashed'
  lineItems: OrderLineItem[]
}

interface CustomerWithOrders {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  state: string
  tags: string[]
  createdAt: string
  isApproved: boolean
  orders: CustomerOrder[]
  metrics: {
    totalSpend: number
    orderCount: number
    avgOrderValue: number
    lastOrderDate: string | null
    brandBreakdown: Record<string, { amount: number; orderCount: number }>
  }
}

// GET - Fetch all customers with their orders from Supabase
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') // YYYY-MM-DD
    const endDate = searchParams.get('endDate') // YYYY-MM-DD

    // Fetch all customers with their pre-calculated metrics
    const { data: customers, error: customerError } = await supabase
      .from('elevate_customers')
      .select('*')
      .order('last_order_date', { ascending: false, nullsFirst: false })

    if (customerError) {
      console.error('Error fetching customers:', customerError)
      return NextResponse.json({ error: customerError.message }, { status: 500 })
    }

    const customersWithOrders: CustomerWithOrders[] = []

    if (startDate || endDate) {
      // Need to calculate metrics for the date range
      for (const customer of customers || []) {
        let ordersQuery = supabase
          .from('elevate_orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('order_date', { ascending: false })

        if (startDate) {
          ordersQuery = ordersQuery.gte('order_date', `${startDate}T00:00:00`)
        }
        if (endDate) {
          ordersQuery = ordersQuery.lte('order_date', `${endDate}T23:59:59`)
        }

        const { data: orders } = await ordersQuery

        // Calculate metrics for this date range
        const orderCount = orders?.length || 0
        const totalSpend = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0
        const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0

        const orderDates = orders?.map(o => new Date(o.order_date).getTime()) || []
        const lastOrderDate = orderDates.length > 0
          ? new Date(Math.max(...orderDates)).toISOString()
          : null

        // Calculate brand breakdown for date range
        const brandBreakdown: Record<string, { amount: number; orderCount: number }> = {}
        for (const order of orders || []) {
          const orderBrands = new Set<string>()
          for (const item of (order.line_items as any[] || [])) {
            const vendor = item.vendor || 'Unknown'
            if (!brandBreakdown[vendor]) {
              brandBreakdown[vendor] = { amount: 0, orderCount: 0 }
            }
            brandBreakdown[vendor].amount += parseFloat(item.total || '0')
            orderBrands.add(vendor)
          }
          orderBrands.forEach(brand => {
            brandBreakdown[brand].orderCount += 1
          })
        }

        // Convert orders to expected format
        const formattedOrders: CustomerOrder[] = (orders || []).map(o => ({
          id: o.source_order_id,
          name: o.order_number,
          createdAt: o.order_date,
          totalPrice: o.total.toString(),
          source: o.source as 'shopify' | 'unleashed',
          lineItems: (o.line_items as any[] || []).map(li => ({
            title: li.title,
            vendor: li.vendor,
            quantity: li.quantity,
            price: li.price,
            totalPrice: li.total
          }))
        }))

        customersWithOrders.push({
          id: customer.shopify_customer_id || `unleashed-${customer.unleashed_customer_code}`,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          state: customer.shopify_state || 'ENABLED',
          tags: customer.shopify_tags || [],
          createdAt: customer.created_at,
          isApproved: customer.is_approved,
          orders: formattedOrders,
          metrics: {
            totalSpend,
            orderCount,
            avgOrderValue,
            lastOrderDate,
            brandBreakdown
          }
        })
      }
    } else {
      // No date filter - use pre-calculated metrics (fastest path)
      for (const customer of customers || []) {
        // Fetch orders for this customer
        const { data: orders } = await supabase
          .from('elevate_orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('order_date', { ascending: false })

        const formattedOrders: CustomerOrder[] = (orders || []).map(o => ({
          id: o.source_order_id,
          name: o.order_number,
          createdAt: o.order_date,
          totalPrice: o.total.toString(),
          source: o.source as 'shopify' | 'unleashed',
          lineItems: (o.line_items as any[] || []).map(li => ({
            title: li.title,
            vendor: li.vendor,
            quantity: li.quantity,
            price: li.price,
            totalPrice: li.total
          }))
        }))

        // Convert brand breakdown format if needed
        const brandBreakdown: Record<string, { amount: number; orderCount: number }> = {}
        if (customer.brand_breakdown) {
          for (const [brand, data] of Object.entries(customer.brand_breakdown as Record<string, any>)) {
            brandBreakdown[brand] = {
              amount: data.amount || 0,
              orderCount: data.order_count || data.orderCount || 0
            }
          }
        }

        customersWithOrders.push({
          id: customer.shopify_customer_id || `unleashed-${customer.unleashed_customer_code}`,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          state: customer.shopify_state || 'ENABLED',
          tags: customer.shopify_tags || [],
          createdAt: customer.created_at,
          isApproved: customer.is_approved,
          orders: formattedOrders,
          metrics: {
            totalSpend: customer.total_spend || 0,
            orderCount: customer.total_orders || 0,
            avgOrderValue: customer.avg_order_value || 0,
            lastOrderDate: customer.last_order_date,
            brandBreakdown
          }
        })
      }
    }

    // Calculate summary
    const summary = {
      totalCustomers: customersWithOrders.length,
      customersWithOrders: customersWithOrders.filter(c => c.metrics.orderCount > 0).length,
      totalRevenue: customersWithOrders.reduce((sum, c) => sum + c.metrics.totalSpend, 0),
      totalOrders: customersWithOrders.reduce((sum, c) => sum + c.metrics.orderCount, 0),
      shopifyOrders: customersWithOrders.reduce((sum, c) =>
        sum + c.orders.filter(o => o.source === 'shopify').length, 0),
      unleashedOrders: customersWithOrders.reduce((sum, c) =>
        sum + c.orders.filter(o => o.source === 'unleashed').length, 0),
      unleashedCustomers: customersWithOrders.filter(c =>
        c.id?.toString().startsWith('unleashed-')
      ).length
    }

    return NextResponse.json({
      customers: customersWithOrders,
      summary,
      dateRange: { startDate, endDate },
      source: 'supabase' // Indicates data source for debugging
    })

  } catch (error: any) {
    console.error('Error fetching customer orders:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
