-- Integration Logs Schema
--
-- Provides centralized logging for all integrations and workflows
-- Supports structured logging with performance metrics, error tracking, and audit trails
--
-- Usage:
-- 1. Execute this schema in your Supabase project via SQL Editor
-- 2. Use the logger library (shared/libs/logger.ts) to persist logs automatically
-- 3. Query logs for monitoring, debugging, and analytics

-- =============================================================================
-- TABLES
-- =============================================================================

-- Integration Logs Table
-- Stores all integration activity logs with structured metadata
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  source TEXT NOT NULL CHECK (source IN (
    'hubspot', 'unleashed', 'n8n', 'supabase', 'system', 'workflow', 'integration', 'cli'
  )),
  service TEXT, -- Specific service or component within source
  operation TEXT, -- Specific operation being performed

  -- Log Details
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  status TEXT NOT NULL CHECK (status IN ('info', 'success', 'warning', 'error')),
  message TEXT NOT NULL,
  details_json JSONB, -- Structured metadata and context

  -- Performance
  duration_ms INTEGER, -- Operation duration in milliseconds

  -- Relationships
  user_id TEXT, -- User who triggered the operation (if applicable)
  business_id TEXT, -- Business context (if applicable)
  workflow_id TEXT, -- n8n workflow ID (if applicable)
  integration_id TEXT, -- Integration identifier

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_integration_logs_source ON integration_logs(source);
CREATE INDEX IF NOT EXISTS idx_integration_logs_level ON integration_logs(level);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_operation ON integration_logs(operation) WHERE operation IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_logs_workflow_id ON integration_logs(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_logs_business_id ON integration_logs(business_id) WHERE business_id IS NOT NULL;

-- Composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_integration_logs_source_status_created
  ON integration_logs(source, status, created_at DESC);

-- =============================================================================
-- WORKFLOW EXECUTION LOGS
-- =============================================================================

-- Workflow Execution Logs Table
-- Tracks n8n workflow executions with detailed metrics
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workflow Details
  workflow_id TEXT NOT NULL,
  workflow_name TEXT,
  execution_id TEXT NOT NULL,

  -- Execution Status
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error', 'waiting', 'cancelled')),
  mode TEXT CHECK (mode IN ('manual', 'trigger', 'webhook', 'cli', 'retry')),

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN finished_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000
      ELSE NULL
    END
  ) STORED,

  -- Results
  data_json JSONB, -- Input/output data
  error_message TEXT,
  error_details_json JSONB,

  -- Metrics
  nodes_executed INTEGER DEFAULT 0,
  nodes_failed INTEGER DEFAULT 0,

  -- Context
  business_id TEXT,
  triggered_by TEXT, -- User or system that triggered execution

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for workflow execution logs
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_workflow_id ON workflow_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_execution_id ON workflow_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_status ON workflow_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_started_at ON workflow_execution_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_workflow_status
  ON workflow_execution_logs(workflow_id, status, started_at DESC);

-- =============================================================================
-- API METRICS
-- =============================================================================

-- API Metrics Table
-- Tracks API call performance and usage patterns
CREATE TABLE IF NOT EXISTS api_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- API Details
  service TEXT NOT NULL, -- hubspot, unleashed, etc.
  endpoint TEXT NOT NULL, -- API endpoint called
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),

  -- Status
  status_code INTEGER,
  success BOOLEAN NOT NULL,

  -- Performance
  duration_ms INTEGER NOT NULL,
  response_size_bytes INTEGER,

  -- Rate Limiting
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,

  -- Error Details
  error_message TEXT,
  error_category TEXT,

  -- Context
  operation TEXT,
  business_id TEXT,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for API metrics
