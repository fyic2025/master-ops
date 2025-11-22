#!/usr/bin/env npx tsx

/**
 * Executive Report Generator
 *
 * Generates comprehensive weekly/monthly reports for stakeholders
 * Includes metrics, trends, issues, and recommendations
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/executive-report-generator.ts [--period=weekly|monthly]
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

const period = process.argv.find(a => a.startsWith('--period='))?.split('=')[1] || 'weekly'
const days = period === 'monthly' ? 30 : 7

interface ExecutiveReport {
  report_date: string
  period: 'weekly' | 'monthly'
  summary: {
    overall_health: 'healthy' | 'warning' | 'critical'
    total_operations: number
    success_rate: number
    active_businesses: number
    key_metrics_change: string
  }
  business_performance: Array<{
    business_name: string
    operations: number
    success_rate: number
    trend: 'up' | 'down' | 'stable'
    status: 'healthy' | 'warning' | 'critical'
  }>
  integration_health: {
    hubspot: {operations: number, success_rate: number, issues: string[]}
    n8n: {executions: number, success_rate: number, issues: string[]}
    api_services: {calls: number, avg_response_ms: number, issues: string[]}
  }
  top_achievements: string[]
  critical_issues: string[]
  warnings: string[]
  trends: {
    operations_trend: string
    error_trend: string
    performance_trend: string
  }
  recommendations: {
    immediate: string[]
    short_term: string[]
    long_term: string[]
  }
  metrics_summary: {
    [key: string]: {value: number, change: string, unit: string}
  }
}

async function generateExecutiveReport(): Promise<ExecutiveReport> {
  const report: ExecutiveReport = {
    report_date: new Date().toISOString(),
    period: period as 'weekly' | 'monthly',
    summary: {
      overall_health: 'healthy',
      total_operations: 0,
      success_rate: 0,
      active_businesses: 0,
      key_metrics_change: '',
    },
    business_performance: [],
    integration_health: {
      hubspot: {operations: 0, success_rate: 0, issues: []},
      n8n: {executions: 0, success_rate: 0, issues: []},
      api_services: {calls: 0, avg_response_ms: 0, issues: []},
    },
    top_achievements: [],
    critical_issues: [],
    warnings: [],
    trends: {
      operations_trend: 'stable',
      error_trend: 'stable',
      performance_trend: 'stable',
    },
    recommendations: {
      immediate: [],
      short_term: [],
      long_term: [],
    },
    metrics_summary: {},
  }

  console.log(`📊 Executive Report Generator`)
  console.log('='.repeat(60))
  console.log(`Period: ${period} (${days} days)`)
  console.log(`Generated: ${new Date().toLocaleString()}`)
  console.log()

  const timeAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const previousPeriodStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Overall Metrics
  console.log('1️⃣  Calculating overall metrics...')

  const { data: logs } = await supabase
    .from('integration_logs')
    .select('*')
    .gte('created_at', timeAgo)

  const { data: previousLogs } = await supabase
    .from('integration_logs')
    .select('id, status')
    .gte('created_at', previousPeriodStart)
    .lt('created_at', timeAgo)

  report.summary.total_operations = logs?.length || 0
  const successes = logs?.filter(l => l.status === 'success').length || 0
  report.summary.success_rate = report.summary.total_operations > 0
    ? (successes / report.summary.total_operations) * 100
    : 0

  const previousTotal = previousLogs?.length || 0
  const previousSuccesses = previousLogs?.filter(l => l.status === 'success').length || 0
  const previousSuccessRate = previousTotal > 0 ? (previousSuccesses / previousTotal) * 100 : 0

  const opsChange = ((report.summary.total_operations - previousTotal) / previousTotal * 100) || 0
  const rateChange = report.summary.success_rate - previousSuccessRate

  report.summary.key_metrics_change = `Operations ${opsChange > 0 ? '↑' : '↓'} ${Math.abs(opsChange).toFixed(1)}%, Success rate ${rateChange > 0 ? '↑' : '↓'} ${Math.abs(rateChange).toFixed(1)}%`

  console.log(`   Total operations: ${report.summary.total_operations.toLocaleString()}`)
  console.log(`   Success rate: ${report.summary.success_rate.toFixed(2)}%`)
  console.log(`   vs previous period: ${report.summary.key_metrics_change}`)

  // 2. Business Performance
  console.log('\n2️⃣  Analyzing business performance...')

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('status', 'active')

  report.summary.active_businesses = businesses?.length || 0

  for (const business of businesses || []) {
    const { data: bizLogs } = await supabase
      .from('integration_logs')
      .select('status')
      .eq('business_id', business.id)
      .gte('created_at', timeAgo)

    const { data: bizPrevLogs } = await supabase
      .from('integration_logs')
      .select('status')
      .eq('business_id', business.id)
      .gte('created_at', previousPeriodStart)
      .lt('created_at', timeAgo)

    const ops = bizLogs?.length || 0
    const bizSuccesses = bizLogs?.filter(l => l.status === 'success').length || 0
    const successRate = ops > 0 ? (bizSuccesses / ops) * 100 : 0

    const prevOps = bizPrevLogs?.length || 0
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (ops > prevOps * 1.1) trend = 'up'
    else if (ops < prevOps * 0.9) trend = 'down'

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (successRate < 75) status = 'critical'
    else if (successRate < 90) status = 'warning'

    report.business_performance.push({
      business_name: business.name,
      operations: ops,
      success_rate: successRate,
      trend,
      status,
    })

    console.log(`   ${business.name}: ${ops} ops, ${successRate.toFixed(1)}% success, trend: ${trend}`)
  }

  // 3. Integration Health
  console.log('\n3️⃣  Checking integration health...')

  // HubSpot
  const { data: hubspotLogs } = await supabase
    .from('integration_logs')
    .select('status')
    .eq('source', 'hubspot')
    .gte('created_at', timeAgo)

  report.integration_health.hubspot.operations = hubspotLogs?.length || 0
  const hubspotSuccesses = hubspotLogs?.filter(l => l.status === 'success').length || 0
  report.integration_health.hubspot.success_rate = report.integration_health.hubspot.operations > 0
    ? (hubspotSuccesses / report.integration_health.hubspot.operations) * 100
    : 0

  if (report.integration_health.hubspot.success_rate < 90) {
    report.integration_health.hubspot.issues.push(`Success rate below 90% (${report.integration_health.hubspot.success_rate.toFixed(1)}%)`)
  }

  console.log(`   HubSpot: ${report.integration_health.hubspot.operations} ops, ${report.integration_health.hubspot.success_rate.toFixed(1)}% success`)

  // n8n
  const { data: workflows } = await supabase
    .from('workflow_execution_logs')
    .select('status')
    .gte('started_at', timeAgo)

  report.integration_health.n8n.executions = workflows?.length || 0
  const workflowSuccesses = workflows?.filter(w => w.status === 'success').length || 0
  report.integration_health.n8n.success_rate = report.integration_health.n8n.executions > 0
    ? (workflowSuccesses / report.integration_health.n8n.executions) * 100
    : 0

  if (report.integration_health.n8n.success_rate < 90) {
    report.integration_health.n8n.issues.push(`Success rate below 90% (${report.integration_health.n8n.success_rate.toFixed(1)}%)`)
  }

  console.log(`   n8n: ${report.integration_health.n8n.executions} executions, ${report.integration_health.n8n.success_rate.toFixed(1)}% success`)

  // API Services
  const { data: apiMetrics } = await supabase
    .from('api_metrics')
    .select('success, duration_ms')
    .gte('created_at', timeAgo)

  report.integration_health.api_services.calls = apiMetrics?.length || 0
  if (apiMetrics && apiMetrics.length > 0) {
    const durations = apiMetrics.filter(m => m.duration_ms).map(m => m.duration_ms!)
    report.integration_health.api_services.avg_response_ms = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    if (report.integration_health.api_services.avg_response_ms > 2000) {
      report.integration_health.api_services.issues.push(`Average response time high (${report.integration_health.api_services.avg_response_ms.toFixed(0)}ms)`)
    }
  }

  console.log(`   API Services: ${report.integration_health.api_services.calls} calls, ${report.integration_health.api_services.avg_response_ms.toFixed(0)}ms avg`)

  // 4. Identify Top Achievements
  console.log('\n4️⃣  Identifying achievements...')

  if (report.summary.success_rate > 95) {
    report.top_achievements.push(`✅ Excellent system reliability: ${report.summary.success_rate.toFixed(1)}% success rate`)
  }

  if (opsChange > 20) {
    report.top_achievements.push(`📈 Strong growth: ${opsChange.toFixed(1)}% increase in operations`)
  }

  const healthyBusinesses = report.business_performance.filter(b => b.status === 'healthy').length
  if (healthyBusinesses === report.summary.active_businesses) {
    report.top_achievements.push(`🏆 All ${healthyBusinesses} businesses running smoothly`)
  }

  if (report.integration_health.n8n.success_rate > 95) {
    report.top_achievements.push(`⚙️ n8n workflows highly reliable: ${report.integration_health.n8n.success_rate.toFixed(1)}% success`)
  }

  // 5. Identify Issues
  console.log('\n5️⃣  Identifying issues...')

  const criticalBusinesses = report.business_performance.filter(b => b.status === 'critical')
  if (criticalBusinesses.length > 0) {
    report.critical_issues.push(`🔴 ${criticalBusinesses.length} businesses in critical state: ${criticalBusinesses.map(b => b.business_name).join(', ')}`)
  }

  if (report.summary.success_rate < 75) {
    report.critical_issues.push(`🔴 Overall success rate critically low: ${report.summary.success_rate.toFixed(1)}%`)
  }

  const warningBusinesses = report.business_performance.filter(b => b.status === 'warning')
  if (warningBusinesses.length > 0) {
    report.warnings.push(`⚠️ ${warningBusinesses.length} businesses need attention: ${warningBusinesses.map(b => b.business_name).join(', ')}`)
  }

  if (rateChange < -5) {
    report.warnings.push(`⚠️ Success rate decreased ${Math.abs(rateChange).toFixed(1)}% vs previous period`)
  }

  // 6. Calculate Trends
  const midpoint = Date.now() - (days / 2) * 24 * 60 * 60 * 1000
  const firstHalf = logs?.filter(l => new Date(l.created_at).getTime() < midpoint).length || 0
  const secondHalf = logs?.filter(l => new Date(l.created_at).getTime() >= midpoint).length || 0

  report.trends.operations_trend = secondHalf > firstHalf * 1.2 ? 'increasing' :
                                   firstHalf > secondHalf * 1.2 ? 'decreasing' : 'stable'

  const firstHalfErrors = logs?.filter(l => new Date(l.created_at).getTime() < midpoint && l.level === 'error').length || 0
  const secondHalfErrors = logs?.filter(l => new Date(l.created_at).getTime() >= midpoint && l.level === 'error').length || 0

  report.trends.error_trend = secondHalfErrors > firstHalfErrors * 1.2 ? 'increasing' :
                              firstHalfErrors > secondHalfErrors * 1.2 ? 'decreasing' : 'stable'

  // 7. Generate Recommendations
  console.log('\n6️⃣  Generating recommendations...')

  // Immediate actions
  if (criticalBusinesses.length > 0) {
    report.recommendations.immediate.push(`Address critical issues in: ${criticalBusinesses.map(b => b.business_name).join(', ')}`)
  }

  if (report.trends.error_trend === 'increasing') {
    report.recommendations.immediate.push('Investigate increasing error trend - review recent changes')
  }

  // Short-term (next week/month)
  if (report.summary.success_rate < 95) {
    report.recommendations.short_term.push('Improve system reliability to achieve >95% success rate')
  }

  if (report.integration_health.api_services.avg_response_ms > 1500) {
    report.recommendations.short_term.push('Optimize API response times - currently averaging ' + report.integration_health.api_services.avg_response_ms.toFixed(0) + 'ms')
  }

  report.recommendations.short_term.push('Schedule quarterly capacity planning review')

  // Long-term (next quarter)
  report.recommendations.long_term.push('Implement comprehensive monitoring dashboards (Grafana/Metabase)')
  report.recommendations.long_term.push('Set up automated alerting for critical metrics')
  report.recommendations.long_term.push('Review and optimize database retention policies')

  // 8. Metrics Summary
  report.metrics_summary = {
    'Total Operations': {value: report.summary.total_operations, change: opsChange > 0 ? `+${opsChange.toFixed(1)}%` : `${opsChange.toFixed(1)}%`, unit: 'ops'},
    'Success Rate': {value: report.summary.success_rate, change: rateChange > 0 ? `+${rateChange.toFixed(1)}%` : `${rateChange.toFixed(1)}%`, unit: '%'},
    'Active Businesses': {value: report.summary.active_businesses, change: '0', unit: 'businesses'},
    'HubSpot Operations': {value: report.integration_health.hubspot.operations, change: '', unit: 'ops'},
    'n8n Executions': {value: report.integration_health.n8n.executions, change: '', unit: 'executions'},
    'Avg API Response': {value: report.integration_health.api_services.avg_response_ms, change: '', unit: 'ms'},
  }

  // Determine overall health
  if (report.critical_issues.length > 0) {
    report.summary.overall_health = 'critical'
  } else if (report.warnings.length > 0 || report.summary.success_rate < 90) {
    report.summary.overall_health = 'warning'
  }

  return report
}

function formatReport(report: ExecutiveReport): string {
  const lines: string[] = []

  lines.push('═'.repeat(70))
  lines.push(`  EXECUTIVE ${report.period.toUpperCase()} REPORT`)
  lines.push('═'.repeat(70))
  lines.push('')
  lines.push(`Report Date: ${new Date(report.report_date).toLocaleString()}`)
  lines.push(`Period: Last ${report.period === 'weekly' ? '7' : '30'} days`)
  lines.push('')

  // Summary
  const healthIcon = report.summary.overall_health === 'healthy' ? '✅' :
                     report.summary.overall_health === 'warning' ? '⚠️' : '🔴'
  lines.push(`Overall Health: ${healthIcon} ${report.summary.overall_health.toUpperCase()}`)
  lines.push('')

  // Key Metrics
  lines.push('KEY METRICS')
  lines.push('─'.repeat(70))
  Object.entries(report.metrics_summary).forEach(([metric, data]) => {
    const changeStr = data.change ? ` (${data.change})` : ''
    lines.push(`  ${metric.padEnd(20)} ${data.value.toLocaleString().padStart(12)} ${data.unit}${changeStr}`)
  })
  lines.push('')

  // Top Achievements
  if (report.top_achievements.length > 0) {
    lines.push('TOP ACHIEVEMENTS')
    lines.push('─'.repeat(70))
    report.top_achievements.forEach(achievement => {
      lines.push(`  ${achievement}`)
    })
    lines.push('')
  }

  // Critical Issues
  if (report.critical_issues.length > 0) {
    lines.push('CRITICAL ISSUES')
    lines.push('─'.repeat(70))
    report.critical_issues.forEach(issue => {
      lines.push(`  ${issue}`)
    })
    lines.push('')
  }

  // Warnings
  if (report.warnings.length > 0) {
    lines.push('WARNINGS')
    lines.push('─'.repeat(70))
    report.warnings.forEach(warning => {
      lines.push(`  ${warning}`)
    })
    lines.push('')
  }

  // Business Performance
  lines.push('BUSINESS PERFORMANCE')
  lines.push('─'.repeat(70))
  report.business_performance.forEach(biz => {
    const statusIcon = biz.status === 'healthy' ? '✅' : biz.status === 'warning' ? '⚠️' : '🔴'
    const trendIcon = biz.trend === 'up' ? '📈' : biz.trend === 'down' ? '📉' : '➡️'
    lines.push(`  ${statusIcon} ${biz.business_name.padEnd(25)} ${biz.operations.toString().padStart(6)} ops  ${biz.success_rate.toFixed(1).padStart(5)}%  ${trendIcon}`)
  })
  lines.push('')

  // Trends
  lines.push('TRENDS')
  lines.push('─'.repeat(70))
  lines.push(`  Operations: ${report.trends.operations_trend}`)
  lines.push(`  Errors: ${report.trends.error_trend}`)
  lines.push(`  Performance: ${report.trends.performance_trend}`)
  lines.push('')

  // Recommendations
  if (report.recommendations.immediate.length > 0) {
    lines.push('IMMEDIATE ACTIONS REQUIRED')
    lines.push('─'.repeat(70))
    report.recommendations.immediate.forEach((rec, idx) => {
      lines.push(`  ${idx + 1}. ${rec}`)
    })
    lines.push('')
  }

  if (report.recommendations.short_term.length > 0) {
    lines.push(`SHORT-TERM RECOMMENDATIONS (Next ${report.period === 'weekly' ? 'Week' : 'Month'})`)
    lines.push('─'.repeat(70))
    report.recommendations.short_term.forEach((rec, idx) => {
      lines.push(`  ${idx + 1}. ${rec}`)
    })
    lines.push('')
  }

  if (report.recommendations.long_term.length > 0) {
    lines.push('LONG-TERM INITIATIVES (Next Quarter)')
    lines.push('─'.repeat(70))
    report.recommendations.long_term.forEach((rec, idx) => {
      lines.push(`  ${idx + 1}. ${rec}`)
    })
    lines.push('')
  }

  lines.push('═'.repeat(70))
  lines.push('')

  return lines.join('\n')
}

async function main() {
  try {
    const report = await generateExecutiveReport()

    const formattedReport = formatReport(report)
    console.log('\n' + formattedReport)

    // Write reports
    const fs = await import('fs/promises')
    const timestamp = new Date().toISOString().split('T')[0]

    // JSON report
    const jsonPath = `logs/executive-report-${period}-${timestamp}.json`
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2))

    // Text report
    const textPath = `logs/executive-report-${period}-${timestamp}.txt`
    await fs.writeFile(textPath, formattedReport)

    console.log(`📄 Reports saved:`)
    console.log(`   - JSON: ${jsonPath}`)
    console.log(`   - Text: ${textPath}`)

    console.log(`\n✅ Report generation complete!`)

  } catch (error) {
    console.error('\n❌ Report generation failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
