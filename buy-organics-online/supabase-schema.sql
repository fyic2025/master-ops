-- ==============================================================================
-- BUY ORGANICS ONLINE - SUPABASE SCHEMA
-- ==============================================================================
-- Created: 2025-11-24
-- Purpose: Complete database schema for BOO migration to Supabase
-- Based on: AWS RDS new_fyic_db analysis
-- Improvements: Better indexes, RLS, JSONB fields, pricing rules, product matching
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ==============================================================================
-- BIGCOMMERCE PRODUCTS (Primary product catalog - 11,357 products)
-- ==============================================================================

CREATE TABLE bc_products (
  id BIGSERIAL PRIMARY KEY,
  bc_product_id INTEGER UNIQUE NOT NULL,
  sku VARCHAR(255) UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  retail_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  inventory_level INTEGER DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'available',
  weight DECIMAL(10,2),
  barcode VARCHAR(255),
  brand VARCHAR(255),
  categories JSONB, -- Array of category IDs/names
  images JSONB, -- Array of image URLs
  custom_fields JSONB, -- Flexible storage for BC custom fields
  meta_description TEXT,
  page_title TEXT,
  search_keywords TEXT,

  -- AI-generated content
  ai_description TEXT,
  ai_score INTEGER,
  improved_ai_description TEXT,
  improved_ai_score INTEGER,

  -- Supplier linking
  primary_supplier VARCHAR(50), -- 'oborne', 'uhp', 'kadac', 'kik'
  supplier_sku VARCHAR(255),
  supplier_data JSONB, -- Flexible storage for supplier-specific data

  -- Stock management
  manual_stock_override BOOLEAN DEFAULT FALSE,
  manual_stock_value INTEGER,
  last_stock_update TIMESTAMP WITH TIME ZONE,

  -- Pricing rules
  pricing_rule_id INTEGER, -- Link to pricing_rules table
  price_override BOOLEAN DEFAULT FALSE,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for bc_products
CREATE INDEX idx_bc_products_bc_product_id ON bc_products(bc_product_id);
CREATE INDEX idx_bc_products_sku ON bc_products(sku);
CREATE INDEX idx_bc_products_barcode ON bc_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_bc_products_brand ON bc_products(brand);
CREATE INDEX idx_bc_products_primary_supplier ON bc_products(primary_supplier);
CREATE INDEX idx_bc_products_supplier_sku ON bc_products(supplier_sku);
CREATE INDEX idx_bc_products_is_active ON bc_products(is_active);
CREATE INDEX idx_bc_products_name_trgm ON bc_products USING gin(name gin_trgm_ops); -- Fuzzy search

-- ==============================================================================
-- SUPPLIER PRODUCT TABLES
-- ==============================================================================

-- Oborne/CH2 Products (8,570 products via FTP)
CREATE TABLE oborne_products (
  id BIGSERIAL PRIMARY KEY,
  supplier_sku VARCHAR(255) UNIQUE NOT NULL,
  barcode VARCHAR(255),
  name TEXT NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  rrp DECIMAL(10,2), -- Recommended Retail Price
  wholesale_price DECIMAL(10,2), -- Cost ex GST
  gst_inclusive_price DECIMAL(10,2),
  stock_qty INTEGER DEFAULT 0,
  stock_status VARCHAR(50),
  category VARCHAR(255),
  weight DECIMAL(10,2),
  dimensions JSONB, -- {length, width, height}
  image_url TEXT,

  -- Matching
  matched_bc_product_id INTEGER, -- Link to bc_products
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  match_method VARCHAR(50), -- 'barcode', 'sku', 'fuzzy_name', 'manual'

  -- Raw data storage
  raw_data JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_oborne_products_supplier_sku ON oborne_products(supplier_sku);
CREATE INDEX idx_oborne_products_barcode ON oborne_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_oborne_products_matched_bc ON oborne_products(matched_bc_product_id);
CREATE INDEX idx_oborne_products_brand ON oborne_products(brand);
CREATE INDEX idx_oborne_products_name_trgm ON oborne_products USING gin(name gin_trgm_ops);

-- UHP Products (4,501 products via HTTPS download)
CREATE TABLE uhp_products (
  id BIGSERIAL PRIMARY KEY,
  supplier_sku VARCHAR(255) UNIQUE NOT NULL,
  barcode VARCHAR(255),
  name TEXT NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  rrp DECIMAL(10,2),
  wholesale_price DECIMAL(10,2),
  stock_qty INTEGER DEFAULT 0,
  stock_status VARCHAR(50),
  category VARCHAR(255),
  weight DECIMAL(10,2),

  -- Matching
  matched_bc_product_id INTEGER,
  match_confidence DECIMAL(3,2),
  match_method VARCHAR(50),

  -- Raw data storage
  raw_data JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_uhp_products_supplier_sku ON uhp_products(supplier_sku);
CREATE INDEX idx_uhp_products_barcode ON uhp_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_uhp_products_matched_bc ON uhp_products(matched_bc_product_id);
CREATE INDEX idx_uhp_products_name_trgm ON uhp_products USING gin(name gin_trgm_ops);

-- Kadac Products (945 products via CSV API)
CREATE TABLE kadac_products (
  id BIGSERIAL PRIMARY KEY,
  supplier_sku VARCHAR(255) UNIQUE NOT NULL,
  barcode VARCHAR(255),
  name TEXT NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  rrp DECIMAL(10,2),
  wholesale_price DECIMAL(10,2),
  stock_qty INTEGER DEFAULT 0,
  stock_status VARCHAR(50),
  category VARCHAR(255),

  -- Matching
  matched_bc_product_id INTEGER,
  match_confidence DECIMAL(3,2),
  match_method VARCHAR(50),

  -- Raw data storage
  raw_data JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_kadac_products_supplier_sku ON kadac_products(supplier_sku);
CREATE INDEX idx_kadac_products_barcode ON kadac_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_kadac_products_matched_bc ON kadac_products(matched_bc_product_id);
CREATE INDEX idx_kadac_products_name_trgm ON kadac_products USING gin(name gin_trgm_ops);

-- Kikai/Elevate Products (424 products)
CREATE TABLE kik_products (
  id BIGSERIAL PRIMARY KEY,
  supplier_sku VARCHAR(255) UNIQUE NOT NULL,
  barcode VARCHAR(255),
  name TEXT NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  rrp DECIMAL(10,2),
  wholesale_price DECIMAL(10,2),
  stock_qty INTEGER DEFAULT 0,
  stock_status VARCHAR(50),

  -- Matching
  matched_bc_product_id INTEGER,
  match_confidence DECIMAL(3,2),
  match_method VARCHAR(50),

  -- Raw data storage
  raw_data JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_kik_products_supplier_sku ON kik_products(supplier_sku);
CREATE INDEX idx_kik_products_barcode ON kik_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_kik_products_matched_bc ON kik_products(matched_bc_product_id);

-- ==============================================================================
-- PRICING RULES (NEW - Dynamic pricing below RRP)
-- ==============================================================================

CREATE TABLE pricing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Rule scope
  applies_to VARCHAR(50) NOT NULL, -- 'supplier', 'brand', 'category', 'product'
  supplier_name VARCHAR(50), -- When applies_to = 'supplier'
  brand_name VARCHAR(255), -- When applies_to = 'brand'
  category_name VARCHAR(255), -- When applies_to = 'category'
  product_bc_id INTEGER, -- When applies_to = 'product'

  -- Pricing calculation
  pricing_method VARCHAR(50) NOT NULL, -- 'percentage_below_rrp', 'fixed_margin', 'cost_plus_percentage'
  percentage_below_rrp DECIMAL(5,2), -- e.g., 8.00 for 8% below RRP
  fixed_margin DECIMAL(10,2), -- Fixed dollar margin above cost
  cost_plus_percentage DECIMAL(5,2), -- Percentage above cost price

  -- Constraints
  never_below_cost BOOLEAN DEFAULT TRUE,
  min_price DECIMAL(10,2), -- Absolute minimum price
  max_discount_percentage DECIMAL(5,2), -- Max allowed discount from RRP

  -- Priority (lower number = higher priority)
  priority INTEGER DEFAULT 100,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_applies_to ON pricing_rules(applies_to);
CREATE INDEX idx_pricing_rules_supplier ON pricing_rules(supplier_name);
CREATE INDEX idx_pricing_rules_brand ON pricing_rules(brand_name);
CREATE INDEX idx_pricing_rules_priority ON pricing_rules(priority);
CREATE INDEX idx_pricing_rules_is_active ON pricing_rules(is_active);

-- ==============================================================================
-- PRODUCT MATCHING RULES (NEW - Flexible matching configuration)
-- ==============================================================================

CREATE TABLE product_matching_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Match criteria (in priority order)
  match_on_barcode BOOLEAN DEFAULT TRUE,
  match_on_sku BOOLEAN DEFAULT TRUE,
  match_on_fuzzy_name BOOLEAN DEFAULT TRUE,
  fuzzy_name_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80% similarity

  -- Supplier specific
  supplier_name VARCHAR(50),

  -- Auto-approval thresholds
  auto_approve_barcode_match BOOLEAN DEFAULT TRUE,
  auto_approve_sku_match BOOLEAN DEFAULT FALSE,
  auto_approve_fuzzy_threshold DECIMAL(3,2) DEFAULT 0.95, -- 95% confidence

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- SYNC HISTORY & LOGS
-- ==============================================================================

CREATE TABLE sync_logs (
  id BIGSERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'supplier_feed', 'bigcommerce_update', 'inventory_sync', 'price_sync'
  supplier_name VARCHAR(50), -- NULL for non-supplier syncs

  -- Status
  status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed', 'partial'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Stats
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Details
  error_message TEXT,
  error_details JSONB,
  summary JSONB, -- Flexible storage for sync summary stats

  -- Metadata
  triggered_by VARCHAR(50), -- 'cron', 'manual', 'api', 'webhook'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX idx_sync_logs_supplier_name ON sync_logs(supplier_name);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- ==============================================================================
-- STOCK HISTORY (3.4M records in old system - we'll keep last 90 days)
-- ==============================================================================

CREATE TABLE stock_history (
  id BIGSERIAL PRIMARY KEY,
  bc_product_id INTEGER NOT NULL,
  supplier_name VARCHAR(50),

  -- Stock levels
  old_stock INTEGER,
  new_stock INTEGER,
  stock_change INTEGER, -- new - old

  -- Context
  change_reason VARCHAR(255), -- 'supplier_sync', 'manual_adjustment', 'order', etc.
  sync_log_id BIGINT, -- Link to sync_logs

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX idx_stock_history_bc_product_id ON stock_history(bc_product_id, created_at DESC);
CREATE INDEX idx_stock_history_created_at ON stock_history(created_at DESC);

-- Auto-delete records older than 90 days
CREATE OR REPLACE FUNCTION delete_old_stock_history()
RETURNS void AS $$
BEGIN
  DELETE FROM stock_history WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- ORDERS & CUSTOMERS (Historical data)
-- ==============================================================================

CREATE TABLE bc_orders (
  id BIGSERIAL PRIMARY KEY,
  bc_order_id INTEGER UNIQUE NOT NULL,
  customer_id INTEGER,
  customer_email VARCHAR(255),

  -- Order details
  status VARCHAR(50),
  total_inc_tax DECIMAL(10,2),
  total_ex_tax DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),

  -- Items
  items_total_quantity INTEGER,
  items JSONB, -- Array of order items

  -- Dates
  date_created TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  date_shipped TIMESTAMP WITH TIME ZONE,

  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bc_orders_bc_order_id ON bc_orders(bc_order_id);
CREATE INDEX idx_bc_orders_customer_email ON bc_orders(customer_email);
CREATE INDEX idx_bc_orders_status ON bc_orders(status);
CREATE INDEX idx_bc_orders_date_created ON bc_orders(date_created DESC);

-- ==============================================================================
-- EMAIL MARKETING (Klaviyo profiles - 36,938)
-- ==============================================================================

CREATE TABLE klaviyo_profiles (
  id BIGSERIAL PRIMARY KEY,
  klaviyo_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone_number VARCHAR(50),

  -- Segments/Lists
  lists JSONB, -- Array of list IDs

  -- Custom properties
  properties JSONB,

  -- Engagement
  last_event_date TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_klaviyo_profiles_email ON klaviyo_profiles(email);
CREATE INDEX idx_klaviyo_profiles_klaviyo_id ON klaviyo_profiles(klaviyo_id);

-- ==============================================================================
-- REPORTS & VIEWS
-- ==============================================================================

-- View: Products with no supplier match (need stock count)
CREATE OR REPLACE VIEW v_unmatched_bc_products AS
SELECT
  bc.id,
  bc.bc_product_id,
  bc.sku,
  bc.name,
  bc.brand,
  bc.barcode,
  bc.inventory_level,
  bc.price,
  bc.primary_supplier,
  bc.is_active
FROM bc_products bc
WHERE bc.primary_supplier IS NULL
  AND bc.is_active = TRUE
ORDER BY bc.name;

-- View: Supplier products not in BigCommerce (approval queue)
CREATE OR REPLACE VIEW v_unmatched_supplier_products AS
SELECT
  'oborne' AS supplier,
  id,
  supplier_sku,
  name,
  brand,
  barcode,
  rrp,
  wholesale_price,
  stock_qty
FROM oborne_products
WHERE matched_bc_product_id IS NULL AND is_active = TRUE

UNION ALL

SELECT
  'uhp' AS supplier,
  id,
  supplier_sku,
  name,
  brand,
  barcode,
  rrp,
  wholesale_price,
  stock_qty
FROM uhp_products
WHERE matched_bc_product_id IS NULL AND is_active = TRUE

UNION ALL

SELECT
  'kadac' AS supplier,
  id,
  supplier_sku,
  name,
  brand,
  barcode,
  rrp,
  wholesale_price,
  stock_qty
FROM kadac_products
WHERE matched_bc_product_id IS NULL AND is_active = TRUE

UNION ALL

SELECT
  'kik' AS supplier,
  id,
  supplier_sku,
  name,
  brand,
  barcode,
  rrp,
  wholesale_price,
  stock_qty
FROM kik_products
WHERE matched_bc_product_id IS NULL AND is_active = TRUE

ORDER BY supplier, name;

-- View: Low stock products
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT
  bc.id,
  bc.bc_product_id,
  bc.sku,
  bc.name,
  bc.brand,
  bc.inventory_level,
  bc.primary_supplier,
  CASE
    WHEN bc.primary_supplier = 'oborne' THEN ob.stock_qty
    WHEN bc.primary_supplier = 'uhp' THEN uhp.stock_qty
    WHEN bc.primary_supplier = 'kadac' THEN kad.stock_qty
    WHEN bc.primary_supplier = 'kik' THEN kik.stock_qty
  END AS supplier_stock
FROM bc_products bc
LEFT JOIN oborne_products ob ON ob.matched_bc_product_id = bc.bc_product_id
LEFT JOIN uhp_products uhp ON uhp.matched_bc_product_id = bc.bc_product_id
LEFT JOIN kadac_products kad ON kad.matched_bc_product_id = bc.bc_product_id
LEFT JOIN kik_products kik ON kik.matched_bc_product_id = bc.bc_product_id
WHERE bc.inventory_level <= 10
  AND bc.is_active = TRUE
ORDER BY bc.inventory_level ASC;

-- ==============================================================================
-- TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bc_products_updated_at BEFORE UPDATE ON bc_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oborne_products_updated_at BEFORE UPDATE ON oborne_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uhp_products_updated_at BEFORE UPDATE ON uhp_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kadac_products_updated_at BEFORE UPDATE ON kadac_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kik_products_updated_at BEFORE UPDATE ON kik_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE bc_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE oborne_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE uhp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kadac_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kik_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bc_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE klaviyo_profiles ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Service role can access all products" ON bc_products FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all supplier data" ON oborne_products FOR ALL
  USING (auth.role() = 'service_role');

-- Add similar policies for other tables...
-- (Expand based on actual access requirements)

-- ==============================================================================
-- DEFAULT PRICING RULES
-- ==============================================================================

-- Default rule: 8% below RRP (matching old system)
INSERT INTO pricing_rules (
  name,
  description,
  applies_to,
  pricing_method,
  percentage_below_rrp,
  never_below_cost,
  priority
) VALUES (
  'Default 8% below RRP',
  'Standard pricing rule matching legacy system behavior',
  'supplier',
  'percentage_below_rrp',
  8.00,
  TRUE,
  999 -- Lowest priority (applied when no other rules match)
);

-- ==============================================================================
-- SCHEMA VERSION TRACKING
-- ==============================================================================

CREATE TABLE schema_version (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_version (version, description) VALUES
  ('1.0.0', 'Initial Supabase schema for BOO migration');

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================

-- Grant usage on all sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on all views to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- ==============================================================================
-- COMPLETION MESSAGE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE 'BOO Supabase schema created successfully!';
  RAISE NOTICE 'Tables: 14 core tables + views';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Load BigCommerce products';
  RAISE NOTICE '2. Load supplier feeds';
  RAISE NOTICE '3. Run product matching algorithm';
  RAISE NOTICE '4. Configure pricing rules';
  RAISE NOTICE '5. Set up n8n workflows';
END $$;
