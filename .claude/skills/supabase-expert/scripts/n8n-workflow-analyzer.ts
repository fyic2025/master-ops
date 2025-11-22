#!/usr/bin/env npx tsx

/**
 * n8n Workflow Deep-Dive Analyzer
 *
 * Comprehensive analysis of n8n workflow performance, failure patterns,
 * and optimization opportunities
 *
 * Usage: npx tsx .claude/skills/supabase-expert/scripts/n8n-workflow-analyzer.ts [--hours=168]
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

const hours = parseInt(process.argv.find(a => a.startsWith('--hours='))?.split('=')[1] || '168') // Default 7 days

interface WorkflowAnalysis {
  timestamp: string
  time_range_hours: number
  overview: {
    total_workflows: number
    total_executions: number
    total_failures: number
    overall_success_rate: number
  }
  workflow_performance: Array<{
    workflow_id: string
    workflow_name: string
    executions: number
    successes: number
    failures: number
    success_rate: number
    avg_duration_ms: number
    max_duration_ms: number
    avg_nodes_executed: number
    last_execution: string
    status: 'healthy' | 'warning' | 'critical'
  }>
  failure_analysis: {
    common_errors: Array<{
      error_pattern: string
      occurrences: number
      affected_workflows: string[]
      sample_message: string
    }>
    failure_trends: 'increasing' | 'stable' | 'decreasing'
    recent_failures: Array<{
      workflow_name: string
      execution_id: string
      error_message: string
      timestamp: string
      nodes_failed: number
    }>
  }
  performance_insights: {
    slowest_workflows: Array<{
      workflow_name: string
      avg_duration_ms: number
      max_duration_ms: number
    }>
    execution_patterns: {
      by_hour: { [hour: string]: number }
      by_day: { [day: string]: number }
      peak_hours: string[]
    }
  }
  business_impact: {
    by_business: Array<{
      business_id: string
      business_name: string
      executions: number
      failures: number
      success_rate: number
    }>
  }
  recommendations: string[]
  health_status: 'healthy' | 'warning' | 'critical'
}

async function analyzeN8nWorkflows(): Promise<WorkflowAnalysis> {
  const result: WorkflowAnalysis = {
    timestamp: new Date().toISOString(),
    time_range_hours: hours,
    overview: {
      total_workflows: 0,
      total_executions: 0,
      total_failures: 0,
      overall_success_rate: 0,
    },
    workflow_performance: [],
    failure_analysis: {
      common_errors: [],
      failure_trends: 'stable',
      recent_failures: [],
    },
    performance_insights: {
      slowest_workflows: [],
      execution_patterns: {
        by_hour: {},
        by_day: {},
        peak_hours: [],
      },
    },
    business_impact: {
      by_business: [],
    },
    recommendations: [],
    health_status: 'healthy',
  }

  console.log('🔄 n8n Workflow Deep-Dive Analysis')
  console.log('='.repeat(60))
  console.log(`Time range: Last ${hours} hours (${(hours / 24).toFixed(1)} days)`)
  console.log()

  // 1. Fetch all workflow executions
  console.log('1️⃣  Fetching workflow executions...')
  const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data: executions, error } = await supabase
    .from('workflow_execution_logs')
    .select('*')
    .gte('started_at', timeAgo)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('   ❌ Failed to fetch executions:', error.message)
    process.exit(1)
  }

  result.overview.total_executions = executions?.length || 0
  result.overview.total_failures = executions?.filter(e => e.status === 'error' || e.status === 'failed').length || 0
  result.overview.overall_success_rate = result.overview.total_executions > 0
    ? ((result.overview.total_executions - result.overview.total_failures) / result.overview.total_executions) * 100
    : 0

  console.log(`   📊 Total executions: ${result.overview.total_executions}`)
  console.log(`   ❌ Failures: ${result.overview.total_failures}`)
  console.log(`   📈 Success rate: ${result.overview.overall_success_rate.toFixed(2)}%`)

  if (result.overview.total_executions === 0) {
    console.log('\n⚠️  No workflow executions found in time range')
    result.health_status = 'warning'
    result.recommendations.push('No workflow activity detected - verify n8n is running and logging executions')
    return result
  }

  // 2. Analyze per-workflow performance
  console.log('\n2️⃣  Analyzing individual workflow performance...')

  const workflowMap = new Map<string, {
    id: string
    name: string
    executions: { status: string, duration_ms?: number, nodes_executed?: number, started_at: string }[]
  }>()

  executions?.forEach(exec => {
    const key = exec.workflow_id
    if (!workflowMap.has(key)) {
      workflowMap.set(key, {
        id: exec.workflow_id,
        name: exec.workflow_name,
        executions: [],
      })
    }
    workflowMap.get(key)!.executions.push({
      status: exec.status,
      duration_ms: exec.duration_ms,
      nodes_executed: exec.nodes_executed,
      started_at: exec.started_at,
    })
  })

  result.overview.total_workflows = workflowMap.size

  for (const [id, data] of workflowMap.entries()) {
    const totalExecs = data.executions.length
    const successes = data.executions.filter(e => e.status === 'success').length
    const failures = totalExecs - successes
    const successRate = (successes / totalExecs) * 100

    const durations = data.executions.filter(e => e.duration_ms).map(e => e.duration_ms!)
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0

    const nodes = data.executions.filter(e => e.nodes_executed).map(e => e.nodes_executed!)
    const avgNodes = nodes.length > 0 ? nodes.reduce((a, b) => a + b, 0) / nodes.length : 0

    const lastExecution = data.executions.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0].started_at

    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (successRate < 75) status = 'critical'
    else if (successRate < 90) status = 'warning'

    result.workflow_performance.push({
      workflow_id: id,
      workflow_name: data.name,
      executions: totalExecs,
      successes,
      failures,
      success_rate: successRate,
      avg_duration_ms: avgDuration,
      max_duration_ms: maxDuration,
      avg_nodes_executed: avgNodes,
      last_execution: lastExecution,
      status,
    })
  }

  // Sort by failure count
  result.workflow_performance.sort((a, b) => b.failures - a.failures)

  console.log(`   📊 Total workflows: ${result.overview.total_workflows}\n`)

  result.workflow_performance.slice(0, 5).forEach((wf, idx) => {
    const statusIcon = wf.status === 'healthy' ? '✅' : wf.status === 'warning' ? '⚠️' : '🔴'
    console.log(`   ${statusIcon} ${idx + 1}. ${wf.workflow_name}`)
    console.log(`      Executions: ${wf.executions}, Success rate: ${wf.success_rate.toFixed(1)}%`)
    console.log(`      Avg duration: ${wf.avg_duration_ms.toFixed(0)}ms, Max: ${wf.max_duration_ms.toFixed(0)}ms`)
  })

  // 3. Failure Analysis
  console.log('\n3️⃣  Analyzing failure patterns...')

  const failures = executions?.filter(e => e.status === 'error' || e.status === 'failed') || []

  // Group by error message patterns
  const errorMap = new Map<string, { count: number, workflows: Set<string>, sample: string }>()

  failures.forEach(fail => {
    const errorMsg = fail.error_message || 'Unknown error'

    // Extract error pattern (first 50 chars or up to first colon)
    const pattern = errorMsg.split(':')[0].substring(0, 50)

    if (!errorMap.has(pattern)) {
      errorMap.set(pattern, { count: 0, workflows: new Set(), sample: errorMsg })
    }
    const errData = errorMap.get(pattern)!
    errData.count++
    errData.workflows.add(fail.workflow_name)
  })

  result.failure_analysis.common_errors = Array.from(errorMap.entries())
    .map(([pattern, data]) => ({
      error_pattern: pattern,
      occurrences: data.count,
      affected_workflows: Array.from(data.workflows),
      sample_message: data.sample,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10)

  result.failure_analysis.recent_failures = failures.slice(0, 10).map(f => ({
    workflow_name: f.workflow_name,
    execution_id: f.execution_id,
    error_message: f.error_message || 'Unknown error',
    timestamp: f.finished_at || f.started_at,
    nodes_failed: f.nodes_failed || 0,
  }))

  // Calculate failure trend
  const midpoint = Date.now() - (hours / 2) * 60 * 60 * 1000
  const firstHalfFailures = failures.filter(f => new Date(f.started_at).getTime() < midpoint).length
  const secondHalfFailures = failures.filter(f => new Date(f.started_at).getTime() >= midpoint).length

  if (secondHalfFailures > firstHalfFailures * 1.5) result.failure_analysis.failure_trends = 'increasing'
  else if (firstHalfFailures > secondHalfFailures * 1.5) result.failure_analysis.failure_trends = 'decreasing'

  if (result.failure_analysis.common_errors.length > 0) {
    console.log(`   ❌ Top failure patterns:`)
    result.failure_analysis.common_errors.slice(0, 3).forEach((err, idx) => {
      console.log(`      ${idx + 1}. ${err.error_pattern} (${err.occurrences}x)`)
      console.log(`         Workflows: ${err.affected_workflows.join(', ')}`)
    })
  } else {
    console.log(`   ✅ No failures in time period`)
  }

  console.log(`   📊 Failure trend: ${result.failure_analysis.failure_trends}`)

  // 4. Performance Insights
  console.log('\n4️⃣  Analyzing performance patterns...')

  result.performance_insights.slowest_workflows = result.workflow_performance
    .sort((a, b) => b.avg_duration_ms - a.avg_duration_ms)
    .slice(0, 5)
    .map(wf => ({
      workflow_name: wf.workflow_name,
      avg_duration_ms: wf.avg_duration_ms,
      max_duration_ms: wf.max_duration_ms,
    }))

  console.log(`   🐌 Slowest workflows:`)
  result.performance_insights.slowest_workflows.forEach((wf, idx) => {
    console.log(`      ${idx + 1}. ${wf.workflow_name}: ${wf.avg_duration_ms.toFixed(0)}ms avg, ${wf.max_duration_ms.toFixed(0)}ms max`)
  })

  // Execution patterns by hour and day
  executions?.forEach(exec => {
    const date = new Date(exec.started_at)
    const hour = date.getHours().toString().padStart(2, '0')
    const day = date.toISOString().split('T')[0]

    result.performance_insights.execution_patterns.by_hour[hour] =
      (result.performance_insights.execution_patterns.by_hour[hour] || 0) + 1
    result.performance_insights.execution_patterns.by_day[day] =
      (result.performance_insights.execution_patterns.by_day[day] || 0) + 1
  })

  // Find peak hours (top 3)
  const hourCounts = Object.entries(result.performance_insights.execution_patterns.by_hour)
    .sort(([, a], [, b]) => b - a)
  result.performance_insights.peak_hours = hourCounts.slice(0, 3).map(([hour]) => `${hour}:00`)

  console.log(`   📈 Peak execution hours: ${result.performance_insights.peak_hours.join(', ')}`)

  // 5. Business Impact
  console.log('\n5️⃣  Analyzing impact by business...')

  const { data: businesses } = await supabase.from('businesses').select('id, name, slug')

  const businessMap = new Map<string, { executions: number, failures: number }>()

  executions?.forEach(exec => {
    if (exec.business_id) {
      if (!businessMap.has(exec.business_id)) {
        businessMap.set(exec.business_id, { executions: 0, failures: 0 })
      }
      const bizData = businessMap.get(exec.business_id)!
      bizData.executions++
      if (exec.status === 'error' || exec.status === 'failed') {
        bizData.failures++
      }
    }
  })

  result.business_impact.by_business = Array.from(businessMap.entries()).map(([id, data]) => {
    const business = businesses?.find(b => b.id === id)
    return {
      business_id: id,
      business_name: business?.name || 'Unknown',
      executions: data.executions,
      failures: data.failures,
      success_rate: ((data.executions - data.failures) / data.executions) * 100,
    }
  }).sort((a, b) => b.executions - a.executions)

  if (result.business_impact.by_business.length > 0) {
    console.log(`   📊 Executions by business:`)
    result.business_impact.by_business.forEach(biz => {
      console.log(`      ${biz.business_name}: ${biz.executions} executions, ${biz.success_rate.toFixed(1)}% success`)
    })
  }

  // 6. Generate Recommendations
  if (result.overview.overall_success_rate < 90) {
    result.recommendations.push(`Overall success rate (${result.overview.overall_success_rate.toFixed(1)}%) is below 90% - review failing workflows`)
    result.health_status = 'warning'
  }

  if (result.overview.overall_success_rate < 75) {
    result.health_status = 'critical'
  }

  if (result.failure_analysis.failure_trends === 'increasing') {
    result.recommendations.push('Failure trend is increasing - investigate recent changes or external service issues')
    if (result.health_status === 'healthy') result.health_status = 'warning'
  }

  const criticalWorkflows = result.workflow_performance.filter(wf => wf.status === 'critical')
  if (criticalWorkflows.length > 0) {
    result.recommendations.push(`${criticalWorkflows.length} workflows are critical: ${criticalWorkflows.map(w => w.workflow_name).join(', ')}`)
    result.health_status = 'critical'
  }

  const slowWorkflows = result.performance_insights.slowest_workflows.filter(wf => wf.avg_duration_ms > 30000)
  if (slowWorkflows.length > 0) {
    result.recommendations.push(`${slowWorkflows.length} workflows average >30s execution time - optimize or break into smaller workflows`)
  }

  if (result.failure_analysis.common_errors.length > 0) {
    const topError = result.failure_analysis.common_errors[0]
    result.recommendations.push(`Most common error: "${topError.error_pattern}" (${topError.occurrences}x) - prioritize fixing this pattern`)
  }

  return result
}

async function main() {
  try {
    const result = await analyzeN8nWorkflows()

    console.log('\n' + '='.repeat(60))
    console.log('📊 N8N WORKFLOW ANALYSIS SUMMARY')
    console.log('='.repeat(60))

    const statusIcon = result.health_status === 'healthy' ? '✅' :
                       result.health_status === 'warning' ? '⚠️' : '🔴'

    console.log(`\nHealth Status: ${statusIcon} ${result.health_status.toUpperCase()}`)
    console.log(`Total Workflows: ${result.overview.total_workflows}`)
    console.log(`Total Executions: ${result.overview.total_executions}`)
    console.log(`Success Rate: ${result.overview.overall_success_rate.toFixed(2)}%`)
    console.log(`Failure Trend: ${result.failure_analysis.failure_trends}`)

    if (result.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`)
      result.recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`)
      })
    } else {
      console.log(`\n✅ All workflows performing optimally`)
    }

    // Write results
    const fs = await import('fs/promises')
    const resultsPath = 'logs/n8n-workflow-analysis.json'
    await fs.mkdir('logs', { recursive: true })
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2))
    console.log(`\n📄 Full analysis saved to: ${resultsPath}`)

    if (result.health_status === 'critical') {
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Analysis failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
