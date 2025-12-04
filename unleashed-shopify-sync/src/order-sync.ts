/**
 * Order Sync: Shopify → Unleashed
 *
 * Creates Unleashed sales orders from Shopify orders.
 * Handles bundle expansion to individual components.
 */

import * as crypto from 'crypto'
import {
  StoreConfig,
  ShopifyOrder,
  ShopifyLineItem,
  BundleMapping,
  OrderSyncResult,
} from './types.js'

export interface OrderSyncOptions {
  dryRun?: boolean
  verbose?: boolean
}

/**
 * Title-based SKU mappings for products without SKUs in Shopify
 * Maps product title patterns to Unleashed product codes
 */
const TITLE_TO_SKU_MAPPINGS: Array<{ pattern: RegExp; sku: string }> = [
  { pattern: /lion'?s?\s*mane.*capsule/i, sku: 'CAPS90LION' },
  // Add more mappings as needed:
  // { pattern: /reishi.*capsule/i, sku: 'CAPS90REI' },
]

/**
 * Resolve product SKU from item SKU or title
 * Falls back to title-based mapping if SKU is missing
 */
function resolveProductSku(sku: string | undefined | null, title: string): string | null {
  // If SKU exists and is not empty, use it
  if (sku && sku.trim() !== '') {
    return sku.trim()
  }

  // Try to match title against known patterns
  for (const mapping of TITLE_TO_SKU_MAPPINGS) {
    if (mapping.pattern.test(title)) {
      return mapping.sku
    }
  }

  // No SKU and no title match
  return null
}

// Proper Unleashed API types (different from types.ts simplified versions)
interface UnleashedApiSalesOrder {
  OrderNumber?: string
  Customer: {
    CustomerCode: string
    CustomerName?: string
    Guid?: string
  }
  OrderDate: string
  RequiredDate: string
  OrderStatus: 'Open' | 'Parked' | 'Placed' | 'Completed'
  Comments?: string
  CustomerRef?: string
  Tax: {
    TaxCode: string
  }
  Currency?: {
    CurrencyCode: string
  }
  SubTotal: number
  TaxTotal?: number
  Total?: number
  DeliveryName?: string
  DeliveryStreetAddress?: string
  DeliveryStreetAddress2?: string
  DeliverySuburb?: string
  DeliveryCity?: string
  DeliveryRegion?: string
  DeliveryCountry?: string
  DeliveryPostCode?: string
  SalesOrderLines: UnleashedApiSalesOrderLine[]
}

interface UnleashedApiSalesOrderLine {
  LineNumber: number
  Product: {
    ProductCode: string
  }
  OrderQuantity: number
  UnitPrice: number
  DiscountRate: number
  LineTotal: number
  TaxRate: number
  LineTax: number
  Comments?: string
}

/**
 * Process a single Shopify order and create Unleashed sales order
 */
export async function syncOrder(
  config: StoreConfig,
  order: ShopifyOrder,
  bundleMappings: BundleMapping[] = [],
  options: OrderSyncOptions = {}
): Promise<OrderSyncResult> {
  const { dryRun = false, verbose = false } = options

  const result: OrderSyncResult = {
    store: config.name,
    shopifyOrderId: order.id,
    shopifyOrderNumber: order.order_number,
    unleashedOrderGuid: null,
    status: 'success',
  }

  console.log(`\n📦 Processing Shopify Order #${order.order_number}`)
  console.log(`   Customer: ${order.customer.first_name} ${order.customer.last_name}`)
  console.log(`   Email: ${order.email}`)
  console.log(`   Total: $${order.total_price}`)

  try {
    // Check if order already exists in Unleashed using fuzzy duplicate detection
    // Matches by: CustomerRef (exact), OrderNumber (exact), or customer+date+total (fuzzy)
    if (!options.dryRun) {
      const existingOrder = await checkExistingUnleashedOrder(config, order.id, order)
      if (existingOrder) {
        console.log(`   ⏭️ Already synced (${existingOrder})`)
        result.status = 'skipped'
        result.unleashedOrderGuid = existingOrder
        return result
      }
    }

    // Build bundle lookup map
    const bundleMap = new Map<string, BundleMapping[]>()
    for (const mapping of bundleMappings) {
      if (mapping.store === config.name && mapping.is_active) {
        const existing = bundleMap.get(mapping.shopify_sku) || []
        existing.push(mapping)
        bundleMap.set(mapping.shopify_sku, existing)
      }
    }

    // Expand line items (handle bundles)
    const expandedLines: UnleashedApiSalesOrderLine[] = []
    let bundlesExpanded = 0
    let lineNumber = 1

    for (const item of order.line_items) {
      // Resolve SKU - use item.sku or fallback to title-based mapping
      const resolvedSku = resolveProductSku(item.sku, item.title)
      const bundleComponents = bundleMap.get(resolvedSku)

      if (bundleComponents && bundleComponents.length > 0) {
        // This is a bundle - expand to components
        bundlesExpanded++
        console.log(`   🎁 Bundle: ${item.title} (${resolvedSku}) x${item.quantity}`)

        for (const component of bundleComponents) {
          const componentQty = item.quantity * component.component_quantity
          const unitPrice = 0 // Price is on bundle, not components
          expandedLines.push({
            LineNumber: lineNumber++,
            Product: {
              ProductCode: component.unleashed_product_code,
            },
            OrderQuantity: componentQty,
            UnitPrice: unitPrice,
            DiscountRate: 0,
            LineTotal: Math.round(componentQty * unitPrice * 100) / 100,
            TaxRate: 0,
            LineTax: 0,
            Comments: `Bundle: ${item.title}`,
          })
          console.log(`      → ${component.unleashed_product_code} x${componentQty}`)
        }
      } else if (resolvedSku) {
        // Regular product with valid SKU
        const unitPrice = parseFloat(item.price)
        const totalDiscount = parseFloat(item.total_discount || '0')
        const lineSubtotal = item.quantity * unitPrice
        // Calculate discount rate as percentage (0-100)
        const discountRate = lineSubtotal > 0 ? Math.round((totalDiscount / lineSubtotal) * 10000) / 100 : 0
        const lineTotal = Math.round((lineSubtotal - totalDiscount) * 100) / 100
        expandedLines.push({
          LineNumber: lineNumber++,
          Product: {
            ProductCode: resolvedSku,
          },
          OrderQuantity: item.quantity,
          UnitPrice: unitPrice,
          DiscountRate: discountRate,
          LineTotal: lineTotal,
          TaxRate: 0,
          LineTax: 0,
        })
        if (verbose || resolvedSku !== item.sku || discountRate > 0) {
          const discountInfo = discountRate > 0 ? ` (${discountRate}% discount)` : ''
          console.log(`   📦 ${resolvedSku}: ${item.title} x${item.quantity}${resolvedSku !== item.sku ? ' (mapped from title)' : ''}${discountInfo}`)
        }
      } else {
        // No SKU and no mapping - log warning but continue
        console.log(`   ⚠️ Skipping item without SKU: ${item.title}`)
      }
    }

    result.bundlesExpanded = bundlesExpanded
    result.lineItems = expandedLines.length

    console.log(`   Line items: ${order.line_items.length} → ${expandedLines.length} (expanded)`)

    // Calculate subtotal from line totals
    // Note: Shopify prices are GST-inclusive but we pass them as subtotal
    // Tax will be calculated by Unleashed based on Tax Code
    const subTotal = expandedLines.reduce((sum, line) => sum + line.LineTotal, 0)
    const roundedSubTotal = Math.round(subTotal * 100) / 100

    // Find or create customer in Unleashed
    // Use order.id as CustomerCode to match existing format (e.g., 9411971875091)
    const customer = await findOrCreateUnleashedCustomer(config, order, dryRun)

    // Build Unleashed sales order with proper API structure
    // Note: Always use 'Parked' status - 'Completed' requires batch allocation
    // Orders can be completed manually in Unleashed after batch selection
    // OrderNumber format: Shopify{order_number} to match existing orders (e.g., Shopify31546)
    const salesOrder: UnleashedApiSalesOrder = {
      OrderNumber: `Shopify${order.order_number}`,
      Customer: customer,
      OrderDate: new Date(order.created_at).toISOString(),
      RequiredDate: new Date(order.created_at).toISOString(),
      OrderStatus: 'Parked',
      Comments: `Shopify Order #${order.order_number}. Email: ${order.email}. Payment: ${order.financial_status}`,
      CustomerRef: order.id.toString(),
      Tax: {
        TaxCode: 'G.S.T.', // Australian GST (line items have TaxRate: 0)
      },
      Currency: {
        CurrencyCode: 'AUD',
      },
      SubTotal: roundedSubTotal,
      TaxTotal: 0,
      Total: roundedSubTotal, // Total = SubTotal when TaxTotal is 0
      SalesOrderLines: expandedLines,
    }

    // Add delivery address if available
    if (order.shipping_address) {
      salesOrder.DeliveryName = order.shipping_address.name
      salesOrder.DeliveryStreetAddress = order.shipping_address.address1
      salesOrder.DeliveryStreetAddress2 = order.shipping_address.address2 || ''
      salesOrder.DeliverySuburb = order.shipping_address.city
      salesOrder.DeliveryCity = order.shipping_address.city
      salesOrder.DeliveryRegion = order.shipping_address.province
      salesOrder.DeliveryPostCode = order.shipping_address.zip
      salesOrder.DeliveryCountry = order.shipping_address.country
    }

    // Create in Unleashed
    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would create Unleashed order with ${expandedLines.length} lines`)
      result.unleashedOrderGuid = 'DRY_RUN'
    } else {
      const unleashedOrder = await createUnleashedSalesOrder(config, salesOrder)
      result.unleashedOrderGuid = unleashedOrder.Guid
      console.log(`   ✅ Created Unleashed order: ${unleashedOrder.Guid}`)
    }

  } catch (error) {
    result.status = 'failed'
    result.error = (error as Error).message
    console.log(`   ❌ Failed: ${result.error}`)
  }

  return result
}

interface CustomerRef {
  CustomerCode: string
  CustomerName?: string
  Guid?: string
}

/**
 * Find existing customer or create new one in Unleashed
 * Returns customer object with Guid for use in sales order
 * CustomerCode uses Shopify order ID to match existing format (e.g., 9411971875091)
 */
async function findOrCreateUnleashedCustomer(
  config: StoreConfig,
  order: ShopifyOrder,
  dryRun: boolean
): Promise<CustomerRef> {
  // Use Shopify order ID as customer code to match existing format
  const customerCode = order.id.toString()
  const customerName = `${order.customer.first_name} ${order.customer.last_name}`

  if (dryRun) {
    return { CustomerCode: customerCode, CustomerName: customerName }
  }

  // Check if customer exists
  const existingCustomer = await findUnleashedCustomer(config, customerCode)

  if (existingCustomer) {
    return {
      CustomerCode: existingCustomer.CustomerCode,
      CustomerName: existingCustomer.CustomerName,
      Guid: existingCustomer.Guid,
    }
  }

  // Create new customer
  const newCustomer = {
    CustomerCode: customerCode,
    CustomerName: customerName,
    Email: order.customer.email,
    ContactName: customerName,
  }

  // Add address if available
  if (order.shipping_address) {
    Object.assign(newCustomer, {
      Address1: order.shipping_address.address1,
      City: order.shipping_address.city,
      Region: order.shipping_address.province,
      PostalCode: order.shipping_address.zip,
      Country: order.shipping_address.country,
    })
  }

  const createdCustomer = await createUnleashedCustomer(config, newCustomer)
  return {
    CustomerCode: createdCustomer.CustomerCode,
    CustomerName: createdCustomer.CustomerName,
    Guid: createdCustomer.Guid,
  }
}

// Cache for recent Unleashed orders to avoid repeated API calls
interface CachedUnleashedOrder {
  orderNumber: string
  guid: string
  customerRef: string | null
  customerName: string
  orderDate: string
  total: number
}
let recentOrdersCache: CachedUnleashedOrder[] | null = null
let recentOrdersCacheTime: number = 0
const CACHE_TTL = 60000 // 1 minute

/**
 * Normalize customer name for fuzzy matching
 */
function normalizeCustomerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Check if two dates are within N days of each other
 */
function datesWithinDays(date1: string, date2: string, days: number): boolean {
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  const diffMs = Math.abs(d1 - d2)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= days
}

/**
 * Check if two totals are within a percentage of each other
 */
function totalsWithinPercent(total1: number, total2: number, percent: number): boolean {
  if (total1 === 0 && total2 === 0) return true
  const diff = Math.abs(total1 - total2)
  const avg = (total1 + total2) / 2
  return (diff / avg) * 100 <= percent
}

/**
 * Fetch recent Unleashed orders for duplicate checking
 */
async function fetchRecentUnleashedOrders(config: StoreConfig): Promise<CachedUnleashedOrder[]> {
  // Use cache if fresh
  if (recentOrdersCache && Date.now() - recentOrdersCacheTime < CACHE_TTL) {
    return recentOrdersCache
  }

  const queryString = 'pageSize=200'
  const url = `${config.unleashed.apiUrl}/SalesOrders?${queryString}`
  const signature = generateUnleashedSignature(queryString, config.unleashed.apiKey)

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': config.unleashed.apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const items = data.Items || []

    recentOrdersCache = items.map((order: any) => ({
      orderNumber: order.OrderNumber || '',
      guid: order.Guid || '',
      customerRef: order.CustomerRef || null,
      customerName: order.Customer?.CustomerName || '',
      orderDate: order.OrderDate || '',
      total: order.Total || 0,
    }))
    recentOrdersCacheTime = Date.now()

    return recentOrdersCache
  } catch {
    return []
  }
}

interface DuplicateCheckResult {
  isDuplicate: boolean
  matchType: 'exact_ref' | 'exact_order_number' | 'fuzzy_customer_date_total' | null
  matchedOrder: string | null
}

/**
 * Check if a Shopify order already exists in Unleashed using fuzzy logic
 *
 * Match priority:
 * 1. Exact CustomerRef match (Shopify order ID)
 * 2. Exact OrderNumber match (Shopify{order_number})
 * 3. Fuzzy: Same customer name + within 1 day + total within 5%
 */
async function checkExistingUnleashedOrder(
  config: StoreConfig,
  shopifyOrderId: string | number,
  shopifyOrder?: ShopifyOrder
): Promise<string | null> {
  const targetRef = String(shopifyOrderId)
  const orders = await fetchRecentUnleashedOrders(config)

  // 1. Exact CustomerRef match
  for (const order of orders) {
    if (order.customerRef === targetRef) {
      return order.orderNumber || order.guid
    }
  }

  // 2. Exact OrderNumber match (Shopify{order_number})
  if (shopifyOrder) {
    const expectedOrderNumber = `Shopify${shopifyOrder.order_number}`.toLowerCase()
    for (const order of orders) {
      if (order.orderNumber.toLowerCase() === expectedOrderNumber) {
        return order.orderNumber
      }
    }
  }

  // 3. Fuzzy match: customer name + date + total
  if (shopifyOrder) {
    const shopifyCustomerName = normalizeCustomerName(
      `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`
    )
    const shopifyTotal = parseFloat(shopifyOrder.total_price)
    const shopifyDate = shopifyOrder.created_at

    for (const order of orders) {
      const unleashedCustomerName = normalizeCustomerName(order.customerName)

      // Check if names match (allowing for small variations)
      const nameMatch = shopifyCustomerName === unleashedCustomerName ||
        shopifyCustomerName.includes(unleashedCustomerName) ||
        unleashedCustomerName.includes(shopifyCustomerName)

      if (nameMatch &&
          datesWithinDays(shopifyDate, order.orderDate, 1) &&
          totalsWithinPercent(shopifyTotal, order.total, 5)) {
        console.log(`   ⚠️ Fuzzy duplicate detected: ${order.orderNumber} (${order.customerName}, $${order.total})`)
        return order.orderNumber
      }
    }
  }

  return null
}

/**
 * Check for duplicate orders within Unleashed (Unleashed ↔ Unleashed)
 * Returns array of potential duplicate groups
 */
export async function findUnleashedDuplicates(
  config: StoreConfig
): Promise<Array<{ orders: CachedUnleashedOrder[]; reason: string }>> {
  const orders = await fetchRecentUnleashedOrders(config)
  const duplicateGroups: Array<{ orders: CachedUnleashedOrder[]; reason: string }> = []
  const processedPairs = new Set<string>()

  for (let i = 0; i < orders.length; i++) {
    for (let j = i + 1; j < orders.length; j++) {
      const order1 = orders[i]
      const order2 = orders[j]
      const pairKey = [order1.guid, order2.guid].sort().join('|')

      if (processedPairs.has(pairKey)) continue

      // Check for potential duplicates
      const name1 = normalizeCustomerName(order1.customerName)
      const name2 = normalizeCustomerName(order2.customerName)
      const nameMatch = name1 === name2 || name1.includes(name2) || name2.includes(name1)

      if (nameMatch &&
          datesWithinDays(order1.orderDate, order2.orderDate, 1) &&
          totalsWithinPercent(order1.total, order2.total, 5)) {
        processedPairs.add(pairKey)

        // Check if this group already exists
        const existingGroup = duplicateGroups.find(g =>
          g.orders.some(o => o.guid === order1.guid || o.guid === order2.guid)
        )

        if (existingGroup) {
          if (!existingGroup.orders.find(o => o.guid === order1.guid)) {
            existingGroup.orders.push(order1)
          }
          if (!existingGroup.orders.find(o => o.guid === order2.guid)) {
            existingGroup.orders.push(order2)
          }
        } else {
          duplicateGroups.push({
            orders: [order1, order2],
            reason: `Same customer "${order1.customerName}", similar date, similar total ($${order1.total} vs $${order2.total})`
          })
        }
      }
    }
  }

  return duplicateGroups
}

/**
 * Find customer in Unleashed by code
 */
async function findUnleashedCustomer(
  config: StoreConfig,
  customerCode: string
): Promise<any | null> {
  const queryString = `customerCode=${encodeURIComponent(customerCode)}`
  const url = `${config.unleashed.apiUrl}/Customers?${queryString}`
  const signature = generateUnleashedSignature(queryString, config.unleashed.apiKey)

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': config.unleashed.apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const items = data.Items || []
    return items.length > 0 ? items[0] : null
  } catch {
    return null
  }
}

/**
 * Create customer in Unleashed
 */
async function createUnleashedCustomer(
  config: StoreConfig,
  customer: any
): Promise<any> {
  const url = `${config.unleashed.apiUrl}/Customers`
  const signature = generateUnleashedSignature('', config.unleashed.apiKey)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-auth-id': config.unleashed.apiId,
      'api-auth-signature': signature,
    },
    body: JSON.stringify(customer),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create Unleashed customer: ${errorText}`)
  }

  return response.json()
}

