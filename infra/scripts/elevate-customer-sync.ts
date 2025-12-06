/**
 * Elevate Customer Sync Script
 *
 * Syncs customer and order data from Shopify + Unleashed to Supabase
 * Creates a unified, deduplicated view of all Elevate customers.
 *
 * Usage: npx tsx infra/scripts/elevate-customer-sync.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', '..', 'dashboard', '.env.local') })

const SHOPIFY_STORE = 'elevatewholesale.myshopify.com'
const SHOPIFY_API_VERSION = '2024-10'
const UNLEASHED_API_URL = 'https://api.unleashedsoftware.com'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const shopifyToken = process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN
const unleashedApiId = process.env.ELEVATE_UNLEASHED_API_ID
const unleashedApiKey = process.env.ELEVATE_UNLEASHED_API_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!shopifyToken) {
  console.error('Missing ELEVATE_SHOPIFY_ACCESS_TOKEN')
  process.exit(1)
}

if (!unleashedApiId || !unleashedApiKey) {
  console.error('Missing ELEVATE_UNLEASHED_API_ID or ELEVATE_UNLEASHED_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Unleashed auth signature
function generateUnleashedSignature(queryString: string): string {
  const hmac = crypto.createHmac('sha256', unleashedApiKey!)
  hmac.update(queryString)
  return hmac.digest('base64')
}

// Parse Unleashed date format /Date(timestamp)/
function parseUnleashedDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) return new Date(parseInt(match[1]))
  return new Date(dateStr)
}

interface ShopifyCustomer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  state: string
  tags: string[]
  createdAt: string
}

interface UnleashedOrder {
  Guid: string
  OrderNumber: string
  OrderStatus: string
  OrderDate: string
  Customer: {
    CustomerCode: string
    CustomerName: string
    Email?: string
    Guid?: string
  }
  SubTotal: number
  TaxTotal: number
  Total: number
  SalesOrderLines?: Array<{
    Product: { ProductCode: string; ProductDescription?: string }
    OrderQuantity: number
    UnitPrice: number
    LineTotal: number
  }>
}

// Fetch all Shopify customers with approved tag
async function fetchAllShopifyCustomers(): Promise<Map<string, ShopifyCustomer>> {
  const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
  const customersByEmail = new Map<string, ShopifyCustomer>()
  let cursor: string | null = null
  let hasNextPage = true

  const query = `
    query getCustomers($cursor: String) {
      customers(first: 100, after: $cursor, query: "tag:approved") {
        pageInfo { hasNextPage, endCursor }
        edges {
          node {
            id, email, firstName, lastName, state, tags, createdAt
          }
        }
      }
    }
  `

  console.log('Fetching Shopify customers...')

  while (hasNextPage) {
    const resp = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifyToken!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: { cursor } })
    })

    const data = await resp.json() as any

    if (data.errors) {
      console.error('Shopify GraphQL error:', data.errors)
      break
    }

    const customers = data.data?.customers?.edges || []

    for (const { node } of customers) {
      if (node.email) {
        const normalizedEmail = node.email.toLowerCase().trim()
        customersByEmail.set(normalizedEmail, node)
      }
    }

    hasNextPage = data.data?.customers?.pageInfo?.hasNextPage || false
    cursor = data.data?.customers?.pageInfo?.endCursor || null

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`Fetched ${customersByEmail.size} Shopify customers`)
  return customersByEmail
}

// Fetch all Unleashed products and build ProductCode -> Brand lookup
async function fetchUnleashedProductBrands(): Promise<Map<string, string>> {
  const productBrands = new Map<string, string>()
  let page = 1

  console.log('Fetching Unleashed product brands...')

  while (page <= 20) {
    const params = new URLSearchParams({ pageSize: '500', page: page.toString() })
    const signature = generateUnleashedSignature(params.toString())

    const resp = await fetch(`${UNLEASHED_API_URL}/Products?${params}`, {
      headers: {
        'Accept': 'application/json',
        'api-auth-id': unleashedApiId!,
        'api-auth-signature': signature
      }
    })

    if (!resp.ok) {
      console.error('Unleashed Products API error:', resp.status)
      break
    }

    const data = await resp.json() as any
    const products = data.Items || []

    for (const product of products) {
      if (product.ProductCode && product.ProductGroup?.GroupName) {
        productBrands.set(product.ProductCode, product.ProductGroup.GroupName)
      }
    }

    if (page >= (data.Pagination?.NumberOfPages || 1)) break
    page++

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`Fetched ${productBrands.size} product -> brand mappings`)
  return productBrands
}

// Fetch all Unleashed orders
async function fetchAllUnleashedOrders(): Promise<UnleashedOrder[]> {
  const allOrders: UnleashedOrder[] = []
  let page = 1

  console.log('Fetching Unleashed orders...')

  while (page <= 20) {
    const params = new URLSearchParams({ pageSize: '500', page: page.toString() })
    const signature = generateUnleashedSignature(params.toString())

    const resp = await fetch(`${UNLEASHED_API_URL}/SalesOrders?${params}`, {
      headers: {
        'Accept': 'application/json',
        'api-auth-id': unleashedApiId!,
        'api-auth-signature': signature
      }
    })

    if (!resp.ok) {
      console.error('Unleashed Orders API error:', resp.status)
      break
    }

    const data = await resp.json() as any
    const orders = data.Items || []

    for (const order of orders) {
      if (order.OrderStatus === 'Deleted') continue

      // Parse date
      const orderDate = parseUnleashedDate(order.OrderDate)
      if (orderDate) {
        order.OrderDate = orderDate.toISOString()
      }
      allOrders.push(order)
    }

    if (page >= (data.Pagination?.NumberOfPages || 1)) break
    page++

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`Fetched ${allOrders.length} Unleashed orders`)
  return allOrders
}

// Main sync function
async function syncElevateCustomers() {
  console.log('='.repeat(60))
  console.log('Starting Elevate Customer Sync')
  console.log('='.repeat(60))

  const startTime = Date.now()

  // Step 1: Fetch Shopify customers
  const shopifyCustomers = await fetchAllShopifyCustomers()

  // Step 2: Fetch product brands
  const productBrands = await fetchUnleashedProductBrands()

  // Step 3: Fetch all Unleashed orders
  const unleashedOrders = await fetchAllUnleashedOrders()

  // Step 4: Group orders by customer and extract customer info
  const unleashedCustomerInfo = new Map<string, {
    code: string
    name: string
    email?: string
    guid?: string
    orders: UnleashedOrder[]
  }>()

  for (const order of unleashedOrders) {
    const code = order.Customer?.CustomerCode || 'UNKNOWN'

    if (!unleashedCustomerInfo.has(code)) {
      unleashedCustomerInfo.set(code, {
        code,
        name: order.Customer?.CustomerName || code,
        email: order.Customer?.Email,
        guid: order.Customer?.Guid,
        orders: []
      })
    }

    unleashedCustomerInfo.get(code)!.orders.push(order)
  }

  console.log(`Found ${unleashedCustomerInfo.size} unique Unleashed customers`)

  // Step 5: Build unified customer list
  const unifiedCustomers = new Map<string, {
    email: string
    firstName: string | null
    lastName: string | null
    businessName: string | null
    shopifyCustomerId: string | null
    shopifyState: string | null
    shopifyTags: string[]
    isApproved: boolean
    unleashedCode: string | null
    unleashedGuid: string | null
    orders: UnleashedOrder[]
  }>()

  // First, add all Shopify customers
  for (const [email, customer] of shopifyCustomers) {
    unifiedCustomers.set(email, {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      businessName: null,
      shopifyCustomerId: customer.id,
      shopifyState: customer.state,
      shopifyTags: customer.tags || [],
      isApproved: (customer.tags || []).includes('approved') && customer.state !== 'DISABLED',
      unleashedCode: null,
      unleashedGuid: null,
      orders: []
    })
  }

  // Then, match Unleashed customers to Shopify or create new
  for (const [code, info] of unleashedCustomerInfo) {
    const email = info.email?.toLowerCase().trim()

    if (email && unifiedCustomers.has(email)) {
      // Match found - add Unleashed data
      const existing = unifiedCustomers.get(email)!
      existing.unleashedCode = code
      existing.unleashedGuid = info.guid || null
      existing.orders = info.orders
    } else if (email) {
      // New customer from Unleashed with email
      unifiedCustomers.set(email, {
        email: info.email!,
        firstName: info.name?.split(' ')[0] || null,
        lastName: info.name?.split(' ').slice(1).join(' ') || null,
        businessName: info.name,
        shopifyCustomerId: null,
        shopifyState: null,
        shopifyTags: [],
        isApproved: false,
        unleashedCode: code,
        unleashedGuid: info.guid || null,
        orders: info.orders
      })
    } else {
      // No email - use customer code as identifier
      const syntheticEmail = `unleashed-${code}@elevate.internal`
      unifiedCustomers.set(syntheticEmail, {
        email: syntheticEmail,
        firstName: info.name?.split(' ')[0] || null,
        lastName: info.name?.split(' ').slice(1).join(' ') || null,
        businessName: info.name,
        shopifyCustomerId: null,
        shopifyState: null,
        shopifyTags: [],
        isApproved: false,
        unleashedCode: code,
        unleashedGuid: info.guid || null,
        orders: info.orders
      })
    }
  }

  console.log(`Unified customer count: ${unifiedCustomers.size}`)

  // Step 6: Insert customers into Supabase
  console.log('Upserting customers to Supabase...')

  const customerInserts = []
  for (const [email, data] of unifiedCustomers) {
    customerInserts.push({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      business_name: data.businessName,
      shopify_customer_id: data.shopifyCustomerId,
      shopify_state: data.shopifyState,
      shopify_tags: data.shopifyTags,
      is_approved: data.isApproved,
      unleashed_customer_code: data.unleashedCode,
      unleashed_customer_guid: data.unleashedGuid,
      shopify_synced_at: data.shopifyCustomerId ? new Date().toISOString() : null,
      unleashed_synced_at: data.unleashedCode ? new Date().toISOString() : null
    })
  }

  // Batch upsert customers in chunks
  const BATCH_SIZE = 100
  for (let i = 0; i < customerInserts.length; i += BATCH_SIZE) {
    const batch = customerInserts.slice(i, i + BATCH_SIZE)
    const { error: customerError } = await supabase
      .from('elevate_customers')
      .upsert(batch, { onConflict: 'email' })

    if (customerError) {
      console.error('Error inserting customers batch:', customerError)
    } else {
      console.log(`Upserted customers ${i + 1}-${Math.min(i + BATCH_SIZE, customerInserts.length)}`)
    }
  }

  // Step 7: Get customer IDs for order linking
  console.log('Fetching customer IDs for order linking...')

  const { data: customers } = await supabase
    .from('elevate_customers')
    .select('id, email, unleashed_customer_code')

  const customerByEmail = new Map(customers?.map(c => [c.email.toLowerCase(), c]) || [])
  const customerByCode = new Map(
    customers?.filter(c => c.unleashed_customer_code).map(c => [c.unleashed_customer_code, c]) || []
  )

  // Step 8: Insert orders
  console.log('Upserting orders to Supabase...')

  const orderInserts = []
  for (const order of unleashedOrders) {
    const customerCode = order.Customer?.CustomerCode
    const customerEmail = order.Customer?.Email?.toLowerCase().trim()

    // Find customer
    let customer = customerEmail ? customerByEmail.get(customerEmail) : null
    if (!customer && customerCode) {
      customer = customerByCode.get(customerCode)
    }
    if (!customer) {
      customer = customerByEmail.get(`unleashed-${customerCode}@elevate.internal`)
    }

    if (!customer) {
      console.warn(`No customer found for order ${order.OrderNumber}`)
      continue
    }

    // Build line items with brand info
    const lineItems = (order.SalesOrderLines || []).map(line => ({
      title: line.Product?.ProductDescription || line.Product?.ProductCode || 'Unknown',
      vendor: productBrands.get(line.Product?.ProductCode || '') || 'Unknown',
      quantity: line.OrderQuantity,
      price: (line.UnitPrice || 0).toString(),
      total: (line.LineTotal || 0).toString()
    }))

    orderInserts.push({
      customer_id: customer.id,
      customer_email: customer.email,
      source: 'unleashed',
      source_order_id: order.Guid,
      order_number: order.OrderNumber,
      order_date: order.OrderDate,
      order_status: order.OrderStatus,
      subtotal: order.SubTotal || 0,
      tax_total: order.TaxTotal || 0,
      total: order.Total || 0,
      line_items: lineItems
    })
  }

  // Batch upsert orders
  for (let i = 0; i < orderInserts.length; i += BATCH_SIZE) {
    const batch = orderInserts.slice(i, i + BATCH_SIZE)
    const { error: orderError } = await supabase
      .from('elevate_orders')
      .upsert(batch, { onConflict: 'source,source_order_id' })

    if (orderError) {
      console.error('Error inserting orders batch:', orderError)
    } else {
      console.log(`Upserted orders ${i + 1}-${Math.min(i + BATCH_SIZE, orderInserts.length)}`)
    }
  }

  // Step 9: Calculate aggregated metrics
  await calculateCustomerMetrics()

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('='.repeat(60))
  console.log(`Sync completed successfully in ${duration}s!`)
  console.log(`  - Customers: ${customerInserts.length}`)
  console.log(`  - Orders: ${orderInserts.length}`)
  console.log('='.repeat(60))
}

async function calculateCustomerMetrics() {
  console.log('Calculating customer metrics...')

  // Get all customers
  const { data: customers } = await supabase
    .from('elevate_customers')
    .select('id, email')

  if (!customers) return

  let updated = 0

  for (const customer of customers) {
    // Get orders for this customer
    const { data: orders } = await supabase
      .from('elevate_orders')
      .select('total, order_date, line_items')
      .eq('customer_id', customer.id)

    if (!orders || orders.length === 0) continue

    // Calculate metrics
    const totalOrders = orders.length
    const totalSpend = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    const avgOrderValue = totalSpend / totalOrders
    const orderDates = orders.map(o => new Date(o.order_date).getTime())
    const firstOrderDate = new Date(Math.min(...orderDates))
    const lastOrderDate = new Date(Math.max(...orderDates))

    // Calculate brand breakdown
    const brandBreakdown: Record<string, { amount: number; order_count: number }> = {}
    for (const order of orders) {
      const orderBrands = new Set<string>()
      for (const item of (order.line_items as any[] || [])) {
        const vendor = item.vendor || 'Unknown'
        if (!brandBreakdown[vendor]) {
          brandBreakdown[vendor] = { amount: 0, order_count: 0 }
        }
        brandBreakdown[vendor].amount += parseFloat(item.total || '0')
        orderBrands.add(vendor)
      }
      orderBrands.forEach(brand => {
        brandBreakdown[brand].order_count += 1
      })
    }

    // Update customer
    await supabase
      .from('elevate_customers')
      .update({
        total_orders: totalOrders,
        total_spend: totalSpend,
        avg_order_value: avgOrderValue,
        first_order_date: firstOrderDate.toISOString(),
        last_order_date: lastOrderDate.toISOString(),
        brand_breakdown: brandBreakdown,
        metrics_calculated_at: new Date().toISOString()
      })
      .eq('id', customer.id)

    updated++
  }

  console.log(`Updated metrics for ${updated} customers`)
}

// Run sync
syncElevateCustomers().catch(err => {
  console.error('Sync failed:', err)
  process.exit(1)
})
