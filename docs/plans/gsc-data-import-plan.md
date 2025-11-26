# Google Search Console Data Import Plan

> **Created:** 2025-11-26
> **Status:** Planning Phase
> **Priority:** High
> **Scheduled Run:** Every Friday @ 6:00 PM AEST

---

## Overview

Import comprehensive Google Search Console data into Supabase with:
- All available GSC API data fields captured
- Weekly automated refresh (Friday 6 PM AEST)
- Historical tracking for progress analysis
- Product-level traffic association

---

## Phase 1: Authentication & API Setup

### 1.1 Google Service Account Setup

**Required Credentials (to store in Supabase Vault):**

| Project | Credential Name | Description |
|---------|----------------|-------------|
| `boo` | `gsc_service_account_json` | Service account JSON for Buy Organics Online |
| `teelixir` | `gsc_service_account_json` | Service account JSON for Teelixir |
| `elevate` | `gsc_service_account_json` | Service account JSON for Elevate Wholesale |
| `redhillfresh` | `gsc_service_account_json` | Service account JSON for Red Hill Fresh |

**Setup Steps:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create Service Account with "Search Console API" enabled
3. Download JSON key file
4. Add service account email as user in GSC property settings
5. Store JSON in vault: `node infra/supabase/vault-helper.js store <project> gsc_service_account_json '<json>' "GSC service account credentials"`

**Properties to Connect:**
- `https://www.buyorganicsonline.com.au/` (Domain property preferred)
- `https://www.teelixir.com/`
- `https://www.elevatewholesale.com.au/`
- `https://www.redhillfresh.com.au/`

---

## Phase 2: Database Schema Design

### 2.1 Core Tables

