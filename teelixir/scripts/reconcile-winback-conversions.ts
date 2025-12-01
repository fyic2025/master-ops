#!/usr/bin/env npx tsx
/**
 * Teelixir - Winback Conversion Reconciliation
 *
 * Checks Shopify orders for MISSYOU40 discount code usage and
 * updates the winback tracking table with conversion data.
 *
 * Usage:
 *   npx tsx teelixir/scripts/reconcile-winback-conversions.ts [options]
 *
 * Options:
 *   --dry-run       Preview without updating database
 *   --days=N        Look back N days (default: 30)
 *
 * Prerequisites:
 *   Shopify API credentials for Teelixir
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

interface ReconcileConfig {
  dryRun: boolean
  lookbackDays: number
}

interface ReconcileResult {
  success: boolean
  ordersChecked: number
  conversionsFound: number
  recordsUpdated: number
  totalRevenue: number
  errors: string[]
  duration: number
}

// ============================================================================
// SHOPIFY CLIENT
// ============================================================================

class ShopifyClient {
  private shopDomain: string
  private accessToken: string
  private apiVersion = '2024-01'

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain
    this.accessToken = accessToken
  }

  private async request<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`https://${this.shopDomain}/admin/api/${this.apiVersion}${path}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Shopify API error (${response.status}): ${errorBody}`)
    }

    return response.json() as Promise<T>
  }

  async getOrdersWithDiscountCode(
    discountCode: string,
    createdAtMin: Date
  ): Promise<Array<{
    id: number
    email: string
    total_price: string
    created_at: string
    discount_codes: Array<{ code: string; amount: string }>
  }>> {
    const orders: any[] = []
    let pageInfo: string | null = null

    do {
      const params: Record<string, any> = {
        status: 'any',
        created_at_min: createdAtMin.toISOString(),
        limit: 250,
        fields: 'id,email,total_price,created_at,discount_codes',
      }

      if (pageInfo) {
        params.page_info = pageInfo
      }

      const response = await this.request<{ orders: any[] }>('/orders.json', params)

      if (response.orders) {
        // Filter orders that used our discount code
        const matchingOrders = response.orders.filter(order =>
          order.discount_codes?.some(
            (dc: any) => dc.code.toUpperCase() === discountCode.toUpperCase()
          )
        )
        orders.push(...matchingOrders)
      }

      // Check for pagination (simplified - Shopify uses Link headers)
      pageInfo = null // For now, just get first page

      await new Promise(r => setTimeout(r, 500)) // Rate limiting
    } while (pageInfo)

    return orders
  }
}

// ============================================================================
// MAIN RECONCILE FUNCTION
// ============================================================================

async function reconcileConversions(config: ReconcileConfig): Promise<ReconcileResult> {
  const startTime = Date.now()
  const result: ReconcileResult = {
    success: false,
    ordersChecked: 0,
    conversionsFound: 0,
    recordsUpdated: 0,
    totalRevenue: 0,
    errors: [],
    duration: 0,
  }

  try {
    // Initialize credentials
    console.log('\n🔐 Loading credentials...')
    await creds.load('teelixir')

    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ||
      await creds.get('global', 'supabase_service_key') ||
      SUPABASE_SERVICE_KEY_FALLBACK

    // Get Shopify credentials
    const shopifyDomain = process.env.TEELIXIR_SHOPIFY_DOMAIN ||
      await creds.get('teelixir', 'shopify_domain') ||
      'teelixir-au.myshopify.com'

    const shopifyToken = process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN ||
      await creds.get('teelixir', 'shopify_access_token') ||
      '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'

    if (!shopifyToken) {
      console.log('\n⚠️  Shopify access token not configured.')
      console.log('   Set TEELIXIR_SHOPIFY_ACCESS_TOKEN or add to vault.')
      console.log('   Skipping Shopify reconciliation.')

      // Just report current stats
      const supabase = createClient(SUPABASE_URL, supabaseKey)

      const { data: stats } = await supabase
        .from('tlx_winback_stats')
        .select('*')
        .single()

      if (stats) {
        console.log('\n📊 Current winback stats:')
        console.log(`   Total sent: ${stats.total_sent}`)
        console.log(`   Converted: ${stats.total_converted}`)
        console.log(`   Revenue: $${stats.total_revenue}`)
      }

      result.success = true
      return result
    }

    const supabase = createClient(SUPABASE_URL, supabaseKey)
    const shopify = new ShopifyClient(shopifyDomain, shopifyToken)

    // Get automation config for discount code
    const { data: configData } = await supabase
      .from('tlx_automation_config')
      .select('config')
      .eq('automation_type', 'winback_40')
      .single()

    const discountCode = configData?.config?.discount_code || 'MISSYOU40'

    // Calculate lookback date
    const lookbackDate = new Date()
    lookbackDate.setDate(lookbackDate.getDate() - config.lookbackDays)

    console.log(`\n📅 Looking back ${config.lookbackDays} days from ${lookbackDate.toISOString().split('T')[0]}`)
    console.log(`   Discount code: ${discountCode}`)

    // Fetch orders from Shopify
    console.log('\n📥 Fetching Shopify orders...')
    const orders = await shopify.getOrdersWithDiscountCode(discountCode, lookbackDate)

    result.ordersChecked = orders.length
    console.log(`   Found ${orders.length} orders with ${discountCode} code`)

    if (orders.length === 0) {
      console.log('\n✅ No new conversions found.')
      result.success = true
      return result
    }

    // Get emails that have been sent winback emails
    const orderEmails = [...new Set(orders.map(o => o.email.toLowerCase()))]

    const { data: sentEmails } = await supabase
      .from('tlx_winback_emails')
      .select('email, id, status')
      .in('email', orderEmails)

    const sentEmailMap = new Map(
      (sentEmails || []).map(e => [e.email.toLowerCase(), e])
    )

    console.log(`   Matching ${orderEmails.length} order emails against ${sentEmails?.length || 0} winback records`)

    // Process conversions
    const conversions: Array<{
      email: string
      orderId: string
      orderTotal: number
      orderDate: string
    }> = []

    for (const order of orders) {
      const email = order.email.toLowerCase()
      const sentRecord = sentEmailMap.get(email)

      if (sentRecord && sentRecord.status !== 'converted') {
        const orderTotal = parseFloat(order.total_price)

        conversions.push({
          email,
          orderId: String(order.id),
          orderTotal,
          orderDate: order.created_at,
        })

        result.totalRevenue += orderTotal
      }
    }

    result.conversionsFound = conversions.length
    console.log(`\n🎯 Found ${conversions.length} conversions (${result.totalRevenue.toFixed(2)} revenue)`)

    if (conversions.length === 0) {
      console.log('\n✅ No new conversions to update.')
      result.success = true
      return result
    }

    if (config.dryRun) {
      console.log('\n🔍 DRY RUN - Would update:')
      for (const conv of conversions.slice(0, 10)) {
        console.log(`   - ${conv.email}: Order #${conv.orderId}, $${conv.orderTotal.toFixed(2)}`)
      }
      if (conversions.length > 10) {
        console.log(`   ... and ${conversions.length - 10} more`)
      }
      result.success = true
      return result
    }

    // Update records
    console.log('\n💾 Updating conversion records...')

    for (const conv of conversions) {
      const { error } = await supabase
        .from('tlx_winback_emails')
        .update({
          status: 'converted',
          converted_at: conv.orderDate,
          order_id: conv.orderId,
          order_total: conv.orderTotal,
        })
        .eq('email', conv.email)

      if (error) {
        result.errors.push(`${conv.email}: ${error.message}`)
      } else {
        result.recordsUpdated++
      }
    }

    console.log(`   Updated ${result.recordsUpdated} records`)

    result.success = result.errors.length === 0

  } catch (error: any) {
    result.errors.push(error.message)
    result.success = false
  }

  result.duration = Date.now() - startTime
  return result
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  const config: ReconcileConfig = {
    dryRun: args.includes('--dry-run'),
    lookbackDays: parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '') || 30,
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  TEELIXIR - WINBACK CONVERSION RECONCILIATION                        ║')
  console.log('║  Match Shopify orders with winback emails                            ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made')
  }

  const result = await reconcileConversions(config)

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
  console.log('│ RECONCILIATION RESULTS                                              │')
  console.log('├─────────────────────────────────────────────────────────────────────┤')
  console.log(`│ Status:           ${result.success ? '✅ SUCCESS' : '❌ FAILED'}                                      │`)
  console.log(`│ Orders checked:   ${String(result.ordersChecked).padEnd(49)}│`)
  console.log(`│ Conversions:      ${String(result.conversionsFound).padEnd(49)}│`)
  console.log(`│ Records updated:  ${String(result.recordsUpdated).padEnd(49)}│`)
  console.log(`│ Total revenue:    ${('$' + result.totalRevenue.toFixed(2)).padEnd(49)}│`)
  console.log(`│ Duration:         ${String((result.duration / 1000).toFixed(1) + 's').padEnd(49)}│`)

  if (result.errors.length > 0) {
    console.log('├─────────────────────────────────────────────────────────────────────┤')
    console.log('│ ERRORS:                                                             │')
    for (const err of result.errors.slice(0, 5)) {
      console.log(`│   - ${err.substring(0, 62).padEnd(62)}│`)
    }
  }

  console.log('└─────────────────────────────────────────────────────────────────────┘')

  process.exit(result.success ? 0 : 1)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
