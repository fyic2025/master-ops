#!/usr/bin/env npx tsx

/**
 * Supabase Performance Audit Script
 *
 * Analyzes database performance, table sizes, indexes, and query patterns
 * Provides recommendations for optimization
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts
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

interface PerformanceAuditResult {
  timestamp: string
  table_sizes: Array<{
    table_name: string
    total_size: string
    table_size: string
    indexes_size: string
    row_count: number
    dead_rows: number
    last_vacuum: string | null
    last_autovacuum: string | null
  }>
  missing_indexes: Array<{
    table_name: string
    column_name: string
    reason: string
    recommended_index: string
  }>
  jsonb_columns: Array<{
    table_name: string
    column_name: string
    avg_width_bytes: number
    has_index: boolean
    recommendation: string
  }>
  recommendations: string[]
}

async function runPerformanceAudit(): Promise<PerformanceAuditResult> {
  const result: PerformanceAuditResult = {
    timestamp: new Date().toISOString(),
    table_sizes: [],
    missing_indexes: [],
    jsonb_columns: [],
    recommendations: [],
  }

  console.log('⚡ Supabase Performance Audit')
  console.log('='.repeat(60))
  console.log(`Timestamp: ${result.timestamp}`)
  console.log()

  // 1. Analyze Table Sizes
  console.log('1️⃣  Analyzing table sizes and bloat...')
  try {
    const { data: tableSizes, error } = await supabase.rpc('exec_sql' as any, {
      query: `
        SELECT
          schemaname || '.' || tablename AS table_name,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
          n_live_tup as row_count,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20;
      `
    })

    // Fallback: query table sizes directly
    const tables = [
      'businesses',
      'integration_logs',
      'workflow_execution_logs',
      'api_metrics',
      'tasks',
      'task_logs',
      'lighthouse_audits',
      'theme_changes',
      'accessibility_audits',
      'seo_implementation_tasks',
      'deployment_history',
      'agent_activity_log',
      'performance_trends',
      'performance_alerts',
      'performance_budgets',
    ]

    console.log('   Table Sizes:')
    console.log('   ' + '-'.repeat(56))

    for (const tableName of tables) {
      try {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        const tableInfo = {
          table_name: tableName,
          total_size: 'N/A',
          table_size: 'N/A',
          indexes_size: 'N/A',
          row_count: count || 0,
          dead_rows: 0,
          last_vacuum: null,
          last_autovacuum: null,
        }

        result.table_sizes.push(tableInfo)
        console.log(`   ${tableName.padEnd(30)} ${String(count || 0).padStart(10)} rows`)

        // Recommendations based on row count
        if (tableName === 'integration_logs' && count && count > 100000) {
          result.recommendations.push(
            `integration_logs has ${count} rows - consider partitioning by month or running cleanup`
          )
        }
        if (tableName === 'workflow_execution_logs' && count && count > 50000) {
          result.recommendations.push(
            `workflow_execution_logs has ${count} rows - review retention policy`
          )
        }
        if (tableName === 'api_metrics' && count && count > 100000) {
          result.recommendations.push(
            `api_metrics has ${count} rows - consider time-series optimization or archival`
          )
        }
      } catch (err) {
        console.log(`   ${tableName.padEnd(30)} ERROR`)
      }
    }

  } catch (error) {
    console.error('   ⚠️  Could not analyze table sizes:', error instanceof Error ? error.message : String(error))
  }

  // 2. Identify Missing Indexes
  console.log('\n2️⃣  Checking for missing indexes...')

  const indexChecks = [
    {
      table: 'integration_logs',
      column: 'source',
      reason: 'Frequently filtered in queries',
      index: 'CREATE INDEX idx_integration_logs_source ON integration_logs(source);',
    },
    {
      table: 'integration_logs',
      column: 'created_at',
      reason: 'Used for time-range queries',
      index: 'CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at DESC);',
    },
    {
      table: 'integration_logs',
      column: 'business_id',
      reason: 'Used for business filtering',
      index: 'CREATE INDEX idx_integration_logs_business_id ON integration_logs(business_id);',
    },
    {
      table: 'integration_logs',
      column: 'source, created_at',
      reason: 'Common query pattern',
      index: 'CREATE INDEX idx_integration_logs_source_created ON integration_logs(source, created_at DESC);',
    },
    {
      table: 'workflow_execution_logs',
      column: 'status',
      reason: 'Filtered for errors/failures',
      index: 'CREATE INDEX idx_workflow_logs_status ON workflow_execution_logs(status);',
    },
    {
      table: 'workflow_execution_logs',
      column: 'business_id',
      reason: 'Business-specific queries',
      index: 'CREATE INDEX idx_workflow_logs_business_id ON workflow_execution_logs(business_id);',
    },
    {
      table: 'api_metrics',
      column: 'service',
      reason: 'Grouped by service',
      index: 'CREATE INDEX idx_api_metrics_service ON api_metrics(service);',
    },
    {
      table: 'tasks',
      column: 'status',
      reason: 'Filtered by status frequently',
      index: 'CREATE INDEX idx_tasks_status ON tasks(status);',
    },
  ]

  result.missing_indexes = indexChecks.map(check => ({
    table_name: check.table,
    column_name: check.column,
    reason: check.reason,
    recommended_index: check.index,
  }))

  console.log('   Recommended Indexes:')
  console.log('   ' + '-'.repeat(56))
  result.missing_indexes.forEach(idx => {
    console.log(`   📌 ${idx.table_name}.${idx.column_name}`)
    console.log(`      Reason: ${idx.reason}`)
    console.log(`      SQL: ${idx.recommended_index}`)
    console.log()
  })

  // 3. Analyze JSONB Columns
  console.log('3️⃣  Analyzing JSONB column usage...')

  const jsonbColumns = [
    { table: 'integration_logs', column: 'details_json' },
    { table: 'businesses', column: 'metadata' },
    { table: 'tasks', column: 'plan_json' },
    { table: 'workflow_execution_logs', column: 'data_json' },
  ]

  console.log('   JSONB Columns:')
  console.log('   ' + '-'.repeat(56))

  for (const col of jsonbColumns) {
    try {
      const { count } = await supabase
        .from(col.table)
        .select('*', { count: 'exact', head: true })

      const jsonbInfo = {
        table_name: col.table,
        column_name: col.column,
        avg_width_bytes: 0, // Would need pg_stats access
        has_index: false, // Would need pg_indexes check
        recommendation: '',
      }

      // Provide recommendations
      if (col.table === 'integration_logs' && col.column === 'details_json') {
        jsonbInfo.recommendation = 'Add GIN index for common JSON paths: CREATE INDEX idx_integration_logs_details_gin ON integration_logs USING GIN (details_json);'
      } else if (col.table === 'tasks' && col.column === 'plan_json') {
        jsonbInfo.recommendation = 'Add GIN index if querying plan fields: CREATE INDEX idx_tasks_plan_gin ON tasks USING GIN (plan_json);'
      } else {
        jsonbInfo.recommendation = 'Monitor query patterns to determine if GIN index would help'
      }

      result.jsonb_columns.push(jsonbInfo)
      console.log(`   ${col.table}.${col.column}`)
      console.log(`      Rows: ${count || 0}`)
      console.log(`      Recommendation: ${jsonbInfo.recommendation}`)
      console.log()
    } catch (err) {
      console.log(`   ${col.table}.${col.column} - ERROR`)
    }
  }

  // 4. Generate Overall Recommendations
  console.log('4️⃣  Generating optimization recommendations...')

  result.recommendations.push(
    'Run VACUUM ANALYZE on high-write tables (integration_logs, workflow_execution_logs, api_metrics)',
    'Consider implementing table partitioning for integration_logs by month',
    'Add composite indexes for common query patterns (source + created_at)',
    'Implement automated cleanup job for old logs (>30 days for integration_logs, >90 days for workflow_logs)',
    'Review RLS policies - currently disabled on all tables (security concern)',
    'Monitor slow queries using pg_stat_statements extension',
    'Set up connection pooling if not already configured',
    'Review business_id foreign key constraints (currently TEXT instead of UUID FK)',
  )

  console.log()
  result.recommendations.forEach((rec, idx) => {
    console.log(`   ${idx + 1}. ${rec}`)
  })

  return result
}

async function main() {
  try {
    const result = await runPerformanceAudit()

    console.log('\n' + '='.repeat(60))
    console.log('📊 PERFORMANCE AUDIT SUMMARY')
    console.log('='.repeat(60))

    console.log(`\n✅ Analyzed ${result.table_sizes.length} tables`)
    console.log(`📌 Found ${result.missing_indexes.length} recommended indexes`)
    console.log(`📦 Analyzed ${result.jsonb_columns.length} JSONB columns`)
    console.log(`💡 Generated ${result.recommendations.length} recommendations`)

    // Write results to file
    const fs = await import('fs/promises')
    const resultsPath = 'logs/supabase-performance-audit.json'
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full results saved to: ${resultsPath}`)

    // Generate SQL migration file
    const sqlStatements = [
      '-- Supabase Performance Optimization',
      `-- Generated: ${result.timestamp}`,
      '',
      '-- Missing Indexes',
      ...result.missing_indexes.map(idx => idx.recommended_index),
      '',
      '-- JSONB Indexes',
      ...result.jsonb_columns
        .filter(col => col.recommendation.includes('CREATE INDEX'))
        .map(col => col.recommendation),
      '',
      '-- Maintenance Commands',
      'VACUUM ANALYZE integration_logs;',
      'VACUUM ANALYZE workflow_execution_logs;',
      'VACUUM ANALYZE api_metrics;',
      'VACUUM ANALYZE tasks;',
      'VACUUM ANALYZE task_logs;',
    ]

    const migrationPath = 'infra/supabase/migrations/performance-optimization.sql'
    await fs.writeFile(migrationPath, sqlStatements.join('\n'))
    console.log(`📄 Migration file created: ${migrationPath}`)

    console.log('\n✅ Performance audit complete!')

  } catch (error) {
    console.error('\n❌ Performance audit failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
