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
