#!/usr/bin/env npx tsx
/**
 * Teelixir - Shopify B2C Orders Sync
 *
 * Syncs Shopify orders to Supabase for reorder pattern analysis.
 * Used to determine optimal timing for anniversary re-engagement emails.
 *
 * Usage:
 *   npx tsx teelixir/scripts/sync-shopify-orders.ts [options]
 *
 * Options:
 *   --full          Full sync (3 years historical)
 *   --dry-run       Preview without writing to database
 *   --days=N        Sync last N days (default: 7 for incremental)
 *   --calculate     Only calculate order sequences (no fetch)
 *   --verbose       Show detailed progress
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Parse command line arguments
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FULL_SYNC = args.includes('--full')
const CALCULATE_ONLY = args.includes('--calculate')
const VERBOSE = args.includes('--verbose')
const DAYS_ARG = args.find(a => a.startsWith('--days='))
const SYNC_DAYS = DAYS_ARG ? parseInt(DAYS_ARG.split('=')[1]) : (FULL_SYNC ? 1095 : 7)  // 3 years for full sync

// Constants
const SHOPIFY_DOMAIN = 'teelixir-au.myshopify.com'
const SHOPIFY_API_VERSION = '2024-01'
const BATCH_SIZE = 250 // Shopify max per request
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'

// Load credentials
const creds = require('../../creds')

interface ShopifyOrder {
  id: number
  order_number: number
  name: string
  email: string
  customer?: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  processed_at: string
  created_at: string
  financial_status: string
  fulfillment_status: string | null
  cancelled_at: string | null
  subtotal_price: string
  total_price: string
  total_discounts: string
  currency: string
  discount_codes: Array<{ code: string; amount: string }>
  source_name: string
  line_items: Array<{
    id: number
    product_id: number
    variant_id: number
    sku: string
    title: string
    variant_title: string
    vendor: string
    quantity: number
    price: string
    total_discount: string
    gift_card: boolean
  }>
}

interface SyncStats {
  ordersProcessed: number
  ordersCreated: number
  ordersUpdated: number
  lineItemsCreated: number
  errors: number
}

// Product type classification (matches SQL function)
function classifyProductType(title: string): string {
  const t = (title || '').toLowerCase()

  // Lions Mane
  if ((t.includes('lions mane') || t.includes("lion's mane") || t.includes('lion mane')) && t.includes('pure')) return 'Lions Mane Pure'
  if (t.includes('lions mane') || t.includes("lion's mane") || t.includes('lion mane')) return 'Lions Mane'

  // Ashwagandha
  if ((t.includes('ashwa') || t.includes('ashwagan')) && t.includes('pure')) return 'Ashwagandha Pure'
  if (t.includes('ashwa') || t.includes('ashwagan')) return 'Ashwagandha'

  // Reishi
  if (t.includes('reishi') && t.includes('pure')) return 'Reishi Pure'
  if (t.includes('reishi')) return 'Reishi'

  // Chaga
  if (t.includes('chaga') && t.includes('pure')) return 'Chaga Pure'
  if (t.includes('chaga')) return 'Chaga'

  // Cordyceps
  if (t.includes('cordyceps') && t.includes('pure')) return 'Cordyceps Pure'
  if (t.includes('cordyceps')) return 'Cordyceps'

  // Other mushrooms
  if (t.includes('tremella')) return 'Tremella'
  if (t.includes('maitake')) return 'Maitake'
  if (t.includes('shiitake')) return 'Shiitake'
  if (t.includes('turkey tail')) return 'Turkey Tail'
  if (t.includes('pearl')) return 'Pearl'

  // Immunity
  if (t.includes('immun')) return 'Immunity'

  // Cans
  if (t.includes('sparkling') && t.includes('elixir')) return 'Cans'

  // Lattes
  if (t.includes('cacao') && t.includes('latte')) return 'Latte - Cacao Rose'
  if (t.includes('turmeric') && t.includes('latte')) return 'Latte - Turmeric'
  if (t.includes('beet') && t.includes('latte')) return 'Latte - Beet'
  if (t.includes('matcha') && t.includes('latte')) return 'Latte - Matcha'

  // Japanese Matcha
  if (t.includes('japanese matcha')) return 'Japanese Matcha'

  // Body blends
  if (t.includes('body build')) return 'Body Build'
  if (t.includes('body repair')) return 'Body Repair'

  // Supplements
  if (t.includes('siberian ginseng')) return 'Siberian Ginseng'
  if (t.includes('bee pollen')) return 'Bee Pollen'
  if (t.includes('fulvic')) return 'Fulvic Acid'
  if (t.includes('resveratrol')) return 'Resveratrol'
  if (t.includes('schizandra') || t.includes('schisandra')) return 'Schizandra'
  if (t.includes('red pine') || t.includes('pine needle')) return 'Red Pine Needle'
  if (t.includes('camu camu')) return 'Camu Camu'
  if (t.includes('spirulina')) return 'Spirulina'
  if (t.includes('stress less') && !t.includes('bundle')) return 'Stress Less'
  if (t.includes('maca')) return 'Maca'
  if (t.includes('shilajit')) return 'Shilajit'
  if (t.includes('he shou wu') || t.includes('fo-ti')) return 'He Shou Wu'
  if (t.includes('astragalus')) return 'Astragalus'
  if (t.includes('goji')) return 'Goji'
  if (t.includes('eucommia')) return 'Eucommia'
  if (t.includes('gynostemma')) return 'Gynostemma'
  if (t.includes('mucuna')) return 'Mucuna'
  if (t.includes('rhodiola')) return 'Rhodiola'
  if (t.includes('tocos')) return 'Tocos'
  if (t.includes('deer antler') || t.includes('velvet antler')) return 'Deer Antler'
  if (t.includes('pine pollen')) return 'Pine Pollen'
  if (t.includes('beauty') || t.includes('skin') || t.includes('glow')) return 'Beauty'

  return 'Other'
}

// Parse size in grams from variant title
function parseSizeGrams(variantTitle: string | null): number | null {
  if (!variantTitle) return null
  const match = variantTitle.match(/(\d+)\s*[gG]/)
  return match ? parseInt(match[1]) : null
}

// Shopify API request helper
async function shopifyRequest(
  accessToken: string,
  path: string,
  params: Record<string, any> = {}
): Promise<any> {
  const url = new URL(`https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${path}`)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value))
    }
  })

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000
    console.log(`Rate limited, waiting ${waitTime}ms...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    return shopifyRequest(accessToken, path, params)
  }

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Fetch all orders with pagination using Link header (cursor-based)
async function fetchOrders(
  accessToken: string,
  createdAtMin: string
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = []
  let page = 1
  let nextPageUrl: string | null = null

  console.log(`\nFetching orders since ${createdAtMin}...`)

  // Initial request
  const initialParams = {
    limit: BATCH_SIZE,
    status: 'any',
    created_at_min: createdAtMin,
  }

  let response = await shopifyRequestWithHeaders(accessToken, '/orders.json', initialParams)
  let orders = response.data.orders as ShopifyOrder[]

  while (orders.length > 0) {
    allOrders.push(...orders)
    console.log(`  Page ${page}: ${orders.length} orders (total: ${allOrders.length})`)

    // Check for next page in Link header
    nextPageUrl = extractNextPageUrl(response.headers)

    if (!nextPageUrl) break

    page++
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100))

    // Fetch next page using the page_info cursor
    response = await shopifyRequestWithHeaders(accessToken, nextPageUrl, {})
    orders = response.data.orders as ShopifyOrder[]
  }

  return allOrders
}

// Helper to extract next page URL from Link header
function extractNextPageUrl(headers: Headers): string | null {
  const linkHeader = headers.get('link')
  if (!linkHeader) return null

  // Parse Link header: <url>; rel="next", <url>; rel="previous"
  const links = linkHeader.split(',')
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="next"/)
    if (match) {
      // Extract just the path and query string
      const url = new URL(match[1])
      return url.pathname + url.search
    }
  }
  return null
}

// Shopify API request helper with headers
async function shopifyRequestWithHeaders(
  accessToken: string,
  pathOrUrl: string,
  params: Record<string, any> = {}
): Promise<{ data: any; headers: Headers }> {
  let url: URL

  if (pathOrUrl.startsWith('/admin')) {
    // Full path with query params (from Link header)
    url = new URL(`https://${SHOPIFY_DOMAIN}${pathOrUrl}`)
  } else {
    // Build URL from path and params
    url = new URL(`https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${pathOrUrl}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000
    console.log(`Rate limited, waiting ${waitTime}ms...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    return shopifyRequestWithHeaders(accessToken, pathOrUrl, params)
  }

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return { data, headers: response.headers }
}

// Transform Shopify order to Supabase format
function transformOrder(order: ShopifyOrder) {
  return {
    shopify_order_id: order.id,
    order_number: order.order_number,
    order_name: order.name,
    shopify_customer_id: order.customer?.id || null,
    customer_email: order.email || order.customer?.email || null,
    customer_first_name: order.customer?.first_name || null,
    customer_last_name: order.customer?.last_name || null,
    processed_at: order.processed_at,
    created_at_shopify: order.created_at,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    cancelled_at: order.cancelled_at,
    subtotal_price: parseFloat(order.subtotal_price) || 0,
    total_price: parseFloat(order.total_price) || 0,
    total_discounts: parseFloat(order.total_discounts) || 0,
    currency: order.currency,
    discount_codes: order.discount_codes?.length > 0 ? order.discount_codes : null,
    source_name: order.source_name,
    last_synced_at: new Date().toISOString(),
    raw_data: order,
  }
}

// Transform line item
function transformLineItem(item: ShopifyOrder['line_items'][0], orderId: string) {
  return {
    order_id: orderId,
    shopify_line_item_id: item.id,
    shopify_product_id: item.product_id,
    shopify_variant_id: item.variant_id,
    sku: item.sku,
    title: item.title,
    variant_title: item.variant_title,
    vendor: item.vendor,
    product_type: classifyProductType(item.title),
    product_size_grams: parseSizeGrams(item.variant_title),
    quantity: item.quantity,
    price: parseFloat(item.price) || 0,
    total_discount: parseFloat(item.total_discount) || 0,
    is_gift_card: item.gift_card,
  }
}

// Upsert orders to Supabase
async function syncOrders(
  supabase: SupabaseClient,
  orders: ShopifyOrder[],
  stats: SyncStats
) {
  console.log(`\nSyncing ${orders.length} orders to Supabase...`)

  for (let i = 0; i < orders.length; i += 50) {
    const batch = orders.slice(i, i + 50)

    for (const order of batch) {
      try {
        const orderData = transformOrder(order)

        if (DRY_RUN) {
          if (VERBOSE) console.log(`  [DRY RUN] Order #${order.order_number}`)
          stats.ordersProcessed++
          continue
        }

        // Upsert order
        const { data: upsertedOrder, error: orderError } = await supabase
          .from('tlx_shopify_orders')
          .upsert(orderData, { onConflict: 'shopify_order_id' })
          .select('id')
          .single()

        if (orderError) {
          console.error(`  Error upserting order #${order.order_number}:`, orderError.message)
          stats.errors++
          continue
        }

        // Delete existing line items and insert new ones
        await supabase
          .from('tlx_shopify_line_items')
          .delete()
          .eq('order_id', upsertedOrder.id)

        // Insert line items
        const lineItems = order.line_items
          .filter(li => !li.gift_card) // Skip gift cards
          .map(li => transformLineItem(li, upsertedOrder.id))

        if (lineItems.length > 0) {
          const { error: lineError } = await supabase
            .from('tlx_shopify_line_items')
            .insert(lineItems)

          if (lineError) {
            console.error(`  Error inserting line items for order #${order.order_number}:`, lineError.message)
          } else {
            stats.lineItemsCreated += lineItems.length
          }
        }

        stats.ordersProcessed++
        stats.ordersCreated++

        if (VERBOSE && stats.ordersProcessed % 100 === 0) {
          console.log(`  Processed ${stats.ordersProcessed} orders...`)
        }
      } catch (error: any) {
        console.error(`  Error processing order #${order.order_number}:`, error.message)
        stats.errors++
      }
    }

    // Progress update
    console.log(`  Progress: ${Math.min(i + 50, orders.length)}/${orders.length} orders`)
  }
}

// Calculate order sequences
async function calculateOrderSequences(supabase: SupabaseClient) {
  console.log('\nCalculating customer order sequences...')

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would calculate order sequences')
    return
  }

  const { data, error } = await supabase.rpc('calculate_tlx_order_sequences')

  if (error) {
    console.error('  Error calculating sequences:', error.message)
    return
  }

  console.log(`  Updated ${data} orders with sequence numbers`)
}

// Log sync to database
async function logSync(
  supabase: SupabaseClient,
  syncType: string,
  stats: SyncStats,
  startTime: Date,
  error?: string
) {
  if (DRY_RUN) return

  const endTime = new Date()
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

  await supabase.from('tlx_shopify_sync_log').insert({
    sync_type: syncType,
    started_at: startTime.toISOString(),
    completed_at: endTime.toISOString(),
    records_fetched: stats.ordersProcessed,
    records_created: stats.ordersCreated,
    records_updated: stats.ordersUpdated,
    records_failed: stats.errors,
    error_message: error,
    duration_seconds: duration,
  })
}

// Update job status
async function updateJobStatus(supabase: SupabaseClient, success: boolean, error?: string) {
  if (DRY_RUN) return

  await supabase.rpc('update_job_status', {
    p_job_name: 'shopify-order-sync',
    p_business: 'teelixir',
    p_last_run: new Date().toISOString(),
    p_success: success,
    p_error_message: error || null,
  })
}

// Main sync function
async function main() {
  console.log('═'.repeat(60))
  console.log('  TEELIXIR SHOPIFY ORDER SYNC')
  console.log('═'.repeat(60))
  console.log(`  Mode: ${FULL_SYNC ? 'Full (18 months)' : `Incremental (${SYNC_DAYS} days)`}`)
  console.log(`  Dry Run: ${DRY_RUN ? 'Yes' : 'No'}`)
  console.log(`  Calculate Only: ${CALCULATE_ONLY ? 'Yes' : 'No'}`)
  console.log('═'.repeat(60))

  const startTime = new Date()
  const stats: SyncStats = {
    ordersProcessed: 0,
    ordersCreated: 0,
    ordersUpdated: 0,
    lineItemsCreated: 0,
    errors: 0,
  }

  try {
    // Load credentials
    console.log('\nLoading credentials...')
    const shopifyToken = await creds.get('teelixir', 'shopify_access_token')
    const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')

    if (!shopifyToken) {
      throw new Error('Missing Teelixir Shopify access token')
    }

    if (!supabaseKey) {
      throw new Error('Missing master_supabase_service_role_key')
    }

    // Initialize Supabase
    const supabase = createClient(SUPABASE_URL, supabaseKey)

    if (!CALCULATE_ONLY) {
      // Calculate date range
      const createdAtMin = new Date()
      createdAtMin.setDate(createdAtMin.getDate() - SYNC_DAYS)
      const createdAtMinStr = createdAtMin.toISOString()

      // Fetch orders from Shopify
      const orders = await fetchOrders(shopifyToken, createdAtMinStr)
      console.log(`\nFetched ${orders.length} orders from Shopify`)

      if (orders.length > 0) {
        // Sync to Supabase
        await syncOrders(supabase, orders, stats)
      }
    }

    // Calculate order sequences
    await calculateOrderSequences(supabase)

    // Log sync
    await logSync(supabase, FULL_SYNC ? 'full' : 'incremental', stats, startTime)
    await updateJobStatus(supabase, true)

    // Summary
    console.log('\n' + '═'.repeat(60))
    console.log('  SYNC COMPLETE')
    console.log('═'.repeat(60))
    console.log(`  Orders processed: ${stats.ordersProcessed}`)
    console.log(`  Orders created/updated: ${stats.ordersCreated}`)
    console.log(`  Line items created: ${stats.lineItemsCreated}`)
    console.log(`  Errors: ${stats.errors}`)
    console.log(`  Duration: ${Math.round((Date.now() - startTime.getTime()) / 1000)}s`)
    console.log('═'.repeat(60))

  } catch (error: any) {
    console.error('\nSync failed:', error.message)

    // Initialize Supabase for error logging
    try {
      const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')
      if (supabaseKey) {
        const supabase = createClient(SUPABASE_URL, supabaseKey)
        await logSync(supabase, FULL_SYNC ? 'full' : 'incremental', stats, startTime, error.message)
        await updateJobStatus(supabase, false, error.message)
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    process.exit(1)
  }
}

main()
