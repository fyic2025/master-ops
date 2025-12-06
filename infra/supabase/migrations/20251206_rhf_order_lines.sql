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