```sql
-- ============================================
-- GSC DATA IMPORT SCHEMA
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table 1: GSC Properties (Sites)
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business business_type NOT NULL,  -- Uses existing enum: buy_organics, teelixir, etc.
    site_url TEXT NOT NULL UNIQUE,
    property_type TEXT NOT NULL,  -- 'URL_PREFIX' or 'DOMAIN'
    permission_level TEXT,  -- 'siteOwner', 'siteFullUser', 'siteRestrictedUser'
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 2: Search Analytics (Performance Data)
-- This is the main traffic/query data
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    -- Dimensions (all possible)
    query TEXT,                          -- Search query
    page TEXT,                           -- URL of the page
    country TEXT,                        -- Country code (e.g., 'aus')
    device TEXT,                         -- 'DESKTOP', 'MOBILE', 'TABLET'
    search_appearance TEXT,              -- 'RICHCARD', 'VIDEO', 'WEB_LIGHT', etc.
    date DATE NOT NULL,                  -- Date of the data

    -- Metrics
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr DECIMAL(10, 6) DEFAULT 0,        -- Click-through rate (0.0 to 1.0)
    position DECIMAL(10, 2) DEFAULT 0,   -- Average position

    -- Data freshness tracking
    data_state TEXT,                     -- 'all', 'final' (Google's data state)
    sync_batch_id UUID,                  -- Links to sync log

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Composite unique constraint to prevent duplicates
    UNIQUE (property_id, query, page, country, device, search_appearance, date)
);

-- ============================================
-- Table 3: Index Coverage / Page Indexing
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_index_coverage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    -- URL being tracked
    url TEXT NOT NULL,

    -- Coverage Status
    verdict TEXT NOT NULL,               -- 'PASS', 'NEUTRAL', 'FAIL'
    coverage_state TEXT NOT NULL,        -- 'SUBMITTED_AND_INDEXED', 'CRAWLED_BUT_NOT_INDEXED', etc.
    indexing_state TEXT,                 -- 'INDEXING_ALLOWED', 'BLOCKED_BY_ROBOTS_TXT', etc.

    -- Robot state
    robots_txt_state TEXT,               -- 'ALLOWED', 'DISALLOWED'
    page_fetch_state TEXT,               -- 'SUCCESSFUL', 'ROBOTS_BLOCKED', 'NOT_FOUND', etc.

    -- Crawl info
    last_crawl_time TIMESTAMPTZ,
    crawled_as TEXT,                     -- 'DESKTOP', 'MOBILE'
    google_canonical TEXT,               -- Google's selected canonical
    user_canonical TEXT,                 -- User-specified canonical

    -- Rich results
    rich_results_types TEXT[],           -- Array of rich result types found
    mobile_usability_verdict TEXT,       -- 'PASS', 'FAIL'
    mobile_usability_issues TEXT[],      -- Array of mobile issues

    -- Tracking
    snapshot_date DATE NOT NULL,
    sync_batch_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, url, snapshot_date)
);

-- ============================================
-- Table 4: URL Inspection Results (Detailed)
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_url_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    url TEXT NOT NULL,
    inspection_time TIMESTAMPTZ NOT NULL,

    -- Index Status
    index_verdict TEXT,                  -- 'PASS', 'PARTIAL', 'NEUTRAL', 'FAIL'
    index_coverage_state TEXT,

    -- Crawl info
    last_crawl_time TIMESTAMPTZ,
    crawl_verdict TEXT,
    page_fetch_state TEXT,

    -- Canonical
    google_canonical TEXT,
    user_canonical TEXT,
    sitemap_canonical TEXT,

    -- Mobile
    mobile_verdict TEXT,
    mobile_issues JSONB,

    -- Rich Results
    rich_results JSONB,                  -- Full rich results data

    -- AMP (if applicable)
    amp_verdict TEXT,
    amp_issues JSONB,

    -- Raw response for future parsing
    raw_response JSONB,

    sync_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 5: Sitemaps
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_sitemaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    sitemap_url TEXT NOT NULL,
    sitemap_type TEXT,                   -- 'sitemap', 'sitemapIndex', 'notSitemap', 'urlList'

    -- Status
    is_pending BOOLEAN DEFAULT false,
    is_sitemaps_index BOOLEAN DEFAULT false,
    last_submitted TIMESTAMPTZ,
    last_downloaded TIMESTAMPTZ,

    -- Content stats
    contents JSONB,                      -- Array of {type, submitted, indexed}
    warnings INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,

    -- Tracking
    snapshot_date DATE NOT NULL,
    sync_batch_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, sitemap_url, snapshot_date)
);

-- ============================================
-- Table 6: Core Web Vitals
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_core_web_vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    url TEXT NOT NULL,
    form_factor TEXT NOT NULL,           -- 'DESKTOP', 'MOBILE'

    -- CLS (Cumulative Layout Shift)
    cls_verdict TEXT,                    -- 'GOOD', 'NEEDS_IMPROVEMENT', 'POOR'
    cls_value DECIMAL(10, 4),
    cls_percentile_75 DECIMAL(10, 4),

    -- LCP (Largest Contentful Paint)
    lcp_verdict TEXT,
    lcp_value INTEGER,                   -- in milliseconds
    lcp_percentile_75 INTEGER,

    -- INP (Interaction to Next Paint) - replaced FID
    inp_verdict TEXT,
    inp_value INTEGER,                   -- in milliseconds
    inp_percentile_75 INTEGER,

    -- FID (First Input Delay) - legacy, kept for history
    fid_verdict TEXT,
    fid_value INTEGER,
    fid_percentile_75 INTEGER,

    -- Overall
    overall_verdict TEXT,                -- 'GOOD', 'NEEDS_IMPROVEMENT', 'POOR'

    -- Origin-level data
    is_origin_level BOOLEAN DEFAULT false,

    -- Tracking
    snapshot_date DATE NOT NULL,
    sync_batch_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, url, form_factor, snapshot_date)
);

-- ============================================
-- Table 7: Mobile Usability Issues
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_mobile_usability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    url TEXT NOT NULL,

    -- Overall verdict
    verdict TEXT,                        -- 'PASS', 'FAIL'

    -- Issue types (array)
    issues TEXT[],                       -- 'MOBILE_VIEWPORT_NOT_SET', 'TEXT_TOO_SMALL', etc.

    -- Full issue details
    issue_details JSONB,

    -- Tracking
    snapshot_date DATE NOT NULL,
    sync_batch_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, url, snapshot_date)
);

-- ============================================
-- Table 8: Security Issues
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_security_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    issue_type TEXT NOT NULL,            -- 'HACKED_TYPE_CODE_INJECTION', 'SOCIAL_ENGINEERING', etc.
    severity TEXT,                       -- 'LOW', 'MEDIUM', 'HIGH'

    -- Affected URLs
    affected_urls TEXT[],
    sample_urls TEXT[],

    -- Issue state
    is_active BOOLEAN DEFAULT true,
    detected_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Details
    details JSONB,

    -- Tracking
    snapshot_date DATE NOT NULL,
    sync_batch_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, issue_type, snapshot_date)
);

-- ============================================
-- Table 9: Manual Actions
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_manual_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    action_type TEXT NOT NULL,           -- 'THIN_CONTENT', 'SPAMMY_STRUCTURED_MARKUP', etc.
    status TEXT,                         -- 'ACTIVE', 'DISMISSED', 'RECONSIDERATION_PENDING'

    -- Scope
    is_site_wide BOOLEAN DEFAULT false,
    affected_urls TEXT[],

    -- Dates
    detected_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Review request
    review_requested_at TIMESTAMPTZ,
    review_response TEXT,

    -- Details
    details JSONB,

    -- Tracking
    snapshot_date DATE NOT NULL,
    sync_batch_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, action_type, snapshot_date)
);

-- ============================================
-- Table 10: Rich Results Status
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_rich_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    url TEXT NOT NULL,
    rich_result_type TEXT NOT NULL,      -- 'Product', 'Review', 'FAQ', 'HowTo', 'Recipe', etc.

    -- Status
    verdict TEXT,                        -- 'VALID', 'INVALID', 'WARNING'

    -- Issues
    issues JSONB,                        -- Array of {issueType, severity, message}

    -- Tracking
    snapshot_date DATE NOT NULL,
    sync_batch_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, url, rich_result_type, snapshot_date)
);

-- ============================================
-- Table 11: Sync Logs (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL UNIQUE,

    property_id UUID REFERENCES gsc_properties(id),
    business business_type,

    -- Sync details
    sync_type TEXT NOT NULL,             -- 'FULL', 'INCREMENTAL', 'MANUAL'
    data_types TEXT[],                   -- ['search_analytics', 'index_coverage', etc.]

    -- Date range synced
    date_from DATE,
    date_to DATE,

    -- Results
    status TEXT NOT NULL,                -- 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    records_fetched INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,

    -- Errors
    error_message TEXT,
    error_details JSONB,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- API usage
    api_calls_made INTEGER DEFAULT 0,
    quota_used INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 12: Product-URL Mapping (Traffic Attribution)
-- ============================================
CREATE TABLE IF NOT EXISTS gsc_url_product_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES gsc_properties(id),

    url TEXT NOT NULL,

    -- Product association (links to your ecommerce tables)
    product_id INTEGER,                  -- BigCommerce/Shopify product ID
    product_sku TEXT,
    product_name TEXT,

    -- Category association
    category_id INTEGER,
    category_path TEXT,                  -- '/health/supplements/vitamins'

    -- URL type
    url_type TEXT NOT NULL,              -- 'PRODUCT', 'CATEGORY', 'BRAND', 'BLOG', 'PAGE', 'OTHER'

    -- Mapping method
    mapping_method TEXT,                 -- 'AUTOMATIC', 'MANUAL', 'REGEX'
    mapping_confidence DECIMAL(3, 2),    -- 0.00 to 1.00

    -- Status
    is_active BOOLEAN DEFAULT true,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (property_id, url)
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Search Analytics (most queried table)
CREATE INDEX idx_gsc_sa_property_date ON gsc_search_analytics(property_id, date);
CREATE INDEX idx_gsc_sa_page_date ON gsc_search_analytics(page, date);
CREATE INDEX idx_gsc_sa_query ON gsc_search_analytics(query) WHERE query IS NOT NULL;
CREATE INDEX idx_gsc_sa_device ON gsc_search_analytics(device);
CREATE INDEX idx_gsc_sa_country ON gsc_search_analytics(country);
CREATE INDEX idx_gsc_sa_clicks ON gsc_search_analytics(clicks DESC);
CREATE INDEX idx_gsc_sa_impressions ON gsc_search_analytics(impressions DESC);

-- Index Coverage
CREATE INDEX idx_gsc_ic_property_date ON gsc_index_coverage(property_id, snapshot_date);
CREATE INDEX idx_gsc_ic_url ON gsc_index_coverage(url);
CREATE INDEX idx_gsc_ic_coverage_state ON gsc_index_coverage(coverage_state);

-- Core Web Vitals
CREATE INDEX idx_gsc_cwv_property_date ON gsc_core_web_vitals(property_id, snapshot_date);
CREATE INDEX idx_gsc_cwv_verdict ON gsc_core_web_vitals(overall_verdict);

-- Product URL Mapping
CREATE INDEX idx_gsc_mapping_product ON gsc_url_product_mapping(product_id);
CREATE INDEX idx_gsc_mapping_url_type ON gsc_url_product_mapping(url_type);

-- Sync Logs
CREATE INDEX idx_gsc_sync_property ON gsc_sync_logs(property_id);
CREATE INDEX idx_gsc_sync_batch ON gsc_sync_logs(batch_id);
CREATE INDEX idx_gsc_sync_started ON gsc_sync_logs(started_at DESC);
```

