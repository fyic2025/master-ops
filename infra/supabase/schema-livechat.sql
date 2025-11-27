-- =============================================================================
-- LiveChat Schema
-- =============================================================================
-- Stores LiveChat conversations and messages from Buy Organics Online
-- for customer service analytics, AI categorization, and reporting.
--
-- Usage:
--   - Sync conversations from LiveChat API
--   - Track customer interactions and sentiment
--   - Enable AI-powered categorization and insights
--   - Monitor customer service performance
-- =============================================================================

-- Drop existing tables if needed (for fresh install)
DROP TABLE IF EXISTS livechat_messages CASCADE;
DROP TABLE IF EXISTS livechat_conversations CASCADE;

-- =============================================================================
-- Conversations Table
-- =============================================================================
CREATE TABLE livechat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- LiveChat identifiers
  livechat_id TEXT NOT NULL UNIQUE,  -- LiveChat's chat ID
  thread_id TEXT,                     -- LiveChat thread ID

  -- Customer information
  customer_name TEXT,
  customer_email TEXT,
  customer_id TEXT,                   -- LiveChat visitor ID

  -- Agent information
  agent_name TEXT,
  agent_email TEXT,
  agent_id TEXT,

  -- Conversation metadata
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Status and categorization
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'queued', 'pending')),

  -- AI categorization (to be populated by analysis)
  issue_category TEXT,                -- e.g., 'order_status', 'product_inquiry', 'complaint', 'returns'
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  resolution_status TEXT CHECK (resolution_status IN ('resolved', 'unresolved', 'escalated', 'pending')),

  -- Statistics
  message_count INTEGER DEFAULT 0,
  customer_message_count INTEGER DEFAULT 0,
  agent_message_count INTEGER DEFAULT 0,
  first_response_time_seconds INTEGER,  -- Time to first agent response

  -- Tags from LiveChat
  tags JSONB DEFAULT '[]',

  -- Custom fields and metadata
  custom_variables JSONB DEFAULT '{}',  -- LiveChat custom variables
  metadata JSONB DEFAULT '{}',

  -- AI analysis results
  ai_summary TEXT,                    -- AI-generated summary
  ai_insights JSONB DEFAULT '{}',     -- AI categorization details
  analyzed_at TIMESTAMPTZ,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status TEXT DEFAULT 'success' CHECK (sync_status IN ('success', 'partial', 'failed')),

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Messages Table
-- =============================================================================
CREATE TABLE livechat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to conversation
  conversation_id UUID NOT NULL REFERENCES livechat_conversations(id) ON DELETE CASCADE,

  -- LiveChat identifiers
  livechat_message_id TEXT NOT NULL,

  -- Message content
  message_type TEXT NOT NULL CHECK (message_type IN ('message', 'system', 'event', 'file', 'rich_message')),
  author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'agent', 'system', 'bot')),
  author_id TEXT,
  author_name TEXT,

  -- Content
  content TEXT,
  content_type TEXT DEFAULT 'text',   -- text, file, rich_message, etc.

  -- File attachments (if any)
  attachments JSONB DEFAULT '[]',

  -- Timing
  created_at_livechat TIMESTAMPTZ NOT NULL,  -- Original timestamp from LiveChat

  -- AI analysis (per message)
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  intent TEXT,                        -- Detected intent

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint to prevent duplicates
  UNIQUE(conversation_id, livechat_message_id)
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Conversations indexes
CREATE INDEX idx_livechat_conv_livechat_id ON livechat_conversations(livechat_id);
CREATE INDEX idx_livechat_conv_customer_email ON livechat_conversations(customer_email);
CREATE INDEX idx_livechat_conv_started_at ON livechat_conversations(started_at DESC);
CREATE INDEX idx_livechat_conv_status ON livechat_conversations(status);
CREATE INDEX idx_livechat_conv_issue_category ON livechat_conversations(issue_category);
CREATE INDEX idx_livechat_conv_sentiment ON livechat_conversations(sentiment);
CREATE INDEX idx_livechat_conv_urgency ON livechat_conversations(urgency);
CREATE INDEX idx_livechat_conv_agent ON livechat_conversations(agent_email);
CREATE INDEX idx_livechat_conv_last_synced ON livechat_conversations(last_synced_at DESC);

-- Messages indexes
CREATE INDEX idx_livechat_msg_conversation ON livechat_messages(conversation_id);
CREATE INDEX idx_livechat_msg_created_at ON livechat_messages(created_at_livechat DESC);
CREATE INDEX idx_livechat_msg_author_type ON livechat_messages(author_type);

