-- Migration: Create SEO Team Schema
-- Description: Tables for SEO AI Team nightly automation
-- Run this in: Supabase SQL Editor
-- Version: 1.0.0
-- Date: 2025-11-26

-- ============================================
-- CATEGORIES TABLE (BigCommerce categories)
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

    -- Category metrics
    product_count INTEGER DEFAULT 0,
    active_product_count INTEGER DEFAULT 0,
    depth INTEGER DEFAULT 0,

    -- SEO metrics
    primary_keyword TEXT,
    search_volume INTEGER,
    keyword_difficulty INTEGER,
    current_position DECIMAL(5,2),
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,

    -- Content quality
    has_description BOOLEAN DEFAULT FALSE,
    description_word_count INTEGER DEFAULT 0,
    has_health_claims BOOLEAN DEFAULT FALSE,
    health_claims_status TEXT,
    content_quality_score INTEGER,

    -- Category health
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
-- BRANDS TABLE (for brand pages)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bc_brand_id INTEGER UNIQUE,
    name TEXT NOT NULL UNIQUE,
    slug TEXT,
    url TEXT,

    -- Brand content
    description TEXT,
    story TEXT,
    values TEXT,
    certifications JSONB DEFAULT '[]',

    -- SEO metrics (from GSC)
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),

    -- Content status
    content_status TEXT DEFAULT 'unknown' CHECK (content_status IN (
        'unknown', 'no_content', 'needs_update', 'standard_format', 'pending_review', 'approved'
    )),
    generated_content TEXT,
    last_content_update TIMESTAMPTZ,

    -- Product stats
    product_count INTEGER DEFAULT 0,
    active_product_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_brands_name ON seo_brands(name);
CREATE INDEX IF NOT EXISTS idx_seo_brands_content_status ON seo_brands(content_status);

-- ============================================
-- PRODUCT SEO & QUALITY TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS seo_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ecommerce_product_id UUID REFERENCES ecommerce_products(id) UNIQUE,
    bc_product_id INTEGER,
    url TEXT,

    -- Category assignment
    primary_category_id UUID REFERENCES seo_categories(id),
    category_ids JSONB DEFAULT '[]',

    -- Classification status
    classification_status TEXT DEFAULT 'unreviewed' CHECK (classification_status IN (
        'unreviewed', 'auto_classified', 'confirmed', 'needs_review', 'miscategorized'
    )),
    suggested_categories JSONB DEFAULT '[]',
    classification_confidence DECIMAL(3,2),

    -- Product data quality
    has_description BOOLEAN DEFAULT FALSE,
    description_word_count INTEGER DEFAULT 0,
    has_images BOOLEAN DEFAULT FALSE,
    image_count INTEGER DEFAULT 0,
    has_price BOOLEAN DEFAULT FALSE,
    has_sku BOOLEAN DEFAULT FALSE,
    has_brand BOOLEAN DEFAULT FALSE,
    has_barcode BOOLEAN DEFAULT FALSE,
    data_quality_score INTEGER,

    -- SEO metrics (from GSC)
    primary_keyword TEXT,
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),

    -- Content status
    has_health_claims BOOLEAN DEFAULT FALSE,
    health_claims_status TEXT,
    content_quality_score INTEGER,

    -- Content format tracking
    content_status TEXT DEFAULT 'unknown' CHECK (content_status IN (
        'unknown', 'no_description', 'needs_format', 'standard_format', 'pending_review', 'approved'
    )),
    format_detected TEXT,
    generated_description TEXT,
    reformatted_description TEXT,

    -- Optimization status
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
CREATE INDEX IF NOT EXISTS idx_seo_products_category ON seo_products(primary_category_id);

-- ============================================
-- NEW PRODUCTS STAGING (4000+ to add)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_products_staging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    source_sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    barcode TEXT,

    -- AI Classification
    suggested_categories JSONB DEFAULT '[]',
    classification_confidence DECIMAL(3,2),
    needs_new_category BOOLEAN DEFAULT FALSE,
    suggested_new_category TEXT,

    -- Matching to existing
    matched_product_id UUID REFERENCES ecommerce_products(id),
    match_type TEXT,
    match_confidence DECIMAL(3,2),

    -- Processing status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'classified', 'ready_to_add', 'added', 'duplicate', 'rejected'
    )),

    processed_at TIMESTAMPTZ,
    added_to_bc_at TIMESTAMPTZ,
    bc_product_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_status ON seo_products_staging(status);
