/**
 * Test Connection Script
 *
 * Verifies API access to Shopify and Unleashed for all configured stores
 * Also retrieves Shopify location IDs
 */

import * as crypto from 'crypto'
import { getStoreConfig, getStoreNames, loadConfig } from '../src/config.js'
import { StoreConfig, ShopifyLocation, ShopifyProduct } from '../src/types.js'

// Get store from command line argument
const args = process.argv.slice(2)
const targetStore = args[0] || 'all'

async function testShopifyConnection(config: StoreConfig): Promise<{
  success: boolean
  locations?: ShopifyLocation[]
  productCount?: number
  error?: string
}> {
  const baseUrl = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}`

  try {
    // Get locations
    const locationsResponse = await fetch(`${baseUrl}/locations.json`, {
      headers: {
        'X-Shopify-Access-Token': config.shopify.accessToken,
        'Content-Type': 'application/json',
      },
    })

    if (!locationsResponse.ok) {
      const errorText = await locationsResponse.text()
      return {
        success: false,
        error: `Shopify API error ${locationsResponse.status}: ${errorText}`,
      }
    }

    const locationsData = await locationsResponse.json() as { locations?: ShopifyLocation[] }
    const locations = locationsData.locations || []

    // Get product count
    const countResponse = await fetch(`${baseUrl}/products/count.json`, {
      headers: {
        'X-Shopify-Access-Token': config.shopify.accessToken,
        'Content-Type': 'application/json',
      },
    })

    let productCount = 0
    if (countResponse.ok) {
      const countData = await countResponse.json() as { count?: number }
      productCount = countData.count || 0
    }

    return {
      success: true,
      locations,
      productCount,
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

async function testUnleashedConnection(config: StoreConfig): Promise<{
  success: boolean
  productCount?: number
  stockItemCount?: number
  error?: string
}> {
  const baseUrl = config.unleashed.apiUrl

  // Generate HMAC signature for Unleashed
  function generateSignature(queryString: string): string {
    const hmac = crypto.createHmac('sha256', config.unleashed.apiKey)
    hmac.update(queryString)
    return hmac.digest('base64')
  }

  try {
    // Test Products endpoint
    const productsUrl = `${baseUrl}/Products?pageSize=1`
    const productsQueryString = 'pageSize=1'
    const productsSignature = generateSignature(productsQueryString)

    const productsResponse = await fetch(productsUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': config.unleashed.apiId,
        'api-auth-signature': productsSignature,
      },
    })

    if (!productsResponse.ok) {
      const errorText = await productsResponse.text()
      return {
        success: false,
        error: `Unleashed API error ${productsResponse.status}: ${errorText}`,
      }
    }

    const productsData = await productsResponse.json() as { Pagination?: { NumberOfItems?: number } }
    const productCount = productsData.Pagination?.NumberOfItems || 0

    // Test StockOnHand endpoint
    const stockUrl = `${baseUrl}/StockOnHand?pageSize=1`
    const stockQueryString = 'pageSize=1'
    const stockSignature = generateSignature(stockQueryString)

    const stockResponse = await fetch(stockUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': config.unleashed.apiId,
        'api-auth-signature': stockSignature,
      },
    })

    let stockItemCount = 0
    if (stockResponse.ok) {
      const stockData = await stockResponse.json() as { Pagination?: { NumberOfItems?: number } }
      stockItemCount = stockData.Pagination?.NumberOfItems || 0
    }

    return {
      success: true,
      productCount,
      stockItemCount,
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

async function testStore(storeName: string) {
  const config = getStoreConfig(storeName)

  if (!config) {
    console.log(`\n❌ Store "${storeName}" not found`)
    return
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${config.displayName} (${storeName})`)
  console.log('='.repeat(60))

  // Test Shopify
  console.log('\n📦 Shopify Connection:')
  console.log(`   Domain: ${config.shopify.shopDomain}`)
  console.log(`   API Version: ${config.shopify.apiVersion}`)

  const shopifyResult = await testShopifyConnection(config)

  if (shopifyResult.success) {
    console.log('   ✅ Connection successful!')
    console.log(`   Products: ${shopifyResult.productCount}`)
    console.log('\n   📍 Locations:')
    for (const location of shopifyResult.locations || []) {
      const isActive = location.active ? '✓' : '✗'
      console.log(`      [${isActive}] ${location.name}`)
      console.log(`          ID: ${location.id}`)
      console.log(`          Address: ${location.address1}, ${location.city} ${location.zip}`)
    }

    // Output environment variable format
    if (shopifyResult.locations && shopifyResult.locations.length > 0) {
      const primaryLocation = shopifyResult.locations.find(l => l.active) || shopifyResult.locations[0]
      console.log(`\n   📋 Add to .env:`)
      console.log(`      ${storeName.toUpperCase()}_SHOPIFY_LOCATION_ID=${primaryLocation.id}`)
    }
  } else {
    console.log(`   ❌ Connection failed: ${shopifyResult.error}`)
  }

  // Test Unleashed
  console.log('\n📊 Unleashed Connection:')
  console.log(`   API URL: ${config.unleashed.apiUrl}`)
  console.log(`   API ID: ${config.unleashed.apiId.substring(0, 8)}...`)

  const unleashedResult = await testUnleashedConnection(config)

  if (unleashedResult.success) {
    console.log('   ✅ Connection successful!')
    console.log(`   Products: ${unleashedResult.productCount}`)
    console.log(`   Stock Items: ${unleashedResult.stockItemCount}`)
  } else {
    console.log(`   ❌ Connection failed: ${unleashedResult.error}`)
  }
}

async function main() {
  console.log('🔗 Unleashed-Shopify Sync - Connection Test')
  console.log('=' .repeat(60))

  const storeNames = getStoreNames()
  console.log(`\nConfigured stores: ${storeNames.join(', ')}`)

  if (targetStore === 'all') {
    for (const storeName of storeNames) {
      await testStore(storeName)
    }
  } else {
    if (!storeNames.includes(targetStore)) {
      console.log(`\n❌ Unknown store: ${targetStore}`)
      console.log(`   Available stores: ${storeNames.join(', ')}`)
      process.exit(1)
    }
    await testStore(targetStore)
  }

  console.log('\n' + '='.repeat(60))
  console.log('Test complete!')
}

main().catch(console.error)
