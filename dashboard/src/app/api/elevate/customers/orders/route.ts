import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'

const SHOPIFY_STORE = 'elevatewholesale.myshopify.com'
const SHOPIFY_API_VERSION = '2024-10'
const UNLEASHED_API_URL = 'https://api.unleashedsoftware.com'

async function getShopifyToken(): Promise<string> {
  const token = process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN
  if (!token) {
    throw new Error('ELEVATE_SHOPIFY_ACCESS_TOKEN not configured')
  }
  return token
}

function getUnleashedCredentials(): { apiId: string; apiKey: string } {
  const apiId = process.env.ELEVATE_UNLEASHED_API_ID
  const apiKey = process.env.ELEVATE_UNLEASHED_API_KEY
  if (!apiId || !apiKey) {
    throw new Error('ELEVATE_UNLEASHED credentials not configured')
  }
  return { apiId, apiKey }
}

function generateUnleashedSignature(queryString: string, apiKey: string): string {
  const hmac = crypto.createHmac('sha256', apiKey)
  hmac.update(queryString)
  return hmac.digest('base64')
}

interface OrderLineItem {
  title: string
  vendor: string
  quantity: number
  price: string
  totalPrice: string
}

interface CustomerOrder {
  id: string
  name: string
  createdAt: string
  totalPrice: string
  source: 'shopify' | 'unleashed'
  lineItems: OrderLineItem[]
}

interface CustomerWithOrders {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  state: string
  tags: string[]
  createdAt: string
  isApproved: boolean
  orders: CustomerOrder[]
  metrics: {
    totalSpend: number
    orderCount: number
    avgOrderValue: number
    lastOrderDate: string | null
    brandBreakdown: Record<string, { amount: number; orderCount: number }>
  }
}

interface UnleashedSalesOrder {
  Guid: string
  OrderNumber: string
  OrderStatus: string
  OrderDate: string
  Customer: {
    CustomerCode: string
    CustomerName: string
    Email?: string
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

// Parse Unleashed date format /Date(timestamp)/ to Date object
function parseUnleashedDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) {
    return new Date(parseInt(match[1]))
  }
  return new Date(dateStr)
}

// Fetch all Unleashed products and build ProductCode -> Brand lookup
async function fetchUnleashedProductBrands(): Promise<Map<string, string>> {
  const { apiId, apiKey } = getUnleashedCredentials()
  const productBrands = new Map<string, string>()
  let page = 1
  const pageSize = 500

  while (true) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      page: page.toString(),
    })

    const queryString = params.toString()
    const signature = generateUnleashedSignature(queryString, apiKey)

    const response: Response = await fetch(`${UNLEASHED_API_URL}/Products?${queryString}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      console.error('Unleashed Products API error:', response.status)
      break
    }

    const data: any = await response.json()
    const products = data.Items || []

    for (const product of products) {
      const productCode = product.ProductCode
      const groupName = product.ProductGroup?.GroupName
      if (productCode && groupName) {
        productBrands.set(productCode, groupName)
      }
    }

    // Check if more pages
    const totalPages = data.Pagination?.NumberOfPages || 1
    if (page >= totalPages || products.length < pageSize) break
    page++

    // Safety limit
    if (page > 20) break
  }

  console.log(`Loaded ${productBrands.size} product -> brand mappings`)
  return productBrands
}

// Fetch Unleashed sales orders with pagination
async function fetchUnleashedOrders(
  startDate?: string,
  endDate?: string
): Promise<UnleashedSalesOrder[]> {
  const { apiId, apiKey } = getUnleashedCredentials()
  const allOrders: UnleashedSalesOrder[] = []
  let page = 1
  const pageSize = 500

  // Convert dates for filtering (Unleashed uses different format)
  const startDateObj = startDate ? new Date(startDate) : null
  const endDateObj = endDate ? new Date(endDate + 'T23:59:59') : null

  while (true) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      page: page.toString(),
    })

    // Unleashed date filter format: modifiedSince or filter by status
    // We'll filter client-side for more accurate date handling

    const queryString = params.toString()
    const signature = generateUnleashedSignature(queryString, apiKey)

    const response: Response = await fetch(`${UNLEASHED_API_URL}/SalesOrders?${queryString}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': apiId,
        'api-auth-signature': signature,
      },
    })

    if (!response.ok) {
      console.error('Unleashed API error:', response.status, await response.text())
      break
    }

    const data: any = await response.json()
    const orders = data.Items || []

    // Filter by date client-side (Unleashed date format is tricky)
    for (const order of orders) {
      const orderDate = parseUnleashedDate(order.OrderDate)
      if (!orderDate) continue

      // Apply date filter
      if (startDateObj && orderDate < startDateObj) continue
      if (endDateObj && orderDate > endDateObj) continue

      // Convert date to ISO string for consistency
      order.OrderDate = orderDate.toISOString()
      allOrders.push(order)
    }

    // Check if more pages
    const totalPages = data.Pagination?.NumberOfPages || 1
    if (page >= totalPages || orders.length < pageSize) break
    page++

    // Safety limit (higher now)
    if (page > 10) break
  }

  console.log(`Fetched ${allOrders.length} Unleashed orders after date filtering`)
  return allOrders
}

