/**
 * n8n Issue Resolver - Issue Detection Module
 *
 * Detects issues from multiple sources:
 * - n8n API: Failed executions, stale workflows
 * - Supabase: Webhook failures, high error rates
 */

import { N8nClient, N8nExecution, N8nWorkflow } from '../../shared/libs/n8n/client'
import {
  DetectedIssue,
  DetectionResult,
  IssueType,
  ResolverConfig,
  calculateSeverity,
  detectBusiness
} from './types'
import {
  classifyError,
  isRetryable,
  log,
  delay,
  hoursAgo,
  getExpectedIntervalHours,
  getBooSupabase,
  getMasterSupabase
} from './utils'

// ============================================================================
// Issue Detector Class
// ============================================================================

export class IssueDetector {
  private n8nClient: N8nClient
  private config: ResolverConfig

  constructor(config: ResolverConfig) {
    this.n8nClient = new N8nClient()
    this.config = config
  }

  /**
   * Detect all issues from all sources
   */
  async detectAll(): Promise<DetectionResult> {
    const startTime = Date.now()
    const allIssues: DetectedIssue[] = []
    let totalScanned = 0

    log('Starting issue detection...')

    // 1. Detect failed executions from n8n API
    try {
      const failedExecs = await this.detectFailedExecutions()
      allIssues.push(...failedExecs)
      totalScanned += failedExecs.length
      log(`Found ${failedExecs.length} failed executions`)
    } catch (err) {
      log(`Failed to detect n8n executions: ${err}`, 'error')
    }

    await delay(this.config.apiRequestDelayMs)

    // 2. Detect stale workflows
    try {
      const staleWorkflows = await this.detectStaleWorkflows()
      allIssues.push(...staleWorkflows)
      log(`Found ${staleWorkflows.length} stale workflows`)
    } catch (err) {
      log(`Failed to detect stale workflows: ${err}`, 'error')
    }

    await delay(this.config.apiRequestDelayMs)

    // 3. Detect webhook failures from Supabase
    try {
      const webhookFailures = await this.detectWebhookFailures()
      allIssues.push(...webhookFailures)
      totalScanned += webhookFailures.length
      log(`Found ${webhookFailures.length} webhook failures`)
    } catch (err) {
      log(`Failed to detect webhook failures: ${err}`, 'error')
    }

    // 4. Detect high error rates
    try {
      const highErrorRates = await this.detectHighErrorRates()
      allIssues.push(...highErrorRates)
      log(`Found ${highErrorRates.length} high error rate workflows`)
    } catch (err) {
      log(`Failed to detect high error rates: ${err}`, 'error')
    }

    // Sort by timestamp (most recent first)
    allIssues.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Limit to max issues
    const limitedIssues = allIssues.slice(0, this.config.maxIssuesPerRun)

    const duration = Date.now() - startTime
    log(`Detection complete: ${allIssues.length} issues found in ${duration}ms`)

    return {
      issues: limitedIssues,
      totalScanned,
      lookbackHours: this.config.lookbackHours,
      detectedAt: new Date()
    }
  }

  /**
   * Detect failed executions from n8n API
   */
  private async detectFailedExecutions(): Promise<DetectedIssue[]> {
    const { data: executions } = await this.n8nClient.listExecutions({
      status: 'error',
      limit: 100
    })

    const lookbackDate = hoursAgo(this.config.lookbackHours)
    const recentFailures = executions.filter(
      exec => new Date(exec.startedAt) >= lookbackDate
    )

    return recentFailures.map(exec => this.executionToIssue(exec))
  }

  /**
   * Convert n8n execution to DetectedIssue
   */
  private executionToIssue(exec: N8nExecution): DetectedIssue {
    const errorMessage = exec.data?.resultData?.error?.message ||
                         exec.data?.resultData?.lastNodeExecuted ||
                         'Unknown error'

    const issueType = classifyError(errorMessage)

    const issue: DetectedIssue = {
      id: `exec-${exec.id}`,
      type: issueType,
      source: 'n8n_api',
      workflowId: exec.workflowId,
      workflowName: exec.workflowData?.name || `Workflow ${exec.workflowId}`,
      executionId: exec.id,
      errorMessage,
      timestamp: new Date(exec.startedAt),
      severity: 'medium',
      retryable: isRetryable(errorMessage),
      metadata: {
        mode: exec.mode,
        retryOf: exec.retryOf,
        stoppedAt: exec.stoppedAt
      }
    }

    issue.severity = calculateSeverity(issue)
    return issue
  }

