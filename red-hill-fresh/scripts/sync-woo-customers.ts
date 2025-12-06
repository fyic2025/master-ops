/**
 * RHF WooCommerce Customer & Order Sync
 *
 * Syncs customers and orders from WooCommerce to Supabase
 * Calculates RFM scores for customer segmentation
 *
 * Usage: npx tsx sync-woo-customers.ts [--days 30] [--verbose]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') })

const supabase = createClient(
  process.env.MASTER_SUPABASE_URL!,
  process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY!
)

// WooCommerce REST API client
class WooClient {
  private baseUrl: string
  private consumerKey: string
  private consumerSecret: string

  constructor() {
    this.baseUrl = process.env.REDHILLFRESH_WP_URL || 'https://redhillfresh.com.au'
    this.consumerKey = process.env.REDHILLFRESH_WC_CONSUMER_KEY || ''
    this.consumerSecret = process.env.REDHILLFRESH_WC_CONSUMER_SECRET || ''

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error('Missing REDHILLFRESH_WC_CONSUMER_KEY or REDHILLFRESH_WC_CONSUMER_SECRET')
    }
  }

  private async request(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}/wp-json/wc/v3/${endpoint}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64')

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

  async getCustomers(page: number = 1, perPage: number = 100): Promise<WooCustomer[]> {
    return this.request('customers', {
      page: String(page),
      per_page: String(perPage),
      orderby: 'registered_date',
      order: 'desc'
    }) as Promise<WooCustomer[]>
  }

  async getOrders(params: { page?: number; perPage?: number; after?: string } = {}): Promise<WooOrder[]> {
    const queryParams: Record<string, string> = {
      page: String(params.page || 1),
      per_page: String(params.perPage || 100),
      orderby: 'date',
      order: 'desc'
    }
    if (params.after) {
      queryParams.after = params.after
    }
    return this.request('orders', queryParams) as Promise<WooOrder[]>
  }
}

interface WooCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  billing: {
    phone?: string
    address_1?: string
    address_2?: string
    city?: string
    state?: string
    postcode?: string
  }
}

interface WooOrder {
  id: number
  customer_id: number
  status: string
  total: string
  subtotal?: string
  shipping_total: string
  date_created: string
  date_completed: string | null
  line_items: any[]
  shipping: any
  billing: any
}

async function syncCustomers(woo: WooClient, verbose: boolean) {
  console.log('Syncing customers...')
  let page = 1
  let totalSynced = 0

  while (true) {
    const customers: WooCustomer[] = await woo.getCustomers(page, 100)
    if (customers.length === 0) break

    if (verbose) console.log(`  Page ${page}: ${customers.length} customers`)

    for (const c of customers) {
      if (!c.email) continue

      const { error } = await supabase
        .from('rhf_customers')
        .upsert({
          woo_id: c.id,
          email: c.email.toLowerCase(),
          first_name: c.first_name,
          last_name: c.last_name,
          phone: c.billing?.phone,
          address_1: c.billing?.address_1,
          address_2: c.billing?.address_2,
          city: c.billing?.city,
          state: c.billing?.state,
          postcode: c.billing?.postcode,
          last_synced_at: new Date().toISOString()
        }, { onConflict: 'woo_id' })

      if (error) {
        console.error(`  Error syncing customer ${c.id}:`, error.message)
      } else {
        totalSynced++
      }
    }

    page++
  }

  console.log(`  Synced ${totalSynced} customers`)
  return totalSynced
}

async function syncOrders(woo: WooClient, daysBack: number, verbose: boolean) {
  console.log(`Syncing orders (last ${daysBack} days)...`)

  const afterDate = new Date()
  afterDate.setDate(afterDate.getDate() - daysBack)
  const afterStr = afterDate.toISOString()

  let page = 1
  let totalSynced = 0

  while (true) {
    const orders: WooOrder[] = await woo.getOrders({ page, perPage: 100, after: afterStr })
    if (orders.length === 0) break

    if (verbose) console.log(`  Page ${page}: ${orders.length} orders`)

    for (const o of orders) {
      // Get customer UUID if exists
      let customerId: string | null = null
      if (o.customer_id) {
        const { data: customer } = await supabase
          .from('rhf_customers')
          .select('id')
          .eq('woo_id', o.customer_id)
          .single()
        customerId = customer?.id || null
      }

      const { error } = await supabase
        .from('rhf_woo_orders')
        .upsert({
          woo_id: o.id,
          customer_id: customerId,
          woo_customer_id: o.customer_id,
          status: o.status,
          total: parseFloat(o.total),
          subtotal: o.subtotal ? parseFloat(o.subtotal) : null,
          shipping_total: parseFloat(o.shipping_total),
          date_created: o.date_created,
          date_completed: o.date_completed,
          line_items: o.line_items,
          item_count: o.line_items?.length || 0,
          shipping_address: o.shipping,
          last_synced_at: new Date().toISOString()
        }, { onConflict: 'woo_id' })

      if (error) {
        console.error(`  Error syncing order ${o.id}:`, error.message)
      } else {
        totalSynced++
      }
    }

    page++
  }

  console.log(`  Synced ${totalSynced} orders`)
  return totalSynced
}

async function updateCustomerStats() {
  console.log('Updating customer stats...')

  // Get all customers with woo_id
  const { data: customers } = await supabase
    .from('rhf_customers')
    .select('id, woo_id')

  let updated = 0
  for (const customer of customers || []) {
    // Get order stats for this customer
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

      await supabase
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

      updated++
    }
  }

  console.log(`  Updated stats for ${updated} customers`)
}

async function calculateRFM() {
  console.log('Calculating RFM scores...')

  const { error } = await supabase.rpc('rhf_calculate_rfm')

  if (error) {
    console.error('  Error calculating RFM:', error.message)
    // Manual fallback
    console.log('  Running manual RFM calculation...')

    const { data: customers } = await supabase
      .from('rhf_customers')
      .select('id, days_since_order, order_count, total_spent')
      .not('last_order_date', 'is', null)

    for (const c of customers || []) {
      const rfm_recency = c.days_since_order <= 7 ? 5 :
        c.days_since_order <= 14 ? 4 :
        c.days_since_order <= 30 ? 3 :
        c.days_since_order <= 60 ? 2 : 1

      const rfm_frequency = c.order_count >= 10 ? 5 :
        c.order_count >= 5 ? 4 :
        c.order_count >= 3 ? 3 :
        c.order_count >= 2 ? 2 : 1

      const rfm_monetary = c.total_spent >= 500 ? 5 :
        c.total_spent >= 300 ? 4 :
        c.total_spent >= 150 ? 3 :
        c.total_spent >= 75 ? 2 : 1

      const segment =
        c.days_since_order <= 14 && c.order_count >= 5 ? 'champions' :
        c.days_since_order <= 30 && c.order_count >= 3 ? 'loyal' :
        c.days_since_order <= 7 && c.order_count === 1 ? 'new' :
        c.days_since_order > 30 && c.days_since_order <= 60 ? 'at_risk' :
        c.days_since_order > 60 ? 'lost' : 'regular'

      await supabase
        .from('rhf_customers')
        .update({
          rfm_recency,
          rfm_frequency,
          rfm_monetary,
          rfm_score: rfm_recency + rfm_frequency + rfm_monetary,
          customer_segment: segment
        })
        .eq('id', c.id)
    }
  }

  console.log('  RFM calculated')
}

async function printSummary() {
  console.log('\n=== SUMMARY ===')

  // Customer segments
  const { data: segments } = await supabase
    .from('rhf_customers')
    .select('customer_segment')
    .not('customer_segment', 'is', null)

  const segmentCounts: Record<string, number> = {}
  for (const s of segments || []) {
    segmentCounts[s.customer_segment] = (segmentCounts[s.customer_segment] || 0) + 1
  }

  console.log('\nCustomer Segments:')
  for (const [segment, count] of Object.entries(segmentCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${segment}: ${count}`)
  }

  // At-risk customers
  const { data: atRisk, count: atRiskCount } = await supabase
    .from('rhf_customers')
    .select('email, first_name, days_since_order, total_spent', { count: 'exact' })
    .eq('customer_segment', 'at_risk')
    .order('total_spent', { ascending: false })
    .limit(5)

  console.log(`\nAt-Risk Customers (${atRiskCount} total, top 5 by value):`)
  for (const c of atRisk || []) {
    console.log(`  ${c.first_name || c.email} - $${c.total_spent} - ${c.days_since_order} days`)
  }

  // Lost customers
  const { count: lostCount } = await supabase
    .from('rhf_customers')
    .select('id', { count: 'exact', head: true })
    .eq('customer_segment', 'lost')

  console.log(`\nLost Customers (60+ days): ${lostCount}`)
}

async function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose')
  const daysBack = parseInt(args.find(a => a.startsWith('--days'))?.split('=')[1] || '90')

  console.log('============================================================')
  console.log('RHF WooCommerce Customer Sync')
  console.log('============================================================')
  console.log(`Days back: ${daysBack}`)
  console.log(`Verbose: ${verbose}`)
  console.log('============================================================\n')

  try {
    const woo = new WooClient()

    await syncCustomers(woo, verbose)
    await syncOrders(woo, daysBack, verbose)
    await updateCustomerStats()
    await calculateRFM()
    await printSummary()

    console.log('\n✅ Sync complete!')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
