-- Migration: Job Monitoring Dashboard
-- Description: Track status of all automated jobs across businesses
-- Run in: Supabase SQL Editor (shared instance: qcvfxxsnqvdfmpbcgdni)

-- Table: dashboard_job_status
CREATE TABLE IF NOT EXISTS dashboard_job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL,  -- 'cron', 'n8n', 'edge_function', 'webhook', 'manual'
  business TEXT,           -- 'boo', 'teelixir', 'elevate', 'rhf', 'all', NULL for infra
  schedule TEXT,           -- Cron expression or description
  description TEXT,        -- Human-readable description
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  status TEXT DEFAULT 'unknown',  -- 'healthy', 'stale', 'failed', 'unknown'
  expected_interval_hours INTEGER DEFAULT 24,
  error_message TEXT,
  source_table TEXT,       -- Table to check for last run (e.g., 'automation_logs')
  source_query TEXT,       -- SQL to check status
  relevant_files TEXT[],   -- File paths for fix command
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_name, business)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_status_business ON dashboard_job_status(business);
CREATE INDEX IF NOT EXISTS idx_job_status_status ON dashboard_job_status(status);
CREATE INDEX IF NOT EXISTS idx_job_status_type ON dashboard_job_status(job_type);

-- Seed job definitions
INSERT INTO dashboard_job_status (job_name, job_type, business, schedule, description, expected_interval_hours, relevant_files) VALUES

-- BOO Cron Jobs
('stock-sync', 'cron', 'boo', '8:00 AM & 8:00 PM AEST', 'Syncs stock from 4 suppliers (UHP, Kadac, Oborne, Unleashed) to BigCommerce', 12,
  ARRAY['buy-organics-online/stock-sync-cron.js', 'buy-organics-online/sync-all-suppliers.js']),

('gmc-sync', 'cron', 'boo', '3:00 AM AEST (17:00 UTC)', 'Google Merchant Center product status sync and snapshot', 24,
  ARRAY['buy-organics-online/gmc-sync-cron.js', 'shared/libs/integrations/google-merchant/sync-products.js']),

('gsc-issues-sync', 'cron', 'boo', '2:00 AM AEST (16:00 UTC)', 'Google Search Console anomaly detection and URL inspection', 24,
  ARRAY['buy-organics-online/gsc-issues-cron.js', 'shared/libs/integrations/gsc/sync-gsc-issues.js']),

-- BOO n8n Workflows
('bc-product-sync', 'n8n', 'boo', 'Daily 3 AM', 'BigCommerce products sync to database', 24,
  ARRAY['buy-organics-online/n8n-workflows/01-bigcommerce-product-sync.json']),

('checkout-error-email', 'webhook', 'boo', 'On checkout error', 'Send checkout error notification emails via n8n', 168,
  ARRAY['infra/n8n-workflows/boo-checkout-error-email.json']),

-- Teelixir Webhooks/Syncs
('shopify-customer-sync', 'webhook', 'teelixir', 'Real-time (webhook)', 'Shopify customer create/update to HubSpot', 168,
  ARRAY['infra/n8n-workflows/templates/shopify-customer-sync.json', 'scripts/register-shopify-webhooks.ts']),

('shopify-order-sync', 'webhook', 'teelixir', 'Real-time (webhook)', 'Shopify order create/update to HubSpot', 168,
  ARRAY['infra/n8n-workflows/templates/shopify-order-sync.json', 'scripts/register-shopify-webhooks.ts']),

('teelixir-inventory-sync', 'manual', 'teelixir', 'Manual trigger', 'Unleashed to Shopify stock levels sync', 24,
  ARRAY['unleashed-shopify-sync/src/inventory-sync.ts', 'unleashed-shopify-sync/scripts/run-inventory-sync.ts']),

('teelixir-order-sync', 'manual', 'teelixir', 'Manual trigger', 'Shopify to Unleashed order sync', 24,
  ARRAY['unleashed-shopify-sync/src/order-sync.ts']),

-- Elevate Wholesale
('trial-expiration-sync', 'edge_function', 'elevate', '2:00 AM UTC (Deno.cron)', 'Disable expired trials, update HubSpot, deactivate inactive customers', 24,
  ARRAY['elevate-wholesale/supabase/functions/sync-trial-expirations/index.ts']),

('hubspot-to-shopify-sync', 'edge_function', 'elevate', 'HubSpot webhook', 'Create Shopify B2B accounts and trial discount codes', 168,
  ARRAY['elevate-wholesale/supabase/functions/hubspot-to-shopify-sync/index.ts']),

('shopify-to-unleashed-sync', 'edge_function', 'elevate', 'Shopify webhook', 'Process Shopify orders to Unleashed sales orders', 168,
  ARRAY['elevate-wholesale/supabase/functions/shopify-to-unleashed-sync/index.ts']),

-- Red Hill Fresh
('woocommerce-sync', 'manual', 'rhf', 'Manual trigger', 'Complete WooCommerce data sync (products, orders, customers)', 168,
  ARRAY['red-hill-fresh/scripts/sync-woocommerce.ts']),

-- Infrastructure n8n Workflows
('health-check', 'n8n', NULL, 'Every 5 minutes', 'System health monitoring across all integrations', 1,
  ARRAY['infra/n8n-workflows/templates/health-check-workflow.json']),

