-- Migration: Automation Execution Logs
-- Description: Adds detailed execution tracking for all automations across businesses
-- This enables the "Copy to Claude" feature to include recent execution history

-- ============================================================================
-- Table: automation_execution_logs - Detailed execution tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type TEXT NOT NULL,  -- e.g., 'winback_40', 'anniversary_upsell'
  business TEXT NOT NULL,  -- e.g., 'teelixir', 'boo', 'elevate', 'rhf'
  execution_type TEXT NOT NULL,  -- 'queue_build', 'process', 'dry_run', 'test_email'

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Results
  success BOOLEAN,
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,

  -- Details
  trigger_source TEXT,  -- 'manual', 'scheduled', 'api', 'claude'
  triggered_by TEXT,    -- user or system identifier
  error_message TEXT,
  warnings TEXT[],
  execution_details JSONB,  -- Full context (config used, queue status, etc.)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_lookup
ON automation_execution_logs(automation_type, business, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_logs_recent
ON automation_execution_logs(started_at DESC);

COMMENT ON TABLE automation_execution_logs IS 'Detailed execution history for all automations - used by Copy-to-Claude feature';

-- ============================================================================
-- View: Recent execution summary per automation
-- ============================================================================
CREATE OR REPLACE VIEW v_automation_execution_summary AS
SELECT
  automation_type,
  business,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE success = TRUE) as successful,
  COUNT(*) FILTER (WHERE success = FALSE) as failed,
  MAX(started_at) as last_run_at,
  (SELECT success FROM automation_execution_logs l2
   WHERE l2.automation_type = l.automation_type
   AND l2.business = l.business
   ORDER BY started_at DESC LIMIT 1) as last_run_success,
  ROUND(AVG(duration_ms) FILTER (WHERE success = TRUE)) as avg_duration_ms,
  SUM(items_processed) as total_items_processed,
  SUM(items_failed) as total_items_failed
FROM automation_execution_logs l
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY automation_type, business;

COMMENT ON VIEW v_automation_execution_summary IS '30-day execution summary per automation';

-- ============================================================================
-- Function: Log automation execution
-- ============================================================================
CREATE OR REPLACE FUNCTION log_automation_execution(
  p_automation_type TEXT,
  p_business TEXT,
  p_execution_type TEXT,
  p_success BOOLEAN,
  p_items_processed INTEGER DEFAULT 0,
  p_items_failed INTEGER DEFAULT 0,
  p_items_skipped INTEGER DEFAULT 0,
  p_trigger_source TEXT DEFAULT 'manual',
  p_triggered_by TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_warnings TEXT[] DEFAULT NULL,
  p_execution_details JSONB DEFAULT NULL,
  p_started_at TIMESTAMPTZ DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_started TIMESTAMPTZ := COALESCE(p_started_at, NOW());
BEGIN
  INSERT INTO automation_execution_logs (
    automation_type, business, execution_type,
    started_at, completed_at, duration_ms,
    success, items_processed, items_failed, items_skipped,
    trigger_source, triggered_by,
    error_message, warnings, execution_details
  ) VALUES (
    p_automation_type, p_business, p_execution_type,
    v_started, NOW(), p_duration_ms,
    p_success, p_items_processed, p_items_failed, p_items_skipped,
    p_trigger_source, p_triggered_by,
    p_error_message, p_warnings, p_execution_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Enable RLS
-- ============================================================================
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to automation_execution_logs"
  ON automation_execution_logs FOR ALL
  USING (auth.role() = 'service_role');
