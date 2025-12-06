#!/usr/bin/env npx tsx
/**
 * Elevate Wholesale Prospecting CLI
 *
 * Management commands for the outbound prospecting system.
 *
 * Usage:
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts status
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts pause "Holiday break"
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts resume
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts set-limit 10
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts set-category beauty
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts preview
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts skip <hubspot_id> "Invalid email"
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts reprocess <queue_id>
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts funnel
 *   npx tsx elevate-wholesale/scripts/prospecting/cli.ts pending-emails
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function printTable(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || '').length))
  )

  // Print header
  console.log(headers.map((h, i) => h.padEnd(widths[i])).join('  '))
  console.log(widths.map((w) => '-'.repeat(w)).join('  '))

  // Print rows
  rows.forEach((row) => {
    console.log(row.map((cell, i) => (cell || '').padEnd(widths[i])).join('  '))
  })
}

// =============================================================================
// Commands
// =============================================================================

async function showStatus(): Promise<void> {
  console.log('═'.repeat(60))
  console.log('📊 Elevate Wholesale Prospecting Status')
  console.log('═'.repeat(60))

  // Get config
  const { data: configs } = await supabase
    .from('system_config')
    .select('key, value')
    .like('key', 'prospecting_%')

  const config: Record<string, string> = {}
  configs?.forEach((c) => (config[c.key] = c.value))

  console.log('\n⚙️  Configuration:')
  console.log(`  Enabled: ${config['prospecting_enabled'] === 'true' ? '✅ Yes' : '❌ No'}`)
  console.log(`  Daily limit: ${config['prospecting_daily_limit'] || '5'}`)
  console.log(`  Lead category: ${config['prospecting_lead_category'] || 'all'}`)
  console.log(`  Expiry days: ${config['prospecting_expiry_days'] || '30'}`)

  // Get queue stats
  const { data: queueStats } = await supabase
    .from('prospecting_queue')
    .select('queue_status')

  const stats: Record<string, number> = {}
  queueStats?.forEach((q) => {
    stats[q.queue_status] = (stats[q.queue_status] || 0) + 1
  })

  console.log('\n📋 Queue Statistics:')
  console.log(`  Pending: ${stats['pending'] || 0}`)
  console.log(`  Processing: ${stats['processing'] || 0}`)
  console.log(`  Sent (awaiting login): ${stats['sent'] || 0}`)
  console.log(`  Active (logged in): ${stats['active'] || 0}`)
  console.log(`  Expired: ${stats['expired'] || 0}`)
  console.log(`  Failed: ${stats['failed'] || 0}`)
  console.log(`  Skipped: ${stats['skipped'] || 0}`)

  // Get today's run
  const today = new Date().toISOString().split('T')[0]
  const { data: todayRun } = await supabase
    .from('prospecting_run_log')
    .select('*')
    .eq('run_date', today)
    .single()

  console.log('\n📅 Today\'s Run:')
  if (todayRun) {
    console.log(`  Status: ${todayRun.status}`)
    console.log(`  Processed: ${todayRun.contacts_processed}`)
    console.log(`  Accounts created: ${todayRun.accounts_created}`)
    console.log(`  Emails queued: ${todayRun.emails_queued}`)
    console.log(`  Errors: ${todayRun.errors_count}`)
  } else {
    console.log('  Not run yet')
  }

  // Get pending emails
  const { data: pendingEmails, count } = await supabase
    .from('prospecting_emails')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())

  console.log('\n📧 Pending Emails:')
  console.log(`  Ready to send: ${count || 0}`)
}

async function pauseProspecting(reason: string): Promise<void> {
  const { error } = await supabase
    .from('system_config')
    .upsert({
      key: 'prospecting_enabled',
      value: 'false',
      description: `Paused: ${reason} (${new Date().toISOString()})`,
    })

  if (error) {
    console.error('❌ Failed to pause:', error.message)
    process.exit(1)
  }

  console.log(`✅ Prospecting paused: ${reason}`)
}

async function resumeProspecting(): Promise<void> {
  const { error } = await supabase
    .from('system_config')
    .upsert({
      key: 'prospecting_enabled',
      value: 'true',
      description: `Prospecting master switch`,
    })

  if (error) {
    console.error('❌ Failed to resume:', error.message)
    process.exit(1)
  }

  console.log('✅ Prospecting resumed')
}

async function setLimit(limit: number): Promise<void> {
  if (isNaN(limit) || limit < 1 || limit > 100) {
    console.error('❌ Invalid limit. Must be between 1 and 100.')
    process.exit(1)
  }

  const { error } = await supabase
    .from('system_config')
    .upsert({
      key: 'prospecting_daily_limit',
      value: String(limit),
      description: 'Number of contacts to process per day',
    })

  if (error) {
    console.error('❌ Failed to set limit:', error.message)
    process.exit(1)
  }

  console.log(`✅ Daily limit set to ${limit}`)
}

async function setCategory(category: string): Promise<void> {
  const validCategories = ['beauty', 'fitness', 'all', 'null']
  if (!validCategories.includes(category.toLowerCase())) {
    console.error('❌ Invalid category. Use: beauty, fitness, or all')
    process.exit(1)
  }

  const value = category.toLowerCase() === 'all' ? 'null' : category.toLowerCase()

  const { error } = await supabase
    .from('system_config')
    .upsert({
      key: 'prospecting_lead_category',
      value,
      description: 'Filter: beauty, fitness, or null for all',
    })

  if (error) {
    console.error('❌ Failed to set category:', error.message)
    process.exit(1)
  }

  console.log(`✅ Lead category filter set to: ${category}`)
}

async function previewBatch(): Promise<void> {
  console.log('═'.repeat(60))
  console.log('👀 Preview: Next Batch of Contacts')
  console.log('═'.repeat(60))

  // Get config
  const { data: limitConfig } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'prospecting_daily_limit')
    .single()

  const { data: categoryConfig } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'prospecting_lead_category')
    .single()

  const limit = parseInt(limitConfig?.value || '5', 10)
  const category = categoryConfig?.value !== 'null' ? categoryConfig?.value : null

  console.log(`\nConfig: limit=${limit}, category=${category || 'all'}`)

  // Query HubSpot for eligible contacts
  console.log('\nSearching HubSpot for eligible contacts...')

  const filterGroups: any[] = [
    {
      filters: [
        {
          propertyName: 'email',
          operator: 'HAS_PROPERTY',
        },
        {
          propertyName: 'outreach_status',
          operator: 'NOT_HAS_PROPERTY',
        },
      ],
    },
  ]

  if (category) {
    filterGroups[0].filters.push({
      propertyName: 'lead_category',
      operator: 'EQ',
      value: category,
    })
  }

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filterGroups,
      properties: ['email', 'company', 'lead_category', 'createdate'],
      limit,
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ HubSpot search failed:', error)
    process.exit(1)
  }

  const data = await response.json() as any
  const contacts = data.results || []

  if (contacts.length === 0) {
    console.log('\n📭 No eligible contacts found')
    return
  }

  console.log(`\n📋 Found ${contacts.length} contacts:\n`)

  const headers = ['#', 'HubSpot ID', 'Email', 'Company', 'Category', 'Created']
  const rows = contacts.map((c: any, i: number) => [
    String(i + 1),
    c.id,
    c.properties.email || '-',
    c.properties.company || '-',
    c.properties.lead_category || '-',
    formatDate(c.properties.createdate),
  ])

  printTable(headers, rows)
}

async function skipContact(hubspotId: string, reason: string): Promise<void> {
  // First check if already in queue
  const { data: existing } = await supabase
    .from('prospecting_queue')
    .select('id, queue_status')
    .eq('hubspot_contact_id', hubspotId)
    .single()

  if (existing) {
    // Update existing entry
    const { error } = await supabase
      .from('prospecting_queue')
      .update({
        queue_status: 'skipped',
        skipped_reason: reason,
        skipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('❌ Failed to skip:', error.message)
      process.exit(1)
    }

    console.log(`✅ Contact ${hubspotId} marked as skipped (was: ${existing.queue_status})`)
  } else {
    // Create new skipped entry
    // First get contact from HubSpot
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}?properties=email,company`,
      {
        headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
      }
    )

    if (!response.ok) {
      console.error('❌ Contact not found in HubSpot')
      process.exit(1)
    }

    const contact = await response.json() as any

    const { error } = await supabase.from('prospecting_queue').insert({
      hubspot_contact_id: hubspotId,
      email: contact.properties.email,
      company_name: contact.properties.company || 'Unknown',
      queue_status: 'skipped',
      skipped_reason: reason,
      skipped_at: new Date().toISOString(),
    })

    if (error) {
      console.error('❌ Failed to skip:', error.message)
      process.exit(1)
    }

    console.log(`✅ Contact ${hubspotId} added to queue as skipped`)
  }

  // Update HubSpot
  await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { outreach_status: 'skipped' },
    }),
  })

  console.log('✅ HubSpot contact updated')
}

async function reprocessContact(queueId: string): Promise<void> {
  const { data: entry, error: fetchError } = await supabase
    .from('prospecting_queue')
    .select('*')
    .eq('id', queueId)
    .single()

  if (fetchError || !entry) {
    console.error('❌ Queue entry not found')
    process.exit(1)
  }

  if (!['failed', 'skipped', 'expired'].includes(entry.queue_status)) {
    console.error(`❌ Cannot reprocess entry with status: ${entry.queue_status}`)
    process.exit(1)
  }

  const { error } = await supabase
    .from('prospecting_queue')
    .update({
      queue_status: 'pending',
      last_error: null,
      retry_count: 0,
      skipped_reason: null,
      skipped_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  if (error) {
    console.error('❌ Failed to reprocess:', error.message)
    process.exit(1)
  }

  // Update HubSpot
  await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${entry.hubspot_contact_id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { outreach_status: 'pending' },
    }),
  })

  console.log(`✅ Contact ${entry.email} reset to pending`)
}

async function showFunnel(): Promise<void> {
  console.log('═'.repeat(60))
  console.log('📈 Prospecting Funnel')
  console.log('═'.repeat(60))

  // Use the view if available, otherwise calculate
  const { data } = await supabase
    .from('prospecting_queue')
    .select('lead_category, queue_status')

  if (!data || data.length === 0) {
    console.log('\n📭 No data in funnel yet')
    return
  }

  // Calculate funnel by category
  const funnel: Record<string, Record<string, number>> = {
    all: { total: 0, pending: 0, sent: 0, active: 0, expired: 0 },
    beauty: { total: 0, pending: 0, sent: 0, active: 0, expired: 0 },
    fitness: { total: 0, pending: 0, sent: 0, active: 0, expired: 0 },
  }

  data.forEach((row) => {
    const cat = row.lead_category || 'other'
    const status = row.queue_status

    funnel.all.total++
    funnel.all[status] = (funnel.all[status] || 0) + 1

    if (cat === 'beauty' || cat === 'fitness') {
      funnel[cat].total++
      funnel[cat][status] = (funnel[cat][status] || 0) + 1
    }
  })

  console.log('\n')
  const headers = ['Category', 'Total', 'Pending', 'Sent', 'Active', 'Expired', 'Login Rate']
  const rows = Object.entries(funnel).map(([cat, stats]) => {
    const loginBase = stats.sent + stats.active + stats.expired
    const loginRate = loginBase > 0 ? ((stats.active / loginBase) * 100).toFixed(1) : '0.0'
    return [
      cat.toUpperCase(),
      String(stats.total),
      String(stats.pending || 0),
      String(stats.sent || 0),
      String(stats.active || 0),
      String(stats.expired || 0),
      `${loginRate}%`,
    ]
  })

  printTable(headers, rows)
}

async function showPendingEmails(): Promise<void> {
  console.log('═'.repeat(60))
  console.log('📧 Pending Emails')
  console.log('═'.repeat(60))

  const { data } = await supabase
    .from('prospecting_emails')
    .select(`
      id,
      email_type,
      recipient_email,
      subject,
      scheduled_for,
      status,
      retry_count,
      queue_id,
      prospecting_queue!inner(company_name, lead_category)
    `)
    .in('status', ['pending', 'failed'])
    .order('scheduled_for', { ascending: true })
    .limit(20)

  if (!data || data.length === 0) {
    console.log('\n📭 No pending emails')
    return
  }

  console.log(`\n📋 Found ${data.length} pending emails:\n`)

  const headers = ['Type', 'Recipient', 'Company', 'Scheduled', 'Status', 'Retries']
  const rows = data.map((e: any) => [
    e.email_type,
    e.recipient_email,
    e.prospecting_queue?.company_name || '-',
    formatDate(e.scheduled_for),
    e.status,
    String(e.retry_count),
  ])

  printTable(headers, rows)
}

async function showHelp(): Promise<void> {
  console.log(`
Elevate Wholesale Prospecting CLI

Usage: npx tsx elevate-wholesale/scripts/prospecting/cli.ts <command> [args]

Commands:
  status              Show current prospecting status and statistics
  pause <reason>      Pause prospecting (requires reason)
  resume              Resume prospecting
  set-limit <n>       Set daily contact limit (1-100)
  set-category <cat>  Set lead category filter (beauty, fitness, or all)
  preview             Preview next batch of contacts from HubSpot
  skip <id> <reason>  Skip a HubSpot contact (requires reason)
  reprocess <id>      Reprocess a failed/skipped queue entry
  funnel              Show conversion funnel by category
  pending-emails      Show pending emails in queue
  help                Show this help message

Examples:
  cli.ts status
  cli.ts pause "Christmas holidays"
  cli.ts resume
  cli.ts set-limit 10
  cli.ts set-category beauty
  cli.ts preview
  cli.ts skip 123456789 "Invalid email address"
  cli.ts reprocess abc-123-def-456
`)
}

// =============================================================================
// CLI Entry Point
// =============================================================================

const [command, ...args] = process.argv.slice(2)

async function main(): Promise<void> {
  switch (command) {
    case 'status':
      await showStatus()
      break

    case 'pause':
      if (!args[0]) {
        console.error('❌ Please provide a reason for pausing')
        process.exit(1)
      }
      await pauseProspecting(args.join(' '))
      break

    case 'resume':
      await resumeProspecting()
      break

    case 'set-limit':
      await setLimit(parseInt(args[0], 10))
      break

    case 'set-category':
      if (!args[0]) {
        console.error('❌ Please provide a category (beauty, fitness, or all)')
        process.exit(1)
      }
      await setCategory(args[0])
      break

    case 'preview':
      await previewBatch()
      break

    case 'skip':
      if (!args[0] || !args[1]) {
        console.error('❌ Usage: skip <hubspot_id> <reason>')
        process.exit(1)
      }
      await skipContact(args[0], args.slice(1).join(' '))
      break

    case 'reprocess':
      if (!args[0]) {
        console.error('❌ Usage: reprocess <queue_id>')
        process.exit(1)
      }
      await reprocessContact(args[0])
      break

    case 'funnel':
      await showFunnel()
      break

    case 'pending-emails':
      await showPendingEmails()
      break

    case 'help':
    case '--help':
    case '-h':
      await showHelp()
      break

    default:
      if (command) {
        console.error(`❌ Unknown command: ${command}`)
      }
      await showHelp()
      process.exit(command ? 1 : 0)
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
