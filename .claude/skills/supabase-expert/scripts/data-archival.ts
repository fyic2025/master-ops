#!/usr/bin/env npx tsx

/**
 * Data Archival Automation Script
 *
 * Automatically archives old data based on retention policies
 * - Exports old records to JSON files
 * - Optionally deletes archived records from database
 * - Maintains data integrity with business references
 *
 * Usage:
 *   npx tsx data-archival.ts                    # Dry run (preview only)
 *   npx tsx data-archival.ts --execute          # Execute archival
 *   npx tsx data-archival.ts --table=integration_logs --days=90
 *   npx tsx data-archival.ts --execute --delete # Archive and delete from DB
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface ArchivalPolicy {
  table: string
  retention_days: number
  date_column: string
  batch_size: number
  priority: number
}

interface ArchivalResult {
  table: string
  records_archived: number
  records_deleted: number
  archive_files: string[]
  size_freed_mb: number
  errors: string[]
}

interface ArchivalSummary {
  timestamp: string
  mode: 'dry_run' | 'execute'
  delete_mode: boolean
  tables_processed: number
  total_records_archived: number
  total_records_deleted: number
  total_size_freed_mb: number
  archive_location: string
  results: ArchivalResult[]
  recommendations: string[]
}

// Default archival policies
const DEFAULT_POLICIES: ArchivalPolicy[] = [
  {
    table: 'integration_logs',
    retention_days: 90,
    date_column: 'created_at',
    batch_size: 10000,
    priority: 1
  },
  {
    table: 'workflow_execution_logs',
    retention_days: 180,
    date_column: 'started_at',
    batch_size: 5000,
    priority: 2
  },
  {
    table: 'api_metrics',
    retention_days: 60,
    date_column: 'created_at',
    batch_size: 10000,
    priority: 3
  },
  {
    table: 'task_logs',
    retention_days: 90,
    date_column: 'created_at',
    batch_size: 5000,
    priority: 4
  },
  {
    table: 'lighthouse_audits',
    retention_days: 365,
    date_column: 'audited_at',
    batch_size: 1000,
    priority: 5
  },
  {
    table: 'performance_alerts',
    retention_days: 180,
    date_column: 'created_at',
    batch_size: 1000,
    priority: 6
  }
]

async function archiveTable(
  supabase: any,
  policy: ArchivalPolicy,
  execute: boolean,
  deleteMode: boolean,
  archiveDir: string
): Promise<ArchivalResult> {
  const result: ArchivalResult = {
    table: policy.table,
    records_archived: 0,
    records_deleted: 0,
    archive_files: [],
    size_freed_mb: 0,
    errors: []
  }

  console.log(`\n📦 Processing ${policy.table}...`)

  try {
    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days)
    const cutoffISO = cutoffDate.toISOString()

    console.log(`  Retention: ${policy.retention_days} days (cutoff: ${cutoffDate.toLocaleDateString()})`)

    // Count records to archive
    const { count, error: countError } = await supabase
      .from(policy.table)
      .select('*', { count: 'exact', head: true })
      .lt(policy.date_column, cutoffISO)

    if (countError) {
      result.errors.push(`Failed to count records: ${countError.message}`)
      return result
    }

    const recordCount = count || 0
    console.log(`  Records to archive: ${recordCount.toLocaleString()}`)

    if (recordCount === 0) {
      console.log(`  ✅ No records need archival`)
      return result
    }

    if (!execute) {
      console.log(`  ℹ️  Dry run - no action taken`)
      return result
    }

    // Archive in batches
    let offset = 0
    let batchNumber = 1
    const timestamp = Date.now()

    while (offset < recordCount) {
      console.log(`  Archiving batch ${batchNumber} (${offset}-${Math.min(offset + policy.batch_size, recordCount)})...`)

      const { data, error: fetchError } = await supabase
        .from(policy.table)
        .select('*')
        .lt(policy.date_column, cutoffISO)
        .order(policy.date_column, { ascending: true })
        .range(offset, offset + policy.batch_size - 1)

      if (fetchError) {
        result.errors.push(`Batch ${batchNumber} fetch failed: ${fetchError.message}`)
        break
      }

      if (!data || data.length === 0) {
        break
      }

      // Save batch to compressed JSON file
      const archiveFileName = `${policy.table}_archive_${timestamp}_batch${batchNumber}.json.gz`
      const archiveFilePath = path.join(archiveDir, archiveFileName)

      const jsonData = JSON.stringify(data, null, 2)
      const compressed = zlib.gzipSync(jsonData)

      fs.writeFileSync(archiveFilePath, compressed)
      result.archive_files.push(archiveFileName)

      const fileSizeMB = compressed.length / (1024 * 1024)
      result.size_freed_mb += fileSizeMB

      console.log(`    ✅ Saved ${data.length} records to ${archiveFileName} (${fileSizeMB.toFixed(2)} MB compressed)`)

      result.records_archived += data.length

      // Delete archived records if requested
      if (deleteMode) {
        const recordIds = data.map((record: any) => record.id)

        const { error: deleteError } = await supabase
          .from(policy.table)
          .delete()
          .in('id', recordIds)

        if (deleteError) {
          result.errors.push(`Batch ${batchNumber} delete failed: ${deleteError.message}`)
        } else {
          result.records_deleted += recordIds.length
          console.log(`    ��️  Deleted ${recordIds.length} records from database`)
        }
      }

      offset += policy.batch_size
      batchNumber++

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`  ✅ Completed: ${result.records_archived} records archived`)

    if (deleteMode && result.records_deleted > 0) {
      console.log(`  🗑️  Deleted: ${result.records_deleted} records from database`)
    }

  } catch (error) {
    result.errors.push(`Archival failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  return result
}

async function runArchival(
  execute: boolean,
  deleteMode: boolean,
  specificTable?: string,
  customDays?: number
): Promise<ArchivalSummary> {
  const summary: ArchivalSummary = {
    timestamp: new Date().toISOString(),
    mode: execute ? 'execute' : 'dry_run',
    delete_mode: deleteMode,
    tables_processed: 0,
    total_records_archived: 0,
    total_records_deleted: 0,
    total_size_freed_mb: 0,
    archive_location: '',
    results: [],
    recommendations: []
  }

  // Setup archive directory
  const archiveDir = path.join(process.cwd(), 'archives', new Date().toISOString().split('T')[0])
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true })
  }
  summary.archive_location = archiveDir

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('🗄️  Data Archival Process')
  console.log('='.repeat(60))
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}`)
  console.log(`Delete after archival: ${deleteMode ? 'YES' : 'NO'}`)
  console.log(`Archive location: ${archiveDir}`)

  // Filter policies
  let policies = DEFAULT_POLICIES

  if (specificTable) {
    policies = policies.filter(p => p.table === specificTable)
    if (policies.length === 0) {
      throw new Error(`No archival policy found for table: ${specificTable}`)
    }
  }

  if (customDays && policies.length === 1) {
    policies[0].retention_days = customDays
  }

  // Sort by priority
  policies.sort((a, b) => a.priority - b.priority)

  // Process each table
  for (const policy of policies) {
    const result = await archiveTable(supabase, policy, execute, deleteMode, archiveDir)
    summary.results.push(result)
    summary.tables_processed++
    summary.total_records_archived += result.records_archived
    summary.total_records_deleted += result.records_deleted
    summary.total_size_freed_mb += result.size_freed_mb
  }

  // Generate recommendations
  summary.recommendations = generateRecommendations(summary)

  return summary
}

function generateRecommendations(summary: ArchivalSummary): string[] {
  const recommendations: string[] = []

  // Recommend running VACUUM if lots of data was deleted
  if (summary.total_records_deleted > 10000) {
    recommendations.push('Run VACUUM ANALYZE to reclaim disk space from deleted records')
  }

  // Check for large archives
  const largeArchives = summary.results.filter(r => r.size_freed_mb > 100)
  if (largeArchives.length > 0) {
    recommendations.push(`Large archives created for: ${largeArchives.map(r => r.table).join(', ')} - consider compression or cloud storage`)
  }

  // Check for errors
  const tablesWithErrors = summary.results.filter(r => r.errors.length > 0)
  if (tablesWithErrors.length > 0) {
    recommendations.push(`Review errors for tables: ${tablesWithErrors.map(r => r.table).join(', ')}`)
  }

  // Dry run recommendations
  if (summary.mode === 'dry_run' && summary.total_records_archived === 0) {
    recommendations.push('No archival actions taken in dry run mode. Use --execute to perform archival.')
  }

  // Archival frequency recommendation
  if (summary.total_records_archived > 50000) {
    recommendations.push('Consider running archival more frequently to reduce batch sizes')
  }

  return recommendations
}

async function restoreFromArchive(archiveFile: string, targetTable: string): Promise<void> {
  console.log(`\n📥 Restoring data from archive...`)
  console.log(`Archive file: ${archiveFile}`)
  console.log(`Target table: ${targetTable}`)

  if (!fs.existsSync(archiveFile)) {
    throw new Error(`Archive file not found: ${archiveFile}`)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Read and decompress archive
  const compressed = fs.readFileSync(archiveFile)
  const jsonData = zlib.gunzipSync(compressed).toString('utf-8')
  const records = JSON.parse(jsonData)

  console.log(`Records to restore: ${records.length}`)

  // Restore in batches
  const batchSize = 1000
  let restored = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, Math.min(i + batchSize, records.length))

    const { error } = await supabase
      .from(targetTable)
      .insert(batch)

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`)
      throw error
    }

    restored += batch.length
    console.log(`  ✅ Restored ${restored}/${records.length} records`)
  }

  console.log(`✅ Restoration complete: ${restored} records restored to ${targetTable}`)
}

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const execute = args.includes('--execute')
  const deleteMode = args.includes('--delete')
  const restoreMode = args.includes('--restore')

  const tableArg = args.find(arg => arg.startsWith('--table='))
  const specificTable = tableArg ? tableArg.split('=')[1] : undefined

  const daysArg = args.find(arg => arg.startsWith('--days='))
  const customDays = daysArg ? parseInt(daysArg.split('=')[1]) : undefined

  const archiveFileArg = args.find(arg => arg.startsWith('--file='))
  const archiveFile = archiveFileArg ? archiveFileArg.split('=')[1] : undefined

  // Restore mode
  if (restoreMode) {
    if (!archiveFile || !specificTable) {
      console.error('❌ Restore mode requires --file=<path> and --table=<name>')
      process.exit(1)
    }
    await restoreFromArchive(archiveFile, specificTable)
    return
  }

  // Archival mode
  const summary = await runArchival(execute, deleteMode, specificTable, customDays)

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 ARCHIVAL SUMMARY')
  console.log('='.repeat(60))
  console.log(`Timestamp: ${summary.timestamp}`)
  console.log(`Mode: ${summary.mode.toUpperCase()}`)
  console.log(`Tables processed: ${summary.tables_processed}`)
  console.log(`Records archived: ${summary.total_records_archived.toLocaleString()}`)

  if (summary.delete_mode) {
    console.log(`Records deleted: ${summary.total_records_deleted.toLocaleString()}`)
  }

  console.log(`Storage saved: ${summary.total_size_freed_mb.toFixed(2)} MB (compressed)`)
  console.log(`Archive location: ${summary.archive_location}`)

  if (summary.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:')
    summary.recommendations.forEach(rec => console.log(`  - ${rec}`))
  }

  // List archive files created
  if (summary.results.some(r => r.archive_files.length > 0)) {
    console.log('\n📁 ARCHIVE FILES:')
    summary.results.forEach(result => {
      if (result.archive_files.length > 0) {
        console.log(`\n  ${result.table}:`)
        result.archive_files.forEach(file => console.log(`    - ${file}`))
      }
    })
  }

  // Save summary to file
  const logsDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  const summaryPath = path.join(logsDir, `archival-summary-${Date.now()}.json`)
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

  console.log(`\n📋 Full summary saved to: ${summaryPath}`)

  // List errors
  const errors = summary.results.flatMap(r => r.errors)
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:')
    errors.forEach(err => console.log(`  - ${err}`))
  }

  console.log('\n' + '='.repeat(60))

  if (!execute) {
    console.log('\n💡 This was a DRY RUN. Use --execute to perform actual archival.')
  }

  if (execute && !deleteMode) {
    console.log('\n💡 Data was archived but NOT deleted. Use --delete to remove archived records.')
  }

  console.log()
}

main()