### 2.2 Aggregation Views for Reporting

```sql
-- ============================================
-- VIEWS for Reporting & Analysis
-- ============================================

-- Daily Traffic Summary by Property
CREATE OR REPLACE VIEW gsc_daily_summary AS
SELECT
    p.business,
    p.site_url,
    sa.date,
    SUM(sa.clicks) as total_clicks,
    SUM(sa.impressions) as total_impressions,
    AVG(sa.ctr) as avg_ctr,
    AVG(sa.position) as avg_position,
    COUNT(DISTINCT sa.query) as unique_queries,
    COUNT(DISTINCT sa.page) as pages_with_traffic
FROM gsc_search_analytics sa
JOIN gsc_properties p ON p.id = sa.property_id
GROUP BY p.business, p.site_url, sa.date;

-- Weekly Traffic Trend
CREATE OR REPLACE VIEW gsc_weekly_trend AS
SELECT
    p.business,
    DATE_TRUNC('week', sa.date)::DATE as week_start,
    SUM(sa.clicks) as total_clicks,
    SUM(sa.impressions) as total_impressions,
    AVG(sa.ctr) as avg_ctr,
    AVG(sa.position) as avg_position,
    COUNT(DISTINCT sa.query) as unique_queries
FROM gsc_search_analytics sa
JOIN gsc_properties p ON p.id = sa.property_id
GROUP BY p.business, DATE_TRUNC('week', sa.date);

-- Top Queries by Property (Last 30 Days)
CREATE OR REPLACE VIEW gsc_top_queries AS
SELECT
    p.business,
    sa.query,
    SUM(sa.clicks) as total_clicks,
    SUM(sa.impressions) as total_impressions,
    AVG(sa.ctr) as avg_ctr,
    AVG(sa.position) as avg_position
FROM gsc_search_analytics sa
JOIN gsc_properties p ON p.id = sa.property_id
WHERE sa.date >= CURRENT_DATE - INTERVAL '30 days'
  AND sa.query IS NOT NULL
GROUP BY p.business, sa.query
ORDER BY total_clicks DESC;

-- Top Pages by Traffic
CREATE OR REPLACE VIEW gsc_top_pages AS
SELECT
    p.business,
    sa.page,
    m.product_id,
    m.product_name,
    m.url_type,
    SUM(sa.clicks) as total_clicks,
    SUM(sa.impressions) as total_impressions,
    AVG(sa.position) as avg_position
FROM gsc_search_analytics sa
JOIN gsc_properties p ON p.id = sa.property_id
LEFT JOIN gsc_url_product_mapping m ON m.property_id = sa.property_id AND m.url = sa.page
WHERE sa.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.business, sa.page, m.product_id, m.product_name, m.url_type
ORDER BY total_clicks DESC;

-- Product Traffic Attribution
CREATE OR REPLACE VIEW gsc_product_traffic AS
SELECT
    p.business,
    m.product_id,
    m.product_sku,
    m.product_name,
    m.category_path,
    SUM(sa.clicks) as total_clicks,
    SUM(sa.impressions) as total_impressions,
    AVG(sa.ctr) as avg_ctr,
    AVG(sa.position) as avg_position,
    COUNT(DISTINCT sa.query) as ranking_queries,
    sa.date as traffic_date
FROM gsc_search_analytics sa
JOIN gsc_properties p ON p.id = sa.property_id
JOIN gsc_url_product_mapping m ON m.property_id = sa.property_id AND m.url = sa.page
WHERE m.url_type = 'PRODUCT'
GROUP BY p.business, m.product_id, m.product_sku, m.product_name, m.category_path, sa.date;

-- Index Coverage Summary
CREATE OR REPLACE VIEW gsc_index_summary AS
SELECT
    p.business,
    ic.coverage_state,
    ic.snapshot_date,
    COUNT(*) as url_count
FROM gsc_index_coverage ic
JOIN gsc_properties p ON p.id = ic.property_id
GROUP BY p.business, ic.coverage_state, ic.snapshot_date;

-- Core Web Vitals Summary
CREATE OR REPLACE VIEW gsc_cwv_summary AS
SELECT
    p.business,
    cwv.form_factor,
    cwv.overall_verdict,
    cwv.snapshot_date,
    COUNT(*) as url_count,
    AVG(cwv.cls_value) as avg_cls,
    AVG(cwv.lcp_value) as avg_lcp_ms,
    AVG(cwv.inp_value) as avg_inp_ms
FROM gsc_core_web_vitals cwv
JOIN gsc_properties p ON p.id = cwv.property_id
GROUP BY p.business, cwv.form_factor, cwv.overall_verdict, cwv.snapshot_date;
```

