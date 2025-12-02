-- GSC Search Performance Raw Data Schema
-- Stores raw search analytics data from GSC API
-- Created: 2025-12-02

-- ============================================================================
-- TABLE: gsc_search_performance
-- Raw search analytics data with all dimensions
-- ============================================================================

CREATE TABLE IF NOT EXISTS gsc_search_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business TEXT NOT NULL CHECK (business IN ('boo', 'teelixir', 'rhf', 'elevate')),
  date DATE NOT NULL,

  -- Dimensions
  query TEXT NOT NULL,
  page TEXT NOT NULL,
  device TEXT NOT NULL,  -- 'DESKTOP', 'MOBILE', 'TABLET'
  country TEXT NOT NULL,  -- ISO 3166-1 alpha-3 code

  -- Metrics
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(7,6) DEFAULT 0,  -- 0.000000 to 1.000000
  position DECIMAL(6,2) DEFAULT 0,  -- Average position (can be > 100)

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upserts
  UNIQUE(business, date, query, page, country, device)
);

-- Indexes for common query patterns
CREATE INDEX idx_gsc_perf_business_date ON gsc_search_performance(business, date DESC);
CREATE INDEX idx_gsc_perf_query ON gsc_search_performance(business, query);
CREATE INDEX idx_gsc_perf_page ON gsc_search_performance(business, page);
CREATE INDEX idx_gsc_perf_country ON gsc_search_performance(business, country);
CREATE INDEX idx_gsc_perf_device ON gsc_search_performance(business, device);
CREATE INDEX idx_gsc_perf_clicks ON gsc_search_performance(business, date, clicks DESC);
CREATE INDEX idx_gsc_perf_impressions ON gsc_search_performance(business, date, impressions DESC);

-- Full text search on queries
CREATE INDEX idx_gsc_perf_query_trgm ON gsc_search_performance USING gin (query gin_trgm_ops);

-- ============================================================================
-- VIEWS: Analysis & Reporting
-- ============================================================================

-- Top queries by clicks (last 28 days)
CREATE OR REPLACE VIEW v_gsc_top_queries AS
SELECT
  business,
  query,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  CASE WHEN SUM(impressions) > 0
    THEN ROUND((SUM(clicks)::numeric / SUM(impressions)) * 100, 2)
    ELSE 0
  END as avg_ctr_pct,
  ROUND(AVG(position), 1) as avg_position,
  COUNT(DISTINCT page) as pages_ranking,
  COUNT(DISTINCT country) as countries
FROM gsc_search_performance
WHERE date >= CURRENT_DATE - INTERVAL '28 days'
GROUP BY business, query
ORDER BY total_clicks DESC;

-- Top pages by clicks (last 28 days)
CREATE OR REPLACE VIEW v_gsc_top_pages AS
SELECT
  business,
  page,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  CASE WHEN SUM(impressions) > 0
    THEN ROUND((SUM(clicks)::numeric / SUM(impressions)) * 100, 2)
    ELSE 0
  END as avg_ctr_pct,
  ROUND(AVG(position), 1) as avg_position,
  COUNT(DISTINCT query) as queries_ranking
FROM gsc_search_performance
WHERE date >= CURRENT_DATE - INTERVAL '28 days'
GROUP BY business, page
ORDER BY total_clicks DESC;

-- Device breakdown
CREATE OR REPLACE VIEW v_gsc_device_breakdown AS
SELECT
  business,
  device,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  ROUND(AVG(position), 1) as avg_position
FROM gsc_search_performance
WHERE date >= CURRENT_DATE - INTERVAL '28 days'
GROUP BY business, device
ORDER BY business, total_clicks DESC;

-- Country breakdown
CREATE OR REPLACE VIEW v_gsc_country_breakdown AS
SELECT
  business,
  country,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  ROUND(AVG(position), 1) as avg_position
FROM gsc_search_performance
WHERE date >= CURRENT_DATE - INTERVAL '28 days'
GROUP BY business, country
ORDER BY business, total_clicks DESC;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE gsc_search_performance ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access" ON gsc_search_performance FOR ALL USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE gsc_search_performance IS 'Raw Google Search Console search analytics data synced via API';
COMMENT ON COLUMN gsc_search_performance.query IS 'Search query string';
COMMENT ON COLUMN gsc_search_performance.page IS 'Full URL of the page that appeared in search results';
COMMENT ON COLUMN gsc_search_performance.device IS 'Device type: DESKTOP, MOBILE, or TABLET';
COMMENT ON COLUMN gsc_search_performance.country IS 'ISO 3166-1 alpha-3 country code (e.g., USA, AUS, GBR)';
COMMENT ON COLUMN gsc_search_performance.ctr IS 'Click-through rate as decimal (0-1)';
COMMENT ON COLUMN gsc_search_performance.position IS 'Average ranking position in search results';
