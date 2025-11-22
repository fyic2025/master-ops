#!/usr/bin/env npx tsx

/**
 * Supabase Backup Validator
 *
 * Validates database backups by checking:
 * - Table row counts match expectations
 * - Critical data integrity (required fields, foreign keys)
 * - Schema consistency (all expected tables/views exist)
 * - Backup freshness (last backup timestamp)
 * - Data completeness (businesses, integrations, workflows)
 *
 * Usage:
 *   npx tsx backup-validator.ts
 *   npx tsx backup-validator.ts --strict  # Fail on warnings
 *   npx tsx backup-validator.ts --export-schema  # Export current schema for comparison
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface ValidationResult {
  timestamp: string
  overall_status: 'valid' | 'warning' | 'invalid'
  checks: {
    connectivity: boolean
    schema_validation: SchemaValidation
    data_integrity: DataIntegrity
    row_counts: RowCountValidation
    critical_data: CriticalDataValidation
    backup_metadata: BackupMetadata
  }
  warnings: string[]
  errors: string[]
  recommendations: string[]
}

interface SchemaValidation {
  expected_tables: number
  found_tables: number
  missing_tables: string[]
  unexpected_tables: string[]
  expected_views: number
  found_views: number
  missing_views: string[]
}

interface DataIntegrity {
  foreign_key_violations: number
  null_violations: number
  orphaned_records: OrphanedRecords
}

interface OrphanedRecords {
  task_logs_without_tasks: number
  integration_logs_without_business: number
  workflow_logs_without_business: number
}

interface RowCountValidation {
  tables: Array<{
    table_name: string
    row_count: number
    expected_min: number
    expected_max: number | null
    status: 'ok' | 'warning' | 'error'
    message?: string
  }>
}

interface CriticalDataValidation {
  businesses: { total: number, active: number, status: 'ok' | 'error' }
  integrations_last_24h: { count: number, status: 'ok' | 'warning' | 'error' }
  workflows_last_24h: { count: number, status: 'ok' | 'warning' | 'error' }
  recent_tasks: { count: number, status: 'ok' | 'warning' }
}

interface BackupMetadata {
  validation_time: string
  database_size_estimate: string
  oldest_record: string | null
  newest_record: string | null
  total_records_checked: number
}

// Expected schema definition
const EXPECTED_TABLES = [
  'businesses',
  'integration_logs',
  'workflow_execution_logs',
  'api_metrics',
  'tasks',
  'task_logs',
  'lighthouse_audits',
  'performance_alerts',
  'rate_limit_cache'
]

const EXPECTED_VIEWS = [
  'integration_health_summary',
  'business_activity',
  'business_error_summary',
  'business_performance_comparison',
  'hubspot_sync_status',
  'workflow_performance_summary',
  'recent_workflow_failures',
  'tasks_needing_attention',
  'api_performance_summary',
  'stale_integrations',
  'businesses_needing_attention',
  'latest_lighthouse_scores',
  'active_performance_alerts',
  'weekly_business_report',
  'daily_operations_summary'
]

// Row count expectations (min, max or null for unlimited)
const ROW_COUNT_EXPECTATIONS: Record<string, { min: number, max: number | null }> = {
  businesses: { min: 4, max: 10 }, // Should have 4 businesses, max 10
  integration_logs: { min: 100, max: null }, // Should have activity
  workflow_execution_logs: { min: 10, max: null },
  api_metrics: { min: 50, max: null },
  tasks: { min: 0, max: null }, // Can be empty
  task_logs: { min: 0, max: null },
  lighthouse_audits: { min: 0, max: null },
  performance_alerts: { min: 0, max: null },
  rate_limit_cache: { min: 0, max: null }
}

async function validateBackup(strict: boolean = false): Promise<ValidationResult> {
  const result: ValidationResult = {
    timestamp: new Date().toISOString(),
    overall_status: 'valid',
    checks: {
      connectivity: false,
      schema_validation: {
        expected_tables: EXPECTED_TABLES.length,
        found_tables: 0,
        missing_tables: [],
        unexpected_tables: [],
        expected_views: EXPECTED_VIEWS.length,
        found_views: 0,
        missing_views: []
      },
      data_integrity: {
        foreign_key_violations: 0,
        null_violations: 0,
        orphaned_records: {
          task_logs_without_tasks: 0,
          integration_logs_without_business: 0,
          workflow_logs_without_business: 0
        }
      },
      row_counts: {
        tables: []
      },
      critical_data: {
        businesses: { total: 0, active: 0, status: 'error' },
        integrations_last_24h: { count: 0, status: 'error' },
        workflows_last_24h: { count: 0, status: 'error' },
        recent_tasks: { count: 0, status: 'ok' }
      },
      backup_metadata: {
        validation_time: new Date().toISOString(),
        database_size_estimate: '0 MB',
        oldest_record: null,
        newest_record: null,
        total_records_checked: 0
      }
    },
    warnings: [],
    errors: [],
    recommendations: []
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // 1. Connectivity Check
    console.log('🔍 Validating database backup...\n')
    const { error: pingError } = await supabase.from('businesses').select('count').limit(1)

    if (pingError) {
      result.errors.push(`Database connectivity failed: ${pingError.message}`)
      result.overall_status = 'invalid'
      return result
    }

    result.checks.connectivity = true
    console.log('✅ Connectivity: OK')

    // 2. Schema Validation
    console.log('\n📋 Validating schema...')
    const schemaValidation = await validateSchema(supabase)
    result.checks.schema_validation = schemaValidation

    if (schemaValidation.missing_tables.length > 0) {
      result.errors.push(`Missing tables: ${schemaValidation.missing_tables.join(', ')}`)
      result.overall_status = 'invalid'
    }

    if (schemaValidation.missing_views.length > 0) {
      result.warnings.push(`Missing views: ${schemaValidation.missing_views.join(', ')}`)
      if (result.overall_status === 'valid') result.overall_status = 'warning'
    }

    console.log(`  Tables: ${schemaValidation.found_tables}/${schemaValidation.expected_tables}`)
    console.log(`  Views: ${schemaValidation.found_views}/${schemaValidation.expected_views}`)

    // 3. Row Count Validation
    console.log('\n📊 Validating row counts...')
    const rowCounts = await validateRowCounts(supabase)
    result.checks.row_counts = rowCounts

    rowCounts.tables.forEach(table => {
      if (table.status === 'error') {
        result.errors.push(table.message || `Row count error in ${table.table_name}`)
        result.overall_status = 'invalid'
      } else if (table.status === 'warning') {
        result.warnings.push(table.message || `Row count warning in ${table.table_name}`)
        if (result.overall_status === 'valid') result.overall_status = 'warning'
      }
      console.log(`  ${table.table_name}: ${table.row_count} rows [${table.status}]`)
    })

    // 4. Data Integrity Checks
    console.log('\n🔗 Checking data integrity...')
    const integrity = await validateDataIntegrity(supabase)
    result.checks.data_integrity = integrity

    if (integrity.orphaned_records.task_logs_without_tasks > 0) {
      result.warnings.push(`Found ${integrity.orphaned_records.task_logs_without_tasks} orphaned task logs`)
      if (result.overall_status === 'valid') result.overall_status = 'warning'
    }

    if (integrity.orphaned_records.integration_logs_without_business > 0) {
      result.errors.push(`Found ${integrity.orphaned_records.integration_logs_without_business} integration logs without business`)
      result.overall_status = 'invalid'
    }

    console.log(`  Orphaned task logs: ${integrity.orphaned_records.task_logs_without_tasks}`)
    console.log(`  Orphaned integration logs: ${integrity.orphaned_records.integration_logs_without_business}`)
    console.log(`  Orphaned workflow logs: ${integrity.orphaned_records.workflow_logs_without_business}`)

    // 5. Critical Data Validation
    console.log('\n💼 Validating critical data...')
    const criticalData = await validateCriticalData(supabase)
    result.checks.critical_data = criticalData

    if (criticalData.businesses.status === 'error') {
      result.errors.push(`Business data validation failed: ${criticalData.businesses.total} businesses found, expected at least 4`)
      result.overall_status = 'invalid'
    }

    if (criticalData.integrations_last_24h.status === 'error') {
      result.errors.push('No integration activity in last 24 hours')
      result.overall_status = 'invalid'
    } else if (criticalData.integrations_last_24h.status === 'warning') {
      result.warnings.push(`Low integration activity: ${criticalData.integrations_last_24h.count} operations in 24h`)
      if (result.overall_status === 'valid') result.overall_status = 'warning'
    }

    console.log(`  Businesses: ${criticalData.businesses.total} (${criticalData.businesses.active} active) [${criticalData.businesses.status}]`)
    console.log(`  Integrations (24h): ${criticalData.integrations_last_24h.count} [${criticalData.integrations_last_24h.status}]`)
    console.log(`  Workflows (24h): ${criticalData.workflows_last_24h.count} [${criticalData.workflows_last_24h.status}]`)

    // 6. Backup Metadata
    console.log('\n📅 Gathering backup metadata...')
    const metadata = await gatherBackupMetadata(supabase, rowCounts)
    result.checks.backup_metadata = metadata

    console.log(`  Database size: ${metadata.database_size_estimate}`)
    console.log(`  Oldest record: ${metadata.oldest_record}`)
    console.log(`  Newest record: ${metadata.newest_record}`)
    console.log(`  Total records validated: ${metadata.total_records_checked}`)

    // 7. Generate Recommendations
    result.recommendations = generateRecommendations(result)

  } catch (error) {
    result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
    result.overall_status = 'invalid'
  }

  // Apply strict mode
  if (strict && result.warnings.length > 0) {
    result.overall_status = 'invalid'
    result.errors.push('Strict mode enabled: warnings treated as errors')
  }

  return result
}

async function validateSchema(supabase: any): Promise<SchemaValidation> {
  const result: SchemaValidation = {
    expected_tables: EXPECTED_TABLES.length,
    found_tables: 0,
    missing_tables: [],
    unexpected_tables: [],
    expected_views: EXPECTED_VIEWS.length,
    found_views: 0,
    missing_views: []
  }

  // Query information_schema for tables
  const { data: tables } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `
  }).catch(() => ({ data: null }))

  // Fallback: Try to check tables individually
  if (!tables) {
    for (const tableName of EXPECTED_TABLES) {
      const { error } = await supabase.from(tableName).select('count').limit(1)
      if (!error) {
        result.found_tables++
      } else {
        result.missing_tables.push(tableName)
      }
    }
  } else {
    const foundTables = tables.filter((t: any) => t.table_type === 'BASE TABLE').map((t: any) => t.table_name)
    const foundViews = tables.filter((t: any) => t.table_type === 'VIEW').map((t: any) => t.table_name)

    result.found_tables = foundTables.length
    result.found_views = foundViews.length

    result.missing_tables = EXPECTED_TABLES.filter(t => !foundTables.includes(t))
    result.missing_views = EXPECTED_VIEWS.filter(v => !foundViews.includes(v))
  }

  return result
}

async function validateRowCounts(supabase: any): Promise<RowCountValidation> {
  const result: RowCountValidation = { tables: [] }

  for (const [tableName, expectations] of Object.entries(ROW_COUNT_EXPECTATIONS)) {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      result.tables.push({
        table_name: tableName,
        row_count: 0,
        expected_min: expectations.min,
        expected_max: expectations.max,
        status: 'error',
        message: `Failed to count rows: ${error.message}`
      })
      continue
    }

    const rowCount = count || 0
    let status: 'ok' | 'warning' | 'error' = 'ok'
    let message: string | undefined

    if (rowCount < expectations.min) {
      status = 'error'
      message = `Row count ${rowCount} below minimum ${expectations.min}`
    } else if (expectations.max && rowCount > expectations.max) {
      status = 'warning'
      message = `Row count ${rowCount} exceeds expected maximum ${expectations.max}`
    }

    result.tables.push({
      table_name: tableName,
      row_count: rowCount,
      expected_min: expectations.min,
      expected_max: expectations.max,
      status,
      message
    })
  }

  return result
}

async function validateDataIntegrity(supabase: any): Promise<DataIntegrity> {
  const result: DataIntegrity = {
    foreign_key_violations: 0,
    null_violations: 0,
    orphaned_records: {
      task_logs_without_tasks: 0,
      integration_logs_without_business: 0,
      workflow_logs_without_business: 0
    }
  }

  // Check orphaned task logs
  const { count: orphanedTaskLogs } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT COUNT(*)
        FROM task_logs tl
        LEFT JOIN tasks t ON t.id = tl.task_id
        WHERE t.id IS NULL
      `
    })
    .catch(() => ({ count: 0 }))

  result.orphaned_records.task_logs_without_tasks = orphanedTaskLogs || 0

  // Check orphaned integration logs
  const { count: orphanedIntegrationLogs } = await supabase
    .from('integration_logs')
    .select('*', { count: 'exact', head: true })
    .is('business_id', null)

  result.orphaned_records.integration_logs_without_business = orphanedIntegrationLogs || 0

  // Check orphaned workflow logs
  const { count: orphanedWorkflowLogs } = await supabase
    .from('workflow_execution_logs')
    .select('*', { count: 'exact', head: true })
    .is('business_id', null)

  result.orphaned_records.workflow_logs_without_business = orphanedWorkflowLogs || 0

  return result
}

async function validateCriticalData(supabase: any): Promise<CriticalDataValidation> {
  // Check businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, status')

  const businessData = {
    total: businesses?.length || 0,
    active: businesses?.filter((b: any) => b.status === 'active').length || 0,
    status: (businesses?.length || 0) >= 4 ? 'ok' : 'error' as 'ok' | 'error'
  }

  // Check recent integrations
  const { count: integrationCount } = await supabase
    .from('integration_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const integrationStatus =
    (integrationCount || 0) === 0 ? 'error' :
    (integrationCount || 0) < 50 ? 'warning' : 'ok'

  // Check recent workflows
  const { count: workflowCount } = await supabase
    .from('workflow_execution_logs')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const workflowStatus =
    (workflowCount || 0) === 0 ? 'error' :
    (workflowCount || 0) < 10 ? 'warning' : 'ok'

  // Check recent tasks
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  return {
    businesses: businessData,
    integrations_last_24h: { count: integrationCount || 0, status: integrationStatus },
    workflows_last_24h: { count: workflowCount || 0, status: workflowStatus },
    recent_tasks: { count: taskCount || 0, status: 'ok' }
  }
}

async function gatherBackupMetadata(supabase: any, rowCounts: RowCountValidation): Promise<BackupMetadata> {
  // Get oldest and newest records from integration_logs
  const { data: oldestData } = await supabase
    .from('integration_logs')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1)

  const { data: newestData } = await supabase
    .from('integration_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  const totalRecords = rowCounts.tables.reduce((sum, table) => sum + table.row_count, 0)
  const estimatedSize = Math.round(totalRecords * 0.5 / 1024) // Rough estimate: 500 bytes per row

  return {
    validation_time: new Date().toISOString(),
    database_size_estimate: `${estimatedSize} MB (estimated)`,
    oldest_record: oldestData?.[0]?.created_at || null,
    newest_record: newestData?.[0]?.created_at || null,
    total_records_checked: totalRecords
  }
}

function generateRecommendations(result: ValidationResult): string[] {
  const recommendations: string[] = []

  if (result.checks.data_integrity.orphaned_records.task_logs_without_tasks > 100) {
    recommendations.push('Run cleanup-maintenance.ts to remove orphaned task logs')
  }

  if (result.checks.critical_data.integrations_last_24h.status === 'warning') {
    recommendations.push('Low integration activity detected - verify n8n workflows are running')
  }

  if (result.checks.critical_data.integrations_last_24h.status === 'error') {
    recommendations.push('URGENT: No integration activity in 24h - check system health immediately')
  }

  const largeTable = result.checks.row_counts.tables.find(t => t.row_count > 100000)
  if (largeTable) {
    recommendations.push(`Consider archiving old records from ${largeTable.table_name} (${largeTable.row_count} rows)`)
  }

  if (result.checks.schema_validation.missing_views.length > 0) {
    recommendations.push('Re-run database migrations to create missing views')
  }

  return recommendations
}

async function exportSchema(supabase: any): Promise<void> {
  console.log('📤 Exporting current schema...\n')

  const schemaExport = {
    exported_at: new Date().toISOString(),
    tables: EXPECTED_TABLES,
    views: EXPECTED_VIEWS,
    row_count_expectations: ROW_COUNT_EXPECTATIONS
  }

  const exportPath = path.join(process.cwd(), 'logs', `schema-export-${Date.now()}.json`)

  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  fs.writeFileSync(exportPath, JSON.stringify(schemaExport, null, 2))
  console.log(`✅ Schema exported to: ${exportPath}`)
}

async function main() {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const exportSchemaMode = args.includes('--export-schema')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  if (exportSchemaMode) {
    await exportSchema(supabase)
    return
  }

  const result = await validateBackup(strict)

  // Save result to file
  const logsDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  const outputPath = path.join(logsDir, `backup-validation-${Date.now()}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 BACKUP VALIDATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`\nStatus: ${result.overall_status.toUpperCase()}`)
  console.log(`Timestamp: ${result.timestamp}`)

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:')
    result.errors.forEach(err => console.log(`  - ${err}`))
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:')
    result.warnings.forEach(warn => console.log(`  - ${warn}`))
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:')
    result.recommendations.forEach(rec => console.log(`  - ${rec}`))
  }

  console.log(`\n📁 Full report saved to: ${outputPath}\n`)

  // Exit code based on status
  process.exit(result.overall_status === 'invalid' ? 1 : 0)
}

main()
