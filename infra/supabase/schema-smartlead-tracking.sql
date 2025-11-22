-- ============================================================================
-- Smartlead Cold Outreach Tracking Schema
-- ============================================================================
--
-- This schema tracks cold email campaigns, leads, and engagement metrics
-- from Smartlead platform, syncing with HubSpot CRM.
--
-- Tables:
--   - smartlead_campaigns: Campaign metadata
--   - smartlead_leads: Lead data and status
--   - smartlead_emails: Email send events
--   - smartlead_engagement: Opens, clicks, replies
--   - smartlead_sync_log: Sync operation tracking
--
-- Usage:
--   psql "postgresql://postgres:[PASSWORD]@db.qcvfxxsnqvdfmpbcgdni.supabase.co:5432/postgres" -f schema-smartlead-tracking.sql
--
-- Or via Supabase SQL Editor:
--   1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new
--   2. Copy and paste this entire file
--   3. Click "Run"
--
-- ============================================================================

-- ============================================================================
-- 1. Campaigns Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartlead_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFTED', 'ACTIVE', 'COMPLETED', 'STOPPED', 'PAUSED')),
  client_id TEXT,

  -- Schedule settings
  timezone TEXT,
  days_of_week INTEGER[],
  start_hour INTEGER,
  end_hour INTEGER,
  max_leads_per_day INTEGER,

  -- Tracking settings
  track_opens BOOLEAN DEFAULT TRUE,
  track_clicks BOOLEAN DEFAULT TRUE,
  stop_on_reply BOOLEAN DEFAULT TRUE,

  -- Campaign metadata
  hubspot_deal_pipeline_id TEXT,
  hubspot_deal_stage_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_smartlead_campaigns_status ON smartlead_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_smartlead_campaigns_last_synced ON smartlead_campaigns(last_synced_at);

