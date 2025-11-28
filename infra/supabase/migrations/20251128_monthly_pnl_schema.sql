-- Monthly P&L Snapshots for Teelixir + Elevate
-- Stores end-of-month P&L data for historical reporting and date range queries

CREATE TABLE IF NOT EXISTS monthly_pnl_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key TEXT NOT NULL,  -- 'teelixir', 'elevate'
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,  -- 1-12

  -- P&L Summary
  revenue DECIMAL(15, 2) DEFAULT 0,
  cogs DECIMAL(15, 2) DEFAULT 0,
  gross_profit DECIMAL(15, 2) DEFAULT 0,
  operating_expenses DECIMAL(15, 2) DEFAULT 0,
  net_profit DECIMAL(15, 2) DEFAULT 0,

  -- Margins
  gross_margin_pct DECIMAL(5, 2),
  net_margin_pct DECIMAL(5, 2),

  -- Account-level detail (JSON for drill-down)
  income_accounts JSONB DEFAULT '[]',
  cogs_accounts JSONB DEFAULT '[]',
  expense_accounts JSONB DEFAULT '[]',

  -- Metadata
  xero_report_id TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per business/month
  UNIQUE(business_key, period_year, period_month)
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_monthly_pnl_period
  ON monthly_pnl_snapshots(period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_monthly_pnl_business
  ON monthly_pnl_snapshots(business_key);

-- View for easy querying with date formatting
CREATE OR REPLACE VIEW monthly_pnl_view AS
SELECT
  *,
  TO_DATE(period_year || '-' || LPAD(period_month::TEXT, 2, '0') || '-01', 'YYYY-MM-DD') as period_start,
  (TO_DATE(period_year || '-' || LPAD(period_month::TEXT, 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day')::DATE as period_end
FROM monthly_pnl_snapshots;

-- Enable RLS
ALTER TABLE monthly_pnl_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON monthly_pnl_snapshots
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE monthly_pnl_snapshots IS 'Monthly P&L snapshots from Xero for Teelixir and Elevate';
