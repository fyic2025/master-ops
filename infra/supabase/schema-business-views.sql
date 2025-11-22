-- Business-Specific Views and Queries
--
-- Provides convenient views for querying business data across all 4 businesses
--
-- Usage:
-- Execute this schema after the main schemas are set up
-- Query views for business insights and reporting

-- =============================================================================
-- BUSINESS TABLES (Placeholder - implement based on actual business data model)
-- =============================================================================

-- Create businesses table if it doesn't exist
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  type TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

  -- Integration IDs
  hubspot_company_id TEXT,
  unleashed_customer_code TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_hubspot_id ON businesses(hubspot_company_id) WHERE hubspot_company_id IS NOT NULL;

-- Insert the 4 businesses if they don't exist
INSERT INTO businesses (name, slug, type)
VALUES
  ('Teelixir', 'teelixir', 'ecommerce'),
  ('Elevate Wholesale', 'elevate-wholesale', 'wholesale'),
  ('Buy Organics Online', 'buy-organics-online', 'ecommerce'),
  ('Red Hill Fresh', 'red-hill-fresh', 'wholesale')
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- BUSINESS ACTIVITY VIEWS
-- =============================================================================

-- View: Recent activity by business
CREATE OR REPLACE VIEW business_activity AS
SELECT
  b.name as business_name,
  b.slug as business_slug,
  il.source,
  il.operation,
  il.status,
  il.message,
  il.duration_ms,
  il.created_at
FROM integration_logs il
LEFT JOIN businesses b ON il.business_id = b.id::text
WHERE il.created_at > NOW() - INTERVAL '7 days'
ORDER BY il.created_at DESC;

-- View: Error summary by business
CREATE OR REPLACE VIEW business_error_summary AS
SELECT
  b.name as business_name,
  b.slug as business_slug,
  COUNT(*) as error_count,
  COUNT(DISTINCT il.source) as affected_integrations,
  MAX(il.created_at) as last_error,
  jsonb_agg(DISTINCT il.source) as error_sources
FROM integration_logs il
LEFT JOIN businesses b ON il.business_id = b.id::text
WHERE il.level = 'error'
  AND il.created_at > NOW() - INTERVAL '24 hours'
GROUP BY b.name, b.slug
ORDER BY error_count DESC;

