-- ============================================
-- Google Merchant Center Dashboard Schema
-- ============================================
-- Extends the existing google_merchant_products table with
-- historical tracking for trends and issue lifecycle
-- Created: 2025-11-30

-- ============================================
-- DAILY ACCOUNT SNAPSHOTS (for trend charts)
-- ============================================
-- Stores daily aggregates for charting and comparison

CREATE TABLE IF NOT EXISTS google_merchant_account_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,

    -- Product counts by status
    products_total INTEGER DEFAULT 0,
    products_active INTEGER DEFAULT 0,
    products_pending INTEGER DEFAULT 0,
    products_disapproved INTEGER DEFAULT 0,
    products_expiring INTEGER DEFAULT 0,

    -- Issue counts by severity
    total_errors INTEGER DEFAULT 0,
    total_warnings INTEGER DEFAULT 0,
    total_suggestions INTEGER DEFAULT 0,

    -- Performance totals (30-day rolling from that snapshot date)
    total_impressions_30d BIGINT DEFAULT 0,
    total_clicks_30d BIGINT DEFAULT 0,

    -- Calculated metrics
    approval_rate DECIMAL(5,2) DEFAULT 0, -- percentage approved
    ctr DECIMAL(8,6) DEFAULT 0, -- click-through rate

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(account_id, snapshot_date)
);

-- ============================================
-- ISSUE HISTORY (for tracking resolution)
-- ============================================
-- Tracks individual issues over time for resolution tracking

CREATE TABLE IF NOT EXISTS google_merchant_issue_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    offer_id TEXT,
    title TEXT,

    -- Issue details
    issue_code TEXT NOT NULL,
    issue_severity TEXT NOT NULL CHECK (issue_severity IN ('error', 'warning', 'suggestion')),
    issue_description TEXT,
    issue_resolution TEXT,
    attribute_name TEXT,

    -- Lifecycle tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    first_detected DATE NOT NULL,
    last_seen DATE NOT NULL,
    resolved_at TIMESTAMPTZ,

    -- Impact metrics (at time of detection)
    impressions_30d BIGINT DEFAULT 0,
    clicks_30d BIGINT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(account_id, product_id, issue_code)
);

-- ============================================
-- INDEXES
-- ============================================

-- Snapshot lookups by date
CREATE INDEX IF NOT EXISTS idx_gmc_snapshots_lookup
    ON google_merchant_account_snapshots(account_id, snapshot_date DESC);

-- Active issues for dashboard display
CREATE INDEX IF NOT EXISTS idx_gmc_issues_active
    ON google_merchant_issue_history(account_id, status) WHERE status = 'active';

-- Issues by severity for filtering
CREATE INDEX IF NOT EXISTS idx_gmc_issues_severity
    ON google_merchant_issue_history(account_id, issue_severity, status);

-- Issue resolution tracking
CREATE INDEX IF NOT EXISTS idx_gmc_issues_resolved
    ON google_merchant_issue_history(account_id, resolved_at DESC) WHERE resolved_at IS NOT NULL;

-- ============================================
-- VIEWS
-- ============================================

-- Active issues summary grouped by code
CREATE OR REPLACE VIEW v_gmc_issue_summary AS
SELECT
    a.business,
    ih.issue_code,
    ih.issue_severity,
    ih.issue_description,
    COUNT(*) as product_count,
    SUM(ih.impressions_30d) as total_impressions,
    SUM(ih.clicks_30d) as total_clicks,
    MIN(ih.first_detected) as first_seen,
    MAX(ih.last_seen) as last_seen
FROM google_merchant_issue_history ih
JOIN google_ads_accounts a ON a.id = ih.account_id
WHERE ih.status = 'active'
GROUP BY a.business, ih.issue_code, ih.issue_severity, ih.issue_description
ORDER BY
    CASE ih.issue_severity
        WHEN 'error' THEN 1
        WHEN 'warning' THEN 2
        ELSE 3
    END,
    COUNT(*) DESC;

-- Daily trend data for charting
CREATE OR REPLACE VIEW v_gmc_daily_trends AS
SELECT
    a.business,
    s.snapshot_date,
    s.products_total,
    s.products_active,
    s.products_disapproved,
    s.products_pending,
    s.total_errors,
    s.total_warnings,
    s.total_impressions_30d,
    s.total_clicks_30d,
    s.approval_rate,
    s.ctr
FROM google_merchant_account_snapshots s
JOIN google_ads_accounts a ON a.id = s.account_id
ORDER BY s.snapshot_date DESC;

