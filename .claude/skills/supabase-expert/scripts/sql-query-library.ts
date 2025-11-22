#!/usr/bin/env npx tsx

/**
 * SQL Query Library
 *
 * Common SQL queries for database operations
 * Copy-paste ready queries with examples
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/sql-query-library.ts [query-name]
 */

interface SQLQuery {
  name: string
  description: string
  category: string
  sql: string
  parameters?: string[]
  example?: string
  notes?: string
}

const QUERY_LIBRARY: SQLQuery[] = [
  // Health & Monitoring
  {
    name: 'overall-health',
    description: 'Get overall system health status',
    category: 'monitoring',
    sql: `
SELECT
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE status = 'success') as successes,
  COUNT(*) FILTER (WHERE level = 'error') as errors,
  ROUND(COUNT(*) FILTER (WHERE status = 'success')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as success_rate,
  ROUND(COUNT(*) FILTER (WHERE level = 'error')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as error_rate
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours';
    `.trim(),
  },
  {
    name: 'integration-health-by-source',
    description: 'Health metrics grouped by integration source',
    category: 'monitoring',
    sql: `
SELECT * FROM integration_health_summary
ORDER BY error_rate DESC;
    `.trim(),
  },
  {
    name: 'recent-errors',
    description: 'Get most recent error logs',
    category: 'monitoring',
    sql: `
SELECT
  source,
  service,
  operation,
  message,
  created_at,
  details_json
FROM integration_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
    `.trim(),
  },
  {
    name: 'stale-integrations',
    description: 'Find integrations with no activity in 24+ hours',
    category: 'monitoring',
    sql: `SELECT * FROM stale_integrations;`.trim(),
  },

  // Business Analytics
  {
    name: 'business-performance',
    description: 'Performance metrics for all businesses',
    category: 'analytics',
    sql: `SELECT * FROM business_activity ORDER BY total_operations DESC;`.trim(),
  },
  {
    name: 'business-errors',
    description: 'Error summary by business',
    category: 'analytics',
    sql: `SELECT * FROM business_error_summary ORDER BY error_count DESC;`.trim(),
  },
  {
    name: 'business-comparison',
    description: 'Compare performance across businesses',
    category: 'analytics',
    sql: `SELECT * FROM business_performance_comparison;`.trim(),
  },
  {
    name: 'hubspot-sync-status',
    description: 'Check HubSpot synchronization status',
    category: 'analytics',
    sql: `SELECT * FROM hubspot_sync_status;`.trim(),
  },

  // Workflow Analytics
  {
    name: 'workflow-performance',
    description: 'Workflow success rates and timing',
    category: 'workflows',
    sql: `
SELECT * FROM workflow_performance_summary
ORDER BY success_rate ASC, total_executions DESC;
    `.trim(),
  },
  {
    name: 'recent-workflow-failures',
    description: 'Recent failed workflow executions',
    category: 'workflows',
    sql: `SELECT * FROM recent_workflow_failures;`.trim(),
  },
  {
    name: 'workflow-execution-details',
    description: 'Detailed workflow execution information',
    category: 'workflows',
    sql: `
SELECT
  workflow_name,
  execution_id,
  status,
  started_at,
  finished_at,
  duration_ms,
  nodes_executed,
  nodes_failed,
  error_message
FROM workflow_execution_logs
WHERE started_at > NOW() - INTERVAL '7 days'
ORDER BY started_at DESC
LIMIT 50;
    `.trim(),
  },

  // Task Management
  {
    name: 'tasks-needing-attention',
    description: 'Tasks that are failed or need fixing',
    category: 'tasks',
    sql: `SELECT * FROM tasks_needing_attention;`.trim(),
  },
  {
    name: 'tasks-for-retry',
    description: 'Get tasks ready for retry',
    category: 'tasks',
    sql: `SELECT * FROM get_tasks_for_retry(3);`.trim(),
    parameters: ['max_retries (default: 3)'],
  },
  {
    name: 'task-history',
    description: 'Full history for a specific task',
    category: 'tasks',
    sql: `
SELECT
  tl.created_at,
  tl.source,
  tl.status,
  tl.message,
  tl.details_json
FROM task_logs tl
WHERE tl.task_id = 'TASK_ID_HERE'
ORDER BY tl.created_at DESC;
    `.trim(),
    parameters: ['task_id'],
    example: "Replace 'TASK_ID_HERE' with actual UUID",
  },

  // Performance Analysis
  {
    name: 'api-performance-summary',
    description: 'API endpoint performance metrics',
    category: 'performance',
    sql: `
SELECT * FROM api_performance_summary
ORDER BY avg_duration_ms DESC;
    `.trim(),
  },
  {
    name: 'slow-api-calls',
    description: 'Find slowest API calls',
    category: 'performance',
    sql: `
SELECT
  service,
  endpoint,
  method,
  duration_ms,
  created_at
FROM api_metrics
WHERE duration_ms > 2000
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY duration_ms DESC
LIMIT 20;
    `.trim(),
  },
  {
    name: 'table-sizes',
    description: 'Estimate table sizes and row counts',
    category: 'performance',
    sql: `
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
    `.trim(),
  },

  // Data Cleanup
  {
    name: 'cleanup-old-logs',
    description: 'Clean up logs based on retention policy',
    category: 'maintenance',
    sql: `
SELECT * FROM cleanup_old_logs(
  integration_logs_days := 30,
  workflow_logs_days := 90,
  api_metrics_days := 30
);
    `.trim(),
    parameters: ['integration_logs_days', 'workflow_logs_days', 'api_metrics_days'],
  },
  {
    name: 'find-orphaned-task-logs',
    description: 'Find task logs for deleted tasks',
    category: 'maintenance',
    sql: `
SELECT tl.task_id, COUNT(*) as log_count
FROM task_logs tl
LEFT JOIN tasks t ON t.id = tl.task_id
WHERE t.id IS NULL
GROUP BY tl.task_id;
    `.trim(),
  },
  {
    name: 'vacuum-analyze',
    description: 'Vacuum and analyze large tables',
    category: 'maintenance',
    sql: `
VACUUM ANALYZE integration_logs;
VACUUM ANALYZE workflow_execution_logs;
VACUUM ANALYZE api_metrics;
VACUUM ANALYZE tasks;
VACUUM ANALYZE task_logs;
    `.trim(),
    notes: 'Run during low-traffic periods',
  },

  // Agent Tables
  {
    name: 'latest-lighthouse-scores',
    description: 'Most recent Lighthouse audit scores',
    category: 'performance',
    sql: `SELECT * FROM latest_lighthouse_scores;`.trim(),
  },
  {
    name: 'active-performance-alerts',
    description: 'Open performance alerts',
    category: 'monitoring',
    sql: `SELECT * FROM active_performance_alerts;`.trim(),
  },

  // Custom Analytics
  {
    name: 'hourly-operation-volume',
    description: 'Operations grouped by hour',
    category: 'analytics',
    sql: `
SELECT
  date_trunc('hour', created_at) as hour,
  COUNT(*) as operations,
  COUNT(*) FILTER (WHERE status = 'success') as successes,
  COUNT(*) FILTER (WHERE level = 'error') as errors
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour DESC;
    `.trim(),
  },
  {
    name: 'error-rate-by-day',
    description: 'Daily error rates for trend analysis',
    category: 'analytics',
    sql: `
SELECT
  created_at::date as date,
  COUNT(*) as total_ops,
  COUNT(*) FILTER (WHERE level = 'error') as errors,
  ROUND(COUNT(*) FILTER (WHERE level = 'error')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as error_rate
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY created_at::date
ORDER BY date DESC;
    `.trim(),
  },

  // Business Intelligence
  {
    name: 'weekly-business-report',
    description: 'Comprehensive weekly business metrics',
    category: 'analytics',
    sql: `SELECT * FROM weekly_business_report;`.trim(),
  },
  {
    name: 'daily-operations-summary',
    description: 'Daily operational summary per business',
    category: 'analytics',
    sql: `SELECT * FROM daily_operations_summary;`.trim(),
  },
]