-- View: Business integration health
CREATE OR REPLACE VIEW business_integration_health AS
SELECT
  b.name as business_name,
  b.slug as business_slug,
  il.source,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE il.level = 'error') as errors,
  COUNT(*) FILTER (WHERE il.level = 'warn') as warnings,
  ROUND(
    (COUNT(*) FILTER (WHERE il.level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as error_rate_pct,
  ROUND(AVG(il.duration_ms), 0) as avg_duration_ms,
  MAX(il.created_at) as last_activity
FROM integration_logs il
LEFT JOIN businesses b ON il.business_id = b.id::text
WHERE il.created_at > NOW() - INTERVAL '24 hours'
GROUP BY b.name, b.slug, il.source
ORDER BY b.name, error_rate_pct DESC;

-- =============================================================================
-- CROSS-BUSINESS ANALYTICS
-- =============================================================================

-- View: Compare business performance
CREATE OR REPLACE VIEW business_performance_comparison AS
SELECT
  b.name as business_name,
  b.slug as business_slug,
  COUNT(DISTINCT il.id) as total_operations,
  COUNT(DISTINCT il.operation) as unique_operations,
  COUNT(*) FILTER (WHERE il.status = 'success') as successful_operations,
  COUNT(*) FILTER (WHERE il.status = 'error') as failed_operations,
  ROUND(
    (COUNT(*) FILTER (WHERE il.status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as success_rate_pct,
  ROUND(AVG(il.duration_ms), 0) as avg_duration_ms,
  jsonb_object_agg(
    il.source,
    COUNT(*)
  ) FILTER (WHERE il.source IS NOT NULL) as operations_by_source
FROM businesses b
LEFT JOIN integration_logs il ON il.business_id = b.id::text
WHERE b.status = 'active'
  AND (il.created_at > NOW() - INTERVAL '7 days' OR il.created_at IS NULL)
GROUP BY b.name, b.slug
ORDER BY total_operations DESC;

-- View: Daily operations summary
CREATE OR REPLACE VIEW daily_operations_summary AS
SELECT
  b.name as business_name,
  DATE(il.created_at) as operation_date,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE il.status = 'success') as successful,
  COUNT(*) FILTER (WHERE il.status = 'error') as failed,
  ROUND(AVG(il.duration_ms), 0) as avg_duration_ms,
  jsonb_object_agg(
    il.source,
    COUNT(*)
  ) as operations_by_source
FROM businesses b
LEFT JOIN integration_logs il ON il.business_id = b.id::text
WHERE il.created_at > NOW() - INTERVAL '30 days'
GROUP BY b.name, DATE(il.created_at)
ORDER BY operation_date DESC, b.name;

-- =============================================================================
-- INTEGRATION-SPECIFIC VIEWS
-- =============================================================================

-- View: HubSpot sync status by business
CREATE OR REPLACE VIEW hubspot_sync_status AS
SELECT
  b.name as business_name,
  b.hubspot_company_id,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE il.status = 'success') as successful_syncs,
  COUNT(*) FILTER (WHERE il.status = 'error') as failed_syncs,
  MAX(il.created_at) FILTER (WHERE il.status = 'success') as last_successful_sync,
  MAX(il.created_at) FILTER (WHERE il.status = 'error') as last_failed_sync,
  ROUND(AVG(il.duration_ms), 0) as avg_sync_duration_ms
FROM businesses b
LEFT JOIN integration_logs il ON il.business_id = b.id::text AND il.source = 'hubspot'
WHERE il.created_at > NOW() - INTERVAL '7 days'
GROUP BY b.name, b.hubspot_company_id
ORDER BY b.name;

-- View: Workflow execution by business
CREATE OR REPLACE VIEW business_workflow_executions AS
SELECT
  b.name as business_name,
  wel.workflow_id,
  wel.workflow_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE wel.status = 'success') as successful,
  COUNT(*) FILTER (WHERE wel.status = 'error') as failed,
  ROUND(AVG(wel.duration_ms), 0) as avg_duration_ms,
  MAX(wel.started_at) as last_execution
FROM businesses b
LEFT JOIN workflow_execution_logs wel ON wel.business_id = b.id::text
WHERE wel.started_at > NOW() - INTERVAL '7 days'
GROUP BY b.name, wel.workflow_id, wel.workflow_name
ORDER BY b.name, total_executions DESC;

-- =============================================================================
-- ALERTING VIEWS
-- =============================================================================

-- View: Businesses needing attention
CREATE OR REPLACE VIEW businesses_needing_attention AS
SELECT
  b.name as business_name,
  b.slug as business_slug,
  COUNT(*) FILTER (WHERE il.level = 'error' AND il.created_at > NOW() - INTERVAL '1 hour') as errors_last_hour,
  COUNT(*) FILTER (WHERE il.level = 'error' AND il.created_at > NOW() - INTERVAL '24 hours') as errors_last_24h,
  MAX(il.created_at) FILTER (WHERE il.level = 'error') as last_error_time,
  jsonb_agg(DISTINCT il.message) FILTER (WHERE il.level = 'error' AND il.created_at > NOW() - INTERVAL '1 hour') as recent_errors
FROM businesses b
LEFT JOIN integration_logs il ON il.business_id = b.id::text
WHERE b.status = 'active'
GROUP BY b.name, b.slug
HAVING COUNT(*) FILTER (WHERE il.level = 'error' AND il.created_at > NOW() - INTERVAL '1 hour') > 0
ORDER BY errors_last_hour DESC;

-- View: Stale integrations (no activity in 24 hours)
CREATE OR REPLACE VIEW stale_integrations AS
SELECT
  b.name as business_name,
  il.source as integration,
  MAX(il.created_at) as last_activity,
  EXTRACT(EPOCH FROM (NOW() - MAX(il.created_at)))/3600 as hours_since_activity
FROM businesses b
LEFT JOIN integration_logs il ON il.business_id = b.id::text
WHERE b.status = 'active'
GROUP BY b.name, il.source
HAVING MAX(il.created_at) < NOW() - INTERVAL '24 hours'
ORDER BY hours_since_activity DESC;

-- =============================================================================
-- REPORTING VIEWS
-- =============================================================================

-- View: Weekly business report
CREATE OR REPLACE VIEW weekly_business_report AS
SELECT
  b.name as business_name,
  DATE_TRUNC('week', il.created_at) as week_start,
  COUNT(*) as total_operations,
  COUNT(DISTINCT il.source) as active_integrations,
  COUNT(*) FILTER (WHERE il.status = 'success') as successful_operations,
  COUNT(*) FILTER (WHERE il.status = 'error') as failed_operations,
  ROUND(
    (COUNT(*) FILTER (WHERE il.status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as success_rate_pct,
  ROUND(AVG(il.duration_ms), 0) as avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY il.duration_ms), 0) as p95_duration_ms
FROM businesses b
LEFT JOIN integration_logs il ON il.business_id = b.id::text
WHERE il.created_at > NOW() - INTERVAL '12 weeks'
GROUP BY b.name, DATE_TRUNC('week', il.created_at)
ORDER BY week_start DESC, b.name;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function: Get business statistics
CREATE OR REPLACE FUNCTION get_business_stats(
  p_business_slug TEXT,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_operations BIGINT,
  successful_operations BIGINT,
  failed_operations BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  active_integrations BIGINT,
  error_sources JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE il.status = 'success') as successful_operations,
    COUNT(*) FILTER (WHERE il.status = 'error') as failed_operations,
    ROUND(
      (COUNT(*) FILTER (WHERE il.status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as success_rate,
    ROUND(AVG(il.duration_ms), 2) as avg_duration_ms,
    COUNT(DISTINCT il.source) as active_integrations,
    jsonb_agg(DISTINCT il.source) FILTER (WHERE il.level = 'error') as error_sources
  FROM businesses b
  LEFT JOIN integration_logs il ON il.business_id = b.id::text
  WHERE b.slug = p_business_slug
    AND il.created_at > NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at for businesses table
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE QUERIES
-- =============================================================================

-- Get all business activity for last 24 hours
-- SELECT * FROM business_activity WHERE created_at > NOW() - INTERVAL '24 hours';

-- Get error summary for all businesses
-- SELECT * FROM business_error_summary;

-- Get integration health for a specific business
-- SELECT * FROM business_integration_health WHERE business_slug = 'teelixir';

-- Compare business performance
-- SELECT * FROM business_performance_comparison;

-- Get businesses needing immediate attention
-- SELECT * FROM businesses_needing_attention;

-- Get stats for specific business
-- SELECT * FROM get_business_stats('teelixir', 48);

-- Check stale integrations
-- SELECT * FROM stale_integrations;

-- Weekly business report
-- SELECT * FROM weekly_business_report WHERE week_start > NOW() - INTERVAL '8 weeks';
