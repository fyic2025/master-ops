-- ============================================================================
-- TASK ROUTING & TRIAGE SYSTEM
-- ============================================================================
-- Adds support for task routing workflow:
-- 1. Non-admin users suggest an assignee (system, maria, rajani)
-- 2. Tasks go to Jayson's triage queue
-- 3. Jayson triages and assigns (or routes to system)
-- 4. Admin-created tasks can skip triage
-- ============================================================================

-- Add suggested assignee field (Peter's suggestion when creating)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS suggested_assignee TEXT;
COMMENT ON COLUMN tasks.suggested_assignee IS 'Suggested assignee: system, maria, rajani';

-- Add triage status field
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS triage_status TEXT;
COMMENT ON COLUMN tasks.triage_status IS 'Triage workflow: pending_triage, triaged, NULL';

-- Add automation notes field (Jayson''s notes on what''s automated vs manual)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS automation_notes TEXT;
COMMENT ON COLUMN tasks.automation_notes IS 'Notes on what is automated vs requires manual input';

-- Create index for triage queue queries
CREATE INDEX IF NOT EXISTS idx_tasks_triage_status ON tasks(triage_status)
WHERE triage_status = 'pending_triage';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
