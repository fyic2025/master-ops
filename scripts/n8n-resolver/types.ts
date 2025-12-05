/**
 * n8n Issue Resolver - Type Definitions
 *
 * Comprehensive types for issue detection, resolution, and reporting.
 */

// ============================================================================
// Issue Types
// ============================================================================

export type IssueType =
  | 'FAILED_EXECUTION'
  | 'STALE_WORKFLOW'
  | 'RATE_LIMITED'
  | 'CONNECTION_FAILED'
  | 'DNS_FAILURE'
  | 'AUTH_EXPIRED'
  | 'CREDENTIAL_MISSING'
  | 'HMAC_ERROR'
  | 'WEBHOOK_FAILED'
  | 'HIGH_ERROR_RATE'
  | 'UNKNOWN'

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low'

export type ResolutionLevel = 'L0' | 'L1' | 'L2' | 'L3'

export type ResolutionAction =
  | 'auto_retry'
  | 'retry_with_backoff'
  | 'retry_after_delay'
  | 'reactivate'
  | 'replay_webhook'
  | 'create_task'
  | 'skip'
  | 'escalate'

// ============================================================================
// Issue Detection
// ============================================================================

export interface DetectedIssue {
  id: string
  type: IssueType
  source: 'n8n_api' | 'supabase' | 'integration_logs'
  workflowId?: string
  workflowName?: string
  executionId?: string
  errorMessage: string
  timestamp: Date
  severity: IssueSeverity
  retryable: boolean
  metadata?: Record<string, any>
}

export interface DetectionResult {
  issues: DetectedIssue[]
  totalScanned: number
  lookbackHours: number
  detectedAt: Date
}

// ============================================================================
// Issue Resolution
// ============================================================================

export interface ResolutionStrategy {
  type: IssueType
  level: ResolutionLevel
  action: ResolutionAction
  description: string
  execute: (issue: DetectedIssue) => Promise<ResolutionResult>
}

export interface ResolutionResult {
  issueId: string
  success: boolean
  action: ResolutionAction
  level: ResolutionLevel
  details: string
  durationMs: number
  taskCreated?: string
  escalated?: boolean
}

// ============================================================================
// Configuration
// ============================================================================

export interface ResolverConfig {
  maxIssuesPerRun: number
  autoRetryLimit: number
  lookbackHours: number
  dryRun: boolean
  rateLimitDelayMs: number
  connectionRetryDelayMs: number
  apiRequestDelayMs: number
}

export const DEFAULT_CONFIG: ResolverConfig = {
  maxIssuesPerRun: 50,
  autoRetryLimit: 3,
  lookbackHours: 24,
  dryRun: false,
  rateLimitDelayMs: 60000,
  connectionRetryDelayMs: 2000,
  apiRequestDelayMs: 1000
}

// ============================================================================
// Reporting
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'down'

export interface HealthSummary {
  n8n: HealthStatus
  webhooks: HealthStatus
  integrations: HealthStatus
}

export interface MorningBriefing {
  timestamp: Date
  durationMs: number
  summary: {
    issuesDetected: number
    autoResolved: number
    tasksCreated: number
    skipped: number
    failed: number
  }
  healthStatus: HealthSummary
  autoFixedIssues: ResolutionResult[]
  pendingTasks: TaskCreated[]
  recommendations: string[]
}

export interface TaskCreated {
  id?: string
  title: string
  description: string
  business: string
  category: string
  priority: number
  issueType: IssueType
}

// ============================================================================
// Supabase Log Entry
// ============================================================================

export interface IntegrationLogEntry {
  source: string
  service: string
  operation: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  level: 'debug' | 'info' | 'warn' | 'error'
  details_json?: Record<string, any>
  workflow_id?: string
  business_id?: string
  duration_ms?: number
}

// ============================================================================
// Error Classification Patterns
// ============================================================================

export const RETRYABLE_PATTERNS: RegExp[] = [
  /429/,
  /502/,
  /503/,
  /504/,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /EAI_AGAIN/i,
  /network error/i,
  /socket hang up/i,
  /ENOTFOUND/i
]

export const AUTH_PATTERNS: RegExp[] = [
  /401/,
  /403/,
  /unauthorized/i,
  /forbidden/i,
  /invalid.*token/i,
  /token.*expired/i,
  /oauth/i,
  /invalid_grant/i
]

export const HMAC_PATTERNS: RegExp[] = [
  /hmac/i,
  /signature/i,
  /digest/i
]

export const CREDENTIAL_PATTERNS: RegExp[] = [
  /credential.*missing/i,
  /credential.*not.*found/i,
  /no.*credential/i
]

// ============================================================================
// Business Detection
// ============================================================================

export function detectBusiness(workflowName: string): string {
  const name = workflowName.toLowerCase()

  if (name.includes('boo') || name.includes('bigcommerce') || name.includes('bc-')) {
    return 'boo'
  }
  if (name.includes('teelixir') || name.includes('tlx')) {
    return 'teelixir'
  }
  if (name.includes('elevate') || name.includes('wholesale')) {
    return 'elevate'
  }
  if (name.includes('rhf') || name.includes('red hill') || name.includes('woocommerce')) {
    return 'rhf'
  }

  return 'overall'
}

// ============================================================================
// Severity Calculation
// ============================================================================

export function calculateSeverity(issue: Partial<DetectedIssue>): IssueSeverity {
  const type = issue.type
  const name = issue.workflowName?.toLowerCase() || ''

  // Critical: Auth issues on critical workflows
  if (type === 'AUTH_EXPIRED' && (name.includes('order') || name.includes('sync'))) {
    return 'critical'
  }

  // Critical: Multiple failures on same workflow
  if (type === 'HIGH_ERROR_RATE') {
    return 'critical'
  }

  // High: Auth/credential issues
  if (type === 'AUTH_EXPIRED' || type === 'CREDENTIAL_MISSING') {
    return 'high'
  }

  // Medium: Connection/rate issues (usually recoverable)
  if (type === 'RATE_LIMITED' || type === 'CONNECTION_FAILED' || type === 'DNS_FAILURE') {
    return 'medium'
  }

  // Low: Single failures, webhooks, unknown
  return 'low'
}
