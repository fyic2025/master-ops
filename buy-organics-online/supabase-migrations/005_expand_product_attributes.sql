-- Migration: Expand ecommerce_products with ALL BigCommerce product attributes
-- Description: Adds missing BigCommerce fields to ensure complete product data capture
-- Run this in: Supabase SQL Editor (https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new)

-- =============================================================================
-- PART 1: Add Product Type & Description Fields
-- =============================================================================

-- Product type (physical or digital)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'physical';

-- Full product description (HTML allowed)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS description TEXT;

-- Product condition
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'New';
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_condition_shown BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- PART 2: Add SEO & Marketing Fields
-- =============================================================================

-- Page/SEO fields
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS page_title VARCHAR(500);
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS meta_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS search_keywords TEXT;

-- Open Graph fields for social sharing
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_type VARCHAR(50) DEFAULT 'product';
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_title VARCHAR(500);
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_description TEXT;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_use_meta_description BOOLEAN DEFAULT TRUE;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_use_product_name BOOLEAN DEFAULT TRUE;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_use_image BOOLEAN DEFAULT TRUE;

-- Custom URL for product
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS custom_url JSONB;

-- =============================================================================
-- PART 3: Add Additional Pricing Fields
-- =============================================================================

-- MAP (Minimum Advertised Price)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS map_price DECIMAL(10,2);

-- Calculated price (after discounts/rules)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2);

-- Price visibility
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_price_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS price_hidden_label VARCHAR(255);

-- =============================================================================
-- PART 4: Add Tax Fields
-- =============================================================================

ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS tax_class_id INTEGER;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS product_tax_code VARCHAR(100);

-- =============================================================================
-- PART 5: Add Inventory & Tracking Fields
-- =============================================================================

-- Inventory tracking type (none, product, variant)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS inventory_tracking VARCHAR(20) DEFAULT 'product';
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS inventory_warning_level INTEGER DEFAULT 0;

-- =============================================================================
-- PART 6: Add Ordering & Display Fields
-- =============================================================================

-- Order quantity limits
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS order_quantity_minimum INTEGER DEFAULT 1;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS order_quantity_maximum INTEGER DEFAULT 0;

-- Sort order and featured status
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Related products array
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS related_products JSONB DEFAULT '[]'::jsonb;

-- Warranty information
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS warranty TEXT;

-- Layout/template file
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS layout_file VARCHAR(255);

-- =============================================================================
-- PART 7: Add Shipping Fields
-- =============================================================================

ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN DEFAULT FALSE;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS fixed_cost_shipping_price DECIMAL(10,2);

-- =============================================================================
-- PART 8: Add Preorder Fields
-- =============================================================================

ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_preorder_only BOOLEAN DEFAULT FALSE;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS preorder_release_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS preorder_message TEXT;

-- Availability description for preorder/backorder items
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS availability_description TEXT;

-- =============================================================================
-- PART 9: Add Statistics & Analytics Fields
-- =============================================================================

-- View count
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Reviews data
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS reviews_rating_sum DECIMAL(5,2) DEFAULT 0;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- Sales data
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;

-- =============================================================================
-- PART 10: Add Gift Wrapping Fields
-- =============================================================================

ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS gift_wrapping_options_type VARCHAR(50);
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS gift_wrapping_options_list JSONB DEFAULT '[]'::jsonb;

-- =============================================================================
-- PART 11: Add Brand ID and Base Variant
-- =============================================================================

-- Brand ID (in addition to brand name)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS brand_id INTEGER;

-- Base variant ID for products with variants
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS base_variant_id INTEGER;

-- =============================================================================
-- PART 12: Add Sub-Resource JSONB Fields
-- =============================================================================

-- Videos array
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;

-- Bulk pricing rules
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS bulk_pricing_rules JSONB DEFAULT '[]'::jsonb;

-- Product options (for configurable products)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

-- Product modifiers
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]'::jsonb;

-- Product variants (for products with multiple variants)
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- =============================================================================
-- PART 13: Add BigCommerce Date Fields
-- =============================================================================

-- Original creation and modification dates from BigCommerce
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS bc_date_created TIMESTAMP WITH TIME ZONE;
ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS bc_date_modified TIMESTAMP WITH TIME ZONE;

