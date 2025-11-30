import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Business to platform mapping
const BUSINESS_PLATFORMS: Record<string, string[]> = {
  boo: ['bigcommerce'],
  teelixir: ['shopify', 'unleashed'],
  elevate: ['shopify', 'unleashed'],
}

// Fetch BigCommerce orders for BOO
async function fetchBigCommerceOrders() {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN

  if (!storeHash || !accessToken) {
    console.log('BigCommerce credentials not configured')
    return []
  }

  try {
    // Fetch orders with status awaiting_shipment (11)
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?status_id=11&limit=50`,
      {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json',
        },
      }
    )

    if (!res.ok) {
      console.error('BigCommerce API error:', res.status)
      return []
    }

    const orders = await res.json()

    // Transform to our format
    return orders.map((order: any) => ({
      business_code: 'boo',
      source: 'bigcommerce',
      source_order_id: String(order.id),
      source_order_number: String(order.id),
      customer_name: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
      customer_email: order.billing_address?.email || '',
      customer_phone: order.billing_address?.phone || '',
      ship_to_name: `${order.shipping_addresses?.[0]?.first_name || ''} ${order.shipping_addresses?.[0]?.last_name || ''}`.trim(),
      ship_to_company: order.shipping_addresses?.[0]?.company || '',
      ship_to_address1: order.shipping_addresses?.[0]?.street_1 || '',
      ship_to_address2: order.shipping_addresses?.[0]?.street_2 || '',
      ship_to_city: order.shipping_addresses?.[0]?.city || '',
      ship_to_state: order.shipping_addresses?.[0]?.state || '',
      ship_to_postcode: order.shipping_addresses?.[0]?.zip || '',
      ship_to_country: order.shipping_addresses?.[0]?.country_iso2 || 'AU',
      order_date: order.date_created,
      item_count: order.items_total || 0,
      order_total: parseFloat(order.total_inc_tax) || 0,
      status: 'pending',
      source_data: order,
    }))
  } catch (error) {
    console.error('Error fetching BigCommerce orders:', error)
    return []
  }
}

// Fetch Shopify orders
async function fetchShopifyOrders(businessCode: 'teelixir' | 'elevate') {
  const shopDomain = businessCode === 'teelixir'
    ? process.env.TEELIXIR_SHOPIFY_DOMAIN
    : process.env.ELEVATE_SHOPIFY_DOMAIN
  const accessToken = businessCode === 'teelixir'
    ? process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN
    : process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN

  if (!shopDomain || !accessToken) {
    console.log(`Shopify credentials not configured for ${businessCode}`)
    return []
  }

  try {
    // Fetch unfulfilled orders
    const res = await fetch(
      `https://${shopDomain}/admin/api/2024-01/orders.json?fulfillment_status=unfulfilled&status=open&limit=50`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      console.error(`Shopify API error for ${businessCode}:`, res.status)
      return []
    }

    const data = await res.json()
    const orders = data.orders || []

    // Transform to our format
    return orders.map((order: any) => ({
      business_code: businessCode,
      source: 'shopify',
      source_order_id: String(order.id),
      source_order_number: order.name || String(order.order_number),
      customer_name: order.shipping_address?.name || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      customer_email: order.email || order.customer?.email || '',
      customer_phone: order.shipping_address?.phone || order.phone || '',
      ship_to_name: order.shipping_address?.name || '',
      ship_to_company: order.shipping_address?.company || '',
      ship_to_address1: order.shipping_address?.address1 || '',
      ship_to_address2: order.shipping_address?.address2 || '',
      ship_to_city: order.shipping_address?.city || '',
      ship_to_state: order.shipping_address?.province_code || order.shipping_address?.province || '',
      ship_to_postcode: order.shipping_address?.zip || '',
      ship_to_country: order.shipping_address?.country_code || 'AU',
      order_date: order.created_at,
      item_count: order.line_items?.length || 0,
      total_weight_grams: order.total_weight,
      order_total: parseFloat(order.total_price) || 0,
      status: 'pending',
      source_data: order,
    }))
  } catch (error) {
    console.error(`Error fetching Shopify orders for ${businessCode}:`, error)
    return []
  }
}

// Fetch Unleashed orders (for orders placed outside Shopify)
async function fetchUnleashedOrders(businessCode: 'teelixir' | 'elevate') {
  const apiId = businessCode === 'teelixir'
    ? process.env.TEELIXIR_UNLEASHED_API_ID
    : process.env.ELEVATE_UNLEASHED_API_ID
  const apiKey = businessCode === 'teelixir'
    ? process.env.TEELIXIR_UNLEASHED_API_KEY
    : process.env.ELEVATE_UNLEASHED_API_KEY

  if (!apiId || !apiKey) {
    console.log(`Unleashed credentials not configured for ${businessCode}`)
    return []
  }

  // Unleashed requires HMAC signature - skip for now if complex
  // TODO: Implement Unleashed sync
  console.log(`Unleashed sync not yet implemented for ${businessCode}`)
  return []
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const business = body.business || 'home'

    // Determine which businesses to sync
    const businessesToSync = business === 'home'
      ? ['boo', 'teelixir', 'elevate']
      : [business]

    let totalSynced = 0
    let totalErrors = 0

    for (const biz of businessesToSync) {
      const platforms = BUSINESS_PLATFORMS[biz] || []

      for (const platform of platforms) {
        let orders: any[] = []

        switch (platform) {
          case 'bigcommerce':
            orders = await fetchBigCommerceOrders()
            break
          case 'shopify':
            orders = await fetchShopifyOrders(biz as 'teelixir' | 'elevate')
            break
          case 'unleashed':
            orders = await fetchUnleashedOrders(biz as 'teelixir' | 'elevate')
            break
        }

        // Upsert orders to Supabase
        for (const order of orders) {
          try {
            const { error } = await supabase
              .from('shipping_orders')
              .upsert(order, {
                onConflict: 'business_code,source,source_order_id',
                ignoreDuplicates: false,
              })

            if (error) {
              console.error('Upsert error:', error)
              totalErrors++
            } else {
              totalSynced++
            }
          } catch (err) {
            console.error('Error upserting order:', err)
            totalErrors++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      errors: totalErrors,
      businesses: businessesToSync,
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}
