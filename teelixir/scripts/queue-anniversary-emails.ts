#!/usr/bin/env npx tsx
/**
 * Teelixir - Anniversary Upsell Email Queue Builder
 *
 * Queues first-time customers for anniversary upsell emails at optimal timing.
 * Uses product-specific timing from reorder data to send before they're likely to rebuy.
 *
 * Usage:
 *   npx tsx teelixir/scripts/queue-anniversary-emails.ts [options]
 *
 * Options:
 *   --dry-run       Preview without queueing
 *   --limit=N       Number of emails to queue (default: daily_limit from config)
 *   --date=YYYY-MM-DD  Schedule for specific date (default: today)
 *
 * How it works:
 *   1. Fetches eligible customers from v_tlx_anniversary_upsell_candidates
 *   2. Filters for those whose email_send_day is approaching
 *   3. Looks up upsell variant from tlx_shopify_variants
 *   4. Assigns send hours (9am-6pm Melbourne time, spread evenly)
 *   5. Inserts into tlx_anniversary_queue
 *
 * Then run send-anniversary-upsell.ts hourly to process the queue.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

const credsPath = path.join(__dirname, '../../creds.js')
const creds = require(credsPath)

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'

// Send window hours (Melbourne time)
const SEND_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] // 9am to 6pm

interface QueueConfig {
  dryRun: boolean
  limit: number | null
  targetDate: string // YYYY-MM-DD
}

interface QueueResult {
  success: boolean
  queued: number
  skipped: number
  upsellCount: number
  repeatOnlyCount: number
  hourDistribution: Record<number, number>
  errors: string[]
}

interface CandidateRow {
  shopify_customer_id: string
  shopify_order_id: string
  customer_email: string
  customer_first_name: string
  customer_last_name: string
  first_order_date: string
  days_since_order: number
  product_type: string
  product_size_grams: number
  shopify_product_id: string
  shopify_variant_id: string
  quantity: number
  price: number
  lead_days: number
  upsell_target_size: number | null
  is_largest_size: boolean
  email_send_day: number
  timing_confidence: number | null
}

interface VariantRow {
  shopify_variant_id: number
  product_title: string
  product_type: string
  size_grams: number
  price: number
  image_url: string | null
  is_available: boolean
}

// ============================================================================
// MAIN QUEUE FUNCTION
// ============================================================================

async function queueAnniversaryEmails(config: QueueConfig): Promise<QueueResult> {
  const result: QueueResult = {
    success: false,
    queued: 0,
    skipped: 0,
    upsellCount: 0,
    repeatOnlyCount: 0,
    hourDistribution: {},
    errors: [],
  }

  try {
    console.log('\n🔐 Loading credentials...')
    await creds.load('teelixir')

    const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')

    const supabase = createClient(SUPABASE_URL, supabaseKey)

    // Get automation config
    console.log('\n⚙️  Loading automation config...')
    const { data: configData, error: configError } = await supabase
      .from('tlx_automation_config')
      .select('enabled, config')
      .eq('automation_type', 'anniversary_upsell')
      .single()

    if (configError || !configData) {
      throw new Error(`Automation config not found: ${configError?.message}`)
    }

    if (!configData.enabled && !config.dryRun) {
      console.log('\n⚠️  Automation is disabled. Enable in tlx_automation_config or use --dry-run')
      result.success = true
      return result
    }

    const automationConfig = configData.config
    const dailyLimit = config.limit || automationConfig.daily_limit || 50
    const smallSizeLeadDays = automationConfig.small_size_lead_days || 7
    const largeSizeLeadDays = automationConfig.large_size_lead_days || 12
    const largeSizeThreshold = automationConfig.large_size_threshold_grams || 250

    console.log(`\n📅 Target date: ${config.targetDate}`)
    console.log(`📊 Daily limit: ${dailyLimit}`)
    console.log(`📦 Lead days: ${smallSizeLeadDays} (small), ${largeSizeLeadDays} (large)`)

    // Get all candidates from the view
    const { data: candidates, error: fetchError } = await supabase
      .from('v_tlx_anniversary_upsell_candidates')
      .select('*')
      .limit(500)

    if (fetchError) {
      throw new Error(`Failed to fetch candidates: ${fetchError.message}`)
    }

    if (!candidates || candidates.length === 0) {
      console.log('\n📥 No candidates found in view')
      result.success = true
      return result
    }

    console.log(`\n📥 Found ${candidates.length} total candidates`)

    // Calculate target date as days from now
    const targetDateObj = new Date(config.targetDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    targetDateObj.setHours(0, 0, 0, 0)

    // Filter for candidates whose send date is today
    // email_send_day is the day since first order to send
    // We need: email_send_day - lead_days <= days_since_order
    // Meaning: they should receive email today if days_since_order + lead_days >= email_send_day
    const eligible: CandidateRow[] = []

    for (const candidate of candidates as CandidateRow[]) {
      const daysSinceOrder = candidate.days_since_order
      const emailSendDay = candidate.email_send_day
      const leadDays = candidate.lead_days

      // Calculate the ideal send day (email_send_day - lead_days days after order)
      const idealSendDayFromOrder = emailSendDay - leadDays

      // If days_since_order is close to idealSendDayFromOrder, they should get email
      // We allow a window of -1 to +3 days to catch any missed
      const diff = daysSinceOrder - idealSendDayFromOrder

      if (diff >= -1 && diff <= 3) {
        eligible.push(candidate)
      }
    }

    console.log(`   Eligible for today: ${eligible.length}`)

    if (eligible.length === 0) {
      console.log('\n⚠️  No customers due for anniversary email today')
      result.success = true
      return result
    }

    // Take up to daily limit
    const toQueue = eligible.slice(0, dailyLimit)

    // Look up upsell variants for each candidate
    console.log('\n🔍 Looking up upsell variants...')

    const queueEntries = []

    for (let index = 0; index < toQueue.length; index++) {
      const candidate = toQueue[index]

      // Find upsell variant if not largest size
      let upsellVariantId: number | null = null

      if (!candidate.is_largest_size && candidate.upsell_target_size) {
        // Look up the next size up for same product type
        const { data: upsellVariant } = await supabase
          .from('tlx_shopify_variants')
          .select('shopify_variant_id')
          .eq('product_type', candidate.product_type)
          .eq('size_grams', candidate.upsell_target_size)
          .eq('is_available', true)
          .not('product_title', 'ilike', '%latte%')
          .not('product_title', 'ilike', '%matcha%')
          .not('product_title', 'ilike', '%gift%')
          .limit(1)
          .single()

        if (upsellVariant) {
          upsellVariantId = upsellVariant.shopify_variant_id
          result.upsellCount++
        }
      }

      if (candidate.is_largest_size) {
        result.repeatOnlyCount++
      }

      // Assign hour - round-robin through send window
      const hour = SEND_HOURS[index % SEND_HOURS.length]
      result.hourDistribution[hour] = (result.hourDistribution[hour] || 0) + 1

      queueEntries.push({
        email: candidate.customer_email.toLowerCase(),
        shopify_customer_id: candidate.shopify_customer_id,
        first_name: candidate.customer_first_name,
        last_name: candidate.customer_last_name,
        shopify_order_id: candidate.shopify_order_id,
        first_order_date: candidate.first_order_date,
        original_product_type: candidate.product_type,
        original_product_size: candidate.product_size_grams,
        original_variant_id: parseInt(candidate.shopify_variant_id),
        upsell_variant_id: upsellVariantId,
        is_largest_size: candidate.is_largest_size,
        scheduled_date: config.targetDate,
        scheduled_hour: hour,
        status: 'pending',
      })
    }

    console.log(`\n📤 Queueing ${queueEntries.length} emails...`)
    console.log(`   With upsell offer: ${result.upsellCount}`)
    console.log(`   Repeat-only (largest size): ${result.repeatOnlyCount}`)
    console.log('\n   Hour distribution:')
    for (const hour of SEND_HOURS) {
      const count = result.hourDistribution[hour] || 0
      if (count > 0) {
        const label = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
        console.log(`   ${label.padEnd(10)} ${count} emails`)
      }
    }

    if (config.dryRun) {
      console.log('\n🔍 DRY RUN - Would queue:')
      for (const entry of queueEntries.slice(0, 10)) {
        const hourLabel = entry.scheduled_hour < 12
          ? `${entry.scheduled_hour}am`
          : entry.scheduled_hour === 12 ? '12pm' : `${entry.scheduled_hour - 12}pm`
        const upsellStatus = entry.upsell_variant_id ? '📈' : '🔄'
        console.log(`   ${upsellStatus} ${entry.email} → ${hourLabel} (${entry.original_product_type} ${entry.original_product_size}g)`)
      }
      if (queueEntries.length > 10) {
        console.log(`   ... and ${queueEntries.length - 10} more`)
      }
      result.queued = queueEntries.length
      result.success = true
      return result
    }

    // Insert into queue
    const { error: insertError } = await supabase
      .from('tlx_anniversary_queue')
      .upsert(queueEntries, { onConflict: 'email,scheduled_date' })

    if (insertError) {
      throw new Error(`Failed to queue: ${insertError.message}`)
    }

    result.queued = queueEntries.length
    result.success = true

    console.log(`\n✅ Queued ${result.queued} anniversary emails for ${config.targetDate}`)

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    result.errors.push(error.message)
    result.success = false
  }

  return result
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  // Default to today in Melbourne timezone
  const now = new Date()
  const melbourneDate = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
  const defaultDate = melbourneDate.toISOString().split('T')[0]

  const config: QueueConfig = {
    dryRun: args.includes('--dry-run'),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '') || null,
    targetDate: args.find(a => a.startsWith('--date='))?.split('=')[1] || defaultDate,
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  TEELIXIR - ANNIVERSARY UPSELL EMAIL QUEUE BUILDER                   ║')
  console.log('║  Queue emails with personalized upsell offers                        ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made')
  }

  const result = await queueAnniversaryEmails(config)

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
  console.log('│ QUEUE RESULTS                                                       │')
  console.log('├─────────────────────────────────────────────────────────────────────┤')
  console.log(`│ Status:        ${result.success ? '✅ SUCCESS' : '❌ FAILED'}                                        │`)
  console.log(`│ Queued:        ${String(result.queued).padEnd(53)}│`)
  console.log(`│ With Upsell:   ${String(result.upsellCount).padEnd(53)}│`)
  console.log(`│ Repeat Only:   ${String(result.repeatOnlyCount).padEnd(53)}│`)
  console.log(`│ Skipped:       ${String(result.skipped).padEnd(53)}│`)
  console.log('└─────────────────────────────────────────────────────────────────────┘')

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:')
    for (const err of result.errors) {
      console.log(`   - ${err}`)
    }
  }

  if (result.success && result.queued > 0) {
    console.log('\n💡 Next: Run send-anniversary-upsell.ts hourly to process the queue')
    console.log('   Or set up n8n/cron to run it automatically each hour')
  }

  process.exit(result.success ? 0 : 1)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
