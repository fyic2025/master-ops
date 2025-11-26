-- ============================================
-- Google Ads Schema for AI Ads Team
-- ============================================
-- Stores historical performance data for BOO, Teelixir, and Red Hill Fresh
-- Supports AI-powered optimization and evening briefings
-- Created: 2025-11-26

-- ============================================
-- CORE TABLES
-- ============================================

-- Account configuration
CREATE TABLE IF NOT EXISTS google_ads_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL CHECK (business IN ('boo', 'teelixir', 'redhillfresh')),
    customer_id TEXT NOT NULL,
    merchant_center_id TEXT,
    display_name TEXT NOT NULL,
    currency_code TEXT DEFAULT 'AUD',
    timezone TEXT DEFAULT 'Australia/Melbourne',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business)
);

-- Campaign performance (daily snapshots)
CREATE TABLE IF NOT EXISTS google_ads_campaign_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT,
    campaign_type TEXT, -- SEARCH, SHOPPING, DISPLAY, PERFORMANCE_MAX
    campaign_status TEXT,
    date DATE NOT NULL,

    -- Core metrics
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,

    -- Calculated metrics
    ctr DECIMAL(8,6),
    avg_cpc_micros BIGINT,
    roas DECIMAL(10,4),

    -- Budget data
    daily_budget_micros BIGINT,
    budget_utilization_pct DECIMAL(5,2),
    impression_share DECIMAL(5,4),

    -- Raw data for debugging
    raw_metrics JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(account_id, campaign_id, date)
);

-- Keyword performance (daily snapshots)
CREATE TABLE IF NOT EXISTS google_ads_keyword_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    ad_group_id TEXT NOT NULL,
    keyword_id TEXT NOT NULL,
    keyword_text TEXT,
    match_type TEXT, -- EXACT, PHRASE, BROAD
    date DATE NOT NULL,

    -- Performance
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,

    -- Quality metrics (may be null)
    quality_score INTEGER,
    expected_ctr TEXT,
    ad_relevance TEXT,
    landing_page_experience TEXT,

    -- Position data
    avg_position DECIMAL(4,2),
    impression_share DECIMAL(5,4),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(account_id, keyword_id, date)
);

-- Search terms (for negative keyword discovery)
CREATE TABLE IF NOT EXISTS google_ads_search_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    ad_group_id TEXT NOT NULL,
    keyword_id TEXT,
    search_term TEXT NOT NULL,
    date DATE NOT NULL,

    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,

    -- AI analysis fields
    relevance_score DECIMAL(3,2),
    suggested_action TEXT, -- 'add_negative', 'add_keyword', 'monitor', 'ignore'
    analyzed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(account_id, ad_group_id, search_term, date)
);

-- Google Merchant Center product status
CREATE TABLE IF NOT EXISTS google_merchant_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    offer_id TEXT, -- SKU
    title TEXT,

    -- Status
    approval_status TEXT, -- approved, disapproved, pending
    destination_statuses JSONB,
    item_issues JSONB,

    -- Performance (30-day rolling)
    impressions_30d BIGINT DEFAULT 0,
    clicks_30d BIGINT DEFAULT 0,

    -- Product details
    price_micros BIGINT,
    currency_code TEXT DEFAULT 'AUD',
    availability TEXT,
    brand TEXT,
    category TEXT,

    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(account_id, product_id)
);

-- ============================================
-- AI SYSTEM TABLES
-- ============================================

