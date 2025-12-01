#!/usr/bin/env npx tsx

/**
 * BigCommerce API Client
 *
 * Command-line interface for BigCommerce operations.
 *
 * Usage:
 *   npx tsx bc-client.ts products --list
 *   npx tsx bc-client.ts products --get 123
 *   npx tsx bc-client.ts products --low-stock 10
 *   npx tsx bc-client.ts orders --recent 10
 *   npx tsx bc-client.ts categories --tree
 */

// Environment configuration
const config = {
  storeHash: process.env.BC_STORE_HASH || '',
  accessToken: process.env.BC_ACCESS_TOKEN || '',
  get baseUrl() {
    return `https://api.bigcommerce.com/stores/${this.storeHash}/v3`
  },
  get v2Url() {
    return `https://api.bigcommerce.com/stores/${this.storeHash}/v2`
  }
}

const headers = {
  'X-Auth-Token': config.accessToken,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

// Interfaces
interface BCProduct {
  id: number
  name: string
  sku: string
  price: number
  sale_price: number
  cost_price: number
  inventory_level: number
  is_visible: boolean
  categories: number[]
  date_modified: string
}

interface BCOrder {
  id: number
  customer_id: number
  status_id: number
  status: string
  total_inc_tax: string
  items_total: number
  date_created: string
  billing_address: { first_name: string; last_name: string; email: string }
}

interface BCCategory {
  id: number
  name: string
  parent_id: number
  is_visible: boolean
  sort_order: number
}

// API Functions
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  })

  if (response.status === 429) {
    const resetMs = parseInt(response.headers.get('X-Rate-Limit-Time-Reset-Ms') || '1000')
    console.log(`Rate limited. Waiting ${resetMs}ms...`)
    await new Promise(r => setTimeout(r, resetMs))
    return fetchAPI(endpoint, options)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`API Error ${response.status}: ${JSON.stringify(error)}`)
  }

  if (response.status === 204) return null
  return response.json()
}

// Product Operations
async function listProducts(limit = 50): Promise<void> {
  const data = await fetchAPI(`/catalog/products?limit=${limit}&sort=date_modified&direction=desc`)

  console.log('\n📦 PRODUCTS')
  console.log('='.repeat(80))

  data.data.forEach((p: BCProduct) => {
    const visibility = p.is_visible ? '✓' : '✗'
    const stock = p.inventory_level
    const stockIcon = stock <= 0 ? '❌' : stock <= 10 ? '⚠️' : '✓'
    console.log(
      `[${p.id}] ${visibility} ${p.name.substring(0, 40).padEnd(40)} ` +
      `$${p.price.toFixed(2).padStart(8)} ${stockIcon} ${stock.toString().padStart(4)} stock`
    )
  })

  console.log(`\nTotal: ${data.meta.pagination.total} products`)
}

async function getProduct(id: number): Promise<void> {
  const data = await fetchAPI(`/catalog/products/${id}?include=variants,images,custom_fields`)
  const p = data.data

  console.log('\n📦 PRODUCT DETAILS')
  console.log('='.repeat(60))
  console.log(`ID:          ${p.id}`)
  console.log(`Name:        ${p.name}`)
  console.log(`SKU:         ${p.sku}`)
  console.log(`Price:       $${p.price}`)
  console.log(`Sale Price:  ${p.sale_price ? `$${p.sale_price}` : 'N/A'}`)
  console.log(`Cost:        ${p.cost_price ? `$${p.cost_price}` : 'N/A'}`)
  console.log(`Inventory:   ${p.inventory_level}`)
  console.log(`Visible:     ${p.is_visible ? 'Yes' : 'No'}`)
  console.log(`Categories:  ${p.categories.join(', ')}`)
  console.log(`URL:         ${p.custom_url?.url || 'N/A'}`)
  console.log(`Modified:    ${p.date_modified}`)

  if (p.variants?.length > 0) {
    console.log('\nVariants:')
    p.variants.forEach((v: any) => {
      console.log(`  - ${v.sku}: $${v.price} (${v.inventory_level} stock)`)
    })
  }
}

async function getLowStockProducts(threshold = 10): Promise<void> {
  const data = await fetchAPI(
    `/catalog/products?inventory_level:less=${threshold}&is_visible=true&limit=250`
  )

  console.log(`\n⚠️ LOW STOCK PRODUCTS (< ${threshold} units)`)
  console.log('='.repeat(80))

  if (data.data.length === 0) {
    console.log('No low stock products found!')
    return
  }

  data.data
    .sort((a: BCProduct, b: BCProduct) => a.inventory_level - b.inventory_level)
    .forEach((p: BCProduct) => {
      const icon = p.inventory_level === 0 ? '❌' : '⚠️'
      console.log(
        `${icon} [${p.id}] ${p.sku.padEnd(20)} ${p.name.substring(0, 35).padEnd(35)} ` +
        `Stock: ${p.inventory_level}`
      )
    })

  console.log(`\nTotal: ${data.data.length} products with low stock`)
}

async function searchProducts(query: string): Promise<void> {
  const data = await fetchAPI(`/catalog/products?name:like=${encodeURIComponent(query)}&limit=50`)

  console.log(`\n🔍 SEARCH: "${query}"`)
  console.log('='.repeat(60))

  if (data.data.length === 0) {
    console.log('No products found')
    return
  }

  data.data.forEach((p: BCProduct) => {
    console.log(`[${p.id}] ${p.sku.padEnd(15)} ${p.name.substring(0, 40)} - $${p.price}`)
  })
}