CREATE INDEX IF NOT EXISTS idx_staging_source ON seo_products_staging(source);
CREATE INDEX IF NOT EXISTS idx_staging_barcode ON seo_products_staging(barcode) WHERE barcode IS NOT NULL;

-- ============================================
-- CATEGORY SUGGESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS seo_category_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggested_name TEXT NOT NULL,
    suggested_parent_id UUID REFERENCES seo_categories(id),
    reason TEXT,
    product_count INTEGER DEFAULT 0,
    source TEXT,
    sample_products JSONB DEFAULT '[]',
    related_keywords JSONB DEFAULT '[]',

    status TEXT DEFAULT 'suggested' CHECK (status IN (
        'suggested', 'approved', 'created', 'rejected'
    )),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_category_id UUID REFERENCES seo_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_category_suggestions_status ON seo_category_suggestions(status);

-- ============================================
-- GSC DATA
-- ============================================
CREATE TABLE IF NOT EXISTS seo_gsc_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    page_type TEXT,
    ecommerce_product_id UUID REFERENCES ecommerce_products(id),
    category_id UUID REFERENCES seo_categories(id),
    brand_id UUID REFERENCES seo_brands(id),

    -- Index status
    index_status TEXT,
    last_crawled_at DATE,

    -- Traffic metrics
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),

    first_seen DATE,
    last_updated DATE
);

CREATE INDEX IF NOT EXISTS idx_gsc_pages_url ON seo_gsc_pages(url);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_product ON seo_gsc_pages(ecommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_type ON seo_gsc_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_impressions ON seo_gsc_pages(impressions_30d DESC);

CREATE TABLE IF NOT EXISTS seo_gsc_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID REFERENCES seo_gsc_pages(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),
    date DATE NOT NULL,
    UNIQUE(page_id, keyword, date)
);

CREATE INDEX IF NOT EXISTS idx_gsc_keywords_page ON seo_gsc_keywords(page_id);
CREATE INDEX IF NOT EXISTS idx_gsc_keywords_date ON seo_gsc_keywords(date DESC);

-- ============================================
-- KEYWORD RESEARCH
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE,

    -- Search metrics (from DataForSEO)
    search_volume INTEGER,
    keyword_difficulty INTEGER,
    cpc DECIMAL(10,4),
    competition DECIMAL(5,4),

    -- Intent classification
    intent TEXT CHECK (intent IN ('informational', 'transactional', 'navigational', 'commercial')),

    -- SERP features
    serp_features JSONB DEFAULT '[]',

    -- Target mapping
    target_url TEXT,
    target_product_id UUID REFERENCES ecommerce_products(id),
    target_category_id UUID REFERENCES seo_categories(id),

    -- Current performance (from GSC)
    current_position DECIMAL(5,2),
    current_impressions INTEGER,
    current_clicks INTEGER,
    current_ctr DECIMAL(5,4),
    ranking_url TEXT,

    -- Opportunity scoring
    opportunity_score INTEGER,
    priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Status
    status TEXT DEFAULT 'discovered' CHECK (status IN (
        'discovered', 'opportunity', 'targeting', 'ranking', 'won', 'ignored'
    )),

    -- Data source
    data_source TEXT CHECK (data_source IN ('dataforseo', 'gsc', 'manual', 'competitor')),
    dataforseo_raw JSONB,

    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_researched_at TIMESTAMPTZ,
    last_gsc_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keywords_volume ON seo_keywords(search_volume DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_opportunity ON seo_keywords(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_status ON seo_keywords(status);
CREATE INDEX IF NOT EXISTS idx_keywords_priority ON seo_keywords(priority);

-- Keyword clusters
CREATE TABLE IF NOT EXISTS seo_keyword_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_cluster_id UUID REFERENCES seo_keyword_clusters(id),
    primary_keyword_id UUID REFERENCES seo_keywords(id),
    description TEXT,
    total_volume INTEGER,
    avg_difficulty INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_keyword_cluster_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES seo_keyword_clusters(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    UNIQUE(cluster_id, keyword_id)
);

-- Keyword history
CREATE TABLE IF NOT EXISTS seo_keyword_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    position DECIMAL(5,2),
    impressions INTEGER,
    clicks INTEGER,
    ctr DECIMAL(5,4),
    ranking_url TEXT,
    data_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(keyword_id, check_date, data_source)
);

CREATE INDEX IF NOT EXISTS idx_keyword_history_date ON seo_keyword_history(keyword_id, check_date DESC);

-- Competitor keywords
CREATE TABLE IF NOT EXISTS seo_competitor_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword_id UUID REFERENCES seo_keywords(id) ON DELETE CASCADE,
    competitor_domain TEXT NOT NULL,
    position INTEGER,
    ranking_url TEXT,
    check_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(keyword_id, competitor_domain, check_date)
);

