-- ============================================================================
-- ATO Rulings Knowledge Base Schema
-- ============================================================================
-- Purpose: Store ATO taxation rulings, determinations, and guidance for
--          AI-assisted tax compliance across all 4 businesses
--
-- Businesses: Teelixir (Company), BOO (Trust), Elevate (Company), RHF (Company)
-- ============================================================================

-- Core rulings table
CREATE TABLE IF NOT EXISTS ato_rulings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ruling identification
    ruling_id TEXT UNIQUE NOT NULL,              -- e.g., "TR 2024/1", "GSTR 2020/1"
    ruling_type TEXT NOT NULL CHECK (ruling_type IN (
        'TR',    -- Taxation Ruling
        'TD',    -- Taxation Determination
        'GSTR',  -- GST Ruling
        'GSTD',  -- GST Determination
        'PCG',   -- Practical Compliance Guideline
        'LCR',   -- Law Companion Ruling
        'MT',    -- Miscellaneous Taxation Ruling
        'SGR',   -- Superannuation Guarantee Ruling
        'CR',    -- Class Ruling (rarely used, but allow)
        'PR',    -- Product Ruling (rarely used, but allow)
        'PS LA', -- Practice Statement Law Administration
        'OTHER'  -- Catch-all for edge cases
    )),

    -- Content
    title TEXT NOT NULL,
    publication_date DATE NOT NULL,
    effective_date DATE,                         -- When ruling takes effect (if different)
    summary TEXT,                                -- Brief description from RSS feed
    full_text TEXT,                              -- Full ruling content (fetched separately)
    url TEXT NOT NULL,                           -- Link to ATO source

    -- Classification
    topics TEXT[] DEFAULT '{}',                  -- Tags: ['gst', 'deductions', 'small_business']
    applicable_entities TEXT[] DEFAULT '{}',    -- ['company', 'trust', 'sole_trader']

    -- Review workflow
    relevance_status TEXT DEFAULT 'pending' CHECK (relevance_status IN (
        'pending',      -- Newly imported, not yet reviewed
        'relevant',     -- Marked as relevant for our businesses
        'not_relevant', -- Reviewed and deemed not applicable
        'archived'      -- Superseded or withdrawn
    )),
    review_notes TEXT,                           -- Notes from manual review
    reviewed_at TIMESTAMPTZ,                     -- When relevance was set

    -- Ruling relationships
    superseded_by TEXT,                          -- ruling_id of newer ruling (if superseded)
    related_rulings TEXT[] DEFAULT '{}',         -- Array of related ruling_ids

    -- Flexible metadata
    metadata JSONB DEFAULT '{}'::jsonb,          -- Additional structured data

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topic tags reference table
CREATE TABLE IF NOT EXISTS ato_ruling_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_topic TEXT,                           -- Self-reference for hierarchy
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync tracking for audit trail
CREATE TABLE IF NOT EXISTS ato_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_url TEXT,                               -- RSS feed URL or 'manual' or 'backfill'
    sync_type TEXT NOT NULL CHECK (sync_type IN (
        'rss_poll',   -- Regular RSS feed polling
        'backfill',   -- Historical data import
        'manual',     -- Manual entry
        'full_text'   -- Full text fetch for existing ruling
    )),
    rulings_found INTEGER DEFAULT 0,
    rulings_added INTEGER DEFAULT 0,
    rulings_updated INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ato_rulings_type ON ato_rulings(ruling_type);
CREATE INDEX IF NOT EXISTS idx_ato_rulings_date ON ato_rulings(publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_ato_rulings_relevance ON ato_rulings(relevance_status);
CREATE INDEX IF NOT EXISTS idx_ato_rulings_topics ON ato_rulings USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_ato_rulings_entities ON ato_rulings USING GIN(applicable_entities);
CREATE INDEX IF NOT EXISTS idx_ato_sync_log_type ON ato_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_ato_sync_log_date ON ato_sync_log(started_at DESC);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ato_rulings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ato_rulings_updated ON ato_rulings;
CREATE TRIGGER trg_ato_rulings_updated
    BEFORE UPDATE ON ato_rulings
    FOR EACH ROW EXECUTE FUNCTION update_ato_rulings_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE ato_rulings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ato_ruling_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ato_sync_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for automation scripts)
DROP POLICY IF EXISTS "Service role full access to ato_rulings" ON ato_rulings;
CREATE POLICY "Service role full access to ato_rulings" ON ato_rulings
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to ato_ruling_topics" ON ato_ruling_topics;
CREATE POLICY "Service role full access to ato_ruling_topics" ON ato_ruling_topics
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to ato_sync_log" ON ato_sync_log;
CREATE POLICY "Service role full access to ato_sync_log" ON ato_sync_log
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Seed Topic Tags
-- ============================================================================

INSERT INTO ato_ruling_topics (slug, name, description, sort_order) VALUES
    ('gst', 'GST', 'Goods and Services Tax treatment, registration, and reporting', 10),
    ('income_tax', 'Income Tax', 'Company and trust income tax obligations', 20),
    ('deductions', 'Deductions', 'Business expense deductions and eligibility', 30),
    ('small_business', 'Small Business', 'Small business CGT concessions and instant asset write-off', 40),
    ('depreciation', 'Depreciation', 'Capital allowances and asset depreciation', 50),
    ('fbt', 'FBT', 'Fringe Benefits Tax obligations', 60),
    ('superannuation', 'Superannuation', 'Super contributions and SG obligations', 70),
    ('division_7a', 'Division 7A', 'Loans between private companies and trusts', 80),
    ('payg', 'PAYG', 'PAYG withholding and instalments', 90),
    ('trading_stock', 'Trading Stock', 'Stock valuation and cost of goods', 100),
    ('capital_gains', 'Capital Gains', 'CGT events and exemptions', 110),
    ('trust_distributions', 'Trust Distributions', 'Trust income distribution and streaming', 120),
    ('motor_vehicle', 'Motor Vehicle', 'Car expenses and log book requirements', 130),
    ('home_office', 'Home Office', 'Working from home deductions', 140),
    ('international', 'International', 'Cross-border transactions and transfer pricing', 150)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Views
-- ============================================================================

-- Summary view for quick overview
CREATE OR REPLACE VIEW v_ato_rulings_summary AS
SELECT
    ruling_type,
    relevance_status,
    COUNT(*) as count,
    MIN(publication_date) as oldest,
    MAX(publication_date) as newest
FROM ato_rulings
GROUP BY ruling_type, relevance_status
ORDER BY ruling_type, relevance_status;

-- Relevant rulings for compliance work
CREATE OR REPLACE VIEW v_ato_relevant_rulings AS
SELECT
    ruling_id,
    ruling_type,
    title,
    publication_date,
    topics,
    applicable_entities,
    url,
    summary
FROM ato_rulings
WHERE relevance_status = 'relevant'
ORDER BY publication_date DESC;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ato_rulings IS 'ATO taxation rulings and guidance for tax compliance automation';
COMMENT ON TABLE ato_ruling_topics IS 'Reference table of topic tags for classifying rulings';
COMMENT ON TABLE ato_sync_log IS 'Audit log of RSS feed syncs and data imports';
COMMENT ON COLUMN ato_rulings.ruling_id IS 'Official ATO ruling identifier (e.g., TR 2024/1)';
COMMENT ON COLUMN ato_rulings.relevance_status IS 'Review status: pending (new), relevant (keep), not_relevant (skip), archived (superseded)';
