-- Financial Snapshots Table
-- Stores MTD and monthly revenue snapshots for all 4 businesses
-- Dashboard reads from here (fast) instead of calling Xero API on every page load

CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key TEXT NOT NULL,  -- 'teelixir', 'boo', 'elevate', 'rhf'
  period_type TEXT NOT NULL,   -- 'mtd', 'monthly', 'ytd'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- P&L Summary
  revenue DECIMAL(15, 2),
  cogs DECIMAL(15, 2),
  gross_profit DECIMAL(15, 2),
  operating_expenses DECIMAL(15, 2),
  net_profit DECIMAL(15, 2),

  -- Additional metrics
  gross_margin_pct DECIMAL(5, 2),  -- (gross_profit / revenue) * 100
  net_margin_pct DECIMAL(5, 2),    -- (net_profit / revenue) * 100

  -- Raw Xero report data for drill-down
  raw_report JSONB,

  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_key, period_type, period_start)
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_lookup
ON financial_snapshots(business_key, period_type, period_start DESC);

-- Comment on table
COMMENT ON TABLE financial_snapshots IS 'Cached financial metrics from Xero for dashboard display';

-- Enable RLS
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage financial_snapshots" ON financial_snapshots
FOR ALL USING (true) WITH CHECK (true);
