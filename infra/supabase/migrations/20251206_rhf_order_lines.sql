-- =============================================================================
-- RHF Order Lines Table
-- Stores individual line items for weekly supplier orders
-- =============================================================================

CREATE TABLE IF NOT EXISTS rhf_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES rhf_weekly_orders(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES rhf_supplier_products(id),

  -- Quantity and pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,

  -- Notes
  notes TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_order_lines_order ON rhf_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_rhf_order_lines_product ON rhf_order_lines(supplier_product_id);

-- Add unique constraint for supplier+week on weekly_orders
ALTER TABLE rhf_weekly_orders
  ADD CONSTRAINT rhf_weekly_orders_supplier_week_unique
  UNIQUE (supplier_id, week_start);

-- RLS
ALTER TABLE rhf_order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on rhf_order_lines" ON rhf_order_lines;
CREATE POLICY "Service role full access on rhf_order_lines" ON rhf_order_lines FOR ALL USING (true);

-- =============================================================================
-- Seed Box Types
-- Based on RHF product lineup
-- =============================================================================
INSERT INTO rhf_boxes (code, name, box_type, size, price, contents_type, is_active, sort_order) VALUES
  -- Main F&V boxes
  ('fruit_50', '$50 Fruit Box', 'fruit_veg', 'single', 50.00, 'variable', true, 1),
  ('veg_50', '$50 Veg Box', 'fruit_veg', 'single', 50.00, 'variable', true, 2),
  ('fv_50', '$50 Fruit & Veg Box', 'fruit_veg', 'single', 50.00, 'variable', true, 3),
  ('fv_80', '$80 Family Fruit & Veg Box', 'fruit_veg', 'family', 80.00, 'variable', true, 4),

  -- Salad
  ('salad', 'Salad Box', 'salad', 'single', 40.00, 'variable', true, 10),

  -- KETO
  ('keto_couple', 'KETO Greens Couple', 'keto', 'couple', 45.00, 'variable', true, 20),
  ('keto_family', 'KETO Greens Family', 'keto', 'family', 65.00, 'variable', true, 21),

  -- FODMAP
  ('fodmap_small', 'FODMAP Box Small', 'fodmap', 'single', 40.00, 'variable', true, 30),
  ('fodmap_medium', 'FODMAP Box Medium', 'fodmap', 'couple', 55.00, 'variable', true, 31),
  ('fodmap_large', 'FODMAP Box Large', 'fodmap', 'family', 70.00, 'variable', true, 32),

  -- Add-ons
  ('addon_fruit', 'Essential Fruit Add-on', 'addon', null, 25.00, 'variable', true, 40),
  ('addon_leafy', 'Leafy Greens Add-on', 'addon', null, 20.00, 'variable', true, 41),
  ('addon_veggie', 'Veggie Add-on', 'addon', null, 25.00, 'variable', true, 42)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  box_type = EXCLUDED.box_type,
  size = EXCLUDED.size,
  price = EXCLUDED.price,
  sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- Customer Tables for Reengagement
-- =============================================================================

-- Customers synced from WooCommerce
CREATE TABLE IF NOT EXISTS rhf_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_id INTEGER NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Address
  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,

  -- Stats
  order_count INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,

  -- RFM Scores (1-5, higher is better)
  rfm_recency INTEGER, -- Days since last order (inverted to score)
  rfm_frequency INTEGER, -- Order count score
  rfm_monetary INTEGER, -- Total spent score
  rfm_score INTEGER, -- Combined score (R+F+M)

  -- Segmentation
  customer_segment TEXT, -- 'champions', 'loyal', 'at_risk', 'lost', 'new'
  days_since_order INTEGER,

  -- Dates
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,

  -- Sync
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_customers_email ON rhf_customers(email);
CREATE INDEX IF NOT EXISTS idx_rhf_customers_segment ON rhf_customers(customer_segment);
CREATE INDEX IF NOT EXISTS idx_rhf_customers_days_since ON rhf_customers(days_since_order);
CREATE INDEX IF NOT EXISTS idx_rhf_customers_rfm ON rhf_customers(rfm_score);

-- Orders synced from WooCommerce
CREATE TABLE IF NOT EXISTS rhf_woo_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_id INTEGER NOT NULL UNIQUE,
  customer_id UUID REFERENCES rhf_customers(id),
  woo_customer_id INTEGER,

  -- Order details
  status TEXT,
  total DECIMAL(12,2),
  subtotal DECIMAL(12,2),
  shipping_total DECIMAL(10,2),

  -- Dates
  date_created TIMESTAMPTZ,
  date_completed TIMESTAMPTZ,

  -- Items summary
  line_items JSONB,
  item_count INTEGER,

  -- Delivery
  shipping_address JSONB,

  -- Sync
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_woo_orders_customer ON rhf_woo_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_rhf_woo_orders_date ON rhf_woo_orders(date_created);
CREATE INDEX IF NOT EXISTS idx_rhf_woo_orders_status ON rhf_woo_orders(status);

-- RLS
ALTER TABLE rhf_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_woo_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on rhf_customers" ON rhf_customers;
CREATE POLICY "Service role full access on rhf_customers" ON rhf_customers FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access on rhf_woo_orders" ON rhf_woo_orders;
CREATE POLICY "Service role full access on rhf_woo_orders" ON rhf_woo_orders FOR ALL USING (true);

-- Function to calculate RFM scores
CREATE OR REPLACE FUNCTION rhf_calculate_rfm()
RETURNS void AS $$
DECLARE
  max_days INTEGER;
  max_orders INTEGER;
  max_spent DECIMAL;
BEGIN
  -- Get max values for normalization
  SELECT
    COALESCE(MAX(days_since_order), 1),
    COALESCE(MAX(order_count), 1),
    COALESCE(MAX(total_spent), 1)
  INTO max_days, max_orders, max_spent
  FROM rhf_customers
  WHERE days_since_order IS NOT NULL;

  -- Update RFM scores (1-5 scale)
  UPDATE rhf_customers SET
    -- Recency: inverse (fewer days = higher score)
    rfm_recency = CASE
      WHEN days_since_order <= 7 THEN 5
      WHEN days_since_order <= 14 THEN 4
      WHEN days_since_order <= 30 THEN 3
      WHEN days_since_order <= 60 THEN 2
      ELSE 1
    END,
    -- Frequency
    rfm_frequency = CASE
      WHEN order_count >= 10 THEN 5
      WHEN order_count >= 5 THEN 4
      WHEN order_count >= 3 THEN 3
      WHEN order_count >= 2 THEN 2
      ELSE 1
    END,
    -- Monetary
    rfm_monetary = CASE
      WHEN total_spent >= 500 THEN 5
      WHEN total_spent >= 300 THEN 4
      WHEN total_spent >= 150 THEN 3
      WHEN total_spent >= 75 THEN 2
      ELSE 1
    END,
    -- Segment based on RFM
    customer_segment = CASE
      WHEN days_since_order <= 14 AND order_count >= 5 THEN 'champions'
      WHEN days_since_order <= 30 AND order_count >= 3 THEN 'loyal'
      WHEN days_since_order <= 7 AND order_count = 1 THEN 'new'
      WHEN days_since_order BETWEEN 30 AND 60 THEN 'at_risk'
      WHEN days_since_order > 60 THEN 'lost'
      ELSE 'regular'
    END
  WHERE last_order_date IS NOT NULL;

  -- Update combined score
  UPDATE rhf_customers SET
    rfm_score = COALESCE(rfm_recency, 0) + COALESCE(rfm_frequency, 0) + COALESCE(rfm_monetary, 0)
  WHERE last_order_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