-- Products with issues (enhanced version)
CREATE OR REPLACE VIEW v_gmc_products_with_issues AS
SELECT
    a.business,
    mp.product_id,
    mp.offer_id as sku,
    mp.title,
    mp.approval_status,
    mp.availability,
    mp.brand,
    mp.category,
    mp.impressions_30d,
    mp.clicks_30d,
    mp.item_issues,
    mp.last_synced_at,
    -- Count issues by severity from JSONB
    COALESCE(
        (SELECT COUNT(*) FROM jsonb_array_elements(mp.item_issues) elem
         WHERE elem->>'severity' = 'error'), 0
    ) as error_count,
    COALESCE(
        (SELECT COUNT(*) FROM jsonb_array_elements(mp.item_issues) elem
         WHERE elem->>'severity' = 'warning'), 0
    ) as warning_count,
    COALESCE(
        (SELECT COUNT(*) FROM jsonb_array_elements(mp.item_issues) elem
         WHERE elem->>'severity' = 'suggestion'), 0
    ) as suggestion_count
FROM google_merchant_products mp
JOIN google_ads_accounts a ON a.id = mp.account_id
WHERE mp.item_issues IS NOT NULL
    AND jsonb_array_length(mp.item_issues) > 0
ORDER BY
    mp.approval_status = 'disapproved' DESC,
    mp.impressions_30d DESC NULLS LAST;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Create a snapshot from current product data
CREATE OR REPLACE FUNCTION create_gmc_snapshot(p_account_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_total INTEGER;
    v_active INTEGER;
    v_pending INTEGER;
    v_disapproved INTEGER;
    v_errors INTEGER;
    v_warnings INTEGER;
    v_suggestions INTEGER;
    v_impressions BIGINT;
    v_clicks BIGINT;
BEGIN
    -- Get product counts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE approval_status = 'approved'),
        COUNT(*) FILTER (WHERE approval_status = 'pending'),
        COUNT(*) FILTER (WHERE approval_status = 'disapproved'),
        SUM(impressions_30d),
        SUM(clicks_30d)
    INTO v_total, v_active, v_pending, v_disapproved, v_impressions, v_clicks
    FROM google_merchant_products
    WHERE account_id = p_account_id;

    -- Get issue counts
    SELECT
        COALESCE(SUM(
            (SELECT COUNT(*) FROM jsonb_array_elements(item_issues) elem
             WHERE elem->>'severity' = 'error')
        ), 0),
        COALESCE(SUM(
            (SELECT COUNT(*) FROM jsonb_array_elements(item_issues) elem
             WHERE elem->>'severity' = 'warning')
        ), 0),
        COALESCE(SUM(
            (SELECT COUNT(*) FROM jsonb_array_elements(item_issues) elem
             WHERE elem->>'severity' = 'suggestion')
        ), 0)
    INTO v_errors, v_warnings, v_suggestions
    FROM google_merchant_products
    WHERE account_id = p_account_id
        AND item_issues IS NOT NULL;

    -- Insert or update snapshot
    INSERT INTO google_merchant_account_snapshots (
        account_id, snapshot_date,
        products_total, products_active, products_pending, products_disapproved,
        total_errors, total_warnings, total_suggestions,
        total_impressions_30d, total_clicks_30d,
        approval_rate, ctr
    ) VALUES (
        p_account_id, p_date,
        COALESCE(v_total, 0), COALESCE(v_active, 0), COALESCE(v_pending, 0), COALESCE(v_disapproved, 0),
        v_errors, v_warnings, v_suggestions,
        COALESCE(v_impressions, 0), COALESCE(v_clicks, 0),
        CASE WHEN v_total > 0 THEN (v_active * 100.0 / v_total) ELSE 0 END,
        CASE WHEN v_impressions > 0 THEN (v_clicks * 1.0 / v_impressions) ELSE 0 END
    )
    ON CONFLICT (account_id, snapshot_date) DO UPDATE SET
        products_total = EXCLUDED.products_total,
        products_active = EXCLUDED.products_active,
        products_pending = EXCLUDED.products_pending,
        products_disapproved = EXCLUDED.products_disapproved,
        total_errors = EXCLUDED.total_errors,
        total_warnings = EXCLUDED.total_warnings,
        total_suggestions = EXCLUDED.total_suggestions,
        total_impressions_30d = EXCLUDED.total_impressions_30d,
        total_clicks_30d = EXCLUDED.total_clicks_30d,
        approval_rate = EXCLUDED.approval_rate,
        ctr = EXCLUDED.ctr
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE google_merchant_account_snapshots IS 'Daily snapshots of GMC account health for trend tracking';
COMMENT ON TABLE google_merchant_issue_history IS 'Lifecycle tracking of product issues for resolution monitoring';
COMMENT ON FUNCTION create_gmc_snapshot IS 'Creates or updates a daily snapshot from current product data';
