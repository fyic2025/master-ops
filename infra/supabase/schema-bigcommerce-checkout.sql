-- ============================================================================
-- BIGCOMMERCE CHECKOUT TRACKING SCHEMA
-- ============================================================================
-- Database schema for monitoring and tracking BigCommerce checkout issues
-- Store: Buy Organics Online (buyorganicsonline.com.au)
-- Purpose: Track shipping errors, checkout failures, and test results
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CHECKOUT ERROR LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkout_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Error details
  error_type TEXT NOT NULL, -- 'shipping_address', 'shipping_method', 'payment', 'validation', 'unknown'
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,

  -- Checkout context
  cart_id TEXT,
  checkout_id TEXT,
  order_id INTEGER,
  customer_id INTEGER,
  customer_email TEXT,

  -- Shipping information (key for debugging shipping errors)
  shipping_address JSONB, -- Full address that failed
  shipping_address_country TEXT,
  shipping_address_state TEXT,
  shipping_address_postcode TEXT,
  shipping_address_city TEXT,
  shipping_method_attempted TEXT,
  shipping_quote_error TEXT,

  -- Product context
  products JSONB, -- Array of products in cart
  cart_value NUMERIC(10, 2),
  cart_weight NUMERIC(10, 3),

  -- Technical details
  user_agent TEXT,
  ip_address TEXT,
  session_id TEXT,
  referrer TEXT,

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Resolution tracking
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_checkout_error_logs_type ON checkout_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_checkout_error_logs_occurred_at ON checkout_error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_error_logs_postcode ON checkout_error_logs(shipping_address_postcode);
CREATE INDEX IF NOT EXISTS idx_checkout_error_logs_state ON checkout_error_logs(shipping_address_state);
CREATE INDEX IF NOT EXISTS idx_checkout_error_logs_resolved ON checkout_error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_checkout_error_logs_cart_id ON checkout_error_logs(cart_id);

COMMENT ON TABLE checkout_error_logs IS 'Tracks all checkout errors for Buy Organics Online';
COMMENT ON COLUMN checkout_error_logs.error_type IS 'Category of error: shipping_address, shipping_method, payment, validation';
COMMENT ON COLUMN checkout_error_logs.shipping_address IS 'Full address JSON that caused shipping error';

-- ============================================================================
-- 2. CHECKOUT TEST RESULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkout_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Test identification
  test_suite TEXT NOT NULL, -- 'e2e', 'api', 'lighthouse', 'accessibility', 'manual'
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL, -- 'shipping', 'payment', 'validation', 'performance', 'ux'
  test_scenario TEXT NOT NULL, -- Description of what was tested

  -- Test execution
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'error')),
  execution_time_ms INTEGER,
  executed_by TEXT, -- 'ci', 'manual', 'agent', 'monitoring'
  execution_environment TEXT, -- 'production', 'staging', 'local'

  -- Test details
  test_data JSONB, -- Input data used for test
  expected_result JSONB,
  actual_result JSONB,
  error_message TEXT,
  error_stack TEXT,

  -- Screenshots/artifacts (for E2E tests)
  screenshot_url TEXT,
  video_url TEXT,
  trace_url TEXT,

  -- Shipping-specific test data
  test_address JSONB,
  shipping_methods_tested JSONB,
  shipping_calculation_result JSONB,

  -- Performance metrics (for Lighthouse tests)
  lighthouse_score INTEGER,
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  seo_score INTEGER,
  core_web_vitals JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- CI/CD integration
  git_commit_sha TEXT,
  git_branch TEXT,
  ci_build_number TEXT,
  ci_pipeline_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_test_results_suite ON checkout_test_results(test_suite);
