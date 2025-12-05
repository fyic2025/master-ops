-- ============================================================================
-- MIGRATION: Add notifications table for task completion alerts
-- Date: 2025-12-05
-- Purpose: Track task completion/failure notifications for dashboard display
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('completed', 'failed', 'needs_manual', 'escalated')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications(read, created_at DESC)
WHERE read = false;

-- Index for task lookups
CREATE INDEX IF NOT EXISTS idx_notifications_task_id
ON notifications(task_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role
CREATE POLICY "Service role full access" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================================
-- SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
