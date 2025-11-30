-- Teelixir Distributor Intelligence Schema
-- Created: 2025-11-30
-- Purpose: Track distributor orders, products, and OOS notes from Unleashed

-- =============================================================================
-- PRODUCT GROUPS (for grouping SKU variants like Lions Mane 50g/100g/250g)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT UNIQUE NOT NULL,              -- 'LIONS_MANE', 'REISHI', 'CHAGA'
  group_name TEXT NOT NULL,                     -- 'Lions Mane Extract'
  category TEXT,                                -- 'Mushroom Extracts', 'Blends'
  display_order INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PRODUCTS (all Teelixir SKUs from Unleashed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unleashed_guid TEXT UNIQUE,
  product_code TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_group_id UUID REFERENCES tlx_product_groups(id),

  -- Size/variant parsed from name
  size_value DECIMAL(10,2),                     -- 50, 100, 250
  size_unit TEXT,                               -- 'g', 'ml', 'capsules'
  variant_type TEXT,                            -- 'powder', 'capsule', 'tincture'

  -- Pricing
  wholesale_price DECIMAL(10,2),
  rrp DECIMAL(10,2),
  cost_price DECIMAL(10,2),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_sellable BOOLEAN DEFAULT TRUE,
  is_discontinued BOOLEAN DEFAULT FALSE,

  -- Stock
  stock_on_hand INTEGER DEFAULT 0,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_products_code ON tlx_products(product_code);
CREATE INDEX IF NOT EXISTS idx_tlx_products_group ON tlx_products(product_group_id);
CREATE INDEX IF NOT EXISTS idx_tlx_products_active ON tlx_products(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- DISTRIBUTORS (customers from Unleashed that are NOT B2C)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unleashed_guid TEXT UNIQUE NOT NULL,
  customer_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,

  -- Contact
  email TEXT,
  phone TEXT,
  contact_name TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',

  -- Classification
  region TEXT,                                   -- 'NSW', 'VIC', 'QLD', etc.
  distributor_type TEXT,                         -- 'wholesale', 'retail_chain'

  -- Denormalized metrics (updated by sync job)
  first_order_date DATE,
  last_order_date DATE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'at_risk', 'churned', 'prospect')),

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_distributors_code ON tlx_distributors(customer_code);
CREATE INDEX IF NOT EXISTS idx_tlx_distributors_status ON tlx_distributors(status);
CREATE INDEX IF NOT EXISTS idx_tlx_distributors_last_order ON tlx_distributors(last_order_date DESC);

-- =============================================================================
-- DISTRIBUTOR ORDERS (sales orders from Unleashed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_distributor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES tlx_distributors(id) ON DELETE CASCADE,
  unleashed_order_guid TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,

  -- Dates
  order_date DATE NOT NULL,
  required_date DATE,
  completed_date DATE,

  -- Status
  order_status TEXT NOT NULL,                   -- 'Completed', 'Parked', 'Open'

  -- Financials
  subtotal DECIMAL(12,2),
  tax_total DECIMAL(10,2),
  total DECIMAL(12,2),
  currency TEXT DEFAULT 'AUD',

  -- Notes (raw from Unleashed)
  comments TEXT,

  -- OOS parsing flags
  has_oos_mention BOOLEAN DEFAULT FALSE,
  has_discontinued_mention BOOLEAN DEFAULT FALSE,
  parsed_notes JSONB,                           -- Structured parsing results

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(order_number)
);

CREATE INDEX IF NOT EXISTS idx_tlx_orders_distributor ON tlx_distributor_orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_tlx_orders_date ON tlx_distributor_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_tlx_orders_status ON tlx_distributor_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_tlx_orders_oos ON tlx_distributor_orders(has_oos_mention) WHERE has_oos_mention = TRUE;

