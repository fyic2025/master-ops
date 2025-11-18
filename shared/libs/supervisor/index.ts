/**
 * Supervisor Module
 *
 * Provides utilities for analyzing and recovering from failed tasks.
 * Used by n8n workflows and Claude Code for autonomous task recovery.
 *
 * @module supervisor
 *
 * @example
 * ```typescript
 * import { getTaskState, getTasksNeedingAttention } from './shared/libs/supervisor'
 *
 * // Get all tasks that need attention
 * const taskIds = await getTasksNeedingAttention()
 *
 * // Analyze each task
 * for (const taskId of taskIds) {
 *   const state = await getTaskState(taskId)
 *
 *   // Use summaryInputs for AI analysis
 *   console.log(state.summaryInputs.last_logs_text)
 *
 *   // Make decision based on task state
 *   if (state.task.retry_count < 3) {
 *     // Retry
 *   } else {
 *     // Escalate to human
 *   }
 * }
 * ```
 */

export {
  getTaskState,
  getTasksNeedingAttention,
  getTasksForRetry,
  type TaskState,
} from './fetchTaskState'
