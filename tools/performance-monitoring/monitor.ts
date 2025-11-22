#!/usr/bin/env tsx

/**
 * Performance Monitoring Tool
 *
 * Monitors system performance and generates detailed reports.
 * Detects performance regressions and alerts on issues.
 *
 * Usage:
 *   npx tsx tools/performance-monitoring/monitor.ts [options]
 *
 * Options:
 *   --service <name>        Monitor specific service
 *   --hours <n>             Hours to analyze (default: 24)
 *   --threshold <ms>        Response time threshold in ms (default: 2000)
 *   --format <text|json>    Output format (default: text)
 *   --alert                 Send alerts if issues detected
 */

import { supabase } from '../../infra/supabase/client'
import { logger } from '../../shared/libs/logger'
import { slackAlerter } from '../../shared/libs/alerts/slack-alerts'
import { emailAlerter } from '../../shared/libs/alerts/email-alerts'
import { program } from 'commander'

interface PerformanceMetrics {
  service: string
  period: { start: Date; end: Date }
  operations: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
  performance: {
    avgDuration: number
    p50Duration: number
    p95Duration: number
    p99Duration: number
    minDuration: number
    maxDuration: number
  }
  errors: {
    total: number
    errorRate: number
    topErrors: Array<{ message: string; count: number }>
  }
  trend: {
    direction: 'improving' | 'degrading' | 'stable'
    percentChange: number
  }
  issues: string[]
  recommendations: string[]
}

interface SystemPerformance {
  period: { start: Date; end: Date }
  overall: {
    totalOperations: number
    avgDuration: number
    errorRate: number
  }
  services: PerformanceMetrics[]
  slowestOperations: Array<{
    service: string
    operation: string
    avgDuration: number
    count: number
  }>
  mostFrequentErrors: Array<{
    service: string
    message: string
    count: number
  }>
  healthScore: number
  issues: string[]
  recommendations: string[]
}

/**
 * Performance Monitor
 */
class PerformanceMonitor {
  /**
   * Analyze service performance
   */
  async analyzeService(
    service: string,
    hours: number,
    threshold: number
  ): Promise<PerformanceMetrics> {
    const endDate = new Date()
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)

    logger.info('Analyzing service performance', {
      source: 'performance-monitor',
      metadata: { service, hours }
    })

    // Fetch logs for the period
    const { data: logs, error } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('source', service)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (error || !logs) {
      throw new Error(`Failed to fetch logs for ${service}: ${error?.message}`)
    }

    // Calculate metrics
    const total = logs.length
    const successful = logs.filter(l => l.level !== 'error').length
    const failed = logs.filter(l => l.level === 'error').length
    const successRate = total > 0 ? (successful / total) * 100 : 0

    // Performance metrics
    const durations = logs
      .filter(l => l.duration_ms !== null)
      .map(l => l.duration_ms)
      .sort((a, b) => a - b)

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    const p50Duration = durations[Math.floor(durations.length * 0.5)] || 0
    const p95Duration = durations[Math.floor(durations.length * 0.95)] || 0
    const p99Duration = durations[Math.floor(durations.length * 0.99)] || 0
    const minDuration = durations[0] || 0
    const maxDuration = durations[durations.length - 1] || 0

    // Error analysis
    const errorLogs = logs.filter(l => l.level === 'error')
    const errorMessages: Record<string, number> = {}

    errorLogs.forEach(log => {
      errorMessages[log.message] = (errorMessages[log.message] || 0) + 1
    })

    const topErrors = Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const errorRate = total > 0 ? (failed / total) * 100 : 0

    // Trend analysis (compare with previous period)
    const previousStartDate = new Date(startDate.getTime() - hours * 60 * 60 * 1000)

