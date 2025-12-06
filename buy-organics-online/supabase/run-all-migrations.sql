-- Migration: Create ecommerce_products table
-- Description: Stores all BigCommerce product data
-- Run this in: Supabase SQL Editor (https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ecommerce_products table
CREATE TABLE IF NOT EXISTS ecommerce_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  sku VARCHAR(255) UNIQUE NOT NULL,
  name TEXT,
  price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  retail_price DECIMAL(10,2),
  inventory_level INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  availability VARCHAR(50),
  barcode VARCHAR(255),
  gtin VARCHAR(255),
  upc VARCHAR(255),
  ean VARCHAR(255),
  mpn VARCHAR(255),
  brand VARCHAR(255),
  weight DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  depth DECIMAL(10,2),
  categories JSONB,
  images JSONB,
  custom_fields JSONB,
  metadata JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ecommerce_sku ON ecommerce_products(sku);
CREATE INDEX IF NOT EXISTS idx_ecommerce_barcode ON ecommerce_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ecommerce_gtin ON ecommerce_products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ecommerce_upc ON ecommerce_products(upc) WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ecommerce_ean ON ecommerce_products(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ecommerce_product_id ON ecommerce_products(product_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_brand ON ecommerce_products(brand) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ecommerce_visible ON ecommerce_products(is_visible);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ecommerce_products_updated_at
    BEFORE UPDATE ON ecommerce_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE ecommerce_products IS 'Stores all BigCommerce product data synced from the BigCommerce API';
COMMENT ON COLUMN ecommerce_products.product_id IS 'BigCommerce product ID';
COMMENT ON COLUMN ecommerce_products.variant_id IS 'BigCommerce variant ID (if this is a variant)';
COMMENT ON COLUMN ecommerce_products.sku IS 'Product SKU (unique identifier)';
COMMENT ON COLUMN ecommerce_products.gtin IS 'Global Trade Item Number (barcode)';
COMMENT ON COLUMN ecommerce_products.metadata IS 'Additional BigCommerce fields stored as JSON';
-- Migration: Create supplier_products table
-- Description: Stores all supplier product data (Oborne, UHP, Kadac)
-- Run this in: Supabase SQL Editor

-- Create supplier_products table
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_name VARCHAR(50) NOT NULL,
  supplier_sku VARCHAR(255),
  barcode VARCHAR(255),
  product_name TEXT,
  brand VARCHAR(255),
  size VARCHAR(100),
  cost_price DECIMAL(10,2),
  rrp DECIMAL(10,2),
  wholesale_price DECIMAL(10,2),
  stock_level INTEGER,
  availability VARCHAR(50),
  moq INTEGER, -- Minimum order quantity
  cartononly VARCHAR(1), -- 'Y' or 'N'
  category VARCHAR(255),
  supplier_product_code VARCHAR(255),
  supplier_category VARCHAR(255),
  pack_size VARCHAR(100),
  unit_measure VARCHAR(50),
  metadata JSONB, -- Additional supplier-specific fields
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_supplier_barcode ON supplier_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_name_sku ON supplier_products(supplier_name, supplier_sku);
CREATE INDEX IF NOT EXISTS idx_supplier_name ON supplier_products(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_brand ON supplier_products(brand) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_availability ON supplier_products(availability);

-- Create unique constraint for supplier + SKU combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_unique_sku
  ON supplier_products(supplier_name, supplier_sku)
  WHERE supplier_sku IS NOT NULL;

-- Create updated_at trigger
CREATE TRIGGER update_supplier_products_updated_at
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE supplier_products IS 'Stores product data from all suppliers (Oborne, UHP, Kadac)';
COMMENT ON COLUMN supplier_products.supplier_name IS 'Supplier identifier: oborne, uhp, kadac';
COMMENT ON COLUMN supplier_products.barcode IS 'Product barcode/EAN - used for matching to ecommerce products';
COMMENT ON COLUMN supplier_products.cartononly IS 'Y = can only order by carton, N = can order individual units';
COMMENT ON COLUMN supplier_products.moq IS 'Minimum order quantity';
COMMENT ON COLUMN supplier_products.metadata IS 'Additional supplier-specific fields stored as JSON';

-- Create view for active supplier products (in stock)
CREATE OR REPLACE VIEW supplier_products_in_stock AS
SELECT * FROM supplier_products
WHERE stock_level > 0 AND (availability IS NULL OR availability != 'Discontinued');

COMMENT ON VIEW supplier_products_in_stock IS 'View of supplier products that are currently in stock';
-- Migration: Create product_supplier_links table
-- Description: Links ecommerce products to supplier products (many-to-many relationship)
-- Run this in: Supabase SQL Editor

-- Create product_supplier_links table
CREATE TABLE IF NOT EXISTS product_supplier_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecommerce_product_id UUID NOT NULL REFERENCES ecommerce_products(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
  supplier_name VARCHAR(50) NOT NULL,
  match_type VARCHAR(20) NOT NULL, -- 'sku_direct', 'barcode', 'manual'
  is_active BOOLEAN DEFAULT FALSE, -- TRUE = this supplier is currently used for pricing/stock
  priority INTEGER DEFAULT 999, -- Lower number = higher priority (1, 2, 3, ...)
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00 (for future fuzzy matching)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_links_ecommerce ON product_supplier_links(ecommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_links_supplier ON product_supplier_links(supplier_product_id);
CREATE INDEX IF NOT EXISTS idx_links_active ON product_supplier_links(ecommerce_product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_links_supplier_name ON product_supplier_links(supplier_name);
CREATE INDEX IF NOT EXISTS idx_links_match_type ON product_supplier_links(match_type);

-- Ensure unique combination of ecommerce product + supplier product
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique_pair
  ON product_supplier_links(ecommerce_product_id, supplier_product_id);

-- Constraint: Only one active supplier per ecommerce product
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_one_active_per_product
  ON product_supplier_links(ecommerce_product_id)
  WHERE is_active = TRUE;

-- Create updated_at trigger
CREATE TRIGGER update_product_supplier_links_updated_at
    BEFORE UPDATE ON product_supplier_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE product_supplier_links IS 'Links ecommerce products to their supplier sources';
COMMENT ON COLUMN product_supplier_links.match_type IS 'How the link was created: sku_direct (BC SKU = supplier), barcode (matched by barcode), manual (user-created)';
COMMENT ON COLUMN product_supplier_links.is_active IS 'TRUE = this supplier is currently used for pricing and stock updates';
COMMENT ON COLUMN product_supplier_links.priority IS 'Fallback order (1=first choice, 2=second choice, etc.)';

-- Create view: Products with multiple suppliers
CREATE OR REPLACE VIEW products_with_multiple_suppliers AS
SELECT
  e.id,
  e.sku,
  e.name,
  e.barcode,
  COUNT(l.id) as supplier_count,
  ARRAY_AGG(l.supplier_name ORDER BY l.priority) as suppliers,
  MAX(CASE WHEN l.is_active THEN l.supplier_name ELSE NULL END) as active_supplier
FROM ecommerce_products e
INNER JOIN product_supplier_links l ON e.id = l.ecommerce_product_id
GROUP BY e.id, e.sku, e.name, e.barcode
HAVING COUNT(l.id) > 1;

COMMENT ON VIEW products_with_multiple_suppliers IS 'Products that have multiple supplier sources (need manual review for priority)';

-- Create view: Products with no supplier
CREATE OR REPLACE VIEW products_without_supplier AS
SELECT
  e.id,
  e.sku,
  e.name,
  e.barcode,
  e.brand,
  e.is_visible,
  e.inventory_level
FROM ecommerce_products e
WHERE NOT EXISTS (
  SELECT 1 FROM product_supplier_links l WHERE l.ecommerce_product_id = e.id
);

COMMENT ON VIEW products_without_supplier IS 'Products that have no supplier links (potential stock issues)';

-- Create view: Active product-supplier pairs
CREATE OR REPLACE VIEW active_product_supplier_pairs AS
SELECT
  e.id as ecommerce_id,
  e.sku as ecommerce_sku,
  e.name as ecommerce_name,
  e.price as ecommerce_price,
  e.inventory_level as ecommerce_stock,
  s.id as supplier_id,
  s.supplier_name,
  s.supplier_sku,
  s.cost_price as supplier_cost,
  s.rrp as supplier_rrp,
  s.stock_level as supplier_stock,
  s.availability as supplier_availability,
  l.match_type,
  l.priority
FROM ecommerce_products e
INNER JOIN product_supplier_links l ON e.id = l.ecommerce_product_id
INNER JOIN supplier_products s ON l.supplier_product_id = s.id
WHERE l.is_active = TRUE;

COMMENT ON VIEW active_product_supplier_pairs IS 'All products with their active supplier details';
-- Migration: Create helper tables for automation and auditing
-- Description: Automation logs, pricing rules, supplier priority changes
-- Run this in: Supabase SQL Editor

-- Table: automation_logs
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_name VARCHAR(100) NOT NULL,
  workflow_type VARCHAR(50), -- 'supplier_sync', 'product_sync', 'pricing_update', 'linking'
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'warning', 'running'
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_automation_workflow ON automation_logs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_automation_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_started ON automation_logs(started_at DESC);

COMMENT ON TABLE automation_logs IS 'Logs all n8n workflow executions for monitoring and debugging';

-- Table: pricing_rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'default_markup', 'carton_only', 'supplier_discount'
  priority INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB, -- Rule conditions (e.g., {"cartononly": "Y"})
  formula TEXT, -- Pricing formula (e.g., "price = moq * rrp")
  supplier_discount_pct DECIMAL(5,2), -- Supplier-specific discount percentage
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active, priority);

COMMENT ON TABLE pricing_rules IS 'Configurable pricing formulas for calculating product prices';

-- Insert default pricing rules
INSERT INTO pricing_rules (rule_name, rule_type, priority, formula, description) VALUES
('Carton Only', 'carton_only', 1, 'price = moq * rrp', 'For products that can only be ordered by carton'),
('Default Markup', 'default_markup', 2, 'price = cost * 1.4', 'Default 40% markup on cost price'),
('Oborne Discount', 'supplier_discount', 3, 'sale_price = rrp - (rrp * 0.07)', 'Oborne supplier discount: 7%'),
('Kadac Discount', 'supplier_discount', 4, 'sale_price = rrp - (rrp * 0.10)', 'Kadac supplier discount: 10%'),
('UHP Discount', 'supplier_discount', 5, 'sale_price = rrp - (rrp * 0.10)', 'UHP supplier discount: 10%')
ON CONFLICT DO NOTHING;

-- Table: supplier_priority_changes (audit log)
CREATE TABLE IF NOT EXISTS supplier_priority_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ecommerce_product_id UUID REFERENCES ecommerce_products(id) ON DELETE CASCADE,
  ecommerce_sku VARCHAR(255),
  previous_supplier VARCHAR(50),
  new_supplier VARCHAR(50),
  previous_priority INTEGER,
  new_priority INTEGER,
  changed_by VARCHAR(100), -- User email or 'system'
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_priority_changes_product ON supplier_priority_changes(ecommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_priority_changes_date ON supplier_priority_changes(changed_at DESC);

COMMENT ON TABLE supplier_priority_changes IS 'Audit log of all supplier priority changes (manual or automatic)';

-- Table: sync_history (track last successful sync times)
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type VARCHAR(50) NOT NULL, -- 'bigcommerce', 'oborne', 'uhp', 'kadac'
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  last_attempted_sync TIMESTAMP WITH TIME ZONE,
  records_synced INTEGER,
  status VARCHAR(20), -- 'success', 'failed'
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_history_type ON sync_history(sync_type);

COMMENT ON TABLE sync_history IS 'Tracks last sync times and status for all integrations';

-- Insert initial sync history records
INSERT INTO sync_history (sync_type, status) VALUES
('bigcommerce', 'pending'),
('oborne', 'pending'),
('uhp', 'pending'),
('kadac', 'pending')
ON CONFLICT DO NOTHING;

-- Create view: Recent automation activity
CREATE OR REPLACE VIEW recent_automation_activity AS
SELECT
  workflow_name,
  workflow_type,
  status,
  records_processed,
  records_updated,
  execution_time_ms,
  started_at,
  completed_at
FROM automation_logs
ORDER BY started_at DESC
LIMIT 100;

COMMENT ON VIEW recent_automation_activity IS 'Recent workflow executions for monitoring dashboard';
