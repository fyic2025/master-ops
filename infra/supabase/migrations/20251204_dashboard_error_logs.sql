-- ============================================================================
-- DASHBOARD ERROR LOGS
-- Created: 2025-12-04
-- Purpose: Capture frontend and API errors for monitoring
-- ============================================================================

-- Error logs table
CREATE TABLE IF NOT EXISTS dashboard_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,  -- 'frontend', 'api', 'network', 'supabase'
    level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info')),
    message TEXT NOT NULL,
    details JSONB,  -- stack trace, request info, etc.
    url TEXT,  -- page URL where error occurred
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON dashboard_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON dashboard_error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON dashboard_error_logs(source);

-- RLS policies
ALTER TABLE dashboard_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow frontend to insert errors (anon key)
DROP POLICY IF EXISTS "Allow anon insert" ON dashboard_error_logs;
CREATE POLICY "Allow anon insert" ON dashboard_error_logs
    FOR INSERT TO anon WITH CHECK (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service all" ON dashboard_error_logs;
CREATE POLICY "Allow service all" ON dashboard_error_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-cleanup: delete logs older than 30 days (run via cron)
-- SELECT cron.schedule('cleanup-error-logs', '0 0 * * *',
--     $$DELETE FROM dashboard_error_logs WHERE created_at < NOW() - INTERVAL '30 days'$$);
