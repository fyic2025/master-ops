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

// Get date X months ago in ISO format
function getMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString()
}

// Map BigCommerce status to our status
function mapBCStatus(statusId: number): string {
  // BC statuses: 1=Pending, 2=Shipped, 5=Cancelled, 9=Awaiting Payment, 10=Awaiting Pickup, 11=Awaiting Shipment, 12=Completed
  switch (statusId) {
    case 2:
    case 12:
      return 'shipped'
    case 5:
      return 'cancelled'
    case 11:
    case 10:
      return 'pending'
    default:
      return 'pending'
  }
}

// Map Shopify fulfillment status to our status
function mapShopifyStatus(fulfillmentStatus: string | null, financialStatus: string): string {
  if (fulfillmentStatus === 'fulfilled') return 'shipped'
  if (financialStatus === 'refunded' || financialStatus === 'voided') return 'cancelled'
  return 'pending'
}

// Business to platform mapping
const BUSINESS_PLATFORMS: Record<string, string[]> = {
  boo: ['bigcommerce'],
  teelixir: ['shopify', 'unleashed'],
  elevate: ['shopify', 'unleashed'],
}

// Fetch BigCommerce orders for BOO - configurable historical months
async function fetchBigCommerceOrders(months: number = 0) {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN

  if (!storeHash || !accessToken) {
    console.log('BigCommerce credentials not configured')
    return []
  }

  try {
    const allOrders: any[] = []
    let page = 1
    const limit = 250
    const minDate = months > 0 ? getMonthsAgo(months) : null
    const historical = months > 0

    // If historical, fetch all orders from specified months; otherwise just awaiting shipment
    const baseUrl = historical && minDate
      ? `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?min_date_created=${encodeURIComponent(minDate)}&sort=date_created:desc&limit=${limit}`
      : `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?status_id=11&limit=${limit}`

    while (true) {
      const url = `${baseUrl}&page=${page}`
      console.log(`Fetching BigCommerce page ${page}...`)

      const res = await fetch(url, {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json',
        },
      })

      if (!res.ok) {
        // 204 = no content (no more orders)
        if (res.status === 204) break
        console.error('BigCommerce API error:', res.status)
        break
      }

      const orders = await res.json()
      if (!Array.isArray(orders) || orders.length === 0) break

      // Filter out cancelled orders for historical sync
      const filteredOrders = historical
        ? orders.filter((o: any) => o.status_id !== 5) // Exclude cancelled
        : orders

      allOrders.push(...filteredOrders)
      console.log(`  Got ${filteredOrders.length} orders (total: ${allOrders.length})`)

      if (orders.length < limit) break
      page++

      // Safety limit
      if (page > 20) {
        console.log('Reached page limit, stopping')
        break
      }
    }

    console.log(`BigCommerce: Total ${allOrders.length} orders fetched`)

    // Transform to our format - need to fetch shipping addresses and products separately
    const transformedOrders = []
    for (const order of allOrders) {
      // Fetch shipping addresses for this order
      let shippingAddress: any = null
      try {
        const addrRes = await fetch(
          `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${order.id}/shipping_addresses`,
          {
            headers: {
              'X-Auth-Token': accessToken,
              'Accept': 'application/json',
            },
          }
        )
        if (addrRes.ok) {
          const addresses = await addrRes.json()
          shippingAddress = addresses?.[0]
        }
      } catch (err) {
        console.error(`Error fetching shipping address for order ${order.id}:`, err)
      }

      // Fetch products to calculate total weight
      let totalWeightGrams = 0
      try {
        const productsRes = await fetch(
          `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${order.id}/products`,
          {
            headers: {
              'X-Auth-Token': accessToken,
              'Accept': 'application/json',
            },
          }
        )
        if (productsRes.ok) {
          const products = await productsRes.json()
          // BC stores weight in oz or lb depending on store settings, but fixed_shipping_cost weight is often in grams
          // The weight field is typically in the store's configured unit (usually kg or lb)
          // We'll assume kg and convert to grams
          for (const product of products) {
            const weight = parseFloat(product.weight) || 0
            const qty = parseInt(product.quantity) || 1
            // BigCommerce weight is typically in kg, convert to grams
            totalWeightGrams += Math.round(weight * 1000 * qty)
          }
        }
      } catch (err) {
        console.error(`Error fetching products for order ${order.id}:`, err)
      }

      transformedOrders.push({
        business_code: 'boo',
        source: 'bigcommerce',
        source_order_id: String(order.id),
        source_order_number: String(order.id),
        customer_name: `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim(),
        customer_email: order.billing_address?.email || '',
        customer_phone: order.billing_address?.phone || '',
        ship_to_name: shippingAddress ? `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim() : '',
        ship_to_company: shippingAddress?.company || '',
        ship_to_address1: shippingAddress?.street_1 || '',
        ship_to_address2: shippingAddress?.street_2 || '',
        ship_to_city: shippingAddress?.city || '',
        ship_to_state: shippingAddress?.state || '',
        ship_to_postcode: shippingAddress?.zip || '',
        ship_to_country: shippingAddress?.country_iso2 || 'AU',
        order_date: order.date_created,
        item_count: order.items_total || 0,
        total_weight_grams: totalWeightGrams || null,
        order_total: parseFloat(order.total_inc_tax) || 0,
        status: mapBCStatus(order.status_id),
        source_data: order,
      })
    }

    return transformedOrders
  } catch (error) {
    console.error('Error fetching BigCommerce orders:', error)
    return []
  }
}