CREATE INDEX IF NOT EXISTS idx_api_metrics_service ON api_metrics(service);
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_metrics_created_at ON api_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_metrics_success ON api_metrics(success);
CREATE INDEX IF NOT EXISTS idx_api_metrics_service_endpoint
  ON api_metrics(service, endpoint, created_at DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Recent Error Logs View
-- Shows recent errors across all integrations
CREATE OR REPLACE VIEW recent_errors AS
SELECT
  id,
  source,
  service,
  operation,
  message,
  details_json,
  duration_ms,
  workflow_id,
  business_id,
  created_at
FROM integration_logs
WHERE level = 'error'
ORDER BY created_at DESC
LIMIT 100;

-- Integration Health Summary View
-- Aggregates success/error rates by source
CREATE OR REPLACE VIEW integration_health_summary AS
SELECT
  source,
  COUNT(*) as total_logs,
  COUNT(*) FILTER (WHERE level = 'error') as error_count,
  COUNT(*) FILTER (WHERE level = 'warn') as warning_count,
  COUNT(*) FILTER (WHERE level = 'info') as info_count,
  ROUND(
    (COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as error_rate_pct,
  MAX(created_at) as last_activity
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY error_rate_pct DESC;

-- Workflow Performance Summary View
-- Shows workflow execution statistics
CREATE OR REPLACE VIEW workflow_performance_summary AS
SELECT
  workflow_id,
  workflow_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
  COUNT(*) FILTER (WHERE status = 'error') as failed_executions,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as success_rate_pct,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) as p95_duration_ms,
  MAX(started_at) as last_execution
FROM workflow_execution_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY workflow_id, workflow_name
ORDER BY total_executions DESC;

-- API Performance Summary View
-- Aggregates API performance metrics by service
CREATE OR REPLACE VIEW api_performance_summary AS
SELECT
  service,
  endpoint,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE success = true) as successful_calls,
  COUNT(*) FILTER (WHERE success = false) as failed_calls,
  ROUND(
    (COUNT(*) FILTER (WHERE success = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as success_rate_pct,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) as p95_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MAX(created_at) as last_call
FROM api_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service, endpoint
ORDER BY total_calls DESC;

-- Recent Workflow Failures View
-- Shows recent workflow execution failures
CREATE OR REPLACE VIEW recent_workflow_failures AS
SELECT
  id,
  workflow_id,
  workflow_name,
  execution_id,
  status,
  error_message,
  error_details_json,
  duration_ms,
  nodes_executed,
  nodes_failed,
  started_at,
  finished_at
FROM workflow_execution_logs
WHERE status = 'error'
ORDER BY started_at DESC
LIMIT 50;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to clean up old logs
-- Retains logs based on configured retention periods
CREATE OR REPLACE FUNCTION cleanup_old_logs(
  integration_logs_days INTEGER DEFAULT 30,
  workflow_logs_days INTEGER DEFAULT 90,
  api_metrics_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  integration_logs_deleted BIGINT,
  workflow_logs_deleted BIGINT,
  api_metrics_deleted BIGINT
) AS $$
DECLARE
  int_deleted BIGINT;
  wf_deleted BIGINT;
  api_deleted BIGINT;
BEGIN
  -- Delete old integration logs
  DELETE FROM integration_logs
  WHERE created_at < NOW() - (integration_logs_days || ' days')::INTERVAL;
  GET DIAGNOSTICS int_deleted = ROW_COUNT;

  -- Delete old workflow execution logs
  DELETE FROM workflow_execution_logs
  WHERE created_at < NOW() - (workflow_logs_days || ' days')::INTERVAL;
  GET DIAGNOSTICS wf_deleted = ROW_COUNT;

  -- Delete old API metrics
  DELETE FROM api_metrics
  WHERE created_at < NOW() - (api_metrics_days || ' days')::INTERVAL;
  GET DIAGNOSTICS api_deleted = ROW_COUNT;

  RETURN QUERY SELECT int_deleted, wf_deleted, api_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function to get error rate for a time period
CREATE OR REPLACE FUNCTION get_error_rate(
  p_source TEXT,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_logs BIGINT,
  error_count BIGINT,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE level = 'error') as error_count,
    ROUND(
      (COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as error_rate
  FROM integration_logs
  WHERE source = p_source
    AND created_at > NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_execution_logs_updated_at
  BEFORE UPDATE ON workflow_execution_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE integration_logs IS 'Centralized logging for all integration activity';
COMMENT ON TABLE workflow_execution_logs IS 'Tracks n8n workflow execution metrics and results';
COMMENT ON TABLE api_metrics IS 'API performance metrics and usage tracking';

COMMENT ON FUNCTION cleanup_old_logs IS 'Removes logs older than specified retention periods';
COMMENT ON FUNCTION get_error_rate IS 'Calculates error rate for a specific source over time period';

-- =============================================================================
-- SAMPLE QUERIES
-- =============================================================================

-- Recent errors by source
-- SELECT source, COUNT(*), MAX(created_at) FROM recent_errors GROUP BY source;

-- Integration health over last 24 hours
-- SELECT * FROM integration_health_summary;

-- Workflow performance
-- SELECT * FROM workflow_performance_summary WHERE success_rate_pct < 90;

-- API endpoint performance
-- SELECT * FROM api_performance_summary WHERE avg_duration_ms > 1000;

-- Clean up logs older than 30 days
-- SELECT * FROM cleanup_old_logs(30, 90, 30);

-- Get error rate for HubSpot over last 24 hours
-- SELECT * FROM get_error_rate('hubspot', 24);
