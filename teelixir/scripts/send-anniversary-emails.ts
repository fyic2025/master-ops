#!/usr/bin/env npx tsx
/**
 * Teelixir - Anniversary Email Sender
 *
 * Sends anniversary re-engagement emails to first-time buyers with unique 15% discount codes.
 * Uses data-driven timing based on product type and size reorder patterns.
 *
 * Usage:
 *   npx tsx teelixir/scripts/send-anniversary-emails.ts [options]
 *
 * Options:
 *   --dry-run       Preview emails without sending
 *   --limit=N       Override daily limit (default from config)
 *   --test-email    Send test email to specified address
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// Import discount service
import { createAnniversaryDiscount, deleteDiscount } from '../../shared/libs/integrations/shopify/discounts'

// ============================================================================
// CONFIGURATION
// ============================================================================

// Timezone configuration - Melbourne Australia (AEST/AEDT)
const TIMEZONE = 'Australia/Melbourne'
const SEND_WINDOW_START = 9  // 9:00 AM
const SEND_WINDOW_END = 19   // 7:00 PM

function getMelbourneTime(): { hour: number; formatted: string } {
  const now = new Date()
  const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }))
  return {
    hour: melbourneTime.getHours(),
    formatted: melbourneTime.toLocaleString('en-AU', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }
}

function isWithinSendWindow(): { allowed: boolean; reason?: string; currentTime: string } {
  const { hour, formatted } = getMelbourneTime()

  if (hour < SEND_WINDOW_START) {
    return {
      allowed: false,
      reason: `Too early. Send window starts at ${SEND_WINDOW_START}:00 AM Melbourne time.`,
      currentTime: formatted
    }
  }

  if (hour >= SEND_WINDOW_END) {
    return {
      allowed: false,
      reason: `Too late. Send window ends at ${SEND_WINDOW_END - 12}:00 PM Melbourne time.`,
      currentTime: formatted
    }
  }

  return { allowed: true, currentTime: formatted }
}

// Gmail OAuth credentials for colette@teelixir.com
async function getGmailCredentials(): Promise<{ clientId: string; clientSecret: string; refreshToken: string }> {
  // Try environment variables first
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    return {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN
    }
  }

  // Fallback to creds.js vault
  const clientId = await creds.get('teelixir', 'gmail_client_id')
  const clientSecret = await creds.get('teelixir', 'gmail_client_secret')
  const refreshToken = await creds.get('teelixir', 'gmail_refresh_token')

  if (clientId && clientSecret && refreshToken) {
    return { clientId, clientSecret, refreshToken }
  }

  throw new Error('Gmail credentials not found')
}

interface SendConfig {
  dryRun: boolean
  limitOverride: number | null
  testEmail: string | null
  testName: string | null
}

interface AutomationConfig {
  discount_percent: number
  expiration_days: number
  lead_days: number
  daily_limit: number
  send_window_start: number
  send_window_end: number
  sender_email: string
  sender_name: string
}

interface AnniversaryCandidate {
  shopify_customer_id: string
  shopify_order_id: string
  customer_email: string
  customer_first_name: string | null
  first_order_date: string
  first_order_value: number
  days_since_first_order: number
  primary_product_type: string | null
  primary_product_size: number | null
  email_send_day: number
  timing_match_type: string
}

interface SendResult {
  success: boolean
  emailsSent: number
  emailsFailed: number
  codesCreated: number
  errors: string[]
  duration: number
}

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

function generateEmailHtml(
  firstName: string,
  email: string,
  discountCode: string,
  discountPercent: number,
  productType: string | null,
  expiresAt: string
): string {
  const encodedEmail = Buffer.from(email).toString('base64')
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long'
  })

  const productMessage = productType
    ? `your ${productType}`
    : 'your favourite mushroom products'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Happy Anniversary from Teelixir!</title>
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
              <p style="color: #c4dfc7; margin: 10px 0 0; font-size: 16px;">Happy Anniversary! 🎉</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px;">Hi ${firstName},</p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px;">
                It's been about a month since you joined the Teelixir family, and I wanted to check in!
              </p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px;">
                If you're ready to restock ${productMessage}, I'd love to offer you <strong>${discountPercent}% off</strong> as a thank you for being part of our community.
              </p>

              <!-- Discount Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background-color: #f8f4e8; border: 2px dashed #2c5530; border-radius: 8px; padding: 20px 40px;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">Your exclusive code:</p>
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
                    <a href="https://teelixir.com.au/collections/all?utm_email=${encodedEmail}&utm_source=anniversary&utm_campaign=anniv15"
                       style="display: inline-block; background-color: #2c5530; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: bold;">
                      Shop Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #888; line-height: 1.6; margin: 20px 0 0;">
                This code is just for you — single use only. Can't be combined with other offers.
              </p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 30px 0 0;">
                Thanks for being part of the Teelixir family!
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
  productType: string | null,
  expiresAt: string
): string {
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long'
  })

  const productMessage = productType
    ? `your ${productType}`
    : 'your favourite mushroom products'

  return `
Hi ${firstName},

It's been about a month since you joined the Teelixir family, and I wanted to check in!

If you're ready to restock ${productMessage}, I'd love to offer you ${discountPercent}% off as a thank you for being part of our community.

Your exclusive code: ${discountCode}
Expires: ${expiryDate}

Shop now: https://teelixir.com.au/collections/all

This code is just for you — single use only. Can't be combined with other offers.

Thanks for being part of the Teelixir family!

Colette
Teelixir Team
`.trim()
}

// ============================================================================
// GMAIL SENDER
// ============================================================================

class GmailSender {
  private clientId: string
  private clientSecret: string
  private refreshToken: string
  private userEmail: string
  private fromName: string
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
      const error = await response.text()
      throw new Error(`Failed to refresh Gmail access token: ${error}`)
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
      `Reply-To: ${this.userEmail}`,
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

  async send(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Gmail OAuth2 not configured' }
    }

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
        const errorBody = await response.text()
        throw new Error(`Gmail API error (${response.status}): ${errorBody}`)
      }

      const result = await response.json()
      return { success: true, messageId: result.id }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
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
    codesCreated: 0,
    errors: [],
    duration: 0,
  }

  try {
    // Initialize credentials
    console.log('\n🔐 Loading credentials...')
    await creds.load('teelixir')
    await creds.load('global')

    const supabaseUrl = await creds.get('global', 'master_supabase_url')
    const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get automation config
    console.log('\n⚙️  Loading automation config...')
    const { data: configData, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'anniversary_15')
      .single()

    if (configError || !configData) {
      throw new Error('Automation config not found. Run migration first.')
    }

    const automationConfig: AutomationConfig = configData.config
    const isEnabled = configData.enabled

    if (!isEnabled && !config.dryRun && !config.testEmail) {
      console.log('\n⚠️  Automation is disabled. Enable it in tlx_automation_config or use --dry-run')
      result.success = true
      return result
    }

    // Check send window - skip for test emails
    if (!config.testEmail && !config.dryRun) {
      const windowCheck = isWithinSendWindow()
      console.log(`\n🕐 Melbourne time: ${windowCheck.currentTime}`)

      if (!windowCheck.allowed) {
        console.log(`\n⚠️  Outside send window: ${windowCheck.reason}`)
        result.success = true
        return result
      }
      console.log('   ✅ Within send window (9am-7pm)')
    }

    // Initialize Gmail sender
    const gmail = await GmailSender.create(automationConfig)

    if (!gmail.isConfigured() && !config.dryRun) {
      console.log('\n⚠️  Gmail OAuth2 not configured.')
      if (!config.testEmail) {
        result.success = true
        return result
      }
    }

    // Handle test email
    if (config.testEmail) {
      const testName = config.testName || 'Test'
      console.log(`\n📧 Sending test email to: ${config.testEmail}`)

      // Create test discount code
      const discountResult = await createAnniversaryDiscount(
        automationConfig.discount_percent,
        automationConfig.expiration_days,
        config.testEmail
      )

      if (!discountResult.success) {
        console.log(`\n❌ Failed to create test discount: ${discountResult.error}`)
        result.errors.push(discountResult.error || 'Unknown error')
        return result
      }

      console.log(`   ✅ Created test code: ${discountResult.code}`)

      const subject = `${testName}, here's 15% off for your anniversary! 🎉`
      const html = generateEmailHtml(
        testName,
        config.testEmail,
        discountResult.code!,
        automationConfig.discount_percent,
        'Lions Mane',
        discountResult.expiresAt!
      )
      const text = generateEmailText(
        testName,
        discountResult.code!,
        automationConfig.discount_percent,
        'Lions Mane',
        discountResult.expiresAt!
      )

      if (config.dryRun) {
        console.log('\n🔍 DRY RUN - Would send:')
        console.log(`   To: ${config.testEmail}`)
        console.log(`   Subject: ${subject}`)
        console.log(`   Code: ${discountResult.code}`)

        // Clean up test discount
        await deleteDiscount(discountResult.priceRuleId!)
        console.log('   (Test code deleted)')

        result.success = true
        return result
      }

      const sendResult = await gmail.send(config.testEmail, subject, html, text)

      if (sendResult.success) {
        console.log(`   ✅ Test email sent!`)
        result.emailsSent = 1
        result.codesCreated = 1
      } else {
        console.log(`   ❌ Failed: ${sendResult.error}`)
        // Clean up discount on failure
        await deleteDiscount(discountResult.priceRuleId!)
        result.errors.push(sendResult.error || 'Unknown error')
      }

      result.success = result.emailsSent > 0
      return result
    }

    // Get daily limit
    const dailyLimit = config.limitOverride || automationConfig.daily_limit

    // Get emails sent today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: sentToday } = await supabase
      .from('tlx_anniversary_discounts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const remainingToday = Math.max(0, dailyLimit - (sentToday || 0))

    console.log(`\n📊 Daily limit: ${dailyLimit}, Sent today: ${sentToday || 0}, Remaining: ${remainingToday}`)

    if (remainingToday === 0) {
      console.log('\n⚠️  Daily limit reached. Try again tomorrow.')
      result.success = true
      return result
    }

    // Get anniversary candidates
    console.log('\n📥 Fetching anniversary candidates...')

    const { data: candidates, error: fetchError } = await supabase
      .from('v_tlx_anniversary_candidates')
      .select('*')
      .limit(remainingToday)

    if (fetchError) {
      throw new Error(`Failed to fetch candidates: ${fetchError.message}`)
    }

    if (!candidates || candidates.length === 0) {
      console.log('\n⚠️  No anniversary candidates found.')
      result.success = true
      return result
    }

    console.log(`   Found ${candidates.length} candidates`)

    // Preview candidates
    if (config.dryRun) {
      console.log('\n🔍 DRY RUN - Would send to:')
      for (const cand of candidates.slice(0, 10)) {
        console.log(
          `   - ${cand.customer_email} (${cand.customer_first_name || 'N/A'}) ` +
          `| ${cand.days_since_first_order}d since order | ${cand.primary_product_type || 'Unknown'} ${cand.primary_product_size}g ` +
          `| timing: ${cand.timing_match_type}`
        )
      }
      if (candidates.length > 10) {
        console.log(`   ... and ${candidates.length - 10} more`)
      }
      result.success = true
      return result
    }

    // Send emails
    console.log(`\n📤 Sending ${candidates.length} anniversary emails...`)

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i] as AnniversaryCandidate
      const firstName = candidate.customer_first_name || 'there'

      process.stdout.write(`\r   Processing ${i + 1}/${candidates.length}...`)

      // Create unique discount code
      const discountResult = await createAnniversaryDiscount(
        automationConfig.discount_percent,
        automationConfig.expiration_days,
        candidate.customer_email
      )

      if (!discountResult.success) {
        result.emailsFailed++
        result.errors.push(`${candidate.customer_email}: Failed to create discount - ${discountResult.error}`)

        // Log failure
        await supabase.from('tlx_anniversary_discounts').insert({
          email: candidate.customer_email,
          first_name: firstName,
          shopify_customer_id: candidate.shopify_customer_id,
          shopify_order_id: candidate.shopify_order_id,
          discount_code: 'FAILED',
          status: 'failed',
          error_message: discountResult.error,
          first_order_date: candidate.first_order_date,
          trigger_day: candidate.days_since_first_order,
          timing_product_type: candidate.primary_product_type,
          timing_product_size: candidate.primary_product_size,
          timing_match_type: candidate.timing_match_type,
          expires_at: new Date(Date.now() + automationConfig.expiration_days * 24 * 60 * 60 * 1000).toISOString()
        })

        continue
      }

      result.codesCreated++

      // Generate email content
      const subject = `${firstName}, here's 15% off for your anniversary! 🎉`
      const html = generateEmailHtml(
        firstName,
        candidate.customer_email,
        discountResult.code!,
        automationConfig.discount_percent,
        candidate.primary_product_type,
        discountResult.expiresAt!
      )
      const text = generateEmailText(
        firstName,
        discountResult.code!,
        automationConfig.discount_percent,
        candidate.primary_product_type,
        discountResult.expiresAt!
      )

      // Send email
      const sendResult = await gmail.send(candidate.customer_email, subject, html, text)

      const { hour: sendHour } = getMelbourneTime()

      if (sendResult.success) {
        // Log success
        await supabase.from('tlx_anniversary_discounts').insert({
          email: candidate.customer_email,
          first_name: firstName,
          shopify_customer_id: candidate.shopify_customer_id,
          shopify_order_id: candidate.shopify_order_id,
          discount_code: discountResult.code,
          shopify_price_rule_id: String(discountResult.priceRuleId),
          discount_percent: automationConfig.discount_percent,
          status: 'sent',
          email_sent_at: new Date().toISOString(),
          first_order_date: candidate.first_order_date,
          trigger_day: candidate.days_since_first_order,
          timing_product_type: candidate.primary_product_type,
          timing_product_size: candidate.primary_product_size,
          timing_match_type: candidate.timing_match_type,
          expires_at: discountResult.expiresAt
        })

        result.emailsSent++
      } else {
        // Clean up Shopify discount on email failure
        await deleteDiscount(discountResult.priceRuleId!)

        // Log failure
        await supabase.from('tlx_anniversary_discounts').insert({
          email: candidate.customer_email,
          first_name: firstName,
          shopify_customer_id: candidate.shopify_customer_id,
          shopify_order_id: candidate.shopify_order_id,
          discount_code: discountResult.code,
          status: 'failed',
          error_message: sendResult.error,
          first_order_date: candidate.first_order_date,
          trigger_day: candidate.days_since_first_order,
          timing_product_type: candidate.primary_product_type,
          timing_product_size: candidate.primary_product_size,
          timing_match_type: candidate.timing_match_type,
          expires_at: discountResult.expiresAt
        })

        result.emailsFailed++
        result.errors.push(`${candidate.customer_email}: ${sendResult.error}`)
      }

      // Rate limit: ~1 per second
      await new Promise(r => setTimeout(r, 1000))
    }

    console.log('')

    // Update automation config with last run
    await supabase
      .from('tlx_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: {
          type: 'send',
          emails_sent: result.emailsSent,
          codes_created: result.codesCreated,
          emails_failed: result.emailsFailed,
          errors: result.errors.slice(0, 10),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('automation_type', 'anniversary_15')

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
    limitOverride: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '') || null,
    testEmail: args.find(a => a.startsWith('--test-email='))?.split('=')[1] || null,
    testName: args.find(a => a.startsWith('--test-name='))?.split('=')[1] || null,
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  TEELIXIR - ANNIVERSARY EMAIL SENDER                                 ║')
  console.log('║  Data-driven re-engagement with unique 15% codes                     ║')
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
  console.log(`│ Codes created:  ${String(result.codesCreated).padEnd(51)}│`)
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
