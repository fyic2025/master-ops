#!/usr/bin/env node

/**
 * BigCommerce to Google Merchant Center Sync Script
 *
 * Replaces paid feed apps with a complete, controlled solution.
 *
 * Usage:
 *   node bc-gmc-sync.js --full           # Run full sync
 *   node bc-gmc-sync.js --incremental    # Run incremental sync (last 24h)
 *   node bc-gmc-sync.js --remediate      # Run issue remediation only
 *   node bc-gmc-sync.js --report         # Generate health report
 *   node bc-gmc-sync.js --status         # Show current sync state
 *   node bc-gmc-sync.js --dry-run        # Preview changes without applying
 */

const path = require('path')

// Register TypeScript if running directly
try {
  require('ts-node/register')
} catch (e) {
  // ts-node not available, assume running compiled JS
}

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const {
  createSyncOrchestrator,
} = require('../shared/libs/integrations/bigcommerce-gmc/sync-orchestrator')

// Configuration
const CONFIG = {
  business: 'boo',
  batchSize: 50,
  incrementalHours: 24,
}

// Parse command line arguments
const args = process.argv.slice(2)
const flags = {
  full: args.includes('--full'),
  incremental: args.includes('--incremental'),
  remediate: args.includes('--remediate'),
  report: args.includes('--report'),
  status: args.includes('--status'),
  dryRun: args.includes('--dry-run'),
  help: args.includes('--help') || args.includes('-h'),
}

// Show help
function showHelp() {
  console.log(`
BigCommerce to Google Merchant Center Sync

USAGE:
  node bc-gmc-sync.js [options]

OPTIONS:
  --full          Run full sync of all products
  --incremental   Sync products modified in last 24 hours
  --remediate     Run issue remediation only (no product sync)
  --report        Generate and display feed health report
  --status        Show current sync state
  --dry-run       Preview changes without applying them
  --help, -h      Show this help message

EXAMPLES:
  # Run full sync with issue fixing
  node bc-gmc-sync.js --full

  # Preview what incremental sync would do
  node bc-gmc-sync.js --incremental --dry-run

  # Fix issues without syncing products
  node bc-gmc-sync.js --remediate

  # Check feed health
  node bc-gmc-sync.js --report
`)
}

// Progress logger
function logProgress(stage, completed, total) {
  const pct = Math.round((completed / total) * 100)
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5))
  process.stdout.write(`\r[${bar}] ${pct}% - ${stage}`)
  if (completed === total) console.log()
}

