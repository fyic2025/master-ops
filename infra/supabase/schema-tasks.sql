-- ============================================================================
-- AI-MANAGED TASK TRACKING SCHEMA
-- ============================================================================
--
-- PURPOSE:
-- This schema defines tables for tracking AI-managed tasks across the
-- master-ops infrastructure. It enables autonomous task execution with
-- supervision, error recovery, and retry logic.
--
-- WORKFLOW:
-- 1. Tasks are created (manually or via n8n) with a plan and initial status
-- 2. Claude Code executes tasks step-by-step, logging progress
-- 3. If a task fails, an AI supervisor (via n8n) analyzes the logs
-- 4. Supervisor determines next action: retry, adjust code, or escalate to human
-- 5. Claude Code can resume tasks based on repair instructions
-- 6. All actions are logged to task_logs for full audit trail
--
-- ACTORS:
-- - Claude Code: Executes tasks, logs progress, reads repair instructions
-- - n8n Workflows: Creates tasks, runs supervisor logic, schedules retries
-- - AI Supervisor: Analyzes failures, generates recommendations & repair instructions
-- - Human Operators: Review stuck tasks, provide guidance when needed
--
-- USE CASES:
-- - Automated code deployments with error recovery
-- - Data migrations with checkpointing
-- - Multi-step business automations (order processing, email campaigns)
-- - Scheduled maintenance tasks with retry logic
-- - Cross-business workflow orchestration
--
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
-- Stores AI-managed tasks with execution plans, status, and recovery metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Task metadata
    title TEXT NOT NULL,
    description TEXT,

    -- Dashboard organization (for UI grouping)
    business TEXT,  -- 'teelixir', 'boo', 'elevate', 'rhf', 'overall'
    category TEXT,  -- 'automations', 'seo', 'inventory', 'email', 'googleAds', 'analytics', etc.
    priority INTEGER DEFAULT 2,  -- 1=Urgent, 2=Important, 3=Normal, 4=Backlog
    instructions TEXT,  -- Detailed instructions for Claude Code
    source_file TEXT,  -- File reference where task was found (e.g., 'buy-organics-online/TODO.md')
    needs_research BOOLEAN DEFAULT false,  -- True if task needs investigation before implementation
    created_by TEXT,  -- User who created the task (e.g., 'peter', 'claude_code', 'n8n')

    -- Execution status
    -- Values: 'pending', 'in_progress', 'failed', 'needs_fix', 'completed', 'cancelled', 'blocked'
    status TEXT NOT NULL DEFAULT 'pending',

    -- Task plan and progress
    plan_json JSONB,  -- Step-by-step execution plan (e.g., [{"step": 1, "action": "...", "status": "pending"}, ...])
    current_step INTEGER DEFAULT 0,  -- Current step being executed (0 = not started)

    -- AI supervisor analysis
    supervisor_summary TEXT,  -- Human-readable summary of what went wrong or current state
    supervisor_recommendation TEXT,  -- Action to take: 'retry', 'adjust_code', 'stop_for_human', 'continue'
    repair_instruction TEXT,  -- Detailed instruction for Claude Code to fix/resume the task

    -- Retry management
    retry_count INTEGER DEFAULT 0,  -- Number of retry attempts
    next_action_after TIMESTAMPTZ,  -- Schedule next action (for delayed retries or human review deadline)

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_next_action ON tasks(next_action_after) WHERE next_action_after IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_business_category ON tasks(business, category);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TASK_LOGS TABLE
-- ============================================================================
-- Audit trail of all actions, attempts, and state changes for tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_logs (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to parent task
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- Execution context
    attempt_number INTEGER,  -- Which retry attempt this log belongs to (NULL for non-retry actions)
    source TEXT NOT NULL,  -- Who/what created this log: 'claude_code', 'n8n_supervisor', 'human', 'system'

    -- Log classification
    status TEXT NOT NULL,  -- 'info', 'success', 'warning', 'error'

    -- Log content
    message TEXT NOT NULL,  -- Human-readable log message
    details_json JSONB,  -- Raw error stack, data payload, or additional structured data

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_created_at ON task_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_logs_status ON task_logs(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional, configure as needed
-- ============================================================================
-- Uncomment and configure these if you want to enable RLS for multi-tenant access
--
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
--
-- Example policy (adjust based on your auth setup):
-- CREATE POLICY "Allow all operations for authenticated users" ON tasks
--     FOR ALL USING (auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow all operations for authenticated users" ON task_logs
--     FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER VIEWS - Optional
-- ============================================================================

-- View: Tasks with their latest log entry
CREATE OR REPLACE VIEW tasks_with_latest_log AS
SELECT
    t.*,
    l.id AS latest_log_id,
    l.message AS latest_log_message,
    l.status AS latest_log_status,
    l.created_at AS latest_log_created_at
FROM tasks t
LEFT JOIN LATERAL (
    SELECT * FROM task_logs
    WHERE task_id = t.id
    ORDER BY created_at DESC
    LIMIT 1
) l ON true;

-- View: Failed tasks needing attention
CREATE OR REPLACE VIEW tasks_needing_attention AS
SELECT
    t.*,
    COUNT(l.id) AS error_log_count
FROM tasks t
LEFT JOIN task_logs l ON l.task_id = t.id AND l.status = 'error'
WHERE t.status IN ('failed', 'needs_fix')
GROUP BY t.id
ORDER BY t.updated_at DESC;

-- ============================================================================
-- SAMPLE DATA - For testing purposes only (comment out in production)
-- ============================================================================

-- INSERT INTO tasks (title, description, status, plan_json, current_step)
-- VALUES (
--     'Deploy Teelixir website update',
--     'Deploy latest changes to Teelixir production site with rollback capability',
--     'pending',
--     '[
--         {"step": 1, "action": "Run tests", "status": "pending"},
--         {"step": 2, "action": "Build production bundle", "status": "pending"},
--         {"step": 3, "action": "Deploy to staging", "status": "pending"},
--         {"step": 4, "action": "Run smoke tests", "status": "pending"},
--         {"step": 5, "action": "Deploy to production", "status": "pending"}
--     ]'::jsonb,
--     0
-- );

-- ============================================================================
-- HELPER RPC FUNCTIONS
-- ============================================================================
-- These functions simplify common task operations and ensure proper logging
-- ============================================================================

-- Function: Create task with automatic logging
CREATE OR REPLACE FUNCTION create_task_with_log(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_plan_json JSONB DEFAULT NULL,
  p_source TEXT DEFAULT 'system',
  p_business TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_priority INTEGER DEFAULT 2,
  p_instructions TEXT DEFAULT NULL,
  p_source_file TEXT DEFAULT NULL,
  p_needs_research BOOLEAN DEFAULT false,
  p_created_by TEXT DEFAULT 'system'
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
  INSERT INTO tasks (
    title, description, plan_json, status,
    business, category, priority, instructions, source_file, needs_research, created_by
  )
  VALUES (
    p_title, p_description, p_plan_json, 'pending',
    p_business, p_category, p_priority, p_instructions, p_source_file, p_needs_research, p_created_by
  )
  RETURNING id INTO v_task_id;

  -- Log the creation
  INSERT INTO task_logs (task_id, source, status, message)
  VALUES (v_task_id, p_source, 'info', 'Task created: ' || p_title)
  RETURNING id INTO v_log_id;

  -- Return both IDs
  RETURN QUERY SELECT v_task_id, v_log_id;
END;
$$;

-- Function: Log task action
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

-- Function: Update task status with logging
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

-- Function: Get tasks ready for retry
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

-- Function: Mark task as needing fix with supervisor feedback
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

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
