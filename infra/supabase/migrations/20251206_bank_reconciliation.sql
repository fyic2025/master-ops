-- =====================================================
-- XERO BANK RECONCILIATION INFRASTRUCTURE
-- =====================================================
-- Enables AI-powered bank reconciliation with pattern learning
-- Supports multi-business setup (RHF, Teelixir, Elevate, BOO)
--
-- Features:
-- - Import bank statements from Xero
-- - Auto-match transactions using learned patterns
-- - Track reconciliation decisions for ML
-- - Cache chart of accounts for fast lookups
-- - Confidence scoring for suggestions
-- =====================================================

-- =====================================================
-- TABLE: xero_bank_statements
-- =====================================================
-- Stores imported bank statement lines from Xero
-- These are unreconciled transactions that need categorization
CREATE TABLE IF NOT EXISTS xero_bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL CHECK (business_slug IN ('rhf', 'teelixir', 'elevate', 'boo')),

  -- Xero identifiers
  bank_account_id TEXT NOT NULL,
  bank_account_name TEXT,
  statement_line_id TEXT UNIQUE NOT NULL,

  -- Transaction details
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  payee TEXT,

  -- Reconciliation status
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciled_by TEXT,

  -- AI suggestions
  suggested_account_id TEXT,
  suggested_account_code TEXT,
  suggested_account_name TEXT,
  suggested_contact_id TEXT,
  suggested_contact_name TEXT,
  confidence_score DECIMAL(5, 2), -- 0-100

  -- Final reconciliation (may differ from suggestion)
  matched_account_id TEXT,
  matched_account_code TEXT,
  matched_contact_id TEXT,

  -- Metadata
  xero_raw_data JSONB, -- Full Xero statement line object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bank_statements_business ON xero_bank_statements(business_slug);
CREATE INDEX idx_bank_statements_date ON xero_bank_statements(date DESC);
CREATE INDEX idx_bank_statements_reconciled ON xero_bank_statements(is_reconciled, business_slug);
CREATE INDEX idx_bank_statements_account ON xero_bank_statements(bank_account_id);
CREATE INDEX idx_bank_statements_amount ON xero_bank_statements(amount);

-- Update timestamp trigger
CREATE TRIGGER update_bank_statements_timestamp
  BEFORE UPDATE ON xero_bank_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: xero_reconciliation_patterns