// Fetch Shopify orders - configurable historical months
async function fetchShopifyOrders(businessCode: 'teelixir' | 'elevate', months: number = 0) {
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
    const allOrders: any[] = []
    const minDate = months > 0 ? getMonthsAgo(months) : null
    const historical = months > 0
    const limit = 250

    // If historical, fetch all orders from specified months; otherwise just unfulfilled
    let url = historical && minDate
      ? `https://${shopDomain}/admin/api/2024-01/orders.json?created_at_min=${encodeURIComponent(minDate)}&status=any&limit=${limit}`
      : `https://${shopDomain}/admin/api/2024-01/orders.json?fulfillment_status=unfulfilled&status=open&limit=${limit}`

    let pageCount = 0
    while (url) {
      pageCount++
      console.log(`Fetching ${businessCode} Shopify page ${pageCount}...`)

      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        console.error(`Shopify API error for ${businessCode}:`, res.status)
        break
      }

      const data = await res.json()
      const orders = data.orders || []

      if (orders.length === 0) break

      // Filter out cancelled/refunded for historical sync
      const filteredOrders = historical
        ? orders.filter((o: any) => o.cancelled_at === null)
        : orders

      allOrders.push(...filteredOrders)
      console.log(`  Got ${filteredOrders.length} orders (total: ${allOrders.length})`)

      // Check for next page via Link header
      const linkHeader = res.headers.get('Link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        url = match ? match[1] : ''
      } else {
        url = ''
      }

      // Safety limit
      if (pageCount > 20) {
        console.log('Reached page limit, stopping')
        break
      }
    }

    console.log(`Shopify ${businessCode}: Total ${allOrders.length} orders fetched`)

    // Transform to our format
    return allOrders.map((order: any) => ({
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
      status: mapShopifyStatus(order.fulfillment_status, order.financial_status),
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
  const supabase = getSupabase()
  try {
    const body = await request.json()
    const business = body.business || 'home'
    // Accept months parameter (0 = new orders only, 1+ = historical months)
    const months = typeof body.months === 'number' ? Math.max(0, Math.min(body.months, 12)) : 0

    if (months > 0) {
      console.log(`Historical sync requested - fetching ${months} month(s) of orders`)
    }

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
            orders = await fetchBigCommerceOrders(months)
            break
          case 'shopify':
            orders = await fetchShopifyOrders(biz as 'teelixir' | 'elevate', months)
            break
          case 'unleashed':
            orders = await fetchUnleashedOrders(biz as 'teelixir' | 'elevate')
            break
        }

        // Upsert orders to Supabase in batches
        const batchSize = 50
        for (let i = 0; i < orders.length; i += batchSize) {
          const batch = orders.slice(i, i + batchSize)

          for (const order of batch) {
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

          if (orders.length > batchSize) {
            console.log(`  Upserted ${Math.min(i + batchSize, orders.length)}/${orders.length} orders`)
          }
        }
      }
    }

    console.log(`Sync complete: ${totalSynced} synced, ${totalErrors} errors`)

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      errors: totalErrors,
      businesses: businessesToSync,
      months,
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}
