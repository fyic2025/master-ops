-- =============================================================================
-- COMBINED SCHEMA DEPLOYMENT
-- Target: usibnysqelovfuctmkqw.supabase.co
-- Run in: Supabase SQL Editor
-- Date: 2025-12-01
-- =============================================================================

-- =============================================================================
-- PART 1: BUSINESS VIEWS SCHEMA
-- =============================================================================

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
-- PART 2: JOB MONITORING DASHBOARD
-- =============================================================================

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

-- =============================================================================
-- PART 3: TEELIXIR DISTRIBUTOR INTELLIGENCE
-- =============================================================================

-- =============================================================================
-- PRODUCT GROUPS (for grouping SKU variants like Lions Mane 50g/100g/250g)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT UNIQUE NOT NULL,              -- 'LIONS_MANE', 'REISHI', 'CHAGA'
  group_name TEXT NOT NULL,                     -- 'Lions Mane Extract'
  category TEXT,                                -- 'Mushroom Extracts', 'Blends'
  display_order INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PRODUCTS (all Teelixir SKUs from Unleashed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unleashed_guid TEXT UNIQUE,
  product_code TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_group_id UUID REFERENCES tlx_product_groups(id),

  -- Size/variant parsed from name
  size_value DECIMAL(10,2),                     -- 50, 100, 250
  size_unit TEXT,                               -- 'g', 'ml', 'capsules'
  variant_type TEXT,                            -- 'powder', 'capsule', 'tincture'

  -- Pricing
  wholesale_price DECIMAL(10,2),
  rrp DECIMAL(10,2),
  cost_price DECIMAL(10,2),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_sellable BOOLEAN DEFAULT TRUE,
  is_discontinued BOOLEAN DEFAULT FALSE,

  -- Stock
  stock_on_hand INTEGER DEFAULT 0,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_products_code ON tlx_products(product_code);
CREATE INDEX IF NOT EXISTS idx_tlx_products_group ON tlx_products(product_group_id);
CREATE INDEX IF NOT EXISTS idx_tlx_products_active ON tlx_products(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- DISTRIBUTORS (customers from Unleashed that are NOT B2C)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unleashed_guid TEXT UNIQUE NOT NULL,
  customer_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,

  -- Contact
  email TEXT,
  phone TEXT,
  contact_name TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',

  -- Classification
  region TEXT,                                   -- 'NSW', 'VIC', 'QLD', etc.
  distributor_type TEXT,                         -- 'wholesale', 'retail_chain'

  -- Denormalized metrics (updated by sync job)
  first_order_date DATE,
  last_order_date DATE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'at_risk', 'churned', 'prospect')),

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_distributors_code ON tlx_distributors(customer_code);
CREATE INDEX IF NOT EXISTS idx_tlx_distributors_status ON tlx_distributors(status);
CREATE INDEX IF NOT EXISTS idx_tlx_distributors_last_order ON tlx_distributors(last_order_date DESC);

-- =============================================================================
-- DISTRIBUTOR ORDERS (sales orders from Unleashed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_distributor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES tlx_distributors(id) ON DELETE CASCADE,
  unleashed_order_guid TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,

  -- Dates
  order_date DATE NOT NULL,
  required_date DATE,
  completed_date DATE,

  -- Status
  order_status TEXT NOT NULL,                   -- 'Completed', 'Parked', 'Open'

  -- Financials
  subtotal DECIMAL(12,2),
  tax_total DECIMAL(10,2),
  total DECIMAL(12,2),
  currency TEXT DEFAULT 'AUD',

  -- Notes (raw from Unleashed)
  comments TEXT,

  -- OOS parsing flags
  has_oos_mention BOOLEAN DEFAULT FALSE,
  has_discontinued_mention BOOLEAN DEFAULT FALSE,
  parsed_notes JSONB,                           -- Structured parsing results

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(order_number)
);

CREATE INDEX IF NOT EXISTS idx_tlx_orders_distributor ON tlx_distributor_orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_tlx_orders_date ON tlx_distributor_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_tlx_orders_status ON tlx_distributor_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_tlx_orders_oos ON tlx_distributor_orders(has_oos_mention) WHERE has_oos_mention = TRUE;

-- =============================================================================
-- ORDER LINE ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES tlx_distributor_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES tlx_products(id),

  -- Line details
  line_number INTEGER,
  product_code TEXT NOT NULL,
  product_description TEXT,

  -- Quantities
  quantity_ordered DECIMAL(12,2) NOT NULL,
  quantity_shipped DECIMAL(12,2) DEFAULT 0,
  quantity_backordered DECIMAL(12,2) DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2),
  line_tax DECIMAL(10,2),

  -- Line-level notes
  line_comments TEXT,
  has_oos_mention BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_lines_order ON tlx_order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tlx_lines_product ON tlx_order_line_items(product_code);
