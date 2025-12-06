#!/usr/bin/env npx tsx
/**
 * Daily n8n Issue Resolver
 *
 * Runs at Windows login to detect and resolve n8n workflow issues.
 * Processes issues from most recent to oldest, auto-fixes simple issues,
 * and creates dashboard tasks for complex ones.
 *
 * Usage:
 *   npx tsx scripts/daily-n8n-resolver.ts              # Normal run
 *   npx tsx scripts/daily-n8n-resolver.ts --dry-run    # Preview only
 *   npx tsx scripts/daily-n8n-resolver.ts --help       # Show help
 *
 * Skills Used:
 *   - n8n-workflow-manager: Core detection and resolution
 *   - webhook-event-router: Webhook failure detection
 *   - supabase-expert: Logging and task creation
 *   - dashboard-automation: Job status updates
 *   - integration-tester: Connectivity validation
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', 'MASTER-CREDENTIALS-COMPLETE.env') })

import { IssueDetector } from './n8n-resolver/detector'
import { IssueResolver } from './n8n-resolver/resolver'
import { BriefingReporter } from './n8n-resolver/reporter'
import {
  ResolverConfig,
  DEFAULT_CONFIG,
  ResolutionResult,
  MorningBriefing
} from './n8n-resolver/types'
import {
  log,
  logToSupabase,
  updateJobStatus,
  delay
} from './n8n-resolver/utils'

// ============================================================================
// CLI Arguments
// ============================================================================

function parseArgs(): ResolverConfig {
  const args = process.argv.slice(2)
  const config = { ...DEFAULT_CONFIG }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Daily n8n Issue Resolver

Usage:
  npx tsx scripts/daily-n8n-resolver.ts [options]

Options:
  --dry-run           Preview issues without taking action
  --max-issues=N      Maximum issues to process (default: 50)
  --lookback=N        Hours to look back for issues (default: 24)
  --help, -h          Show this help message

Examples:
  npx tsx scripts/daily-n8n-resolver.ts
  npx tsx scripts/daily-n8n-resolver.ts --dry-run
  npx tsx scripts/daily-n8n-resolver.ts --max-issues=20 --lookback=48
`)
    process.exit(0)
  }

  if (args.includes('--dry-run')) {
    config.dryRun = true
  }

  for (const arg of args) {
    if (arg.startsWith('--max-issues=')) {
      config.maxIssuesPerRun = parseInt(arg.split('=')[1], 10)
    }
    if (arg.startsWith('--lookback=')) {
      config.lookbackHours = parseInt(arg.split('=')[1], 10)
    }
  }

  return config
}

// ============================================================================
// Main Orchestrator
// ============================================================================

async function main(): Promise<void> {
  const startTime = Date.now()
  const config = parseArgs()

  // Banner
  console.log('')
  console.log('========================================================================')
  console.log('                    N8N DAILY ISSUE RESOLVER')
  console.log('========================================================================')
  console.log(`Started: ${new Date().toISOString()}`)
  console.log(`Mode: ${config.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Config: max=${config.maxIssuesPerRun}, lookback=${config.lookbackHours}h`)
  console.log('========================================================================')
  console.log('')

  // Initialize components
  const detector = new IssueDetector(config)
  const resolver = new IssueResolver(config)
  const reporter = new BriefingReporter()

  // Step 1: Health check
  log('Checking n8n connectivity...')
  const n8nHealthy = await detector.healthCheck()

  if (!n8nHealthy) {
    log('n8n is not reachable - skipping API-based detection', 'error')
    await updateJobStatus('n8n-resolver', 'overall', 'failed', 'n8n not reachable')

    await logToSupabase({
      source: 'system',
      service: 'n8n-resolver',
      operation: 'health_check',
      status: 'error',
      message: 'n8n instance not reachable',
      level: 'error'
    })

    // Still try Supabase-based detection
  } else {
    log('n8n is healthy')
  }

  // Step 2: Detect issues
  log('Detecting issues...')
  const detection = await detector.detectAll()

  if (detection.issues.length === 0) {
    log('No issues detected - all systems healthy!')

    const briefing = reporter.generateBriefing([], [], Date.now() - startTime, n8nHealthy)
    reporter.printBriefing(briefing)

    await updateJobStatus('n8n-resolver', 'overall', 'healthy')
    await logRunSummary(briefing)

    return
  }

  log(`Found ${detection.issues.length} issues to process`)

  // Step 3: Resolve issues (most recent first - already sorted)
  const results: ResolutionResult[] = []

  for (let i = 0; i < detection.issues.length; i++) {
    const issue = detection.issues[i]

    log(`[${i + 1}/${detection.issues.length}] Processing: ${issue.type} - ${issue.workflowName || issue.id}`)

    const result = await resolver.resolve(issue)
    results.push(result)

    // Rate limit between resolutions
    if (i < detection.issues.length - 1) {
      await delay(config.apiRequestDelayMs)
    }
  }

  // Step 4: Generate and print briefing
  const briefing = reporter.generateBriefing(
    detection.issues,
    results,
    Date.now() - startTime,
    n8nHealthy
  )

  reporter.printBriefing(briefing)

  // Step 5: Update job status
  const overallStatus = briefing.summary.failed > 0 ? 'failed' :
                        briefing.summary.tasksCreated > 0 ? 'stale' : 'healthy'

  await updateJobStatus('n8n-resolver', 'overall', overallStatus)

  // Step 6: Log run summary
  await logRunSummary(briefing)

  // Write log to file
  await writeLogFile(briefing)
}

// ============================================================================
// Logging
// ============================================================================

async function logRunSummary(briefing: MorningBriefing): Promise<void> {
  await logToSupabase({
    source: 'system',
    service: 'n8n-resolver',
    operation: 'daily_run',
    status: briefing.summary.failed > 0 ? 'warning' : 'success',
    message: `Daily run: ${briefing.summary.issuesDetected} detected, ${briefing.summary.autoResolved} resolved, ${briefing.summary.tasksCreated} tasks`,
    level: 'info',
    duration_ms: briefing.durationMs,
    details_json: {
      summary: briefing.summary,
      health_status: briefing.healthStatus,
      recommendations: briefing.recommendations
    }
  })
}

async function writeLogFile(briefing: MorningBriefing): Promise<void> {
  try {
    const logDir = path.join(__dirname, '..', 'logs', 'n8n-resolver')

    // Create log directory if not exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const date = new Date().toISOString().split('T')[0]
    const logFile = path.join(logDir, `${date}.json`)

    // Append to daily log
    const logEntry = {
      timestamp: briefing.timestamp.toISOString(),
      durationMs: briefing.durationMs,
      summary: briefing.summary,
      healthStatus: briefing.healthStatus,
      autoFixedCount: briefing.autoFixedIssues.length,
      tasksCreatedCount: briefing.pendingTasks.length,
      recommendations: briefing.recommendations
    }

    let logs: any[] = []
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf-8')
      logs = JSON.parse(content)
    }

    logs.push(logEntry)
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2))

    log(`Log written to ${logFile}`)
  } catch (err) {
    log(`Failed to write log file: ${err}`, 'warn')
  }
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch(err => {
  log(`Fatal error: ${err}`, 'error')
  process.exit(1)
})