-- =====================================================
-- Stores learned patterns for auto-matching transactions
-- Patterns are created from user decisions and improve over time
CREATE TABLE IF NOT EXISTS xero_reconciliation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL CHECK (business_slug IN ('rhf', 'teelixir', 'elevate', 'boo')),

  -- Pattern type and value
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('description_match', 'amount_match', 'reference_match', 'payee_match', 'composite')),
  pattern_value TEXT NOT NULL,
  pattern_regex TEXT, -- If using regex matching

  -- Match target
  account_code TEXT NOT NULL,
  account_name TEXT,
  contact_id TEXT,
  contact_name TEXT,

  -- Pattern performance
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  confidence DECIMAL(5, 2) DEFAULT 50.0, -- 0-100, increases with successful matches

  -- Control
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 50, -- Higher = checked first

  -- Metadata
  created_from_statement_id UUID REFERENCES xero_bank_statements(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_patterns_business ON xero_reconciliation_patterns(business_slug);
CREATE INDEX idx_patterns_type ON xero_reconciliation_patterns(pattern_type);
CREATE INDEX idx_patterns_active ON xero_reconciliation_patterns(is_active, business_slug);
CREATE INDEX idx_patterns_priority ON xero_reconciliation_patterns(priority DESC);
CREATE INDEX idx_patterns_value ON xero_reconciliation_patterns(pattern_value);

-- Update timestamp trigger
CREATE TRIGGER update_reconciliation_patterns_timestamp
  BEFORE UPDATE ON xero_reconciliation_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: xero_reconciliation_history
-- =====================================================
-- Tracks all reconciliation decisions for ML and audit
-- Used to improve pattern matching over time
CREATE TABLE IF NOT EXISTS xero_reconciliation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL CHECK (business_slug IN ('rhf', 'teelixir', 'elevate', 'boo')),

  -- Link to statement
  statement_line_id UUID REFERENCES xero_bank_statements(id) ON DELETE CASCADE,

  -- Reconciliation details
  matched_account_code TEXT NOT NULL,
  matched_account_name TEXT,
  matched_contact_id TEXT,
  matched_contact_name TEXT,

  -- Decision tracking
  was_suggested BOOLEAN DEFAULT FALSE, -- Was this from AI?
  suggestion_confidence DECIMAL(5, 2), -- What was the confidence?
  was_modified BOOLEAN DEFAULT FALSE, -- Did user change the suggestion?
  user_approved BOOLEAN DEFAULT TRUE,

  -- Pattern that matched (if any)
  matched_pattern_id UUID REFERENCES xero_reconciliation_patterns(id),

  -- Metadata
  reconciled_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recon_history_business ON xero_reconciliation_history(business_slug);
CREATE INDEX idx_recon_history_statement ON xero_reconciliation_history(statement_line_id);
CREATE INDEX idx_recon_history_pattern ON xero_reconciliation_history(matched_pattern_id);
CREATE INDEX idx_recon_history_date ON xero_reconciliation_history(created_at DESC);

-- =====================================================
-- TABLE: xero_chart_of_accounts
-- =====================================================
-- Cached chart of accounts per business from Xero
-- Refreshed periodically to stay in sync
CREATE TABLE IF NOT EXISTS xero_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL CHECK (business_slug IN ('rhf', 'teelixir', 'elevate', 'boo')),

  -- Xero account details
  xero_account_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- BANK, EXPENSE, REVENUE, etc.
  class TEXT, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  status TEXT DEFAULT 'ACTIVE',
  tax_type TEXT,
  description TEXT,

  -- Usage tracking
  use_count INTEGER DEFAULT 0, -- How often this account is used
  last_used_at TIMESTAMPTZ,

  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  xero_raw_data JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique account per business
  UNIQUE(business_slug, xero_account_id)
);

-- Indexes
CREATE INDEX idx_chart_business ON xero_chart_of_accounts(business_slug);
CREATE INDEX idx_chart_code ON xero_chart_of_accounts(code);
CREATE INDEX idx_chart_type ON xero_chart_of_accounts(type);
CREATE INDEX idx_chart_status ON xero_chart_of_accounts(status);
CREATE INDEX idx_chart_use_count ON xero_chart_of_accounts(use_count DESC);

-- Update timestamp trigger
CREATE TRIGGER update_chart_of_accounts_timestamp
  BEFORE UPDATE ON xero_chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: suggest_reconciliation_match
