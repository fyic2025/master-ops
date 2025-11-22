-- Row Level Security (RLS) Policies Template
-- Generated for master-ops Supabase database
-- Businesses: Teelixir, Elevate Wholesale, Buy Organics Online, Red Hill Fresh

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role has full access (for n8n, automation scripts)
CREATE POLICY "service_role_all_businesses"
ON businesses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can view all businesses
CREATE POLICY "authenticated_read_businesses"
ON businesses
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Only service role can update businesses
CREATE POLICY "service_role_update_businesses"
ON businesses
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 4: Only service role can insert businesses
CREATE POLICY "service_role_insert_businesses"
ON businesses
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- INTEGRATION_LOGS TABLE
-- ============================================================================

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role full access
CREATE POLICY "service_role_all_integration_logs"
ON integration_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can view logs
-- TODO: Add business-level filtering if user-to-business relationship exists
CREATE POLICY "authenticated_read_integration_logs"
ON integration_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Only service role can insert logs
CREATE POLICY "service_role_insert_integration_logs"
ON integration_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- WORKFLOW_EXECUTION_LOGS TABLE
-- ============================================================================

ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role full access
CREATE POLICY "service_role_all_workflow_logs"
ON workflow_execution_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can view workflow logs
CREATE POLICY "authenticated_read_workflow_logs"
ON workflow_execution_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Only service role can insert workflow logs
CREATE POLICY "service_role_insert_workflow_logs"
ON workflow_execution_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- API_METRICS TABLE
-- ============================================================================

ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role full access
CREATE POLICY "service_role_all_api_metrics"
ON api_metrics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can view metrics
CREATE POLICY "authenticated_read_api_metrics"
ON api_metrics
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Only service role can insert metrics
CREATE POLICY "service_role_insert_api_metrics"
ON api_metrics
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role full access
CREATE POLICY "service_role_all_tasks"
ON tasks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can view all tasks
CREATE POLICY "authenticated_read_tasks"
ON tasks
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Authenticated users can update task status
-- (If you want to allow manual task management)
CREATE POLICY "authenticated_update_task_status"
ON tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TASK_LOGS TABLE
-- ============================================================================

ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role full access
CREATE POLICY "service_role_all_task_logs"
ON task_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Authenticated users can view task logs
CREATE POLICY "authenticated_read_task_logs"
ON task_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Only service role can insert task logs
CREATE POLICY "service_role_insert_task_logs"
ON task_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- AGENT TABLES (Already have RLS enabled)
-- ============================================================================

-- The following tables already have RLS enabled in agents/database-schema.sql:
-- - lighthouse_audits
-- - performance_trends
-- - performance_alerts
-- - theme_changes
-- - accessibility_audits
-- - seo_implementation_tasks
-- - deployment_history
-- - agent_activity_log
-- - performance_budgets

-- Add policies for these tables if needed

-- Example for lighthouse_audits:
CREATE POLICY "service_role_all_lighthouse_audits"
ON lighthouse_audits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_read_lighthouse_audits"
ON lighthouse_audits
FOR SELECT
TO authenticated
USING (true);

-- Repeat similar pattern for other agent tables...

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- View all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test policy as authenticated user
-- SET ROLE authenticated;
-- SELECT * FROM businesses LIMIT 1;
-- RESET ROLE;

-- Test policy as service role
-- SET ROLE service_role;
-- SELECT * FROM integration_logs LIMIT 1;
-- RESET ROLE;

-- ============================================================================
-- ROLLBACK SCRIPT (Save for emergencies)
-- ============================================================================

-- To disable RLS on all tables if something goes wrong:
/*
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs DISABLE ROW LEVEL SECURITY;
*/

-- To drop all policies:
/*
DROP POLICY IF EXISTS "service_role_all_businesses" ON businesses;
DROP POLICY IF EXISTS "authenticated_read_businesses" ON businesses;
-- ... repeat for all policies
*/
