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

    -- Execution status
    -- Values: 'pending', 'in_progress', 'failed', 'needs_fix', 'completed', 'cancelled'
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
-- END OF SCHEMA
-- ============================================================================
