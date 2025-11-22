/**
 * Supabase Database Type Definitions
 * Generated for master-ops shared database
 *
 * Coverage:
 * - 15 tables (6 critical production, 9 agent tables)
 * - 21 views
 * - 9 stored procedures
 */

// ============================================================================
// CORE TABLES
// ============================================================================

export interface Business {
  id: string // UUID
  name: string
  slug: string
  type: 'ecommerce' | 'wholesale' | 'marketplace' | 'other'
  status: 'active' | 'inactive' | 'archived'
  hubspot_company_id?: string
  unleashed_customer_code?: string
  metadata?: Record<string, any>
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface IntegrationLog {
  id: string // UUID
  source: 'hubspot' | 'unleashed' | 'n8n' | 'supabase' | 'system' | 'workflow' | 'integration' | 'cli'
  service?: string
  operation?: string
  level: 'debug' | 'info' | 'warn' | 'error'
  status: 'success' | 'failure' | 'pending'
  message: string
  details_json?: Record<string, any>
  duration_ms?: number
  user_id?: string
  business_id?: string // Note: Currently TEXT, should be UUID FK
  workflow_id?: string
  created_at: string // ISO timestamp
}

export interface WorkflowExecutionLog {
  id: string // UUID
  workflow_id: string
  workflow_name: string
  execution_id: string
  status: 'success' | 'error' | 'failed' | 'running' | 'waiting'
  mode: 'manual' | 'trigger' | 'webhook' | 'scheduled'
  started_at: string // ISO timestamp
  finished_at?: string // ISO timestamp
  duration_ms?: number
  data_json?: Record<string, any>
  error_message?: string
  nodes_executed?: number
  nodes_failed?: number
  business_id?: string // Note: Currently TEXT, should be UUID FK
  created_at: string // ISO timestamp
}

export interface ApiMetric {
  id: string // UUID
  service: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  status_code: number
  success: boolean
  duration_ms: number
  response_size_bytes?: number
  rate_limit_remaining?: number
  error_message?: string
  business_id?: string // Note: Currently TEXT, should be UUID FK
  created_at: string // ISO timestamp
}

export interface Task {
  id: string // UUID
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'failed' | 'needs_fix' | 'completed' | 'cancelled'
  plan_json?: Record<string, any>
  current_step?: number
  supervisor_summary?: string
  supervisor_recommendation?: string
  repair_instruction?: string
  retry_count: number
  next_action_after?: string // ISO timestamp
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface TaskLog {
  id: string // UUID
  task_id: string // FK to tasks.id
  attempt_number: number
  source: 'claude_code' | 'n8n_supervisor' | 'human' | 'system'
  status: 'started' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'info'
  message: string
  details_json?: Record<string, any>
  created_at: string // ISO timestamp
}

// ============================================================================
// AGENT TABLES
// ============================================================================

export interface LighthouseAudit {
  audit_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  environment: 'production' | 'staging' | 'development'
  page_url: string
  performance_score: number // 0-100
  accessibility_score: number // 0-100
  best_practices_score: number // 0-100
  seo_score: number // 0-100
  pwa_score?: number // 0-100
  lcp_value?: number // milliseconds
  fid_value?: number // milliseconds
  cls_value?: number // score
  tti_value?: number // milliseconds
  tbt_value?: number // milliseconds
  speed_index?: number // milliseconds
  change_id?: string // FK to theme_changes
  deployment_id?: string // FK to deployment_history
  audit_timestamp: string // ISO timestamp
  created_at: string // ISO timestamp
}

export interface PerformanceTrend {
  trend_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  environment: 'production' | 'staging'
  page_type: string
  avg_performance: number
  avg_accessibility: number
  avg_seo: number
  avg_lcp: number
  avg_fid: number
  avg_cls: number
  performance_trend: 'improving' | 'declining' | 'stable'
  data_points: number
  start_date: string // ISO date
  end_date: string // ISO date
  created_at: string // ISO timestamp
}

export interface PerformanceAlert {
  alert_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  severity: 'critical' | 'warning' | 'info'
  alert_type: 'performance_drop' | 'accessibility_violation' | 'seo_issue' | 'threshold_breach'
  metric_name: string
  current_value: number
  threshold_value: number
  page_url?: string
  audit_id?: string // FK to lighthouse_audits
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored'
  acknowledged_by?: string
  resolved_at?: string // ISO timestamp
  notes?: string
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface ThemeChange {
  change_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  change_type: 'optimization' | 'feature' | 'bugfix' | 'design' | 'integration'
  title: string
  description?: string
  files_modified: string[]
  lighthouse_before?: Record<string, any>
  lighthouse_after?: Record<string, any>
  performance_impact?: number
  git_commit_hash?: string
  deployed: boolean
  deployment_id?: string // FK to deployment_history
  rollback_available: boolean
  created_by?: string
  created_at: string // ISO timestamp
}

export interface AccessibilityAudit {
  audit_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  page_url: string
  violations_critical: number
  violations_serious: number
  violations_moderate: number
  violations_minor: number
  violations_total: number
  wcag_level_a_compliant: boolean
  wcag_level_aa_compliant: boolean
  wcag_level_aaa_compliant: boolean
  tool_name: string
  tool_version?: string
  violation_details?: Record<string, any>
  audit_timestamp: string // ISO timestamp
  created_at: string // ISO timestamp
}

export interface SeoImplementationTask {
  task_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  category: 'technical' | 'content' | 'on_page' | 'schema' | 'performance'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description?: string
  pages_affected: string[]
  status: 'backlog' | 'todo' | 'in_progress' | 'testing' | 'completed' | 'blocked'
  assigned_to?: string
  estimated_impact?: 'high' | 'medium' | 'low'
  completed_at?: string // ISO timestamp
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface DeploymentHistory {
  deployment_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  environment: 'production' | 'staging'
  theme_version: string
  change_ids: string[] // Array of theme_change.change_id
  validation_results?: Record<string, any>
  lighthouse_scores?: Record<string, any>
  status: 'pending' | 'deployed' | 'failed' | 'rolled_back'
  deployed_by?: string
  approved_by?: string
  deployed_at?: string // ISO timestamp
  rolled_back: boolean
  rollback_reason?: string
  created_at: string // ISO timestamp
}

export interface AgentActivityLog {
  activity_id: string // UUID (primary key)
  agent_name: 'lighthouse_monitor' | 'theme_optimizer' | 'accessibility_checker' | 'seo_analyzer' | 'deployment_manager'
  brand: 'teelixir' | 'elevate'
  activity_type: string
  status: 'started' | 'running' | 'completed' | 'failed'
  message?: string
  details?: Record<string, any>
  duration_seconds?: number
  started_at: string // ISO timestamp
  completed_at?: string // ISO timestamp
  created_at: string // ISO timestamp
}

export interface PerformanceBudget {
  budget_id: string // UUID (primary key)
  brand: 'teelixir' | 'elevate'
  page_type: string
  metric_name: 'performance_score' | 'lcp' | 'fid' | 'cls' | 'tti' | 'tbt' | 'speed_index'
  threshold_value: number
  current_value?: number
  status: 'passing' | 'warning' | 'failing'
  alert_on_breach: boolean
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

// ============================================================================
// VIEWS (Read-only query results)
// ============================================================================

export interface TaskWithLatestLog {
  id: string
  title: string
  description?: string
  status: Task['status']
  retry_count: number
  created_at: string
  updated_at: string
  latest_log_id?: string
  latest_log_message?: string
  latest_log_status?: TaskLog['status']
  latest_log_created_at?: string
}

export interface TaskNeedingAttention {
  id: string
  title: string
  status: 'failed' | 'needs_fix'
  retry_count: number
  error_count: number
  last_error_message?: string
  created_at: string
}

export interface RecentError {
  id: string
  source: IntegrationLog['source']
  service?: string
  operation?: string
  message: string
  details_json?: Record<string, any>
  created_at: string
}

export interface IntegrationHealthSummary {
  source: IntegrationLog['source']
  total_logs: number
  error_count: number
  success_count: number
  error_rate: number
  last_log_at: string
}

export interface BusinessIntegrationHealth {
  business_id: string
  business_name: string
  business_slug: string
  total_operations: number
  failed_operations: number
  success_rate: number
  active_integrations: number
  last_activity: string
}

export interface WorkflowPerformanceSummary {
  workflow_name: string
  total_executions: number
  successful_executions: number
  failed_executions: number
  success_rate: number
  avg_duration_ms: number
  last_execution: string
}

export interface ApiPerformanceSummary {
  service: string
  endpoint: string
  total_calls: number
  success_count: number
  error_count: number
  success_rate: number
  avg_duration_ms: number
  p95_duration_ms?: number
  p99_duration_ms?: number
}

export interface BusinessActivitySummary {
  business_id: string
  business_name: string
  business_slug: string
  total_operations: number
  integration_logs: number
  workflow_executions: number
  api_calls: number
  success_rate: number
  last_activity: string
}

export interface BusinessNeedingAttention {
  business_id: string
  business_name: string
  business_slug: string
  recent_errors: number
  error_rate: number
  issues: string[]
}

export interface StaleIntegration {
  source: IntegrationLog['source']
  last_activity: string
  hours_since_activity: number
}

// ============================================================================
// STORED PROCEDURE PARAMETERS & RETURN TYPES
// ============================================================================

export interface CreateTaskWithLogParams {
  p_title: string
  p_description?: string
  p_plan_json?: Record<string, any>
  p_source: TaskLog['source']
}

export interface CreateTaskWithLogResult {
  task_id: string
  log_id: string
}

export interface LogTaskActionParams {
  p_task_id: string
  p_source: TaskLog['source']
  p_status: TaskLog['status']
  p_message: string
  p_details_json?: Record<string, any>
  p_attempt_number?: number
}

export interface UpdateTaskStatusParams {
  p_task_id: string
  p_status: Task['status']
  p_source: TaskLog['source']
  p_message: string
}

export interface GetTasksForRetryParams {
  p_max_retries?: number
}

export interface GetTasksForRetryResult {
  task_id: string
  title: string
  retry_count: number
  last_error: string
}

export interface MarkTaskNeedsFixParams {
  p_task_id: string
  p_supervisor_summary: string
  p_supervisor_recommendation: string
  p_repair_instruction: string
  p_next_action_after?: string // ISO timestamp
}

export interface CleanupOldLogsParams {
  integration_logs_days?: number
  workflow_logs_days?: number
  api_metrics_days?: number
}

export interface CleanupOldLogsResult {
  int_deleted: number
  wf_deleted: number
  api_deleted: number
}

export interface GetErrorRateParams {
  p_source: IntegrationLog['source']
  p_hours?: number
}

export interface GetErrorRateResult {
  total_logs: number
  error_count: number
  error_rate: number
}

export interface GetBusinessStatsParams {
  p_business_slug: string
  p_hours?: number
}

export interface GetBusinessStatsResult {
  total_ops: number
  success_ops: number
  failed_ops: number
  success_rate: number
  avg_duration_ms: number
  active_integrations: number
  error_sources: string[]
}

// ============================================================================
// HEALTH CHECK RESULT TYPES
// ============================================================================

export interface HealthCheckResult {
  timestamp: string
  overall_status: 'healthy' | 'warning' | 'critical'
  checks: {
    connectivity: boolean
    businesses: {
      total: number
      with_hubspot: number
      with_unleashed: number
    }
    integrations: {
      last_24h: {
        total: number
        errors: number
        error_rate: number
      }
      by_source: Array<{
        source: IntegrationLog['source']
        total: number
        errors: number
        error_rate: number
        status: 'healthy' | 'warning' | 'critical'
      }>
    }
    workflows: {
      last_24h: {
        total: number
        failures: number
        failure_rate: number
      }
      recent_failures: Array<{
        workflow_name: string
        execution_id: string
        error: string
      }>
    }
    tasks: {
      pending: number
      in_progress: number
      failed: number
      needs_fix: number
      tasks_needing_attention: Array<{
        id: string
        title: string
        status: Task['status']
        retry_count: number
      }>
    }
    stale_integrations: string[]
  }
  warnings: string[]
  critical_issues: string[]
}

// ============================================================================
// PERFORMANCE AUDIT RESULT TYPES
// ============================================================================

export interface PerformanceAuditResult {
  timestamp: string
  table_sizes: Array<{
    table_name: string
    total_size: string
    table_size: string
    indexes_size: string
    row_count: number
    dead_rows: number
    last_vacuum: string | null
    last_autovacuum: string | null
  }>
  missing_indexes: Array<{
    table_name: string
    column_name: string
    reason: string
    recommended_index: string
  }>
  jsonb_columns: Array<{
    table_name: string
    column_name: string
    avg_width_bytes: number
    has_index: boolean
    recommendation: string
  }>
  recommendations: string[]
}

// ============================================================================
// CLEANUP RESULT TYPES
// ============================================================================

export interface CleanupResult {
  timestamp: string
  dry_run: boolean
  logs_cleaned: {
    integration_logs: number
    workflow_logs: number
    api_metrics: number
  }
  orphaned_records: {
    task_logs_without_tasks: number
    workflow_logs_stale: number
  }
  stale_tasks: Array<{
    id: string
    title: string
    status: string
    age_days: number
  }>
  maintenance_performed: string[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DatabaseTable =
  | 'businesses'
  | 'integration_logs'
  | 'workflow_execution_logs'
  | 'api_metrics'
  | 'tasks'
  | 'task_logs'
  | 'lighthouse_audits'
  | 'performance_trends'
  | 'performance_alerts'
  | 'theme_changes'
  | 'accessibility_audits'
  | 'seo_implementation_tasks'
  | 'deployment_history'
  | 'agent_activity_log'
  | 'performance_budgets'

export type DatabaseView =
  | 'tasks_with_latest_log'
  | 'tasks_needing_attention'
  | 'recent_errors'
  | 'integration_health_summary'
  | 'business_integration_health'
  | 'workflow_performance_summary'
  | 'api_performance_summary'
  | 'business_activity'
  | 'businesses_needing_attention'
  | 'stale_integrations'

export type StoredProcedure =
  | 'create_task_with_log'
  | 'log_task_action'
  | 'update_task_status'
  | 'get_tasks_for_retry'
  | 'mark_task_needs_fix'
  | 'cleanup_old_logs'
  | 'get_error_rate'
  | 'get_business_stats'
  | 'update_updated_at_column'

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isHealthy(status: HealthCheckResult['overall_status']): boolean {
  return status === 'healthy'
}

export function isWarning(status: HealthCheckResult['overall_status']): boolean {
  return status === 'warning'
}

export function isCritical(status: HealthCheckResult['overall_status']): boolean {
  return status === 'critical'
}

export function isTaskActive(status: Task['status']): boolean {
  return status === 'pending' || status === 'in_progress'
}

export function isTaskCompleted(status: Task['status']): boolean {
  return status === 'completed'
}

export function isTaskFailed(status: Task['status']): boolean {
  return status === 'failed' || status === 'needs_fix'
}
