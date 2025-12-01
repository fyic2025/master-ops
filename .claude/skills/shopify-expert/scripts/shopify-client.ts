#!/usr/bin/env npx tsx

/**
 * Shopify API Client
 *
 * Command-line interface for Shopify operations.
 *
 * Usage:
 *   npx tsx shopify-client.ts products --list
 *   npx tsx shopify-client.ts products --get 123
 *   npx tsx shopify-client.ts products --low-stock 10
 *   npx tsx shopify-client.ts orders --unfulfilled
 *   npx tsx shopify-client.ts collections --list
 */

// Environment configuration
const config = {
  shop: process.env.SHOPIFY_SHOP_DOMAIN || '',
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
  apiVersion: '2024-01',
  get baseUrl() {
    return `https://${this.shop}/admin/api/${this.apiVersion}`
  }
}

const headers = {
  'X-Shopify-Access-Token': config.accessToken,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

// Interfaces
interface ShopifyProduct {
  id: number
  title: string
  handle: string
  vendor: string
  product_type: string
  status: string
  tags: string
  variants: ShopifyVariant[]
  created_at: string
  updated_at: string
}

interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  price: string
  sku: string
  inventory_quantity: number
  inventory_item_id: number
}

interface ShopifyOrder {
  id: number
  name: string
  email: string
  financial_status: string
  fulfillment_status: string | null
  total_price: string
  created_at: string
  line_items: Array<{ title: string; quantity: number }>
}

interface ShopifyCollection {
  id: number
  title: string
  handle: string
  products_count?: number
  published_at: string
}

