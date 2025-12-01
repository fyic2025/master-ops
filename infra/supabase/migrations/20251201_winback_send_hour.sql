-- Migration: Add send hour tracking for email analytics
-- Description: Track what hour (Melbourne time) emails are sent for B2C/B2B optimization
-- Run in: Supabase SQL Editor

-- Add send_hour_melbourne column to track when emails are sent
ALTER TABLE tlx_winback_emails
ADD COLUMN IF NOT EXISTS send_hour_melbourne INTEGER;

-- Add comment explaining the column
COMMENT ON COLUMN tlx_winback_emails.send_hour_melbourne IS
  'Hour of day (0-23) in Melbourne time when email was sent, for send time optimization';

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_winback_send_hour
ON tlx_winback_emails(send_hour_melbourne)
WHERE send_hour_melbourne IS NOT NULL;

-- View: Send time analytics by hour
CREATE OR REPLACE VIEW v_winback_send_time_analytics AS
SELECT
  send_hour_melbourne,
  CASE
    WHEN send_hour_melbourne < 12 THEN send_hour_melbourne || ':00 AM'
    WHEN send_hour_melbourne = 12 THEN '12:00 PM'
    ELSE (send_hour_melbourne - 12) || ':00 PM'
  END as hour_label,
  COUNT(*) as emails_sent,
  COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as conversions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE converted_at IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as conversion_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (opened_at - sent_at)) / 3600), 2) as avg_hours_to_open
FROM tlx_winback_emails
WHERE send_hour_melbourne IS NOT NULL
  AND status = 'sent'
GROUP BY send_hour_melbourne
ORDER BY send_hour_melbourne;

-- Note: For B2B vs B2C segmentation, you would need to tag profiles
-- Add this column if needed:
-- ALTER TABLE tlx_unengaged_pool ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'b2c';
