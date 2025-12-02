-- ============================================================================
-- Customer Interactions Schema for Buy Organics Online
-- ============================================================================
-- Purpose: Unified storage for LiveChat conversations and email correspondence
-- Database: usibnysqelovfuctmkqw (BOO Supabase)
-- Created: 2025-11-25
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOMER INTERACTIONS TABLE
-- Stores all customer communications (LiveChat + Email)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source identification
    source TEXT NOT NULL CHECK (source IN ('livechat', 'email')),
    external_id TEXT UNIQUE,  -- LiveChat thread_id or email message_id

    -- Customer info
    customer_email TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_location TEXT,  -- City, State from LiveChat geolocation

    -- Interaction content
    subject TEXT,  -- Email subject or chat topic/first message
    summary TEXT,  -- AI-generated summary of the conversation
    transcript TEXT,  -- Full conversation text
    message_count INTEGER DEFAULT 0,

    -- Classification
    category TEXT,  -- order_tracking, payment, product_inquiry, complaint, etc.
    subcategory TEXT,
    tags TEXT[],  -- Array of tags for filtering
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',

    -- Resolution
    status TEXT CHECK (status IN ('open', 'pending', 'resolved', 'escalated')) DEFAULT 'open',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,

    -- Agent info
    agent_name TEXT,
    agent_email TEXT,
    response_time_seconds INTEGER,  -- Time to first response

    -- Related entities
    order_ids TEXT[],  -- BigCommerce order IDs mentioned
    product_skus TEXT[],  -- Product SKUs discussed

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    raw_data JSONB  -- Original LiveChat/Email data for reference
);

-- ============================================================================
-- INDIVIDUAL MESSAGES TABLE
-- Stores each message within a conversation
-- ============================================================================
CREATE TABLE IF NOT EXISTS interaction_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES customer_interactions(id) ON DELETE CASCADE,

    -- Message details
    message_id TEXT,  -- External message ID
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system', 'bot')),
    sender_name TEXT,
    sender_email TEXT,

    -- Content
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',  -- text, html, file, image

    -- Attachments
    attachments JSONB,  -- [{name, url, type, size}]

    -- Timestamps
    sent_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INTERACTION CATEGORIES
-- Reference table for categorization
-- ============================================================================
CREATE TABLE IF NOT EXISTS interaction_categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_category TEXT,
    auto_response TEXT,  -- Suggested auto-response for this category
    priority_default TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common categories
INSERT INTO interaction_categories (name, description, priority_default) VALUES
    ('order_tracking', 'Customer asking about order status or tracking', 'medium'),
    ('order_issue', 'Problem with an order (missing items, wrong items, damaged)', 'high'),
    ('payment', 'Payment-related questions or issues', 'high'),
    ('shipping', 'Shipping queries, delivery times, carriers', 'medium'),
    ('product_inquiry', 'Questions about products, ingredients, usage', 'low'),
    ('returns', 'Return requests or refund queries', 'medium'),
    ('complaint', 'General complaints or negative feedback', 'high'),
    ('technical', 'Website issues, checkout problems', 'high'),
    ('pricing', 'Price queries, discounts, promotions', 'low'),
    ('stock', 'Stock availability questions', 'medium'),
    ('other', 'Uncategorized interactions', 'low')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- EMAIL SYNC TRACKING
