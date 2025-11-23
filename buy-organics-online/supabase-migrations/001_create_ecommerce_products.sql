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