('error-monitoring', 'n8n', NULL, 'Every 15 minutes', 'Error aggregation and Slack alerts', 1,
  ARRAY['infra/n8n-workflows/templates/error-monitoring-workflow.json']),

('business-sync', 'n8n', NULL, 'Every 4 hours', 'HubSpot business data sync', 4,
  ARRAY['infra/n8n-workflows/templates/business-sync-workflow.json']),

('daily-summary', 'n8n', NULL, 'Daily 9:00 AM', 'Daily operations summary report', 24,
  ARRAY['infra/n8n-workflows/templates/daily-summary-workflow.json']),

('unleashed-order-sync', 'n8n', NULL, 'Every 6 hours', 'Unleashed to HubSpot deals sync', 6,
  ARRAY['infra/n8n-workflows/templates/unleashed-order-sync.json']),

('unleashed-customer-sync', 'n8n', NULL, 'Every 6 hours', 'Unleashed to HubSpot B2B customer sync', 6,
  ARRAY['infra/n8n-workflows/templates/unleashed-customer-sync.json']),

-- Manual/On-Demand Scripts
('xero-financial-sync', 'manual', NULL, 'Manual trigger', 'Complete financial data sync from Xero with intercompany eliminations', 168,
  ARRAY['scripts/financials/sync-xero-to-supabase.ts']),

('livechat-sync', 'manual', 'boo', 'Manual trigger', 'LiveChat conversation archives to Supabase', 168,
  ARRAY['shared/libs/integrations/livechat/sync-conversations.js']),

('google-ads-sync', 'manual', 'boo', 'On-demand', 'Google Ads campaign metrics sync', 24,
  ARRAY['shared/libs/integrations/google-ads/sync-service.ts'])

ON CONFLICT (job_name, business) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  description = EXCLUDED.description,
  expected_interval_hours = EXCLUDED.expected_interval_hours,
  relevant_files = EXCLUDED.relevant_files,
  updated_at = NOW();

-- View for job health summary
CREATE OR REPLACE VIEW v_job_health_summary AS
SELECT
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'healthy') as healthy_jobs,
  COUNT(*) FILTER (WHERE status = 'stale') as stale_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE status = 'unknown') as unknown_jobs,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'healthy') / NULLIF(COUNT(*), 0), 1) as health_percentage
FROM dashboard_job_status;

-- View for unhealthy jobs
CREATE OR REPLACE VIEW v_unhealthy_jobs AS
SELECT
  id,
  job_name,
  job_type,
  business,
  schedule,
  description,
  last_run_at,
  last_success_at,
  status,
  expected_interval_hours,
  error_message,
  relevant_files,
  CASE
    WHEN last_success_at IS NULL THEN 'Never run'
    ELSE CONCAT(
      EXTRACT(DAY FROM NOW() - last_success_at)::int, ' days, ',
      EXTRACT(HOUR FROM NOW() - last_success_at)::int, ' hours ago'
    )
  END as last_success_ago
FROM dashboard_job_status
WHERE status IN ('stale', 'failed', 'unknown')
ORDER BY
  CASE status
    WHEN 'failed' THEN 1
    WHEN 'stale' THEN 2
    WHEN 'unknown' THEN 3
  END,
  job_name;

-- Function to update job status based on last run
CREATE OR REPLACE FUNCTION update_job_status(
  p_job_name TEXT,
  p_business TEXT,
  p_last_run TIMESTAMPTZ,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_expected_hours INTEGER;
BEGIN
  -- Get expected interval
  SELECT expected_interval_hours INTO v_expected_hours
  FROM dashboard_job_status
  WHERE job_name = p_job_name
    AND (business = p_business OR (business IS NULL AND p_business IS NULL));

  -- Update the job status
  UPDATE dashboard_job_status
  SET
    last_run_at = p_last_run,
    last_success_at = CASE WHEN p_success THEN p_last_run ELSE last_success_at END,
    status = CASE
      WHEN NOT p_success THEN 'failed'
      WHEN p_last_run < NOW() - (v_expected_hours || ' hours')::interval THEN 'stale'
      ELSE 'healthy'
    END,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE job_name = p_job_name
    AND (business = p_business OR (business IS NULL AND p_business IS NULL));
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all job statuses (called by API)
CREATE OR REPLACE FUNCTION refresh_job_statuses()
RETURNS TABLE (
  total_jobs BIGINT,
  healthy_jobs BIGINT,
  stale_jobs BIGINT,
  failed_jobs BIGINT,
  unknown_jobs BIGINT,
  health_percentage NUMERIC
) AS $$
BEGIN
  -- Mark jobs as stale if they haven't run within expected interval
  UPDATE dashboard_job_status
  SET
    status = CASE
      WHEN last_success_at IS NULL THEN 'unknown'
      WHEN last_success_at < NOW() - (expected_interval_hours || ' hours')::interval THEN 'stale'
      ELSE 'healthy'
    END,
    updated_at = NOW()
  WHERE status != 'failed';  -- Don't auto-clear failed status

  -- Return summary
  RETURN QUERY SELECT * FROM v_job_health_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE dashboard_job_status IS 'Tracks status of all automated jobs across businesses for the ops dashboard';
