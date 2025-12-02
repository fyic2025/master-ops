-- Elevate Wholesale Products with RRP tracking
-- Used to sync RRP data from multiple sources to Elevate Shopify

CREATE TABLE IF NOT EXISTS elevate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevate_product_id BIGINT NOT NULL,
  elevate_variant_id BIGINT NOT NULL UNIQUE,
  sku TEXT,
  title TEXT,
  variant_title TEXT,
  vendor TEXT,
  wholesale_price DECIMAL(10,2),
  rrp DECIMAL(10,2),              -- The RRP to display on Elevate
  rrp_source TEXT,                -- 'teelixir_shopify', 'csv_import', 'manual'
  shopify_metafield_id BIGINT,    -- Track if metafield was created in Shopify
  last_synced_at TIMESTAMPTZ,
  last_rrp_pushed_at TIMESTAMPTZ, -- When RRP was last pushed to Shopify
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_elevate_products_sku ON elevate_products(sku);
CREATE INDEX IF NOT EXISTS idx_elevate_products_vendor ON elevate_products(vendor);
CREATE INDEX IF NOT EXISTS idx_elevate_products_rrp_null ON elevate_products(rrp) WHERE rrp IS NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_elevate_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_elevate_products_updated_at ON elevate_products;
CREATE TRIGGER trigger_elevate_products_updated_at
  BEFORE UPDATE ON elevate_products
  FOR EACH ROW
  EXECUTE FUNCTION update_elevate_products_updated_at();

-- Comments
COMMENT ON TABLE elevate_products IS 'Elevate Wholesale products with RRP tracking';
COMMENT ON COLUMN elevate_products.rrp IS 'Recommended Retail Price to display on Elevate';
COMMENT ON COLUMN elevate_products.rrp_source IS 'Source of RRP: teelixir_shopify, csv_import, or manual';