// Format duration
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Main execution
async function main() {
  if (flags.help || Object.values(flags).every((v) => !v)) {
    showHelp()
    return
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('  BigCommerce → Google Merchant Center Sync')
  console.log('  Business: Buy Organics Online (BOO)')
  console.log('═══════════════════════════════════════════════════════════')
  console.log()

  const orchestrator = createSyncOrchestrator(CONFIG.business)

  try {
    // Status check
    if (flags.status) {
      console.log('📊 Current Sync State')
      console.log('─────────────────────')
      const state = await orchestrator.getSyncState()
      console.log(`Products in BigCommerce:   ${state.productsInBC.toLocaleString()}`)
      console.log(`Products in GMC:           ${state.productsInGMC.toLocaleString()}`)
      console.log(`Products synced:           ${state.productsSynced.toLocaleString()}`)
      console.log(`Products with issues:      ${state.productsWithIssues.toLocaleString()}`)
      console.log(`Products disapproved:      ${state.productsDisapproved.toLocaleString()}`)
      if (state.lastFullSync) {
        console.log(`Last full sync:            ${state.lastFullSync.toLocaleString()}`)
      }
      console.log()
    }

    // Health report
    if (flags.report) {
      console.log('📈 Feed Health Report')
      console.log('─────────────────────')
      const report = await orchestrator.generateHealthReport()

      const approvalRate = ((report.approvedProducts / report.totalProducts) * 100).toFixed(1)

      console.log(`Total products:            ${report.totalProducts.toLocaleString()}`)
      console.log(`Approved:                  ${report.approvedProducts.toLocaleString()} (${approvalRate}%)`)
      console.log(`Disapproved:               ${report.disapprovedProducts.toLocaleString()}`)
      console.log(`Pending:                   ${report.pendingProducts.toLocaleString()}`)
      console.log()

      console.log('Issue Summary:')
      console.log(`  Errors:      ${report.issuesBySeverity.error}`)
      console.log(`  Warnings:    ${report.issuesBySeverity.warning}`)
      console.log(`  Suggestions: ${report.issuesBySeverity.suggestion}`)
      console.log()

      if (report.topIssues.length > 0) {
        console.log('Top Issues:')
        for (const issue of report.topIssues.slice(0, 5)) {
          console.log(`  ${issue.code}: ${issue.count} products`)
        }
        console.log()
      }

      if (report.recommendations.length > 0) {
        console.log('Recommendations:')
        for (const rec of report.recommendations) {
          console.log(`  • ${rec}`)
        }
        console.log()
      }
    }

    // Full sync
    if (flags.full) {
      console.log(flags.dryRun ? '🔍 Full Sync (DRY RUN)' : '🚀 Full Sync')
      console.log('─────────────────────')
      const startTime = Date.now()

      const result = await orchestrator.runFullSync({
        batchSize: CONFIG.batchSize,
        remediateIssues: true,
        dryRun: flags.dryRun,
        onProgress: logProgress,
      })

      console.log()
      console.log('Results:')
      console.log(`  Duration:   ${formatDuration(Date.now() - startTime)}`)
      console.log(`  Inserted:   ${result.stats.inserted}`)
      console.log(`  Updated:    ${result.stats.updated}`)
      console.log(`  Skipped:    ${result.stats.skipped}`)
      console.log(`  Errors:     ${result.stats.errors}`)

      if (result.errors.length > 0) {
        console.log()
        console.log('Errors:')
        for (const error of result.errors.slice(0, 5)) {
          console.log(`  ${error.offerId}: ${error.error}`)
        }
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more`)
        }
      }
      console.log()
    }

    // Incremental sync
    if (flags.incremental) {
      console.log(flags.dryRun ? '🔍 Incremental Sync (DRY RUN)' : '🔄 Incremental Sync')
      console.log('───────────────────────')
      const startTime = Date.now()

      const result = await orchestrator.runIncrementalSync({
        sinceHours: CONFIG.incrementalHours,
        batchSize: CONFIG.batchSize,
        remediateIssues: true,
        dryRun: flags.dryRun,
      })

      console.log('Results:')
      console.log(`  Duration:   ${formatDuration(Date.now() - startTime)}`)
      console.log(`  Inserted:   ${result.stats.inserted}`)
      console.log(`  Updated:    ${result.stats.updated}`)
      console.log(`  Skipped:    ${result.stats.skipped}`)
      console.log(`  Errors:     ${result.stats.errors}`)
      console.log()
    }

    // Remediation only
    if (flags.remediate) {
      console.log(flags.dryRun ? '🔍 Issue Remediation (DRY RUN)' : '🔧 Issue Remediation')
      console.log('──────────────────────')

      const result = await orchestrator.runRemediation({
        autoFixOnly: true,
        dryRun: flags.dryRun,
        onProgress: (completed, total, current) => {
          process.stdout.write(`\rProcessing: ${completed}/${total} - ${current}`)
        },
      })

      console.log()
      console.log('Results:')
      console.log(`  Issues detected:        ${result.detected}`)
      console.log(`  Auto-fixed:             ${result.autoFixed}`)
      console.log(`  Manual required:        ${result.manualRequired}`)
      console.log()
    }

    console.log('✅ Complete!')
  } catch (error) {
    console.error()
    console.error('❌ Error:', error.message)
    if (process.env.DEBUG) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run
main()
