/**
 * Common Supabase types and interfaces
 * Based on infra/supabase/schema-tasks.sql
 */

/**
 * Task status enum
 */
export type TaskStatus = 'pending' | 'in_progress' | 'failed' | 'needs_fix' | 'completed' | 'cancelled';

/**
 * Task log status enum
 */
export type TaskLogStatus = 'info' | 'success' | 'warning' | 'error';

/**
 * Supervisor recommendation enum
 */
export type SupervisorRecommendation =
  | 'retry'
  | 'adjust_code'
  | 'manual_intervention'
  | 'skip'
  | 'cancel';

/**
 * Task record from tasks table
 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  plan_json: any | null;
  current_step: number;
  supervisor_summary: string | null;
  supervisor_recommendation: SupervisorRecommendation | null;
  repair_instruction: string | null;
  retry_count: number;
  next_action_after: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Task log record from task_logs table
 */
export interface TaskLog {
  id: string;
  task_id: string;
  attempt_number: number | null;
  source: string;
  status: TaskLogStatus;
  message: string;
  details_json: any | null;
  created_at: string;
}

/**
 * Task with latest log (from tasks_with_latest_log view)
 */
export interface TaskWithLatestLog extends Task {
  latest_log_id: string | null;
  latest_log_message: string | null;
  latest_log_status: TaskLogStatus | null;
  latest_log_created_at: string | null;
}

/**
 * Task needing attention (from tasks_needing_attention view)
 */
export interface TaskNeedingAttention extends Task {
  error_log_count: number;
}

/**
 * Task insert payload (excludes auto-generated fields)
 */
export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * Task update payload (all fields optional except id)
 */
export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Task log insert payload
 */
export type TaskLogInsert = Omit<TaskLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

/**
 * Task log update payload
 */
export type TaskLogUpdate = Partial<Omit<TaskLog, 'id' | 'created_at'>>;

/**
 * RPC function parameters
 */

export interface CreateTaskWithLogParams {
  p_title: string;
  p_description?: string | null;
  p_plan_json?: any | null;
  p_source?: string;
}

export interface CreateTaskWithLogResult {
  task_id: string;
  log_id: string;
}

export interface LogTaskActionParams {
  p_task_id: string;
  p_source: string;
  p_status: TaskLogStatus;
  p_message: string;
  p_details_json?: any | null;
  p_attempt_number?: number | null;
}

export interface UpdateTaskStatusParams {
  p_task_id: string;
  p_status: TaskStatus;
  p_source?: string;
  p_message?: string | null;
}

export interface GetTasksForRetryParams {
  p_max_retries?: number;
}

export interface GetTasksForRetryResult {
  task_id: string;
  title: string;
  retry_count: number;
  last_error: string;
}

export interface MarkTaskNeedsFixParams {
  p_task_id: string;
  p_supervisor_summary: string;
  p_supervisor_recommendation: SupervisorRecommendation;
  p_repair_instruction: string;
  p_next_action_after?: string | null;
}

/**
 * Supabase query options
 */
export interface QueryOptions {
  select?: string;
  limit?: number;
  offset?: number;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  single?: boolean;
}

/**
 * Supabase filter operators
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'contains'
  | 'containedBy'
  | 'rangeGt'
  | 'rangeGte'
  | 'rangeLt'
  | 'rangeLte'
  | 'rangeAdjacent'
  | 'overlaps'
  | 'textSearch';

/**
 * Supabase storage file metadata
 */
export interface StorageFileMetadata {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
}

/**
 * Supabase storage bucket
 */
export interface StorageBucket {
  id: string;
  name: string;
  owner: string;
  public: boolean;
  created_at: string;
  updated_at: string;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

/**
 * Supabase auth user
 */
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  phone: string | null;
  phone_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  role: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}

/**
 * Supabase realtime payload
 */
export interface RealtimePayload<T = any> {
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
}

/**
 * Database schema for TypeScript autocomplete
 * Extend this as you add more tables
 */
export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      task_logs: {
        Row: TaskLog;
        Insert: TaskLogInsert;
        Update: TaskLogUpdate;
      };
    };
    Views: {
      tasks_with_latest_log: {
        Row: TaskWithLatestLog;
      };
      tasks_needing_attention: {
        Row: TaskNeedingAttention;
      };
    };
    Functions: {
      create_task_with_log: {
        Args: CreateTaskWithLogParams;
        Returns: CreateTaskWithLogResult[];
      };
      log_task_action: {
        Args: LogTaskActionParams;
        Returns: string;
      };
      update_task_status: {
        Args: UpdateTaskStatusParams;
        Returns: boolean;
      };
      get_tasks_for_retry: {
        Args: GetTasksForRetryParams;
        Returns: GetTasksForRetryResult[];
      };
      mark_task_needs_fix: {
        Args: MarkTaskNeedsFixParams;
        Returns: boolean;
      };
    };
  };
}

/**
 * Supabase error types
 */
export interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

/**
 * Supabase response wrapper
 */
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  count: number | null;
  status: number;
  statusText: string;
}
