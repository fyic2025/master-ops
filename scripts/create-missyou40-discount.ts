#!/usr/bin/env npx tsx
/**
 * Create MISSYOU40 Discount Code in Shopify
 *
 * Creates a 40% discount code for the Teelixir winback automation
 */

const SHOPIFY_DOMAIN = 'teelixir.com.au'
const SHOPIFY_ACCESS_TOKEN = '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'
const API_VERSION = '2024-01'

interface PriceRule {
  id: number
  title: string
  value: string
  value_type: string
}

interface DiscountCode {
  id: number
  code: string
  usage_count: number
}

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

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify API error: ${response.status} - ${text}`)
  }

  return response.json()
}

async function shopifyREST(endpoint: string, method = 'GET', body?: any): Promise<any> {
  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/${endpoint}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify API error: ${response.status} - ${text}`)
  }

  return response.json()
}

async function checkExistingDiscount(): Promise<boolean> {
  console.log('🔍 Checking for existing MISSYOU40 discount...')

  // Search for existing price rules
  const result = await shopifyREST('price_rules.json')
  const priceRules: PriceRule[] = result.price_rules || []

  for (const rule of priceRules) {
    // Get discount codes for this price rule
    const codesResult = await shopifyREST(`price_rules/${rule.id}/discount_codes.json`)
    const codes: DiscountCode[] = codesResult.discount_codes || []

    const missyou40 = codes.find(c => c.code.toUpperCase() === 'MISSYOU40')
    if (missyou40) {
      console.log(`✅ MISSYOU40 already exists!`)
      console.log(`   Price Rule ID: ${rule.id}`)
      console.log(`   Discount Code ID: ${missyou40.id}`)
      console.log(`   Value: ${rule.value}${rule.value_type === 'percentage' ? '%' : ''}`)
      console.log(`   Usage Count: ${missyou40.usage_count}`)
      return true
    }
  }

  return false
}

async function createMISSYOU40Discount(): Promise<void> {
  console.log('\n📝 Creating MISSYOU40 discount code...\n')

  // Step 1: Create Price Rule (the discount configuration)
  console.log('1️⃣ Creating price rule (40% off)...')

  const priceRuleData = {
    price_rule: {
      title: 'MISSYOU40 - Winback 40% Off',
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      value_type: 'percentage',
      value: '-40.0', // 40% off (negative for discount)
      customer_selection: 'all',
      starts_at: new Date().toISOString(),
      usage_limit: null, // No overall usage limit
      once_per_customer: true, // Each customer can only use once
    }
  }

  const priceRuleResult = await shopifyREST('price_rules.json', 'POST', priceRuleData)
  const priceRule = priceRuleResult.price_rule

  console.log(`   ✅ Price rule created: ID ${priceRule.id}`)

  // Step 2: Create Discount Code for this price rule
  console.log('\n2️⃣ Creating discount code MISSYOU40...')

  const discountCodeData = {
    discount_code: {
      code: 'MISSYOU40'
    }
  }

  const codeResult = await shopifyREST(
    `price_rules/${priceRule.id}/discount_codes.json`,
    'POST',
    discountCodeData
  )
  const discountCode = codeResult.discount_code

  console.log(`   ✅ Discount code created: ID ${discountCode.id}`)

  console.log('\n' + '═'.repeat(60))
  console.log('🎉 MISSYOU40 Discount Code Created Successfully!')
  console.log('═'.repeat(60))
  console.log(`
   Code:          MISSYOU40
   Discount:      40% off entire order
   Limit:         Once per customer
   Price Rule ID: ${priceRule.id}
   Code ID:       ${discountCode.id}
  `)
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  CREATE MISSYOU40 DISCOUNT CODE - Teelixir Shopify                   ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')
  console.log(`\n📍 Store: ${SHOPIFY_DOMAIN}\n`)

  try {
    // Check if discount already exists
    const exists = await checkExistingDiscount()

    if (exists) {
      console.log('\n✨ No action needed - discount already configured!')
      return
    }

    // Create the discount
    console.log('❌ MISSYOU40 not found, creating...')
    await createMISSYOU40Discount()

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)

    if (error.message.includes('401')) {
      console.log('\n💡 Access token may be invalid or lack permissions.')
      console.log('   Required scopes: write_price_rules, read_price_rules')
    }

    process.exit(1)
  }
}

main().catch(console.error)
