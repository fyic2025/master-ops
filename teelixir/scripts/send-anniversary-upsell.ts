#!/usr/bin/env npx tsx
/**
 * Teelixir - Anniversary Upsell Email Sender
 *
 * Sends personalized anniversary emails with upsell offers.
 * Features:
 *   - Personalized discount codes ({FULLNAME}15 format)
 *   - Side-by-side product comparison with cost-per-gram savings
 *   - Uses GSuite (Gmail) for better inbox placement
 *
 * Usage:
 *   npx tsx teelixir/scripts/send-anniversary-upsell.ts [options]
 *
 * Options:
 *   --dry-run                   Preview without sending
 *   --process-queue             Process scheduled queue for current hour
 *   --test-email=EMAIL          Send test to specified address
 *   --test-name=NAME            Use this name for test (e.g., "Jayson Rodda")
 *
 * Prerequisites:
 *   1. Run sync-shopify-variants.ts to populate product data
 *   2. Run queue-anniversary-emails.ts to queue recipients
 *   3. Configure Gmail OAuth for colette@teelixir.com
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SHOPIFY_DOMAIN = 'teelixir-au.myshopify.com'
const SHOPIFY_API_VERSION = '2024-01'
const TRACKING_BASE_URL = 'https://ops.growthcohq.com'
const TIMEZONE = 'Australia/Melbourne'
const SEND_WINDOW_START = 9
const SEND_WINDOW_END = 19

interface AutomationConfig {
  discount_percent: number
  expiration_days: number
  small_size_lead_days: number
  large_size_lead_days: number
  large_size_threshold_grams: number
  daily_limit: number
  send_window_start: number
  send_window_end: number
  sender_email: string
  sender_name: string
  reply_to_email: string
  discount_code_format: string
}

interface SendConfig {
  dryRun: boolean
  processQueue: boolean
  testEmail: string | null
  testName: string | null
}

interface VariantData {
  shopify_product_id: number
  shopify_variant_id: number
  product_title: string
  product_handle: string
  product_type: string
  variant_title: string
  size_grams: number
  size_unit: string
  price: number
  compare_at_price: number | null
  image_url: string | null
  inventory_quantity: number
  is_available: boolean
}

interface UpsellData {
  original: VariantData
  upsell: VariantData | null
  isLargestSize: boolean
  savingsPercent: number | null
  originalPricePerGram: number
  upsellPricePerGram: number | null
  discountedPrice: number | null
  discountedPricePerGram: number | null
}

interface SendResult {
  success: boolean
  emailsSent: number
  emailsFailed: number
  errors: string[]
  duration: number
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getMelbourneTime(): { hour: number; formatted: string; date: string } {
  const now = new Date()
  const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }))
  return {
    hour: melbourneTime.getHours(),
    formatted: melbourneTime.toLocaleString('en-AU', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    date: now.toLocaleString('en-CA', { timeZone: TIMEZONE }).split(',')[0]
  }
}

function isWithinSendWindow(): { allowed: boolean; reason?: string } {
  const { hour } = getMelbourneTime()
  if (hour < SEND_WINDOW_START) {
    return { allowed: false, reason: `Too early. Window starts at ${SEND_WINDOW_START}:00 AM` }
  }
  if (hour >= SEND_WINDOW_END) {
    return { allowed: false, reason: `Too late. Window ends at ${SEND_WINDOW_END - 12}:00 PM` }
  }
  return { allowed: true }
}

/**
 * Generate personalized discount code
 * Format: FULLNAME15 (e.g., "JAYSONRODDA15")
 */
function generateDiscountCode(firstName: string, lastName: string): string {
  const name = `${firstName}${lastName}`
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 20)
  return `${name}15`
}

/**
 * Calculate price per gram (or per capsule)
 */
function pricePerUnit(price: number, size: number): number {
  if (size <= 0) return 0
  return price / size
}

// ============================================================================
// SHOPIFY FUNCTIONS
// ============================================================================

