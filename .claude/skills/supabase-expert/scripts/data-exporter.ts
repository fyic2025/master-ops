#!/usr/bin/env npx tsx

/**
 * Data Export Utility
 *
 * Export database metrics to CSV/Excel for business reporting
 * Perfect for sharing with non-technical stakeholders
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/data-exporter.ts [--format=csv|json] [--period=7]
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

const format = process.argv.find(a => a.startsWith('--format='))?.split('=')[1] || 'csv'
const days = parseInt(process.argv.find(a => a.startsWith('--period='))?.split('=')[1] || '7')

interface ExportData {
  timestamp: string
  exports: {
    business_summary: any[]
    integration_metrics: any[]
    workflow_performance: any[]
    error_summary: any[]
    daily_operations: any[]
  }
}

function toCSV(data: any[], headers: string[]): string {
  const lines: string[] = []

  // Header row
  lines.push(headers.join(','))

  // Data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return String(value)
    })
    lines.push(values.join(','))
  })

  return lines.join('\n')
}

async function exportData(): Promise<ExportData> {
  const result: ExportData = {
    timestamp: new Date().toISOString(),
    exports: {
      business_summary: [],
      integration_metrics: [],
      workflow_performance: [],
      error_summary: [],
      daily_operations: [],
    },
  }

  console.log('📤 Data Export Utility')
  console.log('='.repeat(60))
  console.log(`Format: ${format.toUpperCase()}`)
  console.log(`Period: Last ${days} days`)
  console.log()

  const timeAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // 1. Business Summary
  console.log('1️⃣  Exporting business summary...')

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')

  for (const business of businesses || []) {
    const { data: logs } = await supabase
      .from('integration_logs')
      .select('status, created_at')
      .eq('business_id', business.id)
      .gte('created_at', timeAgo)

    const totalOps = logs?.length || 0
    const successes = logs?.filter(l => l.status === 'success').length || 0
    const failures = totalOps - successes
    const successRate = totalOps > 0 ? (successes / totalOps * 100) : 0

    const { data: workflows } = await supabase
      .from('workflow_execution_logs')
      .select('status')
      .eq('business_id', business.id)
      .gte('started_at', timeAgo)

    const workflowExecs = workflows?.length || 0
    const workflowSuccesses = workflows?.filter(w => w.status === 'success').length || 0

    result.exports.business_summary.push({
      business_name: business.name,
      business_slug: business.slug,
      business_type: business.type,
      business_status: business.status,
      hubspot_synced: business.hubspot_company_id ? 'Yes' : 'No',
      unleashed_synced: business.unleashed_customer_code ? 'Yes' : 'No',
      total_operations: totalOps,
      successful_operations: successes,
      failed_operations: failures,
      success_rate: successRate.toFixed(2),
      workflow_executions: workflowExecs,
      workflow_successes: workflowSuccesses,
      period_days: days,
    })
  }

  console.log(`   ✅ Exported ${result.exports.business_summary.length} businesses`)

  // 2. Integration Metrics
  console.log('2️⃣  Exporting integration metrics...')

  const { data: integrationHealth } = await supabase
    .from('integration_health_summary')
    .select('*')

  result.exports.integration_metrics = (integrationHealth || []).map(ih => ({
    source: ih.source,
    total_operations: ih.total_logs,
    successful_operations: ih.success_count,
    failed_operations: ih.error_count,
    success_rate: ih.error_count > 0 ? ((ih.success_count / ih.total_logs) * 100).toFixed(2) : '100.00',
    error_rate: ((ih.error_count / ih.total_logs) * 100).toFixed(2),
    last_activity: ih.last_log_at,
  }))

  console.log(`   ✅ Exported ${result.exports.integration_metrics.length} integrations`)

  // 3. Workflow Performance
  console.log('3️⃣  Exporting workflow performance...')

  const { data: workflowPerf } = await supabase
    .from('workflow_performance_summary')
    .select('*')

  result.exports.workflow_performance = (workflowPerf || []).map(wf => ({
    workflow_name: wf.workflow_name,
    total_executions: wf.total_executions,
    successful_executions: wf.successful_executions,
    failed_executions: wf.failed_executions,
    success_rate: wf.success_rate?.toFixed(2),
    avg_duration_seconds: wf.avg_duration_ms ? (wf.avg_duration_ms / 1000).toFixed(2) : '0',
    last_execution: wf.last_execution,
  }))

  console.log(`   ✅ Exported ${result.exports.workflow_performance.length} workflows`)

  // 4. Error Summary
  console.log('4️⃣  Exporting error summary...')

  const { data: errors } = await supabase
    .from('integration_logs')
    .select('source, service, operation, message, created_at')
    .eq('level', 'error')
    .gte('created_at', timeAgo)
    .order('created_at', { ascending: false })
    .limit(100)

  result.exports.error_summary = (errors || []).map(err => ({
    timestamp: new Date(err.created_at).toLocaleString(),
    source: err.source,
    service: err.service || '',
    operation: err.operation || '',
    error_message: err.message,
  }))

  console.log(`   ✅ Exported ${result.exports.error_summary.length} errors`)

  // 5. Daily Operations Summary
  console.log('5️⃣  Exporting daily operations...')

  const dailyOps = new Map<string, { total: number, success: number, errors: number }>()

  const { data: allLogs } = await supabase
    .from('integration_logs')
    .select('created_at, status, level')
    .gte('created_at', timeAgo)

  allLogs?.forEach(log => {
    const date = log.created_at.split('T')[0]
    if (!dailyOps.has(date)) {
      dailyOps.set(date, { total: 0, success: 0, errors: 0 })
    }
    const day = dailyOps.get(date)!
    day.total++
    if (log.status === 'success') day.success++
    if (log.level === 'error') day.errors++
  })

  result.exports.daily_operations = Array.from(dailyOps.entries())
    .map(([date, stats]) => ({
      date,
      total_operations: stats.total,
      successful_operations: stats.success,
      error_count: stats.errors,
      success_rate: ((stats.success / stats.total) * 100).toFixed(2),
      error_rate: ((stats.errors / stats.total) * 100).toFixed(2),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  console.log(`   ✅ Exported ${result.exports.daily_operations.length} days`)

  return result
}

async function main() {
  try {
    const data = await exportData()

    const fs = await import('fs/promises')
    const timestamp = new Date().toISOString().split('T')[0]

    await fs.mkdir('exports', { recursive: true })

    if (format === 'json') {
      // JSON export
      const jsonPath = `exports/database-export-${timestamp}.json`
      await fs.writeFile(jsonPath, JSON.stringify(data, null, 2))
      console.log(`\n📄 JSON exported to: ${jsonPath}`)
    } else {
      // CSV exports (one file per dataset)
      const files: string[] = []

      // Business summary
      if (data.exports.business_summary.length > 0) {
        const headers = Object.keys(data.exports.business_summary[0])
        const csv = toCSV(data.exports.business_summary, headers)
        const path = `exports/business-summary-${timestamp}.csv`
        await fs.writeFile(path, csv)
        files.push(path)
      }

      // Integration metrics
      if (data.exports.integration_metrics.length > 0) {
        const headers = Object.keys(data.exports.integration_metrics[0])
        const csv = toCSV(data.exports.integration_metrics, headers)
        const path = `exports/integration-metrics-${timestamp}.csv`
        await fs.writeFile(path, csv)
        files.push(path)
      }

      // Workflow performance
      if (data.exports.workflow_performance.length > 0) {
        const headers = Object.keys(data.exports.workflow_performance[0])
        const csv = toCSV(data.exports.workflow_performance, headers)
        const path = `exports/workflow-performance-${timestamp}.csv`
        await fs.writeFile(path, csv)
        files.push(path)
      }

      // Error summary
      if (data.exports.error_summary.length > 0) {
        const headers = Object.keys(data.exports.error_summary[0])
        const csv = toCSV(data.exports.error_summary, headers)
        const path = `exports/error-summary-${timestamp}.csv`
        await fs.writeFile(path, csv)
        files.push(path)
      }

      // Daily operations
      if (data.exports.daily_operations.length > 0) {
        const headers = Object.keys(data.exports.daily_operations[0])
        const csv = toCSV(data.exports.daily_operations, headers)
        const path = `exports/daily-operations-${timestamp}.csv`
        await fs.writeFile(path, csv)
        files.push(path)
      }

      console.log(`\n📄 CSV files exported:`)
      files.forEach(f => console.log(`   - ${f}`))
    }

    console.log(`\n✅ Export complete!`)
    console.log(`\n💡 TIP: Open CSV files in Excel/Google Sheets for analysis`)

  } catch (error) {
    console.error('\n❌ Export failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
