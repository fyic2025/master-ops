/**
 * n8n Utility Functions
 *
 * Common utilities for working with n8n
 */

import { N8nWorkflow, N8nExecution } from './client'

// ============================================================================
// Cron Helpers
// ============================================================================

/**
 * Common cron schedules
 */
export const CRON_SCHEDULES = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  HOURLY: '0 * * * *',
  EVERY_4_HOURS: '0 */4 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  DAILY_9AM: '0 9 * * *',
  DAILY_MIDNIGHT: '0 0 * * *',
  WEEKDAYS_9AM: '0 9 * * 1-5',
  WEEKLY_MONDAY_9AM: '0 9 * * 1',
  MONTHLY_FIRST: '0 9 1 * *',
} as const

/**
 * Parse cron expression to human-readable format
 */
export function parseCronExpression(cron: string): string {
  const scheduleMap: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Hourly',
    '0 */4 * * *': 'Every 4 hours',
    '0 */6 * * *': 'Every 6 hours',
    '0 9 * * *': 'Daily at 9 AM',
    '0 0 * * *': 'Daily at midnight',
    '0 9 * * 1-5': 'Weekdays at 9 AM',
    '0 9 * * 1': 'Every Monday at 9 AM',
    '0 9 1 * *': 'First day of month at 9 AM',
  }

  return scheduleMap[cron] || cron
}

// ============================================================================
// Workflow Naming Conventions
// ============================================================================

/**
 * Generate a kebab-case workflow name
 */