/**
 * Create sales order in Unleashed
 */
async function createUnleashedSalesOrder(
  config: StoreConfig,
  order: UnleashedApiSalesOrder
): Promise<any> {
  const url = `${config.unleashed.apiUrl}/SalesOrders`
  const signature = generateUnleashedSignature('', config.unleashed.apiKey)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-auth-id': config.unleashed.apiId,
      'api-auth-signature': signature,
    },
    body: JSON.stringify(order),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create Unleashed sales order: ${errorText}`)
  }

  return response.json()
}

/**
 * Fetch recent orders from Shopify
 */
export async function fetchRecentShopifyOrders(
  config: StoreConfig,
  sinceDate?: Date,
  limit: number = 50
): Promise<ShopifyOrder[]> {
  let url = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/orders.json?limit=${limit}&status=any`

  if (sinceDate) {
    url += `&created_at_min=${sinceDate.toISOString()}`
  }

  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shopify API error: ${errorText}`)
  }

  const data = await response.json()
  return data.orders || []
}

/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  webhookSecret: string
): boolean {
  const hmac = crypto.createHmac('sha256', webhookSecret)
  hmac.update(body)
  const digest = hmac.digest('base64')
  return digest === hmacHeader
}

/**
 * Generate HMAC signature for Unleashed API
 */
function generateUnleashedSignature(queryString: string, apiKey: string): string {
  const hmac = crypto.createHmac('sha256', apiKey)
  hmac.update(queryString)
  return hmac.digest('base64')
}
