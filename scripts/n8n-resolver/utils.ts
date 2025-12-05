/**
 * n8n Issue Resolver - Shared Utilities
 *
 * Common functions for delay, logging, error classification, and Supabase operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  IssueType,
  IntegrationLogEntry,
  RETRYABLE_PATTERNS,
  AUTH_PATTERNS,
  HMAC_PATTERNS,
  CREDENTIAL_PATTERNS
} from './types'

// ============================================================================
// Environment & Clients
// ============================================================================

let masterSupabase: SupabaseClient | null = null
let booSupabase: SupabaseClient | null = null

export function getMasterSupabase(): SupabaseClient {
  if (!masterSupabase) {
    const url = process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!key) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
    }
    masterSupabase = createClient(url, key)
  }
  return masterSupabase
}

export function getBooSupabase(): SupabaseClient {
  if (!booSupabase) {
    const url = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co'
    const key = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || ''
    if (!key) {
      throw new Error('BOO_SUPABASE_SERVICE_ROLE_KEY is required')
    }
    booSupabase = createClient(url, key)
  }
  return booSupabase
}

// ============================================================================
// Delay & Rate Limiting
// ============================================================================

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function exponentialBackoff(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000
): Promise<void> {
  const delayMs = Math.min(Math.pow(2, attempt) * baseDelayMs, maxDelayMs)
  await delay(delayMs)
}

// ============================================================================
// Error Classification
// ============================================================================

export function classifyError(errorMessage: string): IssueType {
  const msg = errorMessage || ''

  // Check patterns in order of specificity
  if (HMAC_PATTERNS.some(p => p.test(msg))) {
    return 'HMAC_ERROR'
  }

  if (CREDENTIAL_PATTERNS.some(p => p.test(msg))) {
    return 'CREDENTIAL_MISSING'
  }

  if (AUTH_PATTERNS.some(p => p.test(msg))) {
    return 'AUTH_EXPIRED'
  }

  if (/429/.test(msg) || /rate.?limit/i.test(msg)) {
    return 'RATE_LIMITED'
  }

  if (/eai_again|dns/i.test(msg)) {
    return 'DNS_FAILURE'
  }

  if (RETRYABLE_PATTERNS.some(p => p.test(msg))) {
    return 'CONNECTION_FAILED'
  }

  return 'UNKNOWN'
}

export function isRetryable(errorMessage: string): boolean {
  const issueType = classifyError(errorMessage)
  return ['RATE_LIMITED', 'CONNECTION_FAILED', 'DNS_FAILURE', 'FAILED_EXECUTION'].includes(issueType)
}

// ============================================================================
// Logging
// ============================================================================

const LOG_PREFIX = '[n8n-resolver]'

export function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString()
  const prefix = `${timestamp} ${LOG_PREFIX}`

  switch (level) {
    case 'error':
      console.error(`${prefix} ERROR: ${message}`)
      break
    case 'warn':
      console.warn(`${prefix} WARN: ${message}`)
      break
    default:
      console.log(`${prefix} ${message}`)
  }
}

export async function logToSupabase(entry: IntegrationLogEntry): Promise<void> {
  try {
    const supabase = getMasterSupabase()

    // Only include columns that exist in the table
    // Extra fields go into details_json
    const { workflow_id, business_id, duration_ms, details_json, ...baseEntry } = entry

    const mergedDetailsJson = {
      ...details_json,
      ...(workflow_id && { workflow_id }),
      ...(business_id && { business_id }),
      ...(duration_ms && { duration_ms })
    }

    const { error } = await supabase.from('integration_logs').insert({
      ...baseEntry,
      details_json: Object.keys(mergedDetailsJson).length > 0 ? mergedDetailsJson : null,
      created_at: new Date().toISOString()
    })

    if (error) {
      log(`Failed to log to Supabase: ${error.message}`, 'warn')
    }
  } catch (err) {
    log(`Supabase logging error: ${err}`, 'warn')
  }
}

// ============================================================================
// Dashboard Task Creation
// ============================================================================

export interface CreateTaskInput {
  title: string
  description: string
  business: string
  category: string
  priority: number
  instructions?: string
  source_file?: string
  execution_type?: 'manual' | 'auto'
}

export async function createDashboardTask(task: CreateTaskInput): Promise<string | null> {
  try {
    const supabase = getMasterSupabase()

    // Check for duplicate recent tasks
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('title', task.title)
      .in('status', ['pending', 'pending_input', 'in_progress'])
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      log(`Task already exists: ${task.title}`, 'info')
      return existing[0].id
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        status: 'pending_input',
        execution_type: task.execution_type || 'manual',
        created_by: 'n8n-resolver'
      })
      .select('id')
      .single()

    if (error) {
      log(`Failed to create task: ${error.message}`, 'error')
      return null
    }

    log(`Created task: ${task.title} (${data.id})`)

    // Log task creation
    await logToSupabase({
      source: 'system',
      service: 'n8n-resolver',
      operation: 'create_task',
      status: 'success',
      message: `Created task: ${task.title}`,
      level: 'info',
      details_json: { task_id: data.id, task_title: task.title }
    })

    return data.id
  } catch (err) {
    log(`Task creation error: ${err}`, 'error')
    return null
  }
}

// ============================================================================
// Job Status Update
// ============================================================================

export async function updateJobStatus(
  jobName: string,
  business: string,
  status: 'healthy' | 'stale' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = getMasterSupabase()

    const update: Record<string, any> = {
      last_run_at: new Date().toISOString(),
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString()
    }

    if (status === 'healthy') {
      update.last_success_at = update.last_run_at
    }

    const { error } = await supabase
      .from('dashboard_job_status')
      .update(update)
      .eq('job_name', jobName)
      .eq('business', business)

    if (error) {
      log(`Failed to update job status: ${error.message}`, 'warn')
    }
  } catch (err) {
    log(`Job status update error: ${err}`, 'warn')
  }
}

// ============================================================================
// Time Utilities
// ============================================================================

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    dateStyle: 'short',
    timeStyle: 'medium'
  })
}

// ============================================================================
// Workflow Name Parsing
// ============================================================================

export function getExpectedIntervalHours(workflowName: string): number {
  const name = workflowName.toLowerCase()

  if (name.includes('health-check') || name.includes('-5min')) return 0.5
  if (name.includes('-15min')) return 0.5
  if (name.includes('-hourly') || name.includes('every-hour')) return 2
  if (name.includes('-4h') || name.includes('4-hour')) return 5
  if (name.includes('-6h') || name.includes('6-hour')) return 8
  if (name.includes('-daily') || name.includes('daily')) return 26
  if (name.includes('-weekly') || name.includes('weekly')) return 170

  // Default: assume daily with buffer
  return 26
}
