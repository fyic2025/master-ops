-- ============================================================================
-- BigCommerce to Google Merchant Center Sync Schema
--
-- Tracks the full synchronization pipeline including:
-- - Product feed state and history
-- - Issue tracking and remediation
-- - Sync logs and metrics
-- - Optimization tracking
-- ============================================================================

-- ============================================================================
-- FEED CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS bc_gmc_feed_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business VARCHAR(50) NOT NULL,  -- 'boo', 'teelixir', 'redhillfresh'
    name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT true,

    -- GMC settings
    merchant_id VARCHAR(50) NOT NULL,
    target_country VARCHAR(2) DEFAULT 'AU',
    content_language VARCHAR(2) DEFAULT 'en',

    -- Mapping configuration (JSONB)
    mapping_config JSONB DEFAULT '{}'::jsonb,

    -- Sync settings
    sync_schedule VARCHAR(50),  -- Cron expression
    full_sync_day INTEGER,  -- Day of week (0-6) for full sync
    incremental_enabled BOOLEAN DEFAULT true,

    -- Thresholds
    max_products_per_batch INTEGER DEFAULT 50,
    issue_threshold_percent DECIMAL(5,2) DEFAULT 10.00,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business)
);

-- ============================================================================
-- PRODUCT SYNC STATE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bc_gmc_product_sync (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business VARCHAR(50) NOT NULL,

    -- Product identifiers
    bc_product_id INTEGER NOT NULL,
    offer_id VARCHAR(255) NOT NULL,  -- SKU or BC-{id}

    -- Current state
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        -- pending, synced, failed, skipped, deleted
    gmc_status VARCHAR(50),  -- approved, disapproved, pending, expiring

    -- Last known data hashes (for change detection)
    bc_data_hash VARCHAR(64),
    gmc_data_hash VARCHAR(64),

    -- Issue tracking
    has_issues BOOLEAN DEFAULT false,
    issue_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    last_issues JSONB DEFAULT '[]'::jsonb,

    -- Optimization
    optimization_score INTEGER,
    optimization_suggestions JSONB DEFAULT '[]'::jsonb,

    -- Sync history
    last_bc_sync_at TIMESTAMP WITH TIME ZONE,
    last_gmc_sync_at TIMESTAMP WITH TIME ZONE,
    last_issue_check_at TIMESTAMP WITH TIME ZONE,
    last_remediation_at TIMESTAMP WITH TIME ZONE,

    -- Error tracking
    last_error TEXT,
    error_count_total INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business, bc_product_id),
    UNIQUE(business, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_bc_gmc_sync_business ON bc_gmc_product_sync(business);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_sync_status ON bc_gmc_product_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_sync_gmc_status ON bc_gmc_product_sync(gmc_status);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_sync_has_issues ON bc_gmc_product_sync(has_issues);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_sync_offer_id ON bc_gmc_product_sync(offer_id);

-- ============================================================================
-- SYNC RUN LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bc_gmc_sync_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business VARCHAR(50) NOT NULL,

    -- Run info
    run_type VARCHAR(50) NOT NULL,  -- full, incremental, remediation, optimization
    status VARCHAR(50) NOT NULL DEFAULT 'running',  -- running, completed, failed

    -- Stats
    products_processed INTEGER DEFAULT 0,
    products_inserted INTEGER DEFAULT 0,
    products_updated INTEGER DEFAULT 0,
    products_deleted INTEGER DEFAULT 0,
    products_skipped INTEGER DEFAULT 0,
    products_errored INTEGER DEFAULT 0,

    -- Issue remediation stats
    issues_detected INTEGER DEFAULT 0,
    issues_auto_fixed INTEGER DEFAULT 0,
    issues_manual_required INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,

    -- Details
    error_message TEXT,
    details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bc_gmc_runs_business ON bc_gmc_sync_runs(business);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_runs_status ON bc_gmc_sync_runs(status);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_runs_started ON bc_gmc_sync_runs(started_at DESC);

-- ============================================================================
-- ISSUE HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS bc_gmc_issue_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business VARCHAR(50) NOT NULL,

    -- Product reference
    bc_product_id INTEGER NOT NULL,
    offer_id VARCHAR(255) NOT NULL,
    product_title VARCHAR(255),

    -- Issue details
    issue_code VARCHAR(100) NOT NULL,
    issue_severity VARCHAR(20) NOT NULL,  -- error, warning, suggestion
    issue_description TEXT,
    issue_detail TEXT,
    attribute_name VARCHAR(100),

    -- Lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, resolved, ignored
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,

    -- Remediation
    auto_fixable BOOLEAN DEFAULT false,
    remediation_attempted BOOLEAN DEFAULT false,
    remediation_result VARCHAR(50),
    remediation_details TEXT,

    -- Impact
    impressions_at_detection INTEGER,
    clicks_at_detection INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business, offer_id, issue_code)
);

