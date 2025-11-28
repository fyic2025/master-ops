-- ============================================================================
-- DASHBOARD HUB SCHEMA
-- Master project (teelixir_leads): qcvfxxsnqvdfmpbcgdni
-- Created: 2025-11-28
-- Purpose: Central dashboard tables for multi-business operations monitoring
-- ============================================================================

-- ============================================================================
-- DASHBOARD-SPECIFIC TABLES
-- ============================================================================

-- System alerts across all businesses
CREATE TABLE IF NOT EXISTS dashboard_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,  -- 'boo', 'teelixir', 'elevate', 'rhf', 'all'
    type TEXT NOT NULL CHECK (type IN ('warning', 'info', 'success', 'error')),
    title TEXT NOT NULL,
    message TEXT,
    action_url TEXT,
    action_label TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboard_alerts_business ON dashboard_alerts(business);
CREATE INDEX idx_dashboard_alerts_created ON dashboard_alerts(created_at DESC);
CREATE INDEX idx_dashboard_alerts_unread ON dashboard_alerts(is_read) WHERE is_read = FALSE;

-- Daily business metrics (orders, revenue)
CREATE TABLE IF NOT EXISTS dashboard_business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,  -- 'boo', 'teelixir', 'elevate', 'rhf'
    date DATE NOT NULL,
    orders_today INTEGER DEFAULT 0,
    revenue_today DECIMAL(10,2) DEFAULT 0,
    revenue_mtd DECIMAL(10,2) DEFAULT 0,
    sync_status TEXT DEFAULT 'unknown',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business, date)
);

CREATE INDEX idx_dashboard_metrics_business ON dashboard_business_metrics(business);
CREATE INDEX idx_dashboard_metrics_date ON dashboard_business_metrics(date DESC);

-- Integration health checks
CREATE TABLE IF NOT EXISTS dashboard_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    integration TEXT NOT NULL,  -- 'supabase', 'bigcommerce', 'shopify', 'hubspot', 'google_ads', 'unleashed', 'xero', 'livechat'
    status TEXT DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
    latency_ms INTEGER,
    last_check TIMESTAMPTZ,
    error_message TEXT,
    details JSONB,
    UNIQUE(business, integration)
);

CREATE INDEX idx_dashboard_health_business ON dashboard_health_checks(business);
CREATE INDEX idx_dashboard_health_status ON dashboard_health_checks(status);

-- ============================================================================
-- SYNC TABLES (Data replicated from BOO/Elevate projects)
-- ============================================================================

-- Google Ads metrics (synced from BOO)
CREATE TABLE IF NOT EXISTS sync_google_ads_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,  -- 'boo', 'teelixir', 'rhf'
    account_id TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,
    roas DECIMAL(5,2),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business, campaign_id, date)
);

CREATE INDEX idx_sync_gads_business ON sync_google_ads_metrics(business);
CREATE INDEX idx_sync_gads_date ON sync_google_ads_metrics(date DESC);
CREATE INDEX idx_sync_gads_campaign ON sync_google_ads_metrics(campaign_name);

-- Integration logs (synced from all projects)
CREATE TABLE IF NOT EXISTS sync_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    source TEXT,  -- 'hubspot', 'bigcommerce', 'shopify', 'unleashed', etc.
    level TEXT CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT,
    details JSONB,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_business ON sync_integration_logs(business);
CREATE INDEX idx_sync_logs_level ON sync_integration_logs(level);
CREATE INDEX idx_sync_logs_source ON sync_integration_logs(source);
CREATE INDEX idx_sync_logs_created ON sync_integration_logs(created_at DESC);

-- LiveChat metrics (aggregated from BOO)
CREATE TABLE IF NOT EXISTS sync_livechat_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL DEFAULT 'boo',
    date DATE NOT NULL,
    conversations_total INTEGER DEFAULT 0,
    conversations_closed INTEGER DEFAULT 0,
    avg_response_time_sec INTEGER,
    avg_resolution_time_sec INTEGER,
    sentiment_positive INTEGER DEFAULT 0,
    sentiment_neutral INTEGER DEFAULT 0,
    sentiment_negative INTEGER DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business, date)
);

CREATE INDEX idx_sync_livechat_date ON sync_livechat_metrics(date DESC);

-- Supplier sync status (BOO suppliers)
CREATE TABLE IF NOT EXISTS sync_supplier_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL DEFAULT 'boo',
    supplier_name TEXT NOT NULL,  -- 'oborne', 'uhp', 'kadac', 'kik'
    product_count INTEGER DEFAULT 0,
    last_sync TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'unknown' CHECK (sync_status IN ('healthy', 'stale', 'error', 'unknown')),
    error_message TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business, supplier_name)
);

