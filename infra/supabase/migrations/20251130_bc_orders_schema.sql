-- =============================================================================
-- BigCommerce Orders Schema for BOO
-- =============================================================================
-- Stores BC order data for customer context in LiveChat and reporting
-- =============================================================================

-- Drop if exists for clean install
DROP TABLE IF EXISTS bc_orders CASCADE;

-- =============================================================================
-- Orders Table
-- =============================================================================
CREATE TABLE bc_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- BigCommerce IDs
  bc_order_id INTEGER NOT NULL UNIQUE,
  customer_id INTEGER,

  -- Customer info (denormalized for easy joins)
  customer_email TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,

  -- Order details
  date_created TIMESTAMPTZ NOT NULL,
  date_modified TIMESTAMPTZ,
  date_shipped TIMESTAMPTZ,

  -- Status
  status TEXT,
  status_id INTEGER,
  payment_status TEXT,

  -- Amounts (in AUD)
  subtotal_inc_tax NUMERIC(10,2),
  subtotal_ex_tax NUMERIC(10,2),
  shipping_cost_inc_tax NUMERIC(10,2),
  total_inc_tax NUMERIC(10,2),
  total_ex_tax NUMERIC(10,2),
  discount_amount NUMERIC(10,2),
  refunded_amount NUMERIC(10,2),

  -- Item counts
  items_total INTEGER,
  items_shipped INTEGER,

  -- Payment
  payment_method TEXT,

  -- Source
  order_source TEXT,
  channel_id INTEGER,

  -- Location
  billing_country TEXT,
  billing_state TEXT,
  billing_city TEXT,
  billing_postcode TEXT,
  shipping_country TEXT,
  shipping_state TEXT,
  shipping_city TEXT,
  shipping_postcode TEXT,

  -- Other
  staff_notes TEXT,
  customer_message TEXT,
  currency_code TEXT DEFAULT 'AUD',

  -- Sync tracking
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================
CREATE INDEX idx_bc_orders_bc_id ON bc_orders(bc_order_id);
CREATE INDEX idx_bc_orders_customer_id ON bc_orders(customer_id);
CREATE INDEX idx_bc_orders_customer_email ON bc_orders(customer_email);
CREATE INDEX idx_bc_orders_date_created ON bc_orders(date_created DESC);
CREATE INDEX idx_bc_orders_status ON bc_orders(status);
CREATE INDEX idx_bc_orders_total ON bc_orders(total_inc_tax DESC);

-- Index for email lookups (case insensitive)
CREATE INDEX idx_bc_orders_email_lower ON bc_orders(LOWER(customer_email));

-- =============================================================================
-- Automatic Updated At Trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION update_bc_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bc_orders_updated_at_trigger
  BEFORE UPDATE ON bc_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_bc_orders_updated_at();

-- =============================================================================
-- Helper Views
-- =============================================================================

-- View: Customer lifetime value summary
CREATE OR REPLACE VIEW bc_customer_summary AS
SELECT
  LOWER(customer_email) as email,
  customer_id,
  MAX(customer_first_name) as first_name,
  MAX(customer_last_name) as last_name,
  COUNT(*) as order_count,
  SUM(total_inc_tax) as lifetime_value,
  MAX(date_created) as last_order_date,
  MIN(date_created) as first_order_date,
  AVG(total_inc_tax) as avg_order_value
FROM bc_orders
WHERE customer_email IS NOT NULL
GROUP BY LOWER(customer_email), customer_id;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================
ALTER TABLE bc_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY bc_orders_service_policy ON bc_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY bc_orders_read_policy ON bc_orders
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- Grants
-- =============================================================================
GRANT ALL ON bc_orders TO service_role, postgres;
GRANT SELECT ON bc_orders TO authenticated;
GRANT SELECT ON bc_customer_summary TO service_role, authenticated;

COMMENT ON TABLE bc_orders IS 'BigCommerce orders from Buy Organics Online';
