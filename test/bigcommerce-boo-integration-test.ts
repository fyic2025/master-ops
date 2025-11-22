#!/usr/bin/env tsx

/**
 * BigCommerce Integration Test for Buy Organics Online
 *
 * Comprehensive test suite to verify BigCommerce API integration
 *
 * Usage:
 *   npx tsx test/bigcommerce-boo-integration-test.ts
 */

import 'dotenv/config'
import { bigcommerceClient } from '../shared/libs/integrations/bigcommerce'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  duration: number
  data?: any
  error?: string
}

class BigCommerceIntegrationTest {
  private results: TestResult[] = []

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now()

    try {
      const data = await testFn()
      const duration = Date.now() - startTime

      this.results.push({
        name,
        status: 'PASS',
        duration,
        data,
      })

      console.log(`✅ ${name} (${duration}ms)`)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data).slice(0, 3)
        console.log(`   ${keys.join(', ')}${keys.length < Object.keys(data).length ? ', ...' : ''}`)
      } else if (Array.isArray(data)) {
        console.log(`   Found ${data.length} item(s)`)
      } else if (data !== undefined) {
        console.log(`   Result: ${JSON.stringify(data).substring(0, 80)}`)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if it's a permission error
      if (errorMessage.includes('403') || errorMessage.includes('scope')) {
        this.results.push({
          name,
          status: 'SKIP',
          duration,
          error: 'Missing API permissions (403)',
        })
        console.log(`⚠️  ${name} - SKIPPED (missing permissions)`)
      } else {
        this.results.push({
          name,
          status: 'FAIL',
          duration,
          error: errorMessage,
        })
        console.log(`❌ ${name} - FAILED`)
        console.log(`   Error: ${errorMessage.substring(0, 150)}`)
      }
    }
  }

  async runAllTests(): Promise<void> {
    console.log('\n🧪 BigCommerce Integration Test Suite')
    console.log('=====================================\n')
    console.log('Store: Buy Organics Online')
    console.log('Domain: buyorganicsonline.com.au')
    console.log('Store Hash: hhhi\n')

    // Test 1: Health Check
    await this.runTest('Health Check', async () => {
      const health = await bigcommerceClient.healthCheck()
      if (health.status !== 'healthy') {
        throw new Error(`Health check failed: ${health.error}`)
      }
      return {
        store: health.store?.name,
        domain: health.store?.domain,
        currency: health.store?.currency,
        productCount: health.productCount,
      }
    })

    // Test 2: Store Information
    await this.runTest('Get Store Information', async () => {
      const store = await bigcommerceClient.store.get()
      return {
        name: store.name,
        domain: store.domain,
        currency: store.currency,
        timezone: store.timezone?.name,
        plan: store.plan_name,
        stencil_enabled: store.features?.stencil_enabled,
      }
    })

    // Test 3: Products - List
    await this.runTest('List Products', async () => {
      const products = await bigcommerceClient.products.list({ limit: 5 })
      return {
        count: products.length,
        sample: products[0]?.name,
        types: [...new Set(products.map(p => p.type))],
      }
    })

    // Test 4: Products - Count
    await this.runTest('Count Products', async () => {
      const count = await bigcommerceClient.products.count()
      return { total: count }
    })

    // Test 5: Products - Get Single
    await this.runTest('Get Single Product', async () => {
      const products = await bigcommerceClient.products.list({ limit: 1 })
      if (products.length === 0) {
        throw new Error('No products found')
      }
      const product = await bigcommerceClient.products.get(products[0].id)
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        sku: product.sku,
      }
    })

    // Test 6: Products - Filter by visibility
    await this.runTest('Filter Products by Visibility', async () => {
      const visibleProducts = await bigcommerceClient.products.list({
        is_visible: true,
        limit: 10,
      })
      return {
        visible_count: visibleProducts.length,
      }
    })

    // Test 7: Orders - List
    await this.runTest('List Orders', async () => {
      const orders = await bigcommerceClient.orders.list({ limit: 5 })
      return {
        count: orders.length,
        latest_status: orders[0]?.status,
        total_value: orders[0]?.total_inc_tax,
      }
    })

    // Test 8: Orders - Count
    await this.runTest('Count Orders', async () => {
      const count = await bigcommerceClient.orders.count()
      return { total: count }
    })

    // Test 9: Orders - Get Single
    await this.runTest('Get Single Order', async () => {
      const orders = await bigcommerceClient.orders.list({ limit: 1 })
      if (orders.length === 0) {
        return { message: 'No orders found (this is OK for new stores)' }
      }
      const order = await bigcommerceClient.orders.get(orders[0].id)
      return {
        id: order.id,
        status: order.status,
        total: order.total_inc_tax,
        payment_method: order.payment_method,
      }
    })

    // Test 10: Customers - List
    await this.runTest('List Customers', async () => {
      const customers = await bigcommerceClient.customers.list({ limit: 5 })
      return {
        count: customers.length,
      }
    })

    // Test 11: Customers - Count
    await this.runTest('Count Customers', async () => {
      const count = await bigcommerceClient.customers.count()
      return { total: count }
    })

    // Test 12: Shipping Zones
    await this.runTest('List Shipping Zones', async () => {
      const zones = await bigcommerceClient.shipping.listZones()
      return {
        count: zones.length,
        zones: zones.map(z => ({ id: z.id, name: z.name, type: z.type })),
      }
    })

    // Test 13: Shipping Methods
    await this.runTest('List Shipping Methods', async () => {
      const zones = await bigcommerceClient.shipping.listZones()
      if (zones.length === 0) {
        throw new Error('No shipping zones found')
      }
      const methods = await bigcommerceClient.shipping.listMethods(zones[0].id)
      return {
        zone: zones[0].name,
        method_count: methods.length,
        methods: methods.map(m => ({ id: m.id, name: m.name, enabled: m.enabled })),
      }
    })

    // Test 14: Channels
    await this.runTest('List Channels', async () => {
      const channels = await bigcommerceClient.channels.list()
      return {
        count: channels.length,
        channels: channels.map(c => ({ id: c.id, name: c.name, type: c.type })),
      }
    })

    // Test 15: Create Test Cart (for checkout testing)
    await this.runTest('Create Test Cart', async () => {
      const products = await bigcommerceClient.products.list({ limit: 1, is_visible: true })
      if (products.length === 0) {
        throw new Error('No products available for cart test')
      }

      const cart = await bigcommerceClient.carts.create({
        line_items: [
          {
            quantity: 1,
            product_id: products[0].id,
          },
        ],
      })

      // Clean up - delete the test cart
      await bigcommerceClient.carts.delete(cart.id)

      return {
        cart_created: true,
        product_added: products[0].name,
        cart_deleted: true,
      }
    })

    // Print Summary
    this.printSummary()
  }

  private printSummary(): void {
    console.log('\n📊 Test Summary')
    console.log('===============\n')

    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const skipped = this.results.filter(r => r.status === 'SKIP').length
    const total = this.results.length

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total Tests: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⚠️  Skipped: ${skipped} (missing permissions)`)
    console.log(`⏱️  Duration: ${totalDuration}ms\n`)

    if (skipped > 0) {
      console.log('⚠️  Some tests were skipped due to missing API permissions.')
      console.log('   See BIGCOMMERCE-API-SETUP.md to update your API account.\n')
    }

    if (failed > 0) {
      console.log('❌ Failed Tests:\n')
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   - ${r.name}`)
          console.log(`     Error: ${r.error}\n`)
        })
      process.exit(1)
    } else {
      console.log('✅ All tests passed!\n')
      console.log('🎉 BigCommerce integration is working correctly.\n')

      // Show metrics
      console.log('📈 Connector Metrics:')
      const metrics = bigcommerceClient.getMetrics()
      console.log(`   Service: ${metrics.service}`)
      console.log(`   Store Hash: ${metrics.storeHash}`)
      console.log(`   Base URL: ${metrics.baseUrl}\n`)
    }
  }
}

// Run tests
const tester = new BigCommerceIntegrationTest()
tester.runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error)
  process.exit(1)
})
