-- ============================================================================
-- CONSOLIDATED FINANCIALS SCHEMA
-- ============================================================================
-- Database schema for consolidated financial reporting system
-- Supports: Teelixir + Elevate Wholesale consolidation
-- Features: Account mappings, intercompany eliminations, shared expense allocation
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ORGANIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS xero_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  xero_tenant_id TEXT UNIQUE NOT NULL,
  business_key TEXT UNIQUE NOT NULL, -- 'teelixir' or 'elevate-wholesale'
  name TEXT NOT NULL,
  legal_name TEXT,
  base_currency TEXT DEFAULT 'AUD',
  country_code TEXT DEFAULT 'AU',
  financial_year_end_month INTEGER,
  financial_year_end_day INTEGER,
  is_demo_company BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_xero_organizations_business_key ON xero_organizations(business_key);
CREATE INDEX IF NOT EXISTS idx_xero_organizations_tenant_id ON xero_organizations(xero_tenant_id);

COMMENT ON TABLE xero_organizations IS 'Xero organization/tenant information for both companies';
COMMENT ON COLUMN xero_organizations.business_key IS 'Internal identifier: teelixir or elevate-wholesale';
COMMENT ON COLUMN xero_organizations.xero_tenant_id IS 'Xero API tenant UUID';

-- ============================================================================
-- 2. CHART OF ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES xero_organizations(id) ON DELETE CASCADE,
  xero_account_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- BANK, CURRENT, EXPENSE, REVENUE, etc.
  account_class TEXT, -- ASSET, LIABILITY, EQUITY, EXPENSE, REVENUE
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED, DELETED
  description TEXT,
  tax_type TEXT,
  enable_payments_to_account BOOLEAN DEFAULT false,
  show_in_expense_claims BOOLEAN DEFAULT false,
  bank_account_number TEXT,
  bank_account_type TEXT,
  currency_code TEXT DEFAULT 'AUD',
  reporting_code TEXT,
  reporting_code_name TEXT,
  has_attachments BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  xero_updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(organization_id, xero_account_id),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_organization ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_class ON accounts(account_class);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_org_status ON accounts(organization_id, status);

COMMENT ON TABLE accounts IS 'Chart of accounts from both Xero organizations';
COMMENT ON COLUMN accounts.account_type IS 'Xero account type (BANK, CURRENT, EXPENSE, REVENUE, etc.)';
COMMENT ON COLUMN accounts.account_class IS 'Xero account class (ASSET, LIABILITY, EQUITY, EXPENSE, REVENUE)';

