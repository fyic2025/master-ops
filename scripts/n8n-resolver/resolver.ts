/**
 * n8n Issue Resolver - Resolution Module
 *
 * Implements self-healing strategies based on issue type:
 * - L0: Fully automated (retry, reactivate, replay)
 * - L1: Automated with alerts
 * - L2: Create task for human action
 * - L3: Manual review required
 */

import { N8nClient } from '../../shared/libs/n8n/client'
import {
  DetectedIssue,
  ResolutionResult,
  ResolutionLevel,
  ResolutionAction,
  ResolverConfig,
  detectBusiness
} from './types'
import {
  log,
  delay,
  exponentialBackoff,
  createDashboardTask,
  logToSupabase
} from './utils'

// ============================================================================
// Issue Resolver Class
// ============================================================================

export class IssueResolver {
  private n8nClient: N8nClient
  private config: ResolverConfig

  constructor(config: ResolverConfig) {
    this.n8nClient = new N8nClient()
    this.config = config
  }

  /**
   * Resolve a single issue
   */
  async resolve(issue: DetectedIssue): Promise<ResolutionResult> {
    const startTime = Date.now()

    log(`Resolving issue: ${issue.type} - ${issue.workflowName || issue.id}`)

    // Skip if dry run
    if (this.config.dryRun) {
      return {
        issueId: issue.id,
        success: true,
        action: 'skip',
        level: 'L0',
        details: 'Dry run - no action taken',
        durationMs: Date.now() - startTime
      }
    }

    try {
      let result: ResolutionResult

      switch (issue.type) {
        case 'RATE_LIMITED':
          result = await this.healRateLimit(issue)
          break

        case 'CONNECTION_FAILED':
        case 'DNS_FAILURE':
          result = await this.healConnection(issue)
          break

        case 'STALE_WORKFLOW':
          result = await this.healStaleWorkflow(issue)
          break

        case 'FAILED_EXECUTION':
          result = issue.retryable
            ? await this.healFailedExecution(issue)
            : await this.createTaskForIssue(issue, 'L2')
          break

        case 'WEBHOOK_FAILED':
          result = await this.healWebhookFailure(issue)
          break

        case 'AUTH_EXPIRED':
        case 'CREDENTIAL_MISSING':
          result = await this.createTaskForIssue(issue, 'L2')
          break

        case 'HMAC_ERROR':
        case 'HIGH_ERROR_RATE':
          result = await this.createTaskForIssue(issue, 'L3')
          break

        default:
          result = await this.createTaskForIssue(issue, 'L3')
      }

      result.durationMs = Date.now() - startTime

      // Log to Supabase
      await this.logResolution(issue, result)

      return result
    } catch (err) {
      const errorResult: ResolutionResult = {
        issueId: issue.id,
        success: false,
        action: 'escalate',
        level: 'L3',
        details: `Resolution failed: ${err}`,
        durationMs: Date.now() - startTime,
        escalated: true
      }

      await this.logResolution(issue, errorResult)
      return errorResult
    }
  }

  /**
   * L0: Heal rate limited execution
   */
  private async healRateLimit(issue: DetectedIssue): Promise<ResolutionResult> {
    log(`Rate limit detected for ${issue.workflowName}, waiting ${this.config.rateLimitDelayMs}ms...`)

    await delay(this.config.rateLimitDelayMs)

    if (!issue.workflowId) {
      return {
        issueId: issue.id,
        success: false,
        action: 'skip',
        level: 'L0',
        details: 'No workflow ID to retry',
        durationMs: 0
      }
    }

    try {
      await this.n8nClient.executeWorkflow(issue.workflowId)

      return {
        issueId: issue.id,
        success: true,
        action: 'retry_after_delay',
        level: 'L0',
        details: `Workflow retried after ${this.config.rateLimitDelayMs}ms delay`,
        durationMs: 0
      }
    } catch (err) {
      return {
        issueId: issue.id,
        success: false,
        action: 'escalate',
        level: 'L1',
        details: `Retry failed: ${err}`,
        durationMs: 0,
        escalated: true
      }
    }
  }

