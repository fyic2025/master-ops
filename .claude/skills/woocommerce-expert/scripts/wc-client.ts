#!/usr/bin/env npx tsx

/**
 * WooCommerce API Client
 *
 * Command-line interface for WooCommerce operations.
 *
 * Usage:
 *   npx tsx wc-client.ts products --list
 *   npx tsx wc-client.ts products --get 123
 *   npx tsx wc-client.ts products --low-stock 10
 *   npx tsx wc-client.ts orders --processing
 *   npx tsx wc-client.ts categories --list
 */

// Environment configuration
const config = {
  url: process.env.WC_STORE_URL || '',
  consumerKey: process.env.WC_CONSUMER_KEY || '',
  consumerSecret: process.env.WC_CONSUMER_SECRET || '',
  get baseUrl() {
    return `${this.url}/wp-json/wc/v3`
  },
  get auth() {
    return Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64')
  }
}

const headers = {
  'Authorization': `Basic ${config.auth}`,
  'Content-Type': 'application/json'
}

// Interfaces
interface WCProduct {
  id: number
  name: string
  slug: string
  type: string
  status: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  stock_quantity: number | null
  stock_status: string
  manage_stock: boolean
  categories: Array<{ id: number; name: string }>
  date_modified: string
}

interface WCOrder {
  id: number
  number: string
  status: string
  total: string
  customer_id: number
  billing: { email: string; first_name: string; last_name: string }
  line_items: Array<{ name: string; quantity: number }>
  date_created: string
}

interface WCCategory {
  id: number
  name: string
  slug: string
  parent: number
  count: number
}

// API Functions
async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`API Error ${response.status}: ${error.message || JSON.stringify(error)}`)
  }

  return response.json()
}

// Product Operations
async function listProducts(limit = 50): Promise<void> {
  const data = await fetchAPI(`/products?per_page=${limit}&status=publish&orderby=date&order=desc`)

  console.log('\n📦 PRODUCTS')
  console.log('='.repeat(80))

  data.forEach((p: WCProduct) => {
    const stock = p.manage_stock ? (p.stock_quantity ?? 0) : '∞'
    const stockIcon = typeof stock === 'number' ? (stock <= 0 ? '❌' : stock <= 10 ? '⚠️' : '✓') : '✓'
    console.log(
      `[${p.id}] ${p.name.substring(0, 40).padEnd(40)} ` +
      `$${parseFloat(p.price || '0').toFixed(2).padStart(8)} ${stockIcon} ${String(stock).padStart(4)} stock`
    )
  })

  console.log(`\nShowing ${data.length} products`)
}

async function getProduct(id: number): Promise<void> {
  const p = await fetchAPI(`/products/${id}`)

  console.log('\n📦 PRODUCT DETAILS')
  console.log('='.repeat(60))
  console.log(`ID:          ${p.id}`)
  console.log(`Name:        ${p.name}`)
  console.log(`Slug:        ${p.slug}`)
  console.log(`Type:        ${p.type}`)
  console.log(`Status:      ${p.status}`)
  console.log(`SKU:         ${p.sku || 'N/A'}`)
  console.log(`Price:       $${p.price}`)
  console.log(`Regular:     $${p.regular_price}`)
  console.log(`Sale:        ${p.sale_price ? `$${p.sale_price}` : 'N/A'}`)
  console.log(`Stock:       ${p.manage_stock ? p.stock_quantity : 'Not tracked'}`)
  console.log(`Categories:  ${p.categories.map((c: any) => c.name).join(', ')}`)
  console.log(`Modified:    ${new Date(p.date_modified).toLocaleDateString()}`)

  if (p.type === 'variable' && p.variations?.length > 0) {
    console.log('\nVariations:')
    const variations = await fetchAPI(`/products/${p.id}/variations`)
    variations.forEach((v: any) => {
      const attrs = v.attributes.map((a: any) => a.option).join(' / ')
      console.log(`  - ${v.sku || 'N/A'}: ${attrs} - $${v.price} (${v.stock_quantity ?? '∞'} stock)`)
    })
  }
}