-- ============================================
-- HEALTH CLAIMS COMPLIANCE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_health_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    claim_text TEXT NOT NULL,
    claim_type TEXT,

    -- Compliance
    compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN (
        'pending', 'compliant', 'needs_citation', 'needs_toning', 'flagged'
    )),
    severity TEXT CHECK (severity IN ('high', 'medium', 'low')),

    -- Research support
    pubmed_ids JSONB DEFAULT '[]',
    citation_text TEXT,

    -- Review
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_claims_status ON seo_health_claims(compliance_status);
CREATE INDEX IF NOT EXISTS idx_health_claims_source ON seo_health_claims(source_type, source_id);

-- ============================================
-- PUBMED RESEARCH CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_pubmed_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pmid TEXT UNIQUE NOT NULL,
    title TEXT,
    abstract TEXT,
    authors JSONB,
    journal TEXT,
    publication_date DATE,

    -- Mapping
    ingredients JSONB DEFAULT '[]',
    health_benefits JSONB DEFAULT '[]',
    evidence_level TEXT CHECK (evidence_level IN ('high', 'moderate', 'low')),

    -- Citations
    citation_apa TEXT,
    citation_inline TEXT,

    -- Usage
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pubmed_pmid ON seo_pubmed_research(pmid);

-- ============================================
-- INTERNAL LINKING
-- ============================================
CREATE TABLE IF NOT EXISTS seo_internal_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_url TEXT NOT NULL,
    source_type TEXT,
    source_id UUID,
    target_url TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    anchor_text TEXT,
    link_context TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_links_source ON seo_internal_links(source_url);
CREATE INDEX IF NOT EXISTS idx_internal_links_target ON seo_internal_links(target_url);

CREATE TABLE IF NOT EXISTS seo_product_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES ecommerce_products(id),
    related_product_id UUID REFERENCES ecommerce_products(id),
    relationship_type TEXT,
    score DECIMAL(3,2),
    source TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(product_id, related_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_relationships ON seo_product_relationships(product_id);

-- ============================================
-- CONTENT OPTIMIZATION QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_content_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    url TEXT,

    -- Priority
    priority INTEGER DEFAULT 50,
    impressions_30d INTEGER DEFAULT 0,

    -- Current state
    current_title TEXT,
    current_description TEXT,
    current_content TEXT,

    -- Optimization
    optimization_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'researching', 'drafting', 'review', 'approved', 'deployed'
    )),

    -- Research
    target_keyword TEXT,
    pubmed_research JSONB DEFAULT '[]',

    -- Output
    proposed_content TEXT,
    proposed_at TIMESTAMPTZ,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_queue_status ON seo_content_queue(status);
CREATE INDEX IF NOT EXISTS idx_content_queue_priority ON seo_content_queue(priority DESC);

