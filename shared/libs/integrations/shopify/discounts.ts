/**
 * Shopify Discount Code Service
 *
 * Creates unique, single-use discount codes for anniversary campaigns.
 * Uses Shopify Admin API (REST) Price Rules and Discount Codes endpoints.
 *
 * Code format: ANNIV-XXXXXX-XXX (e.g., ANNIV-A1B2C3-789)
 */

const creds = require('../../../../creds')

const SHOPIFY_API_VERSION = '2024-01'
const SHOPIFY_DOMAIN = 'teelixir-au.myshopify.com'

interface PriceRule {
  id: number
  title: string
  target_type: string
  target_selection: string
  allocation_method: string
  value_type: string
  value: string
  usage_limit: number | null
  once_per_customer: boolean
  starts_at: string
  ends_at: string | null
}

interface DiscountCode {
  id: number
  code: string
  usage_count: number
  created_at: string
  price_rule_id: number
}

export interface CreateDiscountResult {
  success: boolean
  code?: string
  priceRuleId?: number
  discountCodeId?: number
  expiresAt?: string
  error?: string
}

/**
 * Generate a unique discount code
 * Format: ANNIV-XXXXXX-XXX
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // Exclude confusing chars (0, O, 1, I)
  let code = 'ANNIV-'

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  code += '-'

  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return code
}

/**
 * Make an authenticated request to Shopify Admin API
 */
async function shopifyRequest(
  accessToken: string,
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const url = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return response
}

/**
 * Create a unique, single-use discount code for an anniversary campaign
 *
 * @param discountPercent - Discount percentage (e.g., 15 for 15%)
 * @param expirationDays - Days until the code expires
 * @param customerEmail - Customer email (for tracking, not enforcement)
 * @returns CreateDiscountResult with code details or error
 */
export async function createAnniversaryDiscount(
  discountPercent: number = 15,
  expirationDays: number = 14,
  customerEmail?: string
): Promise<CreateDiscountResult> {
  try {
    // Load credentials
    const accessToken = await creds.get('teelixir', 'shopify_access_token')

    if (!accessToken) {
      return { success: false, error: 'Missing Shopify access token' }
    }

    // Generate unique code
    const code = generateCode()

    // Calculate expiration date
    const startsAt = new Date().toISOString()
    const endsAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()

    // Create the price rule first
    const priceRuleBody = {
      price_rule: {
        title: `Anniversary ${discountPercent}% - ${customerEmail || code}`,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: 'percentage',
        value: `-${discountPercent}`,  // Negative for discount
        once_per_customer: true,
        usage_limit: 1,
        customer_selection: 'all',  // We'll track in our DB
        starts_at: startsAt,
        ends_at: endsAt,
      }
    }

    const priceRuleResponse = await shopifyRequest(
      accessToken,
      'POST',
      '/price_rules.json',
      priceRuleBody
    )

    if (!priceRuleResponse.ok) {
      const errorText = await priceRuleResponse.text()
      console.error('Shopify price rule error:', errorText)
      return { success: false, error: `Failed to create price rule: ${errorText}` }
    }

    const priceRuleData = await priceRuleResponse.json()
    const priceRule: PriceRule = priceRuleData.price_rule

    // Create the discount code
    const discountCodeBody = {
      discount_code: {
        code: code
      }
    }

    const discountCodeResponse = await shopifyRequest(
      accessToken,
      'POST',
      `/price_rules/${priceRule.id}/discount_codes.json`,
      discountCodeBody
    )

    if (!discountCodeResponse.ok) {
      const errorText = await discountCodeResponse.text()
      console.error('Shopify discount code error:', errorText)
      // Clean up the price rule
      await shopifyRequest(accessToken, 'DELETE', `/price_rules/${priceRule.id}.json`)
      return { success: false, error: `Failed to create discount code: ${errorText}` }
    }

    const discountCodeData = await discountCodeResponse.json()
    const discountCode: DiscountCode = discountCodeData.discount_code

    return {
      success: true,
      code: discountCode.code,
      priceRuleId: priceRule.id,
      discountCodeId: discountCode.id,
      expiresAt: endsAt
    }

  } catch (error) {
    console.error('Error creating anniversary discount:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete a price rule and its associated discount code
 */
export async function deleteDiscount(priceRuleId: number): Promise<boolean> {
  try {
    const accessToken = await creds.get('teelixir', 'shopify_access_token')
    if (!accessToken) return false

    const response = await shopifyRequest(
      accessToken,
      'DELETE',
      `/price_rules/${priceRuleId}.json`
    )

    return response.ok || response.status === 404
  } catch {
    return false
  }
}

/**
 * Check if a discount code has been used
 */
export async function checkDiscountUsage(
  priceRuleId: number,
  discountCodeId: number
): Promise<{ used: boolean; usageCount: number } | null> {
  try {
    const accessToken = await creds.get('teelixir', 'shopify_access_token')
    if (!accessToken) return null

    const response = await shopifyRequest(
      accessToken,
      'GET',
      `/price_rules/${priceRuleId}/discount_codes/${discountCodeId}.json`
    )

    if (!response.ok) return null

    const data = await response.json()
    const discountCode: DiscountCode = data.discount_code

    return {
      used: discountCode.usage_count > 0,
      usageCount: discountCode.usage_count
    }
  } catch {
    return null
  }
}

// CLI test
if (require.main === module) {
  (async () => {
    console.log('Testing discount code creation...')
    const result = await createAnniversaryDiscount(15, 14, 'test@example.com')
    console.log('Result:', result)

    if (result.success && result.priceRuleId) {
      console.log('\nCleaning up test discount...')
      const deleted = await deleteDiscount(result.priceRuleId)
      console.log('Deleted:', deleted)
    }
  })()
}