// Fetch order details with line items
async function fetchUnleashedOrderDetails(orderGuid: string): Promise<UnleashedSalesOrder | null> {
  const { apiId, apiKey } = getUnleashedCredentials()
  const signature = generateUnleashedSignature('', apiKey)

  const response: Response = await fetch(`${UNLEASHED_API_URL}/SalesOrders/${orderGuid}`, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-auth-id': apiId,
      'api-auth-signature': signature,
    },
  })

  if (!response.ok) return null
  return response.json()
}

// GET - Fetch all customers with their orders from both Shopify and Unleashed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') // YYYY-MM-DD
    const endDate = searchParams.get('endDate') // YYYY-MM-DD

    const accessToken = await getShopifyToken()
    const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

    // Build date filter for Shopify orders
    let orderDateFilter = ''
    if (startDate && endDate) {
      orderDateFilter = `created_at:>=${startDate} created_at:<=${endDate}`
    } else if (startDate) {
      orderDateFilter = `created_at:>=${startDate}`
    } else if (endDate) {
      orderDateFilter = `created_at:<=${endDate}`
    }

    // Step 1: Get all Shopify customers with approved tag
    const customersQuery = `
      query getCustomers($cursor: String) {
        customers(first: 100, after: $cursor, query: "tag:approved") {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              email
              firstName
              lastName
              state
              tags
              createdAt
            }
          }
        }
      }
    `

    let allShopifyCustomers: any[] = []
    let hasNextPage = true
    let cursor: string | null = null

    while (hasNextPage) {
      const customersResp: Response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: customersQuery,
          variables: { cursor }
        })
      })

      const customersData: any = await customersResp.json()

      if (customersData.errors) {
        console.error('GraphQL errors:', customersData.errors)
        return NextResponse.json({ error: customersData.errors[0].message }, { status: 500 })
      }

      const customers = customersData.data?.customers?.edges?.map((e: any) => e.node) || []
      allShopifyCustomers = [...allShopifyCustomers, ...customers]

      hasNextPage = customersData.data?.customers?.pageInfo?.hasNextPage || false
      cursor = customersData.data?.customers?.pageInfo?.endCursor || null

      if (allShopifyCustomers.length > 500) break
    }

    // Step 2: Fetch product -> brand lookup and all Unleashed orders
    let productBrands = new Map<string, string>()
    let unleashedOrders: UnleashedSalesOrder[] = []
    try {
      // Fetch product brands first (for accurate brand breakdown)
      productBrands = await fetchUnleashedProductBrands()

      // Then fetch orders
      unleashedOrders = await fetchUnleashedOrders(startDate || undefined, endDate || undefined)
      console.log(`Fetched ${unleashedOrders.length} Unleashed orders`)
    } catch (err) {
      console.error('Failed to fetch Unleashed data:', err)
    }

    // Group Unleashed orders by customer (CustomerCode is the key)
    const unleashedOrdersByCustomer = new Map<string, UnleashedSalesOrder[]>()
    const unleashedCustomerInfo = new Map<string, { name: string; email?: string; code: string }>()

    for (const order of unleashedOrders) {
      if (order.OrderStatus === 'Deleted') continue

      const customerCode = order.Customer?.CustomerCode || 'UNKNOWN'
      const existing = unleashedOrdersByCustomer.get(customerCode) || []
      existing.push(order)
      unleashedOrdersByCustomer.set(customerCode, existing)

      // Store customer info
      if (!unleashedCustomerInfo.has(customerCode)) {
        unleashedCustomerInfo.set(customerCode, {
          code: customerCode,
          name: order.Customer?.CustomerName || customerCode,
          email: order.Customer?.Email
        })
      }
    }

    // Create lookup maps for matching Shopify customers to Unleashed
    const shopifyCustomerByEmail = new Map<string, any>()
    const shopifyCustomerByName = new Map<string, any>()

    for (const customer of allShopifyCustomers) {
      const email = customer.email?.toLowerCase().trim()
      if (email) {
        shopifyCustomerByEmail.set(email, customer)
      }
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase().trim()
      if (fullName.length > 3) {
        shopifyCustomerByName.set(fullName, customer)
      }
    }

    // Step 3: Build customer list - primary source is Unleashed, supplement with Shopify
    const customersWithOrders: CustomerWithOrders[] = []
    const processedShopifyCustomers = new Set<string>()

    // Process Unleashed customers FIRST (they have the B2B order data)
    for (const [customerCode, orders] of unleashedOrdersByCustomer) {
      const customerInfo = unleashedCustomerInfo.get(customerCode)!
      const customerEmail = customerInfo.email?.toLowerCase().trim()
      const customerName = customerInfo.name?.toLowerCase().trim()

      // Try to match to a Shopify customer
      let matchedShopifyCustomer = null
      if (customerEmail) {
        matchedShopifyCustomer = shopifyCustomerByEmail.get(customerEmail)
      }
      if (!matchedShopifyCustomer && customerName) {
        matchedShopifyCustomer = shopifyCustomerByName.get(customerName)
      }

      // Convert Unleashed orders to our format
      const allOrders: CustomerOrder[] = orders.map(uOrder => ({
        id: uOrder.Guid,
        name: uOrder.OrderNumber,
        createdAt: uOrder.OrderDate,
        totalPrice: (uOrder.Total || 0).toString(),
        source: 'unleashed' as const,
        lineItems: (uOrder.SalesOrderLines || []).map(line => {
          // Get brand from ProductGroup lookup (fetched from Products API)
          const productCode = line.Product?.ProductCode || ''
          const vendor = productBrands.get(productCode) || 'Unknown'

          return {
            title: line.Product?.ProductDescription || productCode || 'Unknown',
            vendor,
            quantity: line.OrderQuantity,
            price: (line.UnitPrice || 0).toString(),
            totalPrice: (line.LineTotal || 0).toString()
          }
        })
      }))

      // Sort orders by date (newest first)
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Calculate metrics
      const totalSpend = allOrders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0)
      const orderCount = allOrders.length
      const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0
      const lastOrderDate = allOrders.length > 0 ? allOrders[0].createdAt : null

      // Calculate brand breakdown
      const brandBreakdown: Record<string, { amount: number; orderCount: number }> = {}
      allOrders.forEach((order) => {
        const orderBrands = new Set<string>()
        order.lineItems.forEach((item) => {
          const vendor = item.vendor || 'Unknown'
          if (!brandBreakdown[vendor]) {
            brandBreakdown[vendor] = { amount: 0, orderCount: 0 }
          }
          brandBreakdown[vendor].amount += parseFloat(item.totalPrice)
          orderBrands.add(vendor)
        })
        orderBrands.forEach(brand => {
          brandBreakdown[brand].orderCount += 1
        })
      })

      // Use Shopify customer data if matched, otherwise use Unleashed data
      const isApproved = matchedShopifyCustomer?.tags?.includes('approved') &&
                         matchedShopifyCustomer?.state !== 'DISABLED'

      if (matchedShopifyCustomer) {
        processedShopifyCustomers.add(matchedShopifyCustomer.id)
      }

      customersWithOrders.push({
        id: matchedShopifyCustomer?.id || `unleashed-${customerCode}`,
        email: matchedShopifyCustomer?.email || customerInfo.email || '',
        firstName: matchedShopifyCustomer?.firstName || customerInfo.name?.split(' ')[0] || null,
        lastName: matchedShopifyCustomer?.lastName || customerInfo.name?.split(' ').slice(1).join(' ') || null,
        state: matchedShopifyCustomer?.state || 'ENABLED',
        tags: matchedShopifyCustomer?.tags || [],
        createdAt: matchedShopifyCustomer?.createdAt || allOrders[allOrders.length - 1]?.createdAt || new Date().toISOString(),
        isApproved,
        orders: allOrders,
        metrics: {
          totalSpend,
          orderCount,
          avgOrderValue,
          lastOrderDate,
          brandBreakdown
        }
      })
    }

    // Step 4: Add any Shopify customers without Unleashed orders (approved but haven't ordered)
    const ordersQuery = `
      query getCustomerOrders($customerId: ID!, $query: String) {
        customer(id: $customerId) {
          orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                lineItems(first: 50) {
                  edges {
                    node {
                      title
                      vendor
                      quantity
                      originalUnitPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                      discountedTotalSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    // Add Shopify-only customers (not matched to Unleashed)
    const shopifyOnlyCustomers = allShopifyCustomers.filter(c => !processedShopifyCustomers.has(c.id))
    const batchSize = 10

    for (let i = 0; i < shopifyOnlyCustomers.length; i += batchSize) {
      const batch = shopifyOnlyCustomers.slice(i, i + batchSize)

      const batchPromises = batch.map(async (customer) => {
        const allOrders: CustomerOrder[] = []

        // Fetch Shopify orders
        try {
          const ordersResp = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: ordersQuery,
              variables: {
                customerId: customer.id,
                query: orderDateFilter || null
              }
            })
          })

          const ordersData = await ordersResp.json()
          const shopifyOrders = ordersData.data?.customer?.orders?.edges || []

          for (const e of shopifyOrders) {
            const order = e.node
            allOrders.push({
              id: order.id,
              name: order.name,
              createdAt: order.createdAt,
              totalPrice: order.totalPriceSet?.shopMoney?.amount || '0',
              source: 'shopify' as const,
              lineItems: order.lineItems?.edges?.map((li: any) => ({
                title: li.node.title,
                vendor: li.node.vendor || 'Unknown',
                quantity: li.node.quantity,
                price: li.node.originalUnitPriceSet?.shopMoney?.amount || '0',
                totalPrice: li.node.discountedTotalSet?.shopMoney?.amount || '0'
              })) || []
            })
          }
        } catch (err) {
          console.error(`Error fetching Shopify orders for ${customer.email}:`, err)
        }

        // Sort orders by date (newest first)
        allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Calculate metrics
        const totalSpend = allOrders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0)
        const orderCount = allOrders.length
        const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0
        const lastOrderDate = allOrders.length > 0 ? allOrders[0].createdAt : null

        // Calculate brand breakdown
        const brandBreakdown: Record<string, { amount: number; orderCount: number }> = {}
        allOrders.forEach((order) => {
          const orderBrands = new Set<string>()
          order.lineItems.forEach((item) => {
            const vendor = item.vendor || 'Unknown'
            if (!brandBreakdown[vendor]) {
              brandBreakdown[vendor] = { amount: 0, orderCount: 0 }
            }
            brandBreakdown[vendor].amount += parseFloat(item.totalPrice)
            orderBrands.add(vendor)
          })
          orderBrands.forEach(brand => {
            brandBreakdown[brand].orderCount += 1
          })
        })

        const isApproved = customer.tags?.includes('approved') && customer.state !== 'DISABLED'

        return {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          state: customer.state,
          tags: customer.tags || [],
          createdAt: customer.createdAt,
          isApproved,
          orders: allOrders,
          metrics: {
            totalSpend,
            orderCount,
            avgOrderValue,
            lastOrderDate,
            brandBreakdown
          }
        } as CustomerWithOrders
      })

      const batchResults = await Promise.all(batchPromises)
      customersWithOrders.push(...batchResults)

      if (i + batchSize < shopifyOnlyCustomers.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Calculate summary metrics
    const summary = {
      totalCustomers: customersWithOrders.length,
      customersWithOrders: customersWithOrders.filter(c => c.metrics.orderCount > 0).length,
      totalRevenue: customersWithOrders.reduce((sum, c) => sum + c.metrics.totalSpend, 0),
      totalOrders: customersWithOrders.reduce((sum, c) => sum + c.metrics.orderCount, 0),
      shopifyOrders: customersWithOrders.reduce((sum, c) =>
        sum + c.orders.filter(o => o.source === 'shopify').length, 0),
      unleashedOrders: customersWithOrders.reduce((sum, c) =>
        sum + c.orders.filter(o => o.source === 'unleashed').length, 0),
      unleashedCustomers: unleashedOrdersByCustomer.size,
    }

    return NextResponse.json({
      customers: customersWithOrders,
      summary,
      dateRange: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('Error fetching customer orders:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