CREATE INDEX IF NOT EXISTS idx_bc_gmc_issues_business ON bc_gmc_issue_history(business);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_issues_status ON bc_gmc_issue_history(status);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_issues_code ON bc_gmc_issue_history(issue_code);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_issues_severity ON bc_gmc_issue_history(issue_severity);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_issues_offer ON bc_gmc_issue_history(offer_id);

-- ============================================================================
-- SUPPLEMENTAL FEED ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS bc_gmc_supplemental_feed (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business VARCHAR(50) NOT NULL,

    -- Product reference
    offer_id VARCHAR(255) NOT NULL,

    -- Override attributes
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Metadata
    reason TEXT,
    source VARCHAR(50) DEFAULT 'auto',  -- auto, manual

    -- Lifecycle
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_bc_gmc_supplemental_business ON bc_gmc_supplemental_feed(business);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_supplemental_active ON bc_gmc_supplemental_feed(active);

-- ============================================================================
-- OPTIMIZATION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS bc_gmc_optimization_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business VARCHAR(50) NOT NULL,

    -- Product reference
    bc_product_id INTEGER NOT NULL,
    offer_id VARCHAR(255) NOT NULL,

    -- Optimization details
    optimization_type VARCHAR(100) NOT NULL,
    field_name VARCHAR(100),
    current_value TEXT,
    suggested_value TEXT,
    reason TEXT,
    impact VARCHAR(20),  -- high, medium, low

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, applied, rejected, expired
    auto_applicable BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(business, offer_id, optimization_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_bc_gmc_opt_business ON bc_gmc_optimization_queue(business);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_opt_status ON bc_gmc_optimization_queue(status);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_opt_impact ON bc_gmc_optimization_queue(impact);

-- ============================================================================
-- DAILY SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bc_gmc_daily_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business VARCHAR(50) NOT NULL,
    snapshot_date DATE NOT NULL,

    -- Product counts
    total_products INTEGER DEFAULT 0,
    products_in_bc INTEGER DEFAULT 0,
    products_in_gmc INTEGER DEFAULT 0,
    products_synced INTEGER DEFAULT 0,

    -- GMC status breakdown
    approved_products INTEGER DEFAULT 0,
    disapproved_products INTEGER DEFAULT 0,
    pending_products INTEGER DEFAULT 0,
    expiring_products INTEGER DEFAULT 0,

    -- Issue summary
    total_issues INTEGER DEFAULT 0,
    error_issues INTEGER DEFAULT 0,
    warning_issues INTEGER DEFAULT 0,
    suggestion_issues INTEGER DEFAULT 0,

    -- Rates
    approval_rate DECIMAL(5,2),
    issue_rate DECIMAL(5,2),

    -- Performance
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,

    -- Sync health
    sync_success_rate DECIMAL(5,2),
    avg_sync_duration_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(business, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_bc_gmc_snapshots_business ON bc_gmc_daily_snapshots(business);
CREATE INDEX IF NOT EXISTS idx_bc_gmc_snapshots_date ON bc_gmc_daily_snapshots(snapshot_date DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Current issue summary by code
CREATE OR REPLACE VIEW v_bc_gmc_issue_summary AS
SELECT
    business,
    issue_code,
    issue_severity,
    COUNT(*) as issue_count,
    COUNT(*) FILTER (WHERE auto_fixable) as auto_fixable_count,
    MIN(first_detected_at) as first_detected,
    MAX(last_seen_at) as last_seen,
    SUM(impressions_at_detection) as total_impressions_affected
FROM bc_gmc_issue_history
WHERE status = 'active'
GROUP BY business, issue_code, issue_severity
ORDER BY business, issue_severity, issue_count DESC;

-- Products with issues
CREATE OR REPLACE VIEW v_bc_gmc_products_with_issues AS
SELECT
    ps.business,
    ps.bc_product_id,
    ps.offer_id,
    ps.sync_status,
    ps.gmc_status,
    ps.issue_count,
    ps.error_count,
    ps.warning_count,
    ps.optimization_score,
    ps.last_issues,
    ps.last_gmc_sync_at,
    ps.last_remediation_at
FROM bc_gmc_product_sync ps
WHERE ps.has_issues = true
ORDER BY ps.error_count DESC, ps.warning_count DESC;

-- Daily trend data
CREATE OR REPLACE VIEW v_bc_gmc_daily_trends AS
SELECT
    business,
    snapshot_date,
    total_products,
    approved_products,
    disapproved_products,
    approval_rate,
    total_issues,
    issue_rate,
    total_impressions,
    total_clicks,
    CASE WHEN total_impressions > 0
        THEN ROUND((total_clicks::decimal / total_impressions) * 100, 2)
        ELSE 0
    END as ctr
FROM bc_gmc_daily_snapshots
ORDER BY business, snapshot_date DESC;

-- Recent sync runs
CREATE OR REPLACE VIEW v_bc_gmc_recent_syncs AS
SELECT
    id,
    business,
    run_type,
    status,
    products_processed,
    products_errored,
    issues_detected,
    issues_auto_fixed,
    started_at,
    completed_at,
    duration_ms,
    error_message
FROM bc_gmc_sync_runs
WHERE started_at > NOW() - INTERVAL '7 days'
ORDER BY started_at DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update product sync state
CREATE OR REPLACE FUNCTION update_bc_gmc_product_sync(
    p_business VARCHAR,
    p_bc_product_id INTEGER,
    p_offer_id VARCHAR,
    p_sync_status VARCHAR DEFAULT NULL,
    p_gmc_status VARCHAR DEFAULT NULL,
    p_has_issues BOOLEAN DEFAULT NULL,
    p_issue_count INTEGER DEFAULT NULL,
    p_error_count INTEGER DEFAULT NULL,
    p_warning_count INTEGER DEFAULT NULL,
    p_last_issues JSONB DEFAULT NULL,
    p_optimization_score INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO bc_gmc_product_sync (
        business, bc_product_id, offer_id, sync_status, gmc_status,
        has_issues, issue_count, error_count, warning_count, last_issues,
        optimization_score, last_gmc_sync_at, updated_at
    )
    VALUES (
        p_business, p_bc_product_id, p_offer_id,
        COALESCE(p_sync_status, 'pending'),
        p_gmc_status,
        COALESCE(p_has_issues, false),
        COALESCE(p_issue_count, 0),
        COALESCE(p_error_count, 0),
        COALESCE(p_warning_count, 0),
        COALESCE(p_last_issues, '[]'::jsonb),
        p_optimization_score,
        NOW(),
        NOW()
    )
    ON CONFLICT (business, bc_product_id) DO UPDATE SET
        offer_id = EXCLUDED.offer_id,
        sync_status = COALESCE(EXCLUDED.sync_status, bc_gmc_product_sync.sync_status),
        gmc_status = COALESCE(EXCLUDED.gmc_status, bc_gmc_product_sync.gmc_status),
        has_issues = COALESCE(EXCLUDED.has_issues, bc_gmc_product_sync.has_issues),
        issue_count = COALESCE(EXCLUDED.issue_count, bc_gmc_product_sync.issue_count),
        error_count = COALESCE(EXCLUDED.error_count, bc_gmc_product_sync.error_count),
        warning_count = COALESCE(EXCLUDED.warning_count, bc_gmc_product_sync.warning_count),
        last_issues = COALESCE(EXCLUDED.last_issues, bc_gmc_product_sync.last_issues),
        optimization_score = COALESCE(EXCLUDED.optimization_score, bc_gmc_product_sync.optimization_score),
        last_gmc_sync_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create daily snapshot
CREATE OR REPLACE FUNCTION create_bc_gmc_daily_snapshot(p_business VARCHAR)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_total INTEGER;
    v_approved INTEGER;
    v_disapproved INTEGER;
    v_pending INTEGER;
    v_issues INTEGER;
    v_errors INTEGER;
    v_warnings INTEGER;
BEGIN
    -- Count products by status
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE gmc_status = 'approved'),
        COUNT(*) FILTER (WHERE gmc_status = 'disapproved'),
        COUNT(*) FILTER (WHERE gmc_status = 'pending'),
        SUM(issue_count),
        SUM(error_count),
        SUM(warning_count)
    INTO v_total, v_approved, v_disapproved, v_pending, v_issues, v_errors, v_warnings
    FROM bc_gmc_product_sync
    WHERE business = p_business;

    INSERT INTO bc_gmc_daily_snapshots (
        business, snapshot_date,
        total_products, products_synced,
        approved_products, disapproved_products, pending_products,
        total_issues, error_issues, warning_issues,
        approval_rate, issue_rate
    )
    VALUES (
        p_business, CURRENT_DATE,
        v_total, v_total,
        v_approved, v_disapproved, v_pending,
        COALESCE(v_issues, 0), COALESCE(v_errors, 0), COALESCE(v_warnings, 0),
        CASE WHEN v_total > 0 THEN ROUND((v_approved::decimal / v_total) * 100, 2) ELSE 0 END,
        CASE WHEN v_total > 0 THEN ROUND((COALESCE(v_issues, 0)::decimal / v_total) * 100, 2) ELSE 0 END
    )
    ON CONFLICT (business, snapshot_date) DO UPDATE SET
        total_products = EXCLUDED.total_products,
        approved_products = EXCLUDED.approved_products,
        disapproved_products = EXCLUDED.disapproved_products,
        pending_products = EXCLUDED.pending_products,
        total_issues = EXCLUDED.total_issues,
        error_issues = EXCLUDED.error_issues,
        warning_issues = EXCLUDED.warning_issues,
        approval_rate = EXCLUDED.approval_rate,
        issue_rate = EXCLUDED.issue_rate
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert BOO feed configuration
INSERT INTO bc_gmc_feed_configs (
    business, name, merchant_id,
    mapping_config,
    sync_schedule, full_sync_day, incremental_enabled,
    max_products_per_batch, issue_threshold_percent
)
VALUES (
    'boo',
    'Buy Organics Online - Google Shopping Feed',
    COALESCE(current_setting('app.gmc_boo_merchant_id', true), ''),
    '{
        "storeUrl": "https://www.buyorganicsonline.com.au",
        "titleTemplate": "{brand} {name}",
        "descriptionField": "description",
        "defaultCondition": "new",
        "defaultGoogleCategory": "Health > Nutrition > Vitamins & Supplements",
        "requireImages": true,
        "requireInventory": false,
        "defaultShipping": [{
            "country": "AU",
            "service": "Standard Shipping",
            "price": {"value": "9.95", "currency": "AUD"},
            "minHandlingTime": 1,
            "maxHandlingTime": 2,
            "minTransitTime": 2,
            "maxTransitTime": 5
        }],
        "customLabel0Source": {
            "type": "price_range",
            "ranges": [
                {"min": 0, "max": 25, "label": "budget"},
                {"min": 25, "max": 50, "label": "mid-range"},
                {"min": 50, "max": 100, "label": "premium"},
                {"min": 100, "max": 999999, "label": "luxury"}
            ]
        },
        "customLabel1Source": {
            "type": "inventory",
            "ranges": [
                {"min": 0, "max": 5, "label": "low-stock"},
                {"min": 5, "max": 20, "label": "medium-stock"},
                {"min": 20, "max": 999999, "label": "high-stock"}
            ]
        }
    }'::jsonb,
    '0 4 * * *',  -- Daily at 4 AM AEST (18:00 UTC previous day)
    0,  -- Full sync on Sunday
    true,
    50,
    10.00
)
ON CONFLICT (business) DO UPDATE SET
    mapping_config = EXCLUDED.mapping_config,
    updated_at = NOW();

COMMENT ON TABLE bc_gmc_feed_configs IS 'Configuration for BigCommerce to Google Merchant Center feed sync';
COMMENT ON TABLE bc_gmc_product_sync IS 'Tracks sync state for each product between BC and GMC';
COMMENT ON TABLE bc_gmc_sync_runs IS 'Log of sync run executions with stats';
COMMENT ON TABLE bc_gmc_issue_history IS 'Historical tracking of GMC issues per product';
COMMENT ON TABLE bc_gmc_supplemental_feed IS 'Supplemental feed entries to override GMC attributes';
COMMENT ON TABLE bc_gmc_optimization_queue IS 'Queue of optimization suggestions for products';
COMMENT ON TABLE bc_gmc_daily_snapshots IS 'Daily aggregate snapshots for trend analysis';
