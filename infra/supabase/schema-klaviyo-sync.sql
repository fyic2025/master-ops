-- ============================================================================
-- Klaviyo Email Marketing Sync Schema
-- ============================================================================
--
-- This schema stores Klaviyo profile and engagement data for analysis.
-- Supports multiple businesses: Teelixir, Elevate, BOO
--
-- Tables:
--   - klaviyo_profiles: Customer/subscriber data with engagement metrics
--   - klaviyo_segments: Segment definitions and membership counts
--   - klaviyo_segment_snapshots: Historical segment size tracking
--   - klaviyo_campaigns: Campaign performance data
--   - klaviyo_events: Detailed engagement events (opens, clicks, etc.)
--   - klaviyo_sync_log: Sync operation tracking
--
-- Usage:
--   psql "$DATABASE_URL" -f schema-klaviyo-sync.sql
--
-- ============================================================================

-- ============================================================================
-- 1. Profiles Table (Core subscriber data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS klaviyo_profiles (
  id TEXT PRIMARY KEY,                    -- Klaviyo profile ID
  email TEXT NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,

  -- Business source
  source TEXT NOT NULL CHECK (source IN ('teelixir', 'elevate', 'boo', 'rhf')),

  -- Engagement metrics (from Klaviyo predictive analytics)
  email_open_rate DECIMAL(5,4),           -- 0.0000 to 1.0000
  email_click_rate DECIMAL(5,4),
  expected_date_of_next_order TIMESTAMPTZ,
  predicted_clv DECIMAL(10,2),            -- Customer lifetime value
  churn_risk TEXT,                        -- 'low', 'medium', 'high'

  -- Engagement timestamps
  last_email_open TIMESTAMPTZ,
  last_email_click TIMESTAMPTZ,
  last_purchase TIMESTAMPTZ,
  last_active TIMESTAMPTZ,

  -- Purchase data
  total_revenue DECIMAL(12,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2),

  -- Calculated engagement tier
  engagement_tier TEXT CHECK (engagement_tier IN ('engaged', 'at_risk', 'unengaged', 'dormant', 'new')),
  days_since_engagement INTEGER,
  days_since_purchase INTEGER,

  -- List memberships (array of list IDs)
  list_ids TEXT[],
  list_names TEXT[],

  -- Suppression status
  is_suppressed BOOLEAN DEFAULT FALSE,
  suppression_reason TEXT,

  -- Consent
  email_consent BOOLEAN DEFAULT TRUE,
  sms_consent BOOLEAN DEFAULT FALSE,

  -- Raw data from Klaviyo
  properties JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  klaviyo_created_at TIMESTAMPTZ,
  klaviyo_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on email per source (same email can exist in different businesses)
CREATE UNIQUE INDEX IF NOT EXISTS idx_klaviyo_profiles_email_source
  ON klaviyo_profiles(email, source);

CREATE INDEX IF NOT EXISTS idx_klaviyo_profiles_source ON klaviyo_profiles(source);
CREATE INDEX IF NOT EXISTS idx_klaviyo_profiles_engagement ON klaviyo_profiles(engagement_tier, source);
CREATE INDEX IF NOT EXISTS idx_klaviyo_profiles_last_open ON klaviyo_profiles(last_email_open);
CREATE INDEX IF NOT EXISTS idx_klaviyo_profiles_last_purchase ON klaviyo_profiles(last_purchase);
CREATE INDEX IF NOT EXISTS idx_klaviyo_profiles_suppressed ON klaviyo_profiles(is_suppressed) WHERE is_suppressed = TRUE;

-- ============================================================================
-- 2. Segments Table (Segment definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS klaviyo_segments (
  id TEXT PRIMARY KEY,                    -- Klaviyo segment ID
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('teelixir', 'elevate', 'boo', 'rhf')),

  -- Segment metadata
  definition JSONB,                       -- Segment conditions from Klaviyo
  is_active BOOLEAN DEFAULT TRUE,
  is_dynamic BOOLEAN DEFAULT TRUE,        -- Dynamic vs static segment

  -- Current counts
  profile_count INTEGER DEFAULT 0,

  -- Timestamps
  klaviyo_created_at TIMESTAMPTZ,
  klaviyo_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_klaviyo_segments_source ON klaviyo_segments(source);

-- ============================================================================
-- 3. Segment Snapshots (Historical tracking for trends)
-- ============================================================================

CREATE TABLE IF NOT EXISTS klaviyo_segment_snapshots (
  id BIGSERIAL PRIMARY KEY,
  segment_id TEXT NOT NULL REFERENCES klaviyo_segments(id) ON DELETE CASCADE,
  segment_name TEXT NOT NULL,
  source TEXT NOT NULL,

  profile_count INTEGER NOT NULL,

  -- Calculated changes
  change_from_previous INTEGER,
  change_percent DECIMAL(6,2),

  snapshot_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(segment_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_klaviyo_snapshots_segment ON klaviyo_segment_snapshots(segment_id);
CREATE INDEX IF NOT EXISTS idx_klaviyo_snapshots_date ON klaviyo_segment_snapshots(snapshot_date);

-- ============================================================================
-- 4. Campaigns Table (Email campaign performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS klaviyo_campaigns (
  id TEXT PRIMARY KEY,                    -- Klaviyo campaign ID
  name TEXT NOT NULL,
  subject TEXT,
  preview_text TEXT,
  source TEXT NOT NULL CHECK (source IN ('teelixir', 'elevate', 'boo', 'rhf')),

  -- Campaign type
  campaign_type TEXT,                     -- 'campaign', 'flow'
  status TEXT,                            -- 'draft', 'scheduled', 'sent', 'cancelled'

  -- Audience
  list_id TEXT,
  segment_id TEXT,

  -- Send metrics
  send_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,

  -- Engagement metrics
  open_count INTEGER DEFAULT 0,
  unique_open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,

  -- Negative metrics
  unsubscribe_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  spam_count INTEGER DEFAULT 0,

  -- Revenue
  revenue DECIMAL(12,2) DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,

  -- Calculated rates
  open_rate DECIMAL(5,4),
  click_rate DECIMAL(5,4),
  click_to_open_rate DECIMAL(5,4),
  unsubscribe_rate DECIMAL(5,4),
  bounce_rate DECIMAL(5,4),

  -- Timestamps
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_klaviyo_campaigns_source ON klaviyo_campaigns(source);
CREATE INDEX IF NOT EXISTS idx_klaviyo_campaigns_sent ON klaviyo_campaigns(sent_at);
CREATE INDEX IF NOT EXISTS idx_klaviyo_campaigns_status ON klaviyo_campaigns(status);

-- ============================================================================
-- 5. Events Table (Detailed engagement events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS klaviyo_events (
  id TEXT PRIMARY KEY,                    -- Klaviyo event ID
  profile_id TEXT REFERENCES klaviyo_profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('teelixir', 'elevate', 'boo', 'rhf')),

  -- Event type
  event_type TEXT NOT NULL,               -- 'Opened Email', 'Clicked Email', 'Placed Order', etc.

  -- Related objects
  campaign_id TEXT REFERENCES klaviyo_campaigns(id) ON DELETE SET NULL,
  flow_id TEXT,
  flow_name TEXT,

  -- Event details
  event_data JSONB DEFAULT '{}'::jsonb,

  -- For click events
  clicked_url TEXT,

  -- For order events
  order_value DECIMAL(10,2),

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_klaviyo_events_profile ON klaviyo_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_klaviyo_events_type ON klaviyo_events(event_type);
CREATE INDEX IF NOT EXISTS idx_klaviyo_events_occurred ON klaviyo_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_klaviyo_events_source ON klaviyo_events(source);
CREATE INDEX IF NOT EXISTS idx_klaviyo_events_campaign ON klaviyo_events(campaign_id);

-- ============================================================================
-- 6. Sync Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS klaviyo_sync_log (
  id BIGSERIAL PRIMARY KEY,

  source TEXT NOT NULL CHECK (source IN ('teelixir', 'elevate', 'boo', 'rhf')),
  object_type TEXT NOT NULL CHECK (object_type IN ('profile', 'segment', 'campaign', 'event', 'metric')),

  operation TEXT NOT NULL CHECK (operation IN ('full_sync', 'incremental', 'webhook')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('started', 'success', 'error', 'partial')),

  -- Counts
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error details
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Sync metadata
  sync_cursor TEXT,                       -- For pagination
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_klaviyo_sync_source ON klaviyo_sync_log(source);
CREATE INDEX IF NOT EXISTS idx_klaviyo_sync_status ON klaviyo_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_klaviyo_sync_started ON klaviyo_sync_log(started_at);

-- ============================================================================
-- 7. Views for Analysis
-- ============================================================================

-- Engagement summary by source
CREATE OR REPLACE VIEW v_klaviyo_engagement_summary AS
SELECT
  source,
  engagement_tier,
  COUNT(*) as profile_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY source), 2) as percentage,
  ROUND(AVG(total_revenue), 2) as avg_revenue,
  ROUND(AVG(order_count), 1) as avg_orders
FROM klaviyo_profiles
WHERE is_suppressed = FALSE
GROUP BY source, engagement_tier
ORDER BY source,
  CASE engagement_tier
    WHEN 'engaged' THEN 1
    WHEN 'at_risk' THEN 2
    WHEN 'unengaged' THEN 3
    WHEN 'dormant' THEN 4
    WHEN 'new' THEN 5
  END;

-- High-value unengaged (reactivation targets)
CREATE OR REPLACE VIEW v_klaviyo_reactivation_targets AS
SELECT
  source,
  email,
  first_name,
  last_name,
  total_revenue,
  order_count,
  days_since_engagement,
  days_since_purchase,
  last_email_open,
  last_purchase,
  predicted_clv
FROM klaviyo_profiles
WHERE engagement_tier IN ('unengaged', 'dormant')
  AND is_suppressed = FALSE
  AND total_revenue > 50
ORDER BY total_revenue DESC;

-- Segment trend (last 30 days)
CREATE OR REPLACE VIEW v_klaviyo_segment_trends AS
SELECT
  s.name as segment_name,
  s.source,
  ss.snapshot_date,
  ss.profile_count,
  ss.change_from_previous,
  ss.change_percent
FROM klaviyo_segments s
JOIN klaviyo_segment_snapshots ss ON s.id = ss.segment_id
WHERE ss.snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY s.source, s.name, ss.snapshot_date DESC;

-- Campaign performance summary
CREATE OR REPLACE VIEW v_klaviyo_campaign_performance AS
SELECT
  source,
  DATE_TRUNC('month', sent_at) as month,
  COUNT(*) as campaigns_sent,
  SUM(send_count) as total_sends,
  ROUND(AVG(open_rate) * 100, 2) as avg_open_rate,
  ROUND(AVG(click_rate) * 100, 2) as avg_click_rate,
  SUM(revenue) as total_revenue,
  SUM(unsubscribe_count) as total_unsubscribes
FROM klaviyo_campaigns
WHERE sent_at IS NOT NULL
GROUP BY source, DATE_TRUNC('month', sent_at)
ORDER BY source, month DESC;

-- ============================================================================
-- 8. Functions for Engagement Tier Calculation
-- ============================================================================

-- Calculate engagement tier based on activity
CREATE OR REPLACE FUNCTION calculate_engagement_tier(
  p_last_open TIMESTAMPTZ,
  p_last_click TIMESTAMPTZ,
  p_last_purchase TIMESTAMPTZ,
  p_created_at TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
  v_last_activity TIMESTAMPTZ;
  v_days_inactive INTEGER;
BEGIN
  -- Get most recent activity
  v_last_activity := GREATEST(
    COALESCE(p_last_open, '1970-01-01'),
    COALESCE(p_last_click, '1970-01-01'),
    COALESCE(p_last_purchase, '1970-01-01')
  );

  -- If never active, check if new
  IF v_last_activity = '1970-01-01' THEN
    IF p_created_at > NOW() - INTERVAL '30 days' THEN
      RETURN 'new';
    ELSE
      RETURN 'dormant';
    END IF;
  END IF;

  v_days_inactive := EXTRACT(DAY FROM NOW() - v_last_activity);

  -- Engagement tiers based on days since last activity
  IF v_days_inactive <= 30 THEN
    RETURN 'engaged';
  ELSIF v_days_inactive <= 90 THEN
    RETURN 'at_risk';
  ELSIF v_days_inactive <= 180 THEN
    RETURN 'unengaged';
  ELSE
    RETURN 'dormant';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update engagement tiers for all profiles
CREATE OR REPLACE FUNCTION update_all_engagement_tiers()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE klaviyo_profiles
  SET
    engagement_tier = calculate_engagement_tier(
      last_email_open,
      last_email_click,
      last_purchase,
      klaviyo_created_at
    ),
    days_since_engagement = EXTRACT(DAY FROM NOW() - GREATEST(
      COALESCE(last_email_open, '1970-01-01'),
      COALESCE(last_email_click, '1970-01-01')
    ))::INTEGER,
    days_since_purchase = CASE
      WHEN last_purchase IS NOT NULL
      THEN EXTRACT(DAY FROM NOW() - last_purchase)::INTEGER
      ELSE NULL
    END,
    updated_at = NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. RLS Policies (Optional - Enable if needed)
-- ============================================================================

-- ALTER TABLE klaviyo_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE klaviyo_segments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE klaviyo_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE klaviyo_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE klaviyo_sync_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Done
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Klaviyo schema created successfully';
  RAISE NOTICE 'Tables: klaviyo_profiles, klaviyo_segments, klaviyo_segment_snapshots, klaviyo_campaigns, klaviyo_events, klaviyo_sync_log';
  RAISE NOTICE 'Views: v_klaviyo_engagement_summary, v_klaviyo_reactivation_targets, v_klaviyo_segment_trends, v_klaviyo_campaign_performance';
END $$;
