-- ============================================================================
-- MIGRATION: Add model tracking columns to tasks table
-- Date: 2025-12-05
-- Purpose: Track which AI model was used and escalation attempts
-- ============================================================================

-- Add model_used column (which model completed the task)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS model_used TEXT;

-- Add model_attempts column (log of all attempts with costs)
-- Format: [{"model": "haiku", "cost_usd": 0.02, "duration_ms": 5000, "success": false, "error": "..."}]
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS model_attempts JSONB DEFAULT '[]';

-- Add escalated column (did the task need model escalation?)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false;

-- Add index for querying by model_used
CREATE INDEX IF NOT EXISTS idx_tasks_model_used ON tasks(model_used);

-- Add index for finding escalated tasks
CREATE INDEX IF NOT EXISTS idx_tasks_escalated ON tasks(escalated) WHERE escalated = true;

-- ============================================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================================
-- SELECT id, title, model_used, escalated,
--        jsonb_array_length(model_attempts) as attempt_count
-- FROM tasks
-- WHERE model_used IS NOT NULL
-- ORDER BY created_at DESC LIMIT 10;
