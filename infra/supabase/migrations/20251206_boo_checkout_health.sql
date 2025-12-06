-- ============================================================================
-- BOO CHECKOUT HEALTH MONITORING
-- ============================================================================
-- Proactive checkout issue detection - inventory, shipping, errors, API health
-- Created: 2025-12-06
-- ============================================================================

-- Checkout health config table
CREATE TABLE IF NOT EXISTS boo_checkout_health_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT UNIQUE NOT NULL, -- 'error_analysis', 'inventory', 'shipping', 'api_health'
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configs
INSERT INTO boo_checkout_health_config (check_type, enabled, config) VALUES
('error_analysis', true, '{
  "threshold": 5,
  "lookback_hours": 1,
  "alert_on_spike": true
}'::jsonb),
('inventory', true, '{
  "zero_stock_alert": true,
  "low_stock_threshold": 5,
  "check_visible_only": true
}'::jsonb),
('shipping', true, '{
  "test_postcodes": ["3000", "2000", "4000", "6000", "5000", "7000"],
  "carriers": ["australia_post", "sendle"],
  "timeout_seconds": 30
}'::jsonb),
('api_health', true, '{
  "error_rate_threshold": 0.1,
  "lookback_hours": 1
}'::jsonb)
ON CONFLICT (check_type) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = NOW();

-- Checkout health issues table (for tracking found issues)
CREATE TABLE IF NOT EXISTS boo_checkout_health_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL REFERENCES boo_checkout_health_config(check_type),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}',

  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  -- Timestamps
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_issues_check_type ON boo_checkout_health_issues(check_type);
CREATE INDEX IF NOT EXISTS idx_health_issues_status ON boo_checkout_health_issues(status);
CREATE INDEX IF NOT EXISTS idx_health_issues_severity ON boo_checkout_health_issues(severity);
CREATE INDEX IF NOT EXISTS idx_health_issues_detected ON boo_checkout_health_issues(detected_at DESC);

-- Checkout health stats view
CREATE OR REPLACE VIEW boo_checkout_health_stats AS
SELECT
  -- Error stats (last 24h)
  (SELECT COUNT(*) FROM checkout_error_logs WHERE occurred_at > NOW() - INTERVAL '24 hours') as errors_24h,
  (SELECT COUNT(*) FROM checkout_error_logs WHERE occurred_at > NOW() - INTERVAL '1 hour') as errors_1h,
  (SELECT COUNT(*) FROM checkout_error_logs WHERE occurred_at > NOW() - INTERVAL '24 hours' AND NOT resolved) as unresolved_errors,

  -- Error breakdown by type (last 24h)
  (SELECT COALESCE(jsonb_object_agg(error_type, cnt), '{}'::jsonb) FROM (
    SELECT error_type, COUNT(*) as cnt
    FROM checkout_error_logs
    WHERE occurred_at > NOW() - INTERVAL '24 hours'
    GROUP BY error_type
  ) t) as errors_by_type,

  -- Last check times
  (SELECT last_run_at FROM boo_checkout_health_config WHERE check_type = 'error_analysis') as last_error_check,
  (SELECT last_run_at FROM boo_checkout_health_config WHERE check_type = 'inventory') as last_inventory_check,
  (SELECT last_run_at FROM boo_checkout_health_config WHERE check_type = 'shipping') as last_shipping_check,
  (SELECT last_run_at FROM boo_checkout_health_config WHERE check_type = 'api_health') as last_api_check,

  -- Last run results
  (SELECT last_run_result FROM boo_checkout_health_config WHERE check_type = 'error_analysis') as error_result,
  (SELECT last_run_result FROM boo_checkout_health_config WHERE check_type = 'inventory') as inventory_result,
  (SELECT last_run_result FROM boo_checkout_health_config WHERE check_type = 'shipping') as shipping_result,
  (SELECT last_run_result FROM boo_checkout_health_config WHERE check_type = 'api_health') as api_result,

  -- Open issues count by severity
  (SELECT COUNT(*) FROM boo_checkout_health_issues WHERE status = 'open' AND severity = 'critical') as critical_issues,
  (SELECT COUNT(*) FROM boo_checkout_health_issues WHERE status = 'open' AND severity = 'warning') as warning_issues,
  (SELECT COUNT(*) FROM boo_checkout_health_issues WHERE status = 'open') as total_open_issues;

-- Recent checkout errors view (for dashboard)
CREATE OR REPLACE VIEW boo_recent_checkout_errors AS
SELECT
  id,
  error_type,
  error_message,
  customer_email,
  shipping_address_postcode,
  shipping_address_state,
  cart_value,
  occurred_at,
  resolved,
  resolution_notes
FROM checkout_error_logs
WHERE occurred_at > NOW() - INTERVAL '7 days'
ORDER BY occurred_at DESC
LIMIT 100;

-- Function to update config after health check run
CREATE OR REPLACE FUNCTION boo_update_health_check_result(
  p_check_type TEXT,
  p_result JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE boo_checkout_health_config
  SET
    last_run_at = NOW(),
    last_run_result = p_result,
    updated_at = NOW()
  WHERE check_type = p_check_type;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE boo_checkout_health_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_checkout_health_issues ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access config" ON boo_checkout_health_config FOR ALL USING (true);
CREATE POLICY "Service role full access issues" ON boo_checkout_health_issues FOR ALL USING (true);

COMMENT ON TABLE boo_checkout_health_config IS 'Configuration for BOO checkout health monitoring checks';
COMMENT ON TABLE boo_checkout_health_issues IS 'Issues detected by checkout health monitoring';
COMMENT ON VIEW boo_checkout_health_stats IS 'Aggregated checkout health statistics for dashboard';
