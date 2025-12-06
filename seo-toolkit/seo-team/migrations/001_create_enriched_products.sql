-- Enriched Products Table
-- Stores standardized product data from all supplier sources
-- Run this migration in Supabase SQL Editor

-- Create the enriched_products table
CREATE TABLE IF NOT EXISTS enriched_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to ecommerce product (BC product)
    ecommerce_product_id INTEGER REFERENCES ecommerce_products(id),

    -- Link to supplier product
    supplier_product_id INTEGER REFERENCES supplier_products(id),

    -- Barcode for cross-referencing
    barcode VARCHAR(50),

    -- === DIETARY FLAGS ===
    is_vegan BOOLEAN DEFAULT FALSE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    is_dairy_free BOOLEAN DEFAULT FALSE,
    is_organic BOOLEAN DEFAULT FALSE,
    is_certified_organic BOOLEAN DEFAULT FALSE,
    is_raw BOOLEAN DEFAULT FALSE,
    is_keto BOOLEAN DEFAULT FALSE,
    is_paleo BOOLEAN DEFAULT FALSE,
    is_sugar_free BOOLEAN DEFAULT FALSE,
    is_nut_free BOOLEAN DEFAULT FALSE,
    is_soy_free BOOLEAN DEFAULT FALSE,

    -- === CONTENT ===
    ingredients TEXT,
    short_description TEXT,
    usage_instructions TEXT,
    warnings TEXT,
    storage_instructions TEXT,

    -- === IMAGES ===
    primary_image_url TEXT,
    secondary_images JSONB DEFAULT '[]'::jsonb,
    nutrition_panel_url TEXT,

    -- === CLASSIFICATION ===
    supplier_category VARCHAR(255),
    suggested_bc_categories INTEGER[] DEFAULT '{}',
    product_type VARCHAR(100), -- supplement, food, personal_care, etc.

    -- === DIMENSIONS ===
    weight_kg DECIMAL(10, 4),
    width_mm DECIMAL(10, 2),
    height_mm DECIMAL(10, 2),
    length_mm DECIMAL(10, 2),

    -- === SUPPLIER INFO (denormalized for quick access) ===
    primary_supplier VARCHAR(50),
    supplier_sku VARCHAR(100),
    cost_price DECIMAL(10, 2),
    rrp DECIMAL(10, 2),
    stock_level INTEGER,
    moq INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    on_deal BOOLEAN DEFAULT FALSE,
    is_clearance BOOLEAN DEFAULT FALSE,

    -- === META ===
    enrichment_source VARCHAR(50), -- which supplier provided most data
    enrichment_score INTEGER DEFAULT 0, -- 0-100 completeness score
    enrichment_version INTEGER DEFAULT 1,

    -- Raw enrichment data from all sources
    raw_enrichment JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_enriched_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_ecommerce_product UNIQUE (ecommerce_product_id),
    CONSTRAINT unique_barcode UNIQUE (barcode)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_enriched_products_barcode ON enriched_products(barcode);
CREATE INDEX IF NOT EXISTS idx_enriched_products_supplier ON enriched_products(primary_supplier);
CREATE INDEX IF NOT EXISTS idx_enriched_products_type ON enriched_products(product_type);
CREATE INDEX IF NOT EXISTS idx_enriched_products_score ON enriched_products(enrichment_score DESC);

-- Dietary flag indexes for filtering
CREATE INDEX IF NOT EXISTS idx_enriched_products_vegan ON enriched_products(is_vegan) WHERE is_vegan = TRUE;
CREATE INDEX IF NOT EXISTS idx_enriched_products_gluten_free ON enriched_products(is_gluten_free) WHERE is_gluten_free = TRUE;
CREATE INDEX IF NOT EXISTS idx_enriched_products_organic ON enriched_products(is_organic) WHERE is_organic = TRUE;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_enriched_products_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enriched_products_updated ON enriched_products;
CREATE TRIGGER trigger_enriched_products_updated
    BEFORE UPDATE ON enriched_products
    FOR EACH ROW
    EXECUTE FUNCTION update_enriched_products_timestamp();

-- Add RLS policies
ALTER TABLE enriched_products ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to enriched_products"
    ON enriched_products
    FOR ALL
    USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE enriched_products IS 'Standardized product enrichment data aggregated from all supplier sources';
COMMENT ON COLUMN enriched_products.enrichment_score IS 'Data completeness score 0-100, higher = more complete data';
COMMENT ON COLUMN enriched_products.raw_enrichment IS 'Full enrichment data from schema mapping for audit/debugging';
