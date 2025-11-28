#!/usr/bin/env npx tsx
/**
 * Elevate Wholesale Prospecting Email Sender
 *
 * Processes pending emails from the prospecting_emails queue and sends them
 * via Gmail OAuth2.
 *
 * Usage:
 *   npx tsx elevate-wholesale/scripts/prospecting/email-sender.ts
 *   npx tsx elevate-wholesale/scripts/prospecting/email-sender.ts --dry-run
 *   npx tsx elevate-wholesale/scripts/prospecting/email-sender.ts --limit 10
 */

import { createClient } from '@supabase/supabase-js'
import { gmailClient } from '../../shared/libs/integrations/gmail'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Template directory
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'prospecting')

// =============================================================================
// Types
// =============================================================================

interface PendingEmail {
  id: string
  queue_id: string
  email_type: string
  recipient_email: string
  subject: string
  template_name: string
  template_data: Record<string, string>
  scheduled_for: string
  retry_count: number
}

interface SendResult {
  emailId: string
  recipient: string
  success: boolean
  messageId?: string
  error?: string
}

// =============================================================================
// Template Functions
// =============================================================================

function loadTemplate(templateName: string): string {
  const templatePath = path.join(TEMPLATE_DIR, `${templateName}.html`)

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`)
  }

  return fs.readFileSync(templatePath, 'utf-8')
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template

  // Replace {{variable}} patterns
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    rendered = rendered.replace(pattern, value || '')
  })

  // Remove any unreplaced variables
  rendered = rendered.replace(/\{\{\w+\}\}/g, '')

  return rendered
}

// =============================================================================
// Database Functions
// =============================================================================

async function getPendingEmails(limit: number): Promise<PendingEmail[]> {
  const { data, error } = await supabase
    .from('prospecting_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch pending emails: ${error.message}`)
  return data || []
}

async function updateEmailStatus(
  emailId: string,
  status: 'sending' | 'sent' | 'failed',
  result?: { messageId?: string; error?: string }
): Promise<void> {
  const update: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'sent' && result?.messageId) {
    update.sent_at = new Date().toISOString()
    update.gmail_message_id = result.messageId
  }

  if (status === 'failed' && result?.error) {
    update.error_message = result.error
    update.retry_count = supabase.rpc('increment', { row_id: emailId, column: 'retry_count' })
  }

  const { error } = await supabase
    .from('prospecting_emails')
    .update(update)
    .eq('id', emailId)

  if (error) {
    console.error(`Failed to update email status: ${error.message}`)
  }
}

async function incrementRetryCount(emailId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_retry_count', { email_id: emailId })

  if (error) {
    // Fallback: fetch and update manually
    const { data } = await supabase
      .from('prospecting_emails')
      .select('retry_count')
      .eq('id', emailId)
      .single()

    if (data) {
      await supabase
        .from('prospecting_emails')
        .update({ retry_count: (data.retry_count || 0) + 1 })
        .eq('id', emailId)
    }
  }
}

async function markQueueWelcomeSent(queueId: string): Promise<void> {
  const { error } = await supabase
    .from('prospecting_queue')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  if (error) {
    console.error(`Failed to update queue entry: ${error.message}`)
  }
}

// =============================================================================
// Email Sending
// =============================================================================

async function sendEmail(email: PendingEmail, dryRun: boolean): Promise<SendResult> {
  const result: SendResult = {
    emailId: email.id,
    recipient: email.recipient_email,
    success: false,
  }

  try {
    // Load and render template
    const templateHtml = loadTemplate(email.template_name || email.email_type)
    const renderedHtml = renderTemplate(templateHtml, {
      ...email.template_data,
      email: email.recipient_email,
    })

    // Replace subject variables too
    const subject = renderTemplate(email.subject, email.template_data)

    if (dryRun) {
      console.log(`  [DRY RUN] Would send "${subject}" to ${email.recipient_email}`)
      result.success = true
      return result
    }

    // Mark as sending
    await updateEmailStatus(email.id, 'sending')

    // Send via Gmail
    const sendResult = await gmailClient.send({
      to: email.recipient_email,
      subject,
      html: renderedHtml,
    })

    if (sendResult.success) {
      result.success = true
      result.messageId = sendResult.messageId

      // Update email status
      await updateEmailStatus(email.id, 'sent', { messageId: sendResult.messageId })

      // Update queue if this was a welcome email
      if (email.email_type === 'welcome') {
        await markQueueWelcomeSent(email.queue_id)
      }

      console.log(`  ✅ Sent: ${email.recipient_email} (${sendResult.messageId})`)
    } else {
      throw new Error(sendResult.error || 'Unknown send error')
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    await updateEmailStatus(email.id, 'failed', { error: result.error })
    await incrementRetryCount(email.id)
    console.error(`  ❌ Failed: ${email.recipient_email} - ${result.error}`)
  }

  return result
}

// =============================================================================
// Main Function
// =============================================================================

async function runEmailSender(options: { dryRun?: boolean; limit?: number } = {}): Promise<void> {
  console.log('═'.repeat(60))
  console.log('📧 Elevate Wholesale Prospecting Email Sender')
  console.log('═'.repeat(60))
  console.log(`Started at: ${new Date().toISOString()}`)

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No emails will be sent\n')
  }

  // Check Gmail configuration
  console.log('\n🔑 Checking Gmail configuration...')
  const gmailInfo = gmailClient.getInfo()

  if (!gmailInfo.isConfigured) {
    console.error('❌ Gmail OAuth2 is not configured. See docs/gmail-oauth2-setup.md')
    process.exit(1)
  }

  console.log(`  From: ${gmailInfo.fromName} <${gmailInfo.userEmail}>`)

  // Health check
  if (!options.dryRun) {
    console.log('  Checking Gmail connection...')
    const health = await gmailClient.healthCheck()
    if (health.status !== 'healthy') {
      console.error(`  ❌ Gmail health check failed: ${health.error}`)
      process.exit(1)
    }
    console.log(`  ✅ Gmail connected as ${health.email}`)
  }

  // Get pending emails
  const limit = options.limit || 50
  console.log(`\n📋 Fetching pending emails (limit: ${limit})...`)
  const pendingEmails = await getPendingEmails(limit)
  console.log(`  Found ${pendingEmails.length} emails to send`)

  if (pendingEmails.length === 0) {
    console.log('\n✅ No emails to send. Exiting.')
    return
  }

  // Send emails
  console.log('\n🔄 Sending emails...\n')
  const results: SendResult[] = []

  for (let i = 0; i < pendingEmails.length; i++) {
    const email = pendingEmails[i]
    console.log(`[${i + 1}/${pendingEmails.length}] ${email.email_type}: ${email.recipient_email}`)
    const result = await sendEmail(email, options.dryRun || false)
    results.push(result)

    // Small delay between sends to avoid rate limits
    if (!options.dryRun && i < pendingEmails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 Summary')
  console.log('═'.repeat(60))
  console.log(`  Total: ${results.length}`)
  console.log(`  Sent: ${results.filter((r) => r.success).length}`)
  console.log(`  Failed: ${results.filter((r) => !r.success).length}`)

  if (results.some((r) => !r.success)) {
    console.log('\n❌ Failed emails:')
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`  - ${r.recipient}: ${r.error}`))
  }

  console.log(`\nCompleted at: ${new Date().toISOString()}`)
}

// =============================================================================
// CLI Entry Point
// =============================================================================

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((a) => a.startsWith('--limit'))
const limit = limitArg ? parseInt(limitArg.split('=')[1] || '50', 10) : undefined

runEmailSender({ dryRun, limit }).catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
