-- Add is_clearance field to ecommerce_products
-- Run in: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

-- Add the column
ALTER TABLE ecommerce_products
ADD COLUMN IF NOT EXISTS is_clearance BOOLEAN DEFAULT FALSE;

-- Populate based on SKU patterns (Copy of or sale in SKU)
UPDATE ecommerce_products
SET is_clearance = TRUE
WHERE LOWER(sku) LIKE 'copy of%'
   OR LOWER(sku) LIKE '%sale%';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_is_clearance
ON ecommerce_products(is_clearance) WHERE is_clearance = TRUE;

-- Add comment
COMMENT ON COLUMN ecommerce_products.is_clearance IS 'True if product is a clearance/sale item (SKU contains "Copy of" or "sale"). These are manually managed and excluded from auto-availability updates.';