CREATE INDEX IF NOT EXISTS idx_tlx_lines_product_id ON tlx_order_line_items(product_id) WHERE product_id IS NOT NULL;

-- =============================================================================
-- OOS NOTES (parsed from order comments)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_oos_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES tlx_distributor_orders(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES tlx_order_line_items(id) ON DELETE CASCADE,

  -- Note classification
  note_type TEXT NOT NULL CHECK (note_type IN (
    'out_of_stock',
    'short_supply',
    'discontinued',
    'backordered',
    'substituted',
    'partial_shipment',
    'other'
  )),

  -- Product reference
  product_code TEXT,
  product_id UUID REFERENCES tlx_products(id),

  -- Details
  original_text TEXT NOT NULL,
  parsed_quantity INTEGER,
  expected_date DATE,

  -- Resolution tracking
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert (prevent duplicate notes per order)
  UNIQUE(order_id, original_text)
);

CREATE INDEX IF NOT EXISTS idx_tlx_oos_order ON tlx_oos_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_tlx_oos_product ON tlx_oos_notes(product_id);
CREATE INDEX IF NOT EXISTS idx_tlx_oos_type ON tlx_oos_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_tlx_oos_unresolved ON tlx_oos_notes(is_resolved) WHERE is_resolved = FALSE;

-- =============================================================================
-- SYNC LOG (track sync operations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,                      -- 'products', 'customers', 'orders', 'full'
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'success', 'partial', 'failed')),

  -- Counts
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Pagination tracking (for resume)
  last_page_processed INTEGER,
  total_pages INTEGER,
  last_modified_since TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_sync_type ON tlx_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_tlx_sync_started ON tlx_sync_log(started_at DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Distributor overview with health status
CREATE OR REPLACE VIEW v_tlx_distributor_overview AS
SELECT
  d.id,
  d.customer_code,
  d.customer_name,
  d.email,
  d.region,
  d.status,
  d.first_order_date,
  d.last_order_date,
  d.total_orders,
  d.total_revenue,
  d.avg_order_value,
  CURRENT_DATE - d.last_order_date as days_since_order,
  CASE
    WHEN d.last_order_date IS NULL THEN 'prospect'
    WHEN d.last_order_date < CURRENT_DATE - 60 THEN 'churning'
    WHEN d.last_order_date < CURRENT_DATE - 30 THEN 'at_risk'
    ELSE 'active'
  END as health_status
FROM tlx_distributors d;

-- Monthly order trends by distributor
CREATE OR REPLACE VIEW v_tlx_monthly_trends AS
SELECT
  d.id as distributor_id,
  d.customer_code,
  d.customer_name,
  DATE_TRUNC('month', o.order_date) as month,
  COUNT(o.id) as order_count,
  SUM(o.total) as revenue,
  AVG(o.total) as avg_order_value,
  COUNT(DISTINCT li.product_code) as unique_products
FROM tlx_distributors d
JOIN tlx_distributor_orders o ON d.id = o.distributor_id
LEFT JOIN tlx_order_line_items li ON o.id = li.order_id
WHERE o.order_status IN ('Completed', 'Open')
GROUP BY d.id, d.customer_code, d.customer_name, DATE_TRUNC('month', o.order_date)
ORDER BY month DESC;

-- Product group performance
CREATE OR REPLACE VIEW v_tlx_product_group_performance AS
SELECT
  pg.id as group_id,
  pg.group_code,
  pg.group_name,
  pg.category,
  COUNT(DISTINCT li.order_id) as order_count,
  SUM(li.quantity_ordered) as total_units_sold,
  SUM(li.line_total) as total_revenue,
  COUNT(DISTINCT o.distributor_id) as unique_distributors,
  AVG(li.unit_price) as avg_unit_price
FROM tlx_product_groups pg
JOIN tlx_products p ON pg.id = p.product_group_id
JOIN tlx_order_line_items li ON p.product_code = li.product_code
JOIN tlx_distributor_orders o ON li.order_id = o.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY pg.id, pg.group_code, pg.group_name, pg.category
ORDER BY total_revenue DESC;

-- OOS summary
CREATE OR REPLACE VIEW v_tlx_oos_summary AS
SELECT
  oos.product_code,
  p.product_name,
  pg.group_name,
  oos.note_type,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT oos.order_id) as affected_orders,
  COUNT(*) FILTER (WHERE NOT oos.is_resolved) as unresolved_count,
  MIN(oos.detected_at) as first_detected,
  MAX(oos.detected_at) as last_detected
