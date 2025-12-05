import { NextRequest, NextResponse } from 'next/server'

const SHOPIFY_STORE = 'elevatewholesale.myshopify.com'
const SHOPIFY_API_VERSION = '2024-10'

async function getAccessToken(): Promise<string> {
  const token = process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN
  if (!token) {
    throw new Error('ELEVATE_SHOPIFY_ACCESS_TOKEN not configured')
  }
  return token
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
  orders: CustomerOrder[]
  metrics: {
    totalSpend: number
    orderCount: number
    avgOrderValue: number
    lastOrderDate: string | null
    brandBreakdown: Record<string, { amount: number; orderCount: number }>
  }
}

// GET - Fetch all customers with their orders and calculated metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') // YYYY-MM-DD
    const endDate = searchParams.get('endDate') // YYYY-MM-DD

    const accessToken = await getAccessToken()
    const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

    // Build date filter for orders
    let orderDateFilter = ''
    if (startDate && endDate) {
      orderDateFilter = `created_at:>=${startDate} created_at:<=${endDate}`
    } else if (startDate) {
      orderDateFilter = `created_at:>=${startDate}`
    } else if (endDate) {
      orderDateFilter = `created_at:<=${endDate}`
    }

    // Step 1: Get all customers with approved tag
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

    // Fetch all customers (paginated)
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

      // Safety limit
      if (allCustomers.length > 500) break
    }

    // Step 2: For each customer, fetch their orders
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

    // Process customers in batches to avoid rate limiting
    const customersWithOrders: CustomerWithOrders[] = []
    const batchSize = 10

    for (let i = 0; i < allCustomers.length; i += batchSize) {
      const batch = allCustomers.slice(i, i + batchSize)

      const batchPromises = batch.map(async (customer) => {
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
          const orders = ordersData.data?.customer?.orders?.edges?.map((e: any) => {
            const order = e.node
            return {
              id: order.id,
              name: order.name,
              createdAt: order.createdAt,
              totalPrice: order.totalPriceSet?.shopMoney?.amount || '0',
              lineItems: order.lineItems?.edges?.map((li: any) => ({
                title: li.node.title,
                vendor: li.node.vendor || 'Unknown',
                quantity: li.node.quantity,
                price: li.node.originalUnitPriceSet?.shopMoney?.amount || '0',
                totalPrice: li.node.discountedTotalSet?.shopMoney?.amount || '0'
              })) || []
            }
          }) || []

          // Calculate metrics
          const totalSpend = orders.reduce((sum: number, o: CustomerOrder) => sum + parseFloat(o.totalPrice), 0)
          const orderCount = orders.length
          const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0
          const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null

          // Calculate brand breakdown
          const brandBreakdown: Record<string, { amount: number; orderCount: number }> = {}
          orders.forEach((order: CustomerOrder) => {
            const orderBrands = new Set<string>()
            order.lineItems.forEach((item: OrderLineItem) => {
              const vendor = item.vendor || 'Unknown'
              if (!brandBreakdown[vendor]) {
                brandBreakdown[vendor] = { amount: 0, orderCount: 0 }
              }
              brandBreakdown[vendor].amount += parseFloat(item.totalPrice)
              orderBrands.add(vendor)
            })
            // Count unique orders per brand
            orderBrands.forEach(brand => {
              brandBreakdown[brand].orderCount += 1
            })
          })

          return {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            state: customer.state,
            tags: customer.tags || [],
            createdAt: customer.createdAt,
            orders,
            metrics: {
              totalSpend,
              orderCount,
              avgOrderValue,
              lastOrderDate,
              brandBreakdown
            }
          } as CustomerWithOrders
        } catch (err) {
          console.error(`Error fetching orders for customer ${customer.id}:`, err)
          return {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            state: customer.state,
            tags: customer.tags || [],
            createdAt: customer.createdAt,
            orders: [],
            metrics: {
              totalSpend: 0,
              orderCount: 0,
              avgOrderValue: 0,
              lastOrderDate: null,
              brandBreakdown: {}
            }
          } as CustomerWithOrders
        }
      })

      const batchResults = await Promise.all(batchPromises)
      customersWithOrders.push(...batchResults)

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allCustomers.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Calculate summary metrics
    const summary = {
      totalCustomers: customersWithOrders.length,
      customersWithOrders: customersWithOrders.filter(c => c.metrics.orderCount > 0).length,
      totalRevenue: customersWithOrders.reduce((sum, c) => sum + c.metrics.totalSpend, 0),
      totalOrders: customersWithOrders.reduce((sum, c) => sum + c.metrics.orderCount, 0)
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