export function generateWorkflowName(
  prefix: string,
  description: string,
  suffix?: string
): string {
  const parts = [prefix, description, suffix].filter(Boolean)
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

/**
 * Add prefix to workflow name
 */
export function addWorkflowPrefix(
  name: string,
  prefix: '🚀' | '🗄️' | '🎯' | '✅' | '🧪' | '⚠️' | '🔍' | '📊' | '🏋️' | 'PROD' | 'TEST' | 'ARCHIVED'
): string {
  // Remove all existing emoji/prefix patterns (loop until none left)
  let cleaned = name
  let prevCleaned = ''
  while (cleaned !== prevCleaned) {
    prevCleaned = cleaned
    cleaned = cleaned.replace(/^(🚀|🗄️|🎯|✅|🧪|⚠️|🔍|📊|🏋️|PROD|TEST|ARCHIVED)\s*/i, '')
  }
  return `${prefix} ${cleaned}`
}

// ============================================================================
// Workflow Validation
// ============================================================================

/**
 * Validate workflow has required fields
 */
export function validateWorkflow(workflow: Partial<N8nWorkflow>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!workflow.name) {
    errors.push('Workflow name is required')
  }

  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow must have at least one node')
  }

  if (!workflow.connections) {
    errors.push('Workflow connections object is required')
  }

  // Check for trigger node (case-insensitive)
  const hasTrigger = workflow.nodes?.some(
    (node) =>
      node.type.toLowerCase().includes('trigger') ||
      node.type.toLowerCase().includes('webhook') ||
      node.type.toLowerCase().includes('cron') ||
      node.type.toLowerCase().includes('manual')
  )

  if (!hasTrigger) {
    errors.push('Workflow must have a trigger node (cron, webhook, or manual trigger)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if workflow name follows conventions
 */
export function checkNamingConvention(name: string): {
  valid: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []

  // Check if too short
  if (name.length < 5) {
    issues.push('Workflow name is too short')
    suggestions.push('Use a more descriptive name (at least 5 characters)')
  }

  // Check if uses generic names
  const genericNames = ['workflow', 'test', 'my workflow', 'untitled']
  if (genericNames.some((generic) => name.toLowerCase().includes(generic))) {
    issues.push('Workflow uses a generic name')
    suggestions.push('Use a descriptive name that explains what the workflow does')
  }

  // Check if all caps
  if (name === name.toUpperCase() && name.length > 5) {
    suggestions.push('Consider using title case or sentence case instead of ALL CAPS')
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  }
}

// ============================================================================
// Execution Analysis
// ============================================================================

/**
 * Calculate execution success rate
 */
export function calculateSuccessRate(executions: N8nExecution[]): number {
  if (executions.length === 0) return 0

  const successful = executions.filter(
    (exec) => exec.finished && exec.status === 'success'
  ).length

  return (successful / executions.length) * 100
}

/**
 * Get execution duration in seconds
 */
export function getExecutionDuration(execution: N8nExecution): number | null {
  if (!execution.startedAt || !execution.stoppedAt) return null

  const start = new Date(execution.startedAt).getTime()
  const stop = new Date(execution.stoppedAt).getTime()

  return (stop - start) / 1000 // Convert to seconds
}

/**
 * Analyze execution patterns
 */
export function analyzeExecutionPatterns(executions: N8nExecution[]): {
  totalExecutions: number
  successRate: number
  averageDuration: number | null
  failureReasons: string[]
  peakHours: number[]
} {
  const successRate = calculateSuccessRate(executions)

  const durations = executions
    .map(getExecutionDuration)
    .filter((d): d is number => d !== null)

  const averageDuration =
    durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : null

  // Extract failure reasons (simplified)
  const failureReasons: string[] = []
  executions
    .filter((exec) => exec.status === 'error')
    .forEach((exec) => {
      if (exec.data?.resultData?.error) {
        failureReasons.push(exec.data.resultData.error.message || 'Unknown error')
      }
    })

  // Calculate peak hours (use UTC to be consistent)
  const hourCounts = new Map<number, number>()
  executions.forEach((exec) => {
    const hour = new Date(exec.startedAt).getUTCHours()
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
  })

  const peakHours = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour)

  return {
    totalExecutions: executions.length,
    successRate,
    averageDuration,
    failureReasons: [...new Set(failureReasons)],
    peakHours,
  }
}

// ============================================================================
// Export Helpers
// ============================================================================

/**
 * Sanitize workflow for export (remove sensitive data)
 */
export function sanitizeWorkflow(workflow: N8nWorkflow): N8nWorkflow {
  const sanitized = { ...workflow }

  // Remove IDs and timestamps
  delete sanitized.id
  delete sanitized.createdAt
  delete sanitized.updatedAt
  delete sanitized.versionId

  // Remove credential data (keep references)
  sanitized.nodes = sanitized.nodes.map((node) => ({
    ...node,
    credentials: node.credentials
      ? Object.fromEntries(
          Object.entries(node.credentials).map(([key, value]) => [
            key,
            { name: (value as any).name },
          ])
        )
      : undefined,
  }))

  return sanitized
}

/**
 * Generate workflow documentation
 */
export function generateWorkflowDocs(workflow: N8nWorkflow): string {
  const lines: string[] = []

  lines.push(`# ${workflow.name}`)
  lines.push('')

  if (workflow.tags && workflow.tags.length > 0) {
    lines.push(`**Tags**: ${workflow.tags.join(', ')}`)
    lines.push('')
  }

  lines.push(`**Status**: ${workflow.active ? '🟢 Active' : '⚫ Inactive'}`)
  lines.push(`**Nodes**: ${workflow.nodes.length}`)
  lines.push('')

  // Trigger information (case-insensitive)
  const trigger = workflow.nodes.find(
    (n) => n.type.toLowerCase().includes('trigger') || n.type.toLowerCase().includes('webhook') || n.type.toLowerCase().includes('cron')
  )

  if (trigger) {
    lines.push(`## Trigger`)
    lines.push(`- **Type**: ${trigger.type}`)
    lines.push(`- **Name**: ${trigger.name}`)
    lines.push('')
  }

  // Node list
  lines.push(`## Nodes`)
  workflow.nodes.forEach((node, idx) => {
    lines.push(`${idx + 1}. **${node.name}** (${node.type})`)
  })
  lines.push('')

  // Settings
  if (workflow.settings) {
    lines.push(`## Settings`)
    if (workflow.settings.timezone) {
      lines.push(`- **Timezone**: ${workflow.settings.timezone}`)
    }
    if (workflow.settings.executionTimeout) {
      lines.push(`- **Timeout**: ${workflow.settings.executionTimeout}s`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
