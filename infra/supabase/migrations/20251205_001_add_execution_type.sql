-- ============================================================================
-- MIGRATION: Add execution_type column to tasks table
-- Date: 2025-12-05
-- Purpose: Support hybrid manual/auto task execution
--   - manual: User handles locally via Claude Code (uses subscription)
--   - auto: n8n processes via API headless mode
-- ============================================================================

-- Add execution_type column with default 'manual'
-- This ensures new tasks go to manual review first
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS execution_type TEXT DEFAULT 'manual'
CHECK (execution_type IN ('manual', 'auto'));

-- Add index for filtering by execution_type
CREATE INDEX IF NOT EXISTS idx_tasks_execution_type
ON tasks(execution_type);

-- Add composite index for n8n workflow query: pending + auto
CREATE INDEX IF NOT EXISTS idx_tasks_pending_auto
ON tasks(status, execution_type)
WHERE status = 'pending' AND execution_type = 'auto';

-- Update any NULL values to 'manual' (safety)
UPDATE tasks SET execution_type = 'manual' WHERE execution_type IS NULL;

-- ============================================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================================
-- SELECT
--   execution_type,
--   COUNT(*) as task_count
-- FROM tasks
-- GROUP BY execution_type;
