-- Intercompany Transactions table for consolidated financials
-- Stores invoice-level detail for Teelixir <-> Elevate transactions

CREATE TABLE IF NOT EXISTS intercompany_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity info
  source_entity TEXT NOT NULL, -- 'teelixir' or 'elevate'
  target_entity TEXT NOT NULL, -- 'teelixir' or 'elevate'
  direction TEXT NOT NULL, -- 'sale' or 'purchase'
  transaction_type TEXT NOT NULL, -- 'intercompany_sale', 'intercompany_purchase', 'intercompany_service'

  -- Invoice details
  invoice_number TEXT,
  invoice_id TEXT UNIQUE, -- Xero InvoiceID for deduplication
  invoice_date DATE NOT NULL,
  contact_name TEXT,

  -- Amounts
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,

  -- Status
  status TEXT, -- Xero status: AUTHORISED, PAID, etc.
  elimination_type TEXT, -- 'revenue_cogs' or 'service_expense'
  is_eliminated BOOLEAN DEFAULT false,

  -- Period for filtering
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,

  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intercompany_tx_entities ON intercompany_transactions(source_entity, target_entity);
CREATE INDEX IF NOT EXISTS idx_intercompany_tx_date ON intercompany_transactions(invoice_date);
CREATE INDEX IF NOT EXISTS idx_intercompany_tx_period ON intercompany_transactions(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_intercompany_tx_type ON intercompany_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_intercompany_tx_elimination ON intercompany_transactions(elimination_type);

-- View for elimination summary by period
CREATE OR REPLACE VIEW v_intercompany_eliminations AS
SELECT
  period_year,
  period_month,
  source_entity,
  target_entity,
  direction,
  transaction_type,
  elimination_type,
  COUNT(*) as invoice_count,
  SUM(subtotal) as total_subtotal,
  SUM(tax) as total_tax,
  SUM(total) as total_amount
FROM intercompany_transactions
GROUP BY period_year, period_month, source_entity, target_entity, direction, transaction_type, elimination_type
ORDER BY period_year DESC, period_month DESC, source_entity, direction;

-- View for MTD elimination totals
CREATE OR REPLACE VIEW v_mtd_intercompany AS
SELECT
  source_entity,
  target_entity,
  direction,
  elimination_type,
  COUNT(*) as invoice_count,
  SUM(total) as total_amount
FROM intercompany_transactions
WHERE period_year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND period_month = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY source_entity, target_entity, direction, elimination_type;

COMMENT ON TABLE intercompany_transactions IS 'Intercompany invoices between Teelixir and Elevate for consolidation eliminations';
