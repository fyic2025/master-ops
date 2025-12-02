-- Google Merchant Center Integration Schema
-- Run this in Supabase SQL Editor to create the tracking tables

-- ============================================
-- SNAPSHOT METADATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gmc_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    snapshot_date DATE DEFAULT CURRENT_DATE,

    -- Summary counts
    total_products INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    disapproved_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    expiring_count INTEGER DEFAULT 0,

    -- Issue counts
    total_issues INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,

    -- BigCommerce comparison
    bc_product_count INTEGER DEFAULT 0,
    matched_products INTEGER DEFAULT 0,
    unmatched_in_gmc INTEGER DEFAULT 0,
    missing_from_gmc INTEGER DEFAULT 0,

    -- Run metadata
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed
    error_message TEXT,
    duration_seconds INTEGER,

    CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'failed'))
);

-- Index for quick date lookups
CREATE INDEX IF NOT EXISTS idx_gmc_snapshots_date ON gmc_snapshots(snapshot_date DESC);

-- ============================================
-- PRODUCT STATUS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gmc_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID REFERENCES gmc_snapshots(id) ON DELETE CASCADE,

    -- GMC identifiers
    gmc_product_id VARCHAR(255) NOT NULL, -- Format: online:en:AU:SKU
    offer_id VARCHAR(255), -- Usually the SKU
    channel VARCHAR(20) DEFAULT 'online',

    -- Product details
    title TEXT,
    description TEXT,
    link TEXT,
    image_link TEXT,

    -- Categorization
    google_product_category VARCHAR(500),
    product_type TEXT,
    brand VARCHAR(255),

    -- Pricing & availability
    price_amount DECIMAL(10,2),
    price_currency VARCHAR(3) DEFAULT 'AUD',
    availability VARCHAR(50),

    -- Status
    status VARCHAR(50), -- approved, disapproved, pending
    destinations JSONB, -- Shopping, Free listings, etc.

    -- BigCommerce cross-reference
    bc_product_id INTEGER,
    bc_variant_id INTEGER,
    bc_sku VARCHAR(255),
    bc_match_status VARCHAR(20), -- matched, unmatched, missing

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    gmc_last_update TIMESTAMPTZ,

    CONSTRAINT unique_product_per_snapshot UNIQUE (snapshot_id, gmc_product_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gmc_products_snapshot ON gmc_products(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_gmc_products_status ON gmc_products(status);
CREATE INDEX IF NOT EXISTS idx_gmc_products_offer_id ON gmc_products(offer_id);
CREATE INDEX IF NOT EXISTS idx_gmc_products_bc_sku ON gmc_products(bc_sku);

-- ============================================
-- PRODUCT ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gmc_product_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID REFERENCES gmc_snapshots(id) ON DELETE CASCADE,
    gmc_product_id VARCHAR(255) NOT NULL,
    offer_id VARCHAR(255),

    -- Issue details
    issue_code VARCHAR(100),
    issue_type VARCHAR(20), -- error, warning, info
    severity VARCHAR(20), -- critical, high, medium, low
    attribute VARCHAR(100), -- which field has the issue
    description TEXT,
    detail TEXT,
    documentation_url TEXT,

    -- Impact
    servability VARCHAR(50), -- disapproved, demoted, unaffected
    affected_destinations TEXT[], -- Shopping, Free listings, etc.

    -- Resolution tracking
    first_seen_snapshot_id UUID,
    is_new BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_issue_per_snapshot UNIQUE (snapshot_id, gmc_product_id, issue_code, attribute)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gmc_issues_snapshot ON gmc_product_issues(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_gmc_issues_type ON gmc_product_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_gmc_issues_code ON gmc_product_issues(issue_code);
CREATE INDEX IF NOT EXISTS idx_gmc_issues_offer ON gmc_product_issues(offer_id);

-- ============================================
-- ACCOUNT-LEVEL ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gmc_account_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID REFERENCES gmc_snapshots(id) ON DELETE CASCADE,

    issue_type VARCHAR(100),
    severity VARCHAR(20),
    title TEXT,
    description TEXT,
    documentation_url TEXT,
    affected_destinations TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gmc_account_issues_snapshot ON gmc_account_issues(snapshot_id);

-- ============================================
-- VIEWS FOR ANALYSIS
-- ============================================

-- Current snapshot (most recent)
CREATE OR REPLACE VIEW gmc_current_snapshot AS
SELECT * FROM gmc_snapshots
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 1;

-- Current products with issues
CREATE OR REPLACE VIEW gmc_current_products AS
SELECT p.*,
       (SELECT COUNT(*) FROM gmc_product_issues i WHERE i.snapshot_id = p.snapshot_id AND i.gmc_product_id = p.gmc_product_id AND i.issue_type = 'error') as error_count,
       (SELECT COUNT(*) FROM gmc_product_issues i WHERE i.snapshot_id = p.snapshot_id AND i.gmc_product_id = p.gmc_product_id AND i.issue_type = 'warning') as warning_count
FROM gmc_products p
WHERE p.snapshot_id = (SELECT id FROM gmc_current_snapshot);

-- Disapproved products (priority fixes)
CREATE OR REPLACE VIEW gmc_disapproved_products AS
SELECT p.offer_id, p.title, p.link, p.bc_sku,
       array_agg(DISTINCT i.description) as issues,
       array_agg(DISTINCT i.issue_code) as issue_codes
FROM gmc_products p
JOIN gmc_product_issues i ON p.snapshot_id = i.snapshot_id AND p.gmc_product_id = i.gmc_product_id
WHERE p.snapshot_id = (SELECT id FROM gmc_current_snapshot)
  AND p.status = 'disapproved'
GROUP BY p.offer_id, p.title, p.link, p.bc_sku
ORDER BY array_length(array_agg(DISTINCT i.issue_code), 1) DESC;

-- Issue summary by type
CREATE OR REPLACE VIEW gmc_issue_summary AS
SELECT
    i.issue_code,
    i.description,
    i.issue_type,
    COUNT(DISTINCT i.offer_id) as affected_products,
    i.documentation_url
FROM gmc_product_issues i
WHERE i.snapshot_id = (SELECT id FROM gmc_current_snapshot)
GROUP BY i.issue_code, i.description, i.issue_type, i.documentation_url
ORDER BY affected_products DESC;

-- Progress comparison (current vs previous)
CREATE OR REPLACE VIEW gmc_progress AS
WITH current AS (
    SELECT * FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1
),
previous AS (
    SELECT * FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1 OFFSET 1
)
SELECT
    c.snapshot_date as current_date,
    p.snapshot_date as previous_date,
    c.total_products as current_total,
    p.total_products as previous_total,
    c.approved_count as current_approved,
    p.approved_count as previous_approved,
    c.approved_count - COALESCE(p.approved_count, 0) as approved_change,
    c.disapproved_count as current_disapproved,
    p.disapproved_count as previous_disapproved,
    c.disapproved_count - COALESCE(p.disapproved_count, 0) as disapproved_change,
    c.total_issues as current_issues,
    p.total_issues as previous_issues,
    c.total_issues - COALESCE(p.total_issues, 0) as issues_change,
    ROUND(c.approved_count::numeric / NULLIF(c.total_products, 0) * 100, 1) as approval_rate
FROM current c
LEFT JOIN previous p ON true;

-- Weekly trend (last 8 weeks)
CREATE OR REPLACE VIEW gmc_weekly_trend AS
SELECT
    snapshot_date,
    total_products,
    approved_count,
    disapproved_count,
    pending_count,
    total_issues,
    ROUND(approved_count::numeric / NULLIF(total_products, 0) * 100, 1) as approval_rate,
    matched_products,
    missing_from_gmc
FROM gmc_snapshots
WHERE status = 'completed'
ORDER BY snapshot_date DESC
LIMIT 8;

-- Products missing from GMC (in BC but not in GMC)
CREATE OR REPLACE VIEW gmc_missing_products AS
SELECT DISTINCT
    ep.bc_product_id,
    ep.sku,
    ep.name as title,
    ep.calculated_price as price
FROM ecommerce_products ep
LEFT JOIN gmc_products gp ON gp.bc_sku = ep.sku
    AND gp.snapshot_id = (SELECT id FROM gmc_current_snapshot)
WHERE gp.id IS NULL
  AND ep.is_visible = true
  AND ep.availability = 'available';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get latest snapshot ID
CREATE OR REPLACE FUNCTION get_current_gmc_snapshot_id()
RETURNS UUID AS $$
    SELECT id FROM gmc_snapshots WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1;
$$ LANGUAGE SQL;

-- Compare two snapshots
CREATE OR REPLACE FUNCTION compare_gmc_snapshots(
    snapshot1_id UUID,
    snapshot2_id UUID
)
RETURNS TABLE (
    metric VARCHAR,
    snapshot1_value INTEGER,
    snapshot2_value INTEGER,
    change INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_products'::VARCHAR, s1.total_products, s2.total_products, s2.total_products - s1.total_products
    FROM gmc_snapshots s1, gmc_snapshots s2
    WHERE s1.id = snapshot1_id AND s2.id = snapshot2_id
    UNION ALL
    SELECT 'approved', s1.approved_count, s2.approved_count, s2.approved_count - s1.approved_count
    FROM gmc_snapshots s1, gmc_snapshots s2
    WHERE s1.id = snapshot1_id AND s2.id = snapshot2_id
    UNION ALL
    SELECT 'disapproved', s1.disapproved_count, s2.disapproved_count, s2.disapproved_count - s1.disapproved_count
    FROM gmc_snapshots s1, gmc_snapshots s2
    WHERE s1.id = snapshot1_id AND s2.id = snapshot2_id
    UNION ALL
    SELECT 'total_issues', s1.total_issues, s2.total_issues, s2.total_issues - s1.total_issues
    FROM gmc_snapshots s1, gmc_snapshots s2
    WHERE s1.id = snapshot1_id AND s2.id = snapshot2_id;
END;
$$ LANGUAGE plpgsql;