async function getLowStockProducts(threshold = 10): Promise<void> {
  const data = await fetchAPI(`/products?per_page=100&status=publish`)

  const lowStock = data.filter((p: WCProduct) =>
    p.manage_stock && p.stock_quantity !== null && p.stock_quantity < threshold
  )

  console.log(`\n⚠️ LOW STOCK PRODUCTS (< ${threshold} units)`)
  console.log('='.repeat(80))

  if (lowStock.length === 0) {
    console.log('No low stock products found!')
    return
  }

  lowStock
    .sort((a: WCProduct, b: WCProduct) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
    .forEach((p: WCProduct) => {
      const icon = p.stock_quantity === 0 ? '❌' : '⚠️'
      console.log(
        `${icon} [${p.id}] ${(p.sku || 'N/A').padEnd(15)} ${p.name.substring(0, 35).padEnd(35)} ` +
        `Stock: ${p.stock_quantity}`
      )
    })

  console.log(`\nTotal: ${lowStock.length} products with low stock`)
}

async function searchProducts(query: string): Promise<void> {
  const data = await fetchAPI(`/products?search=${encodeURIComponent(query)}&per_page=50`)

  console.log(`\n🔍 SEARCH: "${query}"`)
  console.log('='.repeat(60))

  if (data.length === 0) {
    console.log('No products found')
    return
  }

  data.forEach((p: WCProduct) => {
    console.log(`[${p.id}] ${(p.sku || 'N/A').padEnd(15)} ${p.name.substring(0, 40)} - $${p.price}`)
  })
}

// Order Operations
async function listProcessingOrders(): Promise<void> {
  const data = await fetchAPI('/orders?status=processing&per_page=50')

  console.log('\n📋 PROCESSING ORDERS')
  console.log('='.repeat(80))

  if (data.length === 0) {
    console.log('No processing orders!')
    return
  }

  data.forEach((o: WCOrder) => {
    const date = new Date(o.date_created).toLocaleDateString()
    const items = o.line_items.map(i => `${i.quantity}x ${i.name.substring(0, 15)}`).join(', ')
    console.log(
      `#${o.number.padEnd(8)} ${date.padEnd(12)} $${parseFloat(o.total).toFixed(2).padStart(8)} ` +
      `${o.billing.email?.substring(0, 25) || 'Guest'}`
    )
    console.log(`           Items: ${items.substring(0, 60)}`)
  })

  console.log(`\nTotal: ${data.length} orders to process`)
}

async function listRecentOrders(limit = 10): Promise<void> {
  const data = await fetchAPI(`/orders?per_page=${limit}`)

  console.log('\n📋 RECENT ORDERS')
  console.log('='.repeat(80))

  const statusIcons: Record<string, string> = {
    pending: '⏳',
    processing: '🔄',
    'on-hold': '⏸️',
    completed: '✅',
    cancelled: '❌',
    refunded: '↩️',
    failed: '⚠️'
  }

  data.forEach((o: WCOrder) => {
    const date = new Date(o.date_created).toLocaleDateString()
    const icon = statusIcons[o.status] || '○'

    console.log(
      `${icon} #${o.number.padEnd(8)} ${date.padEnd(12)} ${o.status.padEnd(12)} ` +
      `$${parseFloat(o.total).toFixed(2).padStart(8)}`
    )
  })
}

async function getOrdersByStatus(status: string): Promise<void> {
  const data = await fetchAPI(`/orders?status=${status}&per_page=50`)

  console.log(`\n📋 ORDERS - ${status.toUpperCase()}`)
  console.log('='.repeat(60))

  if (data.length === 0) {
    console.log(`No ${status} orders found`)
    return
  }

  data.forEach((o: WCOrder) => {
    const date = new Date(o.date_created).toLocaleDateString()
    console.log(
      `#${o.number} | ${date} | $${parseFloat(o.total).toFixed(2)} | ` +
      `${o.line_items.length} items`
    )
  })

  console.log(`\nTotal: ${data.length} ${status} orders`)
}

// Category Operations
async function listCategories(): Promise<void> {
  const data = await fetchAPI('/products/categories?per_page=100')

  console.log('\n📁 CATEGORIES')
  console.log('='.repeat(60))

  // Build tree structure
  const categories = data as WCCategory[]
  const byParent = new Map<number, WCCategory[]>()

  categories.forEach(c => {
    const list = byParent.get(c.parent) || []
    list.push(c)
    byParent.set(c.parent, list)
  })

  function printCategory(cat: WCCategory, indent = 0): void {
    const prefix = '  '.repeat(indent)
    console.log(`${prefix}[${cat.id}] ${cat.name} (${cat.count})`)

    const children = byParent.get(cat.id) || []
    children.forEach(c => printCategory(c, indent + 1))
  }

  const rootCategories = byParent.get(0) || []
  rootCategories.forEach(c => printCategory(c))
}

// Inventory Operations
async function updateStock(productId: number, quantity: number): Promise<void> {
  const data = await fetchAPI(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({
      manage_stock: true,
      stock_quantity: quantity
    })
  })

  console.log(`\n✓ Stock updated for product ${productId}`)
  console.log(`  Name: ${data.name}`)
  console.log(`  New stock: ${data.stock_quantity}`)
}

