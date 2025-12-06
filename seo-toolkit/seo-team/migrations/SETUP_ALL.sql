-- =============================================================================
-- SEO TEAM COMPLETE SETUP
-- Run this ONCE in Supabase SQL Editor to enable all SEO functionality
-- https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new
-- =============================================================================

-- ============================================================================
-- PART 1: Create exec_sql function for future automatic migrations
-- ============================================================================

CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    EXECUTE sql_query;
    result := jsonb_build_object('success', true, 'message', 'SQL executed successfully');
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
COMMENT ON FUNCTION exec_sql IS 'Execute arbitrary SQL - service_role only. Use for migrations.';

-- ============================================================================
-- PART 2: Create enriched_products table
-- ============================================================================

CREATE TABLE IF NOT EXISTS enriched_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ecommerce_product_id UUID REFERENCES ecommerce_products(id),
    supplier_product_id UUID REFERENCES supplier_products(id),
    barcode VARCHAR(50),

    -- Dietary flags
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

    -- Content
    ingredients TEXT,
    short_description TEXT,
    usage_instructions TEXT,
    warnings TEXT,
    storage_instructions TEXT,

    -- Images
    primary_image_url TEXT,
    secondary_images JSONB DEFAULT '[]'::jsonb,
    nutrition_panel_url TEXT,

    -- Classification
    supplier_category VARCHAR(255),
    suggested_bc_categories INTEGER[] DEFAULT '{}',
    product_type VARCHAR(100),

    -- Dimensions
    weight_kg DECIMAL(10, 4),
    width_mm DECIMAL(10, 2),
    height_mm DECIMAL(10, 2),
    length_mm DECIMAL(10, 2),

    -- Supplier info
    primary_supplier VARCHAR(50),
    supplier_sku VARCHAR(100),
    cost_price DECIMAL(10, 2),
    rrp DECIMAL(10, 2),
    stock_level INTEGER,
    moq INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    on_deal BOOLEAN DEFAULT FALSE,
    is_clearance BOOLEAN DEFAULT FALSE,

    -- Meta
    enrichment_source VARCHAR(50),
    enrichment_score INTEGER DEFAULT 0,
    enrichment_version INTEGER DEFAULT 1,
    raw_enrichment JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_enriched_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_enriched_barcode UNIQUE (barcode)
);

CREATE INDEX IF NOT EXISTS idx_enriched_barcode ON enriched_products(barcode);
CREATE INDEX IF NOT EXISTS idx_enriched_supplier ON enriched_products(primary_supplier);
CREATE INDEX IF NOT EXISTS idx_enriched_score ON enriched_products(enrichment_score DESC);

-- ============================================================================
-- PART 3: Create SEO content queue table
-- ============================================================================

CREATE TABLE IF NOT EXISTS seo_content_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL, -- 'product', 'category', 'brand'
    content_id UUID NOT NULL,
    priority INTEGER DEFAULT 0,
    impressions_30d INTEGER DEFAULT 0,
    current_content TEXT,
    proposed_content TEXT,
    proposed_at TIMESTAMPTZ,
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    optimization_type VARCHAR(50), -- 'content', 'format', 'meta'
    target_keyword VARCHAR(255),
    pubmed_research TEXT[],
    status VARCHAR(20) DEFAULT 'pending', -- pending, drafting, review, approved, applied
    category VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, content_type)
);

CREATE INDEX IF NOT EXISTS idx_seo_queue_status ON seo_content_queue(status);
CREATE INDEX IF NOT EXISTS idx_seo_queue_priority ON seo_content_queue(priority DESC);

-- ============================================================================
-- PART 4: Create SEO agent logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS seo_agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_logs_agent ON seo_agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_seo_logs_created ON seo_agent_logs(created_at DESC);

-- ============================================================================
-- PART 5: Enable RLS
-- ============================================================================

ALTER TABLE enriched_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access enriched" ON enriched_products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access queue" ON seo_content_queue FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access logs" ON seo_agent_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Setup complete!' as status,
       (SELECT count(*) FROM information_schema.tables WHERE table_name = 'enriched_products') as enriched_products,
       (SELECT count(*) FROM information_schema.tables WHERE table_name = 'seo_content_queue') as seo_content_queue,
       (SELECT count(*) FROM information_schema.tables WHERE table_name = 'seo_agent_logs') as seo_agent_logs;
