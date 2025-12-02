-- Fix: Update stats view to use Melbourne timezone for sent_today/sent_this_week
-- The previous view used UTC which caused incorrect counts

DROP VIEW IF EXISTS tlx_winback_stats;

CREATE VIEW tlx_winback_stats AS
SELECT
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS total_opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS total_clicked,
  COUNT(*) FILTER (WHERE status = 'converted') AS total_converted,
  COUNT(*) FILTER (WHERE status = 'bounced') AS total_bounced,
  COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
  COALESCE(SUM(order_total) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
  -- Use Melbourne timezone for "today"
  COUNT(*) FILTER (WHERE
    DATE(sent_at AT TIME ZONE 'Australia/Melbourne') = DATE(NOW() AT TIME ZONE 'Australia/Melbourne')
  ) AS sent_today,
  -- Use Melbourne timezone for "this week"
  COUNT(*) FILTER (WHERE
    sent_at AT TIME ZONE 'Australia/Melbourne' >= (NOW() AT TIME ZONE 'Australia/Melbourne') - INTERVAL '7 days'
  ) AS sent_this_week,
  ROUND(
    (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'clicked', 'converted')), 0)) * 100,
    2
  ) AS open_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'clicked', 'converted')), 0)) * 100,
    2
  ) AS click_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'converted')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'clicked', 'converted')), 0)) * 100,
    2
  ) AS conversion_rate_percent
FROM tlx_winback_emails
WHERE status != 'failed';