// System Status
async function getSystemStatus(): Promise<void> {
  const data = await fetchAPI('/system_status')

  console.log('\n🔧 SYSTEM STATUS')
  console.log('='.repeat(40))
  console.log(`WooCommerce:  ${data.environment.version}`)
  console.log(`WordPress:    ${data.environment.wp_version}`)
  console.log(`PHP:          ${data.environment.php_version}`)
  console.log(`MySQL:        ${data.environment.mysql_version}`)
  console.log(`Max Upload:   ${data.environment.max_upload_size}`)
  console.log(`Memory Limit: ${data.environment.php_max_memory_limit}`)
}

// Help
function showHelp(): void {
  console.log(`
WooCommerce CLI Client

Usage:
  npx tsx wc-client.ts <command> [options]

Commands:
  status                      Show system status

  products --list             List products
  products --get <id>         Get product details
  products --search <query>   Search products
  products --low-stock [n]    Show products with stock < n (default: 10)
  products --update-stock <id> <qty>  Update product stock

  orders --recent [n]         List n recent orders (default: 10)
  orders --processing         List processing orders
  orders --status <status>    List orders by status

  categories --list           List all categories

Order Statuses:
  pending, processing, on-hold, completed, cancelled, refunded, failed

Environment:
  WC_STORE_URL          Your WooCommerce store URL
  WC_CONSUMER_KEY       Your API consumer key
  WC_CONSUMER_SECRET    Your API consumer secret

Examples:
  npx tsx wc-client.ts status
  npx tsx wc-client.ts products --low-stock 5
  npx tsx wc-client.ts orders --processing
  npx tsx wc-client.ts products --get 123
`)
}

// CLI
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (!config.url || !config.consumerKey || !config.consumerSecret) {
    console.error('Error: WC_STORE_URL, WC_CONSUMER_KEY, and WC_CONSUMER_SECRET environment variables required')
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
      case 'status':
        await getSystemStatus()
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
          await updateStock(parseInt(args[2]), parseInt(args[3]))
        } else {
          console.error('Invalid products command. Use --help for usage.')
        }
        break

      case 'orders':
        if (subcommand === '--recent') {
          await listRecentOrders(parseInt(args[2]) || 10)
        } else if (subcommand === '--processing') {
          await listProcessingOrders()
        } else if (subcommand === '--status' && args[2]) {
          await getOrdersByStatus(args[2])
        } else {
          console.error('Invalid orders command. Use --help for usage.')
        }
        break

      case 'categories':
        await listCategories()
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
