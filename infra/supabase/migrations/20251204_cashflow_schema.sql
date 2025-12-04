-- Cash Flow Budgets & Projections Schema
-- TASK-14: Financial planning "nerve centre" for ops.growthcohq.com

-- 1. Budget line items (hierarchical with custom items)
CREATE TABLE IF NOT EXISTS cashflow_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key TEXT NOT NULL, -- 'teelixir', 'elevate', 'consolidated'
  parent_id UUID REFERENCES cashflow_line_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  xero_account_code TEXT,  -- NULL for custom items, maps to Xero account
  item_type TEXT NOT NULL CHECK (item_type IN ('revenue', 'cogs', 'expense', 'cash', 'custom')),
  sort_order INT DEFAULT 0,
  is_system BOOLEAN DEFAULT false, -- true = auto-created from Xero, false = user-added
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by business and type
CREATE INDEX IF NOT EXISTS idx_cashflow_line_items_business ON cashflow_line_items(business_key);
CREATE INDEX IF NOT EXISTS idx_cashflow_line_items_parent ON cashflow_line_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_line_items_type ON cashflow_line_items(item_type);

-- 2. Budget values by period
CREATE TABLE IF NOT EXISTS cashflow_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key TEXT NOT NULL,
  line_item_id UUID REFERENCES cashflow_line_items(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annually')),
  period_start DATE NOT NULL,
  budget_amount DECIMAL(12,2),
  actual_amount DECIMAL(12,2), -- synced from Xero/financial_snapshots
  variance_amount DECIMAL(12,2) GENERATED ALWAYS AS (COALESCE(actual_amount, 0) - COALESCE(budget_amount, 0)) STORED,
  variance_pct DECIMAL(8,2) GENERATED ALWAYS AS (
    CASE
      WHEN COALESCE(budget_amount, 0) = 0 THEN NULL
      ELSE ((COALESCE(actual_amount, 0) - COALESCE(budget_amount, 0)) / ABS(budget_amount)) * 100
    END
  ) STORED,
  notes TEXT,
  last_synced_at TIMESTAMPTZ, -- when actuals were last synced from Xero
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_key, line_item_id, period_type, period_start)
);