-- GTMetrix performance (synced from BOO)
CREATE TABLE IF NOT EXISTS sync_gtmetrix_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    url TEXT NOT NULL,
    date DATE NOT NULL,
    performance_score INTEGER,
    structure_score INTEGER,
    lcp_ms INTEGER,  -- Largest Contentful Paint
    tbt_ms INTEGER,  -- Total Blocking Time
    cls DECIMAL(5,3),  -- Cumulative Layout Shift
    fully_loaded_ms INTEGER,
    page_size_bytes INTEGER,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business, url, date)
);

CREATE INDEX idx_sync_gtmetrix_business ON sync_gtmetrix_metrics(business);
CREATE INDEX idx_sync_gtmetrix_date ON sync_gtmetrix_metrics(date DESC);

-- ============================================================================
-- VIEWS FOR DASHBOARD
-- ============================================================================

-- Today's business overview
CREATE OR REPLACE VIEW v_dashboard_today AS
SELECT
    business,
    orders_today,
    revenue_today,
    revenue_mtd,
    sync_status,
    updated_at
FROM dashboard_business_metrics
WHERE date = CURRENT_DATE;

-- Recent alerts (unread first)
CREATE OR REPLACE VIEW v_dashboard_alerts_recent AS
SELECT *
FROM dashboard_alerts
ORDER BY is_read ASC, created_at DESC
LIMIT 50;

-- Integration health summary
CREATE OR REPLACE VIEW v_dashboard_health_summary AS
SELECT
    business,
    COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
    COUNT(*) FILTER (WHERE status = 'degraded') as degraded_count,
    COUNT(*) FILTER (WHERE status = 'down') as down_count,
    COUNT(*) FILTER (WHERE status = 'unknown') as unknown_count,
    MAX(last_check) as last_check
FROM dashboard_health_checks
GROUP BY business;

-- Google Ads 30-day summary by business
CREATE OR REPLACE VIEW v_sync_gads_30d AS
SELECT
    business,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    SUM(cost) as total_cost,
    SUM(conversions) as total_conversions,
    SUM(conversion_value) as total_value,
    CASE WHEN SUM(cost) > 0
        THEN ROUND(SUM(conversion_value) / SUM(cost), 2)
        ELSE 0
    END as roas
FROM sync_google_ads_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY business;

-- Recent errors across all integrations
CREATE OR REPLACE VIEW v_sync_errors_recent AS
SELECT
    business,
    source,
    message,
    details,
    created_at
FROM sync_integration_logs
WHERE level = 'error'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- SEED DATA: Initial health check entries
-- ============================================================================

INSERT INTO dashboard_health_checks (business, integration, status) VALUES
    ('boo', 'supabase', 'unknown'),
    ('boo', 'bigcommerce', 'unknown'),
    ('boo', 'google_ads', 'unknown'),
    ('boo', 'livechat', 'unknown'),
    ('teelixir', 'supabase', 'unknown'),
    ('teelixir', 'shopify', 'unknown'),
    ('teelixir', 'google_ads', 'unknown'),
    ('elevate', 'supabase', 'unknown'),
    ('elevate', 'shopify', 'unknown'),
    ('elevate', 'unleashed', 'unknown'),
    ('elevate', 'hubspot', 'unknown'),
    ('rhf', 'woocommerce', 'unknown')
ON CONFLICT (business, integration) DO NOTHING;

-- Initial supplier status entries
INSERT INTO sync_supplier_status (business, supplier_name, sync_status) VALUES
    ('boo', 'oborne', 'unknown'),
    ('boo', 'uhp', 'unknown'),
    ('boo', 'kadac', 'unknown'),
    ('boo', 'kik', 'unknown')
ON CONFLICT (business, supplier_name) DO NOTHING;

-- Welcome alert
INSERT INTO dashboard_alerts (business, type, title, message, action_label, action_url) VALUES
    ('all', 'info', 'Dashboard Connected', 'Master Ops Dashboard is now connected to Supabase. Start by checking integration health.', 'View Health', '/health');

-- ============================================================================
-- RLS POLICIES (if needed for public access)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE dashboard_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_google_ads_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_livechat_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_supplier_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_gtmetrix_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data (dashboard is internal tool)
CREATE POLICY "Allow read for authenticated" ON dashboard_alerts FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON dashboard_business_metrics FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON dashboard_health_checks FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON sync_google_ads_metrics FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON sync_integration_logs FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON sync_livechat_metrics FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON sync_supplier_status FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON sync_gtmetrix_metrics FOR SELECT USING (true);

-- Allow service role to write (for sync jobs)
CREATE POLICY "Allow write for service" ON dashboard_alerts FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON dashboard_business_metrics FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON dashboard_health_checks FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON sync_google_ads_metrics FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON sync_integration_logs FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON sync_livechat_metrics FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON sync_supplier_status FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON sync_gtmetrix_metrics FOR ALL USING (true);
