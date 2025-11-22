import { n8nClient } from '../integrations/n8n/client'
import { supabase } from '../../../infra/supabase/client'
import { logger } from '../logger'
import { slackAlerter } from '../alerts/slack-alerts'
import { emailAlerter } from '../alerts/email-alerts'

/**
 * Workflow monitoring options
 */
export interface WorkflowMonitoringOptions {
  checkInterval?: number // minutes
  errorThreshold?: number // number of failures before alert
  sendAlerts?: boolean
}

/**
 * Workflow health status
 */
export interface WorkflowHealthStatus {
  workflowId: string
  workflowName: string
  active: boolean
  healthy: boolean
  lastExecution?: Date
  recentFailures: number
  successRate: number
  avgDuration: number
  issues: string[]
}

/**
 * Workflow execution summary
 */
export interface WorkflowExecutionSummary {
  workflowId: string
  workflowName: string
  period: { start: Date; end: Date }
  totalExecutions: number
  successCount: number
  failureCount: number
  successRate: number
  avgDuration: number
  p95Duration: number
  topErrors: Array<{ message: string; count: number }>
}

/**
 * Workflow Automation Helpers
 *
 * Pre-built automation functions for managing n8n workflows.
 * Handles monitoring, health checks, and failure recovery.
 *
 * @example
 * ```typescript
 * import { workflowAutomation } from './shared/libs/automation/workflow-automation'
 *
 * // Check health of all workflows
 * const statuses = await workflowAutomation.checkAllWorkflowsHealth()
 *
 * // Monitor workflow and send alerts on failures
 * await workflowAutomation.monitorWorkflow('workflow-id', {
 *   errorThreshold: 3,
 *   sendAlerts: true
 * })
 *
 * // Retry failed executions
 * await workflowAutomation.retryFailedExecutions('workflow-id', { limit: 10 })
 * ```
 */
export class WorkflowAutomation {
  /**
   * Check health of a single workflow
   */
  async checkWorkflowHealth(workflowId: string): Promise<WorkflowHealthStatus> {
    const workflow = await n8nClient.workflows.get(workflowId)

    const status: WorkflowHealthStatus = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      active: workflow.active,
      healthy: true,
      recentFailures: 0,
      successRate: 0,
      avgDuration: 0,
      issues: []
    }

    // Get workflow statistics (last 24 hours)
    const stats = await n8nClient.getWorkflowStats(workflowId, 1)

    if (stats.executions.total === 0) {
      status.issues.push('No recent executions')
      if (workflow.active) {
        status.healthy = false
      }
    } else {
      status.successRate = (stats.executions.success / stats.executions.total) * 100
      status.avgDuration = stats.performance.avgDuration
      status.recentFailures = stats.executions.error

      // Get last execution time
      const executions = await n8nClient.executions.list({ workflowId, limit: 1 })
      if (executions.data.length > 0) {
        status.lastExecution = new Date(executions.data[0].startedAt)

        // Check if workflow hasn't run in expected interval
        const hoursSinceExecution = (Date.now() - status.lastExecution.getTime()) / (1000 * 60 * 60)
        if (workflow.active && hoursSinceExecution > 24) {
          status.issues.push(`No executions in ${hoursSinceExecution.toFixed(1)} hours`)
          status.healthy = false
        }
      }

      // Check success rate
      if (status.successRate < 80) {
        status.issues.push(`Low success rate: ${status.successRate.toFixed(1)}%`)
        status.healthy = false
      }

      // Check for high failure rate
      if (status.recentFailures >= 5) {
        status.issues.push(`${status.recentFailures} recent failures`)
        status.healthy = false
      }
    }

    // Check if workflow is inactive but should be active
    if (!workflow.active) {
      status.issues.push('Workflow is inactive')
      status.healthy = false
    }

