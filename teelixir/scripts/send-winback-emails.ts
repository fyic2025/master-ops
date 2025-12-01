#!/usr/bin/env npx tsx
/**
 * Teelixir - Winback Email Sender
 *
 * Sends re-engagement emails to unengaged customers with 40% discount offer.
 * Uses GSuite (Gmail) for better inbox placement.
 *
 * Usage:
 *   npx tsx teelixir/scripts/send-winback-emails.ts [options]
 *
 * Options:
 *   --dry-run       Preview emails without sending
 *   --limit=N       Override daily limit (default from config)
 *   --test-email    Send test email to specified address
 *
 * Prerequisites:
 *   1. Run sync-klaviyo-unengaged.ts first to populate the pool
 *   2. Configure Gmail OAuth credentials for colette@teelixir.com
 *   3. Enable automation in tlx_automation_config
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

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
// Loaded from environment variables or creds.js vault (async)
async function getGmailCredentials(): Promise<{ clientId: string; clientSecret: string; refreshToken: string }> {
  // Try environment variables first
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    return {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN
    }
  }

  // Also check TEELIXIR_ prefixed vars
  if (process.env.TEELIXIR_GMAIL_CLIENT_ID && process.env.TEELIXIR_GMAIL_CLIENT_SECRET && process.env.TEELIXIR_GMAIL_REFRESH_TOKEN) {
    return {
      clientId: process.env.TEELIXIR_GMAIL_CLIENT_ID,
      clientSecret: process.env.TEELIXIR_GMAIL_CLIENT_SECRET,
      refreshToken: process.env.TEELIXIR_GMAIL_REFRESH_TOKEN
    }
  }

  // Fallback to creds.js vault (async API)
  try {
    const credsPath = require('path').join(__dirname, '..', '..', 'creds.js')
    const creds = require(credsPath)
    const clientId = await creds.get('teelixir', 'gmail_client_id')
    const clientSecret = await creds.get('teelixir', 'gmail_client_secret')
    const refreshToken = await creds.get('teelixir', 'gmail_refresh_token')

    if (clientId && clientSecret && refreshToken) {
      return { clientId, clientSecret, refreshToken }
    }
  } catch (e) {
    // creds.js not found or invalid
  }

  throw new Error('Gmail credentials not found. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN environment variables or store in vault')
}

interface SendConfig {
  dryRun: boolean
  limitOverride: number | null
  testEmail: string | null
  testName: string | null
  processQueue: boolean  // Process scheduled queue instead of direct send
}

interface AutomationConfig {
  daily_limit: number
  discount_code: string
  discount_percent: number
  sender_email: string
  sender_name: string
  reply_to_email: string
  bcc_email: string | null  // BCC for monitoring sent emails
  subject_template: string
  default_name: string
  klaviyo_segment_id: string | null
}

interface SendResult {
  success: boolean
  emailsSent: number
  emailsFailed: number
  errors: string[]
  duration: number
}

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

// Dashboard URL for tracking endpoints
const TRACKING_BASE_URL = 'https://ops.growthcohq.com'

function generateEmailHtml(
  firstName: string,
  email: string,
  discountCode: string,
  discountPercent: number
): string {
  // Base64 encode email for tracking
  const encodedEmail = Buffer.from(email.toLowerCase()).toString('base64')

  // Target URL with UTM params
  const targetUrl = `https://teelixir.com.au/collections/all?utm_source=winback&utm_campaign=missyou40&utm_medium=email`
  const encodedTargetUrl = Buffer.from(targetUrl).toString('base64')

  // Tracking URLs
  const openTrackUrl = `${TRACKING_BASE_URL}/api/track/open?id=${encodedEmail}`
  const clickTrackUrl = `${TRACKING_BASE_URL}/api/track/click?id=${encodedEmail}&url=${encodedTargetUrl}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We miss you at Teelixir</title>
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
                It's been a while since we've seen you at Teelixir, and I wanted to personally reach out.
              </p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px;">
                As a thank you for being a valued customer, I'd love to offer you <strong>${discountPercent}% off</strong> your next order — our biggest discount.
              </p>

              <!-- Discount Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background-color: #f8f4e8; border: 2px dashed #2c5530; border-radius: 8px; padding: 20px 40px;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">Use code at checkout:</p>
                          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #2c5530; letter-spacing: 2px;">${discountCode}</p>
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
                    <a href="${clickTrackUrl}"
                       style="display: inline-block; background-color: #2c5530; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 18px; font-weight: bold;">
                      Shop Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #888; line-height: 1.6; margin: 20px 0 0;">
                This is our maximum discount and can't be combined with other offers. One use per customer.
              </p>

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
              <!-- Open Tracking Pixel -->
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
  discountPercent: number
): string {
  return `
Hi ${firstName},

It's been a while since we've seen you at Teelixir, and I wanted to personally reach out.

As a thank you for being a valued customer, I'd love to offer you ${discountPercent}% off your next order — our biggest discount.

Use code: ${discountCode} at checkout

Shop now: https://teelixir.com.au/collections/all

This is our maximum discount and can't be combined with other offers. One use per customer.

Looking forward to seeing you back!

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
  private replyToEmail: string
  private bccEmail: string | null
  private accessToken?: string
  private tokenExpiresAt?: number

  private constructor(
    gmailCreds: { clientId: string; clientSecret: string; refreshToken: string },
    config: AutomationConfig
  ) {
    this.clientId = gmailCreds.clientId
    this.clientSecret = gmailCreds.clientSecret
    this.refreshToken = gmailCreds.refreshToken
    this.userEmail = config.sender_email
    this.fromName = config.sender_name
    this.replyToEmail = config.reply_to_email || config.sender_email
    this.bccEmail = config.bcc_email || null
  }

  // Factory method to create GmailSender with async credential loading
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
      `Reply-To: ${this.replyToEmail}`,
    ]

    // Add BCC if configured (for monitoring)
    if (this.bccEmail) {
      headers.push(`Bcc: ${this.bccEmail}`)
    }

    headers.push(
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    )

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
// QUEUE PROCESSING FUNCTION
// ============================================================================

async function processQueue(config: SendConfig): Promise<SendResult> {
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

    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ||
      await creds.get('global', 'supabase_service_key') ||
      SUPABASE_SERVICE_KEY_FALLBACK

    const supabase = createClient(SUPABASE_URL, supabaseKey)

    // Get current Melbourne time
    const { hour: currentHour, formatted: currentTime } = getMelbourneTime()
    const today = new Date().toLocaleString('en-CA', { timeZone: TIMEZONE }).split(',')[0]

    console.log(`\n🕐 Melbourne time: ${currentTime} (hour: ${currentHour})`)
    console.log(`📅 Date: ${today}`)

    // Get automation config
    const { data: configData, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'winback_40')
      .single()

    if (configError || !configData) {
      throw new Error('Automation config not found')
    }

    const automationConfig: AutomationConfig = configData.config

    if (!configData.enabled && !config.dryRun) {
      console.log('\n⚠️  Automation is disabled')
      result.success = true
      return result
    }

    // Initialize Gmail
    const gmail = await GmailSender.create(automationConfig)
    if (!gmail.isConfigured() && !config.dryRun) {
      throw new Error('Gmail not configured')
    }

    // Fetch pending queue items for current hour
    console.log(`\n📥 Fetching queue for ${currentHour}:00...`)

    const { data: queueItems, error: fetchError } = await supabase
      .from('tlx_winback_queue')
      .select('*')
      .eq('scheduled_date', today)
      .eq('scheduled_hour', currentHour)
      .eq('status', 'pending')
      .limit(config.limitOverride || 50)

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`)
    }

    if (!queueItems || queueItems.length === 0) {
      console.log(`\n✅ No emails scheduled for ${currentHour}:00`)
      result.success = true
      return result
    }

    console.log(`   Found ${queueItems.length} emails to send`)

    if (config.dryRun) {
      console.log('\n🔍 DRY RUN - Would send:')
      for (const item of queueItems.slice(0, 10)) {
        console.log(`   - ${item.email} (${item.first_name || 'N/A'})`)
      }
      if (queueItems.length > 10) {
        console.log(`   ... and ${queueItems.length - 10} more`)
      }
      result.emailsSent = queueItems.length
      result.success = true
      return result
    }

    // Send each email
    const defaultName = automationConfig.default_name || 'there'
    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i]
      const firstName = item.first_name || defaultName
      const subject = automationConfig.subject_template.replace('{{ first_name }}', firstName)
      const html = generateEmailHtml(firstName, item.email, automationConfig.discount_code, automationConfig.discount_percent)
      const text = generateEmailText(firstName, automationConfig.discount_code, automationConfig.discount_percent)

      process.stdout.write(`\r   Sending ${i + 1}/${queueItems.length}...`)

      const sendResult = await gmail.send(item.email, subject, html, text)

      if (sendResult.success) {
        // Update queue status
        await supabase
          .from('tlx_winback_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', item.id)

        // Log to winback_emails table
        await supabase.from('tlx_winback_emails').insert({
          email: item.email,
          klaviyo_profile_id: item.klaviyo_profile_id,
          first_name: firstName,
          discount_code: automationConfig.discount_code,
          status: 'sent',
          send_hour_melbourne: currentHour,
        })

        result.emailsSent++
      } else {
        // Mark as failed in queue
        await supabase
          .from('tlx_winback_queue')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: sendResult.error,
          })
          .eq('id', item.id)

        result.emailsFailed++
        result.errors.push(`${item.email}: ${sendResult.error}`)
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 1000))
    }

    console.log('')

    // Update automation config
    await supabase
      .from('tlx_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: {
          type: 'queue_process',
          hour: currentHour,
          emails_sent: result.emailsSent,
          emails_failed: result.emailsFailed,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('automation_type', 'winback_40')

    result.success = result.errors.length === 0

  } catch (error: any) {
    result.errors.push(error.message)
    result.success = false
  }

  result.duration = Date.now() - startTime
  return result
}

// ============================================================================
// MAIN SEND FUNCTION (Direct mode - bypasses queue)
// ============================================================================

async function sendWinbackEmails(config: SendConfig): Promise<SendResult> {
  const startTime = Date.now()
  const result: SendResult = {
    success: false,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
    duration: 0,
  }

  try {
    // Initialize credentials
    console.log('\n🔐 Loading credentials...')
    await creds.load('teelixir')

    const supabaseKey = process.env.SUPABASE_SERVICE_KEY ||
      await creds.get('global', 'supabase_service_key') ||
      SUPABASE_SERVICE_KEY_FALLBACK

    const supabase = createClient(SUPABASE_URL, supabaseKey)

    // Get automation config
    console.log('\n⚙️  Loading automation config...')
    const { data: configData, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'winback_40')
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

    // Check send window (Melbourne time 9am-7pm) - skip for test emails
    if (!config.testEmail && !config.dryRun) {
      const windowCheck = isWithinSendWindow()
      console.log(`\n🕐 Melbourne time: ${windowCheck.currentTime}`)

      if (!windowCheck.allowed) {
        console.log(`\n⚠️  Outside send window: ${windowCheck.reason}`)
        console.log('   Emails can only be sent between 9:00 AM - 7:00 PM Melbourne time.')
        console.log('   Use --dry-run to preview, or --test-email to send test.')
        result.success = true
        return result
      }
      console.log('   ✅ Within send window (9am-7pm)')
    }

    // Initialize Gmail sender
    const gmail = await GmailSender.create(automationConfig)

    if (!gmail.isConfigured() && !config.dryRun) {
      console.log('\n⚠️  Gmail OAuth2 not configured.')
      console.log('   Credentials not found in environment variables or vault.')
      console.log('   Store in vault: node creds.js store teelixir gmail_client_id "..."')
      console.log('\n   Or use --dry-run to preview emails')

      if (!config.testEmail) {
        result.success = true
        return result
      }
    }

    // Handle test email
    if (config.testEmail) {
      const testName = config.testName || 'Test'
      console.log(`\n📧 Sending test email to: ${config.testEmail} (name: ${testName})`)

      const subject = automationConfig.subject_template.replace('{{ first_name }}', testName)
      const html = generateEmailHtml(testName, config.testEmail, automationConfig.discount_code, automationConfig.discount_percent)
      const text = generateEmailText(testName, automationConfig.discount_code, automationConfig.discount_percent)

      if (config.dryRun) {
        console.log('\n🔍 DRY RUN - Would send:')
        console.log(`   To: ${config.testEmail}`)
        console.log(`   Subject: ${subject}`)
        console.log(`   Code: ${automationConfig.discount_code}`)
        result.success = true
        return result
      }

      const sendResult = await gmail.send(config.testEmail, subject, html, text)

      if (sendResult.success) {
        console.log(`   ✅ Test email sent! Message ID: ${sendResult.messageId}`)
        result.emailsSent = 1
      } else {
        console.log(`   ❌ Failed: ${sendResult.error}`)
        result.emailsFailed = 1
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
      .from('tlx_winback_emails')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', today.toISOString())

    const remainingToday = Math.max(0, dailyLimit - (sentToday || 0))

    console.log(`\n📊 Daily limit: ${dailyLimit}, Sent today: ${sentToday || 0}, Remaining: ${remainingToday}`)

    if (remainingToday === 0) {
      console.log('\n⚠️  Daily limit reached. Try again tomorrow.')
      result.success = true
      return result
    }

    // Get unengaged profiles not yet contacted
    console.log('\n📥 Fetching eligible profiles...')

    const { data: unengagedProfiles, error: fetchError } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('*')
      .limit(remainingToday)

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`)
    }

    if (!unengagedProfiles || unengagedProfiles.length === 0) {
      console.log('\n⚠️  No unengaged profiles found. Run sync-klaviyo-unengaged.ts first.')
      result.success = true
      return result
    }

    // Filter out already contacted
    const emails = unengagedProfiles.map(p => p.email)

    const { data: alreadySent } = await supabase
      .from('tlx_winback_emails')
      .select('email')
      .in('email', emails)

    const sentEmails = new Set((alreadySent || []).map(r => r.email))
    const eligibleProfiles = unengagedProfiles.filter(p => !sentEmails.has(p.email))

    console.log(`   Total unengaged: ${unengagedProfiles.length}`)
    console.log(`   Already contacted: ${sentEmails.size}`)
    console.log(`   Eligible to send: ${eligibleProfiles.length}`)

    if (eligibleProfiles.length === 0) {
      console.log('\n⚠️  All profiles have already been contacted.')
      result.success = true
      return result
    }

    // Limit to daily remaining
    const toSend = eligibleProfiles.slice(0, remainingToday)

    console.log(`\n📤 Sending ${toSend.length} emails...`)

    if (config.dryRun) {
      console.log('\n🔍 DRY RUN - Would send to:')
      for (const profile of toSend.slice(0, 10)) {
        console.log(`   - ${profile.email} (${profile.first_name || 'N/A'})`)
      }
      if (toSend.length > 10) {
        console.log(`   ... and ${toSend.length - 10} more`)
      }
      result.emailsSent = toSend.length
      result.success = true
      return result
    }

    // Send emails
    const defaultName = automationConfig.default_name || 'there'
    for (let i = 0; i < toSend.length; i++) {
      const profile = toSend[i]
      const firstName = profile.first_name || defaultName
      const subject = automationConfig.subject_template.replace('{{ first_name }}', firstName)
      const html = generateEmailHtml(firstName, profile.email, automationConfig.discount_code, automationConfig.discount_percent)
      const text = generateEmailText(firstName, automationConfig.discount_code, automationConfig.discount_percent)

      process.stdout.write(`\r   Sending ${i + 1}/${toSend.length}...`)

      const sendResult = await gmail.send(profile.email, subject, html, text)

      // Get Melbourne time for analytics
      const { hour: sendHour } = getMelbourneTime()

      if (sendResult.success) {
        // Log to database with send hour for analytics
        await supabase.from('tlx_winback_emails').insert({
          email: profile.email,
          klaviyo_profile_id: profile.klaviyo_profile_id,
          first_name: firstName,
          discount_code: automationConfig.discount_code,
          status: 'sent',
          send_hour_melbourne: sendHour,
        })

        result.emailsSent++
      } else {
        // Log failure
        await supabase.from('tlx_winback_emails').insert({
          email: profile.email,
          klaviyo_profile_id: profile.klaviyo_profile_id,
          first_name: firstName,
          discount_code: automationConfig.discount_code,
          status: 'failed',
          error_message: sendResult.error,
          send_hour_melbourne: sendHour,
        })

        result.emailsFailed++
        result.errors.push(`${profile.email}: ${sendResult.error}`)
      }

      // Rate limit: ~1 email per second
      await new Promise(r => setTimeout(r, 1000))
    }

    console.log('')

    // Update automation config with last run info
    await supabase
      .from('tlx_automation_config')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_result: {
          type: 'send',
          emails_sent: result.emailsSent,
          emails_failed: result.emailsFailed,
          errors: result.errors.slice(0, 10),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('automation_type', 'winback_40')

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
    processQueue: args.includes('--process-queue'),
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  if (config.processQueue) {
    console.log('║  TEELIXIR - WINBACK QUEUE PROCESSOR                                  ║')
    console.log('║  Send scheduled emails for the current hour                         ║')
  } else {
    console.log('║  TEELIXIR - WINBACK EMAIL SENDER                                     ║')
    console.log('║  Re-engage customers with 40% discount via GSuite                    ║')
  }
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No emails will be sent')
  }

  // Choose mode: queue processing or direct send
  const result = config.processQueue
    ? await processQueue(config)
    : await sendWinbackEmails(config)

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
