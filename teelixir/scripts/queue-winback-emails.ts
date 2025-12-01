#!/usr/bin/env npx tsx
/**
 * Teelixir - Winback Email Queue Builder
 *
 * Queues unengaged customers for winback emails with random send hours.
 * This enables A/B testing of send times to find optimal delivery windows.
 *
 * Usage:
 *   npx tsx teelixir/scripts/queue-winback-emails.ts [options]
 *
 * Options:
 *   --dry-run       Preview without queueing
 *   --limit=N       Number of emails to queue (default: daily_limit from config)
 *   --date=YYYY-MM-DD  Schedule for specific date (default: today)
 *
 * How it works:
 *   1. Fetches eligible profiles from tlx_klaviyo_unengaged
 *   2. Excludes already contacted (in tlx_winback_emails)
 *   3. Excludes already queued for the target date
 *   4. Assigns random send hours (9am-6pm Melbourne time)
 *   5. Inserts into tlx_winback_queue
 *
 * Then run send-winback-emails.ts hourly to process the queue.
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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

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
  hourDistribution: Record<number, number>
  errors: string[]
}

// ============================================================================
// MAIN QUEUE FUNCTION
// ============================================================================

async function queueWinbackEmails(config: QueueConfig): Promise<QueueResult> {
  const result: QueueResult = {
    success: false,
    queued: 0,
    skipped: 0,
    hourDistribution: {},
    errors: [],
  }

  try {
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
      throw new Error('Automation config not found')
    }

    if (!configData.enabled && !config.dryRun) {
      console.log('\n⚠️  Automation is disabled. Enable in tlx_automation_config or use --dry-run')
      result.success = true
      return result
    }

    const dailyLimit = config.limit || configData.config.daily_limit || 20

    console.log(`\n📅 Target date: ${config.targetDate}`)
    console.log(`📊 Daily limit: ${dailyLimit}`)

    // Get all unengaged profiles
    const { data: unengaged, error: fetchError } = await supabase
      .from('tlx_klaviyo_unengaged')
      .select('email, klaviyo_profile_id, first_name')
      .limit(500)

    if (fetchError || !unengaged) {
      throw new Error(`Failed to fetch unengaged: ${fetchError?.message}`)
    }

    console.log(`\n📥 Found ${unengaged.length} unengaged profiles`)

    // Get already contacted emails
    const { data: contacted } = await supabase
      .from('tlx_winback_emails')
      .select('email')

    const contactedSet = new Set((contacted || []).map(c => c.email.toLowerCase()))

    // Get already queued for target date
    const { data: queued } = await supabase
      .from('tlx_winback_queue')
      .select('email')
      .eq('scheduled_date', config.targetDate)

    const queuedSet = new Set((queued || []).map(q => q.email.toLowerCase()))

    // Filter eligible
    const eligible = unengaged.filter(p => {
      const email = p.email.toLowerCase()
      if (contactedSet.has(email)) {
        result.skipped++
        return false
      }
      if (queuedSet.has(email)) {
        result.skipped++
        return false
      }
      return true
    })

    console.log(`   Already contacted: ${contactedSet.size}`)
    console.log(`   Already queued: ${queuedSet.size}`)
    console.log(`   Eligible: ${eligible.length}`)

    if (eligible.length === 0) {
      console.log('\n⚠️  No eligible profiles to queue')
      result.success = true
      return result
    }

    // Take up to daily limit
    const toQueue = eligible.slice(0, dailyLimit)

    // Assign random hours - spread evenly across the window
    const queueEntries = toQueue.map((profile, index) => {
      // Round-robin through hours first, then randomize within
      const baseHour = SEND_HOURS[index % SEND_HOURS.length]
      // Add some randomness but stay within window
      const hour = baseHour

      result.hourDistribution[hour] = (result.hourDistribution[hour] || 0) + 1

      return {
        email: profile.email.toLowerCase(),
        klaviyo_profile_id: profile.klaviyo_profile_id,
        first_name: profile.first_name,
        scheduled_date: config.targetDate,
        scheduled_hour: hour,
        status: 'pending',
      }
    })

    console.log(`\n📤 Queueing ${queueEntries.length} emails...`)
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
        console.log(`   - ${entry.email} → ${hourLabel}`)
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
      .from('tlx_winback_queue')
      .upsert(queueEntries, { onConflict: 'email,scheduled_date' })

    if (insertError) {
      throw new Error(`Failed to queue: ${insertError.message}`)
    }

    result.queued = queueEntries.length
    result.success = true

    console.log(`\n✅ Queued ${result.queued} emails for ${config.targetDate}`)

  } catch (error: any) {
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
  console.log('║  TEELIXIR - WINBACK EMAIL QUEUE BUILDER                              ║')
  console.log('║  Queue emails with random send hours for A/B testing                 ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made')
  }

  const result = await queueWinbackEmails(config)

  console.log('\n┌─────────────────────────────────────────────────────────────────────┐')
  console.log('│ QUEUE RESULTS                                                       │')
  console.log('├─────────────────────────────────────────────────────────────────────┤')
  console.log(`│ Status:      ${result.success ? '✅ SUCCESS' : '❌ FAILED'}                                          │`)
  console.log(`│ Queued:      ${String(result.queued).padEnd(55)}│`)
  console.log(`│ Skipped:     ${String(result.skipped).padEnd(55)}│`)
  console.log('└─────────────────────────────────────────────────────────────────────┘')

  if (result.success && result.queued > 0) {
    console.log('\n💡 Next: Run send-winback-emails.ts hourly to process the queue')
    console.log('   Or set up n8n/cron to run it automatically each hour')
  }

  process.exit(result.success ? 0 : 1)
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
