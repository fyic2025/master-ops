/**
 * Supervisor Module - Task State Fetcher
 *
 * Fetches task state and recent logs for supervisor analysis.
 * Used by n8n workflows and Claude Code to analyze failed tasks and determine recovery strategies.
 */

import { serviceClient } from '../../../infra/supabase/client'
import type { Task, TaskLog } from '../../../infra/supabase/client'

/**
 * Task state with logs and formatted inputs for AI analysis
 */
export interface TaskState {
  task: Task | null
  logs: TaskLog[]
  summaryInputs: {
    title: string
    description: string | null
    plan_json: any | null
    current_step: number
    last_logs_text: string
  } | null
}

/**
 * Get complete task state including recent logs
 *
 * Fetches:
 * - Task record with full details
 * - Last 10 log entries (most recent first)
 * - Formatted summary inputs for AI supervisor
 *
 * @param taskId - UUID of the task to fetch
 * @returns TaskState object or null if task not found
 *
 * @example
 * ```typescript
 * const state = await getTaskState('task-uuid-here')
 * if (state.task?.status === 'failed') {
 *   // Analyze with AI supervisor
 *   const analysis = await analyzeLogs(state.summaryInputs)
 * }
 * ```
 */
export async function getTaskState(taskId: string): Promise<TaskState> {
  if (!serviceClient) {
    throw new Error(
      'Service client not available. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env'
    )
  }

  // Fetch task
  const { data: task, error: taskError } = await serviceClient
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (taskError) {
    throw new Error(`Failed to fetch task ${taskId}: ${taskError.message}`)
  }

  if (!task) {
    return {
      task: null,
      logs: [],
      summaryInputs: null,
    }
  }

  // Fetch last 10 logs for this task
  const { data: logs, error: logsError } = await serviceClient
    .from('task_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (logsError) {
    throw new Error(`Failed to fetch logs for task ${taskId}: ${logsError.message}`)
  }

  // Format logs as human-readable text for AI analysis
  const logsArray = logs || []
  const last_logs_text = logsArray.length > 0
    ? logsArray
        .reverse() // Show oldest first for chronological order
        .map((log, index) => {
          const timestamp = new Date(log.created_at).toISOString()
          const details = log.details_json
            ? `\nDetails: ${JSON.stringify(log.details_json, null, 2)}`
            : ''
          return `[${index + 1}] ${timestamp} | ${log.source} | ${log.status}\n${log.message}${details}`
        })
        .join('\n\n---\n\n')
    : 'No logs available'

  // Prepare summary inputs for AI supervisor
  const summaryInputs = {
    title: task.title,
    description: task.description,
    plan_json: task.plan_json,
    current_step: task.current_step,
    last_logs_text,
  }

  return {
    task,
    logs: logsArray.reverse(), // Return in chronological order
    summaryInputs,
  }
}

/**
 * Get all tasks that need supervisor attention
 *
 * Fetches tasks with status 'failed' or 'needs_fix'
 *
 * @returns Array of task IDs that need attention
 *
 * @example
 * ```typescript
 * const taskIds = await getTasksNeedingAttention()
 * for (const taskId of taskIds) {
 *   const state = await getTaskState(taskId)
 *   // Process each task
 * }
 * ```
 */
export async function getTasksNeedingAttention(): Promise<string[]> {
  if (!serviceClient) {
    throw new Error(
      'Service client not available. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env'
    )
  }

  const { data: tasks, error } = await serviceClient
    .from('tasks')
    .select('id')
    .in('status', ['failed', 'needs_fix'])
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch tasks needing attention: ${error.message}`)
  }

  return (tasks || []).map(t => t.id)
}

/**
 * Get tasks ready for retry based on retry count and schedule
 *
 * Uses the database RPC function get_tasks_for_retry
 *
 * @param maxRetries - Maximum number of retries allowed (default: 3)
 * @returns Array of tasks ready for retry with error details
 *
 * @example
 * ```typescript
 * const tasksToRetry = await getTasksForRetry(5)
 * for (const task of tasksToRetry) {
 *   console.log(`Retry ${task.title}: ${task.last_error}`)
 * }
 * ```
 */
export async function getTasksForRetry(maxRetries: number = 3): Promise<
  Array<{
    task_id: string
    title: string
    retry_count: number
    last_error: string | null
  }>
> {
  if (!serviceClient) {
    throw new Error(
      'Service client not available. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env'
    )
  }

  const { data, error } = await serviceClient.rpc('get_tasks_for_retry', {
    p_max_retries: maxRetries,
  })

  if (error) {
    throw new Error(`Failed to get tasks for retry: ${error.message}`)
  }

  return data || []
}
