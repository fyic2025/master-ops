-- ============================================================================
-- FIX DASHBOARD RLS FOR ANON ACCESS
-- Created: 2025-12-04
-- Purpose: Allow anon key to read dashboard tables (406 errors on frontend)
-- ============================================================================

-- Drop existing policies that may be misconfigured
DROP POLICY IF EXISTS "Allow read for authenticated" ON dashboard_business_metrics;
DROP POLICY IF EXISTS "Allow read for authenticated" ON dashboard_alerts;
DROP POLICY IF EXISTS "Allow read for authenticated" ON dashboard_health_checks;

-- Create policies explicitly for anon role
CREATE POLICY "Allow anon read" ON dashboard_business_metrics
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read" ON dashboard_alerts
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read" ON dashboard_health_checks
    FOR SELECT TO anon USING (true);

-- Also allow authenticated (in case we add auth later)
CREATE POLICY "Allow authenticated read" ON dashboard_business_metrics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON dashboard_alerts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON dashboard_health_checks
    FOR SELECT TO authenticated USING (true);

-- Ensure service role can still write
DROP POLICY IF EXISTS "Allow write for service" ON dashboard_business_metrics;
DROP POLICY IF EXISTS "Allow write for service" ON dashboard_alerts;
DROP POLICY IF EXISTS "Allow write for service" ON dashboard_health_checks;

CREATE POLICY "Allow service write" ON dashboard_business_metrics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service write" ON dashboard_alerts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service write" ON dashboard_health_checks
    FOR ALL TO service_role USING (true) WITH CHECK (true);
