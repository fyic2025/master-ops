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

// Fetch Unleashed sales orders with pagination
async function fetchUnleashedOrders(
  startDate?: string,
  endDate?: string
): Promise<UnleashedSalesOrder[]> {
  const { apiId, apiKey } = getUnleashedCredentials()
  const allOrders: UnleashedSalesOrder[] = []
  let page = 1
  const pageSize = 200

  while (true) {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      page: page.toString(),
    })

    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

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
    allOrders.push(...orders)

    // Check if more pages
    const totalPages = data.Pagination?.NumberOfPages || 1
    if (page >= totalPages || orders.length < pageSize) break
    page++

    // Safety limit
    if (allOrders.length > 1000) break
  }

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

    let allCustomers: any[] = []
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
      allCustomers = [...allCustomers, ...customers]

      hasNextPage = customersData.data?.customers?.pageInfo?.hasNextPage || false
      cursor = customersData.data?.customers?.pageInfo?.endCursor || null

      if (allCustomers.length > 500) break
    }

    // Step 2: Fetch Unleashed orders
    let unleashedOrders: UnleashedSalesOrder[] = []
    try {
      unleashedOrders = await fetchUnleashedOrders(startDate || undefined, endDate || undefined)
      console.log(`Fetched ${unleashedOrders.length} Unleashed orders`)
    } catch (err) {
      console.error('Failed to fetch Unleashed orders:', err)
      // Continue without Unleashed data
    }

    // Create email lookup for Unleashed orders
    // Group orders by customer email (normalized)
    const unleashedOrdersByEmail = new Map<string, UnleashedSalesOrder[]>()
    const unleashedOrdersByName = new Map<string, UnleashedSalesOrder[]>()

    for (const order of unleashedOrders) {
      // Skip non-completed orders
      if (order.OrderStatus === 'Deleted') continue

      const email = order.Customer?.Email?.toLowerCase().trim()
      const name = order.Customer?.CustomerName?.toLowerCase().trim()

      if (email) {
        const existing = unleashedOrdersByEmail.get(email) || []
        existing.push(order)
        unleashedOrdersByEmail.set(email, existing)
      }

      if (name) {
        const existing = unleashedOrdersByName.get(name) || []
        existing.push(order)
        unleashedOrdersByName.set(name, existing)
      }
    }

    // Step 3: For each Shopify customer, get Shopify orders + match Unleashed orders
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

    const customersWithOrders: CustomerWithOrders[] = []
    const batchSize = 10
    const processedUnleashedOrders = new Set<string>()

    for (let i = 0; i < allCustomers.length; i += batchSize) {
      const batch = allCustomers.slice(i, i + batchSize)

      const batchPromises = batch.map(async (customer) => {
        const allOrders: CustomerOrder[] = []
        const email = customer.email?.toLowerCase().trim()
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase().trim()

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
          const shopifyOrders = ordersData.data?.customer?.orders?.edges?.map((e: any) => {
            const order = e.node
            return {
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
            }
          }) || []

          allOrders.push(...shopifyOrders)
        } catch (err) {
          console.error(`Error fetching Shopify orders for ${customer.email}:`, err)
        }

        // Match Unleashed orders by email or name
        const matchedUnleashedOrders: UnleashedSalesOrder[] = []

        if (email) {
          const byEmail = unleashedOrdersByEmail.get(email) || []
          matchedUnleashedOrders.push(...byEmail)
        }

        // Also try matching by name if no email match
        if (matchedUnleashedOrders.length === 0 && fullName.length > 3) {
          const byName = unleashedOrdersByName.get(fullName) || []
          matchedUnleashedOrders.push(...byName)
        }

        // Convert Unleashed orders to our format (avoid duplicates)
        for (const uOrder of matchedUnleashedOrders) {
          if (processedUnleashedOrders.has(uOrder.Guid)) continue

          // Check if this Unleashed order matches a Shopify order (by order number pattern)
          const isShopifySync = uOrder.OrderNumber?.toLowerCase().includes('shopify')
          if (isShopifySync) continue // Skip - already counted in Shopify orders

          processedUnleashedOrders.add(uOrder.Guid)

          // Convert to our format
          allOrders.push({
            id: uOrder.Guid,
            name: uOrder.OrderNumber,
            createdAt: uOrder.OrderDate,
            totalPrice: (uOrder.Total || 0).toString(),
            source: 'unleashed' as const,
            lineItems: (uOrder.SalesOrderLines || []).map(line => ({
              title: line.Product?.ProductDescription || line.Product?.ProductCode || 'Unknown',
              vendor: 'Elevate', // Unleashed doesn't have vendor per line
              quantity: line.OrderQuantity,
              price: (line.UnitPrice || 0).toString(),
              totalPrice: (line.LineTotal || 0).toString()
            }))
          })
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

      if (i + batchSize < allCustomers.length) {
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
