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

// Proper Unleashed API types (different from types.ts simplified versions)
interface UnleashedApiSalesOrder {
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
      const bundleComponents = bundleMap.get(item.sku)

      if (bundleComponents && bundleComponents.length > 0) {
        // This is a bundle - expand to components
        bundlesExpanded++
        console.log(`   🎁 Bundle: ${item.title} (${item.sku}) x${item.quantity}`)

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
      } else {
        // Regular product
        const unitPrice = parseFloat(item.price)
        const lineTotal = Math.round(item.quantity * unitPrice * 100) / 100
        expandedLines.push({
          LineNumber: lineNumber++,
          Product: {
            ProductCode: item.sku,
          },
          OrderQuantity: item.quantity,
          UnitPrice: unitPrice,
          DiscountRate: 0,
          LineTotal: lineTotal,
          TaxRate: 0,
          LineTax: 0,
        })
        if (verbose) {
          console.log(`   📦 ${item.sku}: ${item.title} x${item.quantity}`)
        }
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
    const customer = await findOrCreateUnleashedCustomer(config, order, dryRun)

    // Build Unleashed sales order with proper API structure
    const salesOrder: UnleashedApiSalesOrder = {
      Customer: customer,
      OrderDate: new Date(order.created_at).toISOString(),
      RequiredDate: new Date(order.created_at).toISOString(),
      OrderStatus: order.financial_status === 'paid' ? 'Completed' : 'Parked',
      Comments: `Shopify Order #${order.order_number}. Email: ${order.email}`,
      CustomerRef: order.id.toString(),
      Tax: {
        TaxCode: 'Exempt', // No additional tax (prices already include GST)
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
 */
async function findOrCreateUnleashedCustomer(
  config: StoreConfig,
  order: ShopifyOrder,
  dryRun: boolean
): Promise<CustomerRef> {
  // Generate customer code from Shopify customer ID
  const customerCode = `SHOPIFY-${order.customer.id}`
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
  order: UnleashedSalesOrder
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