// API Functions
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  })

  // Handle rate limiting
  const callLimit = response.headers.get('X-Shopify-Shop-Api-Call-Limit')
  if (callLimit) {
    const [used, max] = callLimit.split('/').map(Number)
    if (used >= max - 2) {
      console.log(`Rate limit: ${used}/${max}, waiting...`)
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  if (response.status === 429) {
    const retryAfter = parseFloat(response.headers.get('Retry-After') || '2')
    console.log(`Rate limited. Waiting ${retryAfter}s...`)
    await new Promise(r => setTimeout(r, retryAfter * 1000))
    return fetchAPI(endpoint, options)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`API Error ${response.status}: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// Product Operations
async function listProducts(limit = 50): Promise<void> {
  const data = await fetchAPI(`/products.json?limit=${limit}&status=active`)

  console.log('\n📦 PRODUCTS')
  console.log('='.repeat(80))

  data.products.forEach((p: ShopifyProduct) => {
    const variant = p.variants[0]
    const stock = variant?.inventory_quantity ?? 0
    const stockIcon = stock <= 0 ? '❌' : stock <= 10 ? '⚠️' : '✓'
    console.log(
      `[${p.id}] ${p.title.substring(0, 40).padEnd(40)} ` +
      `$${parseFloat(variant?.price || '0').toFixed(2).padStart(8)} ${stockIcon} ${stock.toString().padStart(4)} stock`
    )
  })

  console.log(`\nTotal: ${data.products.length} products`)
}

async function getProduct(id: number): Promise<void> {
  const data = await fetchAPI(`/products/${id}.json`)
  const p = data.product

  console.log('\n📦 PRODUCT DETAILS')
  console.log('='.repeat(60))
  console.log(`ID:          ${p.id}`)
  console.log(`Title:       ${p.title}`)
  console.log(`Handle:      ${p.handle}`)
  console.log(`Vendor:      ${p.vendor}`)
  console.log(`Type:        ${p.product_type}`)
  console.log(`Status:      ${p.status}`)
  console.log(`Tags:        ${p.tags}`)
  console.log(`Created:     ${new Date(p.created_at).toLocaleDateString()}`)
  console.log(`Updated:     ${new Date(p.updated_at).toLocaleDateString()}`)

  if (p.variants?.length > 0) {
    console.log('\nVariants:')
    p.variants.forEach((v: ShopifyVariant) => {
      console.log(`  - ${v.sku || 'N/A'}: $${v.price} (${v.inventory_quantity} stock)`)
    })
  }
}

async function getLowStockProducts(threshold = 10): Promise<void> {
  const data = await fetchAPI(`/products.json?limit=250&status=active`)

  const lowStock = data.products.filter((p: ShopifyProduct) => {
    const totalStock = p.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
    return totalStock < threshold && totalStock >= 0
  })

  console.log(`\n⚠️ LOW STOCK PRODUCTS (< ${threshold} units)`)
  console.log('='.repeat(80))

  if (lowStock.length === 0) {
    console.log('No low stock products found!')
    return
  }

  lowStock
    .sort((a: ShopifyProduct, b: ShopifyProduct) => {
      const stockA = a.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
      const stockB = b.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
      return stockA - stockB
    })
    .forEach((p: ShopifyProduct) => {
      const stock = p.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
      const icon = stock === 0 ? '❌' : '⚠️'
      const sku = p.variants[0]?.sku || 'N/A'
      console.log(
        `${icon} [${p.id}] ${sku.padEnd(20)} ${p.title.substring(0, 35).padEnd(35)} Stock: ${stock}`
      )
    })

  console.log(`\nTotal: ${lowStock.length} products with low stock`)
}

async function searchProducts(query: string): Promise<void> {
  const data = await fetchAPI(`/products.json?title=${encodeURIComponent(query)}&limit=50`)

  console.log(`\n🔍 SEARCH: "${query}"`)
  console.log('='.repeat(60))

  if (data.products.length === 0) {
    console.log('No products found')
    return
  }

  data.products.forEach((p: ShopifyProduct) => {
    const variant = p.variants[0]
    console.log(`[${p.id}] ${(variant?.sku || 'N/A').padEnd(15)} ${p.title.substring(0, 40)} - $${variant?.price}`)
  })
}

// Order Operations
async function listUnfulfilledOrders(): Promise<void> {
  const data = await fetchAPI('/orders.json?fulfillment_status=unfulfilled&financial_status=paid&limit=50')

  console.log('\n📋 UNFULFILLED ORDERS')
  console.log('='.repeat(80))

  if (data.orders.length === 0) {
    console.log('No unfulfilled orders!')
    return
  }

  data.orders.forEach((o: ShopifyOrder) => {
    const date = new Date(o.created_at).toLocaleDateString()
    const items = o.line_items.map(i => `${i.quantity}x ${i.title.substring(0, 20)}`).join(', ')
    console.log(
      `${o.name.padEnd(10)} ${date.padEnd(12)} $${parseFloat(o.total_price).toFixed(2).padStart(8)} ` +
      `${o.email?.substring(0, 25) || 'N/A'}`
    )
    console.log(`           Items: ${items.substring(0, 60)}`)
  })

  console.log(`\nTotal: ${data.orders.length} unfulfilled orders`)
}

async function listRecentOrders(limit = 10): Promise<void> {
  const data = await fetchAPI(`/orders.json?limit=${limit}&status=any`)

  console.log('\n📋 RECENT ORDERS')
  console.log('='.repeat(80))

  data.orders.forEach((o: ShopifyOrder) => {
    const date = new Date(o.created_at).toLocaleDateString()
    const fulfillment = o.fulfillment_status || 'unfulfilled'
    const icon = fulfillment === 'fulfilled' ? '✓' : fulfillment === 'partial' ? '◐' : '○'

    console.log(
      `${icon} ${o.name.padEnd(10)} ${date.padEnd(12)} ` +
      `${o.financial_status.padEnd(10)} ${fulfillment.padEnd(12)} ` +
      `$${parseFloat(o.total_price).toFixed(2).padStart(8)}`
    )
  })
}

// Collection Operations
async function listCollections(): Promise<void> {
  const [smart, custom] = await Promise.all([
    fetchAPI('/smart_collections.json'),
    fetchAPI('/custom_collections.json')
  ])

  console.log('\n📁 COLLECTIONS')
  console.log('='.repeat(60))

  console.log('\nSmart Collections:')
  smart.smart_collections.forEach((c: ShopifyCollection) => {
    console.log(`  [${c.id}] ${c.title}`)
  })

  console.log('\nCustom Collections:')
  custom.custom_collections.forEach((c: ShopifyCollection) => {
    console.log(`  [${c.id}] ${c.title}`)
  })
}

// Inventory Operations
async function getLocations(): Promise<void> {
  const data = await fetchAPI('/locations.json')

  console.log('\n📍 LOCATIONS')
  console.log('='.repeat(60))

  data.locations.forEach((loc: any) => {
    const active = loc.active ? '✓' : '✗'
    console.log(`${active} [${loc.id}] ${loc.name} - ${loc.city}, ${loc.country}`)
  })
}

async function updateInventory(inventoryItemId: number, locationId: number, quantity: number): Promise<void> {
  await fetchAPI('/inventory_levels/set.json', {
    method: 'POST',
    body: JSON.stringify({
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: quantity
    })
  })

  console.log(`\n✓ Inventory updated`)
  console.log(`  Item ID: ${inventoryItemId}`)
  console.log(`  Location: ${locationId}`)
  console.log(`  New quantity: ${quantity}`)
}

// Shop Info
async function getShopInfo(): Promise<void> {
  const data = await fetchAPI('/shop.json')
  const shop = data.shop

  console.log('\n🏪 SHOP INFO')
  console.log('='.repeat(40))
  console.log(`Name:        ${shop.name}`)
  console.log(`Domain:      ${shop.domain}`)
  console.log(`Email:       ${shop.email}`)
  console.log(`Currency:    ${shop.currency}`)
  console.log(`Timezone:    ${shop.iana_timezone}`)
  console.log(`Plan:        ${shop.plan_name}`)
}

// Help
function showHelp(): void {
  console.log(`
Shopify CLI Client

Usage:
  npx tsx shopify-client.ts <command> [options]

Commands:
  shop                        Show shop info

  products --list             List products
  products --get <id>         Get product details
  products --search <query>   Search products
  products --low-stock [n]    Show products with stock < n (default: 10)

  orders --recent [n]         List n recent orders (default: 10)
  orders --unfulfilled        List unfulfilled paid orders

  collections --list          List all collections

  inventory --locations       List warehouse locations
  inventory --set <item_id> <location_id> <qty>  Set inventory level

Environment:
  SHOPIFY_SHOP_DOMAIN       Your shop domain (store.myshopify.com)
  SHOPIFY_ACCESS_TOKEN      Your Shopify access token

Examples:
  npx tsx shopify-client.ts shop
  npx tsx shopify-client.ts products --low-stock 5
  npx tsx shopify-client.ts orders --unfulfilled
  npx tsx shopify-client.ts products --get 12345
`)
}

// CLI
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (!config.shop || !config.accessToken) {
    console.error('Error: SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN environment variables required')
    process.exit(1)
  }

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  const command = args[0]
  const subcommand = args[1]

  try {
    switch (command) {
      case 'shop':
        await getShopInfo()
        break

      case 'products':
        if (subcommand === '--list') {
          await listProducts(parseInt(args[2]) || 50)
        } else if (subcommand === '--get' && args[2]) {
          await getProduct(parseInt(args[2]))
        } else if (subcommand === '--search' && args[2]) {
          await searchProducts(args[2])
        } else if (subcommand === '--low-stock') {
          await getLowStockProducts(parseInt(args[2]) || 10)
        } else {
          console.error('Invalid products command. Use --help for usage.')
        }
        break

      case 'orders':
        if (subcommand === '--recent') {
          await listRecentOrders(parseInt(args[2]) || 10)
        } else if (subcommand === '--unfulfilled') {
          await listUnfulfilledOrders()
        } else {
          console.error('Invalid orders command. Use --help for usage.')
        }
        break

      case 'collections':
        if (subcommand === '--list') {
          await listCollections()
        } else {
          await listCollections()
        }
        break

      case 'inventory':
        if (subcommand === '--locations') {
          await getLocations()
        } else if (subcommand === '--set' && args[2] && args[3] && args[4]) {
          await updateInventory(parseInt(args[2]), parseInt(args[3]), parseInt(args[4]))
        } else {
          console.error('Invalid inventory command. Use --help for usage.')
        }
        break

      default:
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