-- ============================================================================
-- 3. ACCOUNT MAPPINGS (for consolidation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  consolidated_account_code TEXT NOT NULL,
  consolidated_account_name TEXT NOT NULL,
  mapping_type TEXT DEFAULT 'standard', -- standard, intercompany, shared_expense
  confidence_level TEXT DEFAULT 'high', -- high, medium, low, manual
  mapping_reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(source_account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_mappings_source ON account_mappings(source_account_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_consolidated_code ON account_mappings(consolidated_account_code);
CREATE INDEX IF NOT EXISTS idx_account_mappings_type ON account_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_account_mappings_active ON account_mappings(is_active);

COMMENT ON TABLE account_mappings IS 'Maps Elevate Wholesale accounts to Teelixir consolidated structure';
COMMENT ON COLUMN account_mappings.source_account_id IS 'Elevate Wholesale account to map from';
COMMENT ON COLUMN account_mappings.consolidated_account_code IS 'Target Teelixir account code';
COMMENT ON COLUMN account_mappings.mapping_type IS 'Type of mapping (standard, intercompany, shared_expense)';
COMMENT ON COLUMN account_mappings.confidence_level IS 'AI confidence in mapping suggestion';

-- ============================================================================
-- 4. JOURNAL LINES / TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES xero_organizations(id) ON DELETE CASCADE,
  xero_journal_id TEXT NOT NULL,
  xero_journal_line_id TEXT NOT NULL,
  xero_source_id TEXT, -- Invoice ID, Payment ID, etc.
  xero_source_type TEXT, -- ACCREC, ACCPAY, MANJOURNAL, etc.
  journal_number INTEGER,
  journal_date DATE NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  description TEXT,
  net_amount DECIMAL(15, 2) NOT NULL,
  gross_amount DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  tax_type TEXT,
  tax_name TEXT,
  tracking_categories JSONB DEFAULT '[]'::jsonb,
  is_intercompany BOOLEAN DEFAULT false,
  intercompany_counterparty_org_id UUID REFERENCES xero_organizations(id),
  is_eliminated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  xero_created_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(organization_id, xero_journal_line_id)
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_org ON journal_lines(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_date ON journal_lines(journal_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_source_type ON journal_lines(xero_source_type);
CREATE INDEX IF NOT EXISTS idx_journal_lines_intercompany ON journal_lines(is_intercompany);
CREATE INDEX IF NOT EXISTS idx_journal_lines_eliminated ON journal_lines(is_eliminated);
CREATE INDEX IF NOT EXISTS idx_journal_lines_org_date ON journal_lines(organization_id, journal_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_date_account ON journal_lines(journal_date, account_id);

COMMENT ON TABLE journal_lines IS 'All journal lines (transactions) from both organizations';
COMMENT ON COLUMN journal_lines.is_intercompany IS 'Transaction between Teelixir and Elevate Wholesale';
COMMENT ON COLUMN journal_lines.is_eliminated IS 'Transaction eliminated in consolidation';

-- ============================================================================
-- 5. INTERCOMPANY ELIMINATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS intercompany_eliminations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elimination_date DATE NOT NULL,
  source_journal_line_id UUID REFERENCES journal_lines(id) ON DELETE CASCADE,
  counterparty_journal_line_id UUID REFERENCES journal_lines(id) ON DELETE CASCADE,
  elimination_type TEXT NOT NULL, -- revenue_cogs, payable_receivable, loan, dividend
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  teelixir_account_code TEXT,
  elevate_account_code TEXT,
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_intercompany_eliminations_date ON intercompany_eliminations(elimination_date);
CREATE INDEX IF NOT EXISTS idx_intercompany_eliminations_type ON intercompany_eliminations(elimination_type);
CREATE INDEX IF NOT EXISTS idx_intercompany_eliminations_applied ON intercompany_eliminations(is_applied);
CREATE INDEX IF NOT EXISTS idx_intercompany_eliminations_source ON intercompany_eliminations(source_journal_line_id);

COMMENT ON TABLE intercompany_eliminations IS 'Intercompany transaction eliminations for consolidation';
COMMENT ON COLUMN intercompany_eliminations.elimination_type IS 'Type of elimination entry (revenue_cogs, payable_receivable, loan, dividend)';

-- ============================================================================
-- 6. SHARED EXPENSE RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_expense_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name TEXT NOT NULL,
  account_code_pattern TEXT NOT NULL, -- Regex or exact match
  description TEXT,
  allocation_method TEXT DEFAULT 'fixed_percentage', -- fixed_percentage, revenue_ratio, headcount
  teelixir_allocation_percentage DECIMAL(5, 2) DEFAULT 50.00,
  elevate_allocation_percentage DECIMAL(5, 2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_percentages CHECK (
    teelixir_allocation_percentage + elevate_allocation_percentage = 100.00
  )
);

CREATE INDEX IF NOT EXISTS idx_shared_expense_rules_active ON shared_expense_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_shared_expense_rules_effective ON shared_expense_rules(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_shared_expense_rules_pattern ON shared_expense_rules(account_code_pattern);

COMMENT ON TABLE shared_expense_rules IS 'Rules for allocating shared expenses between entities';
COMMENT ON COLUMN shared_expense_rules.account_code_pattern IS 'Pattern to match accounts (e.g., "^710" for rent)';
COMMENT ON COLUMN shared_expense_rules.allocation_method IS 'Method for splitting expense (fixed_percentage, revenue_ratio, headcount)';

-- ============================================================================
-- 7. CONSOLIDATED REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS consolidated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL, -- trial_balance, profit_loss, balance_sheet, cash_flow
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_period TEXT, -- Q1, Q2, Q3, Q4, or month name
  report_data JSONB NOT NULL,
  teelixir_data JSONB,
  elevate_data JSONB,
  elimination_entries JSONB DEFAULT '[]'::jsonb,
  shared_allocations JSONB DEFAULT '[]'::jsonb,
  total_eliminations_amount DECIMAL(15, 2) DEFAULT 0,
  total_shared_allocations_amount DECIMAL(15, 2) DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT,
  is_final BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(report_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_consolidated_reports_type ON consolidated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_consolidated_reports_period ON consolidated_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_consolidated_reports_fiscal_year ON consolidated_reports(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_consolidated_reports_type_period ON consolidated_reports(report_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_consolidated_reports_final ON consolidated_reports(is_final);

COMMENT ON TABLE consolidated_reports IS 'Consolidated financial reports (P&L, Balance Sheet, Cash Flow)';
COMMENT ON COLUMN consolidated_reports.report_data IS 'Consolidated report data in structured JSON';
COMMENT ON COLUMN consolidated_reports.elimination_entries IS 'Array of intercompany elimination entries applied';
COMMENT ON COLUMN consolidated_reports.is_final IS 'Report finalized and locked for audit trail';

-- ============================================================================
-- 8. SYNC HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES xero_organizations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- full, incremental, accounts, journals, reports
  sync_status TEXT NOT NULL, -- pending, running, completed, failed
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  triggered_by TEXT, -- manual, scheduled, webhook
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sync_history_org ON sync_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_history_started ON sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_org_started ON sync_history(organization_id, started_at DESC);

COMMENT ON TABLE sync_history IS 'History of data synchronization from Xero';
COMMENT ON COLUMN sync_history.sync_type IS 'Type of sync operation (full, incremental, accounts, journals, reports)';

-- ============================================================================
-- 9. AUDIT TRAIL
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE, APPROVE, FINALIZE
  performed_by TEXT NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_table ON audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trail_record ON audit_trail(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON audit_trail(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);

COMMENT ON TABLE audit_trail IS 'Audit trail for all important changes to financial data';
COMMENT ON COLUMN audit_trail.action IS 'Type of change (INSERT, UPDATE, DELETE, APPROVE, FINALIZE)';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER update_xero_organizations_updated_at BEFORE UPDATE ON xero_organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_mappings_updated_at BEFORE UPDATE ON account_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_lines_updated_at BEFORE UPDATE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intercompany_eliminations_updated_at BEFORE UPDATE ON intercompany_eliminations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_expense_rules_updated_at BEFORE UPDATE ON shared_expense_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Active accounts by organization
CREATE OR REPLACE VIEW v_active_accounts AS
SELECT
  a.*,
  o.business_key,
  o.name as organization_name
FROM accounts a
JOIN xero_organizations o ON a.organization_id = o.id
WHERE a.status = 'ACTIVE';

-- Intercompany transactions needing elimination
CREATE OR REPLACE VIEW v_intercompany_transactions AS
SELECT
  jl.*,
  o.business_key,
  o.name as organization_name,
  a.code as account_code,
  a.name as account_name
FROM journal_lines jl
JOIN xero_organizations o ON jl.organization_id = o.id
JOIN accounts a ON jl.account_id = a.id
WHERE jl.is_intercompany = true
AND jl.is_eliminated = false;

-- Monthly transaction summary by organization
CREATE OR REPLACE VIEW v_monthly_transaction_summary AS
SELECT
  o.business_key,
  o.name as organization_name,
  DATE_TRUNC('month', jl.journal_date) as month,
  a.account_class,
  COUNT(*) as transaction_count,
  SUM(jl.net_amount) as total_net_amount,
  SUM(jl.gross_amount) as total_gross_amount,
  SUM(jl.tax_amount) as total_tax_amount
FROM journal_lines jl
JOIN xero_organizations o ON jl.organization_id = o.id
JOIN accounts a ON jl.account_id = a.id
GROUP BY o.business_key, o.name, DATE_TRUNC('month', jl.journal_date), a.account_class
ORDER BY month DESC, organization_name, account_class;

-- Latest sync status
CREATE OR REPLACE VIEW v_latest_sync_status AS
SELECT DISTINCT ON (organization_id, sync_type)
  sh.*,
  o.name as organization_name,
  o.business_key
FROM sync_history sh
JOIN xero_organizations o ON sh.organization_id = o.id
ORDER BY organization_id, sync_type, started_at DESC;

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed for your security model)
-- ============================================================================

-- Grant access to service role (adjust based on your needs)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- INITIAL DATA / SEED
-- ============================================================================

-- Insert default shared expense rules (can be modified)
INSERT INTO shared_expense_rules (
  rule_name,
  account_code_pattern,
  description,
  teelixir_allocation_percentage,
  elevate_allocation_percentage,
  effective_from
) VALUES
  ('Rent - 50/50 Split', '^710', 'Office rent split equally between entities', 50.00, 50.00, '2024-01-01'),
  ('Utilities - 50/50 Split', '^715', 'Utilities split equally between entities', 50.00, 50.00, '2024-01-01'),
  ('Insurance - 50/50 Split', '^720', 'Insurance split equally between entities', 50.00, 50.00, '2024-01-01')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

COMMENT ON SCHEMA public IS 'Consolidated Financials Schema v1.0 - Teelixir + Elevate Wholesale';
