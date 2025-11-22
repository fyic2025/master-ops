-- ============================================
-- Supabase RPC Helper Functions
-- Add these functions for advanced task management
-- ============================================

-- Function 1: Create task with automatic logging
CREATE OR REPLACE FUNCTION create_task_with_log(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_plan_json JSONB DEFAULT NULL,
  p_source TEXT DEFAULT 'system'
)
RETURNS TABLE(task_id UUID, log_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
  v_log_id UUID;
BEGIN
  -- Insert task
  INSERT INTO tasks (title, description, plan_json, status)
  VALUES (p_title, p_description, p_plan_json, 'pending')
  RETURNING id INTO v_task_id;

  -- Log the creation
  INSERT INTO task_logs (task_id, source, status, message)
  VALUES (v_task_id, p_source, 'info', 'Task created: ' || p_title)
  RETURNING id INTO v_log_id;

  -- Return both IDs
  RETURN QUERY SELECT v_task_id, v_log_id;
END;
$$;

-- Function 2: Log task action
CREATE OR REPLACE FUNCTION log_task_action(
  p_task_id UUID,
  p_source TEXT,
  p_status TEXT,
  p_message TEXT,
  p_details_json JSONB DEFAULT NULL,
  p_attempt_number INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO task_logs (
    task_id,
    source,
    status,
    message,
    details_json,
    attempt_number
  )
  VALUES (
    p_task_id,
    p_source,
    p_status,
    p_message,
    p_details_json,
    p_attempt_number
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function 3: Update task status with logging
CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id UUID,
  p_status TEXT,
  p_source TEXT DEFAULT 'system',
  p_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update task status
  UPDATE tasks
  SET status = p_status, updated_at = NOW()
  WHERE id = p_task_id;

  -- Log the status change
  INSERT INTO task_logs (task_id, source, status, message)
  VALUES (
    p_task_id,
    p_source,
    'info',
    COALESCE(p_message, 'Status changed to: ' || p_status)
  );

  RETURN FOUND;
END;
$$;

-- Function 4: Get tasks needing retry
CREATE OR REPLACE FUNCTION get_tasks_for_retry(
  p_max_retries INT DEFAULT 3
)
RETURNS TABLE(
  task_id UUID,
  title TEXT,
  retry_count INT,
  last_error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.retry_count,
    l.message as last_error
  FROM tasks t
  LEFT JOIN LATERAL (
    SELECT message
    FROM task_logs
    WHERE task_id = t.id AND status = 'error'
    ORDER BY created_at DESC
    LIMIT 1
  ) l ON true
  WHERE t.status IN ('failed', 'needs_fix')
    AND t.retry_count < p_max_retries
    AND (t.next_action_after IS NULL OR t.next_action_after <= NOW());
END;
$$;

-- Function 5: Mark task as needing fix
CREATE OR REPLACE FUNCTION mark_task_needs_fix(
  p_task_id UUID,
  p_supervisor_summary TEXT,
  p_supervisor_recommendation TEXT,
  p_repair_instruction TEXT,
  p_next_action_after TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tasks
  SET
    status = 'needs_fix',
    supervisor_summary = p_supervisor_summary,
    supervisor_recommendation = p_supervisor_recommendation,
    repair_instruction = p_repair_instruction,
    next_action_after = p_next_action_after,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Log the supervisor analysis
  INSERT INTO task_logs (task_id, source, status, message, details_json)
  VALUES (
    p_task_id,
    'n8n_supervisor',
    'warning',
    'Task marked for repair',
    jsonb_build_object(
      'summary', p_supervisor_summary,
      'recommendation', p_supervisor_recommendation
    )
  );

  RETURN FOUND;
END;
$$;

-- ============================================
-- Verification Query
-- Run this after to verify functions were created
-- ============================================

SELECT
  'RPC Functions Created' as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_task_with_log',
    'log_task_action',
    'update_task_status',
    'get_tasks_for_retry',
    'mark_task_needs_fix'
  );

-- Expected result: function_count = 5
