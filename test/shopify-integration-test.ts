/**
 * Shopify Integration Test
 *
 * Quick test to verify Shopify API connection and basic operations
 *
 * Usage:
 *   npx tsx test/shopify-integration-test.ts
 */

import { shopifyClient } from '../shared/libs/integrations/shopify'

async function testShopifyIntegration() {
  console.log('🧪 Testing Shopify Integration...\n')

  try {
    // Test 1: Health Check
    console.log('1️⃣ Running health check...')
    const health = await shopifyClient.healthCheck()
    console.log(`   ✅ Health: ${health.healthy ? 'OK' : 'FAILED'}`)
    console.log(`   📊 Service: ${health.service}`)
    console.log(`   🕒 Timestamp: ${health.timestamp}`)
    console.log()

    // Test 2: Get Shop Info
    console.log('2️⃣ Fetching shop information...')
    const shopInfo = await shopifyClient.shop.get()
    console.log(`   ✅ Shop Name: ${shopInfo.name}`)
    console.log(`   🌍 Domain: ${shopInfo.domain}`)
    console.log(`   💰 Currency: ${shopInfo.currency}`)
    console.log(`   📧 Email: ${shopInfo.email}`)
    console.log()

    // Test 3: Count Products
    console.log('3️⃣ Counting products...')
    const productCount = await shopifyClient.products.count({ status: 'active' })
    console.log(`   ✅ Active Products: ${productCount}`)
    console.log()

    // Test 4: List Products (first 5)
    console.log('4️⃣ Listing first 5 products...')
    const products = await shopifyClient.products.list({ limit: 5, status: 'active' })
    console.log(`   ✅ Found ${products.length} products:`)
    products.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.title}`)
      console.log(`      ID: ${product.id}`)
      console.log(`      SKU: ${product.variants[0]?.sku || 'N/A'}`)
      console.log(`      Price: $${product.variants[0]?.price || 'N/A'}`)
      console.log(`      Status: ${product.status}`)
    })
    console.log()

    // Test 5: Count Orders
    console.log('5️⃣ Counting orders...')
    const orderCount = await shopifyClient.orders.count({ status: 'any' })
    console.log(`   ✅ Total Orders: ${orderCount}`)
    console.log()

    // Test 6: List Recent Orders (first 3)
    console.log('6️⃣ Listing 3 most recent orders...')
    const orders = await shopifyClient.orders.list({ limit: 3, status: 'any' })
    console.log(`   ✅ Found ${orders.length} orders:`)
    orders.forEach((order, index) => {
      console.log(`   ${index + 1}. Order #${order.order_number}`)
      console.log(`      Name: ${order.name}`)
      console.log(`      Customer: ${order.customer?.email || 'N/A'}`)
      console.log(`      Total: ${order.currency} ${order.total_price}`)
      console.log(`      Status: ${order.financial_status} / ${order.fulfillment_status || 'unfulfilled'}`)
      console.log(`      Created: ${new Date(order.created_at).toLocaleDateString()}`)
    })
    console.log()

    // Test 7: Get Metrics
    console.log('7️⃣ Getting connector metrics...')
    const metrics = await shopifyClient.getMetrics()
    console.log(`   ✅ Service: ${metrics.service}`)
    console.log(`   ⏱️  Timeout: ${metrics.timeout}ms`)
    console.log(`   🔄 Retry Enabled: ${metrics.retry.enabled}`)
    console.log(`   🚦 Rate Limiter: ${metrics.rateLimiter.enabled ? 'Enabled' : 'Disabled'}`)
    if (metrics.rateLimiter.enabled) {
      console.log(`   🪙 Available Tokens: ${metrics.rateLimiter.availableTokens}`)
    }
    console.log()

    console.log('✅ All tests passed! Shopify integration is working correctly.\n')
    return true

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error('Details:', error)
    return false
  }
}

// Run the test
testShopifyIntegration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
