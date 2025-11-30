-- GSC Issues Tracking Schema (API-Only Approach)
-- Detects issues via traffic anomalies, confirms with URL Inspection API
-- Created: 2025-11-30

-- ============================================================================
-- TABLE: gsc_page_daily_stats
-- Daily performance snapshots for anomaly detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS gsc_page_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business TEXT NOT NULL CHECK (business IN ('boo', 'teelixir', 'rhf', 'elevate')),
  url TEXT NOT NULL,
  stat_date DATE NOT NULL,

  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  avg_position DECIMAL(5,2),
  ctr DECIMAL(5,4),

  -- Tracking
  first_seen DATE,  -- First time this URL appeared in GSC
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, url, stat_date)
);

CREATE INDEX idx_gsc_daily_stats_lookup
  ON gsc_page_daily_stats(business, url, stat_date DESC);
CREATE INDEX idx_gsc_daily_stats_date
  ON gsc_page_daily_stats(business, stat_date DESC);
CREATE INDEX idx_gsc_daily_stats_first_seen
  ON gsc_page_daily_stats(business, first_seen DESC);

-- ============================================================================
-- TABLE: gsc_issue_urls
-- Individual URL issues discovered via URL Inspection API
-- ============================================================================

CREATE TABLE IF NOT EXISTS gsc_issue_urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business TEXT NOT NULL CHECK (business IN ('boo', 'teelixir', 'rhf', 'elevate')),
  url TEXT NOT NULL,

  -- Issue classification (from URL Inspection API)
  issue_type TEXT NOT NULL,  -- 'not_found_404', 'soft_404', 'blocked_robots', 'server_error', etc.
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning')),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),

  -- Dates
  first_detected DATE NOT NULL,
  last_checked DATE NOT NULL,
  resolved_at TIMESTAMPTZ,

  -- URL Inspection API response
  api_verdict TEXT,  -- 'PASS', 'PARTIAL', 'FAIL', 'NEUTRAL'
  api_coverage_state TEXT,  -- 'Submitted and indexed', 'Crawled - currently not indexed', etc.
  api_indexing_state TEXT,  -- 'INDEXING_ALLOWED', 'BLOCKED_BY_META_TAG', 'BLOCKED_BY_HTTP_HEADER'
  api_robots_state TEXT,  -- 'ALLOWED', 'DISALLOWED'
  api_page_fetch_state TEXT,  -- 'SUCCESSFUL', 'SOFT_404', 'REDIRECT', 'NOT_FOUND', 'SERVER_ERROR'

  -- Detection context
  detection_reason TEXT,  -- 'traffic_drop', 'new_url', 'fix_verification', 'rotation', 'disappeared'
  traffic_before INTEGER,  -- Impressions before issue (7-day avg)
  traffic_after INTEGER,  -- Impressions when detected

  -- Resolution
  resolution_type TEXT,  -- 'auto_verified', 'traffic_recovered', 'manual'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, url, issue_type)
);

CREATE INDEX idx_gsc_issues_business ON gsc_issue_urls(business);
CREATE INDEX idx_gsc_issues_status ON gsc_issue_urls(status);
CREATE INDEX idx_gsc_issues_type ON gsc_issue_urls(issue_type);
CREATE INDEX idx_gsc_issues_active ON gsc_issue_urls(business, status) WHERE status = 'active';
CREATE INDEX idx_gsc_issues_last_checked ON gsc_issue_urls(last_checked DESC);

-- ============================================================================
-- TABLE: gsc_sync_logs
-- Audit trail for daily sync runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS gsc_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business TEXT NOT NULL CHECK (business IN ('boo', 'teelixir', 'rhf', 'elevate')),
  sync_date DATE NOT NULL,

  -- Sync stats
  pages_synced INTEGER DEFAULT 0,
  anomalies_detected INTEGER DEFAULT 0,
  urls_inspected INTEGER DEFAULT 0,
  new_issues_found INTEGER DEFAULT 0,
  issues_resolved INTEGER DEFAULT 0,
  api_calls_used INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gsc_sync_logs_date ON gsc_sync_logs(business, sync_date DESC);

-- ============================================================================
-- VIEWS: Reporting and Analysis
-- ============================================================================

-- Active issues summary by type
CREATE OR REPLACE VIEW v_gsc_active_issues AS
SELECT
  business,
  issue_type,
  severity,
  COUNT(*) as count,
  MIN(first_detected) as oldest_issue,
  MAX(last_checked) as most_recent_check
FROM gsc_issue_urls
WHERE status = 'active'
GROUP BY business, issue_type, severity
ORDER BY business, severity, count DESC;

-- Traffic anomalies (URLs with >50% drop vs 7-day avg)
CREATE OR REPLACE VIEW v_gsc_traffic_anomalies AS
WITH recent_stats AS (
  SELECT
    business,
    url,
    stat_date,
    impressions,
    AVG(impressions) OVER (
      PARTITION BY business, url
      ORDER BY stat_date
      ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
    ) as avg_impressions_7d
  FROM gsc_page_daily_stats
  WHERE stat_date >= CURRENT_DATE - INTERVAL '8 days'
)
SELECT
  business,
  url,
  stat_date,
  impressions as current_impressions,
  ROUND(avg_impressions_7d) as avg_7d,
  CASE
    WHEN avg_impressions_7d > 0 THEN
      ROUND(((avg_impressions_7d - impressions) / avg_impressions_7d * 100)::numeric, 1)
    ELSE 0
  END as drop_percentage