-- Indexes for budget lookups
CREATE INDEX IF NOT EXISTS idx_cashflow_budgets_business ON cashflow_budgets(business_key);
CREATE INDEX IF NOT EXISTS idx_cashflow_budgets_period ON cashflow_budgets(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_cashflow_budgets_line_item ON cashflow_budgets(line_item_id);

-- 3. Cash scenarios for what-if modeling
CREATE TABLE IF NOT EXISTS cashflow_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key TEXT NOT NULL,
  name TEXT NOT NULL, -- 'Base Case', 'Conservative', 'Growth', etc.
  description TEXT,
  is_active BOOLEAN DEFAULT false, -- only one active per business
  starting_cash DECIMAL(12,2) DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  created_by TEXT, -- email of creator
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for scenario lookups
CREATE INDEX IF NOT EXISTS idx_cashflow_scenarios_business ON cashflow_scenarios(business_key);

-- 4. Scenario allocations (cash applied to specific items/periods)
CREATE TABLE IF NOT EXISTS cashflow_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES cashflow_scenarios(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES cashflow_line_items(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for allocation lookups
CREATE INDEX IF NOT EXISTS idx_cashflow_allocations_scenario ON cashflow_allocations(scenario_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_allocations_period ON cashflow_allocations(period_start);

-- 5. User preferences for the cash flow view
CREATE TABLE IF NOT EXISTS cashflow_user_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  default_period_type TEXT DEFAULT 'monthly',
  default_future_periods INT DEFAULT 3,
  default_business TEXT DEFAULT 'consolidated',
  expanded_categories JSONB DEFAULT '[]', -- array of line_item_ids that are expanded
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helper function to update timestamps
CREATE OR REPLACE FUNCTION update_cashflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_cashflow_line_items_updated ON cashflow_line_items;
CREATE TRIGGER trg_cashflow_line_items_updated
  BEFORE UPDATE ON cashflow_line_items
  FOR EACH ROW EXECUTE FUNCTION update_cashflow_updated_at();

DROP TRIGGER IF EXISTS trg_cashflow_budgets_updated ON cashflow_budgets;
CREATE TRIGGER trg_cashflow_budgets_updated
  BEFORE UPDATE ON cashflow_budgets
  FOR EACH ROW EXECUTE FUNCTION update_cashflow_updated_at();

DROP TRIGGER IF EXISTS trg_cashflow_scenarios_updated ON cashflow_scenarios;
CREATE TRIGGER trg_cashflow_scenarios_updated
  BEFORE UPDATE ON cashflow_scenarios
  FOR EACH ROW EXECUTE FUNCTION update_cashflow_updated_at();

DROP TRIGGER IF EXISTS trg_cashflow_user_prefs_updated ON cashflow_user_prefs;
CREATE TRIGGER trg_cashflow_user_prefs_updated
  BEFORE UPDATE ON cashflow_user_prefs
  FOR EACH ROW EXECUTE FUNCTION update_cashflow_updated_at();

-- Seed default line items for Teelixir and Elevate based on common P&L structure
-- These will be system items that map to Xero accounts

-- Teelixir default line items
INSERT INTO cashflow_line_items (business_key, name, item_type, sort_order, is_system) VALUES
  ('teelixir', 'Revenue', 'revenue', 100, true),
  ('teelixir', 'Cost of Goods Sold', 'cogs', 200, true),
  ('teelixir', 'Operating Expenses', 'expense', 300, true),
  ('teelixir', 'Custom Items', 'custom', 400, true)
ON CONFLICT DO NOTHING;

-- Elevate default line items
INSERT INTO cashflow_line_items (business_key, name, item_type, sort_order, is_system) VALUES
  ('elevate', 'Revenue', 'revenue', 100, true),
  ('elevate', 'Cost of Goods Sold', 'cogs', 200, true),
  ('elevate', 'Operating Expenses', 'expense', 300, true),
  ('elevate', 'Custom Items', 'custom', 400, true)
ON CONFLICT DO NOTHING;

-- Consolidated view line items
INSERT INTO cashflow_line_items (business_key, name, item_type, sort_order, is_system) VALUES
  ('consolidated', 'Revenue', 'revenue', 100, true),
  ('consolidated', 'Cost of Goods Sold', 'cogs', 200, true),
  ('consolidated', 'Operating Expenses', 'expense', 300, true),
  ('consolidated', 'Intercompany Eliminations', 'custom', 350, true),
  ('consolidated', 'Custom Items', 'custom', 400, true)
ON CONFLICT DO NOTHING;

-- Create default "Base Case" scenario for each business
INSERT INTO cashflow_scenarios (business_key, name, description, is_active, starting_cash) VALUES
  ('teelixir', 'Base Case', 'Default scenario based on current projections', true, 0),
  ('elevate', 'Base Case', 'Default scenario based on current projections', true, 0),
  ('consolidated', 'Base Case', 'Consolidated view of all businesses', true, 0)
ON CONFLICT DO NOTHING;

-- View for easy querying of budget data with line item info
CREATE OR REPLACE VIEW v_cashflow_budget_detail AS
SELECT
  b.id,
  b.business_key,
  b.period_type,
  b.period_start,
  b.budget_amount,
  b.actual_amount,
  b.variance_amount,
  b.variance_pct,
  b.notes,
  b.last_synced_at,
  li.id as line_item_id,
  li.name as line_item_name,
  li.parent_id,
  li.item_type,
  li.xero_account_code,
  li.sort_order,
  li.is_system,
  li.is_active
FROM cashflow_budgets b
JOIN cashflow_line_items li ON b.line_item_id = li.id
WHERE li.is_active = true;

-- RLS policies (if needed)
-- ALTER TABLE cashflow_line_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cashflow_budgets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cashflow_scenarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cashflow_allocations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE cashflow_line_items IS 'Hierarchical P&L line items for cash flow planning';
COMMENT ON TABLE cashflow_budgets IS 'Budget and actual values by period for each line item';
COMMENT ON TABLE cashflow_scenarios IS 'Named what-if scenarios for cash modeling';
COMMENT ON TABLE cashflow_allocations IS 'Cash allocations within scenarios';
COMMENT ON TABLE cashflow_user_prefs IS 'User preferences for cash flow view';
