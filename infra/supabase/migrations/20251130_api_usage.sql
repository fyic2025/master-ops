-- API Usage Tracking Schema
-- Track daily API calls by service to monitor costs

-- Daily aggregated API usage (lightweight - ~365 rows/year per service)
CREATE TABLE IF NOT EXISTS api_usage_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,        -- 'google_merchant', 'gmc_performance', 'gsc', 'xero', 'bigcommerce', etc.
  usage_date DATE NOT NULL,
  call_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service, usage_date)
);

-- Index for efficient date-range queries
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_daily(usage_date);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_daily(service);

-- Function to increment API usage (upsert pattern)
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_service TEXT,
  p_date DATE,
  p_calls INTEGER,
  p_errors INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO api_usage_daily (service, usage_date, call_count, error_count)
  VALUES (p_service, p_date, p_calls, p_errors)
  ON CONFLICT (service, usage_date)
  DO UPDATE SET
    call_count = api_usage_daily.call_count + p_calls,
    error_count = api_usage_daily.error_count + p_errors,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- View for quick stats (last 30 days by default)
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT
  service,
  SUM(CASE WHEN usage_date = CURRENT_DATE THEN call_count ELSE 0 END) as today_calls,
  SUM(CASE WHEN usage_date = CURRENT_DATE THEN error_count ELSE 0 END) as today_errors,
  SUM(CASE WHEN usage_date >= CURRENT_DATE - INTERVAL '7 days' THEN call_count ELSE 0 END) as last_7d_calls,
  SUM(CASE WHEN usage_date >= CURRENT_DATE - INTERVAL '7 days' THEN error_count ELSE 0 END) as last_7d_errors,
  SUM(CASE WHEN usage_date >= CURRENT_DATE - INTERVAL '30 days' THEN call_count ELSE 0 END) as last_30d_calls,
  SUM(CASE WHEN usage_date >= CURRENT_DATE - INTERVAL '30 days' THEN error_count ELSE 0 END) as last_30d_errors
FROM api_usage_daily
WHERE usage_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY service
ORDER BY last_30d_calls DESC;

-- Cleanup function to remove old records (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_usage() RETURNS void AS $$
BEGIN
  DELETE FROM api_usage_daily
  WHERE usage_date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON api_usage_daily TO authenticated;
GRANT SELECT ON api_usage_summary TO authenticated;
GRANT EXECUTE ON FUNCTION increment_api_usage TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_api_usage TO authenticated;