FROM tlx_oos_notes oos
LEFT JOIN tlx_products p ON oos.product_id = p.id
LEFT JOIN tlx_product_groups pg ON p.product_group_id = pg.id
WHERE oos.detected_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY oos.product_code, p.product_name, pg.group_name, oos.note_type
ORDER BY occurrence_count DESC;

-- Distributor product mix (what each distributor buys)
CREATE OR REPLACE VIEW v_tlx_distributor_product_mix AS
SELECT
  d.id as distributor_id,
  d.customer_code,
  d.customer_name,
  pg.group_code,
  pg.group_name,
  SUM(li.quantity_ordered) as total_units,
  SUM(li.line_total) as total_spend,
  COUNT(DISTINCT o.id) as order_count
FROM tlx_distributors d
JOIN tlx_distributor_orders o ON d.id = o.distributor_id
JOIN tlx_order_line_items li ON o.id = li.order_id
LEFT JOIN tlx_products p ON li.product_code = p.product_code
LEFT JOIN tlx_product_groups pg ON p.product_group_id = pg.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY d.id, d.customer_code, d.customer_name, pg.group_code, pg.group_name
ORDER BY d.customer_name, total_spend DESC;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update distributor metrics after order sync
CREATE OR REPLACE FUNCTION update_distributor_metrics(p_distributor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tlx_distributors
  SET
    first_order_date = (
      SELECT MIN(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    last_order_date = (
      SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    total_orders = (
      SELECT COUNT(*) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    total_revenue = (
      SELECT COALESCE(SUM(total), 0) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    avg_order_value = (
      SELECT COALESCE(AVG(total), 0) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    status = CASE
      WHEN (SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id) IS NULL THEN 'prospect'
      WHEN (SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id) < CURRENT_DATE - 60 THEN 'churned'
      WHEN (SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id) < CURRENT_DATE - 30 THEN 'at_risk'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE id = p_distributor_id;
END;
$$;

-- Function to update all distributor metrics (batch)
CREATE OR REPLACE FUNCTION update_all_distributor_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_distributor_id UUID;
BEGIN
  FOR v_distributor_id IN SELECT id FROM tlx_distributors LOOP
    PERFORM update_distributor_metrics(v_distributor_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

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

-- Drop triggers if they exist (to avoid errors on re-run)
DROP TRIGGER IF EXISTS tr_tlx_products_updated_at ON tlx_products;
DROP TRIGGER IF EXISTS tr_tlx_distributors_updated_at ON tlx_distributors;
DROP TRIGGER IF EXISTS tr_tlx_orders_updated_at ON tlx_distributor_orders;
DROP TRIGGER IF EXISTS tr_tlx_product_groups_updated_at ON tlx_product_groups;
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;

CREATE TRIGGER tr_tlx_products_updated_at
  BEFORE UPDATE ON tlx_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tlx_distributors_updated_at
  BEFORE UPDATE ON tlx_distributors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tlx_orders_updated_at
  BEFORE UPDATE ON tlx_distributor_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tlx_product_groups_updated_at
  BEFORE UPDATE ON tlx_product_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE tlx_product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_distributor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_oos_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_sync_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Service role full access" ON tlx_product_groups;
DROP POLICY IF EXISTS "Service role full access" ON tlx_products;
DROP POLICY IF EXISTS "Service role full access" ON tlx_distributors;
DROP POLICY IF EXISTS "Service role full access" ON tlx_distributor_orders;
DROP POLICY IF EXISTS "Service role full access" ON tlx_order_line_items;
DROP POLICY IF EXISTS "Service role full access" ON tlx_oos_notes;
DROP POLICY IF EXISTS "Service role full access" ON tlx_sync_log;

-- Allow service role full access
CREATE POLICY "Service role full access" ON tlx_product_groups FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_products FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_distributors FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_distributor_orders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_order_line_items FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_oos_notes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_sync_log FOR ALL USING (true);

-- =============================================================================
-- PART 4: TEELIXIR AUTOMATIONS
-- =============================================================================

-- ============================================================================
-- Table 1: tlx_klaviyo_unengaged
-- Weekly sync from Klaviyo's unengaged segment
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_klaviyo_unengaged (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klaviyo_profile_id TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  last_order_date TIMESTAMPTZ,
  total_orders INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tlx_klaviyo_unengaged_profile_id_unique UNIQUE (klaviyo_profile_id),
  CONSTRAINT tlx_klaviyo_unengaged_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_tlx_unengaged_email ON tlx_klaviyo_unengaged(email);
CREATE INDEX IF NOT EXISTS idx_tlx_unengaged_synced ON tlx_klaviyo_unengaged(synced_at);

COMMENT ON TABLE tlx_klaviyo_unengaged IS 'Weekly sync of unengaged profiles from Klaviyo segment';
COMMENT ON COLUMN tlx_klaviyo_unengaged.klaviyo_profile_id IS 'Klaviyo profile ID';
COMMENT ON COLUMN tlx_klaviyo_unengaged.synced_at IS 'Last sync timestamp from Klaviyo';

-- ============================================================================
-- Table 2: tlx_winback_emails
-- Tracking sent winback emails and their outcomes
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_winback_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  klaviyo_profile_id TEXT,
  first_name TEXT,
  discount_code TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  order_id TEXT,
  order_total DECIMAL(10,2),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'clicked', 'converted', 'bounced', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_winback_email ON tlx_winback_emails(email);
CREATE INDEX IF NOT EXISTS idx_tlx_winback_status ON tlx_winback_emails(status);
CREATE INDEX IF NOT EXISTS idx_tlx_winback_sent ON tlx_winback_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_tlx_winback_discount ON tlx_winback_emails(discount_code);

COMMENT ON TABLE tlx_winback_emails IS 'Tracking winback campaign emails sent via GSuite';
COMMENT ON COLUMN tlx_winback_emails.status IS 'sent=delivered, clicked=link clicked, converted=purchased, bounced=delivery failed, failed=send error';

-- ============================================================================
-- Table 3: tlx_automation_config
-- Configuration for automation jobs (expandable for future automations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tlx_automation_config_type_unique UNIQUE (automation_type)
);

CREATE INDEX IF NOT EXISTS idx_tlx_automation_type ON tlx_automation_config(automation_type);
CREATE INDEX IF NOT EXISTS idx_tlx_automation_enabled ON tlx_automation_config(enabled);

COMMENT ON TABLE tlx_automation_config IS 'Configuration for Teelixir automation jobs';
COMMENT ON COLUMN tlx_automation_config.automation_type IS 'Unique identifier for the automation (e.g., winback_40)';
COMMENT ON COLUMN tlx_automation_config.config IS 'JSON configuration specific to each automation type';
COMMENT ON COLUMN tlx_automation_config.last_run_result IS 'Result/stats from last run';

-- ============================================================================
-- Insert default configuration for winback campaign
-- ============================================================================
INSERT INTO tlx_automation_config (automation_type, enabled, config) VALUES
('winback_40', false, '{
  "daily_limit": 20,
  "discount_code": "MISSYOU40",
  "discount_percent": 40,
  "sender_email": "colette@teelixir.com",
  "sender_name": "Colette from Teelixir",
  "subject_template": "{{ first_name }}, we miss you! Here''s 40% off",
  "klaviyo_segment_id": null
}'::jsonb)
ON CONFLICT (automation_type) DO NOTHING;

-- ============================================================================
-- Helper function to update automation last_run
-- ============================================================================
CREATE OR REPLACE FUNCTION update_automation_last_run(
  p_automation_type TEXT,
  p_result JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE tlx_automation_config
  SET
    last_run_at = NOW(),
    last_run_result = COALESCE(p_result, last_run_result),
    updated_at = NOW()
  WHERE automation_type = p_automation_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- View: winback campaign stats
-- ============================================================================
CREATE OR REPLACE VIEW tlx_winback_stats AS
SELECT
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE status = 'clicked') AS total_clicked,
  COUNT(*) FILTER (WHERE status = 'converted') AS total_converted,
  COUNT(*) FILTER (WHERE status = 'bounced') AS total_bounced,
  COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
  COALESCE(SUM(order_total) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours') AS sent_today,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days') AS sent_this_week,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'clicked')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS click_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'converted')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS conversion_rate_percent
FROM tlx_winback_emails;

COMMENT ON VIEW tlx_winback_stats IS 'Aggregated stats for winback campaign dashboard';

-- =============================================================================
-- DEPLOYMENT COMPLETE
-- =============================================================================
-- Tables created:
--   - businesses (with 4 core businesses seeded)
--   - dashboard_job_status (with 22 jobs seeded)
--   - tlx_product_groups
--   - tlx_products
--   - tlx_distributors
--   - tlx_distributor_orders
--   - tlx_order_line_items
--   - tlx_oos_notes
--   - tlx_sync_log
--   - tlx_klaviyo_unengaged
--   - tlx_winback_emails
--   - tlx_automation_config
--
-- Views created:
--   - v_job_health_summary
--   - v_unhealthy_jobs
--   - v_tlx_distributor_overview
--   - v_tlx_monthly_trends
--   - v_tlx_product_group_performance
--   - v_tlx_oos_summary
--   - v_tlx_distributor_product_mix
--   - tlx_winback_stats
--
-- Functions created:
--   - update_job_status()
--   - refresh_job_statuses()
--   - update_distributor_metrics()
--   - update_all_distributor_metrics()
--   - update_automation_last_run()
--   - update_updated_at_column()
-- =============================================================================