// Order Operations
async function listRecentOrders(limit = 10): Promise<void> {
  const data = await fetchAPI(`${config.v2Url}/orders?limit=${limit}&sort=date_created:desc`)

  console.log('\n📋 RECENT ORDERS')
  console.log('='.repeat(80))

  const statusNames: Record<number, string> = {
    1: 'Pending',
    2: 'Shipped',
    5: 'Cancelled',
    9: 'Awaiting Shipment',
    10: 'Completed',
    11: 'Awaiting Fulfillment'
  }

  data.forEach((o: BCOrder) => {
    const status = statusNames[o.status_id] || o.status
    const date = new Date(o.date_created).toLocaleDateString()
    console.log(
      `#${o.id.toString().padEnd(8)} ${date.padEnd(12)} ` +
      `${status.padEnd(20)} $${parseFloat(o.total_inc_tax).toFixed(2).padStart(10)} ` +
      `${o.billing_address?.email || 'N/A'}`
    )
  })
}

async function getOrdersByStatus(statusId: number): Promise<void> {
  const data = await fetchAPI(`${config.v2Url}/orders?status_id=${statusId}&limit=50`)

  const statusNames: Record<number, string> = {
    1: 'Pending', 2: 'Shipped', 9: 'Awaiting Shipment',
    10: 'Completed', 11: 'Awaiting Fulfillment'
  }

  console.log(`\n📋 ORDERS - ${statusNames[statusId] || `Status ${statusId}`}`)
  console.log('='.repeat(60))

  if (data.length === 0) {
    console.log('No orders found')
    return
  }

  data.forEach((o: BCOrder) => {
    const date = new Date(o.date_created).toLocaleDateString()
    console.log(
      `#${o.id} | ${date} | $${parseFloat(o.total_inc_tax).toFixed(2)} | ` +
      `${o.items_total} items`
    )
  })

  console.log(`\nTotal: ${data.length} orders`)
}

// Category Operations
async function listCategories(): Promise<void> {
  const data = await fetchAPI('/catalog/categories?limit=250')

  console.log('\n📁 CATEGORIES')
  console.log('='.repeat(60))

  // Build tree structure
  const categories = data.data as BCCategory[]
  const byParent = new Map<number, BCCategory[]>()

  categories.forEach(c => {
    const list = byParent.get(c.parent_id) || []
    list.push(c)
    byParent.set(c.parent_id, list)
  })

  function printCategory(cat: BCCategory, indent = 0): void {
    const visibility = cat.is_visible ? '✓' : '✗'
    const prefix = '  '.repeat(indent)
    console.log(`${prefix}${visibility} [${cat.id}] ${cat.name}`)

    const children = byParent.get(cat.id) || []
    children
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach(c => printCategory(c, indent + 1))
  }

  const rootCategories = byParent.get(0) || []
  rootCategories
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach(c => printCategory(c))
}

// Inventory Operations
async function updateInventory(productId: number, quantity: number): Promise<void> {
  const data = await fetchAPI(`/catalog/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ inventory_level: quantity })
  })

  console.log(`\n✓ Inventory updated for product ${productId}`)
  console.log(`  New level: ${data.data.inventory_level}`)
}

// Store Summary
async function getStoreSummary(): Promise<void> {
  const summary = await fetchAPI('/catalog/summary')

  console.log('\n🏪 STORE SUMMARY')
  console.log('='.repeat(40))
  console.log(`Products:        ${summary.data.inventory_count}`)
  console.log(`Variants:        ${summary.data.variant_count}`)
  console.log(`Categories:      ${summary.data.primary_category_count}`)
  console.log(`Brands:          ${summary.data.brand_count}`)
}

// Help
function showHelp(): void {
  console.log(`
BigCommerce CLI Client

Usage:
  npx tsx bc-client.ts <command> [options]

Commands:
  summary                     Show store summary

  products --list             List recent products
  products --get <id>         Get product details
  products --search <query>   Search products by name
  products --low-stock [n]    Show products with stock < n (default: 10)
  products --update-stock <id> <qty>  Update product inventory

  orders --recent [n]         List n recent orders (default: 10)
  orders --status <id>        List orders by status ID

  categories --list           List all categories as tree
  categories --tree           Same as --list

Order Status IDs:
  1=Pending, 2=Shipped, 5=Cancelled, 9=Awaiting Shipment,
  10=Completed, 11=Awaiting Fulfillment

Environment:
  BC_STORE_HASH       Your BigCommerce store hash
  BC_ACCESS_TOKEN     Your BigCommerce API access token

Examples:
  npx tsx bc-client.ts summary
  npx tsx bc-client.ts products --low-stock 5
  npx tsx bc-client.ts orders --status 11
  npx tsx bc-client.ts products --get 12345
`)
}

// CLI
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (!config.storeHash || !config.accessToken) {
    console.error('Error: BC_STORE_HASH and BC_ACCESS_TOKEN environment variables required')
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
      case 'summary':
        await getStoreSummary()
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
        } else if (subcommand === '--update-stock' && args[2] && args[3]) {
          await updateInventory(parseInt(args[2]), parseInt(args[3]))
        } else {
          console.error('Invalid products command. Use --help for usage.')
        }
        break

      case 'orders':
        if (subcommand === '--recent') {
          await listRecentOrders(parseInt(args[2]) || 10)
        } else if (subcommand === '--status' && args[2]) {
          await getOrdersByStatus(parseInt(args[2]))
        } else {
          console.error('Invalid orders command. Use --help for usage.')
        }
        break

      case 'categories':
        if (subcommand === '--list' || subcommand === '--tree') {
          await listCategories()
        } else {
          await listCategories()
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