CREATE INDEX IF NOT EXISTS idx_checkout_test_results_status ON checkout_test_results(status);
CREATE INDEX IF NOT EXISTS idx_checkout_test_results_started_at ON checkout_test_results(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_test_results_test_type ON checkout_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_checkout_test_results_commit ON checkout_test_results(git_commit_sha);

COMMENT ON TABLE checkout_test_results IS 'Tracks automated and manual checkout test results';
COMMENT ON COLUMN checkout_test_results.test_suite IS 'Test framework: e2e (Playwright), api, lighthouse, accessibility';
COMMENT ON COLUMN checkout_test_results.lighthouse_score IS 'Overall Lighthouse score (0-100)';

-- ============================================================================
-- 3. BIGCOMMERCE API METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bigcommerce_api_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- API call details
  endpoint TEXT NOT NULL, -- '/v3/orders', '/v3/catalog/products', etc.
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),

  -- Performance
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL,

  -- Rate limiting
  rate_limit_remaining INTEGER,
  rate_limit_quota INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_type TEXT, -- 'rate_limit', 'auth', 'validation', 'server_error', 'network'

  -- Request context
  triggered_by TEXT, -- 'integration_test', 'health_check', 'agent', 'manual'
  operation TEXT, -- 'list_products', 'get_order', 'create_cart', etc.

  -- Timestamps
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bigcommerce_api_metrics_endpoint ON bigcommerce_api_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_bigcommerce_api_metrics_called_at ON bigcommerce_api_metrics(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_bigcommerce_api_metrics_success ON bigcommerce_api_metrics(success);
CREATE INDEX IF NOT EXISTS idx_bigcommerce_api_metrics_status_code ON bigcommerce_api_metrics(status_code);

COMMENT ON TABLE bigcommerce_api_metrics IS 'Performance and reliability metrics for BigCommerce API calls';

-- ============================================================================
-- 4. CHECKOUT MONITORING EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkout_monitoring_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event details
  event_type TEXT NOT NULL, -- 'cart_created', 'checkout_started', 'shipping_calculated', 'payment_attempted', 'order_completed', 'checkout_abandoned'
  event_status TEXT NOT NULL CHECK (event_status IN ('success', 'failure', 'pending')),

  -- Checkout journey
  cart_id TEXT,
  checkout_id TEXT,
  order_id INTEGER,
  customer_id INTEGER,

  -- Timing
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkout_step_duration_ms INTEGER,
  total_checkout_duration_ms INTEGER,

  -- Shipping details
  shipping_address_valid BOOLEAN,
  shipping_methods_available INTEGER,
  shipping_method_selected TEXT,
  shipping_cost NUMERIC(10, 2),

  -- Payment details
  payment_method TEXT,
  payment_provider TEXT,
  payment_status TEXT,

  -- Cart details
  cart_value NUMERIC(10, 2),
  cart_items_count INTEGER,
  discount_applied NUMERIC(10, 2),

  -- User context
  is_guest_checkout BOOLEAN,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,

  -- Error tracking (if event_status = 'failure')
  error_message TEXT,
  error_code TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_monitoring_events_type ON checkout_monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_checkout_monitoring_events_status ON checkout_monitoring_events(event_status);
CREATE INDEX IF NOT EXISTS idx_checkout_monitoring_events_timestamp ON checkout_monitoring_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_monitoring_events_cart_id ON checkout_monitoring_events(cart_id);
CREATE INDEX IF NOT EXISTS idx_checkout_monitoring_events_order_id ON checkout_monitoring_events(order_id);

COMMENT ON TABLE checkout_monitoring_events IS 'Real-time checkout journey tracking for monitoring and analytics';
COMMENT ON COLUMN checkout_monitoring_events.event_type IS 'Checkout funnel step: cart_created, checkout_started, shipping_calculated, payment_attempted, order_completed';

-- ============================================================================
-- 5. SHIPPING ZONE CONFIGURATIONS (for auditing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipping_zone_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- BigCommerce shipping zone data
  zone_id INTEGER NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT NOT NULL, -- 'country', 'state', 'zip', 'global'

  -- Configuration
  enabled BOOLEAN NOT NULL,
  locations JSONB NOT NULL, -- Array of locations covered by this zone
  methods JSONB NOT NULL, -- Array of shipping methods available

  -- Free shipping settings
  free_shipping_enabled BOOLEAN,
  free_shipping_minimum NUMERIC(10, 2),

  -- Handling fees
  handling_fee NUMERIC(10, 2),

  -- Snapshot metadata
  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_reason TEXT, -- 'scheduled_audit', 'config_change', 'error_investigation'

  -- Change tracking
  previous_snapshot_id UUID REFERENCES shipping_zone_snapshots(id),
  changes_detected JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipping_zone_snapshots_zone_id ON shipping_zone_snapshots(zone_id);
CREATE INDEX IF NOT EXISTS idx_shipping_zone_snapshots_taken_at ON shipping_zone_snapshots(snapshot_taken_at DESC);

COMMENT ON TABLE shipping_zone_snapshots IS 'Historical snapshots of shipping zone configurations for change tracking';
COMMENT ON COLUMN shipping_zone_snapshots.snapshot_reason IS 'Why this snapshot was taken: scheduled_audit, config_change, error_investigation';

-- ============================================================================
-- 6. DEPLOYMENT HISTORY (for rollback tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkout_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Deployment identification
  deployment_number INTEGER NOT NULL,
  deployment_type TEXT NOT NULL, -- 'theme_update', 'app_update', 'config_change', 'hotfix'

  -- Version control
  git_commit_sha TEXT NOT NULL,
  git_branch TEXT NOT NULL,
  git_tag TEXT,

  -- Deployment details
  deployed_by TEXT NOT NULL, -- 'ci', 'manual', 'agent'
  deployment_environment TEXT NOT NULL, -- 'production', 'staging'

  -- Quality gates (from CI/CD)
  lighthouse_score INTEGER,
  test_pass_rate NUMERIC(5, 2),
  total_tests_run INTEGER,
  total_tests_passed INTEGER,

  -- Theme details (for Stencil deployments)
  theme_version TEXT,
  theme_name TEXT,
  stencil_bundle_hash TEXT,

  -- Deployment status
  status TEXT NOT NULL CHECK (status IN ('pending', 'deploying', 'deployed', 'failed', 'rolled_back')),

  -- Rollback information
  rollback_reason TEXT,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_to_deployment_id UUID REFERENCES checkout_deployments(id),

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- CI/CD integration
  ci_pipeline_url TEXT,
  ci_build_number TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  deployment_notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_deployments_number ON checkout_deployments(deployment_number DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_deployments_status ON checkout_deployments(status);
CREATE INDEX IF NOT EXISTS idx_checkout_deployments_started_at ON checkout_deployments(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_deployments_commit ON checkout_deployments(git_commit_sha);

COMMENT ON TABLE checkout_deployments IS 'Tracks all checkout-related deployments for auditing and rollback';
COMMENT ON COLUMN checkout_deployments.status IS 'Deployment state: pending, deploying, deployed, failed, rolled_back';

-- ============================================================================
-- 7. VIEWS FOR MONITORING & ANALYTICS
-- ============================================================================

-- View: Recent checkout errors
CREATE OR REPLACE VIEW recent_checkout_errors AS
SELECT
  error_type,
  error_message,
  shipping_address_state,
  shipping_address_postcode,
  COUNT(*) as occurrence_count,
  MAX(occurred_at) as last_occurred,
  MIN(occurred_at) as first_occurred,
  ROUND(AVG(cart_value), 2) as avg_cart_value
FROM checkout_error_logs
WHERE occurred_at > NOW() - INTERVAL '7 days'
  AND resolved = false
GROUP BY error_type, error_message, shipping_address_state, shipping_address_postcode
ORDER BY occurrence_count DESC, last_occurred DESC;

COMMENT ON VIEW recent_checkout_errors IS 'Summary of unresolved checkout errors in the last 7 days';

-- View: Checkout health summary
CREATE OR REPLACE VIEW checkout_health_summary AS
SELECT
  DATE_TRUNC('hour', event_timestamp) as hour,
  event_type,
  event_status,
  COUNT(*) as event_count,
  ROUND(AVG(checkout_step_duration_ms), 0) as avg_duration_ms,
  ROUND(AVG(cart_value), 2) as avg_cart_value,
  COUNT(DISTINCT cart_id) as unique_carts
FROM checkout_monitoring_events
WHERE event_timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', event_timestamp), event_type, event_status
ORDER BY hour DESC, event_type;

COMMENT ON VIEW checkout_health_summary IS 'Hourly checkout funnel metrics for the last 24 hours';

-- View: Test results summary
CREATE OR REPLACE VIEW test_results_summary AS
SELECT
  test_suite,
  test_type,
  status,
  COUNT(*) as test_count,
  ROUND(AVG(execution_time_ms), 0) as avg_execution_time_ms,
  MAX(started_at) as last_run_at,
  ROUND(AVG(lighthouse_score), 0) as avg_lighthouse_score
FROM checkout_test_results
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY test_suite, test_type, status
ORDER BY test_suite, test_type, status;

COMMENT ON VIEW test_results_summary IS 'Test execution summary for the last 30 days';

-- View: BigCommerce API health
CREATE OR REPLACE VIEW bigcommerce_api_health AS
SELECT
  DATE_TRUNC('hour', called_at) as hour,
  endpoint,
  method,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ROUND(AVG(response_time_ms), 0) as avg_response_time_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms), 0) as p95_response_time_ms
FROM bigcommerce_api_metrics
WHERE called_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', called_at), endpoint, method
ORDER BY hour DESC, total_calls DESC;

COMMENT ON VIEW bigcommerce_api_health IS 'API performance and reliability metrics for the last 24 hours';

-- View: Shipping error hotspots
CREATE OR REPLACE VIEW shipping_error_hotspots AS
SELECT
  shipping_address_state as state,
  shipping_address_postcode as postcode,
  shipping_address_city as city,
  COUNT(*) as error_count,
  MAX(occurred_at) as last_error,
  ARRAY_AGG(DISTINCT error_message) as error_messages,
  ROUND(AVG(cart_value), 2) as avg_cart_value
FROM checkout_error_logs
WHERE error_type IN ('shipping_address', 'shipping_method')
  AND occurred_at > NOW() - INTERVAL '30 days'
  AND resolved = false
GROUP BY shipping_address_state, shipping_address_postcode, shipping_address_city
HAVING COUNT(*) > 1
ORDER BY error_count DESC, last_error DESC;

COMMENT ON VIEW shipping_error_hotspots IS 'Geographic areas with recurring shipping errors';

-- ============================================================================
-- 8. AUTOMATED CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_checkout_data()
RETURNS void AS $$
BEGIN
  -- Delete resolved errors older than 90 days
  DELETE FROM checkout_error_logs
  WHERE resolved = true
    AND resolved_at < NOW() - INTERVAL '90 days';

  -- Delete API metrics older than 30 days
  DELETE FROM bigcommerce_api_metrics
  WHERE called_at < NOW() - INTERVAL '30 days';

  -- Delete successful monitoring events older than 7 days
  DELETE FROM checkout_monitoring_events
  WHERE event_status = 'success'
    AND event_timestamp < NOW() - INTERVAL '7 days';

  -- Delete test results older than 90 days (keep failures longer)
  DELETE FROM checkout_test_results
  WHERE status = 'passed'
    AND started_at < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Cleanup completed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_checkout_data IS 'Automated cleanup of old checkout tracking data (run weekly)';

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE checkout_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bigcommerce_api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_monitoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zone_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_deployments ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (full access)
CREATE POLICY "Service role has full access to checkout_error_logs"
  ON checkout_error_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to checkout_test_results"
  ON checkout_test_results FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to bigcommerce_api_metrics"
  ON bigcommerce_api_metrics FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to checkout_monitoring_events"
  ON checkout_monitoring_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to shipping_zone_snapshots"
  ON shipping_zone_snapshots FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to checkout_deployments"
  ON checkout_deployments FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
