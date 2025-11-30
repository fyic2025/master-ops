/**
 * Run Inventory Sync CLI
 *
 * Usage:
 *   npx tsx scripts/run-inventory-sync.ts <store|all> [--dry-run] [--verbose]
 *
 * Examples:
 *   npx tsx scripts/run-inventory-sync.ts teelixir --dry-run
 *   npx tsx scripts/run-inventory-sync.ts elevate
 *   npx tsx scripts/run-inventory-sync.ts all --verbose
 */

import { getStoreConfig, getStoreNames } from '../src/config.js'
import { syncInventory, InventorySyncOptions } from '../src/inventory-sync.js'

// Parse command line arguments
const args = process.argv.slice(2)
const targetStore = args[0] || 'all'
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')

const options: InventorySyncOptions = {
  dryRun,
  verbose,
}

async function main() {
  console.log('🔄 Unleashed-Shopify Inventory Sync')
  console.log('=' .repeat(60))
  console.log(`Target: ${targetStore}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Verbose: ${verbose}`)

  const storeNames = getStoreNames()

  if (targetStore === 'all') {
    // Sync all stores
    const results = []
    for (const storeName of storeNames) {
      const config = getStoreConfig(storeName)
      if (config) {
        const result = await syncInventory(config, options)
        results.push(result)
      }
    }

    // Print overall summary
    console.log('\n' + '='.repeat(60))
    console.log('Overall Summary:')
    console.log('='.repeat(60))
    for (const result of results) {
      console.log(`   ${result.store}: ${result.stats.updated} updated, ${result.stats.errors} errors`)
    }
  } else {
    // Sync single store
    if (!storeNames.includes(targetStore)) {
      console.error(`\n❌ Unknown store: ${targetStore}`)
      console.error(`   Available stores: ${storeNames.join(', ')}`)
      process.exit(1)
    }

    const config = getStoreConfig(targetStore)
    if (!config) {
      console.error(`\n❌ Failed to load config for store: ${targetStore}`)
      process.exit(1)
    }

    await syncInventory(config, options)
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message)
  process.exit(1)
})
