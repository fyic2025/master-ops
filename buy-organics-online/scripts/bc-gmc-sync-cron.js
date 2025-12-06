#!/usr/bin/env node

/**
 * BigCommerce to Google Merchant Center Sync Cron Job
 *
 * Scheduled sync that runs:
 * - Full sync: Daily at 4:00 AM AEST (Sunday for comprehensive)
 * - Incremental sync: Every 6 hours
 * - Issue remediation: After each sync
 *
 * Usage:
 *   node bc-gmc-sync-cron.js           # Start the cron scheduler
 *   node bc-gmc-sync-cron.js --now     # Run immediately
 *   node bc-gmc-sync-cron.js --summary # Show sync summary
 */

const path = require('path')
const cron = require('node-cron')

// Register TypeScript if running directly
try {
  require('ts-node/register')
} catch (e) {
  // ts-node not available
}

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../.env') })

// Configuration
const CONFIG = {
  business: 'boo',
  timezone: 'Australia/Sydney',
  fullSyncSchedule: '0 18 * * *',      // 18:00 UTC = 4:00 AM AEST next day
  incrementalSchedule: '0 */6 * * *',   // Every 6 hours
  fullSyncDay: 0,                       // Sunday (0) for comprehensive full sync
}

// Track state
let isRunning = false
let lastRun = null
let lastResult = null

// Import orchestrator lazily
let orchestrator = null
function getOrchestrator() {
  if (!orchestrator) {
    const { createSyncOrchestrator } = require('../shared/libs/integrations/bigcommerce-gmc/sync-orchestrator')
    orchestrator = createSyncOrchestrator(CONFIG.business)
  }
  return orchestrator
}

// Update dashboard job status
async function updateJobStatus(status, details = {}) {
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = process.env.BOO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)

    await supabase.from('dashboard_jobs').upsert({
      job_name: 'bc-gmc-sync',
      business: CONFIG.business,
      status,
      last_run_at: new Date().toISOString(),
      ...details,
    }, { onConflict: 'job_name,business' })
  } catch (error) {
    console.warn('Failed to update job status:', error.message)
  }
}