function displayQuery(query: SQLQuery): void {
  console.log('='.repeat(60))
  console.log(`📝 ${query.name}`)
  console.log('='.repeat(60))
  console.log(`\nCategory: ${query.category}`)
  console.log(`Description: ${query.description}`)

  if (query.parameters) {
    console.log(`\nParameters:`)
    query.parameters.forEach(p => console.log(`  - ${p}`))
  }

  console.log(`\nSQL Query:`)
  console.log('-'.repeat(60))
  console.log(query.sql)
  console.log('-'.repeat(60))

  if (query.example) {
    console.log(`\nExample: ${query.example}`)
  }

  if (query.notes) {
    console.log(`\nNotes: ${query.notes}`)
  }

  console.log()
}

function displayCategory(category: string): void {
  const queries = QUERY_LIBRARY.filter(q => q.category === category)

  console.log(`\n📁 Category: ${category.toUpperCase()}`)
  console.log('─'.repeat(60))

  queries.forEach(q => {
    console.log(`  ${q.name.padEnd(35)} - ${q.description}`)
  })
}

function listAllQueries(): void {
  console.log('📚 SQL Query Library')
  console.log('='.repeat(60))
  console.log(`Total queries: ${QUERY_LIBRARY.length}`)
  console.log()

  const categories = [...new Set(QUERY_LIBRARY.map(q => q.category))]

  categories.forEach(cat => displayCategory(cat))

  console.log('\n' + '='.repeat(60))
  console.log('\nUsage: npx tsx sql-query-library.ts [query-name]')
  console.log('Example: npx tsx sql-query-library.ts overall-health')
  console.log()
}

async function main() {
  const queryName = process.argv[2]

  if (!queryName) {
    listAllQueries()
    return
  }

  const query = QUERY_LIBRARY.find(q => q.name === queryName)

  if (!query) {
    console.error(`❌ Query '${queryName}' not found`)
    console.log('\nAvailable queries:')
    QUERY_LIBRARY.forEach(q => {
      console.log(`  - ${q.name}`)
    })
    process.exit(1)
  }

  displayQuery(query)

  // Offer to copy to clipboard (if available)
  console.log('💡 TIP: Copy the SQL above and paste into Supabase SQL Editor')
  console.log()
}

main()
