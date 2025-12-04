-- Unleashed Orders - Local storage for order management
-- Allows editing orders locally, then sync to Unleashed via delete/recreate

-- Main orders table
CREATE TABLE IF NOT EXISTS unleashed_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL DEFAULT 'teelixir', -- teelixir or elevate

  -- Unleashed identifiers
  unleashed_guid TEXT UNIQUE,
  order_number TEXT NOT NULL,

  -- Order details
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  required_date TIMESTAMPTZ,
  order_status TEXT NOT NULL DEFAULT 'Parked', -- Open, Parked, Placed, Completed, Deleted

  -- Customer
  customer_code TEXT NOT NULL,
  customer_name TEXT,
  customer_guid TEXT,

  -- Delivery
  delivery_name TEXT,
  delivery_address1 TEXT,
  delivery_address2 TEXT,
  delivery_suburb TEXT,
  delivery_city TEXT,
  delivery_region TEXT,
  delivery_country TEXT,
  delivery_postcode TEXT,
  delivery_contact_name TEXT,
  delivery_contact_email TEXT,
  delivery_contact_phone TEXT,

  -- Financials
  currency_code TEXT DEFAULT 'AUD',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  tax_code TEXT DEFAULT 'NONE',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_total DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,

  -- Metadata
  comments TEXT,
  warehouse_code TEXT DEFAULT 'W1',
  warehouse_guid TEXT,
  external_reference TEXT, -- e.g., Shopify order ID

  -- Sync tracking
  synced_at TIMESTAMPTZ, -- Last time pushed to Unleashed
  sync_status TEXT DEFAULT 'pending', -- pending, synced, error
  sync_error TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  CONSTRAINT valid_store CHECK (store IN ('teelixir', 'elevate')),
  CONSTRAINT valid_status CHECK (order_status IN ('Open', 'Parked', 'Placed', 'Completed', 'Deleted'))
);

-- Order line items
CREATE TABLE IF NOT EXISTS unleashed_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES unleashed_orders(id) ON DELETE CASCADE,

  -- Unleashed identifiers
  line_guid TEXT,
  line_number INT,

  -- Product
  product_code TEXT NOT NULL,
  product_guid TEXT,
  product_description TEXT,

  -- Quantities & Pricing
  order_quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,4) NOT NULL,
  discount_rate DECIMAL(5,4) DEFAULT 0,
  line_total DECIMAL(10,2),

  -- Optional
  comments TEXT,
  due_date TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unleashed_orders_store ON unleashed_orders(store);
CREATE INDEX IF NOT EXISTS idx_unleashed_orders_order_number ON unleashed_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_unleashed_orders_customer ON unleashed_orders(customer_code);
CREATE INDEX IF NOT EXISTS idx_unleashed_orders_status ON unleashed_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_unleashed_orders_sync_status ON unleashed_orders(sync_status);
CREATE INDEX IF NOT EXISTS idx_unleashed_order_lines_order ON unleashed_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_unleashed_order_lines_product ON unleashed_order_lines(product_code);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_unleashed_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_unleashed_orders_timestamp ON unleashed_orders;
CREATE TRIGGER update_unleashed_orders_timestamp
  BEFORE UPDATE ON unleashed_orders
  FOR EACH ROW EXECUTE FUNCTION update_unleashed_orders_timestamp();

DROP TRIGGER IF EXISTS update_unleashed_order_lines_timestamp ON unleashed_order_lines;
CREATE TRIGGER update_unleashed_order_lines_timestamp
  BEFORE UPDATE ON unleashed_order_lines
  FOR EACH ROW EXECUTE FUNCTION update_unleashed_orders_timestamp();

-- RLS Policies
ALTER TABLE unleashed_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE unleashed_order_lines ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access orders" ON unleashed_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access lines" ON unleashed_order_lines
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated read
CREATE POLICY "Authenticated read orders" ON unleashed_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read lines" ON unleashed_order_lines
  FOR SELECT TO authenticated USING (true);

-- View for orders with line count and total
CREATE OR REPLACE VIEW unleashed_orders_summary AS
SELECT
  o.*,
  COUNT(l.id) as line_count,
  COALESCE(SUM(l.line_total), 0) as calculated_total
FROM unleashed_orders o
LEFT JOIN unleashed_order_lines l ON l.order_id = o.id
GROUP BY o.id;

COMMENT ON TABLE unleashed_orders IS 'Local storage for Unleashed sales orders - edit here, then sync to Unleashed';
COMMENT ON TABLE unleashed_order_lines IS 'Line items for Unleashed orders';