-- =====================================================
-- Suggests account/contact for a statement line based on patterns
-- Returns the best matching pattern with confidence score
CREATE OR REPLACE FUNCTION suggest_reconciliation_match(
  p_business_slug TEXT,
  p_description TEXT,
  p_amount DECIMAL,
  p_reference TEXT DEFAULT NULL,
  p_payee TEXT DEFAULT NULL
)
RETURNS TABLE (
  pattern_id UUID,
  account_code TEXT,
  account_name TEXT,
  contact_id TEXT,
  contact_name TEXT,
  confidence DECIMAL,
  pattern_type TEXT,
  pattern_value TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_patterns AS (
    SELECT
      p.id,
      p.account_code,
      p.account_name,
      p.contact_id,
      p.contact_name,
      p.confidence,
      p.pattern_type,
      p.pattern_value,
      p.priority,
      CASE
        -- Exact description match gets highest score
        WHEN p.pattern_type = 'description_match' AND LOWER(p.pattern_value) = LOWER(p_description) THEN p.confidence + 20
        -- Partial description match
        WHEN p.pattern_type = 'description_match' AND LOWER(p_description) LIKE '%' || LOWER(p.pattern_value) || '%' THEN p.confidence + 10
        -- Regex match
        WHEN p.pattern_type = 'description_match' AND p.pattern_regex IS NOT NULL AND p_description ~* p.pattern_regex THEN p.confidence + 15
        -- Amount match (exact)
        WHEN p.pattern_type = 'amount_match' AND p.pattern_value::DECIMAL = p_amount THEN p.confidence + 15
        -- Reference match
        WHEN p.pattern_type = 'reference_match' AND p_reference IS NOT NULL AND LOWER(p.pattern_value) = LOWER(p_reference) THEN p.confidence + 10
        -- Payee match
        WHEN p.pattern_type = 'payee_match' AND p_payee IS NOT NULL AND LOWER(p.pattern_value) = LOWER(p_payee) THEN p.confidence + 12
        ELSE 0
      END as match_score
    FROM xero_reconciliation_patterns p
    WHERE p.business_slug = p_business_slug
      AND p.is_active = TRUE
  )
  SELECT
    rp.id,
    rp.account_code,
    rp.account_name,
    rp.contact_id,
    rp.contact_name,
    LEAST(rp.match_score, 100.0)::DECIMAL(5,2) as confidence,
    rp.pattern_type,
    rp.pattern_value
  FROM ranked_patterns rp
  WHERE rp.match_score > 0
  ORDER BY rp.match_score DESC, rp.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: create_pattern_from_reconciliation
-- =====================================================
-- Auto-creates a pattern when user reconciles a transaction
-- Helps build the pattern library automatically
CREATE OR REPLACE FUNCTION create_pattern_from_reconciliation(
  p_business_slug TEXT,
  p_description TEXT,
  p_account_code TEXT,
  p_account_name TEXT,
  p_contact_id TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_statement_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_pattern_id UUID;
  v_existing_pattern UUID;
BEGIN
  -- Check if pattern already exists for this description
  SELECT id INTO v_existing_pattern
  FROM xero_reconciliation_patterns
  WHERE business_slug = p_business_slug
    AND pattern_type = 'description_match'
    AND LOWER(pattern_value) = LOWER(p_description)
    AND account_code = p_account_code;

  IF v_existing_pattern IS NOT NULL THEN
    -- Pattern exists, increment match count and confidence
    UPDATE xero_reconciliation_patterns
    SET
      match_count = match_count + 1,
      last_matched_at = NOW(),
      confidence = LEAST(confidence + 5, 95.0), -- Cap at 95%
      updated_at = NOW()
    WHERE id = v_existing_pattern;

    RETURN v_existing_pattern;
  ELSE
    -- Create new pattern
    INSERT INTO xero_reconciliation_patterns (
      business_slug,
      pattern_type,
      pattern_value,
      account_code,
      account_name,
      contact_id,
      contact_name,
      match_count,
      confidence,
      created_from_statement_id
    ) VALUES (
      p_business_slug,
      'description_match',
      p_description,
      p_account_code,
      p_account_name,
      p_contact_id,
      p_contact_name,
      1,
      60.0, -- Start with moderate confidence
      p_statement_id
    )
    RETURNING id INTO v_pattern_id;

    RETURN v_pattern_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE xero_bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_reconciliation_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_reconciliation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Allow anon read access (for dashboard)
CREATE POLICY "Allow anon read xero_bank_statements" ON xero_bank_statements FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert xero_bank_statements" ON xero_bank_statements FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update xero_bank_statements" ON xero_bank_statements FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon read xero_reconciliation_patterns" ON xero_reconciliation_patterns FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert xero_reconciliation_patterns" ON xero_reconciliation_patterns FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update xero_reconciliation_patterns" ON xero_reconciliation_patterns FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon read xero_reconciliation_history" ON xero_reconciliation_history FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert xero_reconciliation_history" ON xero_reconciliation_history FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read xero_chart_of_accounts" ON xero_chart_of_accounts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert xero_chart_of_accounts" ON xero_chart_of_accounts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update xero_chart_of_accounts" ON xero_chart_of_accounts FOR UPDATE TO anon USING (true);

-- =====================================================
-- SAMPLE DATA FOR RHF (for testing)
-- =====================================================

COMMENT ON TABLE xero_bank_statements IS 'Bank statement lines imported from Xero requiring reconciliation';
COMMENT ON TABLE xero_reconciliation_patterns IS 'Learned patterns for auto-matching bank transactions';
COMMENT ON TABLE xero_reconciliation_history IS 'Audit trail of all reconciliation decisions';
COMMENT ON TABLE xero_chart_of_accounts IS 'Cached chart of accounts from Xero per business';