async function shopifyRequest(
  accessToken: string,
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const url = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Create a personalized Shopify discount code restricted to specific variant
 */
async function createPersonalizedDiscount(
  accessToken: string,
  code: string,
  discountPercent: number,
  expirationDays: number,
  variantId: number | null,
  customerEmail: string
): Promise<{ success: boolean; priceRuleId?: number; error?: string; expiresAt?: string }> {
  const startsAt = new Date().toISOString()
  const endsAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()

  // Build price rule - restrict to specific variant if provided
  const priceRuleBody: any = {
    price_rule: {
      title: `Anniversary 15% - ${customerEmail}`,
      target_type: 'line_item',
      allocation_method: 'across',
      value_type: 'percentage',
      value: `-${discountPercent}`,
      once_per_customer: true,
      usage_limit: 1,
      customer_selection: 'all',
      starts_at: startsAt,
      ends_at: endsAt,
    }
  }

  // If variant specified, restrict discount to that variant only
  if (variantId) {
    priceRuleBody.price_rule.target_selection = 'entitled'
    priceRuleBody.price_rule.entitled_variant_ids = [variantId]
  } else {
    priceRuleBody.price_rule.target_selection = 'all'
  }

  // Create price rule
  const priceRuleResponse = await shopifyRequest(accessToken, 'POST', '/price_rules.json', priceRuleBody)

  if (!priceRuleResponse.ok) {
    const errorText = await priceRuleResponse.text()
    return { success: false, error: `Price rule failed: ${errorText}` }
  }

  const priceRuleData = await priceRuleResponse.json()
  const priceRuleId = priceRuleData.price_rule.id

  // Create discount code
  const discountCodeResponse = await shopifyRequest(
    accessToken,
    'POST',
    `/price_rules/${priceRuleId}/discount_codes.json`,
    { discount_code: { code } }
  )

  if (!discountCodeResponse.ok) {
    // Cleanup price rule
    await shopifyRequest(accessToken, 'DELETE', `/price_rules/${priceRuleId}.json`)
    const errorText = await discountCodeResponse.text()
    return { success: false, error: `Discount code failed: ${errorText}` }
  }

  return { success: true, priceRuleId, expiresAt: endsAt }
}

// ============================================================================
// GMAIL SENDER
// ============================================================================

async function getGmailCredentials(): Promise<{ clientId: string; clientSecret: string; refreshToken: string }> {
  const clientId = await creds.get('teelixir', 'gmail_client_id')
  const clientSecret = await creds.get('teelixir', 'gmail_client_secret')
  const refreshToken = await creds.get('teelixir', 'gmail_refresh_token')

  if (clientId && clientSecret && refreshToken) {
    return { clientId, clientSecret, refreshToken }
  }
  throw new Error('Gmail credentials not found in vault')
}

class GmailSender {
  private clientId: string
  private clientSecret: string
  private refreshToken: string
  private userEmail: string
  private fromName: string
  private replyToEmail: string
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor(
    gmailCreds: { clientId: string; clientSecret: string; refreshToken: string },
    config: AutomationConfig
  ) {
    this.clientId = gmailCreds.clientId
    this.clientSecret = gmailCreds.clientSecret
    this.refreshToken = gmailCreds.refreshToken
    this.userEmail = config.sender_email
    this.fromName = config.sender_name
    this.replyToEmail = config.reply_to_email
  }

  static async create(config: AutomationConfig): Promise<GmailSender> {
    const gmailCreds = await getGmailCredentials()
    return new GmailSender(gmailCreds, config)
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.refreshToken && this.userEmail)
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh Gmail token: ${await response.text()}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken()
    }
    return this.accessToken!
  }

  private buildMimeMessage(to: string, subject: string, html: string, text: string): string {
    const boundary = `boundary_${Date.now()}`
    const headers = [
      `From: ${this.fromName} <${this.userEmail}>`,
      `To: ${to}`,
      `Reply-To: ${this.replyToEmail}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ]

    const body = [
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      html,
      `--${boundary}--`,
    ].join('\r\n')

    return [...headers, body].join('\r\n')
  }

  private encodeMessage(message: string): string {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  async send(to: string, subject: string, html: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken()
      const mimeMessage = this.buildMimeMessage(to, subject, html, text)
      const encodedMessage = this.encodeMessage(mimeMessage)

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      })

      if (!response.ok) {
        throw new Error(`Gmail API error: ${await response.text()}`)
      }

      const result = await response.json()
      return { success: true, messageId: result.id }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function generateUpsellEmailHtml(
  firstName: string,
  email: string,
  discountCode: string,
  discountPercent: number,
  upsellData: UpsellData,
  expiresAt: string
): string {
  const encodedEmail = Buffer.from(email.toLowerCase()).toString('base64')

  // Build shop URL - if upsell available, link to that product
  const productHandle = upsellData.upsell?.product_handle || upsellData.original.product_handle
  const targetUrl = `https://teelixir.com.au/products/${productHandle}?utm_source=anniversary&utm_campaign=upsell15&utm_medium=email`
  const encodedTargetUrl = Buffer.from(targetUrl).toString('base64')

  const openTrackUrl = `${TRACKING_BASE_URL}/api/track/open?id=${encodedEmail}&t=anniversary`
  const clickTrackUrl = `${TRACKING_BASE_URL}/api/track/click?id=${encodedEmail}&url=${encodedTargetUrl}&t=anniversary`

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE
  })

  const formatPrice = (p: number) => `$${p.toFixed(2)}`
  const formatPricePerGram = (p: number, unit: string) => `$${p.toFixed(2)}/${unit === 'caps' ? 'cap' : 'g'}`

  const orig = upsellData.original
  const ups = upsellData.upsell
  const unit = orig.size_unit === 'caps' ? 'capsules' : 'g'
  const unitShort = orig.size_unit === 'caps' ? 'cap' : 'g'

  // If customer already has largest size, show repeat purchase email
  if (upsellData.isLargestSize || !ups) {
    return generateRepeatPurchaseHtml(firstName, email, discountCode, discountPercent, upsellData, expiryDate, clickTrackUrl, openTrackUrl)
  }

  const savingsText = upsellData.savingsPercent
    ? `Save ${Math.round(upsellData.savingsPercent)}% per ${unitShort}!`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time to upgrade your ${orig.product_type}!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2c5530; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Teelixir</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px;">Hi ${firstName},</p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px;">
                Ready to restock your ${orig.product_type}? Here's why customers love upgrading to the larger size:
              </p>

              <!-- Product Comparison -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td width="50%" style="padding: 20px; background-color: #f8f8f8; vertical-align: top; border-right: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Your Previous Size</p>
                    ${orig.image_url ? `<img src="${orig.image_url}" alt="${orig.product_title}" style="width: 100%; max-width: 150px; height: auto; margin: 10px auto; display: block; border-radius: 4px;">` : ''}
                    <p style="margin: 10px 0 5px; font-size: 16px; font-weight: bold; color: #333;">${orig.size_grams}${unit}</p>
                    <p style="margin: 0 0 5px; font-size: 18px; color: #333;">${formatPrice(orig.price)}</p>
                    <p style="margin: 0; font-size: 14px; color: #666;">${formatPricePerGram(upsellData.originalPricePerGram, orig.size_unit)}</p>
                  </td>
                  <td width="50%" style="padding: 20px; background-color: #f0f7f0; vertical-align: top;">
                    <p style="margin: 0 0 10px; font-size: 12px; color: #2c5530; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Upgrade & Save</p>
                    ${ups.image_url ? `<img src="${ups.image_url}" alt="${ups.product_title}" style="width: 100%; max-width: 150px; height: auto; margin: 10px auto; display: block; border-radius: 4px;">` : ''}
                    <p style="margin: 10px 0 5px; font-size: 16px; font-weight: bold; color: #333;">${ups.size_grams}${unit}</p>
                    <p style="margin: 0 0 5px; font-size: 14px; color: #888; text-decoration: line-through;">${formatPrice(ups.price)}</p>
                    <p style="margin: 0 0 5px; font-size: 20px; color: #2c5530; font-weight: bold;">${formatPrice(upsellData.discountedPrice!)}</p>
                    <p style="margin: 0 0 5px; font-size: 14px; color: #2c5530; font-weight: bold;">${formatPricePerGram(upsellData.discountedPricePerGram!, ups.size_unit)}</p>
                    <p style="margin: 10px 0 0; padding: 5px 10px; background-color: #2c5530; color: white; display: inline-block; border-radius: 4px; font-size: 12px; font-weight: bold;">${savingsText}</p>
                  </td>
                </tr>
              </table>

              <!-- Discount Code -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background-color: #f8f4e8; border: 2px dashed #2c5530; border-radius: 8px; padding: 20px 40px;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">Your exclusive ${discountPercent}% off code:</p>
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #2c5530; letter-spacing: 2px;">${discountCode}</p>
                          <p style="margin: 10px 0 0; font-size: 12px; color: #888;">Expires ${expiryDate}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${clickTrackUrl}" style="display: inline-block; background-color: #2c5530; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: bold;">
                      Upgrade Now - Save ${Math.round(upsellData.savingsPercent || 0)}%
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 30px 0 0;">
                Looking forward to seeing you back!
              </p>

              <p style="font-size: 16px; color: #333; margin: 20px 0 0;">
                <strong>Colette</strong><br>
                <span style="color: #666;">Teelixir Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                Teelixir Pty Ltd | Melbourne, Australia<br>
                <a href="https://teelixir.com.au" style="color: #2c5530;">teelixir.com.au</a>
              </p>
              <img src="${openTrackUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

