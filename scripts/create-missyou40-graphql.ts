#!/usr/bin/env npx tsx
/**
 * Create MISSYOU40 Discount Code via Shopify GraphQL API
 */

const SHOPIFY_DOMAIN = 'teelixir-au.myshopify.com'
const SHOPIFY_ACCESS_TOKEN = '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'
const API_VERSION = '2024-01'

async function shopifyGraphQL(query: string, variables?: Record<string, any>): Promise<any> {
  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  )

  const result = await response.json()

  if (result.errors) {
    console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2))
  }

  return result
}

async function checkExistingDiscount(): Promise<string | null> {
  console.log('🔍 Checking for existing MISSYOU40 discount...')

  const query = `
    query {
      codeDiscountNodes(first: 50, query: "code:MISSYOU40") {
        nodes {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              codes(first: 5) {
                nodes {
                  code
                }
              }
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  const result = await shopifyGraphQL(query)

  if (result.data?.codeDiscountNodes?.nodes?.length > 0) {
    const node = result.data.codeDiscountNodes.nodes[0]
    console.log('✅ MISSYOU40 already exists!')
    console.log(`   ID: ${node.id}`)
    return node.id
  }

  return null
}

async function createDiscount(): Promise<void> {
  console.log('\n📝 Creating MISSYOU40 discount...')

  const mutation = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              codes(first: 1) {
                nodes {
                  code
                }
              }
            }
          }
        }
        userErrors {
          field
          code
          message
        }
      }
    }
  `

  const variables = {
    basicCodeDiscount: {
      title: "MISSYOU40 - Winback 40% Off",
      code: "MISSYOU40",
      startsAt: new Date().toISOString(),
      customerGets: {
        value: {
          percentage: 0.40  // 40% off
        },
        items: {
          all: true
        }
      },
      customerSelection: {
        all: true
      },
      usageLimit: null,
      appliesOncePerCustomer: true
    }
  }

  const result = await shopifyGraphQL(mutation, variables)

  if (result.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
    const errors = result.data.discountCodeBasicCreate.userErrors
    console.error('❌ Errors:', errors)
    throw new Error(errors.map((e: any) => e.message).join(', '))
  }

  if (result.data?.discountCodeBasicCreate?.codeDiscountNode) {
    const node = result.data.discountCodeBasicCreate.codeDiscountNode
    console.log('\n' + '═'.repeat(60))
    console.log('🎉 MISSYOU40 Created Successfully!')
    console.log('═'.repeat(60))
    console.log(`   ID: ${node.id}`)
    console.log(`   Code: MISSYOU40`)
    console.log(`   Discount: 40% off`)
    console.log(`   Limit: Once per customer`)
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  CREATE MISSYOU40 - Shopify GraphQL API                              ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')
  console.log(`\n📍 Store: ${SHOPIFY_DOMAIN}\n`)

  try {
    const existingId = await checkExistingDiscount()

    if (existingId) {
      console.log('\n✨ No action needed - discount already exists!')
      return
    }

    console.log('❌ MISSYOU40 not found, creating...')
    await createDiscount()

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main().catch(console.error)

export {}
