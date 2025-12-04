-- ============================================================================
-- RAJANI TASK ALLOCATION SCHEMA EXTENSION
-- ============================================================================
-- Adds fields for task assignment, time tracking, and completion feedback
-- ============================================================================

-- Add task assignment and feedback fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_on_task_mins INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_screenshot_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Index for filtering by assignee
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Comments for documentation
COMMENT ON COLUMN tasks.assigned_to IS 'Email of assigned contractor (e.g., rajani@teelixir.com)';
COMMENT ON COLUMN tasks.time_on_task_mins IS 'Total minutes spent on task by assignee';
COMMENT ON COLUMN tasks.completion_notes IS 'Feedback/notes from assignee upon completion';
COMMENT ON COLUMN tasks.completion_screenshot_url IS 'URL to screenshot proof of completion';
COMMENT ON COLUMN tasks.assigned_at IS 'Timestamp when task was assigned';
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when task was marked complete';

-- ============================================================================
-- TASK SUGGESTIONS TABLE (for contractors to suggest automation candidates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_by TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    business TEXT,
    automation_potential TEXT,
    time_saved_estimate_mins INTEGER,
    frequency TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_suggestions_status ON task_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_task_suggestions_suggested_by ON task_suggestions(suggested_by);

-- RLS policies for task_suggestions
ALTER TABLE task_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (dashboard uses service role)
CREATE POLICY "Allow all for service role" ON task_suggestions
    FOR ALL USING (true) WITH CHECK (true);
