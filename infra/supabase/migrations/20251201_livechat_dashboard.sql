-- =============================================================================
-- LiveChat Dashboard Schema Extensions
-- =============================================================================
-- Adds AI suggestions table and dashboard views for the LiveChat Analytics page
-- Created: 2025-12-01
-- =============================================================================

-- =============================================================================
-- AI Suggestions Table
-- =============================================================================
-- Stores AI-generated reply suggestions with approval workflow

CREATE TABLE IF NOT EXISTS livechat_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES livechat_conversations(id) ON DELETE CASCADE,
  livechat_chat_id TEXT NOT NULL,
  livechat_thread_id TEXT,

  -- The customer message we're responding to
  customer_message_id UUID REFERENCES livechat_messages(id),
  customer_message_text TEXT,

  -- AI-generated reply
  suggested_reply TEXT NOT NULL,
  edited_reply TEXT,

  -- Context used for generation
  context_summary JSONB DEFAULT '{}',

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'copied', 'sent', 'rejected', 'expired')),

  -- Tracking
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  livechat_event_id TEXT,
  send_error TEXT,

  -- Feedback
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),

  -- AI metadata
  model_used TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_used INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_conversation ON livechat_ai_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON livechat_ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created ON livechat_ai_suggestions(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_livechat_ai_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS livechat_ai_suggestions_updated_at_trigger ON livechat_ai_suggestions;
CREATE TRIGGER livechat_ai_suggestions_updated_at_trigger
  BEFORE UPDATE ON livechat_ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_livechat_ai_suggestions_updated_at();

-- =============================================================================
-- Dashboard Summary View
-- =============================================================================
-- Aggregates daily conversation metrics for the dashboard

CREATE OR REPLACE VIEW livechat_dashboard_summary AS
SELECT
  DATE(started_at) as date,
  issue_category,
  COUNT(*) as conversation_count,
  COUNT(DISTINCT customer_email) as unique_customers,
  AVG(first_response_time_seconds) as avg_response_time_seconds,
  AVG(duration_seconds) as avg_duration_seconds,
  AVG(message_count) as avg_messages,
  SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
  SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
  SUM(CASE WHEN urgency IN ('high', 'critical') THEN 1 ELSE 0 END) as urgent_count
FROM livechat_conversations
WHERE started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(started_at), issue_category;

-- =============================================================================
-- AI Suggestions Metrics View
-- =============================================================================
-- Tracks AI suggestion performance

CREATE OR REPLACE VIEW livechat_ai_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_generated,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN status = 'copied' THEN 1 ELSE 0 END) as copied_count,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
  SUM(CASE WHEN edited_reply IS NOT NULL AND status IN ('sent', 'copied') THEN 1 ELSE 0 END) as edited_count,
  AVG(tokens_used) as avg_tokens_used,
  AVG(feedback_rating) as avg_rating,
  ROUND(100.0 * SUM(CASE WHEN status IN ('sent', 'copied') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as approval_rate
FROM livechat_ai_suggestions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE livechat_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY livechat_ai_suggestions_service_policy ON livechat_ai_suggestions
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users read access
CREATE POLICY livechat_ai_suggestions_read_policy ON livechat_ai_suggestions
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- Grants
-- =============================================================================

GRANT ALL ON livechat_ai_suggestions TO service_role, postgres;
GRANT SELECT, UPDATE ON livechat_ai_suggestions TO authenticated;

GRANT SELECT ON livechat_dashboard_summary TO service_role, authenticated;
GRANT SELECT ON livechat_ai_metrics TO service_role, authenticated;

GRANT EXECUTE ON FUNCTION update_livechat_ai_suggestions_updated_at TO service_role;

COMMENT ON TABLE livechat_ai_suggestions IS 'AI-generated reply suggestions with approval workflow';
COMMENT ON VIEW livechat_dashboard_summary IS 'Daily aggregated metrics for LiveChat dashboard';
COMMENT ON VIEW livechat_ai_metrics IS 'AI suggestion performance metrics';
