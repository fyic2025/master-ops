/**
 * Run Order Sync CLI
 *
 * Fetches recent Shopify orders and creates Unleashed sales orders.
 * Loads bundle mappings from Supabase and logs sync results.
 *
 * Usage:
 *   npx tsx scripts/run-order-sync.ts <store|all> [--dry-run] [--since=<date>] [--limit=<n>]
 *
 * Examples:
 *   npx tsx scripts/run-order-sync.ts elevate --dry-run
 *   npx tsx scripts/run-order-sync.ts teelixir --since=2025-11-01
 *   npx tsx scripts/run-order-sync.ts all --limit=10
 */

import { getStoreConfig, getStoreNames } from '../src/config.js'
import { syncOrder, fetchRecentShopifyOrders, OrderSyncOptions } from '../src/order-sync.js'
import { BundleMapping } from '../src/types.js'
import {
  fetchBundleMappings,
  startSyncLog,
  completeSyncLog,
  isSupabaseAvailable,
} from '../src/supabase.js'

// Parse command line arguments
const args = process.argv.slice(2)
const targetStore = args.find(a => !a.startsWith('--')) || 'all'
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')

// Parse --since=YYYY-MM-DD
const sinceArg = args.find(a => a.startsWith('--since='))
const sinceDate = sinceArg ? new Date(sinceArg.replace('--since=', '')) : undefined

// Parse --limit=N
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.replace('--limit=', '')) : 10

const options: OrderSyncOptions = {
  dryRun,
  verbose,
}

async function syncStoreOrders(storeName: string) {
  const config = getStoreConfig(storeName)
  if (!config) {
    console.error(`❌ Unknown store: ${storeName}`)
    return
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Order Sync: ${config.displayName}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('='.repeat(60))

  // Start sync log (only if not dry run)
  const logId = !dryRun ? await startSyncLog(storeName, 'orders', 'cli') : null

  try {
    // Load bundle mappings from Supabase
    console.log(`\n📦 Loading bundle mappings from Supabase...`)
    const bundleMappings = await fetchBundleMappings(storeName)
    console.log(`   Found ${bundleMappings.length} bundle mappings`)

    // Fetch recent orders
    console.log(`\n📥 Fetching recent Shopify orders...`)
    if (sinceDate) {
      console.log(`   Since: ${sinceDate.toISOString()}`)
    }
    console.log(`   Limit: ${limit}`)

    const orders = await fetchRecentShopifyOrders(config, sinceDate, limit)
    console.log(`   Found ${orders.length} orders`)

    if (orders.length === 0) {
      console.log('\n✅ No orders to sync')
      if (logId) {
        await completeSyncLog(logId, { items_processed: 0, items_succeeded: 0, items_failed: 0 })
      }
      return
    }

    // Process each order
    const results = []
    for (const order of orders) {
      const result = await syncOrder(config, order, bundleMappings, options)
      results.push(result)
    }

    // Summary
    const succeeded = results.filter(r => r.status === 'success').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const failed = results.filter(r => r.status === 'failed').length

    console.log('\n' + '='.repeat(60))
    console.log('Summary:')
    console.log('='.repeat(60))
    console.log(`   Total orders: ${orders.length}`)
    console.log(`   Succeeded: ${succeeded}`)
    console.log(`   Skipped (already synced): ${skipped}`)
    console.log(`   Failed: ${failed}`)

    if (failed > 0) {
      console.log('\nFailed orders:')
      for (const result of results.filter(r => r.status === 'failed')) {
        console.log(`   #${result.shopifyOrderNumber}: ${result.error}`)
      }
    }

    // Complete sync log
    if (logId) {
      await completeSyncLog(logId, {
        items_processed: orders.length,
        items_succeeded: succeeded,
        items_failed: failed,
      }, {
        skipped,
        bundleMappingsLoaded: bundleMappings.length,
      })
    }

  } catch (error) {
    console.error(`\n❌ Error: ${(error as Error).message}`)
    if (logId) {
      await completeSyncLog(logId, { items_processed: 0, items_succeeded: 0, items_failed: 1 }, undefined, (error as Error).message)
    }
  }
}

async function main() {
  console.log('🔄 Unleashed-Shopify Order Sync')
  console.log('=' .repeat(60))
  console.log(`Target: ${targetStore}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Supabase: ${isSupabaseAvailable() ? 'Connected' : 'Not configured'}`)

  const storeNames = getStoreNames()

  if (targetStore === 'all') {
    for (const storeName of storeNames) {
      await syncStoreOrders(storeName)
    }
  } else {
    if (!storeNames.includes(targetStore)) {
      console.error(`\n❌ Unknown store: ${targetStore}`)
      console.error(`   Available stores: ${storeNames.join(', ')}`)
      process.exit(1)
    }
    await syncStoreOrders(targetStore)
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
})