-- Track email sync state for incremental updates
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_sync_state (
    id SERIAL PRIMARY KEY,
    email_address TEXT UNIQUE NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_message_uid TEXT,
    sync_status TEXT DEFAULT 'idle',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LIVECHAT SYNC TRACKING
-- Track LiveChat sync state for incremental updates
-- ============================================================================
CREATE TABLE IF NOT EXISTS livechat_sync_state (
    id SERIAL PRIMARY KEY,
    account_id TEXT UNIQUE NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_thread_id TEXT,
    total_threads_synced INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'idle',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS VIEWS
-- Pre-computed views for common queries
-- ============================================================================

-- Daily interaction summary
CREATE OR REPLACE VIEW interaction_daily_summary AS
SELECT
    DATE(started_at) as date,
    source,
    COUNT(*) as total_interactions,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
    COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count,
    COUNT(CASE WHEN sentiment = 'urgent' THEN 1 END) as urgent_count,
    AVG(response_time_seconds) as avg_response_time_seconds,
    AVG(message_count) as avg_messages_per_interaction
FROM customer_interactions
GROUP BY DATE(started_at), source
ORDER BY date DESC;

-- Category breakdown
CREATE OR REPLACE VIEW interaction_category_summary AS
SELECT
    category,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
    AVG(response_time_seconds) as avg_response_time,
    COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count
FROM customer_interactions
WHERE category IS NOT NULL
GROUP BY category
ORDER BY total_count DESC;

-- Top customer issues (last 30 days)
CREATE OR REPLACE VIEW recent_top_issues AS
SELECT
    category,
    subcategory,
    COUNT(*) as count,
    ARRAY_AGG(DISTINCT COALESCE(subject, 'No subject')) as sample_subjects
FROM customer_interactions
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY category, subcategory
ORDER BY count DESC
LIMIT 20;

-- Unanswered/urgent interactions
CREATE OR REPLACE VIEW urgent_interactions AS
SELECT
    id,
    source,
    customer_name,
    customer_email,
    subject,
    category,
    started_at,
    last_message_at,
    message_count
FROM customer_interactions
WHERE status IN ('open', 'pending')
AND (priority = 'urgent' OR sentiment = 'urgent'
     OR started_at < NOW() - INTERVAL '24 hours')
ORDER BY
    CASE WHEN priority = 'urgent' OR sentiment = 'urgent' THEN 0 ELSE 1 END,
    started_at ASC;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_interactions_source ON customer_interactions(source);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON customer_interactions(status);
CREATE INDEX IF NOT EXISTS idx_interactions_category ON customer_interactions(category);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_email ON customer_interactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_interactions_started_at ON customer_interactions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_sentiment ON customer_interactions(sentiment);
CREATE INDEX IF NOT EXISTS idx_interactions_order_ids ON customer_interactions USING GIN(order_ids);
CREATE INDEX IF NOT EXISTS idx_interactions_tags ON customer_interactions USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_messages_interaction ON interaction_messages(interaction_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON interaction_messages(sent_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - enable if needed)
-- ============================================================================
-- ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interaction_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at on customer_interactions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_interactions_updated_at ON customer_interactions;
CREATE TRIGGER trigger_interactions_updated_at
    BEFORE UPDATE ON customer_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_email_sync_updated_at ON email_sync_state;
CREATE TRIGGER trigger_email_sync_updated_at
    BEFORE UPDATE ON email_sync_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_livechat_sync_updated_at ON livechat_sync_state;
CREATE TRIGGER trigger_livechat_sync_updated_at
    BEFORE UPDATE ON livechat_sync_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
-- Uncomment to enable real-time subscriptions
-- ALTER PUBLICATION supabase_realtime ADD TABLE customer_interactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE interaction_messages;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get top 10 most common issues this month:
-- SELECT category, COUNT(*) as count
-- FROM customer_interactions
-- WHERE started_at > DATE_TRUNC('month', NOW())
-- GROUP BY category
-- ORDER BY count DESC
-- LIMIT 10;

-- Find all interactions mentioning a specific order:
-- SELECT * FROM customer_interactions
-- WHERE 'H241606215199' = ANY(order_ids);

-- Get average response time by day of week:
-- SELECT
--     TO_CHAR(started_at, 'Day') as day_of_week,
--     AVG(response_time_seconds)/60.0 as avg_response_minutes
-- FROM customer_interactions
-- WHERE response_time_seconds IS NOT NULL
-- GROUP BY EXTRACT(DOW FROM started_at), TO_CHAR(started_at, 'Day')
-- ORDER BY EXTRACT(DOW FROM started_at);
