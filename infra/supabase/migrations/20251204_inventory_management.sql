-- ============================================================================
-- Inventory Management System - Unleashed Replacement
-- Created: 2025-12-04
-- Purpose: Complete inventory management replacing Unleashed for Teelixir
-- ============================================================================

-- =============================================================================
-- INVENTORY LOCATIONS (Shopify locations + warehouses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL, -- 'teelixir', 'elevate', 'boo', 'rhf'

  -- Shopify identifiers
  shopify_location_id BIGINT UNIQUE,
  shopify_location_gid TEXT, -- GraphQL global ID

  -- Location details
  location_code TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_type TEXT DEFAULT 'warehouse', -- 'warehouse', 'retail', '3pl', 'dropship'

  -- Address
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  province TEXT,
  country TEXT DEFAULT 'AU',
  postcode TEXT,

  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  tracks_inventory BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, location_code)
);

CREATE INDEX IF NOT EXISTS idx_inv_locations_store ON inv_locations(store);
CREATE INDEX IF NOT EXISTS idx_inv_locations_shopify ON inv_locations(shopify_location_id);

-- =============================================================================
-- INVENTORY PRODUCTS (Master product catalog synced from Shopify)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Shopify identifiers
  shopify_product_id BIGINT NOT NULL,
  shopify_product_gid TEXT,

  -- Product details
  product_title TEXT NOT NULL,
  product_handle TEXT,
  product_type TEXT,
  vendor TEXT,
  product_status TEXT DEFAULT 'active', -- 'active', 'draft', 'archived'

  -- Organization
  product_category TEXT,
  tags TEXT[], -- Array of tags

  -- Pricing (base product level)
  compare_at_price DECIMAL(10,2),

  -- Images
  featured_image_url TEXT,

  -- Options
  has_variants BOOLEAN DEFAULT FALSE,
  option1_name TEXT,
  option2_name TEXT,
  option3_name TEXT,

  -- Tracking
  total_inventory INTEGER DEFAULT 0, -- Denormalized sum across variants/locations

  -- Metadata
  metadata JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, shopify_product_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_products_store ON inv_products(store);
CREATE INDEX IF NOT EXISTS idx_inv_products_shopify ON inv_products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_inv_products_vendor ON inv_products(store, vendor);
CREATE INDEX IF NOT EXISTS idx_inv_products_type ON inv_products(store, product_type);

-- =============================================================================
-- INVENTORY VARIANTS (SKU-level inventory items)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inv_products(id) ON DELETE CASCADE,
  store TEXT NOT NULL,

  -- Shopify identifiers
  shopify_variant_id BIGINT NOT NULL,
  shopify_variant_gid TEXT,
  shopify_inventory_item_id BIGINT,

  -- Variant details
  variant_title TEXT,
  sku TEXT,
  barcode TEXT,

  -- Options
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,

  -- Pricing
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  cost DECIMAL(10,2), -- Cost price from Shopify

  -- Physical attributes
  weight DECIMAL(10,4),
  weight_unit TEXT DEFAULT 'g',

  -- Inventory settings
  inventory_management TEXT, -- 'shopify', 'not_managed', null
  inventory_policy TEXT DEFAULT 'deny', -- 'deny', 'continue'
  requires_shipping BOOLEAN DEFAULT TRUE,

  -- Calculated totals
  total_inventory INTEGER DEFAULT 0, -- Sum across all locations
  available_inventory INTEGER DEFAULT 0, -- Available (not committed)

  -- Stock thresholds
  low_stock_threshold INTEGER DEFAULT 10,
  reorder_point INTEGER DEFAULT 20,
  reorder_quantity INTEGER DEFAULT 50,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, shopify_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_variants_product ON inv_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_variants_store ON inv_variants(store);
