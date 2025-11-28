-- Xero Token Storage
-- Stores refresh tokens for each business (Xero tokens are single-use)

CREATE TABLE IF NOT EXISTS xero_tokens (
    business_key TEXT PRIMARY KEY,
    refresh_token TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_xero_tokens_business ON xero_tokens(business_key);

-- Enable RLS but allow service role access
ALTER TABLE xero_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for service role access
CREATE POLICY "Service role full access" ON xero_tokens
    FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE xero_tokens IS 'Stores Xero refresh tokens (single-use) for each business';