---

## Phase 3: Data Sync Script

### 3.1 Script Architecture

```
/home/user/master-ops/
├── infra/
│   └── gsc-sync/
│       ├── index.ts              # Main entry point
│       ├── config.ts             # Configuration & constants
│       ├── auth.ts               # Google auth handler
│       ├── api/
│       │   ├── search-analytics.ts   # Performance data fetcher
│       │   ├── url-inspection.ts     # URL inspection API
│       │   ├── sitemaps.ts           # Sitemaps API
│       │   └── crawl-errors.ts       # Crawl errors/coverage
│       ├── db/
│       │   ├── schema.ts             # DB operations
│       │   ├── upsert.ts             # Smart upsert logic
│       │   └── product-mapper.ts     # URL to product mapping
│       ├── jobs/
│       │   ├── weekly-sync.ts        # Friday 6PM job
│       │   └── manual-sync.ts        # On-demand sync
│       └── utils/
│           ├── logger.ts             # Logging utilities
│           ├── rate-limiter.ts       # API rate limiting
│           └── retry.ts              # Retry logic
```

### 3.2 Core Sync Script

```typescript
// infra/gsc-sync/index.ts

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

interface SyncConfig {
  business: 'buy_organics' | 'teelixir' | 'elevate_wholesale' | 'redhillfresh';
  siteUrl: string;
  daysToFetch: number;  // Default 7 for weekly
  dimensions: string[];
}

const BUSINESSES: SyncConfig[] = [
  {
    business: 'buy_organics',
    siteUrl: 'https://www.buyorganicsonline.com.au/',
    daysToFetch: 7,
    dimensions: ['query', 'page', 'country', 'device', 'date']
  },
  {
    business: 'teelixir',
    siteUrl: 'https://www.teelixir.com/',
    daysToFetch: 7,
    dimensions: ['query', 'page', 'country', 'device', 'date']
  },
  // Add other businesses...
];

async function syncGSCData(config: SyncConfig) {
  const batchId = uuidv4();

  // 1. Get credentials from vault
  const credentials = await getCredentials(config.business);

  // 2. Authenticate with Google
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  // 3. Calculate date range
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // GSC data has 3-day lag
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - config.daysToFetch);

  // 4. Fetch Search Analytics
  const response = await searchconsole.searchanalytics.query({
    siteUrl: config.siteUrl,
    requestBody: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: config.dimensions,
      rowLimit: 25000,  // Max per request
      dataState: 'all'
    }
  });

  // 5. Upsert to Supabase
  await upsertSearchAnalytics(batchId, config.business, response.data.rows);

  // 6. Log sync completion
  await logSync(batchId, config, response.data.rows?.length || 0);
}

// Run sync for all businesses
async function runWeeklySync() {
  console.log('🚀 Starting weekly GSC sync...');

  for (const config of BUSINESSES) {
    try {
      console.log(`📊 Syncing ${config.business}...`);
      await syncGSCData(config);
      console.log(`✅ ${config.business} sync complete`);
    } catch (error) {
      console.error(`❌ ${config.business} sync failed:`, error);
      // Continue with other businesses
    }
  }

  console.log('🎉 Weekly sync complete!');
}
```