-- ============================================
-- AGENT ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS seo_agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    status TEXT CHECK (status IN ('started', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_name ON seo_agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON seo_agent_logs(created_at DESC);

-- ============================================
-- VIEWS FOR ANALYSIS
-- ============================================

-- Products needing classification (priority order)
CREATE OR REPLACE VIEW seo_products_needing_classification AS
SELECT
    sp.*,
    ep.name as product_name,
    ep.sku,
    gp.impressions_30d as gsc_impressions,
    gp.clicks_30d as gsc_clicks
FROM seo_products sp
JOIN ecommerce_products ep ON sp.ecommerce_product_id = ep.id
LEFT JOIN seo_gsc_pages gp ON gp.ecommerce_product_id = ep.id
WHERE sp.classification_status IN ('unreviewed', 'needs_review', 'miscategorized')
ORDER BY COALESCE(gp.impressions_30d, 0) DESC;

-- Empty/sparse categories
CREATE OR REPLACE VIEW seo_category_health AS
SELECT
    c.*,
    CASE
        WHEN c.product_count = 0 THEN 'empty'
        WHEN c.product_count < 5 THEN 'sparse'
        WHEN c.product_count > 500 THEN 'overstuffed'
        ELSE 'healthy'
    END as health_status
FROM seo_categories c
ORDER BY c.product_count ASC;

-- Staging products ready for classification
CREATE OR REPLACE VIEW seo_staging_ready AS
SELECT * FROM seo_products_staging
WHERE status = 'pending'
ORDER BY created_at ASC;

-- Products needing content work
CREATE OR REPLACE VIEW seo_products_needing_content AS
SELECT
    sp.*,
    ep.name as product_name,
    ep.sku,
    gp.impressions_30d as gsc_impressions,
    gp.clicks_30d as gsc_clicks,
    CASE
        WHEN sp.content_status = 'no_description' THEN 1
        WHEN sp.content_status = 'needs_format' AND gp.impressions_30d > 100 THEN 2
        WHEN sp.content_status = 'needs_format' THEN 3
        ELSE 4
    END as content_priority
FROM seo_products sp
JOIN ecommerce_products ep ON sp.ecommerce_product_id = ep.id
LEFT JOIN seo_gsc_pages gp ON gp.ecommerce_product_id = ep.id
WHERE sp.content_status IN ('no_description', 'needs_format', 'unknown')
ORDER BY content_priority ASC, COALESCE(gp.impressions_30d, 0) DESC;

-- Brands needing content work
CREATE OR REPLACE VIEW seo_brands_needing_content AS
SELECT
    b.*,
    gp.impressions_30d as page_impressions,
    gp.clicks_30d as page_clicks
FROM seo_brands b
LEFT JOIN seo_gsc_pages gp ON gp.url = b.url
WHERE b.content_status IN ('unknown', 'no_content', 'needs_update')
ORDER BY COALESCE(gp.impressions_30d, 0) DESC;

-- Keyword opportunities
CREATE OR REPLACE VIEW seo_keyword_opportunities AS
SELECT
    k.*,
    COALESCE(k.opportunity_score,
        (k.search_volume * (1 - COALESCE(k.keyword_difficulty, 50)::float / 100) *
        CASE k.intent
            WHEN 'transactional' THEN 1.5
            WHEN 'commercial' THEN 1.3
            WHEN 'informational' THEN 0.8
            ELSE 1.0
        END)::INTEGER
    ) as calculated_score,
    p.name as target_product_name,
    c.name as target_category_name
FROM seo_keywords k
LEFT JOIN ecommerce_products p ON k.target_product_id = p.id
LEFT JOIN seo_categories c ON k.target_category_id = c.id
WHERE k.status IN ('discovered', 'opportunity')
ORDER BY calculated_score DESC;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE TRIGGER update_seo_categories_updated_at
    BEFORE UPDATE ON seo_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_brands_updated_at
    BEFORE UPDATE ON seo_brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_products_updated_at
    BEFORE UPDATE ON seo_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_keywords_updated_at
    BEFORE UPDATE ON seo_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE seo_categories IS 'BigCommerce categories with SEO metrics and content tracking';
COMMENT ON TABLE seo_brands IS 'Brand pages with content status and SEO metrics';
COMMENT ON TABLE seo_products IS 'Product SEO tracking - links ecommerce_products with SEO status';
COMMENT ON TABLE seo_products_staging IS 'Staging area for 4000+ new products to be classified and added';
COMMENT ON TABLE seo_gsc_pages IS 'Google Search Console page data synced via API';
COMMENT ON TABLE seo_gsc_keywords IS 'GSC keyword data per page per day';
COMMENT ON TABLE seo_keywords IS 'Master keyword list with research data from DataForSEO and GSC';
COMMENT ON TABLE seo_health_claims IS 'Health claims found in content, tracking compliance status';
COMMENT ON TABLE seo_pubmed_research IS 'Cached PubMed research for citations';
COMMENT ON TABLE seo_content_queue IS 'Content optimization queue with drafts and approval workflow';
COMMENT ON TABLE seo_agent_logs IS 'Activity log for all SEO agents';
