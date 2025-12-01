-- Migration: Add open tracking and enhance click/send time analytics
-- Description: Add opened_at column, update views for full email engagement tracking
-- Run in: Supabase SQL Editor

-- ============================================================================
-- Add opened_at column for pixel tracking
-- ============================================================================
ALTER TABLE tlx_winback_emails
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

COMMENT ON COLUMN tlx_winback_emails.opened_at IS
  'Timestamp when email was opened (tracking pixel loaded)';

-- Add index for open tracking queries
CREATE INDEX IF NOT EXISTS idx_winback_opened
ON tlx_winback_emails(opened_at)
WHERE opened_at IS NOT NULL;

-- ============================================================================
-- Add first_open_hour for send time optimization
-- ============================================================================
ALTER TABLE tlx_winback_emails
ADD COLUMN IF NOT EXISTS first_open_hour_melbourne INTEGER;

COMMENT ON COLUMN tlx_winback_emails.first_open_hour_melbourne IS
  'Hour of day (0-23) in Melbourne time when email was first opened';

-- Add click_hour for click time analysis
ALTER TABLE tlx_winback_emails
ADD COLUMN IF NOT EXISTS first_click_hour_melbourne INTEGER;

COMMENT ON COLUMN tlx_winback_emails.first_click_hour_melbourne IS
  'Hour of day (0-23) in Melbourne time when link was first clicked';

-- ============================================================================
-- Update tlx_winback_stats view to include opens
-- ============================================================================
CREATE OR REPLACE VIEW tlx_winback_stats AS
SELECT
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS total_opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS total_clicked,
  COUNT(*) FILTER (WHERE status = 'converted') AS total_converted,
  COUNT(*) FILTER (WHERE status = 'bounced') AS total_bounced,
  COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
  COALESCE(SUM(order_total) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours') AS sent_today,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days') AS sent_this_week,
  ROUND(
    (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status = 'sent' OR status = 'clicked' OR status = 'converted'), 0)) * 100,
    2
  ) AS open_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status = 'sent' OR status = 'clicked' OR status = 'converted'), 0)) * 100,
    2
  ) AS click_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'converted')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status = 'sent' OR status = 'clicked' OR status = 'converted'), 0)) * 100,
    2
  ) AS conversion_rate_percent
FROM tlx_winback_emails
WHERE status != 'failed';

COMMENT ON VIEW tlx_winback_stats IS 'Aggregated stats for winback campaign dashboard with open tracking';

-- ============================================================================
-- Enhanced send time analytics view
-- ============================================================================
CREATE OR REPLACE VIEW v_winback_send_time_analytics AS
SELECT
  send_hour_melbourne,
  CASE
    WHEN send_hour_melbourne < 12 THEN send_hour_melbourne || ':00 AM'
    WHEN send_hour_melbourne = 12 THEN '12:00 PM'
    ELSE (send_hour_melbourne - 12) || ':00 PM'
  END as hour_label,
  COUNT(*) as emails_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opens,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicks,
  COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as conversions,
  COALESCE(SUM(order_total) FILTER (WHERE converted_at IS NOT NULL), 0) as revenue,
  ROUND(100.0 * COUNT(*) FILTER (WHERE opened_at IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as open_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as click_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE converted_at IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as conversion_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (opened_at - sent_at)) / 60), 1) as avg_minutes_to_open,
  ROUND(AVG(EXTRACT(EPOCH FROM (clicked_at - sent_at)) / 60), 1) as avg_minutes_to_click
FROM tlx_winback_emails
WHERE send_hour_melbourne IS NOT NULL
  AND status != 'failed'
GROUP BY send_hour_melbourne
ORDER BY send_hour_melbourne;

COMMENT ON VIEW v_winback_send_time_analytics IS
  'Send time analytics by hour for optimizing email delivery times';

-- ============================================================================
-- View: Daily engagement funnel
-- ============================================================================
CREATE OR REPLACE VIEW v_winback_daily_funnel AS
SELECT
  DATE(sent_at AT TIME ZONE 'Australia/Melbourne') as send_date,
  COUNT(*) as sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
  COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as converted,
  COALESCE(SUM(order_total) FILTER (WHERE converted_at IS NOT NULL), 0) as revenue,
  ROUND(100.0 * COUNT(*) FILTER (WHERE opened_at IS NOT NULL) / NULLIF(COUNT(*), 0), 1) as open_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) / NULLIF(COUNT(*), 0), 1) as click_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE converted_at IS NOT NULL) / NULLIF(COUNT(*), 0), 1) as conv_rate
FROM tlx_winback_emails
WHERE status != 'failed'
GROUP BY DATE(sent_at AT TIME ZONE 'Australia/Melbourne')
ORDER BY send_date DESC
LIMIT 30;

COMMENT ON VIEW v_winback_daily_funnel IS
  'Daily engagement funnel: sent → opened → clicked → converted';