// Run full sync
async function runFullSync() {
  if (isRunning) {
    console.log('[SKIP] Sync already running')
    return
  }

  isRunning = true
  const startTime = new Date()
  console.log(`[${startTime.toISOString()}] Starting full sync...`)

  try {
    await updateJobStatus('running')

    const orch = getOrchestrator()
    const result = await orch.runFullSync({
      batchSize: 50,
      remediateIssues: true,
      onProgress: (stage, completed, total) => {
        console.log(`  ${stage}: ${completed}/${total}`)
      },
    })

    lastRun = new Date()
    lastResult = result

    const duration = (lastRun - startTime) / 1000
    console.log(`[${lastRun.toISOString()}] Full sync complete in ${duration.toFixed(1)}s`)
    console.log(`  Inserted: ${result.stats.inserted}, Updated: ${result.stats.updated}, Errors: ${result.stats.errors}`)

    await updateJobStatus('success', {
      last_success_at: lastRun.toISOString(),
      last_duration_ms: lastRun - startTime,
      last_result: {
        type: 'full',
        stats: result.stats,
      },
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Full sync failed:`, error.message)

    await updateJobStatus('error', {
      last_error: error.message,
    })
  } finally {
    isRunning = false
  }
}

// Run incremental sync
async function runIncrementalSync() {
  if (isRunning) {
    console.log('[SKIP] Sync already running')
    return
  }

  isRunning = true
  const startTime = new Date()
  console.log(`[${startTime.toISOString()}] Starting incremental sync...`)

  try {
    await updateJobStatus('running')

    const orch = getOrchestrator()
    const result = await orch.runIncrementalSync({
      sinceHours: 6,
      batchSize: 50,
      remediateIssues: true,
    })

    lastRun = new Date()
    lastResult = result

    const duration = (lastRun - startTime) / 1000
    console.log(`[${lastRun.toISOString()}] Incremental sync complete in ${duration.toFixed(1)}s`)
    console.log(`  Inserted: ${result.stats.inserted}, Updated: ${result.stats.updated}, Errors: ${result.stats.errors}`)

    await updateJobStatus('success', {
      last_success_at: lastRun.toISOString(),
      last_duration_ms: lastRun - startTime,
      last_result: {
        type: 'incremental',
        stats: result.stats,
      },
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Incremental sync failed:`, error.message)

    await updateJobStatus('error', {
      last_error: error.message,
    })
  } finally {
    isRunning = false
  }
}

// Show summary
async function showSummary() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  BC-GMC Sync Summary - Buy Organics Online')
  console.log('═══════════════════════════════════════════════════════════')
  console.log()

  try {
    const orch = getOrchestrator()
    const state = await orch.getSyncState()
    const report = await orch.generateHealthReport()

    console.log('Current State:')
    console.log(`  Products in BC:      ${state.productsInBC.toLocaleString()}`)
    console.log(`  Products in GMC:     ${state.productsInGMC.toLocaleString()}`)
    console.log(`  Products synced:     ${state.productsSynced.toLocaleString()}`)
    console.log(`  With issues:         ${state.productsWithIssues.toLocaleString()}`)
    console.log(`  Disapproved:         ${state.productsDisapproved.toLocaleString()}`)
    console.log()

    const approvalRate = ((report.approvedProducts / report.totalProducts) * 100).toFixed(1)
    console.log('Feed Health:')
    console.log(`  Approval rate:       ${approvalRate}%`)
    console.log(`  Error issues:        ${report.issuesBySeverity.error}`)
    console.log(`  Warning issues:      ${report.issuesBySeverity.warning}`)
    console.log()

    if (lastRun) {
      console.log('Last Sync:')
      console.log(`  Time:                ${lastRun.toLocaleString()}`)
      if (lastResult) {
        console.log(`  Type:                ${lastResult.stats?.inserted > 10 ? 'Full' : 'Incremental'}`)
        console.log(`  Updated:             ${lastResult.stats?.updated || 0}`)
        console.log(`  Errors:              ${lastResult.stats?.errors || 0}`)
      }
      console.log()
    }

    console.log('Schedule:')
    console.log(`  Full sync:           Daily at 4:00 AM AEST`)
    console.log(`  Incremental:         Every 6 hours`)
    console.log()
  } catch (error) {
    console.error('Error fetching summary:', error.message)
  }
}

// Parse args
const args = process.argv.slice(2)

if (args.includes('--summary')) {
  showSummary()
} else if (args.includes('--now')) {
  // Determine if it's time for full or incremental
  const now = new Date()
  const isFullSyncTime = now.getDay() === CONFIG.fullSyncDay

  if (args.includes('--full') || isFullSyncTime) {
    runFullSync()
  } else {
    runIncrementalSync()
  }
} else {
  // Start cron scheduler
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  BC-GMC Sync Scheduler Started')
  console.log('  Business: Buy Organics Online (BOO)')
  console.log('═══════════════════════════════════════════════════════════')
  console.log()
  console.log('Schedules:')
  console.log(`  Full sync:        ${CONFIG.fullSyncSchedule} (4:00 AM AEST)`)
  console.log(`  Incremental:      ${CONFIG.incrementalSchedule} (every 6 hours)`)
  console.log()
  console.log('Waiting for scheduled runs... (Ctrl+C to stop)')
  console.log()

  // Schedule full sync (daily at 4 AM AEST)
  cron.schedule(CONFIG.fullSyncSchedule, () => {
    const now = new Date()
    // Full sync every day, comprehensive on Sundays
    if (now.getDay() === CONFIG.fullSyncDay) {
      console.log('[CRON] Running comprehensive full sync (Sunday)')
    } else {
      console.log('[CRON] Running daily full sync')
    }
    runFullSync()
  }, { timezone: 'UTC' })

  // Schedule incremental sync (every 6 hours)
  cron.schedule(CONFIG.incrementalSchedule, () => {
    // Skip if within 2 hours of full sync time (to avoid overlap)
    const hour = new Date().getUTCHours()
    if (hour >= 16 && hour <= 20) {
      console.log('[CRON] Skipping incremental (near full sync time)')
      return
    }
    console.log('[CRON] Running incremental sync')
    runIncrementalSync()
  }, { timezone: 'UTC' })

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down scheduler...')
    process.exit(0)
  })
}