-- =============================================================================
-- ORDER LINE ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES tlx_distributor_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES tlx_products(id),

  -- Line details
  line_number INTEGER,
  product_code TEXT NOT NULL,
  product_description TEXT,

  -- Quantities
  quantity_ordered DECIMAL(12,2) NOT NULL,
  quantity_shipped DECIMAL(12,2) DEFAULT 0,
  quantity_backordered DECIMAL(12,2) DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2),
  line_tax DECIMAL(10,2),

  -- Line-level notes
  line_comments TEXT,
  has_oos_mention BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_lines_order ON tlx_order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tlx_lines_product ON tlx_order_line_items(product_code);
CREATE INDEX IF NOT EXISTS idx_tlx_lines_product_id ON tlx_order_line_items(product_id) WHERE product_id IS NOT NULL;

-- =============================================================================
-- OOS NOTES (parsed from order comments)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_oos_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES tlx_distributor_orders(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES tlx_order_line_items(id) ON DELETE CASCADE,

  -- Note classification
  note_type TEXT NOT NULL CHECK (note_type IN (
    'out_of_stock',
    'short_supply',
    'discontinued',
    'backordered',
    'substituted',
    'partial_shipment',
    'other'
  )),

  -- Product reference
  product_code TEXT,
  product_id UUID REFERENCES tlx_products(id),

  -- Details
  original_text TEXT NOT NULL,
  parsed_quantity INTEGER,
  expected_date DATE,

  -- Resolution tracking
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert (prevent duplicate notes per order)
  UNIQUE(order_id, original_text)
);

CREATE INDEX IF NOT EXISTS idx_tlx_oos_order ON tlx_oos_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_tlx_oos_product ON tlx_oos_notes(product_id);
CREATE INDEX IF NOT EXISTS idx_tlx_oos_type ON tlx_oos_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_tlx_oos_unresolved ON tlx_oos_notes(is_resolved) WHERE is_resolved = FALSE;

-- =============================================================================
-- SYNC LOG (track sync operations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tlx_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,                      -- 'products', 'customers', 'orders', 'full'
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'success', 'partial', 'failed')),

  -- Counts
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Pagination tracking (for resume)
  last_page_processed INTEGER,
  total_pages INTEGER,
  last_modified_since TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_sync_type ON tlx_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_tlx_sync_started ON tlx_sync_log(started_at DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Distributor overview with health status
CREATE OR REPLACE VIEW v_tlx_distributor_overview AS
SELECT
  d.id,
  d.customer_code,
  d.customer_name,
  d.email,
  d.region,
  d.status,
  d.first_order_date,
  d.last_order_date,
  d.total_orders,
  d.total_revenue,
  d.avg_order_value,
  CURRENT_DATE - d.last_order_date as days_since_order,
  CASE
    WHEN d.last_order_date IS NULL THEN 'prospect'
    WHEN d.last_order_date < CURRENT_DATE - 60 THEN 'churning'
    WHEN d.last_order_date < CURRENT_DATE - 30 THEN 'at_risk'
    ELSE 'active'
  END as health_status
FROM tlx_distributors d;

-- Monthly order trends by distributor
CREATE OR REPLACE VIEW v_tlx_monthly_trends AS
SELECT
  d.id as distributor_id,
  d.customer_code,
  d.customer_name,
  DATE_TRUNC('month', o.order_date) as month,
  COUNT(o.id) as order_count,
  SUM(o.total) as revenue,
  AVG(o.total) as avg_order_value,
  COUNT(DISTINCT li.product_code) as unique_products
FROM tlx_distributors d
JOIN tlx_distributor_orders o ON d.id = o.distributor_id
LEFT JOIN tlx_order_line_items li ON o.id = li.order_id
WHERE o.order_status IN ('Completed', 'Open')
GROUP BY d.id, d.customer_code, d.customer_name, DATE_TRUNC('month', o.order_date)
ORDER BY month DESC;

-- Product group performance
CREATE OR REPLACE VIEW v_tlx_product_group_performance AS
SELECT
  pg.id as group_id,
  pg.group_code,
  pg.group_name,
  pg.category,
  COUNT(DISTINCT li.order_id) as order_count,
  SUM(li.quantity_ordered) as total_units_sold,
  SUM(li.line_total) as total_revenue,
  COUNT(DISTINCT o.distributor_id) as unique_distributors,
  AVG(li.unit_price) as avg_unit_price
FROM tlx_product_groups pg
JOIN tlx_products p ON pg.id = p.product_group_id
JOIN tlx_order_line_items li ON p.product_code = li.product_code
JOIN tlx_distributor_orders o ON li.order_id = o.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY pg.id, pg.group_code, pg.group_name, pg.category
ORDER BY total_revenue DESC;

-- OOS summary
CREATE OR REPLACE VIEW v_tlx_oos_summary AS
SELECT
  oos.product_code,
  p.product_name,
  pg.group_name,
  oos.note_type,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT oos.order_id) as affected_orders,
  COUNT(*) FILTER (WHERE NOT oos.is_resolved) as unresolved_count,
  MIN(oos.detected_at) as first_detected,
  MAX(oos.detected_at) as last_detected