CREATE INDEX IF NOT EXISTS idx_inv_variants_sku ON inv_variants(store, sku);
CREATE INDEX IF NOT EXISTS idx_inv_variants_shopify ON inv_variants(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_variants_inventory_item ON inv_variants(shopify_inventory_item_id);

-- =============================================================================
-- INVENTORY LEVELS (Stock by variant + location)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES inv_variants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES inv_locations(id) ON DELETE CASCADE,
  store TEXT NOT NULL,

  -- Shopify identifiers
  shopify_inventory_item_id BIGINT,
  shopify_location_id BIGINT,

  -- Stock levels
  quantity_on_hand INTEGER DEFAULT 0, -- Physical stock
  quantity_available INTEGER DEFAULT 0, -- Available for sale
  quantity_committed INTEGER DEFAULT 0, -- Reserved for orders
  quantity_incoming INTEGER DEFAULT 0, -- Expected from POs

  -- Calculated values
  quantity_sellable INTEGER GENERATED ALWAYS AS (
    GREATEST(0, quantity_available - quantity_committed)
  ) STORED,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_source TEXT DEFAULT 'shopify', -- 'shopify', 'manual', 'adjustment'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(variant_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_levels_variant ON inv_levels(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_levels_location ON inv_levels(location_id);
CREATE INDEX IF NOT EXISTS idx_inv_levels_store ON inv_levels(store);
CREATE INDEX IF NOT EXISTS idx_inv_levels_low_stock ON inv_levels(quantity_available) WHERE quantity_available < 10;

-- =============================================================================
-- STOCK ADJUSTMENTS (Manual inventory changes, write-offs, corrections)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  variant_id UUID NOT NULL REFERENCES inv_variants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES inv_locations(id) ON DELETE CASCADE,

  -- Adjustment details
  adjustment_type TEXT NOT NULL, -- 'adjustment', 'write_off', 'damaged', 'correction', 'shrinkage', 'count', 'transfer_in', 'transfer_out'
  quantity_change INTEGER NOT NULL, -- Can be positive or negative
  quantity_before INTEGER,
  quantity_after INTEGER,

  -- Reason
  reason TEXT NOT NULL,
  notes TEXT,

  -- Reference
  reference_number TEXT, -- Optional reference/ticket number
  reference_type TEXT, -- 'count', 'damage_report', 'audit', 'transfer'

  -- Cost tracking
  unit_cost DECIMAL(10,2),
  total_cost_impact DECIMAL(12,2),

  -- Audit
  adjusted_by TEXT,
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),

  -- Shopify sync
  synced_to_shopify BOOLEAN DEFAULT FALSE,
  shopify_sync_at TIMESTAMPTZ,
  shopify_sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_adjustments_store ON inv_adjustments(store);
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_variant ON inv_adjustments(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_location ON inv_adjustments(location_id);
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_type ON inv_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_inv_adjustments_date ON inv_adjustments(adjusted_at DESC);

-- =============================================================================
-- SUPPLIERS (Vendor/supplier management for purchase orders)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Supplier details
  supplier_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_type TEXT DEFAULT 'manufacturer', -- 'manufacturer', 'distributor', 'wholesaler', '3pl'

  -- Contact
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Address
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'AU',
  postcode TEXT,

  -- Terms
  payment_terms TEXT, -- 'net_30', 'net_60', 'cod', 'prepaid'
  currency TEXT DEFAULT 'AUD',
  lead_time_days INTEGER DEFAULT 7,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, supplier_code)
);

CREATE INDEX IF NOT EXISTS idx_inv_suppliers_store ON inv_suppliers(store);

-- =============================================================================
-- PURCHASE ORDERS (Incoming stock orders)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Order identifiers
  po_number TEXT NOT NULL,
  supplier_id UUID REFERENCES inv_suppliers(id),
  location_id UUID REFERENCES inv_locations(id), -- Destination

  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'ordered', 'partial', 'received', 'cancelled'

  -- Financials
  currency TEXT DEFAULT 'AUD',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_total DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Tracking
  supplier_ref TEXT, -- Supplier's order/invoice number
  tracking_number TEXT,

  -- Audit
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, po_number)
);