  /**
   * Detect stale (inactive) workflows that should be running
   */
  private async detectStaleWorkflows(): Promise<DetectedIssue[]> {
    const { data: workflows } = await this.n8nClient.listWorkflows({ active: true })
    const staleIssues: DetectedIssue[] = []
    const now = new Date()

    for (const workflow of workflows) {
      // Skip workflows without IDs
      if (!workflow.id) continue

      // Get expected interval
      const expectedHours = getExpectedIntervalHours(workflow.name)

      // Get last execution
      try {
        const { data: executions } = await this.n8nClient.listExecutions({
          workflowId: workflow.id,
          limit: 1
        })

        // Add small delay to avoid rate limiting
        await delay(100)

        if (executions.length === 0) {
          // Never executed - mark as stale if expected to run frequently
          if (expectedHours <= 24) {
            staleIssues.push({
              id: `stale-${workflow.id}`,
              type: 'STALE_WORKFLOW',
              source: 'n8n_api',
              workflowId: workflow.id,
              workflowName: workflow.name,
              errorMessage: `Workflow has never executed (expected every ${expectedHours}h)`,
              timestamp: now,
              severity: 'medium',
              retryable: true,
              metadata: {
                expectedHours,
                lastExecution: 'never'
              }
            })
          }
          continue
        }

        const lastExec = new Date(executions[0].startedAt)
        const hoursSince = (now.getTime() - lastExec.getTime()) / 1000 / 60 / 60

        if (hoursSince > expectedHours) {
          staleIssues.push({
            id: `stale-${workflow.id}`,
            type: 'STALE_WORKFLOW',
            source: 'n8n_api',
            workflowId: workflow.id,
            workflowName: workflow.name,
            errorMessage: `Workflow overdue by ${Math.round(hoursSince - expectedHours)}h (expected every ${expectedHours}h)`,
            timestamp: lastExec,
            severity: 'medium',
            retryable: true,
            metadata: {
              expectedHours,
              hoursSince: Math.round(hoursSince),
              hoursOverdue: Math.round(hoursSince - expectedHours),
              lastExecution: executions[0].startedAt
            }
          })
        }
      } catch (err) {
        // Skip if we can't get executions
        continue
      }
    }

    return staleIssues
  }

  /**
   * Detect webhook delivery failures from Supabase integration_logs
   */
  private async detectWebhookFailures(): Promise<DetectedIssue[]> {
    try {
      const supabase = getBooSupabase()
      const lookbackDate = hoursAgo(this.config.lookbackHours)

      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('status', 'error')
        .in('source', ['shopify', 'hubspot', 'bigcommerce', 'unleashed', 'woocommerce'])
        .gte('created_at', lookbackDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        log(`Supabase query error: ${error.message}`, 'warn')
        return []
      }

      return (data || []).map(log => ({
        id: `webhook-${log.id}`,
        type: 'WEBHOOK_FAILED' as IssueType,
        source: 'supabase' as const,
        workflowName: log.service || log.source,
        errorMessage: log.message || 'Webhook delivery failed',
        timestamp: new Date(log.created_at),
        severity: 'low',
        retryable: true,
        metadata: {
          source: log.source,
          service: log.service,
          operation: log.operation,
          details: log.details_json
        }
      }))
    } catch (err) {
      log(`Webhook detection error: ${err}`, 'warn')
      return []
    }
  }

  /**
   * Detect workflows with high error rates
   */
  private async detectHighErrorRates(): Promise<DetectedIssue[]> {
    try {
      const { data: workflows } = await this.n8nClient.listWorkflows({ active: true })
      const highErrorIssues: DetectedIssue[] = []

      for (const workflow of workflows.slice(0, 30)) {
        if (!workflow.id) continue

        try {
          const stats = await this.n8nClient.getWorkflowStats(workflow.id)
          await delay(100)

          if (stats.total >= 5) {
            const errorRate = (stats.error / stats.total) * 100

            if (errorRate >= 25) {
              highErrorIssues.push({
                id: `error-rate-${workflow.id}`,
                type: 'HIGH_ERROR_RATE',
                source: 'n8n_api',
                workflowId: workflow.id,
                workflowName: workflow.name,
                errorMessage: `${errorRate.toFixed(0)}% error rate (${stats.error}/${stats.total} executions)`,
                timestamp: new Date(),
                severity: 'critical',
                retryable: false,
                metadata: {
                  errorRate,
                  totalExecutions: stats.total,
                  errorCount: stats.error,
                  successCount: stats.success
                }
              })
            }
          }
        } catch (err) {
          continue
        }
      }

      return highErrorIssues
    } catch (err) {
      log(`Error rate detection error: ${err}`, 'warn')
      return []
    }
  }

  /**
   * Health check - verify n8n connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.n8nClient.healthCheck()
    } catch {
      return false
    }
  }
}