---

## Phase 4: Product-URL Mapping Strategy

### 4.1 Automatic URL Matching

```typescript
// infra/gsc-sync/db/product-mapper.ts

interface MappingRule {
  urlPattern: RegExp;
  urlType: string;
  extractor?: (url: string) => { productId?: string; sku?: string; categoryPath?: string };
}

const BOO_MAPPING_RULES: MappingRule[] = [
  // Product pages: /product-slug/
  {
    urlPattern: /^\/([a-z0-9-]+)\/?$/,
    urlType: 'PRODUCT',
    extractor: (url) => ({ productId: extractFromSlug(url) })
  },
  // Category pages: /category/subcategory/
  {
    urlPattern: /^\/([a-z-]+)\/([a-z-]+)\/?$/,
    urlType: 'CATEGORY',
    extractor: (url) => ({ categoryPath: url })
  },
  // Brand pages: /brands/brand-name/
  {
    urlPattern: /^\/brands\/([a-z0-9-]+)\/?$/,
    urlType: 'BRAND',
    extractor: (url) => ({ categoryPath: url })
  },
  // Blog: /blog/article-slug/
  {
    urlPattern: /^\/blog\/([a-z0-9-]+)\/?$/,
    urlType: 'BLOG'
  },
  // Default
  {
    urlPattern: /.*/,
    urlType: 'OTHER'
  }
];

async function mapUrlToProduct(propertyId: string, url: string): Promise<ProductMapping> {
  // 1. Check existing mapping
  const existing = await checkExistingMapping(propertyId, url);
  if (existing) return existing;

  // 2. Try automatic matching
  for (const rule of BOO_MAPPING_RULES) {
    if (rule.urlPattern.test(url)) {
      const extracted = rule.extractor?.(url) || {};

      // 3. If product URL, lookup in bc_products table
      if (rule.urlType === 'PRODUCT') {
        const product = await findProductByUrl(url);
        if (product) {
          return {
            url,
            url_type: 'PRODUCT',
            product_id: product.id,
            product_sku: product.sku,
            product_name: product.name,
            mapping_method: 'AUTOMATIC',
            mapping_confidence: 0.95
          };
        }
      }

      return {
        url,
        url_type: rule.urlType,
        ...extracted,
        mapping_method: 'AUTOMATIC',
        mapping_confidence: 0.80
      };
    }
  }
}

// Sync product catalog URLs to mapping table
async function syncProductMappings(business: string) {
  // Get all product URLs from BigCommerce/Shopify
  const products = await supabase
    .from('bc_products')
    .select('id, sku, name, custom_url')
    .eq('business', business);

  // Upsert mappings
  for (const product of products.data) {
    await supabase
      .from('gsc_url_product_mapping')
      .upsert({
        property_id: await getPropertyId(business),
        url: product.custom_url,
        product_id: product.id,
        product_sku: product.sku,
        product_name: product.name,
        url_type: 'PRODUCT',
        mapping_method: 'AUTOMATIC',
        mapping_confidence: 1.0,
        updated_at: new Date()
      }, {
        onConflict: 'property_id,url'
      });
  }
}
```