FROM tlx_oos_notes oos
LEFT JOIN tlx_products p ON oos.product_id = p.id
LEFT JOIN tlx_product_groups pg ON p.product_group_id = pg.id
WHERE oos.detected_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY oos.product_code, p.product_name, pg.group_name, oos.note_type
ORDER BY occurrence_count DESC;

-- Distributor product mix (what each distributor buys)
CREATE OR REPLACE VIEW v_tlx_distributor_product_mix AS
SELECT
  d.id as distributor_id,
  d.customer_code,
  d.customer_name,
  pg.group_code,
  pg.group_name,
  SUM(li.quantity_ordered) as total_units,
  SUM(li.line_total) as total_spend,
  COUNT(DISTINCT o.id) as order_count
FROM tlx_distributors d
JOIN tlx_distributor_orders o ON d.id = o.distributor_id
JOIN tlx_order_line_items li ON o.id = li.order_id
LEFT JOIN tlx_products p ON li.product_code = p.product_code
LEFT JOIN tlx_product_groups pg ON p.product_group_id = pg.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY d.id, d.customer_code, d.customer_name, pg.group_code, pg.group_name
ORDER BY d.customer_name, total_spend DESC;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update distributor metrics after order sync
CREATE OR REPLACE FUNCTION update_distributor_metrics(p_distributor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tlx_distributors
  SET
    first_order_date = (
      SELECT MIN(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    last_order_date = (
      SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    total_orders = (
      SELECT COUNT(*) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    total_revenue = (
      SELECT COALESCE(SUM(total), 0) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    avg_order_value = (
      SELECT COALESCE(AVG(total), 0) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id
    ),
    status = CASE
      WHEN (SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id) IS NULL THEN 'prospect'
      WHEN (SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id) < CURRENT_DATE - 60 THEN 'churned'
      WHEN (SELECT MAX(order_date) FROM tlx_distributor_orders WHERE distributor_id = p_distributor_id) < CURRENT_DATE - 30 THEN 'at_risk'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE id = p_distributor_id;
END;
$$;

-- Function to update all distributor metrics (batch)
CREATE OR REPLACE FUNCTION update_all_distributor_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_distributor_id UUID;
BEGIN
  FOR v_distributor_id IN SELECT id FROM tlx_distributors LOOP
    PERFORM update_distributor_metrics(v_distributor_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_tlx_products_updated_at
  BEFORE UPDATE ON tlx_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tlx_distributors_updated_at
  BEFORE UPDATE ON tlx_distributors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tlx_orders_updated_at
  BEFORE UPDATE ON tlx_distributor_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_tlx_product_groups_updated_at
  BEFORE UPDATE ON tlx_product_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS POLICIES (if needed)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE tlx_product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_distributor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_oos_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_sync_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON tlx_product_groups FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_products FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_distributors FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_distributor_orders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_order_line_items FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_oos_notes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tlx_sync_log FOR ALL USING (true);
