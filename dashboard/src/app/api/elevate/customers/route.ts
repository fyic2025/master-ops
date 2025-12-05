import { NextRequest, NextResponse } from 'next/server'

const SHOPIFY_STORE = 'elevatewholesale.myshopify.com'
const SHOPIFY_API_VERSION = '2024-10'

// Get access token from environment
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

export async function POST(request: NextRequest) {
  try {
    const body: CustomerInput = await request.json()

    // Validate required fields
    if (!body.email || !body.firstName || !body.lastName || !body.businessName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, lastName, businessName' },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken()
    const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

    // Step 1: Check for duplicate email
    const searchQuery = `
      query searchCustomer($email: String!) {
        customers(first: 1, query: $email) {
          edges {
            node {
              id
              email
              firstName
              lastName
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
        variables: { email: `email:${body.email}` }
      })
    })

    const searchData = await searchResp.json()

    if (searchData.data?.customers?.edges?.length > 0) {
      const existing = searchData.data.customers.edges[0].node
      return NextResponse.json(
        {
          error: `Customer already exists: ${existing.firstName} ${existing.lastName} (${existing.email})`,
          existingCustomerId: existing.id
        },
        { status: 409 }
      )
    }

    // Step 2: Create the customer
    const createMutation = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
            state
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
    if (body.address1 || body.city || body.state || body.postcode) {
      addresses.push({
        address1: body.address1 || '',
        city: body.city || '',
        province: body.state || '',
        zip: body.postcode || '',
        country: 'Australia',
        company: body.businessName
      })
    }

    const customerInput: Record<string, any> = {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone || '',
      tags: ['approved', 'wholesale', 'created-via-dashboard'],
      note: `Business: ${body.businessName}${body.abn ? ` | ABN: ${body.abn}` : ''} | Created via dashboard`
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
      const errors = createData.data.customerCreate.userErrors
      return NextResponse.json(
        { error: errors.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    if (!createData.data?.customerCreate?.customer) {
      return NextResponse.json(
        { error: 'Failed to create customer', details: createData },
        { status: 500 }
      )
    }

    const customer = createData.data.customerCreate.customer
    const customerId = customer.id

    // Step 3: Generate activation URL
    const activationMutation = `
      mutation generateActivationUrl($customerId: ID!) {
        customerGenerateAccountActivationUrl(customerId: $customerId) {
          accountActivationUrl
          userErrors {
            field
            message
          }
        }
      }
    `

    const activationResp = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: activationMutation,
        variables: { customerId }
      })
    })

    const activationData = await activationResp.json()
    const activationUrl = activationData.data?.customerGenerateAccountActivationUrl?.accountActivationUrl

    // Step 4: Send account invite email
    const inviteMutation = `
      mutation sendInvite($customerId: ID!) {
        customerSendAccountInviteEmail(customerId: $customerId) {
          customer {
            id
            state
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const inviteResp = await fetch(graphqlUrl, {
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

    const inviteData = await inviteResp.json()
    const inviteSent = !inviteData.data?.customerSendAccountInviteEmail?.userErrors?.length

    return NextResponse.json({
      success: true,
      message: `Customer "${body.firstName} ${body.lastName}" created successfully!${inviteSent ? ' Activation email sent.' : ''}`,
      customerId: customerId,
      email: body.email,
      activationUrl: activationUrl,
      inviteSent
    })

  } catch (error: any) {
    console.error('Error creating Elevate customer:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List recent customers (optional feature)
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken()
    const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

    const query = `
      query recentCustomers {
        customers(first: 20, sortKey: CREATED_AT, reverse: true, query: "tag:approved") {
          edges {
            node {
              id
              email
              firstName
              lastName
              state
              createdAt
              tags
              numberOfOrders
            }
          }
        }
      }
    `

    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })

    const data = await response.json()

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0].message }, { status: 500 })
    }

    const customers = data.data?.customers?.edges?.map((edge: any) => edge.node) || []

    return NextResponse.json({ customers })

  } catch (error: any) {
    console.error('Error fetching Elevate customers:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