---

## Phase 5: Scheduling (Friday 6 PM AEST)

### 5.1 n8n Workflow Configuration

```json
{
  "name": "GSC Weekly Data Sync",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 18 * * 5"  // 6:00 PM every Friday
            }
          ]
        }
      },
      "position": [250, 300],
      "typeVersion": 1.1
    },
    {
      "name": "Execute GSC Sync",
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "cd /home/user/master-ops && npx tsx infra/gsc-sync/index.ts"
      },
      "position": [450, 300]
    },
    {
      "name": "Check Results",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.exitCode }}",
              "operation": "equal",
              "value2": 0
            }
          ]
        }
      },
      "position": [650, 300]
    },
    {
      "name": "Send Success Notification",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#ops-alerts",
        "text": "✅ GSC weekly sync completed successfully"
      },
      "position": [850, 200]
    },
    {
      "name": "Send Failure Alert",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#ops-alerts",
        "text": "❌ GSC weekly sync failed - check logs"
      },
      "position": [850, 400]
    }
  ],
  "settings": {
    "timezone": "Australia/Melbourne"
  }
}
```

### 5.2 Alternative: Supabase pg_cron

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job for Friday 6 PM AEST (UTC+11 = 7 AM UTC)
SELECT cron.schedule(
  'gsc-weekly-sync',
  '0 7 * * 5',  -- Friday 7 AM UTC = Friday 6 PM AEST
  $$
  -- Call edge function or log trigger
  SELECT net.http_post(
    'https://your-project.supabase.co/functions/v1/gsc-sync',
    '{"type": "weekly"}',
    '{"Content-Type": "application/json", "Authorization": "Bearer your-service-key"}'
  );
  $$
);
```

---

## Phase 6: Progress Tracking & Dashboards

### 6.1 Key Metrics to Track Week-over-Week

| Metric | Description | Query |
|--------|-------------|-------|
| Total Clicks | Organic search clicks | `SUM(clicks) WHERE date BETWEEN...` |
| Total Impressions | Search result views | `SUM(impressions) WHERE date BETWEEN...` |
| Avg CTR | Click-through rate | `AVG(ctr) WHERE date BETWEEN...` |
| Avg Position | Search ranking position | `AVG(position) WHERE date BETWEEN...` |
| Indexed Pages | Pages in Google index | `COUNT(*) WHERE coverage_state = 'SUBMITTED_AND_INDEXED'` |
| 404 Errors | Not found pages | `COUNT(*) WHERE page_fetch_state = 'NOT_FOUND'` |
| CWV Pass Rate | Core Web Vitals health | `COUNT(*) WHERE overall_verdict = 'GOOD' / total` |
| Products with Traffic | Products receiving clicks | `COUNT(DISTINCT product_id) WHERE clicks > 0` |

### 6.2 Sample Dashboard Queries

```sql
-- Week-over-Week Performance Comparison
WITH current_week AS (
  SELECT SUM(clicks) as clicks, SUM(impressions) as impressions,
         AVG(position) as position
  FROM gsc_search_analytics
  WHERE date >= CURRENT_DATE - INTERVAL '7 days'
),
previous_week AS (
  SELECT SUM(clicks) as clicks, SUM(impressions) as impressions,
         AVG(position) as position
  FROM gsc_search_analytics
  WHERE date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '7 days'
)
SELECT
  current_week.clicks as this_week_clicks,
  previous_week.clicks as last_week_clicks,
  ROUND(((current_week.clicks - previous_week.clicks)::DECIMAL / previous_week.clicks) * 100, 2) as click_change_pct,
  current_week.impressions as this_week_impressions,
  previous_week.impressions as last_week_impressions,
  ROUND(current_week.position, 2) as this_week_avg_position,
  ROUND(previous_week.position, 2) as last_week_avg_position
