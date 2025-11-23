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
