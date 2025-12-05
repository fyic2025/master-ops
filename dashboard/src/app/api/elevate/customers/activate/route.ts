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

// POST - Send activation emails to customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerIds } = body

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: 'customerIds array is required' },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken()
    const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

    const inviteMutation = `
      mutation sendInvite($customerId: ID!) {
        customerSendAccountInviteEmail(customerId: $customerId) {
          customer {
            id
            email
            state
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Process each customer
    for (const customerId of customerIds) {
      try {
        const response = await fetch(graphqlUrl, {
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

        const data = await response.json()

        if (data.data?.customerSendAccountInviteEmail?.userErrors?.length > 0) {
          const err = data.data.customerSendAccountInviteEmail.userErrors[0]
          errors.push(`${customerId}: ${err.message}`)
          failed++
        } else if (data.data?.customerSendAccountInviteEmail?.customer) {
          sent++
        } else {
          errors.push(`${customerId}: Unknown error`)
          failed++
        }
      } catch (err: any) {
        errors.push(`${customerId}: ${err.message}`)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Error sending activation emails:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
