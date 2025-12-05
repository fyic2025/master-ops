/**
 * n8n Issue Resolver - Morning Briefing Reporter
 *
 * Generates formatted console output and logs for the daily resolver run.
 */

import {
  MorningBriefing,
  ResolutionResult,
  DetectedIssue,
  HealthStatus,
  HealthSummary,
  TaskCreated
} from './types'
import { formatDuration, formatTimestamp, log } from './utils'

// ============================================================================
// Reporter Class
// ============================================================================

export class BriefingReporter {
  /**
   * Generate a complete morning briefing
   */
  generateBriefing(
    issues: DetectedIssue[],
    results: ResolutionResult[],
    durationMs: number,
    n8nHealthy: boolean
  ): MorningBriefing {
    const autoFixed = results.filter(r => r.success && r.action !== 'create_task' && r.action !== 'skip')
    const tasksCreated = results.filter(r => r.taskCreated)
    const failed = results.filter(r => !r.success)
    const skipped = results.filter(r => r.action === 'skip')

    // Calculate health status
    const healthStatus = this.calculateHealthStatus(issues, results, n8nHealthy)

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, results)

    // Map task info
    const pendingTasks: TaskCreated[] = tasksCreated.map(r => {
      const issue = issues.find(i => i.id === r.issueId)
      return {
        id: r.taskCreated,
        title: r.details.replace('Task created: ', ''),
        description: issue?.errorMessage || '',
        business: 'overall',
        category: 'automations',
        priority: r.level === 'L3' ? 1 : 2,
        issueType: issue?.type || 'UNKNOWN'
      }
    })

