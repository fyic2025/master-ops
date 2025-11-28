-- GTMetrix Performance Testing Schema
-- Stores website performance test results for SEO team analysis
-- Created: 2025-11-28

-- ============================================================================
-- MAIN TABLE: gtmetrix_tests
-- ============================================================================

CREATE TABLE IF NOT EXISTS gtmetrix_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Business identification
  business TEXT NOT NULL CHECK (business IN ('boo', 'teelixir', 'rhf', 'elevate', 'other')),
  url TEXT NOT NULL,
  test_id TEXT, -- GTMetrix test ID

  -- Scores (0-100 or letter grade)
  gtmetrix_grade TEXT, -- A, B, C, D, E, F
  performance_score INTEGER, -- 0-100
  structure_score INTEGER, -- 0-100

  -- Core Web Vitals
  lcp_ms INTEGER, -- Largest Contentful Paint (milliseconds)
  tbt_ms INTEGER, -- Total Blocking Time (milliseconds)
  cls DECIMAL(6,4), -- Cumulative Layout Shift (0.000 - 1.000+)

  -- Page Metrics
  fully_loaded_ms INTEGER, -- Time to fully loaded (milliseconds)
  page_size_bytes BIGINT, -- Total page size
  total_requests INTEGER, -- Number of HTTP requests

  -- Resource Breakdown (bytes)
  js_bytes BIGINT,
  css_bytes BIGINT,
  image_bytes BIGINT,
  font_bytes BIGINT,

  -- Issues identified
  issues JSONB DEFAULT '[]', -- Array of {severity, category, issue, value, target, fix}

  -- Report links
  report_url TEXT,
  pdf_url TEXT,
  har_url TEXT,

  -- Timestamps
  tested_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by business and date
CREATE INDEX IF NOT EXISTS idx_gtmetrix_tests_business_date
  ON gtmetrix_tests(business, tested_at DESC);

-- Index for URL lookups
CREATE INDEX IF NOT EXISTS idx_gtmetrix_tests_url
  ON gtmetrix_tests(url);

-- ============================================================================
-- VIEW: Latest test per URL
-- ============================================================================

CREATE OR REPLACE VIEW v_gtmetrix_latest AS
SELECT DISTINCT ON (url)
  id,
  business,
  url,
  gtmetrix_grade,
  performance_score,
  structure_score,
  lcp_ms,
  tbt_ms,
  cls,
  fully_loaded_ms,
  page_size_bytes,
  total_requests,
  jsonb_array_length(issues) as issue_count,
  report_url,
  tested_at
FROM gtmetrix_tests
ORDER BY url, tested_at DESC;

-- ============================================================================
-- VIEW: Performance trends by business
-- ============================================================================

CREATE OR REPLACE VIEW v_gtmetrix_trends AS
SELECT
  business,
  DATE_TRUNC('day', tested_at) as test_date,
  COUNT(*) as tests_run,
  AVG(performance_score) as avg_performance,
  AVG(lcp_ms) as avg_lcp_ms,
  AVG(tbt_ms) as avg_tbt_ms,
  AVG(cls) as avg_cls,
  AVG(page_size_bytes) as avg_page_size
FROM gtmetrix_tests
GROUP BY business, DATE_TRUNC('day', tested_at)
ORDER BY business, test_date DESC;

-- ============================================================================
-- VIEW: Pages needing attention (failing Core Web Vitals)
-- ============================================================================

CREATE OR REPLACE VIEW v_gtmetrix_needs_attention AS
SELECT
  business,
  url,
  gtmetrix_grade,
  performance_score,
  lcp_ms,
  CASE WHEN lcp_ms > 2500 THEN 'FAIL' ELSE 'PASS' END as lcp_status,
  tbt_ms,
  CASE WHEN tbt_ms > 200 THEN 'FAIL' ELSE 'PASS' END as tbt_status,
  cls,
  CASE WHEN cls > 0.1 THEN 'FAIL' ELSE 'PASS' END as cls_status,
  jsonb_array_length(issues) as issue_count,
  report_url,
  tested_at
FROM v_gtmetrix_latest
WHERE lcp_ms > 2500 OR tbt_ms > 200 OR cls > 0.1
ORDER BY
  CASE WHEN lcp_ms > 4000 OR tbt_ms > 600 OR cls > 0.25 THEN 0 ELSE 1 END,
  performance_score ASC;

-- ============================================================================
-- FUNCTION: Get performance summary for a business
-- ============================================================================

CREATE OR REPLACE FUNCTION get_gtmetrix_summary(p_business TEXT DEFAULT NULL)
RETURNS TABLE (
  business TEXT,
  total_tests BIGINT,
  avg_performance NUMERIC,
  avg_lcp_ms NUMERIC,
  avg_tbt_ms NUMERIC,
  avg_cls NUMERIC,
  pages_failing_cwv BIGINT,
  last_test_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.business,
    COUNT(*)::BIGINT as total_tests,
    ROUND(AVG(t.performance_score), 1) as avg_performance,
    ROUND(AVG(t.lcp_ms), 0) as avg_lcp_ms,
    ROUND(AVG(t.tbt_ms), 0) as avg_tbt_ms,
    ROUND(AVG(t.cls), 3) as avg_cls,
    COUNT(*) FILTER (WHERE t.lcp_ms > 2500 OR t.tbt_ms > 200 OR t.cls > 0.1)::BIGINT as pages_failing_cwv,
    MAX(t.tested_at) as last_test_at
  FROM gtmetrix_tests t
  WHERE (p_business IS NULL OR t.business = p_business)
  GROUP BY t.business;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE gtmetrix_tests ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to gtmetrix_tests"
  ON gtmetrix_tests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE gtmetrix_tests IS 'GTMetrix performance test results for SEO analysis';
COMMENT ON VIEW v_gtmetrix_latest IS 'Latest test result per URL';
COMMENT ON VIEW v_gtmetrix_trends IS 'Performance trends by business over time';
COMMENT ON VIEW v_gtmetrix_needs_attention IS 'Pages failing Core Web Vitals thresholds';
COMMENT ON FUNCTION get_gtmetrix_summary IS 'Get performance summary statistics by business';