CREATE INDEX IF NOT EXISTS idx_inv_po_store ON inv_purchase_orders(store);
CREATE INDEX IF NOT EXISTS idx_inv_po_supplier ON inv_purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inv_po_status ON inv_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_inv_po_date ON inv_purchase_orders(order_date DESC);

-- =============================================================================
-- PURCHASE ORDER LINE ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES inv_purchase_orders(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES inv_variants(id),

  -- Product details (denormalized for history)
  sku TEXT NOT NULL,
  product_title TEXT,
  variant_title TEXT,

  -- Quantities
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  quantity_outstanding INTEGER GENERATED ALWAYS AS (
    quantity_ordered - quantity_received
  ) STORED,

  -- Pricing
  unit_cost DECIMAL(10,4),
  line_total DECIMAL(12,2),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_po_lines_po ON inv_purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inv_po_lines_variant ON inv_purchase_order_lines(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_po_lines_sku ON inv_purchase_order_lines(sku);

-- =============================================================================
-- STOCK RECEIPTS (Recording received inventory)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_stock_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  purchase_order_id UUID REFERENCES inv_purchase_orders(id),
  location_id UUID NOT NULL REFERENCES inv_locations(id),

  -- Receipt details
  receipt_number TEXT NOT NULL,
  receipt_date DATE DEFAULT CURRENT_DATE,

  -- Reference
  supplier_packing_slip TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'

  -- Notes
  notes TEXT,

  -- Audit
  received_by TEXT,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_inv_receipts_store ON inv_stock_receipts(store);
CREATE INDEX IF NOT EXISTS idx_inv_receipts_po ON inv_stock_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inv_receipts_date ON inv_stock_receipts(receipt_date DESC);

-- =============================================================================
-- STOCK RECEIPT LINE ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_stock_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES inv_stock_receipts(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES inv_variants(id),
  po_line_id UUID REFERENCES inv_purchase_order_lines(id),

  -- Product details
  sku TEXT NOT NULL,

  -- Quantities
  quantity_expected INTEGER DEFAULT 0,
  quantity_received INTEGER NOT NULL,
  quantity_damaged INTEGER DEFAULT 0,
  quantity_accepted INTEGER GENERATED ALWAYS AS (
    quantity_received - quantity_damaged
  ) STORED,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_receipt_lines_receipt ON inv_stock_receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_inv_receipt_lines_variant ON inv_stock_receipt_lines(variant_id);

-- =============================================================================
-- BUNDLE/BOM DEFINITIONS (Bill of Materials for bundled products)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- The bundle product
  bundle_variant_id UUID NOT NULL REFERENCES inv_variants(id) ON DELETE CASCADE,

  -- Bundle settings
  bundle_name TEXT NOT NULL,
  bundle_type TEXT DEFAULT 'kit', -- 'kit', 'assembly', 'pack'

  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  auto_calculate_inventory BOOLEAN DEFAULT TRUE, -- Calculate available based on components

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(bundle_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_bundles_store ON inv_bundles(store);
CREATE INDEX IF NOT EXISTS idx_inv_bundles_variant ON inv_bundles(bundle_variant_id);

-- =============================================================================
-- BUNDLE COMPONENTS (What makes up a bundle)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_bundle_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES inv_bundles(id) ON DELETE CASCADE,
  component_variant_id UUID NOT NULL REFERENCES inv_variants(id) ON DELETE CASCADE,

  -- Quantity per bundle
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Component type
  component_type TEXT DEFAULT 'required', -- 'required', 'optional', 'substitute'

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(bundle_id, component_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_bundle_components_bundle ON inv_bundle_components(bundle_id);
CREATE INDEX IF NOT EXISTS idx_inv_bundle_components_component ON inv_bundle_components(component_variant_id);

-- =============================================================================
-- INVENTORY COUNTS / STOCKTAKES
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES inv_locations(id),

  -- Count details
  count_number TEXT NOT NULL,
  count_type TEXT DEFAULT 'full', -- 'full', 'partial', 'cycle', 'spot'
  count_date DATE DEFAULT CURRENT_DATE,

  -- Scope (for partial counts)
  scope_filter JSONB, -- e.g., {"product_type": "Mushroom Extracts", "vendor": "Teelixir"}

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'in_progress', 'review', 'completed', 'cancelled'

  -- Summary (updated after completion)
  total_items_counted INTEGER DEFAULT 0,
  items_with_variance INTEGER DEFAULT 0,
  total_variance_units INTEGER DEFAULT 0,
  total_variance_value DECIMAL(12,2) DEFAULT 0,

  -- Audit
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  completed_by TEXT,
  approved_by TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, count_number)
);

CREATE INDEX IF NOT EXISTS idx_inv_counts_store ON inv_counts(store);
CREATE INDEX IF NOT EXISTS idx_inv_counts_location ON inv_counts(location_id);
CREATE INDEX IF NOT EXISTS idx_inv_counts_status ON inv_counts(status);
CREATE INDEX IF NOT EXISTS idx_inv_counts_date ON inv_counts(count_date DESC);

-- =============================================================================
-- INVENTORY COUNT LINE ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES inv_counts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES inv_variants(id),

  -- Expected vs Actual
  expected_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  variance INTEGER GENERATED ALWAYS AS (
    COALESCE(counted_quantity, 0) - expected_quantity
  ) STORED,

  -- Cost for variance calculation
  unit_cost DECIMAL(10,2),
  variance_value DECIMAL(10,2) GENERATED ALWAYS AS (
    (COALESCE(counted_quantity, 0) - expected_quantity) * COALESCE(unit_cost, 0)
  ) STORED,

  -- Status
  is_counted BOOLEAN DEFAULT FALSE,

  -- Notes
  notes TEXT,

  -- Audit
  counted_by TEXT,
  counted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_count_lines_count ON inv_count_lines(count_id);
CREATE INDEX IF NOT EXISTS idx_inv_count_lines_variant ON inv_count_lines(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_count_lines_variance ON inv_count_lines(variance) WHERE variance != 0;

-- =============================================================================
-- INVENTORY ACTIVITY LOG (Audit trail of all changes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- What changed
  entity_type TEXT NOT NULL, -- 'variant', 'level', 'adjustment', 'receipt', 'count'
  entity_id UUID NOT NULL,
  variant_id UUID REFERENCES inv_variants(id),
  location_id UUID REFERENCES inv_locations(id),

  -- Change details
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'sync', 'adjust', 'receive'
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,

  -- Context
  source TEXT, -- 'shopify_sync', 'manual', 'api', 'adjustment', 'receipt', 'count'
  reference_type TEXT,
  reference_id UUID,

  -- User
  actor TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_activity_store ON inv_activity_log(store);
CREATE INDEX IF NOT EXISTS idx_inv_activity_variant ON inv_activity_log(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_activity_entity ON inv_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_inv_activity_date ON inv_activity_log(created_at DESC);

-- =============================================================================
-- INVENTORY SYNC LOG
-- =============================================================================
CREATE TABLE IF NOT EXISTS inv_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  sync_type TEXT NOT NULL, -- 'products', 'variants', 'levels', 'full'
  status TEXT DEFAULT 'started', -- 'started', 'success', 'partial', 'failed'

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

  -- Errors
  error_message TEXT,
  error_details JSONB,

  -- Cursor for incremental sync
  last_cursor TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_sync_store ON inv_sync_log(store);
CREATE INDEX IF NOT EXISTS idx_inv_sync_type ON inv_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_inv_sync_date ON inv_sync_log(started_at DESC);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Product inventory overview
CREATE OR REPLACE VIEW v_inv_product_inventory AS
SELECT
  p.id as product_id,
  p.store,
  p.shopify_product_id,
  p.product_title,
  p.vendor,
  p.product_type,
  COUNT(DISTINCT v.id) as variant_count,
  SUM(v.total_inventory) as total_inventory,
  SUM(v.total_inventory * COALESCE(v.cost, 0)) as inventory_value,
  MIN(v.total_inventory) as min_variant_inventory,
  SUM(CASE WHEN v.total_inventory <= v.low_stock_threshold THEN 1 ELSE 0 END) as low_stock_variants,
  p.featured_image_url,
  p.last_synced_at
FROM inv_products p
LEFT JOIN inv_variants v ON p.id = v.product_id
GROUP BY p.id, p.store, p.shopify_product_id, p.product_title, p.vendor, p.product_type, p.featured_image_url, p.last_synced_at;

-- Variant inventory by location
CREATE OR REPLACE VIEW v_inv_variant_levels AS
SELECT
  v.id as variant_id,
  v.store,
  v.sku,
  p.product_title,
  v.variant_title,
  v.price,
  v.cost,
  l.location_name,
  l.location_code,
  lvl.quantity_on_hand,
  lvl.quantity_available,
  lvl.quantity_committed,
  lvl.quantity_incoming,
  lvl.quantity_sellable,
  v.low_stock_threshold,
  v.reorder_point,
  CASE
    WHEN lvl.quantity_available <= 0 THEN 'out_of_stock'
    WHEN lvl.quantity_available <= v.low_stock_threshold THEN 'low_stock'
    WHEN lvl.quantity_available <= v.reorder_point THEN 'reorder'
    ELSE 'in_stock'
  END as stock_status
FROM inv_variants v
JOIN inv_products p ON v.product_id = p.id
LEFT JOIN inv_levels lvl ON v.id = lvl.variant_id
LEFT JOIN inv_locations l ON lvl.location_id = l.id;

-- Low stock alerts
CREATE OR REPLACE VIEW v_inv_low_stock_alerts AS
SELECT
  v.id as variant_id,
  v.store,
  v.sku,
  p.product_title,
  v.variant_title,
  v.total_inventory,
  v.low_stock_threshold,
  v.reorder_point,
  v.reorder_quantity,
  v.cost,
  v.total_inventory * COALESCE(v.cost, 0) as inventory_value,
  CASE
    WHEN v.total_inventory <= 0 THEN 'out_of_stock'
    WHEN v.total_inventory <= v.low_stock_threshold THEN 'critical'
    WHEN v.total_inventory <= v.reorder_point THEN 'low'
    ELSE 'ok'
  END as alert_level
FROM inv_variants v
JOIN inv_products p ON v.product_id = p.id
WHERE v.is_active = TRUE
  AND v.total_inventory <= v.reorder_point
ORDER BY v.total_inventory ASC;

-- Bundle availability (calculated from components)
CREATE OR REPLACE VIEW v_inv_bundle_availability AS
SELECT
  b.id as bundle_id,
  b.store,
  b.bundle_name,
  bv.sku as bundle_sku,
  bv.total_inventory as bundle_inventory,
  MIN(FLOOR(cv.total_inventory / bc.quantity)) as available_to_build,
  json_agg(json_build_object(
    'sku', cv.sku,
    'title', cv.variant_title,
    'quantity_required', bc.quantity,
    'quantity_available', cv.total_inventory
  )) as components
FROM inv_bundles b
JOIN inv_variants bv ON b.bundle_variant_id = bv.id
JOIN inv_bundle_components bc ON b.id = bc.bundle_id
JOIN inv_variants cv ON bc.component_variant_id = cv.id
WHERE b.is_active = TRUE
GROUP BY b.id, b.store, b.bundle_name, bv.sku, bv.total_inventory;

-- Daily inventory summary
CREATE OR REPLACE VIEW v_inv_daily_summary AS
SELECT
  store,
  COUNT(DISTINCT product_id) as total_products,
  COUNT(*) as total_variants,
  SUM(total_inventory) as total_units,
  SUM(total_inventory * COALESCE(cost, 0)) as total_value,
  SUM(CASE WHEN total_inventory <= 0 THEN 1 ELSE 0 END) as out_of_stock_count,
  SUM(CASE WHEN total_inventory > 0 AND total_inventory <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
  SUM(CASE WHEN total_inventory > low_stock_threshold AND total_inventory <= reorder_point THEN 1 ELSE 0 END) as reorder_needed_count
FROM inv_variants
WHERE is_active = TRUE
GROUP BY store;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to recalculate variant totals from levels
CREATE OR REPLACE FUNCTION recalculate_variant_inventory(p_variant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inv_variants
  SET
    total_inventory = COALESCE((
      SELECT SUM(quantity_on_hand) FROM inv_levels WHERE variant_id = p_variant_id
    ), 0),
    available_inventory = COALESCE((
      SELECT SUM(quantity_available) FROM inv_levels WHERE variant_id = p_variant_id
    ), 0),
    updated_at = NOW()
  WHERE id = p_variant_id;
END;
$$;

-- Function to recalculate product totals from variants
CREATE OR REPLACE FUNCTION recalculate_product_inventory(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inv_products
  SET
    total_inventory = COALESCE((
      SELECT SUM(total_inventory) FROM inv_variants WHERE product_id = p_product_id
    ), 0),
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_inv_locations_updated_at BEFORE UPDATE ON inv_locations FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();
CREATE TRIGGER tr_inv_products_updated_at BEFORE UPDATE ON inv_products FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();
CREATE TRIGGER tr_inv_variants_updated_at BEFORE UPDATE ON inv_variants FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();
CREATE TRIGGER tr_inv_levels_updated_at BEFORE UPDATE ON inv_levels FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();
CREATE TRIGGER tr_inv_suppliers_updated_at BEFORE UPDATE ON inv_suppliers FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();
CREATE TRIGGER tr_inv_purchase_orders_updated_at BEFORE UPDATE ON inv_purchase_orders FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();
CREATE TRIGGER tr_inv_bundles_updated_at BEFORE UPDATE ON inv_bundles FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();
CREATE TRIGGER tr_inv_counts_updated_at BEFORE UPDATE ON inv_counts FOR EACH ROW EXECUTE FUNCTION update_inv_updated_at();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE inv_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_stock_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_bundle_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_sync_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON inv_locations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_variants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_levels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_adjustments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_purchase_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_purchase_order_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_stock_receipts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_stock_receipt_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_bundles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_bundle_components FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_counts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_count_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inv_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read access
CREATE POLICY "Authenticated read" ON inv_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_purchase_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_stock_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_stock_receipt_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_bundle_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_count_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read" ON inv_sync_log FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE inv_locations IS 'Inventory storage locations (warehouses, stores, 3PL)';
COMMENT ON TABLE inv_products IS 'Products synced from Shopify';
COMMENT ON TABLE inv_variants IS 'Product variants with SKUs and inventory tracking';
COMMENT ON TABLE inv_levels IS 'Inventory levels per variant per location';
COMMENT ON TABLE inv_adjustments IS 'Manual inventory adjustments, write-offs, corrections';
COMMENT ON TABLE inv_suppliers IS 'Suppliers/vendors for purchase orders';
COMMENT ON TABLE inv_purchase_orders IS 'Purchase orders for incoming inventory';
COMMENT ON TABLE inv_bundles IS 'Bundle/BOM definitions for kit products';
COMMENT ON TABLE inv_counts IS 'Physical inventory counts/stocktakes';
COMMENT ON TABLE inv_activity_log IS 'Audit trail of all inventory changes';