-- Optimization opportunities discovered by AI
CREATE TABLE IF NOT EXISTS google_ads_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,

    opportunity_type TEXT NOT NULL,
    -- Types: budget_increase, bid_adjustment, negative_keyword,
    -- keyword_expansion, ad_copy, quality_score, product_feed

    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented', 'expired')),

    -- Context
    campaign_id TEXT,
    ad_group_id TEXT,
    keyword_id TEXT,
    search_term TEXT,

    -- AI Analysis
    title TEXT NOT NULL,
    description TEXT,
    rationale TEXT,
    estimated_impact JSONB, -- { metric: 'roas', current: 2.5, projected: 3.2, confidence: 0.8 }

    -- Suggested action
    action_type TEXT, -- 'api_call', 'manual', 'conversation'
    action_payload JSONB, -- For automated execution

    -- Review
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    implementation_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Alerts for anomalies and issues
CREATE TABLE IF NOT EXISTS google_ads_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,

    alert_type TEXT NOT NULL,
    -- Types: spend_anomaly, roas_drop, conversion_drop, budget_depleted,
    -- impression_drop, cpc_spike, feed_disapproval, campaign_stopped

    severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),

    -- Context
    campaign_id TEXT,
    campaign_name TEXT,
    metric_name TEXT,
    current_value DECIMAL(12,2),
    expected_value DECIMAL(12,2),
    threshold_value DECIMAL(12,2),

    title TEXT NOT NULL,
    message TEXT,

    -- Resolution
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent tasks spawned from conversations
CREATE TABLE IF NOT EXISTS google_ads_agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,

    spawned_from TEXT, -- 'evening_briefing', 'slash_command', 'scheduled', 'manual'
    agent_type TEXT NOT NULL, -- 'bid_optimizer', 'search_term_analyzer', 'ad_copy_writer', 'feed_manager'

    objective TEXT NOT NULL,
    parameters JSONB,

    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Results
    findings JSONB,
    actions_taken JSONB,
    opportunities_created INTEGER DEFAULT 0,

    -- Reporting
    reported_back BOOLEAN DEFAULT false,
    report_summary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync log for data freshness tracking
CREATE TABLE IF NOT EXISTS google_ads_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,

    sync_type TEXT NOT NULL, -- 'campaigns', 'keywords', 'search_terms', 'merchant'
    date_range_start DATE,
    date_range_end DATE,

    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'partial')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    records_fetched INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,

    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Change log for rollback capability