function generateRepeatPurchaseHtml(
  firstName: string,
  email: string,
  discountCode: string,
  discountPercent: number,
  upsellData: UpsellData,
  expiryDate: string,
  clickTrackUrl: string,
  openTrackUrl: string
): string {
  const orig = upsellData.original
  const unit = orig.size_unit === 'caps' ? 'capsules' : 'g'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time to restock your ${orig.product_type}!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2c5530; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Teelixir</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px;">Hi ${firstName},</p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px;">
                You're already enjoying our biggest size - the ${orig.product_type} ${orig.size_grams}${unit}! Ready for another?
              </p>

              <!-- Product Image -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td align="center">
                    ${orig.image_url ? `<img src="${orig.image_url}" alt="${orig.product_title}" style="width: 100%; max-width: 200px; height: auto; border-radius: 8px;">` : ''}
                  </td>
                </tr>
              </table>

              <!-- Discount Code -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background-color: #f8f4e8; border: 2px dashed #2c5530; border-radius: 8px; padding: 20px 40px;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">Your exclusive ${discountPercent}% off:</p>
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #2c5530; letter-spacing: 2px;">${discountCode}</p>
                          <p style="margin: 10px 0 0; font-size: 12px; color: #888;">Expires ${expiryDate}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${clickTrackUrl}" style="display: inline-block; background-color: #2c5530; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: bold;">
                      Restock Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 30px 0 0;">
                Looking forward to seeing you back!
              </p>

              <p style="font-size: 16px; color: #333; margin: 20px 0 0;">
                <strong>Colette</strong><br>
                <span style="color: #666;">Teelixir Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                Teelixir Pty Ltd | Melbourne, Australia<br>
                <a href="https://teelixir.com.au" style="color: #2c5530;">teelixir.com.au</a>
              </p>
              <img src="${openTrackUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

function generateEmailText(
  firstName: string,
  discountCode: string,
  discountPercent: number,
  upsellData: UpsellData,
  expiryDate: string
): string {
  const orig = upsellData.original
  const ups = upsellData.upsell
  const unit = orig.size_unit === 'caps' ? 'capsules' : 'g'

  if (upsellData.isLargestSize || !ups) {
    return `
Hi ${firstName},

You're already enjoying our biggest size - the ${orig.product_type} ${orig.size_grams}${unit}! Ready for another?

Your exclusive ${discountPercent}% off code: ${discountCode}
Expires: ${expiryDate}

Shop now: https://teelixir.com.au/products/${orig.product_handle}

Looking forward to seeing you back!

Colette
Teelixir Team
`.trim()
  }

  const savingsText = upsellData.savingsPercent
    ? `Save ${Math.round(upsellData.savingsPercent)}% per ${orig.size_unit === 'caps' ? 'cap' : 'gram'}!`
    : ''

  return `
Hi ${firstName},

Ready to restock your ${orig.product_type}? Here's why customers love upgrading:

YOUR PREVIOUS SIZE: ${orig.size_grams}${unit} - $${orig.price.toFixed(2)}
UPGRADE: ${ups.size_grams}${unit} - $${upsellData.discountedPrice?.toFixed(2)} (was $${ups.price.toFixed(2)})
${savingsText}

Your exclusive ${discountPercent}% off code: ${discountCode}
Expires: ${expiryDate}

Shop now: https://teelixir.com.au/products/${ups.product_handle}

Looking forward to seeing you back!

Colette
Teelixir Team
`.trim()
}

// ============================================================================
// UPSELL LOGIC
// ============================================================================

async function findUpsellVariant(
  supabase: SupabaseClient,
  originalVariantId: number,
  productType: string,
  currentSize: number
): Promise<UpsellData | null> {
  // Get original variant data
  const { data: originalVariant, error: origError } = await supabase
    .from('tlx_shopify_variants')
    .select('*')
    .eq('shopify_variant_id', originalVariantId)
    .single()

  if (origError || !originalVariant) {
    console.log(`   Could not find original variant ${originalVariantId}`)
    return null
  }

  const original = originalVariant as VariantData
  const originalPricePerGram = pricePerUnit(original.price, original.size_grams)

  // Determine upsell target size
  let targetSize: number | null = null
  const isLatte = productType.toLowerCase().includes('latte')

  if (isLatte) {
    if (currentSize < 1000) targetSize = 1000
  } else {
    if (currentSize === 50) targetSize = 100
    else if (currentSize === 100) targetSize = 250
    else if (currentSize === 250) targetSize = 500
  }

  // Check if already at largest size
  const isLargestSize = targetSize === null

  if (isLargestSize) {
    return {
      original,
      upsell: null,
      isLargestSize: true,
      savingsPercent: null,
      originalPricePerGram,
      upsellPricePerGram: null,
      discountedPrice: null,
      discountedPricePerGram: null
    }
  }

  // Find upsell variant
  const { data: upsellVariant, error: upsError } = await supabase
    .from('tlx_shopify_variants')
    .select('*')
    .eq('product_type', productType)
    .eq('size_grams', targetSize)
    .eq('is_available', true)
    .gt('inventory_quantity', 0)
    .single()

  if (upsError || !upsellVariant) {
    // No available upsell - treat as largest size
    console.log(`   No available upsell for ${productType} ${targetSize}g`)
    return {
      original,
      upsell: null,
      isLargestSize: true,
      savingsPercent: null,
      originalPricePerGram,
      upsellPricePerGram: null,
      discountedPrice: null,
      discountedPricePerGram: null
    }
  }

  const upsell = upsellVariant as VariantData
  const upsellPricePerGram = pricePerUnit(upsell.price, upsell.size_grams)
  const discountedPrice = upsell.price * 0.85  // 15% off
  const discountedPricePerGram = pricePerUnit(discountedPrice, upsell.size_grams)

  // Calculate savings percentage (comparing original price per gram to discounted upsell price per gram)
  const savingsPercent = ((originalPricePerGram - discountedPricePerGram) / originalPricePerGram) * 100

  return {
    original,
    upsell,
    isLargestSize: false,
    savingsPercent,
    originalPricePerGram,
    upsellPricePerGram,
    discountedPrice,
    discountedPricePerGram
  }
}

// ============================================================================
// MAIN SEND FUNCTION
// ============================================================================

async function sendAnniversaryEmails(config: SendConfig): Promise<SendResult> {
  const startTime = Date.now()
  const result: SendResult = {
    success: false,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
    duration: 0,
  }

  try {
    console.log('\n🔐 Loading credentials...')
    await creds.load('teelixir')

    const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')
    const shopifyToken = await creds.get('teelixir', 'shopify_access_token')

    if (!supabaseKey) throw new Error('Missing Supabase service role key')
    if (!shopifyToken) throw new Error('Missing Shopify access token')

    const supabase = createClient(SUPABASE_URL, supabaseKey)

    // Get automation config
    console.log('\n⚙️  Loading automation config...')
    const { data: configData, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'anniversary_upsell')
      .single()

    if (configError || !configData) {
      throw new Error('Automation config not found. Run migration first.')
    }

    const automationConfig: AutomationConfig = configData.config

    if (!configData.enabled && !config.dryRun && !config.testEmail) {
      console.log('\n⚠️  Automation is disabled. Enable it or use --dry-run')
      result.success = true
      return result
    }

    // Check send window
    if (!config.testEmail && !config.dryRun) {
      const windowCheck = isWithinSendWindow()
      const { formatted } = getMelbourneTime()
      console.log(`\n🕐 Melbourne time: ${formatted}`)

      if (!windowCheck.allowed) {
        console.log(`\n⚠️  ${windowCheck.reason}`)
        result.success = true
        return result
      }
    }

    // Initialize Gmail
    const gmail = await GmailSender.create(automationConfig)
    if (!gmail.isConfigured() && !config.dryRun) {
      throw new Error('Gmail not configured')
    }

    // Handle test email
    if (config.testEmail) {
      console.log(`\n📧 Sending test email to: ${config.testEmail}`)

      const nameParts = (config.testName || 'Test User').split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || 'User'

      const discountCode = generateDiscountCode(firstName, lastName)
      console.log(`   Discount code: ${discountCode}`)

      // Fetch real Lions Mane variants from database for test
      const { data: orig50 } = await supabase
        .from('tlx_shopify_variants')
        .select('*')
        .eq('product_type', 'Lions Mane')
        .eq('size_grams', 50)
        .not('product_title', 'ilike', '%gift%')
        .not('product_title', 'ilike', '%100% off%')
        .limit(1)
        .single()

      const { data: upsell100 } = await supabase
        .from('tlx_shopify_variants')
        .select('*')
        .eq('product_type', 'Lions Mane')
        .eq('size_grams', 100)
        .not('product_title', 'ilike', '%latte%')
        .not('product_title', 'ilike', '%matcha%')
        .limit(1)
        .single()

      const testUpsellData: UpsellData = {
        original: orig50 ? {
          shopify_product_id: orig50.shopify_product_id,
          shopify_variant_id: orig50.shopify_variant_id,
          product_title: orig50.product_title,
          product_handle: orig50.product_handle,
          product_type: orig50.product_type,
          variant_title: orig50.variant_title,
          size_grams: orig50.size_grams,
          size_unit: orig50.size_unit || 'g',
          price: parseFloat(orig50.price),
          compare_at_price: orig50.compare_at_price ? parseFloat(orig50.compare_at_price) : null,
          image_url: orig50.image_url,
          inventory_quantity: orig50.inventory_quantity,
          is_available: orig50.is_available
        } : {
          shopify_product_id: 0, shopify_variant_id: 0,
          product_title: "Lion's Mane Mushroom", product_handle: 'lions-mane-mushroom',
          product_type: 'Lions Mane', variant_title: '50g', size_grams: 50, size_unit: 'g',
          price: 39.95, compare_at_price: null, image_url: null, inventory_quantity: 100, is_available: true
        },
        upsell: upsell100 ? {
          shopify_product_id: upsell100.shopify_product_id,
          shopify_variant_id: upsell100.shopify_variant_id,
          product_title: upsell100.product_title,
          product_handle: upsell100.product_handle,
          product_type: upsell100.product_type,
          variant_title: upsell100.variant_title,
          size_grams: upsell100.size_grams,
          size_unit: upsell100.size_unit || 'g',
          price: parseFloat(upsell100.price),
          compare_at_price: upsell100.compare_at_price ? parseFloat(upsell100.compare_at_price) : null,
          image_url: upsell100.image_url,
          inventory_quantity: upsell100.inventory_quantity,
          is_available: upsell100.is_available
        } : {
          shopify_product_id: 0, shopify_variant_id: 0,
          product_title: "Lion's Mane Mushroom", product_handle: 'lions-mane-mushroom',
          product_type: 'Lions Mane', variant_title: '100g', size_grams: 100, size_unit: 'g',
          price: 69.95, compare_at_price: null, image_url: null, inventory_quantity: 100, is_available: true
        },
        isLargestSize: false,
        savingsPercent: 25.4,
        originalPricePerGram: orig50 ? parseFloat(orig50.price) / 50 : 0.80,
        upsellPricePerGram: upsell100 ? parseFloat(upsell100.price) / 100 : 0.70,
        discountedPrice: upsell100 ? parseFloat(upsell100.price) * 0.85 : 59.46,
        discountedPricePerGram: upsell100 ? (parseFloat(upsell100.price) * 0.85) / 100 : 0.59
      }

      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const subject = `${firstName}, time to upgrade your ${testUpsellData.original.product_type}!`
      const html = generateUpsellEmailHtml(firstName, config.testEmail, discountCode, 15, testUpsellData, expiresAt)
      const expiryDate = new Date(expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', timeZone: TIMEZONE })
      const text = generateEmailText(firstName, discountCode, 15, testUpsellData, expiryDate)

      if (config.dryRun) {
        console.log('\n🔍 DRY RUN - Would send:')
        console.log(`   To: ${config.testEmail}`)
        console.log(`   Subject: ${subject}`)
        console.log(`   Code: ${discountCode}`)
        result.success = true
        return result
      }

      // Create actual Shopify discount for test
      console.log('   Creating Shopify discount...')
      const discountResult = await createPersonalizedDiscount(
        shopifyToken,
        discountCode,
        15,
        14,
        null,  // No variant restriction for test
        config.testEmail
      )

      if (!discountResult.success) {
        console.log(`   ⚠️  Discount creation failed: ${discountResult.error}`)
        console.log('   Sending email anyway (code may not work)...')
      }

      const sendResult = await gmail.send(config.testEmail, subject, html, text)

      if (sendResult.success) {
        console.log(`   ✅ Test email sent!`)
        result.emailsSent = 1
      } else {
        console.log(`   ❌ Failed: ${sendResult.error}`)
        result.errors.push(sendResult.error || 'Unknown error')
      }

      result.success = result.emailsSent > 0
      return result
    }

    // Process queue mode
    if (config.processQueue) {
      const { hour: currentHour, date: today } = getMelbourneTime()
      console.log(`\n📥 Processing queue for ${today} ${currentHour}:00...`)

      const { data: queueItems, error: queueError } = await supabase
        .from('tlx_anniversary_queue')
        .select('*')
        .eq('scheduled_date', today)
        .eq('scheduled_hour', currentHour)
        .eq('status', 'pending')
        .limit(50)

      if (queueError) {
        throw new Error(`Failed to fetch queue: ${queueError.message}`)
      }

      if (!queueItems || queueItems.length === 0) {
        console.log(`   No emails scheduled for this hour`)
        result.success = true
        return result
      }

      console.log(`   Found ${queueItems.length} emails to send`)

      if (config.dryRun) {
        console.log('\n🔍 DRY RUN - Would send:')
        for (const item of queueItems.slice(0, 10)) {
          console.log(`   - ${item.email} (${item.first_name} ${item.last_name})`)
        }
        result.emailsSent = queueItems.length
        result.success = true
        return result
      }

      // Process each queue item
      for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i]
        process.stdout.write(`\r   Processing ${i + 1}/${queueItems.length}...`)

        try {
          const firstName = item.first_name || 'there'
          const lastName = item.last_name || ''
          const discountCode = generateDiscountCode(firstName, lastName)

          // Get upsell data
          const upsellData = await findUpsellVariant(
            supabase,
            item.original_variant_id,
            item.original_product_type,
            item.original_product_size
          )

          if (!upsellData) {
            throw new Error('Could not find upsell data')
          }

          // Create Shopify discount
          const targetVariantId = upsellData.upsell?.shopify_variant_id || null
          const discountResult = await createPersonalizedDiscount(
            shopifyToken,
            discountCode,
            automationConfig.discount_percent,
            automationConfig.expiration_days,
            targetVariantId,
            item.email
          )

          if (!discountResult.success) {
            throw new Error(discountResult.error || 'Discount creation failed')
          }

          // Generate and send email
          const expiresAt = discountResult.expiresAt!
          const subject = upsellData.isLargestSize
            ? `${firstName}, time to restock your ${upsellData.original.product_type}!`
            : `${firstName}, time to upgrade your ${upsellData.original.product_type}!`

          const html = generateUpsellEmailHtml(firstName, item.email, discountCode, automationConfig.discount_percent, upsellData, expiresAt)
          const expiryDate = new Date(expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', timeZone: TIMEZONE })
          const text = generateEmailText(firstName, discountCode, automationConfig.discount_percent, upsellData, expiryDate)

          const sendResult = await gmail.send(item.email, subject, html, text)

          if (sendResult.success) {
            // Update queue
            await supabase
              .from('tlx_anniversary_queue')
              .update({ status: 'sent', processed_at: new Date().toISOString() })
              .eq('id', item.id)

            // Log to anniversary_discounts
            await supabase.from('tlx_anniversary_discounts').insert({
              email: item.email,
              shopify_customer_id: item.shopify_customer_id,
              first_name: firstName,
              last_name: lastName,
              shopify_order_id: item.shopify_order_id,
              first_order_date: item.first_order_date,
              discount_code: discountCode,
              shopify_price_rule_id: discountResult.priceRuleId?.toString(),
              discount_percent: automationConfig.discount_percent,
              expires_at: expiresAt,
              status: 'sent',
              sent_at: new Date().toISOString(),
              original_product_type: upsellData.original.product_type,
              original_product_size: upsellData.original.size_grams,
              original_variant_id: upsellData.original.shopify_variant_id,
              original_price: upsellData.original.price,
              original_price_per_gram: upsellData.originalPricePerGram,
              original_image_url: upsellData.original.image_url,
              upsell_product_type: upsellData.upsell?.product_type,
              upsell_product_size: upsellData.upsell?.size_grams,
              upsell_variant_id: upsellData.upsell?.shopify_variant_id,
              upsell_price: upsellData.upsell?.price,
              upsell_price_per_gram: upsellData.upsellPricePerGram,
              upsell_image_url: upsellData.upsell?.image_url,
              upsell_savings_percent: upsellData.savingsPercent,
              is_largest_size: upsellData.isLargestSize,
              send_hour_melbourne: currentHour,
            })

            result.emailsSent++
          } else {
            throw new Error(sendResult.error || 'Email send failed')
          }
        } catch (error: any) {
          // Update queue with error
          await supabase
            .from('tlx_anniversary_queue')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', item.id)

          result.emailsFailed++
          result.errors.push(`${item.email}: ${error.message}`)
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 2000))
      }

      console.log('')
    }

    result.success = result.errors.length === 0

  } catch (error: any) {
    result.errors.push(error.message)
    result.success = false
  }

  result.duration = Date.now() - startTime
  return result
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  const config: SendConfig = {
    dryRun: args.includes('--dry-run'),
    processQueue: args.includes('--process-queue'),
    testEmail: args.find(a => a.startsWith('--test-email='))?.split('=')[1] || null,
    testName: args.find(a => a.startsWith('--test-name='))?.split('=')[1] || null,
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  TEELIXIR - ANNIVERSARY UPSELL EMAIL SENDER                          ║')
  console.log('║  Personalized upsell offers with 15% discount codes                  ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No emails will be sent')
  }

  const result = await sendAnniversaryEmails(config)

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
  console.log('│ SEND RESULTS                                                        │')
  console.log('├─────────────────────────────────────────────────────────────────────┤')
  console.log(`│ Status:         ${result.success ? '✅ SUCCESS' : '❌ FAILED'}                                        │`)
  console.log(`│ Emails sent:    ${String(result.emailsSent).padEnd(51)}│`)
  console.log(`│ Emails failed:  ${String(result.emailsFailed).padEnd(51)}│`)
  console.log(`│ Duration:       ${String((result.duration / 1000).toFixed(1) + 's').padEnd(51)}│`)

  if (result.errors.length > 0) {
    console.log('├─────────────────────────────────────────────────────────────────────┤')
    console.log('│ ERRORS:                                                             │')
    for (const err of result.errors.slice(0, 5)) {
      console.log(`│   - ${err.substring(0, 62).padEnd(62)}│`)
    }
  }

  console.log('└─────────────────────────────────────────────────────────────────────┘')

  process.exit(result.success ? 0 : 1)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
