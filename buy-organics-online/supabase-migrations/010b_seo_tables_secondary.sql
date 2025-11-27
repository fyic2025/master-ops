-- Part 2: Secondary SEO Tables (run after Part 1)
-- Creates: staging, GSC, keywords, health claims, etc.

-- ============================================
-- PRODUCTS STAGING
-- ============================================
CREATE TABLE IF NOT EXISTS seo_products_staging (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    source_sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    barcode TEXT,
    suggested_categories JSONB DEFAULT '[]',
    classification_confidence DECIMAL(3,2),
    needs_new_category BOOLEAN DEFAULT FALSE,
    suggested_new_category TEXT,
    matched_product_id UUID REFERENCES ecommerce_products(id),
    match_type TEXT,
    match_confidence DECIMAL(3,2),
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
    index_status TEXT,
    last_crawled_at DATE,
    impressions_30d INTEGER DEFAULT 0,
    clicks_30d INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,4),
    first_seen DATE,
    last_updated DATE
);

CREATE INDEX IF NOT EXISTS idx_gsc_pages_url ON seo_gsc_pages(url);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_product ON seo_gsc_pages(ecommerce_product_id);
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

-- ============================================
-- KEYWORDS
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE,
    search_volume INTEGER,
    keyword_difficulty INTEGER,
    cpc DECIMAL(10,4),
    competition DECIMAL(5,4),
    intent TEXT CHECK (intent IN ('informational', 'transactional', 'navigational', 'commercial')),
    serp_features JSONB DEFAULT '[]',
    target_url TEXT,
    target_product_id UUID REFERENCES ecommerce_products(id),
    target_category_id UUID REFERENCES seo_categories(id),
    current_position DECIMAL(5,2),
    current_impressions INTEGER,
    current_clicks INTEGER,
    current_ctr DECIMAL(5,4),
    ranking_url TEXT,
    opportunity_score INTEGER,
    priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'discovered' CHECK (status IN (
        'discovered', 'opportunity', 'targeting', 'ranking', 'won', 'ignored'
    )),
    data_source TEXT CHECK (data_source IN ('dataforseo', 'gsc', 'manual', 'competitor')),
    dataforseo_raw JSONB,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_researched_at TIMESTAMPTZ,
    last_gsc_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keywords_volume ON seo_keywords(search_volume DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_status ON seo_keywords(status);

-- ============================================
-- HEALTH CLAIMS
-- ============================================
CREATE TABLE IF NOT EXISTS seo_health_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    claim_text TEXT NOT NULL,
    claim_type TEXT,
    compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN (
        'pending', 'compliant', 'needs_citation', 'needs_toning', 'flagged'
    )),
    severity TEXT CHECK (severity IN ('high', 'medium', 'low')),
    pubmed_ids JSONB DEFAULT '[]',
    citation_text TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_claims_status ON seo_health_claims(compliance_status);

-- ============================================
-- PUBMED CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_pubmed_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pmid TEXT UNIQUE NOT NULL,
    title TEXT,
    abstract TEXT,
    authors JSONB,
    journal TEXT,
    publication_date DATE,
    ingredients JSONB DEFAULT '[]',
    health_benefits JSONB DEFAULT '[]',
    evidence_level TEXT CHECK (evidence_level IN ('high', 'moderate', 'low')),
    citation_apa TEXT,
    citation_inline TEXT,
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTENT QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS seo_content_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    url TEXT,
    priority INTEGER DEFAULT 50,
    impressions_30d INTEGER DEFAULT 0,
    current_title TEXT,
    current_description TEXT,
    current_content TEXT,
    optimization_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'researching', 'drafting', 'review', 'approved', 'deployed'
    )),
    target_keyword TEXT,
    pubmed_research JSONB DEFAULT '[]',
    proposed_content TEXT,
    proposed_at TIMESTAMPTZ,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_queue_status ON seo_content_queue(status);

-- ============================================
-- AGENT LOGS
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
