-- ============================================================================
-- RHF Operational System - Supplier Matching, Stock Planning, Orders
-- Created: 2025-12-06
-- Purpose: Supplier pricelist processing, SKU matching, weekly order generation
-- ============================================================================

-- =============================================================================
-- SUPPLIERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Supplier details
  code TEXT NOT NULL UNIQUE, -- 'poh', 'melba', 'ogg', 'bdm'
  name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Pricelist settings
  pricelist_frequency TEXT DEFAULT '2x_week', -- '2x_week', 'weekly', 'as_needed'
  pricelist_format TEXT DEFAULT 'xlsx', -- 'xlsx', 'csv', 'email_body'
  pricelist_sender_email TEXT, -- Email address that sends pricelists

  -- Delivery settings
  delivery_days TEXT[], -- ['monday', 'thursday']
  lead_time_hours INTEGER DEFAULT 24, -- Hours between order and delivery

  -- Ordering
  order_type TEXT DEFAULT 'incoming', -- 'incoming' (we order from them), 'outgoing' (we send to them like BDM dairy)
  minimum_order DECIMAL(10,2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE, -- Primary supplier flag

  -- Contact
  contact_name TEXT,
  contact_phone TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_suppliers_active ON rhf_suppliers(is_active);

-- =============================================================================
-- SUPPLIER PRICELISTS (parsed from email attachments)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_pricelists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES rhf_suppliers(id) ON DELETE CASCADE,

  -- Source
  source_email_id TEXT, -- Gmail message ID
  source_email_date TIMESTAMPTZ,
  source_filename TEXT,

  -- Validity
  valid_from DATE NOT NULL,
  valid_until DATE,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'parsed', 'active', 'expired'

  -- Parsing
  parsed_at TIMESTAMPTZ,
  item_count INTEGER DEFAULT 0,
  parse_errors JSONB DEFAULT '[]',

  -- Raw data
  raw_data JSONB, -- Original parsed data for debugging

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_pricelists_supplier ON rhf_pricelists(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rhf_pricelists_status ON rhf_pricelists(status);
CREATE INDEX IF NOT EXISTS idx_rhf_pricelists_valid ON rhf_pricelists(valid_from, valid_until);

-- =============================================================================
-- SUPPLIER PRODUCTS (items from pricelists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES rhf_suppliers(id) ON DELETE CASCADE,
  pricelist_id UUID REFERENCES rhf_pricelists(id) ON DELETE SET NULL,

  -- Product identification
  supplier_code TEXT, -- Supplier's internal code if provided
  name TEXT NOT NULL,
  description TEXT,

  -- Categorization
  category TEXT, -- 'fruit', 'vegetable', 'dairy', 'eggs', 'pantry', 'meat', 'bakery'
  subcategory TEXT,

  -- Unit/Size
  unit TEXT DEFAULT 'each', -- 'each', 'kg', 'bunch', 'punnet', 'box', 'pack'
  unit_size TEXT, -- '1kg', '500g', '6 pack'
  pack_size INTEGER DEFAULT 1, -- How many units per pack

  -- Pricing
  cost_price DECIMAL(10,2) NOT NULL,
  rrp DECIMAL(10,2), -- Recommended retail price if provided

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  quality_days INTEGER, -- Shelf life from delivery

  -- Organic/Certification
  is_organic BOOLEAN DEFAULT FALSE,
  is_biodynamic BOOLEAN DEFAULT FALSE,
  certifications TEXT[],

  -- Origin
  origin_region TEXT, -- 'Mornington Peninsula', 'Victoria', 'NSW'
  origin_country TEXT DEFAULT 'AU',

  -- Tracking
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  times_seen INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(supplier_id, name, unit)
);

CREATE INDEX IF NOT EXISTS idx_rhf_sp_supplier ON rhf_supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rhf_sp_category ON rhf_supplier_products(category);
CREATE INDEX IF NOT EXISTS idx_rhf_sp_available ON rhf_supplier_products(is_available);
CREATE INDEX IF NOT EXISTS idx_rhf_sp_name ON rhf_supplier_products(name);

-- =============================================================================
-- WOOCOMMERCE PRODUCTS (synced from WooCommerce)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_woo_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WooCommerce identifiers
  woo_id INTEGER NOT NULL UNIQUE,
  sku TEXT,

  -- Product details
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  short_description TEXT,

  -- Type
  product_type TEXT DEFAULT 'simple', -- 'simple', 'variable', 'bundle'

  -- Status
  status TEXT DEFAULT 'publish', -- 'publish', 'draft', 'private'
  stock_status TEXT DEFAULT 'instock', -- 'instock', 'outofstock', 'onbackorder'

  -- Pricing
  price DECIMAL(10,2),
  regular_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),

  -- Category
  category_ids INTEGER[],
  category_names TEXT[],

  -- Tags
  tags TEXT[],

  -- Image
  image_url TEXT,

  -- Inventory
  manage_stock BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER,

  -- Perishable settings (custom for RHF)
  shelf_life_days INTEGER, -- How many days this product lasts
  shelf_life_category TEXT, -- 'highly_perishable' (1 week), 'perishable' (2-3 weeks), 'shelf_stable'

  -- Metadata
  metadata JSONB DEFAULT '{}',

  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_woo_sku ON rhf_woo_products(sku);
CREATE INDEX IF NOT EXISTS idx_rhf_woo_status ON rhf_woo_products(status);
CREATE INDEX IF NOT EXISTS idx_rhf_woo_shelf_life ON rhf_woo_products(shelf_life_category);

-- =============================================================================
-- PRODUCT MAPPINGS (supplier products → WooCommerce products)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  woo_product_id UUID NOT NULL REFERENCES rhf_woo_products(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES rhf_supplier_products(id) ON DELETE CASCADE,

  -- Priority
  is_primary BOOLEAN DEFAULT FALSE, -- Primary supplier for this product
  priority INTEGER DEFAULT 0, -- Lower = higher priority

  -- Conversion
  supplier_qty_per_woo_unit DECIMAL(10,4) DEFAULT 1, -- e.g., 2 supplier units = 1 woo unit

  -- Notes
  notes TEXT,

  -- Tracking
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(woo_product_id, supplier_product_id)
);

CREATE INDEX IF NOT EXISTS idx_rhf_pm_woo ON rhf_product_mappings(woo_product_id);
CREATE INDEX IF NOT EXISTS idx_rhf_pm_supplier ON rhf_product_mappings(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_rhf_pm_primary ON rhf_product_mappings(woo_product_id, is_primary) WHERE is_primary = TRUE;

-- =============================================================================
-- BOX TYPES
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Box identification
  code TEXT NOT NULL UNIQUE, -- 'fruit_50', 'fv_50', 'family_fv_80', 'keto_couple'
  name TEXT NOT NULL, -- '$50 Fruit Box', '$50 F&V Box'

  -- Type
  box_type TEXT NOT NULL, -- 'fruit_veg', 'salad', 'keto', 'fodmap', 'addon'
  size TEXT, -- 'single', 'couple', 'family'

  -- Pricing
  price DECIMAL(10,2) NOT NULL,

  -- WooCommerce
  woo_product_id INTEGER, -- Linked WooCommerce product

  -- Contents specification (how box contents are calculated)
  contents_type TEXT DEFAULT 'variable', -- 'fixed', 'variable' (seasonal)
  contents_formula JSONB, -- Rules for variable boxes, e.g., {"fruit_items": 5, "veg_items": 8}

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_subscription BOOLEAN DEFAULT FALSE,

  -- Display
  sort_order INTEGER DEFAULT 0,
  description TEXT,

  -- Sheet reference
  sheet_tab_name TEXT, -- Tab name in Google Sheet

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_boxes_type ON rhf_boxes(box_type);
CREATE INDEX IF NOT EXISTS idx_rhf_boxes_active ON rhf_boxes(is_active);

-- =============================================================================
-- BOX CONTENTS (items in a box for a specific week)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_box_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID NOT NULL REFERENCES rhf_boxes(id) ON DELETE CASCADE,

  -- Week
  week_start DATE NOT NULL, -- Monday of the week

  -- Content item
  woo_product_id UUID REFERENCES rhf_woo_products(id) ON DELETE SET NULL,
  supplier_product_id UUID REFERENCES rhf_supplier_products(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL, -- Denormalized for history

  -- Quantity
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'each',

  -- Costs
  cost_per_unit DECIMAL(10,2),
  total_cost DECIMAL(10,2),

  -- Source supplier
  supplier_id UUID REFERENCES rhf_suppliers(id),

  -- Substitution
  is_substitute BOOLEAN DEFAULT FALSE,
  original_item_name TEXT, -- What was planned but substituted

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(box_id, week_start, item_name)
);

CREATE INDEX IF NOT EXISTS idx_rhf_bc_box ON rhf_box_contents(box_id);
CREATE INDEX IF NOT EXISTS idx_rhf_bc_week ON rhf_box_contents(week_start);

-- =============================================================================
-- WEEKLY ORDERS (aggregated orders to suppliers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_weekly_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES rhf_suppliers(id) ON DELETE CASCADE,

  -- Week
  week_start DATE NOT NULL, -- Monday of the week
  delivery_date DATE,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'pending', 'submitted', 'confirmed', 'received', 'cancelled'

  -- Totals
  subtotal DECIMAL(12,2) DEFAULT 0,
  gst DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,

  -- Item count
  line_count INTEGER DEFAULT 0,

  -- Reference
  order_reference TEXT, -- Supplier's reference number

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(supplier_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_rhf_wo_supplier ON rhf_weekly_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rhf_wo_week ON rhf_weekly_orders(week_start);
CREATE INDEX IF NOT EXISTS idx_rhf_wo_status ON rhf_weekly_orders(status);

-- =============================================================================
-- WEEKLY ORDER LINES (individual items in weekly order)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_weekly_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_order_id UUID NOT NULL REFERENCES rhf_weekly_orders(id) ON DELETE CASCADE,

  -- Product
  supplier_product_id UUID REFERENCES rhf_supplier_products(id),
  product_name TEXT NOT NULL, -- Denormalized

  -- Quantities
  quantity_needed DECIMAL(10,2) NOT NULL, -- Calculated from boxes + custom orders
  quantity_in_stock DECIMAL(10,2) DEFAULT 0, -- Existing stock to subtract
  quantity_to_order DECIMAL(10,2) NOT NULL, -- Final order quantity
  quantity_received DECIMAL(10,2) DEFAULT 0,

  -- Unit
  unit TEXT DEFAULT 'each',

  -- Pricing
  unit_cost DECIMAL(10,2),
  line_total DECIMAL(10,2),

  -- Source breakdown (what drove this order)
  source_breakdown JSONB, -- {"box_fruit_50": 10, "box_fv_80": 5, "custom_orders": 3}

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_wol_order ON rhf_weekly_order_lines(weekly_order_id);
CREATE INDEX IF NOT EXISTS idx_rhf_wol_product ON rhf_weekly_order_lines(supplier_product_id);

-- =============================================================================
-- CUSTOM ORDERS (one-off orders beyond standard boxes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_custom_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Week
  week_start DATE NOT NULL,

  -- Source
  woo_order_id INTEGER, -- WooCommerce order if applicable
  customer_name TEXT,

  -- Item
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'each',

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'included', 'fulfilled', 'cancelled'

  -- Linked to order line
  order_line_id UUID REFERENCES rhf_weekly_order_lines(id),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_co_week ON rhf_custom_orders(week_start);
CREATE INDEX IF NOT EXISTS idx_rhf_co_status ON rhf_custom_orders(status);

-- =============================================================================
-- STOCK LEVELS (current inventory for existing stock tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product reference (can be either)
  woo_product_id UUID REFERENCES rhf_woo_products(id) ON DELETE CASCADE,
  supplier_product_id UUID REFERENCES rhf_supplier_products(id) ON DELETE CASCADE,

  product_name TEXT NOT NULL, -- Denormalized

  -- Stock
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'each',

  -- Dates
  received_date DATE,
  expiry_date DATE,

  -- Status
  status TEXT DEFAULT 'available', -- 'available', 'reserved', 'expired', 'written_off'

  -- Location
  storage_location TEXT, -- 'coolroom_1', 'dry_store'

  -- Notes
  notes TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (woo_product_id IS NOT NULL OR supplier_product_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_rhf_sl_woo ON rhf_stock_levels(woo_product_id);
CREATE INDEX IF NOT EXISTS idx_rhf_sl_supplier ON rhf_stock_levels(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_rhf_sl_expiry ON rhf_stock_levels(expiry_date);
CREATE INDEX IF NOT EXISTS idx_rhf_sl_status ON rhf_stock_levels(status);

-- =============================================================================
-- MARGIN ANALYSIS (cost vs selling price)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_margins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  woo_product_id UUID NOT NULL REFERENCES rhf_woo_products(id) ON DELETE CASCADE,

  -- Pricing
  selling_price DECIMAL(10,2) NOT NULL,

  -- Costs from suppliers
  primary_supplier_id UUID REFERENCES rhf_suppliers(id),
  primary_cost DECIMAL(10,2),
  lowest_cost DECIMAL(10,2),

  -- Margin calculation
  margin_amount DECIMAL(10,2),
  margin_percent DECIMAL(5,2),

  -- Flags
  is_low_margin BOOLEAN DEFAULT FALSE, -- Below threshold
  margin_threshold DECIMAL(5,2) DEFAULT 25.00, -- Alert if below this %

  -- Last calculated
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_margins_woo ON rhf_margins(woo_product_id);
CREATE INDEX IF NOT EXISTS idx_rhf_margins_low ON rhf_margins(is_low_margin) WHERE is_low_margin = TRUE;

-- =============================================================================
-- GMAIL SYNC LOG (track email processing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rhf_gmail_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email details
  message_id TEXT NOT NULL UNIQUE, -- Gmail message ID
  thread_id TEXT,

  -- From
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ NOT NULL,

  -- Processing
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'skipped', 'failed'
  processed_at TIMESTAMPTZ,

  -- Matched supplier
  supplier_id UUID REFERENCES rhf_suppliers(id),

  -- Attachments
  attachment_count INTEGER DEFAULT 0,
  attachments_processed JSONB DEFAULT '[]', -- [{filename, status, pricelist_id}]

  -- Errors
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rhf_gmail_message ON rhf_gmail_sync_log(message_id);
CREATE INDEX IF NOT EXISTS idx_rhf_gmail_status ON rhf_gmail_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_rhf_gmail_supplier ON rhf_gmail_sync_log(supplier_id);
CREATE INDEX IF NOT EXISTS idx_rhf_gmail_date ON rhf_gmail_sync_log(received_at DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Unmapped supplier products (need manual matching)
CREATE OR REPLACE VIEW v_rhf_unmapped_products AS
SELECT
  sp.id,
  sp.name,
  sp.category,
  sp.unit,
  sp.cost_price,
  sp.is_available,
  s.name as supplier_name,
  s.code as supplier_code,
  sp.last_seen_at,
  sp.times_seen
FROM rhf_supplier_products sp
JOIN rhf_suppliers s ON sp.supplier_id = s.id
LEFT JOIN rhf_product_mappings pm ON sp.id = pm.supplier_product_id
WHERE pm.id IS NULL
  AND sp.is_available = TRUE
ORDER BY sp.times_seen DESC, sp.last_seen_at DESC;

-- Product margin overview
CREATE OR REPLACE VIEW v_rhf_margin_overview AS
SELECT
  wp.id as woo_product_id,
  wp.name,
  wp.sku,
  wp.price as selling_price,
  m.primary_cost,
  m.lowest_cost,
  m.margin_amount,
  m.margin_percent,
  m.is_low_margin,
  ps.name as primary_supplier,
  m.calculated_at
FROM rhf_woo_products wp
LEFT JOIN rhf_margins m ON wp.id = m.woo_product_id
LEFT JOIN rhf_suppliers ps ON m.primary_supplier_id = ps.id
WHERE wp.status = 'publish'
ORDER BY m.margin_percent ASC NULLS FIRST;

-- Weekly order summary
CREATE OR REPLACE VIEW v_rhf_weekly_order_summary AS
SELECT
  wo.week_start,
  s.name as supplier_name,
  wo.status,
  wo.line_count,
  wo.subtotal,
  wo.total,
  wo.submitted_at,
  wo.delivery_date
FROM rhf_weekly_orders wo
JOIN rhf_suppliers s ON wo.supplier_id = s.id
ORDER BY wo.week_start DESC, s.name;

-- Box cost analysis
CREATE OR REPLACE VIEW v_rhf_box_costs AS
SELECT
  b.name as box_name,
  b.price as box_price,
  bc.week_start,
  COUNT(*) as item_count,
  SUM(bc.total_cost) as total_cost,
  b.price - SUM(bc.total_cost) as margin,
  ROUND((b.price - SUM(bc.total_cost)) / b.price * 100, 2) as margin_percent
FROM rhf_boxes b
JOIN rhf_box_contents bc ON b.id = bc.box_id
GROUP BY b.id, b.name, b.price, bc.week_start
ORDER BY bc.week_start DESC, b.name;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate margin for a product
CREATE OR REPLACE FUNCTION rhf_calculate_margin(p_woo_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_selling_price DECIMAL(10,2);
  v_primary_supplier_id UUID;
  v_primary_cost DECIMAL(10,2);
  v_lowest_cost DECIMAL(10,2);
  v_margin_amount DECIMAL(10,2);
  v_margin_percent DECIMAL(5,2);
BEGIN
  -- Get selling price
  SELECT price INTO v_selling_price
  FROM rhf_woo_products WHERE id = p_woo_product_id;

  -- Get primary supplier cost
  SELECT sp.cost_price, pm.supplier_product_id, s.id
  INTO v_primary_cost, v_primary_supplier_id
  FROM rhf_product_mappings pm
  JOIN rhf_supplier_products sp ON pm.supplier_product_id = sp.id
  JOIN rhf_suppliers s ON sp.supplier_id = s.id
  WHERE pm.woo_product_id = p_woo_product_id
    AND pm.is_primary = TRUE
    AND sp.is_available = TRUE
  LIMIT 1;

  -- Get lowest cost from any supplier
  SELECT MIN(sp.cost_price) INTO v_lowest_cost
  FROM rhf_product_mappings pm
  JOIN rhf_supplier_products sp ON pm.supplier_product_id = sp.id
  WHERE pm.woo_product_id = p_woo_product_id
    AND sp.is_available = TRUE;

  -- Calculate margin
  v_margin_amount := v_selling_price - COALESCE(v_primary_cost, v_lowest_cost, 0);
  v_margin_percent := CASE
    WHEN v_selling_price > 0 THEN (v_margin_amount / v_selling_price * 100)
    ELSE 0
  END;

  -- Upsert margin record
  INSERT INTO rhf_margins (
    woo_product_id, selling_price, primary_supplier_id, primary_cost,
    lowest_cost, margin_amount, margin_percent, is_low_margin, calculated_at
  ) VALUES (
    p_woo_product_id, v_selling_price, v_primary_supplier_id, v_primary_cost,
    v_lowest_cost, v_margin_amount, v_margin_percent,
    v_margin_percent < 25, NOW()
  )
  ON CONFLICT (woo_product_id) DO UPDATE SET
    selling_price = EXCLUDED.selling_price,
    primary_supplier_id = EXCLUDED.primary_supplier_id,
    primary_cost = EXCLUDED.primary_cost,
    lowest_cost = EXCLUDED.lowest_cost,
    margin_amount = EXCLUDED.margin_amount,
    margin_percent = EXCLUDED.margin_percent,
    is_low_margin = EXCLUDED.is_low_margin,
    calculated_at = NOW(),
    updated_at = NOW();
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION rhf_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_rhf_suppliers_updated BEFORE UPDATE ON rhf_suppliers FOR EACH ROW EXECUTE FUNCTION rhf_update_updated_at();
CREATE TRIGGER tr_rhf_supplier_products_updated BEFORE UPDATE ON rhf_supplier_products FOR EACH ROW EXECUTE FUNCTION rhf_update_updated_at();
CREATE TRIGGER tr_rhf_woo_products_updated BEFORE UPDATE ON rhf_woo_products FOR EACH ROW EXECUTE FUNCTION rhf_update_updated_at();
CREATE TRIGGER tr_rhf_boxes_updated BEFORE UPDATE ON rhf_boxes FOR EACH ROW EXECUTE FUNCTION rhf_update_updated_at();
CREATE TRIGGER tr_rhf_weekly_orders_updated BEFORE UPDATE ON rhf_weekly_orders FOR EACH ROW EXECUTE FUNCTION rhf_update_updated_at();
CREATE TRIGGER tr_rhf_stock_levels_updated BEFORE UPDATE ON rhf_stock_levels FOR EACH ROW EXECUTE FUNCTION rhf_update_updated_at();
CREATE TRIGGER tr_rhf_margins_updated BEFORE UPDATE ON rhf_margins FOR EACH ROW EXECUTE FUNCTION rhf_update_updated_at();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE rhf_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_pricelists ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_woo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_box_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_weekly_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_weekly_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_margins ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_gmail_sync_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON rhf_suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_pricelists FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_supplier_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_woo_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_product_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_boxes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_box_contents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_weekly_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_weekly_order_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_custom_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_stock_levels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_margins FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON rhf_gmail_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon read access (for dashboard)
CREATE POLICY "Anon read access" ON rhf_suppliers FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_pricelists FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_supplier_products FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_woo_products FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_product_mappings FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_boxes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_box_contents FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_weekly_orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_weekly_order_lines FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_custom_orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_stock_levels FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_margins FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read access" ON rhf_gmail_sync_log FOR SELECT TO anon USING (true);

-- =============================================================================
-- SEED DATA - Suppliers
-- =============================================================================
INSERT INTO rhf_suppliers (code, name, email, pricelist_sender_email, pricelist_format, delivery_days, is_primary, notes)
VALUES
  ('poh', 'Pure Organic Harvest', 'orders@pureorganicharvest.com.au', 'orders@pureorganicharvest.com.au', 'xlsx', ARRAY['tuesday', 'friday'], TRUE, 'Main supplier for produce'),
  ('melba', 'Melba Fresh Organics', 'organics@mforganics.com.au', 'organics@mforganics.com.au', 'xlsx', ARRAY['tuesday', 'friday'], FALSE, 'Equal second supplier'),
  ('ogg', 'Organic Growers Group', 'sales@organicgrowersgroup.com.au', 'sales@organicgrowersgroup.com.au', 'xlsx', ARRAY['monday', 'thursday'], FALSE, 'Least used supplier'),
  ('bdm', 'Market BioDynamic', 'market@biodynamic.com.au', 'market@biodynamic.com.au', 'xlsx', ARRAY['tuesday', 'friday'], FALSE, 'F&V + milk - also receives outgoing dairy/drygoods order from us')
ON CONFLICT (code) DO UPDATE SET
  email = EXCLUDED.email,
  pricelist_sender_email = EXCLUDED.pricelist_sender_email;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE rhf_suppliers IS 'RHF produce suppliers (4 total)';
COMMENT ON TABLE rhf_pricelists IS 'Parsed pricelists from supplier emails';
COMMENT ON TABLE rhf_supplier_products IS 'Products available from suppliers (from pricelists)';
COMMENT ON TABLE rhf_woo_products IS 'RHF WooCommerce products synced from store';
COMMENT ON TABLE rhf_product_mappings IS 'Links supplier products to WooCommerce SKUs';
COMMENT ON TABLE rhf_boxes IS 'Box types sold by RHF (13 types)';
COMMENT ON TABLE rhf_box_contents IS 'Items in each box for a specific week';
COMMENT ON TABLE rhf_weekly_orders IS 'Aggregated weekly orders to suppliers';
COMMENT ON TABLE rhf_weekly_order_lines IS 'Line items in weekly orders';
COMMENT ON TABLE rhf_custom_orders IS 'One-off custom orders from customers';
COMMENT ON TABLE rhf_stock_levels IS 'Current inventory levels';
COMMENT ON TABLE rhf_margins IS 'Product margin analysis (cost vs selling price)';
COMMENT ON TABLE rhf_gmail_sync_log IS 'Log of processed emails from Gmail';