    return {
      timestamp: new Date(),
      durationMs,
      summary: {
        issuesDetected: issues.length,
        autoResolved: autoFixed.length,
        tasksCreated: tasksCreated.length,
        skipped: skipped.length,
        failed: failed.length
      },
      healthStatus,
      autoFixedIssues: autoFixed,
      pendingTasks,
      recommendations
    }
  }

  /**
   * Print the morning briefing to console
   */
  printBriefing(briefing: MorningBriefing): void {
    const border = '='.repeat(72)
    const thin = '-'.repeat(72)

    console.log('')
    console.log(border)
    console.log('                    N8N DAILY RESOLVER - MORNING BRIEFING')
    console.log(`                    ${formatTimestamp(briefing.timestamp)}`)
    console.log(border)
    console.log('')

    // Summary
    console.log('SUMMARY')
    console.log(thin)
    console.log(`  Issues Detected:    ${briefing.summary.issuesDetected}`)
    console.log(`  Auto-Resolved:      ${briefing.summary.autoResolved} (${this.pct(briefing.summary.autoResolved, briefing.summary.issuesDetected)})`)
    console.log(`  Tasks Created:      ${briefing.summary.tasksCreated}`)
    console.log(`  Skipped:            ${briefing.summary.skipped}`)
    console.log(`  Failed:             ${briefing.summary.failed}`)
    console.log('')

    // Health Status
    console.log('HEALTH STATUS')
    console.log(thin)
    console.log(`  n8n Instance:       ${this.statusIcon(briefing.healthStatus.n8n)} ${briefing.healthStatus.n8n}`)
    console.log(`  Webhooks:           ${this.statusIcon(briefing.healthStatus.webhooks)} ${briefing.healthStatus.webhooks}`)
    console.log(`  Integrations:       ${this.statusIcon(briefing.healthStatus.integrations)} ${briefing.healthStatus.integrations}`)
    console.log('')

    // Auto-Fixed Issues
    if (briefing.autoFixedIssues.length > 0) {
      console.log('AUTO-RESOLVED ISSUES')
      console.log(thin)
      for (const result of briefing.autoFixedIssues.slice(0, 10)) {
        console.log(`  [OK] ${result.details.substring(0, 60)}`)
      }
      if (briefing.autoFixedIssues.length > 10) {
        console.log(`  ... and ${briefing.autoFixedIssues.length - 10} more`)
      }
      console.log('')
    }

    // Pending Tasks
    if (briefing.pendingTasks.length > 0) {
      console.log('TASKS REQUIRING ATTENTION')
      console.log(thin)
      for (const task of briefing.pendingTasks.slice(0, 10)) {
        const priority = task.priority === 1 ? 'P1' : 'P2'
        console.log(`  [!] ${task.title} (${priority})`)
      }
      if (briefing.pendingTasks.length > 10) {
        console.log(`  ... and ${briefing.pendingTasks.length - 10} more`)
      }
      console.log('')
    }

    // Recommendations
    if (briefing.recommendations.length > 0) {
      console.log('RECOMMENDATIONS')
      console.log(thin)
      for (let i = 0; i < briefing.recommendations.length; i++) {
        console.log(`  ${i + 1}. ${briefing.recommendations[i]}`)
      }
      console.log('')
    }

    // Footer
    console.log(border)
    console.log(`Duration: ${formatDuration(briefing.durationMs)} | Dashboard: https://ops.growthcohq.com`)
    console.log(border)
    console.log('')
  }

  /**
   * Calculate health status based on issues and results
   */
  private calculateHealthStatus(
    issues: DetectedIssue[],
    results: ResolutionResult[],
    n8nHealthy: boolean
  ): HealthSummary {
    // n8n health
    const n8nStatus: HealthStatus = !n8nHealthy
      ? 'down'
      : issues.some(i => i.type === 'HIGH_ERROR_RATE')
        ? 'degraded'
        : 'healthy'

    // Webhook health
    const webhookIssues = issues.filter(i => i.type === 'WEBHOOK_FAILED')
    const webhookStatus: HealthStatus = webhookIssues.length > 10
      ? 'degraded'
      : webhookIssues.length > 0
        ? 'degraded'
        : 'healthy'

    // Integration health
    const authIssues = issues.filter(i =>
      i.type === 'AUTH_EXPIRED' || i.type === 'CREDENTIAL_MISSING'
    )
    const integrationStatus: HealthStatus = authIssues.length > 3
      ? 'down'
      : authIssues.length > 0
        ? 'degraded'
        : 'healthy'

    return {
      n8n: n8nStatus,
      webhooks: webhookStatus,
      integrations: integrationStatus
    }
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(
    issues: DetectedIssue[],
    results: ResolutionResult[]
  ): string[] {
    const recommendations: string[] = []

    // Check for auth issues
    const authIssues = issues.filter(i => i.type === 'AUTH_EXPIRED')
    if (authIssues.length > 0) {
      const unique = [...new Set(authIssues.map(i => i.workflowName))]
      recommendations.push(
        `Refresh credentials for ${unique.length} workflow(s): ${unique.slice(0, 3).join(', ')}${unique.length > 3 ? '...' : ''}`
      )
    }

    // Check for high error rates
    const highError = issues.filter(i => i.type === 'HIGH_ERROR_RATE')
    if (highError.length > 0) {
      recommendations.push(
        `Review ${highError.length} workflow(s) with high error rates - may indicate systemic issues`
      )
    }

    // Check for stale workflows
    const stale = issues.filter(i => i.type === 'STALE_WORKFLOW')
    if (stale.length > 5) {
      recommendations.push(
        `${stale.length} workflows are stale - consider reviewing workflow schedules`
      )
    }

    // Check escalations
    const escalated = results.filter(r => r.escalated)
    if (escalated.length > 0) {
      recommendations.push(
        `${escalated.length} issue(s) were escalated and need manual attention`
      )
    }

    // Check resolution success rate
    const successRate = results.length > 0
      ? (results.filter(r => r.success).length / results.length) * 100
      : 100

    if (successRate < 60 && results.length >= 5) {
      recommendations.push(
        `Low auto-resolution rate (${successRate.toFixed(0)}%) - review resolver configuration`
      )
    }

    // Always add dashboard link if there are pending tasks
    const taskCount = results.filter(r => r.taskCreated).length
    if (taskCount > 0) {
      recommendations.push(
        `Review ${taskCount} task(s) at https://ops.growthcohq.com/overall/tasks`
      )
    }

    return recommendations
  }

  /**
   * Format percentage
   */
  private pct(value: number, total: number): string {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  /**
   * Status icon
   */
  private statusIcon(status: HealthStatus): string {
    switch (status) {
      case 'healthy':
        return '[OK]'
      case 'degraded':
        return '[!!]'
      case 'down':
        return '[XX]'
    }
  }
}