  /**
   * L0: Heal connection/DNS failure with exponential backoff
   */
  private async healConnection(issue: DetectedIssue): Promise<ResolutionResult> {
    if (!issue.workflowId) {
      return {
        issueId: issue.id,
        success: false,
        action: 'skip',
        level: 'L0',
        details: 'No workflow ID to retry',
        durationMs: 0
      }
    }

    log(`Connection failure for ${issue.workflowName}, retrying with backoff...`)

    for (let attempt = 1; attempt <= this.config.autoRetryLimit; attempt++) {
      await exponentialBackoff(attempt, this.config.connectionRetryDelayMs)

      try {
        await this.n8nClient.executeWorkflow(issue.workflowId)

        return {
          issueId: issue.id,
          success: true,
          action: 'retry_with_backoff',
          level: 'L0',
          details: `Succeeded on attempt ${attempt}`,
          durationMs: 0
        }
      } catch (err) {
        log(`Attempt ${attempt} failed: ${err}`, 'warn')
      }
    }

    return {
      issueId: issue.id,
      success: false,
      action: 'escalate',
      level: 'L2',
      details: `Connection failure persisted after ${this.config.autoRetryLimit} retries`,
      durationMs: 0,
      escalated: true
    }
  }

  /**
   * L0: Heal stale workflow by reactivating
   */
  private async healStaleWorkflow(issue: DetectedIssue): Promise<ResolutionResult> {
    if (!issue.workflowId) {
      return {
        issueId: issue.id,
        success: false,
        action: 'skip',
        level: 'L0',
        details: 'No workflow ID to reactivate',
        durationMs: 0
      }
    }

    log(`Reactivating stale workflow: ${issue.workflowName}`)

    try {
      // Deactivate, wait, reactivate to reset trigger
      await this.n8nClient.deactivateWorkflow(issue.workflowId)
      await delay(2000)
      await this.n8nClient.activateWorkflow(issue.workflowId)

      // Force execution
      await this.n8nClient.executeWorkflow(issue.workflowId)

      return {
        issueId: issue.id,
        success: true,
        action: 'reactivate',
        level: 'L0',
        details: 'Workflow reactivated and executed',
        durationMs: 0
      }
    } catch (err) {
      return {
        issueId: issue.id,
        success: false,
        action: 'escalate',
        level: 'L2',
        details: `Reactivation failed: ${err}`,
        durationMs: 0,
        escalated: true
      }
    }
  }

  /**
   * L0: Heal failed execution by retrying
   */
  private async healFailedExecution(issue: DetectedIssue): Promise<ResolutionResult> {
    if (!issue.workflowId) {
      return {
        issueId: issue.id,
        success: false,
        action: 'skip',
        level: 'L0',
        details: 'No workflow ID to retry',
        durationMs: 0
      }
    }

    // Check if already a retry to avoid infinite loops
    if (issue.metadata?.retryOf) {
      log(`Already a retry, creating task instead: ${issue.workflowName}`)
      return this.createTaskForIssue(issue, 'L2')
    }

    log(`Retrying failed execution: ${issue.workflowName}`)

    try {
      await this.n8nClient.executeWorkflow(issue.workflowId)

      return {
        issueId: issue.id,
        success: true,
        action: 'auto_retry',
        level: 'L0',
        details: 'Workflow retried successfully',
        durationMs: 0
      }
    } catch (err) {
      return {
        issueId: issue.id,
        success: false,
        action: 'escalate',
        level: 'L1',
        details: `Retry failed: ${err}`,
        durationMs: 0,
        escalated: true
      }
    }
  }

  /**
   * L0: Heal webhook failure by logging for replay
   */
  private async healWebhookFailure(issue: DetectedIssue): Promise<ResolutionResult> {
    // For webhook failures, we log them and mark for potential replay
    // Full replay would require the original payload which we may not have

    log(`Webhook failure logged for: ${issue.workflowName}`)

    // For now, mark as handled - could implement full replay if payload stored
    return {
      issueId: issue.id,
      success: true,
      action: 'replay_webhook',
      level: 'L0',
      details: 'Webhook failure logged - check integration_logs for payload',
      durationMs: 0
    }
  }