    const { data: previousLogs } = await supabase
      .from('integration_logs')
      .select('duration_ms')
      .eq('source', service)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())
      .not('duration_ms', 'is', null)

    const previousAvgDuration = previousLogs && previousLogs.length > 0
      ? previousLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / previousLogs.length
      : avgDuration

    const percentChange = previousAvgDuration > 0
      ? ((avgDuration - previousAvgDuration) / previousAvgDuration) * 100
      : 0

    const trend: 'improving' | 'degrading' | 'stable' =
      percentChange < -10 ? 'improving' :
      percentChange > 10 ? 'degrading' :
      'stable'

    // Identify issues
    const issues: string[] = []
    const recommendations: string[] = []

    if (errorRate > 10) {
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`)
      recommendations.push('Review recent errors and implement fixes')
    }

    if (avgDuration > threshold) {
      issues.push(`Average response time exceeds threshold: ${avgDuration.toFixed(0)}ms > ${threshold}ms`)
      recommendations.push('Investigate slow operations and optimize queries')
    }

    if (p95Duration > threshold * 2) {
      issues.push(`95th percentile is very slow: ${p95Duration.toFixed(0)}ms`)
      recommendations.push('Check for outliers and optimize edge cases')
    }

    if (trend === 'degrading') {
      issues.push(`Performance degrading: ${percentChange.toFixed(1)}% slower than previous period`)
      recommendations.push('Investigate recent changes and monitor resource usage')
    }

    if (total === 0) {
      issues.push('No operations in this period')
      recommendations.push('Verify service is active and receiving requests')
    }

    return {
      service,
      period: { start: startDate, end: endDate },
      operations: { total, successful, failed, successRate },
      performance: {
        avgDuration,
        p50Duration,
        p95Duration,
        p99Duration,
        minDuration,
        maxDuration
      },
      errors: { total: failed, errorRate, topErrors },
      trend: { direction: trend, percentChange },
      issues,
      recommendations
    }
  }

  /**
   * Analyze system-wide performance
   */
  async analyzeSystem(hours: number, threshold: number): Promise<SystemPerformance> {
    const endDate = new Date()
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)

    logger.info('Analyzing system performance', {
      source: 'performance-monitor',
      metadata: { hours }
    })

    // Get all services
    const { data: servicesData } = await supabase
      .from('integration_logs')
      .select('source')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const services = [...new Set((servicesData || []).map(d => d.source))]

    // Analyze each service
    const serviceMetrics: PerformanceMetrics[] = []

    for (const service of services) {
      try {
        const metrics = await this.analyzeService(service, hours, threshold)
        serviceMetrics.push(metrics)
      } catch (error) {
        logger.error(`Failed to analyze service: ${service}`, {
          source: 'performance-monitor',
          metadata: { service, error: error instanceof Error ? error.message : String(error) }
        }, error as Error)
      }
    }

    // Overall metrics
    const totalOperations = serviceMetrics.reduce((sum, s) => sum + s.operations.total, 0)
    const avgDuration = serviceMetrics.length > 0
      ? serviceMetrics.reduce((sum, s) => sum + s.performance.avgDuration, 0) / serviceMetrics.length
      : 0
    const totalErrors = serviceMetrics.reduce((sum, s) => sum + s.errors.total, 0)
    const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0

    // Find slowest operations
    const { data: slowOps } = await supabase
      .from('integration_logs')
      .select('source, operation, duration_ms')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('duration_ms', 'is', null)
      .order('duration_ms', { ascending: false })
      .limit(100)

    const operationStats: Record<string, { sum: number; count: number }> = {}

    slowOps?.forEach(op => {
      const key = `${op.source}:${op.operation}`
      if (!operationStats[key]) {
        operationStats[key] = { sum: 0, count: 0 }
      }
      operationStats[key].sum += op.duration_ms || 0
      operationStats[key].count++
    })

    const slowestOperations = Object.entries(operationStats)
      .map(([key, stats]) => {
        const [service, operation] = key.split(':')
        return {
          service,
          operation,
          avgDuration: stats.sum / stats.count,
          count: stats.count
        }
      })
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)

    // Most frequent errors
    const { data: errorLogs } = await supabase
      .from('integration_logs')
      .select('source, message')
      .eq('level', 'error')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .limit(1000)

    const errorCounts: Record<string, { service: string; count: number }> = {}

    errorLogs?.forEach(log => {
      const key = `${log.source}:${log.message}`
      if (!errorCounts[key]) {
        errorCounts[key] = { service: log.source, count: 0 }
      }
      errorCounts[key].count++
    })

    const mostFrequentErrors = Object.entries(errorCounts)
      .map(([key, data]) => {
        const [service, message] = key.split(':')
        return { service, message, count: data.count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate health score (0-100)
    let healthScore = 100

    // Deduct points for errors
    if (errorRate > 0) {
      healthScore -= Math.min(errorRate * 2, 30) // Max 30 points
    }

    // Deduct points for slow performance
    if (avgDuration > threshold) {
      const slownessFactor = (avgDuration - threshold) / threshold
      healthScore -= Math.min(slownessFactor * 20, 30) // Max 30 points
    }

    // Deduct points for service issues
    const servicesWithIssues = serviceMetrics.filter(s => s.issues.length > 0).length
    if (servicesWithIssues > 0) {
      healthScore -= Math.min(servicesWithIssues * 10, 20) // Max 20 points
    }

    healthScore = Math.max(0, Math.min(100, healthScore))

    // System-wide issues and recommendations
    const systemIssues: string[] = []
    const systemRecommendations: string[] = []

    if (errorRate > 5) {
      systemIssues.push(`High system error rate: ${errorRate.toFixed(1)}%`)
      systemRecommendations.push('Review integration health and address failing services')
    }

    if (avgDuration > threshold) {
      systemIssues.push(`Average response time above threshold: ${avgDuration.toFixed(0)}ms`)
      systemRecommendations.push('Investigate slow services and optimize performance')
    }

    if (servicesWithIssues > 0) {
      systemIssues.push(`${servicesWithIssues} service(s) have issues`)
      systemRecommendations.push('Review individual service reports below')
    }

    if (healthScore < 70) {
      systemIssues.push(`Low health score: ${healthScore.toFixed(0)}/100`)
      systemRecommendations.push('Immediate attention required - review all issues')
    }

    return {
      period: { start: startDate, end: endDate },
      overall: { totalOperations, avgDuration, errorRate },
      services: serviceMetrics,
      slowestOperations,
      mostFrequentErrors,
      healthScore,
      issues: systemIssues,
      recommendations: systemRecommendations
    }
  }

  /**
   * Send performance alerts
   */
  async sendAlerts(metrics: SystemPerformance): Promise<void> {
    if (metrics.healthScore < 70) {
      const message = `System health score is ${metrics.healthScore.toFixed(0)}/100\n\nIssues:\n${metrics.issues.map(i => `- ${i}`).join('\n')}`

      await slackAlerter.sendCriticalAlert(
        'System Performance Degraded',
        message,
        { metadata: { healthScore: metrics.healthScore } }
      )

      await emailAlerter.sendCriticalAlert(
        'System Performance Degraded',
        message,
        { metadata: { healthScore: metrics.healthScore } }
      )
    } else if (metrics.issues.length > 0) {
      const message = `Performance issues detected:\n${metrics.issues.map(i => `- ${i}`).join('\n')}`

      await slackAlerter.sendPerformanceAlert(
        'system',
        metrics.overall.avgDuration,
        2000,
        { metadata: { healthScore: metrics.healthScore } }
      )
    }
  }
}

/**
 * Format performance report
 */
function formatReport(metrics: SystemPerformance, format: 'text' | 'json'): string {
  if (format === 'json') {
    return JSON.stringify(metrics, null, 2)
  }

  // Text format
  const lines: string[] = []

  lines.push('=' .repeat(80))
  lines.push('PERFORMANCE MONITORING REPORT')
  lines.push('='.repeat(80))
  lines.push('')

  lines.push(`Period: ${metrics.period.start.toISOString()} - ${metrics.period.end.toISOString()}`)
  lines.push(`Health Score: ${metrics.healthScore.toFixed(0)}/100 ${getHealthEmoji(metrics.healthScore)}`)
  lines.push('')

  lines.push('-'.repeat(80))
  lines.push('OVERALL METRICS')
  lines.push('-'.repeat(80))
  lines.push(`Total Operations: ${metrics.overall.totalOperations}`)
  lines.push(`Average Duration: ${metrics.overall.avgDuration.toFixed(0)}ms`)
  lines.push(`Error Rate: ${metrics.overall.errorRate.toFixed(2)}%`)
  lines.push('')

  if (metrics.issues.length > 0) {
    lines.push('-'.repeat(80))
    lines.push('ISSUES')
    lines.push('-'.repeat(80))
    metrics.issues.forEach(issue => lines.push(`❌ ${issue}`))
    lines.push('')
  }

  if (metrics.recommendations.length > 0) {
    lines.push('-'.repeat(80))
    lines.push('RECOMMENDATIONS')
    lines.push('-'.repeat(80))
    metrics.recommendations.forEach(rec => lines.push(`💡 ${rec}`))
    lines.push('')
  }

  lines.push('-'.repeat(80))
  lines.push('SERVICE PERFORMANCE')
  lines.push('-'.repeat(80))

  metrics.services.forEach(service => {
    const statusEmoji = service.issues.length === 0 ? '✅' : '⚠️'
    const trendEmoji =
      service.trend.direction === 'improving' ? '📈' :
      service.trend.direction === 'degrading' ? '📉' :
      '➡️'

    lines.push(`${statusEmoji} ${service.service} ${trendEmoji}`)
    lines.push(`   Operations: ${service.operations.total} (${service.operations.successRate.toFixed(1)}% success)`)
    lines.push(`   Avg Duration: ${service.performance.avgDuration.toFixed(0)}ms`)
    lines.push(`   P95 Duration: ${service.performance.p95Duration.toFixed(0)}ms`)
    lines.push(`   Error Rate: ${service.errors.errorRate.toFixed(2)}%`)
    lines.push(`   Trend: ${service.trend.direction} (${service.trend.percentChange > 0 ? '+' : ''}${service.trend.percentChange.toFixed(1)}%)`)

    if (service.issues.length > 0) {
      lines.push(`   Issues: ${service.issues.join(', ')}`)
    }

    lines.push('')
  })

  if (metrics.slowestOperations.length > 0) {
    lines.push('-'.repeat(80))
    lines.push('SLOWEST OPERATIONS')
    lines.push('-'.repeat(80))
    metrics.slowestOperations.forEach((op, i) => {
      lines.push(`${i + 1}. ${op.service}:${op.operation}`)
      lines.push(`   Avg: ${op.avgDuration.toFixed(0)}ms (${op.count} calls)`)
    })
    lines.push('')
  }

  if (metrics.mostFrequentErrors.length > 0) {
    lines.push('-'.repeat(80))
    lines.push('MOST FREQUENT ERRORS')
    lines.push('-'.repeat(80))
    metrics.mostFrequentErrors.forEach((error, i) => {
      lines.push(`${i + 1}. [${error.service}] ${error.message} (${error.count} times)`)
    })
    lines.push('')
  }

  lines.push('='.repeat(80))

  return lines.join('\n')
}

function getHealthEmoji(score: number): string {
  if (score >= 90) return '🟢'
  if (score >= 70) return '🟡'
  return '🔴'
}

/**
 * CLI Interface
 */
async function main() {
  program
    .option('--service <name>', 'Monitor specific service')
    .option('--hours <n>', 'Hours to analyze', '24')
    .option('--threshold <ms>', 'Response time threshold in ms', '2000')
    .option('--format <type>', 'Output format (text|json)', 'text')
    .option('--alert', 'Send alerts if issues detected', false)
    .parse()

  const opts = program.opts()

  const monitor = new PerformanceMonitor()

  const hours = parseInt(opts.hours, 10)
  const threshold = parseInt(opts.threshold, 10)

  if (opts.service) {
    // Analyze specific service
    const metrics = await monitor.analyzeService(opts.service, hours, threshold)

    if (opts.format === 'json') {
      console.log(JSON.stringify(metrics, null, 2))
    } else {
      console.log(`\nService: ${metrics.service}`)
      console.log(`Period: ${metrics.period.start.toISOString()} - ${metrics.period.end.toISOString()}`)
      console.log('')
      console.log(`Operations: ${metrics.operations.total} (${metrics.operations.successRate.toFixed(1)}% success)`)
      console.log(`Avg Duration: ${metrics.performance.avgDuration.toFixed(0)}ms`)
      console.log(`P95 Duration: ${metrics.performance.p95Duration.toFixed(0)}ms`)
      console.log(`Error Rate: ${metrics.errors.errorRate.toFixed(2)}%`)
      console.log(`Trend: ${metrics.trend.direction} (${metrics.trend.percentChange > 0 ? '+' : ''}${metrics.trend.percentChange.toFixed(1)}%)`)

      if (metrics.issues.length > 0) {
        console.log('\nIssues:')
        metrics.issues.forEach(issue => console.log(`  ❌ ${issue}`))
      }

      if (metrics.recommendations.length > 0) {
        console.log('\nRecommendations:')
        metrics.recommendations.forEach(rec => console.log(`  💡 ${rec}`))
      }
    }
  } else {
    // Analyze system-wide
    const metrics = await monitor.analyzeSystem(hours, threshold)

    console.log(formatReport(metrics, opts.format as 'text' | 'json'))

    // Send alerts if requested
    if (opts.alert) {
      await monitor.sendAlerts(metrics)
      console.log('\n✅ Alerts sent (if applicable)')
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Performance monitoring failed:', error)
    logger.error('Performance monitoring failed', {
      source: 'performance-monitor',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    }, error as Error)
    process.exit(1)
  })
}

export { PerformanceMonitor }
