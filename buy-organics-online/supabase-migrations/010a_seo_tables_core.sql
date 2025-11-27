-- Part 1: Core SEO Tables (run first)
-- Creates: seo_categories, seo_brands, seo_products

-- First, create the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bc_category_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    slug TEXT,
    parent_id UUID REFERENCES seo_categories(id),
    url TEXT,
    description TEXT,
    meta_title TEXT,
    meta_description TEXT,
    product_count INTEGER DEFAULT 0,
    active_product_count INTEGER DEFAULT 0,
    depth INTEGER DEFAULT 0,
    primary_keyword TEXT,
    search_volume INTEGER,
    keyword_difficulty INTEGER,
    current_position DECIMAL(5,2),
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    has_description BOOLEAN DEFAULT FALSE,
    description_word_count INTEGER DEFAULT 0,
    has_health_claims BOOLEAN DEFAULT FALSE,
    health_claims_status TEXT,
    content_quality_score INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'empty', 'sparse', 'overstuffed', 'duplicate', 'new', 'archived'
    )),
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_categories_bc_id ON seo_categories(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_seo_categories_parent ON seo_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_seo_categories_status ON seo_categories(status);

-- ============================================
-- BRANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bc_brand_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    slug TEXT,
    url TEXT,
    description TEXT,
    story TEXT,
    values TEXT,
    certifications JSONB DEFAULT '[]',
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    content_status TEXT DEFAULT 'unknown' CHECK (content_status IN (
        'unknown', 'no_content', 'needs_update', 'standard_format', 'pending_review', 'approved'
    )),
    generated_content TEXT,
    last_content_update TIMESTAMPTZ,
    product_count INTEGER DEFAULT 0,
    active_product_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_brands_bc_id ON seo_brands(bc_brand_id);
CREATE INDEX IF NOT EXISTS idx_seo_brands_content_status ON seo_brands(content_status);

-- ============================================
-- PRODUCTS SEO TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecommerce_product_id UUID REFERENCES ecommerce_products(id) UNIQUE,
    bc_product_id INTEGER,
    url TEXT,
    primary_category_id UUID REFERENCES seo_categories(id),
    category_ids JSONB DEFAULT '[]',
    classification_status TEXT DEFAULT 'unreviewed' CHECK (classification_status IN (
        'unreviewed', 'auto_classified', 'confirmed', 'needs_review', 'miscategorized'
    )),
    suggested_categories JSONB DEFAULT '[]',
    classification_confidence DECIMAL(3,2),
    has_description BOOLEAN DEFAULT FALSE,
    description_word_count INTEGER DEFAULT 0,
    has_images BOOLEAN DEFAULT FALSE,
    image_count INTEGER DEFAULT 0,
    has_price BOOLEAN DEFAULT FALSE,
    has_sku BOOLEAN DEFAULT FALSE,
    has_brand BOOLEAN DEFAULT FALSE,
    has_barcode BOOLEAN DEFAULT FALSE,
    data_quality_score INTEGER,
    primary_keyword TEXT,
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),
    has_health_claims BOOLEAN DEFAULT FALSE,
    health_claims_status TEXT,
    content_quality_score INTEGER,
    content_status TEXT DEFAULT 'unknown' CHECK (content_status IN (
        'unknown', 'no_description', 'needs_format', 'standard_format', 'pending_review', 'approved'
    )),
    format_detected TEXT,
    generated_description TEXT,
    reformatted_description TEXT,
    seo_status TEXT DEFAULT 'not_optimized' CHECK (seo_status IN (
        'not_optimized', 'needs_classification', 'needs_content', 'needs_research',
        'optimizing', 'optimized', 'monitoring'
    )),
    last_classified_at TIMESTAMPTZ,
    last_optimized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_products_ecommerce ON seo_products(ecommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_seo_products_bc_id ON seo_products(bc_product_id);
CREATE INDEX IF NOT EXISTS idx_seo_products_classification ON seo_products(classification_status);
CREATE INDEX IF NOT EXISTS idx_seo_products_content ON seo_products(content_status);
CREATE INDEX IF NOT EXISTS idx_seo_products_seo ON seo_products(seo_status);
