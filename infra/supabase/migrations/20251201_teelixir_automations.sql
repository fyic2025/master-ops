-- Teelixir Automations Schema
-- Tables for winback campaign automation (Klaviyo unengaged → GSuite email)

-- ============================================================================
-- Table 1: tlx_klaviyo_unengaged
-- Weekly sync from Klaviyo's unengaged segment
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_klaviyo_unengaged (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klaviyo_profile_id TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  last_order_date TIMESTAMPTZ,
  total_orders INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tlx_klaviyo_unengaged_profile_id_unique UNIQUE (klaviyo_profile_id),
  CONSTRAINT tlx_klaviyo_unengaged_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_tlx_unengaged_email ON tlx_klaviyo_unengaged(email);
CREATE INDEX IF NOT EXISTS idx_tlx_unengaged_synced ON tlx_klaviyo_unengaged(synced_at);

COMMENT ON TABLE tlx_klaviyo_unengaged IS 'Weekly sync of unengaged profiles from Klaviyo segment';
COMMENT ON COLUMN tlx_klaviyo_unengaged.klaviyo_profile_id IS 'Klaviyo profile ID';
COMMENT ON COLUMN tlx_klaviyo_unengaged.synced_at IS 'Last sync timestamp from Klaviyo';

-- ============================================================================
-- Table 2: tlx_winback_emails
-- Tracking sent winback emails and their outcomes
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_winback_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  klaviyo_profile_id TEXT,
  first_name TEXT,
  discount_code TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  order_id TEXT,
  order_total DECIMAL(10,2),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'clicked', 'converted', 'bounced', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tlx_winback_email ON tlx_winback_emails(email);
CREATE INDEX IF NOT EXISTS idx_tlx_winback_status ON tlx_winback_emails(status);
CREATE INDEX IF NOT EXISTS idx_tlx_winback_sent ON tlx_winback_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_tlx_winback_discount ON tlx_winback_emails(discount_code);

COMMENT ON TABLE tlx_winback_emails IS 'Tracking winback campaign emails sent via GSuite';
COMMENT ON COLUMN tlx_winback_emails.status IS 'sent=delivered, clicked=link clicked, converted=purchased, bounced=delivery failed, failed=send error';

-- ============================================================================
-- Table 3: tlx_automation_config
-- Configuration for automation jobs (expandable for future automations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tlx_automation_config_type_unique UNIQUE (automation_type)
);

CREATE INDEX IF NOT EXISTS idx_tlx_automation_type ON tlx_automation_config(automation_type);
CREATE INDEX IF NOT EXISTS idx_tlx_automation_enabled ON tlx_automation_config(enabled);

COMMENT ON TABLE tlx_automation_config IS 'Configuration for Teelixir automation jobs';
COMMENT ON COLUMN tlx_automation_config.automation_type IS 'Unique identifier for the automation (e.g., winback_40)';
COMMENT ON COLUMN tlx_automation_config.config IS 'JSON configuration specific to each automation type';
COMMENT ON COLUMN tlx_automation_config.last_run_result IS 'Result/stats from last run';

-- ============================================================================
-- Insert default configuration for winback campaign
-- ============================================================================
INSERT INTO tlx_automation_config (automation_type, enabled, config) VALUES
('winback_40', false, '{
  "daily_limit": 20,
  "discount_code": "MISSYOU40",
  "discount_percent": 40,
  "sender_email": "colette@teelixir.com",
  "sender_name": "Colette from Teelixir",
  "subject_template": "{{ first_name }}, we miss you! Here''s 40% off",
  "klaviyo_segment_id": null
}'::jsonb)
ON CONFLICT (automation_type) DO NOTHING;

-- ============================================================================
-- Helper function to update automation last_run
-- ============================================================================
CREATE OR REPLACE FUNCTION update_automation_last_run(
  p_automation_type TEXT,
  p_result JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE tlx_automation_config
  SET
    last_run_at = NOW(),
    last_run_result = COALESCE(p_result, last_run_result),
    updated_at = NOW()
  WHERE automation_type = p_automation_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- View: winback campaign stats
-- ============================================================================
CREATE OR REPLACE VIEW tlx_winback_stats AS
SELECT
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE status = 'clicked') AS total_clicked,
  COUNT(*) FILTER (WHERE status = 'converted') AS total_converted,
  COUNT(*) FILTER (WHERE status = 'bounced') AS total_bounced,
  COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
  COALESCE(SUM(order_total) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '24 hours') AS sent_today,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days') AS sent_this_week,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'clicked')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS click_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'converted')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS conversion_rate_percent
FROM tlx_winback_emails;

COMMENT ON VIEW tlx_winback_stats IS 'Aggregated stats for winback campaign dashboard';

-- ============================================================================
-- RLS Policies (if needed - assuming service role access)
-- ============================================================================
-- ALTER TABLE tlx_klaviyo_unengaged ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tlx_winback_emails ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tlx_automation_config ENABLE ROW LEVEL SECURITY;
