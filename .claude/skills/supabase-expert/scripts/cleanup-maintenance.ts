#!/usr/bin/env npx tsx

/**
 * Supabase Cleanup & Maintenance Script
 *
 * Automated maintenance tasks for the shared Supabase database:
 * - Clean up old logs based on retention policies
 * - Identify orphaned records
 * - Vacuum and analyze tables
 * - Report on stale tasks
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts [--dry-run]
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const config = {
  url: process.env.SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
}

if (!config.url || !config.serviceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(config.url, config.serviceKey)
const isDryRun = process.argv.includes('--dry-run')

interface CleanupResult {
  timestamp: string
  dry_run: boolean
  logs_cleaned: {
    integration_logs: number
    workflow_logs: number
    api_metrics: number
  }
  orphaned_records: {
    task_logs_without_tasks: number
    workflow_logs_stale: number
  }
  stale_tasks: Array<{
    id: string
    title: string
    status: string
    age_days: number
  }>
  maintenance_performed: string[]
}

async function runCleanup(): Promise<CleanupResult> {
  const result: CleanupResult = {
    timestamp: new Date().toISOString(),
    dry_run: isDryRun,
    logs_cleaned: {
      integration_logs: 0,
      workflow_logs: 0,
      api_metrics: 0,
    },
    orphaned_records: {
      task_logs_without_tasks: 0,
      workflow_logs_stale: 0,
    },
    stale_tasks: [],
    maintenance_performed: [],
  }

  console.log('🧹 Supabase Cleanup & Maintenance')
  console.log('='.repeat(60))
  console.log(`Timestamp: ${result.timestamp}`)
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '⚡ LIVE (making changes)'}`)
  console.log()

  // 1. Cleanup Old Logs
  console.log('1️⃣  Cleaning up old logs...')
  try {
    if (isDryRun) {
      // Count what would be deleted
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

      const { count: intCount } = await supabase
        .from('integration_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thirtyDaysAgo)

      const { count: wfCount } = await supabase
        .from('workflow_execution_logs')
        .select('*', { count: 'exact', head: true })
        .lt('started_at', ninetyDaysAgo)

      const { count: apiCount } = await supabase
        .from('api_metrics')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', thirtyDaysAgo)

      result.logs_cleaned.integration_logs = intCount || 0
      result.logs_cleaned.workflow_logs = wfCount || 0
      result.logs_cleaned.api_metrics = apiCount || 0

      console.log(`   📊 Would delete:`)
      console.log(`      - integration_logs: ${result.logs_cleaned.integration_logs} records (>30 days)`)
      console.log(`      - workflow_execution_logs: ${result.logs_cleaned.workflow_logs} records (>90 days)`)
      console.log(`      - api_metrics: ${result.logs_cleaned.api_metrics} records (>30 days)`)
    } else {
      // Actually execute cleanup function
      const { data, error } = await supabase.rpc('cleanup_old_logs', {
        integration_logs_days: 30,
        workflow_logs_days: 90,
        api_metrics_days: 30,
      })

      if (error) throw error

      if (data) {
        result.logs_cleaned.integration_logs = data.int_deleted || 0
        result.logs_cleaned.workflow_logs = data.wf_deleted || 0
        result.logs_cleaned.api_metrics = data.api_deleted || 0
      }

      console.log(`   ✅ Deleted:`)
      console.log(`      - integration_logs: ${result.logs_cleaned.integration_logs} records`)
      console.log(`      - workflow_execution_logs: ${result.logs_cleaned.workflow_logs} records`)
      console.log(`      - api_metrics: ${result.logs_cleaned.api_metrics} records`)

      result.maintenance_performed.push('Executed cleanup_old_logs function')
    }
  } catch (error) {
    console.error('   ❌ Failed to cleanup logs:', error instanceof Error ? error.message : String(error))
  }

  // 2. Find Orphaned Task Logs
  console.log('\n2️⃣  Checking for orphaned task logs...')
  try {
    // Find task_logs where task_id doesn't exist in tasks table
    const { data: allTaskLogs, error: logsError } = await supabase
      .from('task_logs')
      .select('task_id')

    if (logsError) throw logsError

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')

    if (tasksError) throw tasksError

    const taskIds = new Set(allTasks?.map(t => t.id) || [])
    const orphanedLogs = allTaskLogs?.filter(log => !taskIds.has(log.task_id)) || []

    result.orphaned_records.task_logs_without_tasks = orphanedLogs.length

    if (orphanedLogs.length > 0) {
      console.log(`   ⚠️  Found ${orphanedLogs.length} orphaned task logs`)
      console.log(`   💡 Recommendation: These logs reference deleted tasks`)

      if (!isDryRun) {
        // Note: We don't auto-delete these as they may be historical records
        console.log(`   📝 Manual cleanup recommended if not needed for audit trail`)
      }
    } else {
      console.log(`   ✅ No orphaned task logs found`)
    }
  } catch (error) {
    console.error('   ⚠️  Could not check orphaned task logs:', error instanceof Error ? error.message : String(error))
  }

  // 3. Identify Stale Workflow Logs
  console.log('\n3️⃣  Checking for stale workflow executions...')
  try {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

    const { count, error } = await supabase
      .from('workflow_execution_logs')
      .select('*', { count: 'exact', head: true })
      .lt('started_at', sixMonthsAgo)

    if (error) throw error

    result.orphaned_records.workflow_logs_stale = count || 0

    if (count && count > 0) {
      console.log(`   📊 Found ${count} workflow logs older than 6 months`)
      console.log(`   💡 Recommendation: Consider archiving or deleting if not needed`)
    } else {
      console.log(`   ✅ No stale workflow logs (>6 months)`)
    }
  } catch (error) {
    console.error('   ⚠️  Could not check stale workflows:', error instanceof Error ? error.message : String(error))
  }

  // 4. Find Stale Tasks
  console.log('\n4️⃣  Checking for stale tasks...')
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: staleTasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .in('status', ['pending', 'in_progress'])
      .lt('created_at', sevenDaysAgo)

    if (error) throw error

    if (staleTasks && staleTasks.length > 0) {
      result.stale_tasks = staleTasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        age_days: Math.floor(
          (Date.now() - new Date(task.created_at).getTime()) / (24 * 60 * 60 * 1000)
        ),
      }))

      console.log(`   ⚠️  Found ${staleTasks.length} stale tasks (pending/in_progress >7 days):`)
      result.stale_tasks.forEach(task => {
        console.log(`      - ${task.title} (${task.status}, ${task.age_days} days old)`)
      })
      console.log(`   💡 Recommendation: Review and cancel or complete these tasks`)
    } else {
      console.log(`   ✅ No stale tasks found`)
    }
  } catch (error) {
    console.error('   ⚠️  Could not check stale tasks:', error instanceof Error ? error.message : String(error))
  }

  // 5. Database Maintenance (VACUUM ANALYZE)
  console.log('\n5️⃣  Database maintenance (VACUUM ANALYZE)...')

  if (isDryRun) {
    console.log(`   🔍 Would run VACUUM ANALYZE on:`)
    console.log(`      - integration_logs`)
    console.log(`      - workflow_execution_logs`)
    console.log(`      - api_metrics`)
    console.log(`      - tasks`)
    console.log(`      - task_logs`)
  } else {
    console.log(`   ℹ️  VACUUM ANALYZE requires elevated permissions`)
    console.log(`   📝 Run manually in Supabase SQL editor:`)
    console.log(`      VACUUM ANALYZE integration_logs;`)
    console.log(`      VACUUM ANALYZE workflow_execution_logs;`)
    console.log(`      VACUUM ANALYZE api_metrics;`)
    console.log(`      VACUUM ANALYZE tasks;`)
    console.log(`      VACUUM ANALYZE task_logs;`)

    result.maintenance_performed.push('VACUUM ANALYZE commands provided (manual execution required)')
  }

  return result
}

async function main() {
  try {
    const result = await runCleanup()

    console.log('\n' + '='.repeat(60))
    console.log('📊 CLEANUP SUMMARY')
    console.log('='.repeat(60))

    console.log(`\n🧹 Logs Cleaned:`)
    console.log(`   - Integration logs: ${result.logs_cleaned.integration_logs}`)
    console.log(`   - Workflow logs: ${result.logs_cleaned.workflow_logs}`)
    console.log(`   - API metrics: ${result.logs_cleaned.api_metrics}`)

    console.log(`\n🔍 Orphaned Records:`)
    console.log(`   - Task logs without tasks: ${result.orphaned_records.task_logs_without_tasks}`)
    console.log(`   - Stale workflow logs (>6mo): ${result.orphaned_records.workflow_logs_stale}`)

    console.log(`\n⏱️  Stale Tasks: ${result.stale_tasks.length}`)

    if (result.maintenance_performed.length > 0) {
      console.log(`\n✅ Maintenance Performed:`)
      result.maintenance_performed.forEach(action => {
        console.log(`   - ${action}`)
      })
    }

    // Write results to file
    const fs = await import('fs/promises')
    const resultsPath = 'logs/supabase-cleanup.json'
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full results saved to: ${resultsPath}`)

    if (isDryRun) {
      console.log(`\n💡 This was a dry run. Run without --dry-run to apply changes.`)
    } else {
      console.log(`\n✅ Cleanup complete!`)
    }

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