FROM recent_stats
WHERE stat_date = CURRENT_DATE - INTERVAL '1 day'
  AND avg_impressions_7d > 10  -- Only URLs with meaningful traffic
  AND impressions < avg_impressions_7d * 0.5  -- >50% drop
ORDER BY drop_percentage DESC;

-- New URLs (first seen recently)
CREATE OR REPLACE VIEW v_gsc_new_urls AS
SELECT DISTINCT ON (business, url)
  business,
  url,
  first_seen,
  impressions,
  clicks
FROM gsc_page_daily_stats
WHERE first_seen >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY business, url, stat_date DESC;

-- Resolution rate (last 30 days)
CREATE OR REPLACE VIEW v_gsc_resolution_rate AS
SELECT
  business,
  COUNT(*) FILTER (WHERE resolved_at > NOW() - INTERVAL '30 days') as resolved_30d,
  COUNT(*) FILTER (WHERE first_detected > CURRENT_DATE - INTERVAL '30 days') as new_30d,
  COUNT(*) FILTER (WHERE status = 'active') as currently_active
FROM gsc_issue_urls
GROUP BY business;

-- URLs needing inspection (queue for URL Inspection API)
CREATE OR REPLACE VIEW v_gsc_inspection_queue AS
WITH anomalies AS (
  SELECT business, url, 'traffic_drop' as reason, drop_percentage as priority
  FROM v_gsc_traffic_anomalies
),
new_urls AS (
  SELECT business, url, 'new_url' as reason, impressions as priority
  FROM v_gsc_new_urls
  WHERE NOT EXISTS (
    SELECT 1 FROM gsc_issue_urls i
    WHERE i.business = v_gsc_new_urls.business
      AND i.url = v_gsc_new_urls.url
      AND i.last_checked > CURRENT_DATE - INTERVAL '7 days'
  )
),
fix_verify AS (
  SELECT business, url, 'fix_verification' as reason, 100 as priority
  FROM gsc_issue_urls
  WHERE status = 'resolved'
    AND resolved_at > NOW() - INTERVAL '7 days'
    AND (last_checked < CURRENT_DATE OR last_checked IS NULL)
)
SELECT * FROM anomalies
UNION ALL
SELECT * FROM new_urls
UNION ALL
SELECT * FROM fix_verify
ORDER BY priority DESC;

-- ============================================================================
-- FUNCTIONS: Utility
-- ============================================================================

-- Get issue type from URL Inspection API response
CREATE OR REPLACE FUNCTION classify_gsc_issue(
  p_verdict TEXT,
  p_coverage_state TEXT,
  p_page_fetch_state TEXT,
  p_robots_state TEXT
) RETURNS TABLE (issue_type TEXT, severity TEXT) AS $$
BEGIN
  -- Check for 404
  IF p_page_fetch_state = 'NOT_FOUND' THEN
    RETURN QUERY SELECT 'not_found_404'::TEXT, 'critical'::TEXT;
    RETURN;
  END IF;

  -- Check for soft 404
  IF p_page_fetch_state = 'SOFT_404' THEN
    RETURN QUERY SELECT 'soft_404'::TEXT, 'critical'::TEXT;
    RETURN;
  END IF;

  -- Check for server error
  IF p_page_fetch_state = 'SERVER_ERROR' THEN
    RETURN QUERY SELECT 'server_error'::TEXT, 'critical'::TEXT;
    RETURN;
  END IF;

  -- Check for robots.txt block
  IF p_robots_state = 'DISALLOWED' THEN
    RETURN QUERY SELECT 'blocked_robots'::TEXT, 'warning'::TEXT;
    RETURN;
  END IF;

  -- Check for noindex
  IF p_coverage_state ILIKE '%noindex%' THEN
    RETURN QUERY SELECT 'blocked_noindex'::TEXT, 'warning'::TEXT;
    RETURN;
  END IF;

  -- Check for crawled but not indexed
  IF p_coverage_state ILIKE '%crawled%not indexed%' THEN
    RETURN QUERY SELECT 'crawled_not_indexed'::TEXT, 'warning'::TEXT;
    RETURN;
  END IF;

  -- No issue detected
  RETURN QUERY SELECT NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE gsc_page_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_issue_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_sync_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access" ON gsc_page_daily_stats FOR ALL USING (true);
CREATE POLICY "Service role full access" ON gsc_issue_urls FOR ALL USING (true);
CREATE POLICY "Service role full access" ON gsc_sync_logs FOR ALL USING (true);

-- ============================================================================
-- Triggers: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gsc_issue_urls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gsc_issue_urls_updated_at
  BEFORE UPDATE ON gsc_issue_urls
  FOR EACH ROW
  EXECUTE FUNCTION update_gsc_issue_urls_updated_at();
