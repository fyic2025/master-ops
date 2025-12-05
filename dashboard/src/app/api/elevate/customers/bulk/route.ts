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

interface CustomerInput {
  email: string
  firstName: string
  lastName: string
  businessName: string
  phone?: string
  abn?: string
  address1?: string
  city?: string
  state?: string
  postcode?: string
}

// POST - Bulk create customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customers } = body

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { error: 'customers array is required' },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken()
    const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

    let created = 0
    let failed = 0
    const errors: string[] = []

    // Process each customer
    for (const customer of customers as CustomerInput[]) {
      try {
        // Validate required fields
        if (!customer.email || !customer.firstName || !customer.lastName || !customer.businessName) {
          errors.push(`${customer.email || 'unknown'}: Missing required fields`)
          failed++
          continue
        }

        // Check for duplicate
        const searchQuery = `
          query searchCustomer($email: String!) {
            customers(first: 1, query: $email) {
              edges {
                node {
                  id
                  email
                }
              }
            }
          }
        `

        const searchResp = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: searchQuery,
            variables: { email: `email:${customer.email}` }
          })
        })

        const searchData = await searchResp.json()

        if (searchData.data?.customers?.edges?.length > 0) {
          errors.push(`${customer.email}: Already exists`)
          failed++
          continue
        }

        // Create customer
        const createMutation = `
          mutation customerCreate($input: CustomerInput!) {
            customerCreate(input: $input) {
              customer {
                id
                email
              }
              userErrors {
                field
                message
              }
            }
          }
        `

        // Build address if provided
        const addresses = []
        if (customer.address1 || customer.city || customer.state || customer.postcode) {
          addresses.push({
            address1: customer.address1 || '',
            city: customer.city || '',
            province: customer.state || '',
            zip: customer.postcode || '',
            country: 'Australia',
            company: customer.businessName
          })
        }

        const customerInput: Record<string, any> = {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone || '',
          tags: ['approved', 'wholesale', 'created-via-dashboard', 'bulk-import'],
          note: `Business: ${customer.businessName}${customer.abn ? ` | ABN: ${customer.abn}` : ''} | Bulk imported via dashboard`
        }

        if (addresses.length > 0) {
          customerInput.addresses = addresses
        }

        const createResp = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: createMutation,
            variables: { input: customerInput }
          })
        })

        const createData = await createResp.json()

        if (createData.data?.customerCreate?.userErrors?.length > 0) {
          const err = createData.data.customerCreate.userErrors[0]
          errors.push(`${customer.email}: ${err.message}`)
          failed++
          continue
        }

        if (!createData.data?.customerCreate?.customer) {
          errors.push(`${customer.email}: Failed to create`)
          failed++
          continue
        }

        const customerId = createData.data.customerCreate.customer.id

        // Send activation email
        const inviteMutation = `
          mutation sendInvite($customerId: ID!) {
            customerSendAccountInviteEmail(customerId: $customerId) {
              customer {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `

        await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: inviteMutation,
            variables: { customerId }
          })
        })

        created++

      } catch (err: any) {
        errors.push(`${customer.email || 'unknown'}: ${err.message}`)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      failed,
      total: customers.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Error bulk creating customers:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
