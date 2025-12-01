-- Migration: Winback email queue for scheduled sending
-- Description: Queue emails with random send hours for A/B testing send times
-- Run in: Supabase SQL Editor

-- ============================================================================
-- Queue table for scheduled winback emails
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_winback_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  klaviyo_profile_id TEXT,
  first_name TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_hour INTEGER NOT NULL CHECK (scheduled_hour >= 0 AND scheduled_hour <= 23),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  CONSTRAINT tlx_winback_queue_email_date_unique UNIQUE (email, scheduled_date)
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_winback_queue_pending
ON tlx_winback_queue(scheduled_date, scheduled_hour, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_winback_queue_email
ON tlx_winback_queue(email);

COMMENT ON TABLE tlx_winback_queue IS 'Queue for scheduled winback emails with random send hours for A/B testing';
COMMENT ON COLUMN tlx_winback_queue.scheduled_hour IS 'Hour of day (Melbourne time) when email should be sent (9-18 typically)';

-- ============================================================================
-- View: Queue status summary
-- ============================================================================
CREATE OR REPLACE VIEW v_winback_queue_status AS
SELECT
  scheduled_date,
  scheduled_hour,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) as total
FROM tlx_winback_queue
WHERE scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY scheduled_date, scheduled_hour
ORDER BY scheduled_date DESC, scheduled_hour;

-- ============================================================================
-- View: Today's hourly schedule
-- ============================================================================
CREATE OR REPLACE VIEW v_winback_today_schedule AS
SELECT
  scheduled_hour,
  CASE
    WHEN scheduled_hour < 12 THEN scheduled_hour || ':00 AM'
    WHEN scheduled_hour = 12 THEN '12:00 PM'
    ELSE (scheduled_hour - 12) || ':00 PM'
  END as hour_label,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) as total
FROM tlx_winback_queue
WHERE scheduled_date = CURRENT_DATE
GROUP BY scheduled_hour
ORDER BY scheduled_hour;
