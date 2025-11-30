-- GSC Aggregation Functions
-- These functions aggregate daily stats efficiently server-side

-- Function to get totals for a date range
CREATE OR REPLACE FUNCTION get_gsc_totals(
  p_business TEXT,
  p_from DATE,
  p_to DATE
)
RETURNS TABLE (
  total_clicks BIGINT,
  total_impressions BIGINT,
  weighted_position_sum NUMERIC,
  unique_urls BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(clicks), 0)::BIGINT as total_clicks,
    COALESCE(SUM(impressions), 0)::BIGINT as total_impressions,
    COALESCE(SUM(avg_position::NUMERIC * impressions), 0) as weighted_position_sum,
    COUNT(DISTINCT url) as unique_urls
  FROM gsc_page_daily_stats
  WHERE business = p_business
    AND stat_date >= p_from
    AND stat_date <= p_to;
$$;

-- Function to get aggregated page stats for a date range
CREATE OR REPLACE FUNCTION get_gsc_pages(
  p_business TEXT,
  p_from DATE,
  p_to DATE,
  p_limit INT DEFAULT 100,
  p_sort_by TEXT DEFAULT 'clicks'
)
RETURNS TABLE (
  url TEXT,
  clicks BIGINT,
  impressions BIGINT,
  avg_position NUMERIC,
  ctr NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    url,
    SUM(clicks)::BIGINT as clicks,
    SUM(impressions)::BIGINT as impressions,
    CASE
      WHEN SUM(impressions) > 0
      THEN SUM(avg_position::NUMERIC * impressions) / SUM(impressions)
      ELSE 0
    END as avg_position,
    CASE
      WHEN SUM(impressions) > 0
      THEN (SUM(clicks)::NUMERIC / SUM(impressions)) * 100
      ELSE 0
    END as ctr
  FROM gsc_page_daily_stats
  WHERE business = p_business
    AND stat_date >= p_from
    AND stat_date <= p_to
  GROUP BY url
  ORDER BY
    CASE WHEN p_sort_by = 'clicks' THEN SUM(clicks) END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'impressions' THEN SUM(impressions) END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'position' THEN SUM(avg_position::NUMERIC * impressions) / NULLIF(SUM(impressions), 0) END ASC NULLS LAST
  LIMIT p_limit;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_gsc_totals TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_gsc_pages TO authenticated, anon, service_role;