CREATE TABLE IF NOT EXISTS google_ads_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,

    entity_type TEXT NOT NULL, -- 'keyword', 'campaign', 'ad_group', 'negative_keyword'
    entity_id TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'bid_adjustment', 'status_change', 'budget_change', 'add_negative'

    previous_value JSONB,
    new_value JSONB,

    triggered_by TEXT, -- 'agent', 'manual', 'scheduled'
    opportunity_id UUID REFERENCES google_ads_opportunities(id),

    applied_at TIMESTAMPTZ DEFAULT NOW(),
    rolled_back BOOLEAN DEFAULT false,
    rolled_back_at TIMESTAMPTZ,
    rollback_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Campaign metrics indexes
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_account_date
    ON google_ads_campaign_metrics(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_date
    ON google_ads_campaign_metrics(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_type
    ON google_ads_campaign_metrics(campaign_type);

-- Keyword metrics indexes
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_account_date
    ON google_ads_keyword_metrics(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_quality
    ON google_ads_keyword_metrics(quality_score) WHERE quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_keyword
    ON google_ads_keyword_metrics(keyword_id, date DESC);

-- Search terms indexes
CREATE INDEX IF NOT EXISTS idx_search_terms_account_date
    ON google_ads_search_terms(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_search_terms_action
    ON google_ads_search_terms(suggested_action) WHERE suggested_action IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_terms_term
    ON google_ads_search_terms(search_term);

-- Merchant products indexes
CREATE INDEX IF NOT EXISTS idx_merchant_products_status
    ON google_merchant_products(approval_status);
CREATE INDEX IF NOT EXISTS idx_merchant_products_issues
    ON google_merchant_products(account_id) WHERE item_issues IS NOT NULL;

-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_status_priority
    ON google_ads_opportunities(account_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_expires
    ON google_ads_opportunities(expires_at) WHERE status = 'pending';

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_active
    ON google_ads_alerts(account_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created
    ON google_ads_alerts(created_at DESC);

-- Agent tasks indexes
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
    ON google_ads_agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_unreported
    ON google_ads_agent_tasks(account_id) WHERE reported_back = false AND status = 'completed';

-- Sync log indexes
CREATE INDEX IF NOT EXISTS idx_sync_log_account_type
    ON google_ads_sync_log(account_id, sync_type, started_at DESC);

-- ============================================
-- VIEWS
-- ============================================

-- Cross-business performance comparison (last 30 days)
CREATE OR REPLACE VIEW v_google_ads_business_comparison AS
SELECT
    a.business,
    a.display_name,
    cm.date,
    SUM(cm.impressions) as impressions,
    SUM(cm.clicks) as clicks,
    SUM(cm.cost_micros) / 1000000.0 as spend,
    SUM(cm.conversions) as conversions,
    SUM(cm.conversion_value) as revenue,
    CASE WHEN SUM(cm.cost_micros) > 0
        THEN SUM(cm.conversion_value) / (SUM(cm.cost_micros) / 1000000.0)
        ELSE 0 END as roas,
    CASE WHEN SUM(cm.impressions) > 0
        THEN SUM(cm.clicks)::DECIMAL / SUM(cm.impressions)
        ELSE 0 END as ctr
FROM google_ads_accounts a
LEFT JOIN google_ads_campaign_metrics cm ON cm.account_id = a.id
WHERE a.is_active = true
    AND cm.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.business, a.display_name, cm.date
ORDER BY cm.date DESC, a.business;

-- Daily totals by business
CREATE OR REPLACE VIEW v_google_ads_daily_totals AS
SELECT
    a.business,
    cm.date,
    SUM(cm.impressions) as impressions,
    SUM(cm.clicks) as clicks,
    SUM(cm.cost_micros) / 1000000.0 as spend,
    SUM(cm.conversions) as conversions,
    SUM(cm.conversion_value) as revenue,
    CASE WHEN SUM(cm.cost_micros) > 0
        THEN SUM(cm.conversion_value) / (SUM(cm.cost_micros) / 1000000.0)
        ELSE 0 END as roas
FROM google_ads_accounts a
JOIN google_ads_campaign_metrics cm ON cm.account_id = a.id
GROUP BY a.business, cm.date
ORDER BY cm.date DESC, a.business;

-- Weekly trends
CREATE OR REPLACE VIEW v_google_ads_weekly_trends AS
SELECT
    a.business,
    DATE_TRUNC('week', cm.date) as week_start,
    SUM(cm.cost_micros) / 1000000.0 as spend,
    SUM(cm.conversions) as conversions,
    SUM(cm.conversion_value) as revenue,
    CASE WHEN SUM(cm.cost_micros) > 0
        THEN SUM(cm.conversion_value) / (SUM(cm.cost_micros) / 1000000.0)
        ELSE 0 END as roas
FROM google_ads_accounts a
JOIN google_ads_campaign_metrics cm ON cm.account_id = a.id
WHERE cm.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY a.business, DATE_TRUNC('week', cm.date)
ORDER BY week_start DESC, a.business;

-- Keyword quality issues
CREATE OR REPLACE VIEW v_google_ads_keyword_issues AS
SELECT
    a.business,
    km.campaign_id,
    km.keyword_text,
    km.match_type,
    km.quality_score,
    km.expected_ctr,
    km.ad_relevance,
    km.landing_page_experience,
    SUM(km.cost_micros) / 1000000.0 as spend_7d,
    SUM(km.conversions) as conversions_7d
FROM google_ads_keyword_metrics km
JOIN google_ads_accounts a ON a.id = km.account_id
WHERE km.date >= CURRENT_DATE - INTERVAL '7 days'
    AND km.quality_score < 5
GROUP BY a.business, km.campaign_id, km.keyword_text, km.match_type,
         km.quality_score, km.expected_ctr, km.ad_relevance, km.landing_page_experience
HAVING SUM(km.cost_micros) > 10000000  -- Min $10 spend
ORDER BY km.quality_score, SUM(km.cost_micros) DESC;

-- Pending opportunities summary
CREATE OR REPLACE VIEW v_google_ads_pending_opportunities AS
SELECT
    a.business,
    o.opportunity_type,
    o.priority,
    COUNT(*) as opportunity_count,
    SUM(COALESCE((o.estimated_impact->>'revenue_delta')::DECIMAL, 0)) as total_potential_revenue
FROM google_ads_opportunities o
JOIN google_ads_accounts a ON a.id = o.account_id
WHERE o.status = 'pending'
    AND (o.expires_at IS NULL OR o.expires_at > NOW())
GROUP BY a.business, o.opportunity_type, o.priority
ORDER BY a.business,
    CASE o.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
    total_potential_revenue DESC;

-- Active alerts summary
CREATE OR REPLACE VIEW v_google_ads_active_alerts AS
SELECT
    a.business,
    al.alert_type,
    al.severity,
    al.title,
    al.message,
    al.campaign_name,
    al.metric_name,
    al.current_value,
    al.expected_value,
    al.created_at
FROM google_ads_alerts al
JOIN google_ads_accounts a ON a.id = al.account_id
WHERE al.status = 'active'
ORDER BY
    CASE al.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
    al.created_at DESC;

-- Search terms needing attention
CREATE OR REPLACE VIEW v_google_ads_search_terms_attention AS
SELECT
    a.business,
    st.search_term,
    st.campaign_id,
    SUM(st.clicks) as total_clicks,
    SUM(st.cost_micros) / 1000000.0 as total_spend,
    SUM(st.conversions) as total_conversions,
    st.suggested_action,
    MAX(st.date) as last_seen
FROM google_ads_search_terms st
JOIN google_ads_accounts a ON a.id = st.account_id
WHERE st.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.business, st.search_term, st.campaign_id, st.suggested_action
HAVING SUM(st.clicks) >= 10 AND SUM(st.conversions) = 0 AND SUM(st.cost_micros) >= 10000000
ORDER BY total_spend DESC;

-- Sync status by account
CREATE OR REPLACE VIEW v_google_ads_sync_status AS
SELECT
    a.business,
    sl.sync_type,
    sl.status,
    sl.started_at,
    sl.completed_at,
    sl.records_fetched,
    sl.error_message,
    EXTRACT(EPOCH FROM (COALESCE(sl.completed_at, NOW()) - sl.started_at)) as duration_seconds
FROM google_ads_accounts a
LEFT JOIN LATERAL (
    SELECT * FROM google_ads_sync_log
    WHERE account_id = a.id
    ORDER BY started_at DESC
    LIMIT 5
) sl ON true
WHERE a.is_active = true
ORDER BY a.business, sl.started_at DESC;

-- Merchant Center issues
CREATE OR REPLACE VIEW v_google_merchant_issues AS
SELECT
    a.business,
    mp.offer_id as sku,
    mp.title,
    mp.approval_status,
    mp.item_issues,
    mp.impressions_30d,
    mp.clicks_30d,
    mp.last_synced_at
FROM google_merchant_products mp
JOIN google_ads_accounts a ON a.id = mp.account_id
WHERE mp.approval_status != 'approved'
    OR mp.item_issues IS NOT NULL
ORDER BY mp.impressions_30d DESC NULLS LAST;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get account by business name
CREATE OR REPLACE FUNCTION get_google_ads_account(p_business TEXT)
RETURNS google_ads_accounts AS $$
    SELECT * FROM google_ads_accounts WHERE business = p_business AND is_active = true LIMIT 1;
$$ LANGUAGE sql;

-- Get yesterday's performance for briefing
CREATE OR REPLACE FUNCTION get_google_ads_yesterday_summary()
RETURNS TABLE (
    business TEXT,
    display_name TEXT,
    spend DECIMAL,
    conversions DECIMAL,
    revenue DECIMAL,
    roas DECIMAL,
    spend_change_pct DECIMAL,
    roas_change_pct DECIMAL
) AS $$
    WITH yesterday AS (
        SELECT
            a.business,
            a.display_name,
            SUM(cm.cost_micros) / 1000000.0 as spend,
            SUM(cm.conversions) as conversions,
            SUM(cm.conversion_value) as revenue
        FROM google_ads_accounts a
        JOIN google_ads_campaign_metrics cm ON cm.account_id = a.id
        WHERE cm.date = CURRENT_DATE - 1
            AND a.is_active = true
        GROUP BY a.business, a.display_name
    ),
    day_before AS (
        SELECT
            a.business,
            SUM(cm.cost_micros) / 1000000.0 as spend,
            SUM(cm.conversion_value) as revenue
        FROM google_ads_accounts a
        JOIN google_ads_campaign_metrics cm ON cm.account_id = a.id
        WHERE cm.date = CURRENT_DATE - 2
            AND a.is_active = true
        GROUP BY a.business
    )
    SELECT
        y.business,
        y.display_name,
        y.spend,
        y.conversions,
        y.revenue,
        CASE WHEN y.spend > 0 THEN y.revenue / y.spend ELSE 0 END as roas,
        CASE WHEN db.spend > 0 THEN ((y.spend - db.spend) / db.spend) * 100 ELSE 0 END as spend_change_pct,
        CASE WHEN db.revenue > 0 AND db.spend > 0
            THEN (((y.revenue / NULLIF(y.spend, 0)) - (db.revenue / db.spend)) / (db.revenue / db.spend)) * 100
            ELSE 0 END as roas_change_pct
    FROM yesterday y
    LEFT JOIN day_before db ON db.business = y.business
    ORDER BY y.business;
$$ LANGUAGE sql;

-- Cleanup old data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_google_ads_data(
    p_campaign_metrics_days INTEGER DEFAULT 365,
    p_keyword_metrics_days INTEGER DEFAULT 90,
    p_search_terms_days INTEGER DEFAULT 60,
    p_sync_log_days INTEGER DEFAULT 30,
    p_change_log_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    table_name TEXT,
    rows_deleted BIGINT
) AS $$
DECLARE
    campaign_deleted BIGINT;
    keyword_deleted BIGINT;
    search_deleted BIGINT;
    sync_deleted BIGINT;
    change_deleted BIGINT;
BEGIN
    -- Delete old campaign metrics
    DELETE FROM google_ads_campaign_metrics
    WHERE date < CURRENT_DATE - p_campaign_metrics_days;
    GET DIAGNOSTICS campaign_deleted = ROW_COUNT;

    -- Delete old keyword metrics
    DELETE FROM google_ads_keyword_metrics
    WHERE date < CURRENT_DATE - p_keyword_metrics_days;
    GET DIAGNOSTICS keyword_deleted = ROW_COUNT;

    -- Delete old search terms
    DELETE FROM google_ads_search_terms
    WHERE date < CURRENT_DATE - p_search_terms_days;
    GET DIAGNOSTICS search_deleted = ROW_COUNT;

    -- Delete old sync logs
    DELETE FROM google_ads_sync_log
    WHERE created_at < CURRENT_DATE - p_sync_log_days;
    GET DIAGNOSTICS sync_deleted = ROW_COUNT;

    -- Delete old change logs
    DELETE FROM google_ads_change_log
    WHERE created_at < CURRENT_DATE - p_change_log_days;
    GET DIAGNOSTICS change_deleted = ROW_COUNT;

    -- Expire old opportunities
    UPDATE google_ads_opportunities
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();

    RETURN QUERY SELECT 'google_ads_campaign_metrics'::TEXT, campaign_deleted
    UNION ALL SELECT 'google_ads_keyword_metrics'::TEXT, keyword_deleted
    UNION ALL SELECT 'google_ads_search_terms'::TEXT, search_deleted
    UNION ALL SELECT 'google_ads_sync_log'::TEXT, sync_deleted
    UNION ALL SELECT 'google_ads_change_log'::TEXT, change_deleted;
END;
$$ LANGUAGE plpgsql;

-- Insert default accounts
INSERT INTO google_ads_accounts (business, customer_id, display_name, currency_code, timezone)
VALUES
    ('boo', '', 'Buy Organics Online', 'AUD', 'Australia/Melbourne'),
    ('teelixir', '', 'Teelixir', 'AUD', 'Australia/Melbourne'),
    ('redhillfresh', '', 'Red Hill Fresh', 'AUD', 'Australia/Melbourne')
ON CONFLICT (business) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE google_ads_accounts IS 'Google Ads account configuration for each business';
COMMENT ON TABLE google_ads_campaign_metrics IS 'Daily campaign performance snapshots';
COMMENT ON TABLE google_ads_keyword_metrics IS 'Daily keyword performance with quality scores';
COMMENT ON TABLE google_ads_search_terms IS 'Search term report data for negative keyword discovery';
COMMENT ON TABLE google_merchant_products IS 'Google Merchant Center product status and issues';
COMMENT ON TABLE google_ads_opportunities IS 'AI-discovered optimization opportunities';
COMMENT ON TABLE google_ads_alerts IS 'Anomaly alerts and notifications';
COMMENT ON TABLE google_ads_agent_tasks IS 'Tasks spawned from evening briefings';
COMMENT ON TABLE google_ads_sync_log IS 'Data sync history for freshness tracking';
COMMENT ON TABLE google_ads_change_log IS 'Audit trail for all changes made';
