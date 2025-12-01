import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Lazy init - only runs at request time, not build time
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Map status filter to database status values
const STATUS_MAP: Record<string, string[]> = {
  new: ['pending', 'ready'],
  printed: ['printed'],
  shipped: ['shipped', 'delivered'],
  archived: ['cancelled'],
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  const { searchParams } = new URL(request.url)
  const business = searchParams.get('business') || 'home'
  const status = searchParams.get('status') || 'new'

  try {
    let query = supabase
      .from('shipping_orders')
      .select('*')
      .order('order_date', { ascending: false })

    if (business !== 'home') {
      query = query.eq('business_code', business)
    } else {
      query = query.in('business_code', ['boo', 'teelixir', 'elevate'])
    }

    const statusValues = STATUS_MAP[status] || ['pending']
    query = query.in('status', statusValues)

    const { data: orders, error } = await query.limit(100)
    if (error) throw error

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

    const counts = Object.fromEntries(await Promise.all(countsPromises))

    const transformedOrders = (orders || []).map(order => ({
      id: order.id,
      order_number: order.source_order_number || order.source_order_id,
      source: order.source,
      source_order_id: order.source_order_id,
      business_code: order.business_code,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      // Full shipping address
      ship_to_name: order.ship_to_name,
      ship_to_company: order.ship_to_company,
      ship_to_address1: order.ship_to_address1,
      ship_to_address2: order.ship_to_address2,
      ship_to_city: order.ship_to_city,
      ship_to_state: order.ship_to_state,
      ship_to_postcode: order.ship_to_postcode,
      ship_to_country: order.ship_to_country,
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

    return NextResponse.json({ orders: transformedOrders, counts })
  } catch (error: any) {
    console.error('Shipping API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
