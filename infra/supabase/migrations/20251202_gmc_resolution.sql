-- GMC Issue Resolution Tracking
-- Tracks resolution status for each issue type per account

CREATE TABLE IF NOT EXISTS gmc_issue_resolution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    issue_code TEXT NOT NULL,
    severity TEXT,
    products_affected INTEGER DEFAULT 0,

    -- Resolution tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'fixed', 'verified')),
    fix_notes TEXT,
    fixed_at TIMESTAMPTZ,
    fixed_by TEXT,
    verified_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one resolution record per issue code per account
    UNIQUE(account_id, issue_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gmc_resolution_account ON gmc_issue_resolution(account_id);
CREATE INDEX IF NOT EXISTS idx_gmc_resolution_status ON gmc_issue_resolution(status);
CREATE INDEX IF NOT EXISTS idx_gmc_resolution_issue ON gmc_issue_resolution(issue_code);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_gmc_resolution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gmc_resolution_updated ON gmc_issue_resolution;
CREATE TRIGGER trg_gmc_resolution_updated
    BEFORE UPDATE ON gmc_issue_resolution
    FOR EACH ROW
    EXECUTE FUNCTION update_gmc_resolution_updated_at();

-- Enable RLS
ALTER TABLE gmc_issue_resolution ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role full access)
DROP POLICY IF EXISTS "Service role full access to gmc_issue_resolution" ON gmc_issue_resolution;
CREATE POLICY "Service role full access to gmc_issue_resolution"
    ON gmc_issue_resolution
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Comment
COMMENT ON TABLE gmc_issue_resolution IS 'Tracks resolution status for GMC feed issues per account';
