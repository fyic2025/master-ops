/**
 * Check for duplicate orders in Unleashed
 *
 * Usage:
 *   npx tsx scripts/check-duplicates.ts [store]
 *   npx tsx scripts/check-duplicates.ts teelixir
 */

import 'dotenv/config'
import { getStoreConfig, getStoreNames } from '../src/config.js'
import { findUnleashedDuplicates } from '../src/order-sync.js'

async function main() {
  const args = process.argv.slice(2)
  const targetStore = args[0] || 'teelixir'

  console.log('🔍 Checking for duplicate orders in Unleashed')
  console.log('=' .repeat(60))
  console.log(`Store: ${targetStore}`)
  console.log('')

  const storeNames = getStoreNames()
  if (!storeNames.includes(targetStore)) {
    console.error(`Unknown store: ${targetStore}`)
    console.error(`Available stores: ${storeNames.join(', ')}`)
    process.exit(1)
  }

  const config = await getStoreConfig(targetStore)
  if (!config) {
    console.error(`Failed to load config for ${targetStore}`)
    process.exit(1)
  }

  console.log('📥 Fetching recent Unleashed orders...')
  const duplicates = await findUnleashedDuplicates(config)

  if (duplicates.length === 0) {
    console.log('\n✅ No duplicate orders detected!')
  } else {
    console.log(`\n⚠️ Found ${duplicates.length} potential duplicate group(s):\n`)

    for (let i = 0; i < duplicates.length; i++) {
      const group = duplicates[i]
      console.log(`Group ${i + 1}: ${group.reason}`)
      console.log('-'.repeat(50))

      for (const order of group.orders) {
        const date = new Date(order.orderDate).toLocaleDateString()
        console.log(`  ${order.orderNumber}`)
        console.log(`    Customer: ${order.customerName}`)
        console.log(`    Date: ${date}`)
        console.log(`    Total: $${order.total.toFixed(2)}`)
        console.log(`    CustomerRef: ${order.customerRef || 'N/A'}`)
        console.log('')
      }
    }

    console.log('=' .repeat(60))
    console.log('💡 Review these orders in Unleashed and delete duplicates if confirmed.')
  }
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