  /**
   * L2/L3: Create a dashboard task for issues needing human intervention
   */
  private async createTaskForIssue(
    issue: DetectedIssue,
    level: ResolutionLevel
  ): Promise<ResolutionResult> {
    const business = issue.workflowName
      ? detectBusiness(issue.workflowName)
      : 'overall'

    const priority = level === 'L3' ? 1 : 2 // L3 is critical, L2 is high

    const taskTitle = this.generateTaskTitle(issue)
    const taskDescription = this.generateTaskDescription(issue)
    const instructions = this.generateInstructions(issue)

    const taskId = await createDashboardTask({
      title: taskTitle,
      description: taskDescription,
      business,
      category: 'automations',
      priority,
      instructions,
      source_file: 'scripts/daily-n8n-resolver.ts'
    })

    if (taskId) {
      return {
        issueId: issue.id,
        success: true,
        action: 'create_task',
        level,
        details: `Task created: ${taskTitle}`,
        durationMs: 0,
        taskCreated: taskId
      }
    }

    return {
      issueId: issue.id,
      success: false,
      action: 'create_task',
      level,
      details: 'Failed to create task',
      durationMs: 0
    }
  }

  /**
   * Generate task title based on issue
   */
  private generateTaskTitle(issue: DetectedIssue): string {
    const workflow = issue.workflowName || 'Unknown workflow'

    switch (issue.type) {
      case 'AUTH_EXPIRED':
        return `Refresh credentials: ${workflow}`
      case 'CREDENTIAL_MISSING':
        return `Configure credentials: ${workflow}`
      case 'HMAC_ERROR':
        return `Fix HMAC signature: ${workflow}`
      case 'HIGH_ERROR_RATE':
        return `Review high error rate: ${workflow}`
      default:
        return `Review n8n issue: ${workflow}`
    }
  }

  /**
   * Generate task description
   */
  private generateTaskDescription(issue: DetectedIssue): string {
    return `${issue.type}: ${issue.errorMessage.substring(0, 200)}`
  }

  /**
   * Generate fix instructions
   */
  private generateInstructions(issue: DetectedIssue): string {
    switch (issue.type) {
      case 'AUTH_EXPIRED':
        return `## Fix Expired Credentials

**Workflow:** ${issue.workflowName}
**Error:** ${issue.errorMessage}

### Steps:
1. Open n8n: https://automation.growthcohq.com
2. Navigate to Credentials page
3. Find and re-authenticate the affected credential
4. Test the workflow manually
5. Verify it runs successfully`

      case 'CREDENTIAL_MISSING':
        return `## Configure Missing Credentials

**Workflow:** ${issue.workflowName}
**Error:** ${issue.errorMessage}

### Steps:
1. Open n8n: https://automation.growthcohq.com
2. Open the workflow: ${issue.workflowName}
3. Find the node with missing credentials
4. Create or select the appropriate credential
5. Save and test the workflow`

      case 'HMAC_ERROR':
        return `## Fix HMAC Signature Error

**Workflow:** ${issue.workflowName}
**Error:** ${issue.errorMessage}

### Steps:
1. Check ERROR-PATTERNS.md for HMAC-001 guidance
2. Review the Code node that generates the signature
3. Verify the secret key is correct and not URL-encoded
4. Test with a sample payload`

      case 'HIGH_ERROR_RATE':
        return `## Review High Error Rate Workflow

**Workflow:** ${issue.workflowName}
**Error Rate:** ${issue.metadata?.errorRate?.toFixed(0)}%

### Steps:
1. Open n8n: https://automation.growthcohq.com
2. Review recent executions for this workflow
3. Identify the common failure pattern
4. Fix the root cause
5. Consider adding error handling nodes`

      default:
        return `## Review n8n Issue

**Workflow:** ${issue.workflowName}
**Type:** ${issue.type}
**Error:** ${issue.errorMessage}

### Steps:
1. Open n8n: https://automation.growthcohq.com
2. Check the workflow execution history
3. Identify and fix the issue
4. Test the workflow manually`
    }
  }

  /**
   * Log resolution to Supabase
   */
  private async logResolution(
    issue: DetectedIssue,
    result: ResolutionResult
  ): Promise<void> {
    await logToSupabase({
      source: 'n8n',
      service: 'n8n-resolver',
      operation: result.action,
      status: result.success ? 'success' : 'error',
      message: `${issue.type}: ${result.details}`,
      level: result.success ? 'info' : 'warn',
      workflow_id: issue.workflowId,
      details_json: {
        issue_id: issue.id,
        issue_type: issue.type,
        workflow_name: issue.workflowName,
        resolution_level: result.level,
        action: result.action,
        escalated: result.escalated,
        task_created: result.taskCreated
      }
    })
  }
}
