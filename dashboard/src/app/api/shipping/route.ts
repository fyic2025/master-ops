import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map status filter to database status values
const STATUS_MAP: Record<string, string[]> = {
  new: ['pending', 'ready'],
  printed: ['printed'],
  shipped: ['shipped', 'delivered'],
  archived: ['cancelled'],
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'home'
  const status = searchParams.get('status') || 'new'

  try {
    // Build base query
    let query = supabase
      .from('shipping_orders')
      .select('*')
      .order('order_date', { ascending: false })

    // Filter by business (home = all shipping businesses)
    if (business !== 'home') {
      query = query.eq('business_code', business)
    } else {
      // Home shows BOO, Teelixir, Elevate
      query = query.in('business_code', ['boo', 'teelixir', 'elevate'])
    }

    // Filter by status
    const statusValues = STATUS_MAP[status] || ['pending']
    query = query.in('status', statusValues)

    const { data: orders, error } = await query.limit(100)

    if (error) throw error

    // Get counts for all tabs
    const countsPromises = Object.entries(STATUS_MAP).map(async ([tab, statuses]) => {
      let countQuery = supabase
        .from('shipping_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', statuses)

      if (business !== 'home') {
        countQuery = countQuery.eq('business_code', business)
      } else {
        countQuery = countQuery.in('business_code', ['boo', 'teelixir', 'elevate'])
      }

      const { count } = await countQuery
      return [tab, count || 0]
    })

    const countsArray = await Promise.all(countsPromises)
    const counts = Object.fromEntries(countsArray)

    // Transform orders for frontend
    const transformedOrders = (orders || []).map(order => ({
      id: order.id,
      order_number: order.source_order_number || order.source_order_id,
      source: order.source,
      source_order_id: order.source_order_id,
      business_code: order.business_code,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      ship_to_city: order.ship_to_city,
      ship_to_state: order.ship_to_state,
      ship_to_country: order.ship_to_country,
      ship_to_postcode: order.ship_to_postcode,
      order_date: order.order_date,
      item_count: order.item_count,
      total_weight_grams: order.total_weight_grams,
      order_total: order.order_total,
      status: order.status === 'pending' || order.status === 'ready' ? 'new' : order.status,
      carrier: order.carrier,
      service_code: order.service_code,
      tracking_number: order.tracking_number,
      manifest_number: null,
    }))

    return NextResponse.json({
      orders: transformedOrders,
      counts,
    })
  } catch (error: any) {
    console.error('Error fetching shipping orders:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
