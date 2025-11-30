/**
 * Check Teelixir orders for bundles
 */

import { getStoreConfig } from '../src/config.js'
import { fetchRecentShopifyOrders } from '../src/order-sync.js'

async function main() {
  const config = getStoreConfig('teelixir')
  if (!config) {
    console.error('Could not load teelixir config')
    return
  }

  console.log('Fetching recent Teelixir orders...\n')
  const orders = await fetchRecentShopifyOrders(config, undefined, 30)

  console.log('=== Recent Teelixir Orders ===\n')

  const bundleKeywords = ['bundle', 'pack', 'kit', 'set', 'collection', 'combo', 'sample']
  const potentialBundles: any[] = []

  for (const order of orders) {
    console.log(`Order #${order.order_number} - $${order.total_price}`)

    for (const item of order.line_items) {
      const titleLower = item.title.toLowerCase()
      const isBundle = bundleKeywords.some(kw => titleLower.includes(kw))
      const isFree = parseFloat(item.price) === 0

      let flag = ''
      if (isBundle) {
        flag = ' [BUNDLE?]'
        potentialBundles.push({
          orderNumber: order.order_number,
          sku: item.sku,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        })
      }
      if (isFree) flag = ' [FREE/PROMO]'

      console.log(`  - ${item.sku || '(no sku)'}: ${item.title} x${item.quantity} @ $${item.price}${flag}`)
    }
    console.log('')
  }

  if (potentialBundles.length > 0) {
    console.log('='.repeat(60))
    console.log('POTENTIAL BUNDLES FOUND:')
    console.log('='.repeat(60))
    for (const b of potentialBundles) {
      console.log(`  #${b.orderNumber}: ${b.sku} - ${b.title} @ $${b.price}`)
    }
  } else {
    console.log('No obvious bundles found in recent orders.')
  }
}

main().catch(console.error)