FROM current_week, previous_week;

-- Top Improving/Declining Products
SELECT
  m.product_name,
  m.product_sku,
  SUM(CASE WHEN sa.date >= CURRENT_DATE - 7 THEN sa.clicks ELSE 0 END) as current_clicks,
  SUM(CASE WHEN sa.date < CURRENT_DATE - 7 THEN sa.clicks ELSE 0 END) as previous_clicks,
  SUM(CASE WHEN sa.date >= CURRENT_DATE - 7 THEN sa.clicks ELSE 0 END) -
  SUM(CASE WHEN sa.date < CURRENT_DATE - 7 THEN sa.clicks ELSE 0 END) as click_change
FROM gsc_search_analytics sa
JOIN gsc_url_product_mapping m ON m.url = sa.page AND m.property_id = sa.property_id
WHERE sa.date >= CURRENT_DATE - 14
  AND m.url_type = 'PRODUCT'
GROUP BY m.product_name, m.product_sku
ORDER BY click_change DESC
LIMIT 20;
```

---

## Phase 7: Implementation Timeline

### Week 1: Foundation
- [ ] Create Supabase schema (all 12 tables + views)
- [ ] Set up Google Cloud project & enable Search Console API
- [ ] Create service accounts for each property
- [ ] Store credentials in vault
- [ ] Test API connectivity

### Week 2: Core Sync
- [ ] Build sync script for Search Analytics
- [ ] Implement URL-to-product mapping logic
- [ ] Test with Buy Organics Online data
- [ ] Set up sync logging

### Week 3: Extended Data
- [ ] Add Index Coverage sync
- [ ] Add Core Web Vitals sync
- [ ] Add Sitemaps status sync
- [ ] Implement error handling & retries

### Week 4: Automation & Monitoring
- [ ] Configure n8n workflow for Friday 6 PM schedule
- [ ] Set up Slack/email notifications
- [ ] Create dashboard views
- [ ] Document & handoff

---

## API Rate Limits & Considerations

| API | Rate Limit | Strategy |
|-----|-----------|----------|
| Search Analytics | 1,200 queries/min | Batch requests, 25K rows max |
| URL Inspection | 2,000 inspections/day | Prioritize changed URLs |
| Sitemaps | Standard quota | Once per sync |

---

## Questions to Resolve

1. **Which GSC properties are already set up?** Need to verify access for all 4 businesses
2. **Service account vs OAuth?** Service account recommended for automated jobs
3. **Historical data?** How far back should initial import go? (Max 16 months for Search Analytics)
4. **Product catalog source?** Confirm `bc_products` table for URL mapping

---

## Files to Create

1. `/home/user/master-ops/infra/supabase/schema-gsc.sql` - Database schema
2. `/home/user/master-ops/infra/gsc-sync/` - Sync scripts directory
3. `/home/user/master-ops/infra/n8n-workflows/templates/gsc-weekly-sync.json` - n8n workflow
4. `/home/user/master-ops/shared/libs/integrations/gsc/` - GSC API client library

---

## Success Criteria

- All GSC data types imported for all 4 businesses
- Zero manual intervention required for weekly syncs
- Product-level traffic attribution for 90%+ of product URLs
- Week-over-week trend visibility in dashboard
- Sync completes within 30 minutes every Friday