    return status
  }

  /**
   * Check health of all workflows
   */
  async checkAllWorkflowsHealth(): Promise<WorkflowHealthStatus[]> {
    const workflows = await n8nClient.workflows.list()
    const statuses: WorkflowHealthStatus[] = []

    for (const workflow of workflows.data) {
      try {
        const status = await this.checkWorkflowHealth(workflow.id)
        statuses.push(status)
      } catch (error) {
        logger.error('Failed to check workflow health', {
          source: 'workflow-automation',
          metadata: {
            workflowId: workflow.id,
            error: error instanceof Error ? error.message : String(error)
          }
        }, error as Error)

        statuses.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          active: workflow.active,
          healthy: false,
          recentFailures: 0,
          successRate: 0,
          avgDuration: 0,
          issues: ['Failed to fetch workflow stats']
        })
      }
    }

    return statuses
  }

  /**
   * Get workflows needing attention
   */
  async getWorkflowsNeedingAttention(): Promise<WorkflowHealthStatus[]> {
    const statuses = await this.checkAllWorkflowsHealth()
    return statuses.filter(s => !s.healthy)
  }

  /**
   * Monitor workflow and send alerts if needed
   */
  async monitorWorkflow(
    workflowId: string,
    options: WorkflowMonitoringOptions = {}
  ): Promise<void> {
    const errorThreshold = options.errorThreshold || 3
    const sendAlerts = options.sendAlerts !== false

    logger.info('Monitoring workflow', {
      source: 'workflow-automation',
      metadata: { workflowId, errorThreshold, sendAlerts }
    })

    const status = await this.checkWorkflowHealth(workflowId)

    // Send alerts if unhealthy
    if (!status.healthy && sendAlerts) {
      const issueList = status.issues.join('\n- ')

      await slackAlerter.sendWorkflowFailure(
        status.workflowName,
        workflowId,
        `Workflow health check failed:\n- ${issueList}`,
        { metadata: { successRate: status.successRate, recentFailures: status.recentFailures } }
      )

      await emailAlerter.sendWorkflowFailure(
        status.workflowName,
        workflowId,
        `Workflow health check failed:\n- ${issueList}`,
        { metadata: { successRate: status.successRate, recentFailures: status.recentFailures } }
      )
    }

    // Check for high error rate
    if (status.recentFailures >= errorThreshold && sendAlerts) {
      await slackAlerter.sendCriticalAlert(
        `Workflow Error Threshold Exceeded`,
        `Workflow "${status.workflowName}" has ${status.recentFailures} recent failures`,
        { metadata: { workflowId, threshold: errorThreshold } }
      )
    }
  }

  /**
   * Monitor all workflows
   */
  async monitorAllWorkflows(options: WorkflowMonitoringOptions = {}): Promise<void> {
    const statuses = await this.checkAllWorkflowsHealth()

    logger.info('Monitoring all workflows', {
      source: 'workflow-automation',
      metadata: {
        total: statuses.length,
        healthy: statuses.filter(s => s.healthy).length,
        unhealthy: statuses.filter(s => !s.healthy).length
      }
    })

    const unhealthy = statuses.filter(s => !s.healthy)

    if (unhealthy.length > 0 && options.sendAlerts !== false) {
      const summary = unhealthy.map(s => `- ${s.workflowName}: ${s.issues.join(', ')}`).join('\n')

      await slackAlerter.sendCriticalAlert(
        'Workflow Health Check Failed',
        `${unhealthy.length} workflow(s) need attention:\n${summary}`,
        { metadata: { count: unhealthy.length } }
      )
    }
  }

  /**
   * Retry failed workflow executions
   */
  async retryFailedExecutions(
    workflowId: string,
    options: { limit?: number; olderThan?: Date } = {}
  ): Promise<{ retried: number; succeeded: number; failed: number }> {
    const limit = options.limit || 10

    logger.info('Retrying failed executions', {
      source: 'workflow-automation',
      metadata: { workflowId, limit }
    })

    const failures = await n8nClient.getFailedExecutions(workflowId, limit)

    const result = {
      retried: 0,
      succeeded: 0,
      failed: 0
    }

    for (const execution of failures) {
      // Skip if too recent (might still be running)
      const executionAge = Date.now() - new Date(execution.startedAt).getTime()
      if (executionAge < 5 * 60 * 1000) { // 5 minutes
        continue
      }

      // Skip if older than specified date
      if (options.olderThan && new Date(execution.startedAt) > options.olderThan) {
        continue
      }

      try {
        await n8nClient.executions.retry(execution.id)
        result.retried++

        // Wait a bit to check result
        await new Promise(resolve => setTimeout(resolve, 2000))

        const retried = await n8nClient.executions.get(execution.id)
        if (retried.finished && !retried.stoppedAt) {
          result.succeeded++
        } else {
          result.failed++
        }
      } catch (error) {
        logger.error('Failed to retry execution', {
          source: 'workflow-automation',
          metadata: {
            workflowId,
            executionId: execution.id,
            error: error instanceof Error ? error.message : String(error)
          }
        }, error as Error)
        result.failed++
      }
    }

    logger.info('Retry completed', {
      source: 'workflow-automation',
      metadata: result
    })

    return result
  }

  /**
   * Generate workflow execution summary
   */
  async generateWorkflowSummary(
    workflowId: string,
    days: number = 7
  ): Promise<WorkflowExecutionSummary> {
    const workflow = await n8nClient.workflows.get(workflowId)
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get executions from Supabase logs
    const { data: executions } = await supabase
      .from('workflow_execution_logs')
      .select('*')
      .eq('workflow_id', workflowId)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())

    if (!executions || executions.length === 0) {
      return {
        workflowId,
        workflowName: workflow.name,
        period: { start: startDate, end: endDate },
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgDuration: 0,
        p95Duration: 0,
        topErrors: []
      }
    }

    const successCount = executions.filter(e => e.status === 'success').length
    const failureCount = executions.filter(e => e.status === 'error').length
    const successRate = (successCount / executions.length) * 100

    // Calculate durations
    const durations = executions
      .filter(e => e.started_at && e.finished_at)
      .map(e => new Date(e.finished_at!).getTime() - new Date(e.started_at).getTime())

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    const sortedDurations = durations.sort((a, b) => a - b)
    const p95Index = Math.floor(sortedDurations.length * 0.95)
    const p95Duration = sortedDurations[p95Index] || 0

    // Get top errors
    const errorMessages: Record<string, number> = {}
    executions
      .filter(e => e.status === 'error' && e.error_message)
      .forEach(e => {
        errorMessages[e.error_message!] = (errorMessages[e.error_message!] || 0) + 1
      })

    const topErrors = Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      workflowId,
      workflowName: workflow.name,
      period: { start: startDate, end: endDate },
      totalExecutions: executions.length,
      successCount,
      failureCount,
      successRate,
      avgDuration,
      p95Duration,
      topErrors
    }
  }

  /**
   * Activate or deactivate workflow
   */
  async toggleWorkflow(workflowId: string, active: boolean): Promise<void> {
    logger.info(`${active ? 'Activating' : 'Deactivating'} workflow`, {
      source: 'workflow-automation',
      metadata: { workflowId }
    })

    if (active) {
      await n8nClient.workflows.activate(workflowId)
    } else {
      await n8nClient.workflows.deactivate(workflowId)
    }
  }

  /**
   * Activate all workflows
   */
  async activateAllWorkflows(): Promise<{ activated: number; failed: number }> {
    const workflows = await n8nClient.workflows.list()
    const inactive = workflows.data.filter(w => !w.active)

    logger.info('Activating all workflows', {
      source: 'workflow-automation',
      metadata: { count: inactive.length }
    })

    const result = { activated: 0, failed: 0 }

    for (const workflow of inactive) {
      try {
        await this.toggleWorkflow(workflow.id, true)
        result.activated++
      } catch (error) {
        logger.error('Failed to activate workflow', {
          source: 'workflow-automation',
          metadata: {
            workflowId: workflow.id,
            error: error instanceof Error ? error.message : String(error)
          }
        }, error as Error)
        result.failed++
      }
    }

    return result
  }

  /**
   * Deactivate all workflows
   */
  async deactivateAllWorkflows(): Promise<{ deactivated: number; failed: number }> {
    const workflows = await n8nClient.workflows.list()
    const active = workflows.data.filter(w => w.active)

    logger.info('Deactivating all workflows', {
      source: 'workflow-automation',
      metadata: { count: active.length }
    })

    const result = { deactivated: 0, failed: 0 }

    for (const workflow of active) {
      try {
        await this.toggleWorkflow(workflow.id, false)
        result.deactivated++
      } catch (error) {
        logger.error('Failed to deactivate workflow', {
          source: 'workflow-automation',
          metadata: {
            workflowId: workflow.id,
            error: error instanceof Error ? error.message : String(error)
          }
        }, error as Error)
        result.failed++
      }
    }

    return result
  }

  /**
   * Clean up old workflow execution logs
   */
  async cleanupOldExecutions(workflowId: string, olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

    logger.info('Cleaning up old executions', {
      source: 'workflow-automation',
      metadata: { workflowId, olderThanDays, cutoffDate: cutoffDate.toISOString() }
    })

    const { data, error } = await supabase
      .from('workflow_execution_logs')
      .delete()
      .eq('workflow_id', workflowId)
      .lt('started_at', cutoffDate.toISOString())

    if (error) {
      logger.error('Failed to cleanup executions', {
        source: 'workflow-automation',
        metadata: { workflowId, error: error.message }
      }, new Error(error.message))
      return 0
    }

    const deletedCount = Array.isArray(data) ? data.length : 0

    logger.info('Cleanup completed', {
      source: 'workflow-automation',
      metadata: { workflowId, deletedCount }
    })

    return deletedCount
  }
}

/**
 * Singleton instance
 */
export const workflowAutomation = new WorkflowAutomation()
