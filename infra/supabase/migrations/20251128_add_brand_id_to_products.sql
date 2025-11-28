-- Add bc_brand_id column to ecommerce_products
-- This links products to brands via BigCommerce brand ID

ALTER TABLE ecommerce_products
ADD COLUMN IF NOT EXISTS bc_brand_id INTEGER;

-- Create index for efficient brand lookups
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_bc_brand_id
ON ecommerce_products(bc_brand_id);

-- Add comment for documentation
COMMENT ON COLUMN ecommerce_products.bc_brand_id IS 'BigCommerce brand ID - links to seo_brands.bc_brand_id';