-- ============================================================================
-- 2. Leads Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartlead_leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone_number TEXT,
  website TEXT,
  location TEXT,
  linkedin_profile TEXT,

  -- Campaign association
  campaign_id TEXT REFERENCES smartlead_campaigns(id) ON DELETE CASCADE,
  campaign_lead_map_id TEXT,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'COMPLETED', 'BLOCKED', 'INPROGRESS', 'PAUSED')),

  -- HubSpot sync
  hubspot_contact_id TEXT,
  hubspot_last_sync TIMESTAMPTZ,

  -- Custom fields (JSON for flexibility)
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(email, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_smartlead_leads_email ON smartlead_leads(email);
CREATE INDEX IF NOT EXISTS idx_smartlead_leads_campaign ON smartlead_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_leads_status ON smartlead_leads(status);
CREATE INDEX IF NOT EXISTS idx_smartlead_leads_hubspot_contact ON smartlead_leads(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_leads_custom_fields ON smartlead_leads USING gin(custom_fields);

-- ============================================================================
-- 3. Emails Table (Sent emails tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartlead_emails (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES smartlead_leads(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES smartlead_campaigns(id) ON DELETE CASCADE,

  -- Email details
  sequence_number INTEGER NOT NULL,
  subject TEXT,
  email_body TEXT,
  from_email TEXT,

  -- Status
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,

  -- Email account used
  email_account_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smartlead_emails_lead ON smartlead_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_emails_campaign ON smartlead_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_emails_sent ON smartlead_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_smartlead_emails_sequence ON smartlead_emails(sequence_number);

-- ============================================================================
-- 4. Engagement Table (Opens, clicks, replies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartlead_engagement (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL REFERENCES smartlead_emails(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES smartlead_leads(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES smartlead_campaigns(id) ON DELETE CASCADE,

  -- Engagement type
  event_type TEXT NOT NULL CHECK (event_type IN ('EMAIL_OPEN', 'EMAIL_LINK_CLICK', 'EMAIL_REPLY', 'LEAD_UNSUBSCRIBED')),

  -- Event details
  event_data JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address INET,
  clicked_url TEXT,
  reply_content TEXT,

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smartlead_engagement_email ON smartlead_engagement(email_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_engagement_lead ON smartlead_engagement(lead_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_engagement_campaign ON smartlead_engagement(campaign_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_engagement_type ON smartlead_engagement(event_type);
CREATE INDEX IF NOT EXISTS idx_smartlead_engagement_occurred ON smartlead_engagement(occurred_at);

-- ============================================================================
-- 5. Sync Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartlead_sync_log (
  id BIGSERIAL PRIMARY KEY,

  -- What was synced
  object_type TEXT NOT NULL CHECK (object_type IN ('campaign', 'lead', 'email', 'engagement')),
  object_id TEXT NOT NULL,

  -- Sync operation
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'webhook_received')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'error', 'skipped')),

  -- External system
  external_system TEXT DEFAULT 'hubspot',
  external_id TEXT,

  -- Details
  sync_details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smartlead_sync_log_object ON smartlead_sync_log(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_smartlead_sync_log_status ON smartlead_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_smartlead_sync_log_synced_at ON smartlead_sync_log(synced_at);
CREATE INDEX IF NOT EXISTS idx_smartlead_sync_log_external ON smartlead_sync_log(external_system, external_id);

-- ============================================================================
-- 6. Helper Views
-- ============================================================================

-- Campaign performance summary
CREATE OR REPLACE VIEW v_smartlead_campaign_performance AS
SELECT
  c.id as campaign_id,
  c.name as campaign_name,
  c.status as campaign_status,

  -- Lead counts
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'COMPLETED' THEN l.id END) as completed_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'INPROGRESS' THEN l.id END) as in_progress_leads,

  -- Email metrics
  COUNT(DISTINCT e.id) as total_emails_sent,
  COUNT(DISTINCT CASE WHEN eg.event_type = 'EMAIL_OPEN' THEN eg.lead_id END) as unique_opens,
  COUNT(DISTINCT CASE WHEN eg.event_type = 'EMAIL_LINK_CLICK' THEN eg.lead_id END) as unique_clicks,
  COUNT(DISTINCT CASE WHEN eg.event_type = 'EMAIL_REPLY' THEN eg.lead_id END) as unique_replies,
  COUNT(DISTINCT CASE WHEN eg.event_type = 'LEAD_UNSUBSCRIBED' THEN eg.lead_id END) as unsubscribes,

  -- Rates
  CASE
    WHEN COUNT(DISTINCT l.id) > 0
    THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN eg.event_type = 'EMAIL_OPEN' THEN eg.lead_id END) / COUNT(DISTINCT l.id), 2)
    ELSE 0
  END as open_rate,

  CASE
    WHEN COUNT(DISTINCT l.id) > 0
    THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN eg.event_type = 'EMAIL_REPLY' THEN eg.lead_id END) / COUNT(DISTINCT l.id), 2)
    ELSE 0
  END as reply_rate,

  -- Sync status
  COUNT(DISTINCT CASE WHEN l.hubspot_contact_id IS NOT NULL THEN l.id END) as synced_to_hubspot,
  MAX(l.hubspot_last_sync) as last_hubspot_sync,

  c.created_at,
  c.updated_at
FROM smartlead_campaigns c
LEFT JOIN smartlead_leads l ON c.id = l.campaign_id
LEFT JOIN smartlead_emails e ON l.id = e.lead_id
LEFT JOIN smartlead_engagement eg ON l.id = eg.lead_id
GROUP BY c.id, c.name, c.status, c.created_at, c.updated_at;

-- Recent engagement activity
CREATE OR REPLACE VIEW v_smartlead_recent_engagement AS
SELECT
  eg.id,
  eg.event_type,
  eg.occurred_at,
  l.email as lead_email,
  l.first_name,
  l.last_name,
  l.company_name,
  c.name as campaign_name,
  e.subject as email_subject,
  e.sequence_number,
  eg.clicked_url,
  l.hubspot_contact_id
FROM smartlead_engagement eg
JOIN smartlead_leads l ON eg.lead_id = l.id
JOIN smartlead_campaigns c ON eg.campaign_id = c.id
JOIN smartlead_emails e ON eg.email_id = e.id
ORDER BY eg.occurred_at DESC
LIMIT 100;

-- Leads needing HubSpot sync
CREATE OR REPLACE VIEW v_smartlead_needs_sync AS
SELECT
  l.id as lead_id,
  l.email,
  l.first_name,
  l.last_name,
  l.company_name,
  l.campaign_id,
  c.name as campaign_name,
  l.status,
  l.hubspot_contact_id,
  l.hubspot_last_sync,
  l.updated_at
FROM smartlead_leads l
JOIN smartlead_campaigns c ON l.campaign_id = c.id
WHERE
  l.hubspot_contact_id IS NULL
  OR l.hubspot_last_sync < l.updated_at
  OR l.hubspot_last_sync IS NULL
ORDER BY l.updated_at DESC;

-- Sync failures
CREATE OR REPLACE VIEW v_smartlead_sync_failures AS
SELECT
  sl.id,
  sl.object_type,
  sl.object_id,
  sl.operation,
  sl.error_message,
  sl.synced_at,
  sl.sync_details
FROM smartlead_sync_log sl
WHERE sl.sync_status = 'error'
ORDER BY sl.synced_at DESC
LIMIT 100;

-- ============================================================================
-- 7. Helper Functions
-- ============================================================================

-- Function to log sync operations
CREATE OR REPLACE FUNCTION log_smartlead_sync(
  p_object_type TEXT,
  p_object_id TEXT,
  p_operation TEXT,
  p_sync_status TEXT,
  p_external_system TEXT DEFAULT 'hubspot',
  p_external_id TEXT DEFAULT NULL,
  p_sync_details JSONB DEFAULT '{}'::jsonb,
  p_error_message TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO smartlead_sync_log (
    object_type,
    object_id,
    operation,
    sync_status,
    external_system,
    external_id,
    sync_details,
    error_message
  ) VALUES (
    p_object_type,
    p_object_id,
    p_operation,
    p_sync_status,
    p_external_system,
    p_external_id,
    p_sync_details,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update lead HubSpot sync status
CREATE OR REPLACE FUNCTION update_lead_hubspot_sync(
  p_lead_id TEXT,
  p_hubspot_contact_id TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE smartlead_leads
  SET
    hubspot_contact_id = p_hubspot_contact_id,
    hubspot_last_sync = NOW(),
    updated_at = NOW()
  WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign analytics
CREATE OR REPLACE FUNCTION get_campaign_analytics(p_campaign_id TEXT)
RETURNS TABLE(
  metric TEXT,
  value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'total_leads'::TEXT, COUNT(DISTINCT l.id)::NUMERIC
  FROM smartlead_leads l WHERE l.campaign_id = p_campaign_id

  UNION ALL

  SELECT 'emails_sent'::TEXT, COUNT(DISTINCT e.id)::NUMERIC
  FROM smartlead_emails e WHERE e.campaign_id = p_campaign_id

  UNION ALL

  SELECT 'unique_opens'::TEXT, COUNT(DISTINCT eg.lead_id)::NUMERIC
  FROM smartlead_engagement eg
  WHERE eg.campaign_id = p_campaign_id AND eg.event_type = 'EMAIL_OPEN'

  UNION ALL

  SELECT 'unique_clicks'::TEXT, COUNT(DISTINCT eg.lead_id)::NUMERIC
  FROM smartlead_engagement eg
  WHERE eg.campaign_id = p_campaign_id AND eg.event_type = 'EMAIL_LINK_CLICK'

  UNION ALL

  SELECT 'unique_replies'::TEXT, COUNT(DISTINCT eg.lead_id)::NUMERIC
  FROM smartlead_engagement eg
  WHERE eg.campaign_id = p_campaign_id AND eg.event_type = 'EMAIL_REPLY';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smartlead_campaigns_updated_at
  BEFORE UPDATE ON smartlead_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smartlead_leads_updated_at
  BEFORE UPDATE ON smartlead_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE smartlead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartlead_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartlead_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartlead_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartlead_sync_log ENABLE ROW LEVEL SECURITY;

-- Policies (allow service role full access)
CREATE POLICY "Enable all for service role" ON smartlead_campaigns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON smartlead_leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON smartlead_emails
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON smartlead_engagement
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON smartlead_sync_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 10. Sample Queries
-- ============================================================================

-- Get campaign performance
-- SELECT * FROM v_smartlead_campaign_performance WHERE campaign_id = 'your-campaign-id';

-- Get recent engagement
-- SELECT * FROM v_smartlead_recent_engagement WHERE event_type = 'EMAIL_REPLY';

-- Get leads needing sync
-- SELECT * FROM v_smartlead_needs_sync LIMIT 10;

-- Get campaign analytics
-- SELECT * FROM get_campaign_analytics('your-campaign-id');

-- Check sync failures
-- SELECT * FROM v_smartlead_sync_failures;

-- ============================================================================
-- Setup Complete!
-- ============================================================================