-- =============================================================================
-- PART 14: Create Additional Indexes for New Fields
-- =============================================================================

-- Index for featured products
CREATE INDEX IF NOT EXISTS idx_ecommerce_featured ON ecommerce_products(is_featured) WHERE is_featured = TRUE;

-- Index for free shipping products
CREATE INDEX IF NOT EXISTS idx_ecommerce_free_shipping ON ecommerce_products(is_free_shipping) WHERE is_free_shipping = TRUE;

-- Index for preorder products
CREATE INDEX IF NOT EXISTS idx_ecommerce_preorder ON ecommerce_products(is_preorder_only) WHERE is_preorder_only = TRUE;

-- Index for product type
CREATE INDEX IF NOT EXISTS idx_ecommerce_type ON ecommerce_products(type);

-- Index for inventory tracking
CREATE INDEX IF NOT EXISTS idx_ecommerce_inventory_tracking ON ecommerce_products(inventory_tracking);

-- Index for brand_id
CREATE INDEX IF NOT EXISTS idx_ecommerce_brand_id ON ecommerce_products(brand_id) WHERE brand_id IS NOT NULL;

-- Index for sort order
CREATE INDEX IF NOT EXISTS idx_ecommerce_sort_order ON ecommerce_products(sort_order);

-- Index for BigCommerce dates
CREATE INDEX IF NOT EXISTS idx_ecommerce_bc_date_modified ON ecommerce_products(bc_date_modified);

-- Full-text search index on name and description
CREATE INDEX IF NOT EXISTS idx_ecommerce_search ON ecommerce_products
  USING gin(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- =============================================================================
-- PART 15: Migrate Existing Data from metadata JSONB to dedicated columns
-- =============================================================================

-- Extract data from metadata column to new dedicated columns
UPDATE ecommerce_products
SET
  type = COALESCE(metadata->>'type', type),
  description = COALESCE(metadata->>'description', description),
  condition = COALESCE(metadata->>'condition', condition),
  page_title = COALESCE(metadata->>'page_title', page_title),
  meta_description = COALESCE(metadata->>'meta_description', meta_description),
  sort_order = COALESCE((metadata->>'sort_order')::INTEGER, sort_order),
  -- bin_picking_number stays in metadata as it's rarely queried
  updated_at = NOW()
WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb;

-- =============================================================================
-- PART 16: Add Comments for Documentation
-- =============================================================================

COMMENT ON COLUMN ecommerce_products.type IS 'Product type: physical or digital';
COMMENT ON COLUMN ecommerce_products.description IS 'Full HTML product description';
COMMENT ON COLUMN ecommerce_products.condition IS 'Product condition: New, Used, Refurbished';
COMMENT ON COLUMN ecommerce_products.page_title IS 'SEO page title';
COMMENT ON COLUMN ecommerce_products.meta_description IS 'SEO meta description';
COMMENT ON COLUMN ecommerce_products.search_keywords IS 'Search keywords for internal search';
COMMENT ON COLUMN ecommerce_products.is_featured IS 'Whether product is featured on storefront';
COMMENT ON COLUMN ecommerce_products.is_free_shipping IS 'Whether product ships free';
COMMENT ON COLUMN ecommerce_products.inventory_tracking IS 'Tracking type: none, product, variant';
COMMENT ON COLUMN ecommerce_products.variants IS 'Product variants with all their attributes';
COMMENT ON COLUMN ecommerce_products.options IS 'Product options (size, color, etc.)';
COMMENT ON COLUMN ecommerce_products.modifiers IS 'Product modifiers (engravings, etc.)';
COMMENT ON COLUMN ecommerce_products.bulk_pricing_rules IS 'Volume discount rules';
COMMENT ON COLUMN ecommerce_products.videos IS 'Product videos from BigCommerce';
COMMENT ON COLUMN ecommerce_products.bc_date_created IS 'Original product creation date in BigCommerce';
COMMENT ON COLUMN ecommerce_products.bc_date_modified IS 'Last modification date in BigCommerce';

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Total new columns added: 47
-- This migration ensures all BigCommerce product fields are captured