-- Full text search on message content
CREATE INDEX idx_livechat_msg_content_search ON livechat_messages USING gin(to_tsvector('english', content));

-- =============================================================================
-- Automatic Updated At Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_livechat_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER livechat_conversations_updated_at_trigger
  BEFORE UPDATE ON livechat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_livechat_conversations_updated_at();

-- =============================================================================
-- Helper Views
-- =============================================================================

-- View: Recent conversations (last 7 days)
CREATE OR REPLACE VIEW livechat_recent AS
SELECT
  id,
  livechat_id,
  customer_name,
  customer_email,
  agent_name,
  started_at,
  ended_at,
  status,
  issue_category,
  sentiment,
  urgency,
  message_count,
  first_response_time_seconds,
  ai_summary
FROM livechat_conversations
WHERE started_at >= NOW() - INTERVAL '7 days'
ORDER BY started_at DESC;

-- View: Conversations needing AI analysis
CREATE OR REPLACE VIEW livechat_pending_analysis AS
SELECT
  id,
  livechat_id,
  customer_email,
  started_at,
  message_count,
  status
FROM livechat_conversations
WHERE analyzed_at IS NULL
  AND status = 'closed'
  AND message_count > 0
ORDER BY started_at DESC;

-- View: Customer service metrics (daily)
CREATE OR REPLACE VIEW livechat_daily_metrics AS
SELECT
  DATE(started_at) as date,
  COUNT(*) as total_conversations,
  COUNT(DISTINCT customer_email) as unique_customers,
  AVG(message_count) as avg_messages,
  AVG(duration_seconds) / 60.0 as avg_duration_minutes,
  AVG(first_response_time_seconds) as avg_first_response_seconds,
  SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_sentiment,
  SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_sentiment,
  SUM(CASE WHEN resolution_status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
FROM livechat_conversations
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- View: Issue category breakdown
CREATE OR REPLACE VIEW livechat_category_breakdown AS
SELECT
  issue_category,
  COUNT(*) as count,
  AVG(duration_seconds) / 60.0 as avg_duration_minutes,
  AVG(first_response_time_seconds) as avg_first_response_seconds,
  SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
  ROUND(100.0 * SUM(CASE WHEN resolution_status = 'resolved' THEN 1 ELSE 0 END) / COUNT(*), 2) as resolution_rate
FROM livechat_conversations
WHERE issue_category IS NOT NULL
  AND started_at >= NOW() - INTERVAL '30 days'
GROUP BY issue_category
ORDER BY count DESC;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Get conversation by LiveChat ID
CREATE OR REPLACE FUNCTION get_livechat_conversation(p_livechat_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM livechat_conversations
  WHERE livechat_id = p_livechat_id
  LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update conversation message counts
CREATE OR REPLACE FUNCTION update_livechat_message_counts(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE livechat_conversations
  SET
    message_count = (
      SELECT COUNT(*) FROM livechat_messages WHERE conversation_id = p_conversation_id
    ),
    customer_message_count = (
      SELECT COUNT(*) FROM livechat_messages
      WHERE conversation_id = p_conversation_id AND author_type = 'customer'
    ),
    agent_message_count = (
      SELECT COUNT(*) FROM livechat_messages
      WHERE conversation_id = p_conversation_id AND author_type = 'agent'
    )
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE livechat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE livechat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY livechat_conv_service_policy ON livechat_conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY livechat_msg_service_policy ON livechat_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to read
CREATE POLICY livechat_conv_read_policy ON livechat_conversations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY livechat_msg_read_policy ON livechat_messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- Grants
-- =============================================================================

GRANT ALL ON livechat_conversations TO service_role, postgres;
GRANT ALL ON livechat_messages TO service_role, postgres;
GRANT SELECT ON livechat_conversations TO authenticated;
GRANT SELECT ON livechat_messages TO authenticated;

GRANT SELECT ON livechat_recent TO service_role, authenticated;
GRANT SELECT ON livechat_pending_analysis TO service_role, authenticated;
GRANT SELECT ON livechat_daily_metrics TO service_role, authenticated;
GRANT SELECT ON livechat_category_breakdown TO service_role, authenticated;

GRANT EXECUTE ON FUNCTION get_livechat_conversation TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION update_livechat_message_counts TO service_role;
GRANT EXECUTE ON FUNCTION update_livechat_conversations_updated_at TO service_role;

COMMENT ON TABLE livechat_conversations IS 'LiveChat conversations from Buy Organics Online';
COMMENT ON TABLE livechat_messages IS 'Individual messages within LiveChat conversations';
