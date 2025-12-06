-- GMC Fix System Migration
-- Adds tables for tracking and executing GMC issue fixes

-- Fix queue for tracking individual product fixes
CREATE TABLE IF NOT EXISTS gmc_fix_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,

    -- Issue reference
    issue_code TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    bc_product_id INTEGER,

    -- Fix details
    fix_type TEXT NOT NULL CHECK (fix_type IN ('auto', 'semi-auto', 'manual', 'claude')),
    fix_action JSONB NOT NULL DEFAULT '{}',

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'executing', 'completed', 'failed', 'skipped')),
    priority INTEGER DEFAULT 2,

    -- Execution tracking
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Results
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Batch tracking
    batch_id UUID,

    -- Audit
    created_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate fixes for same product/issue
    UNIQUE(account_id, offer_id, issue_code)
);

-- Indexes for fix queue
CREATE INDEX IF NOT EXISTS idx_gmc_fix_queue_status ON gmc_fix_queue(status);
CREATE INDEX IF NOT EXISTS idx_gmc_fix_queue_account ON gmc_fix_queue(account_id, status);
CREATE INDEX IF NOT EXISTS idx_gmc_fix_queue_offer ON gmc_fix_queue(offer_id);
CREATE INDEX IF NOT EXISTS idx_gmc_fix_queue_batch ON gmc_fix_queue(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gmc_fix_queue_issue ON gmc_fix_queue(issue_code, status);

-- Fix history for audit trail and verification
CREATE TABLE IF NOT EXISTS gmc_fix_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,

    -- Reference to original queue item
    fix_queue_id UUID REFERENCES gmc_fix_queue(id) ON DELETE SET NULL,

    -- Issue details
    issue_code TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    bc_product_id INTEGER,
    product_title TEXT,

    -- What was done
    fix_type TEXT NOT NULL,
    fix_action JSONB NOT NULL,
    previous_value JSONB,
    new_value JSONB,

    -- Result
    success BOOLEAN DEFAULT FALSE,
    result JSONB,
    error_message TEXT,

    -- Verification
    verified_at TIMESTAMPTZ,
    verification_result TEXT CHECK (verification_result IN ('resolved', 'still_present', 'new_issue', 'pending')),
    verification_details JSONB,

    -- Timestamps
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fix history
CREATE INDEX IF NOT EXISTS idx_gmc_fix_history_account ON gmc_fix_history(account_id);
CREATE INDEX IF NOT EXISTS idx_gmc_fix_history_offer ON gmc_fix_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_gmc_fix_history_issue ON gmc_fix_history(issue_code);
CREATE INDEX IF NOT EXISTS idx_gmc_fix_history_executed ON gmc_fix_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmc_fix_history_verification ON gmc_fix_history(verification_result) WHERE verification_result IS NOT NULL;

-- Extend existing gmc_issue_resolution table with fix tracking fields
DO $$
BEGIN
    -- Add fix_type column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gmc_issue_resolution' AND column_name = 'fix_type') THEN
        ALTER TABLE gmc_issue_resolution ADD COLUMN fix_type TEXT;
    END IF;

    -- Add fix_prompt column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gmc_issue_resolution' AND column_name = 'fix_prompt') THEN
        ALTER TABLE gmc_issue_resolution ADD COLUMN fix_prompt TEXT;
    END IF;

    -- Add fix batch tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gmc_issue_resolution' AND column_name = 'fix_batch_id') THEN
        ALTER TABLE gmc_issue_resolution ADD COLUMN fix_batch_id UUID;
    END IF;

    -- Add product fix counts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gmc_issue_resolution' AND column_name = 'products_fixed') THEN
        ALTER TABLE gmc_issue_resolution ADD COLUMN products_fixed INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gmc_issue_resolution' AND column_name = 'products_failed') THEN
        ALTER TABLE gmc_issue_resolution ADD COLUMN products_failed INTEGER DEFAULT 0;
    END IF;

    -- Add last fix attempt timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gmc_issue_resolution' AND column_name = 'last_fix_attempt_at') THEN
        ALTER TABLE gmc_issue_resolution ADD COLUMN last_fix_attempt_at TIMESTAMPTZ;
    END IF;
END $$;

-- Auto-update updated_at timestamp for gmc_fix_queue
CREATE OR REPLACE FUNCTION update_gmc_fix_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gmc_fix_queue_updated_at ON gmc_fix_queue;
CREATE TRIGGER trigger_gmc_fix_queue_updated_at
    BEFORE UPDATE ON gmc_fix_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_gmc_fix_queue_updated_at();

-- Helper function to get pending fixes for an account
CREATE OR REPLACE FUNCTION get_pending_gmc_fixes(p_account_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    issue_code TEXT,
    offer_id TEXT,
    bc_product_id INTEGER,
    fix_type TEXT,
    fix_action JSONB,
    priority INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id,
        q.issue_code,
        q.offer_id,
        q.bc_product_id,
        q.fix_type,
        q.fix_action,
        q.priority,
        q.created_at
    FROM gmc_fix_queue q
    WHERE q.account_id = p_account_id
      AND q.status = 'pending'
    ORDER BY q.priority ASC, q.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function to update fix status with logging
CREATE OR REPLACE FUNCTION update_gmc_fix_status(
    p_fix_id UUID,
    p_status TEXT,
    p_result JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_fix RECORD;
BEGIN
    -- Get the fix record
    SELECT * INTO v_fix FROM gmc_fix_queue WHERE id = p_fix_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update status
    UPDATE gmc_fix_queue
    SET
        status = p_status,
        result = COALESCE(p_result, result),
        error_message = COALESCE(p_error_message, error_message),
        started_at = CASE WHEN p_status = 'executing' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_status IN ('completed', 'failed', 'skipped') THEN NOW() ELSE completed_at END,
        retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
    WHERE id = p_fix_id;

    -- If completed or failed, create history record
    IF p_status IN ('completed', 'failed') THEN
        INSERT INTO gmc_fix_history (
            account_id,
            fix_queue_id,
            issue_code,
            offer_id,
            bc_product_id,
            fix_type,
            fix_action,
            success,
            result,
            error_message
        )
        SELECT
            account_id,
            id,
            issue_code,
            offer_id,
            bc_product_id,
            fix_type,
            fix_action,
            p_status = 'completed',
            p_result,
            p_error_message
        FROM gmc_fix_queue
        WHERE id = p_fix_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- View for fix summary by issue
CREATE OR REPLACE VIEW gmc_fix_summary AS
SELECT
    account_id,
    issue_code,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'executing') as executing_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'skipped') as skipped_count,
    COUNT(*) as total_count,
    MAX(created_at) as last_queued_at,
    MAX(completed_at) as last_completed_at
FROM gmc_fix_queue
GROUP BY account_id, issue_code;

-- Grant permissions (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON gmc_fix_queue TO authenticated;
-- GRANT SELECT, INSERT ON gmc_fix_history TO authenticated;
-- GRANT SELECT ON gmc_fix_summary TO authenticated;

COMMENT ON TABLE gmc_fix_queue IS 'Queue for pending GMC issue fixes - tracks individual product fixes';
COMMENT ON TABLE gmc_fix_history IS 'Audit trail of all executed GMC fixes with verification status';
COMMENT ON VIEW gmc_fix_summary IS 'Summary of fix queue status by issue code';
