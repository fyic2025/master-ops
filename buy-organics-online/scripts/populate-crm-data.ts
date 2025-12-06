/**
 * Populate CRM Database from Existing Data Sources
 *
 * This script:
 * 1. Fetches all orders from BigCommerce
 * 2. Creates customer profiles from order data
 * 3. Imports Klaviyo email profiles
 * 4. Populates order_items from orders
 * 5. Creates customer interactions from order events
 * 6. Calculates initial customer metrics (CLV, RFM)
 *
 * Run: npx tsx populate-crm-data.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import axios, { AxiosInstance } from 'axios'

// =============================================================================
// CONFIGURATION
// =============================================================================

// NOTE: In production, use environment variables
const SUPABASE_URL = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const BC_STORE_HASH = process.env.BOO_BC_STORE_HASH || 'hhhi'
const BC_ACCESS_TOKEN = process.env.BOO_BC_ACCESS_TOKEN || 'd9y2srla3treynpbtmp4f3u1bomdna2'

const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY || '' // Add your Klaviyo private API key

// =============================================================================
// TYPES
// =============================================================================

interface BCOrder {
  id: number
  customer_id: number
  status_id: number
  status: string
  subtotal_ex_tax: string
  subtotal_inc_tax: string
  total_ex_tax: string
  total_inc_tax: string
  items_total: number
  items_shipped: number
  discount_amount: string
  coupon_discount: string
  shipping_cost_ex_tax: string
  shipping_cost_inc_tax: string
  date_created: string
  date_modified: string
  date_shipped?: string
  payment_method: string
  billing_address: BCAddress
  products: {
    url: string
  }
  shipping_addresses: {
    url: string
  }
}

interface BCAddress {
  first_name: string
  last_name: string
  company: string
  street_1: string
  street_2: string
  city: string
  state: string
  zip: string
  country: string
  country_iso2: string
  phone: string
  email: string
}

interface BCOrderProduct {
  id: number
  order_id: number
  product_id: number
  variant_id: number
  sku: string
  name: string
  brand: string
  quantity: number
  price_ex_tax: string
  price_inc_tax: string
  total_ex_tax: string
  total_inc_tax: string
  cost_price_ex_tax?: string
  product_options?: any[]
}

interface BCCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  company: string
  phone: string
  date_created: string
  date_modified: string
  addresses: {
    url: string
  }
}

interface KlaviyoProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  properties?: Record<string, any>
  subscriptions?: any
  created?: string
  updated?: string
}

// =============================================================================
// INITIALIZE CLIENTS
// =============================================================================

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const bcApi: AxiosInstance = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${BC_STORE_HASH}`,
  headers: {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Rate limiting for BigCommerce API
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// =============================================================================
// BIGCOMMERCE DATA FETCHING
// =============================================================================

async function fetchAllBCOrders(): Promise<BCOrder[]> {
  console.log('📦 Fetching BigCommerce orders...')
  const allOrders: BCOrder[] = []
  let page = 1
  const limit = 250

  while (true) {
    try {
      const response = await bcApi.get(`/v2/orders`, {
        params: { page, limit }
      })

      const orders = response.data as BCOrder[]
      if (!orders || orders.length === 0) break

      allOrders.push(...orders)
      console.log(`   Fetched page ${page}: ${orders.length} orders (total: ${allOrders.length})`)

      if (orders.length < limit) break
      page++

      await sleep(200) // Rate limiting
    } catch (error: any) {
      if (error.response?.status === 204) break // No more orders
      console.error(`   Error fetching orders page ${page}:`, error.message)
      break
    }
  }

  console.log(`✅ Total orders fetched: ${allOrders.length}\n`)
  return allOrders
}

async function fetchOrderProducts(orderId: number): Promise<BCOrderProduct[]> {
  try {
    const response = await bcApi.get(`/v2/orders/${orderId}/products`)
    return response.data as BCOrderProduct[]
  } catch (error: any) {
    console.error(`   Error fetching products for order ${orderId}:`, error.message)
    return []
  }
}

async function fetchOrderShippingAddress(orderId: number): Promise<BCAddress | null> {
  try {
    const response = await bcApi.get(`/v2/orders/${orderId}/shipping_addresses`)
    const addresses = response.data as BCAddress[]
    return addresses.length > 0 ? addresses[0] : null
  } catch (error: any) {
    return null
  }
}

async function fetchAllBCCustomers(): Promise<BCCustomer[]> {
  console.log('👥 Fetching BigCommerce customers...')
  const allCustomers: BCCustomer[] = []
  let page = 1
  const limit = 250

  while (true) {
    try {
      const response = await bcApi.get(`/v2/customers`, {
        params: { page, limit }
      })

      const customers = response.data as BCCustomer[]
      if (!customers || customers.length === 0) break

      allCustomers.push(...customers)
      console.log(`   Fetched page ${page}: ${customers.length} customers (total: ${allCustomers.length})`)

      if (customers.length < limit) break
      page++

      await sleep(200)
    } catch (error: any) {
      if (error.response?.status === 204) break
      console.error(`   Error fetching customers page ${page}:`, error.message)
      break
    }
  }

  console.log(`✅ Total customers fetched: ${allCustomers.length}\n`)
  return allCustomers
}

// =============================================================================
// CUSTOMER CREATION/UPDATE
// =============================================================================

async function upsertCustomer(
  email: string,
  firstName?: string,
  lastName?: string,
  phone?: string,
  bcCustomerId?: number,
  companyName?: string,
  source?: string
): Promise<string | null> {
  if (!email) return null

  const normalizedEmail = email.toLowerCase().trim()

  try {
    // Check if customer exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id, bc_customer_id')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      // Update with any new info
      const updates: any = {}
      if (bcCustomerId && !existing.bc_customer_id) updates.bc_customer_id = bcCustomerId
      if (firstName && !updates.first_name) updates.first_name = firstName
      if (lastName && !updates.last_name) updates.last_name = lastName
      if (phone && !updates.phone) updates.phone = phone
      if (companyName && !updates.company_name) updates.company_name = companyName

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('customers')
          .update(updates)
          .eq('id', existing.id)
      }

      return existing.id
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        bc_customer_id: bcCustomerId,
        company_name: companyName,
        acquisition_source: source || 'bigcommerce',
        first_seen_at: new Date().toISOString(),
        data_sources: [source || 'bigcommerce']
      })
      .select('id')
      .single()

    if (error) {
      console.error(`   Error creating customer ${normalizedEmail}:`, error.message)
      return null
    }

    return newCustomer?.id || null
  } catch (error: any) {
    console.error(`   Error upserting customer ${normalizedEmail}:`, error.message)
    return null
  }
}

// =============================================================================
// ORDER PROCESSING
// =============================================================================

async function processOrder(order: BCOrder): Promise<void> {
  // Get or create customer
  const billing = order.billing_address
  const customerId = await upsertCustomer(
    billing.email,
    billing.first_name,
    billing.last_name,
    billing.phone,
    order.customer_id,
    billing.company
  )

  // Fetch order products
  const products = await fetchOrderProducts(order.id)
  await sleep(100) // Rate limiting

  // Fetch shipping address
  const shippingAddress = await fetchOrderShippingAddress(order.id)
  await sleep(100)

  // Map status
  const statusMap: Record<number, string> = {
    0: 'incomplete',
    1: 'pending',
    2: 'shipped',
    3: 'partially_shipped',
    4: 'refunded',
    5: 'cancelled',
    6: 'declined',
    7: 'awaiting_payment',
    8: 'awaiting_pickup',
    9: 'awaiting_shipment',
    10: 'completed',
    11: 'awaiting_fulfillment',
    12: 'manual_verification_required',
    13: 'disputed',
    14: 'partially_refunded'
  }

  // Upsert order
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .upsert({
      bc_order_id: order.id,
      customer_id: customerId,
      status: statusMap[order.status_id] || order.status.toLowerCase().replace(/ /g, '_'),
      payment_status: ['completed', 'shipped', 'partially_shipped', 'awaiting_shipment', 'awaiting_fulfillment'].includes(statusMap[order.status_id] || '') ? 'paid' : 'pending',
      subtotal: parseFloat(order.subtotal_ex_tax) || 0,
      discount_amount: parseFloat(order.discount_amount) || parseFloat(order.coupon_discount) || 0,
      shipping_cost: parseFloat(order.shipping_cost_inc_tax) || 0,
      total: parseFloat(order.total_inc_tax) || 0,
      items_count: products.length,
      items_quantity: products.reduce((sum, p) => sum + p.quantity, 0),
      shipping_address: shippingAddress ? {
        first_name: shippingAddress.first_name,
        last_name: shippingAddress.last_name,
        company: shippingAddress.company,
        street_1: shippingAddress.street_1,
        street_2: shippingAddress.street_2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
        country: shippingAddress.country,
        phone: shippingAddress.phone
      } : null,
      billing_address: {
        first_name: billing.first_name,
        last_name: billing.last_name,
        company: billing.company,
        street_1: billing.street_1,
        street_2: billing.street_2,
        city: billing.city,
        state: billing.state,
        zip: billing.zip,
        country: billing.country,
        phone: billing.phone,
        email: billing.email
      },
      customer_email: billing.email,
      customer_first_name: billing.first_name,
      customer_last_name: billing.last_name,
      customer_phone: billing.phone,
      order_date: order.date_created,
      shipped_date: order.date_shipped,
      raw_data: order
    }, {
      onConflict: 'bc_order_id'
    })
    .select('id')
    .single()

  if (orderError) {
    console.error(`   Error upserting order ${order.id}:`, orderError.message)
    return
  }

  const orderId = orderData?.id
  if (!orderId) return

  // Insert order items
  for (const product of products) {
    await supabase
      .from('order_items')
      .upsert({
        order_id: orderId,
        bc_product_id: product.product_id,
        bc_variant_id: product.variant_id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        quantity: product.quantity,
        unit_price: parseFloat(product.price_inc_tax) || 0,
        cost_price: parseFloat(product.cost_price_ex_tax || '0') || null,
        total_price: parseFloat(product.total_inc_tax) || 0,
        options: product.product_options || []
      }, {
        onConflict: 'order_id,bc_product_id,bc_variant_id',
        ignoreDuplicates: true
      })
  }

  // Create order_placed interaction
  if (customerId) {
    await supabase
      .from('customer_interactions')
      .insert({
        customer_id: customerId,
        interaction_type: 'order_placed',
        order_id: orderId,
        channel: 'web',
        direction: 'inbound',
        summary: `Order #${order.id} placed for $${order.total_inc_tax}`,
        occurred_at: order.date_created,
        source_system: 'bigcommerce',
        external_id: order.id.toString()
      })
      .single()

    // If shipped, add shipped interaction
    if (order.date_shipped) {
      await supabase
        .from('customer_interactions')
        .insert({
          customer_id: customerId,
          interaction_type: 'order_shipped',
          order_id: orderId,
          channel: 'system',
          direction: 'outbound',
          summary: `Order #${order.id} shipped`,
          occurred_at: order.date_shipped,
          source_system: 'bigcommerce',
          external_id: `${order.id}-shipped`
        })
    }
  }
}

// =============================================================================
// KLAVIYO IMPORT
// =============================================================================

async function importKlaviyoProfiles(): Promise<void> {
  if (!KLAVIYO_API_KEY) {
    console.log('⚠️  Klaviyo API key not configured. Skipping Klaviyo import.')
    console.log('   Set KLAVIYO_API_KEY environment variable to enable.\n')
    return
  }

  console.log('📧 Importing Klaviyo profiles...')

  const klaviyoApi = axios.create({
    baseURL: 'https://a.klaviyo.com/api',
    headers: {
      'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
      'revision': '2024-02-15',
      'Accept': 'application/json'
    }
  })

  let cursor: string | null = null
  let totalImported = 0

  while (true) {
    try {
      const params: any = { 'page[size]': 100 }
      if (cursor) params['page[cursor]'] = cursor

      const response = await klaviyoApi.get('/profiles/', { params })
      const profiles = response.data.data as any[]

      if (!profiles || profiles.length === 0) break

      for (const profile of profiles) {
        const attrs = profile.attributes
        await upsertCustomer(
          attrs.email,
          attrs.first_name,
          attrs.last_name,
          attrs.phone_number,
          undefined,
          undefined,
          'klaviyo'
        )

        // Update klaviyo_profile_id
        if (attrs.email) {
          await supabase
            .from('customers')
            .update({
              klaviyo_profile_id: profile.id,
              email_marketing_consent: true // They're in Klaviyo
            })
            .eq('email', attrs.email.toLowerCase().trim())
        }

        totalImported++
      }

      console.log(`   Imported ${totalImported} profiles...`)

      // Check for next page
      cursor = response.data.links?.next
        ? new URL(response.data.links.next).searchParams.get('page[cursor]')
        : null

      if (!cursor) break

      await sleep(500) // Klaviyo rate limiting
    } catch (error: any) {
      console.error(`   Klaviyo error:`, error.message)
      break
    }
  }

  console.log(`✅ Klaviyo import complete: ${totalImported} profiles\n`)
}

// =============================================================================
// IMPORT EXISTING KLAVIYO TABLE
// =============================================================================

async function importExistingKlaviyoProfiles(): Promise<void> {
  console.log('📧 Importing existing Klaviyo profiles from database...')

  // Fetch existing klaviyo_profiles table data
  const { data: profiles, error } = await supabase
    .from('klaviyo_profiles')
    .select('*')

  if (error) {
    console.error('   Error fetching klaviyo_profiles:', error.message)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('   No existing Klaviyo profiles found.')
    return
  }

  console.log(`   Found ${profiles.length} Klaviyo profiles`)

  let imported = 0
  for (const profile of profiles) {
    await upsertCustomer(
      profile.email,
      profile.first_name,
      profile.last_name,
      profile.phone_number,
      undefined,
      undefined,
      'klaviyo'
    )

    // Update klaviyo_profile_id
    if (profile.email) {
      await supabase
        .from('customers')
        .update({
          klaviyo_profile_id: profile.klaviyo_id,
          email_marketing_consent: true,
          properties: profile.properties || {}
        })
        .eq('email', profile.email.toLowerCase().trim())
    }

    imported++
    if (imported % 1000 === 0) {
      console.log(`   Imported ${imported}/${profiles.length} profiles...`)
    }
  }

  console.log(`✅ Imported ${imported} Klaviyo profiles to customers table\n`)
}

// =============================================================================
// CALCULATE CUSTOMER METRICS
// =============================================================================

async function calculateAllCustomerMetrics(): Promise<void> {
  console.log('📊 Calculating customer metrics...')

  // Get all customers
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id')

  if (error || !customers) {
    console.error('   Error fetching customers:', error?.message)
    return
  }

  console.log(`   Processing ${customers.length} customers...`)

  let processed = 0
  const batchSize = 100

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize)

    for (const customer of batch) {
      // Call the metrics calculation function
      await supabase.rpc('recalculate_customer_metrics', { p_customer_id: customer.id })
      await supabase.rpc('calculate_churn_risk', { p_customer_id: customer.id })
    }

    processed += batch.length
    console.log(`   Processed ${processed}/${customers.length} customers...`)
  }

  console.log(`✅ Metrics calculated for ${processed} customers\n`)
}

// =============================================================================
// POPULATE SEGMENTS
// =============================================================================

async function populateSegments(): Promise<void> {
  console.log('🏷️  Populating customer segments...')

  // Get segment definitions
  const { data: segments, error } = await supabase
    .from('customer_segments')
    .select('*')
    .eq('segment_type', 'dynamic')
    .eq('is_active', true)

  if (error || !segments) {
    console.error('   Error fetching segments:', error?.message)
    return
  }

  for (const segment of segments) {
    console.log(`   Processing segment: ${segment.name}`)

    let query = supabase.from('customers').select('id')

    // Apply criteria based on segment slug
    switch (segment.slug) {
      case 'new-customers':
        // Customers who placed first order in last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('first_order_at', thirtyDaysAgo.toISOString())
        break

      case 'repeat-customers':
        // Need to join with metrics
        const { data: repeatCustomers } = await supabase
          .from('customer_metrics')
          .select('customer_id')
          .gte('total_orders', 2)

        if (repeatCustomers) {
          for (const c of repeatCustomers) {
            await supabase.from('customer_segment_memberships').upsert({
              customer_id: c.customer_id,
              segment_id: segment.id,
              added_by: 'system'
            }, { onConflict: 'customer_id,segment_id' })
          }
        }
        continue

      case 'vip-customers':
        const { data: vips } = await supabase
          .from('customer_metrics')
          .select('customer_id')
          .eq('rfm_segment', 'champion')

        if (vips) {
          for (const c of vips) {
            await supabase.from('customer_segment_memberships').upsert({
              customer_id: c.customer_id,
              segment_id: segment.id,
              added_by: 'system'
            }, { onConflict: 'customer_id,segment_id' })
          }
        }
        continue

      case 'at-risk':
        const { data: atRisk } = await supabase
          .from('customer_metrics')
          .select('customer_id')
          .in('churn_risk_segment', ['at_risk', 'critical'])

        if (atRisk) {
          for (const c of atRisk) {
            await supabase.from('customer_segment_memberships').upsert({
              customer_id: c.customer_id,
              segment_id: segment.id,
              added_by: 'system'
            }, { onConflict: 'customer_id,segment_id' })
          }
        }
        continue

      case 'churned':
        const { data: churned } = await supabase
          .from('customer_metrics')
          .select('customer_id')
          .gte('days_since_last_order', 180)

        if (churned) {
          for (const c of churned) {
            await supabase.from('customer_segment_memberships').upsert({
              customer_id: c.customer_id,
              segment_id: segment.id,
              added_by: 'system'
            }, { onConflict: 'customer_id,segment_id' })
          }
        }
        continue

      case 'high-spenders':
        const { data: highSpenders } = await supabase
          .from('customer_metrics')
          .select('customer_id')
          .gte('clv_historical', 500)

        if (highSpenders) {
          for (const c of highSpenders) {
            await supabase.from('customer_segment_memberships').upsert({
              customer_id: c.customer_id,
              segment_id: segment.id,
              added_by: 'system'
            }, { onConflict: 'customer_id,segment_id' })
          }
        }
        continue

      case 'wholesale':
        query = query.eq('is_wholesale_customer', true)
        break

      case 'newsletter-subscribers':
        query = query.eq('email_marketing_consent', true)
        break

      default:
        continue
    }

    // Execute query and add memberships
    const { data: matchingCustomers } = await query

    if (matchingCustomers) {
      for (const c of matchingCustomers) {
        await supabase.from('customer_segment_memberships').upsert({
          customer_id: c.id,
          segment_id: segment.id,
          added_by: 'system'
        }, { onConflict: 'customer_id,segment_id' })
      }
    }

    // Update member count
    const { count } = await supabase
      .from('customer_segment_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('segment_id', segment.id)
      .eq('is_active', true)

    await supabase
      .from('customer_segments')
      .update({ member_count: count || 0, last_calculated_at: new Date().toISOString() })
      .eq('id', segment.id)
  }

  console.log('✅ Segments populated\n')
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('BOO CRM DATA POPULATION')
  console.log('='.repeat(60))
  console.log('')

  try {
    // Step 1: Fetch all BigCommerce orders
    console.log('STEP 1: Import BigCommerce Orders')
    console.log('-'.repeat(40))
    const orders = await fetchAllBCOrders()

    // Step 2: Process each order (creates customers, order items, interactions)
    console.log('STEP 2: Process Orders & Create Customers')
    console.log('-'.repeat(40))
    let processed = 0
    for (const order of orders) {
      await processOrder(order)
      processed++
      if (processed % 100 === 0) {
        console.log(`   Processed ${processed}/${orders.length} orders...`)
      }
    }
    console.log(`✅ Processed ${processed} orders\n`)

    // Step 3: Import Klaviyo profiles (from existing table)
    console.log('STEP 3: Import Klaviyo Profiles')
    console.log('-'.repeat(40))
    await importExistingKlaviyoProfiles()

    // Step 4: Calculate customer metrics
    console.log('STEP 4: Calculate Customer Metrics')
    console.log('-'.repeat(40))
    await calculateAllCustomerMetrics()

    // Step 5: Populate segments
    console.log('STEP 5: Populate Customer Segments')
    console.log('-'.repeat(40))
    await populateSegments()

    // Final summary
    console.log('='.repeat(60))
    console.log('CRM POPULATION COMPLETE!')
    console.log('='.repeat(60))

    // Get counts
    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true })
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const { count: itemCount } = await supabase.from('order_items').select('*', { count: 'exact', head: true })
    const { count: interactionCount } = await supabase.from('customer_interactions').select('*', { count: 'exact', head: true })

    console.log('')
    console.log('SUMMARY:')
    console.log(`  - Customers: ${customerCount}`)
    console.log(`  - Orders: ${orderCount}`)
    console.log(`  - Order Items: ${itemCount}`)
    console.log(`  - Interactions: ${interactionCount}`)
    console.log('')

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run if executed directly
main()
