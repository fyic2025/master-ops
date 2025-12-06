-- ============================================================================
-- ATO Rulings RLS Policy Fix
-- ============================================================================
-- Purpose: Fix overly permissive RLS policies that allowed any authenticated
--          user to read/write/delete ATO rulings data.
--
-- Changes:
--   - Service role: Full CRUD access (for sync scripts)
--   - Authenticated users: Read-only access (for dashboard viewing)
--   - Anonymous: No access
--
-- Run after: 20251204_ato_rulings_schema.sql
-- ============================================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role full access to ato_rulings" ON ato_rulings;
DROP POLICY IF EXISTS "Service role full access to ato_ruling_topics" ON ato_ruling_topics;
DROP POLICY IF EXISTS "Service role full access to ato_sync_log" ON ato_sync_log;

-- ============================================================================
-- ATO_RULINGS: Core rulings table
-- ============================================================================

-- Service role: Full CRUD access
CREATE POLICY "ato_rulings_service_role_all"
  ON ato_rulings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Read-only access for dashboard viewing
CREATE POLICY "ato_rulings_authenticated_select"
  ON ato_rulings
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- ATO_RULING_TOPICS: Topic taxonomy reference table
-- ============================================================================

-- Service role: Full CRUD access
CREATE POLICY "ato_ruling_topics_service_role_all"
  ON ato_ruling_topics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Read-only access
CREATE POLICY "ato_ruling_topics_authenticated_select"
  ON ato_ruling_topics
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- ATO_SYNC_LOG: Sync audit trail
-- ============================================================================

-- Service role: Full CRUD access
CREATE POLICY "ato_sync_log_service_role_all"
  ON ato_sync_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Read-only access (for audit viewing in dashboard)
CREATE POLICY "ato_sync_log_authenticated_select"
  ON ato_sync_log
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "ato_rulings_service_role_all" ON ato_rulings IS
  'Service role has full access for sync scripts and automation';
COMMENT ON POLICY "ato_rulings_authenticated_select" ON ato_rulings IS
  'Authenticated dashboard users can view rulings (read-only)';
