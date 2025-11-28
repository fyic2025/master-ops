-- ============================================================================
-- ELEVATE WHOLESALE OUTBOUND PROSPECTING SYSTEM
-- Database Schema for automated B2B outreach
-- Created: 2025-11-28
-- ============================================================================

-- ============================================================================
-- CORE PROSPECTING TABLES
-- ============================================================================

-- Main queue: HubSpot contacts through outreach flow
CREATE TABLE IF NOT EXISTS prospecting_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- HubSpot Reference
    hubspot_contact_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    company_name TEXT NOT NULL,

    -- Lead segmentation (beauty or fitness)
    lead_category TEXT CHECK (lead_category IS NULL OR lead_category IN ('beauty', 'fitness')),

    -- Queue Status
    queue_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (queue_status IN ('pending', 'processing', 'sent', 'active', 'expired', 'failed', 'skipped')),

    -- Timestamps
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    approved_tag_added_at TIMESTAMPTZ,
    first_login_at TIMESTAMPTZ,
    approved_tag_removed_at TIMESTAMPTZ,

    -- Shopify IDs (after account creation)
    shopify_customer_id TEXT,
    shopify_company_id TEXT,

    -- Error tracking
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Manual override
    skipped_reason TEXT,
    skipped_at TIMESTAMPTZ,

    -- Batch tracking
    batch_date DATE,
    correlation_id TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prospecting_queue_status ON prospecting_queue(queue_status);
CREATE INDEX idx_prospecting_queue_pending ON prospecting_queue(queued_at) WHERE queue_status = 'pending';
CREATE INDEX idx_prospecting_queue_sent ON prospecting_queue(approved_tag_added_at) WHERE queue_status = 'sent';
CREATE INDEX idx_prospecting_queue_hubspot ON prospecting_queue(hubspot_contact_id);
CREATE INDEX idx_prospecting_queue_batch ON prospecting_queue(batch_date);
CREATE INDEX idx_prospecting_queue_category ON prospecting_queue(lead_category);

-- Email sequence tracking per contact
CREATE TABLE IF NOT EXISTS prospecting_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES prospecting_queue(id) ON DELETE CASCADE,

    -- Email details
    email_type TEXT NOT NULL
        CHECK (email_type IN ('welcome', 'reminder_1', 'reminder_2', 'final_reminder', 'expiry_notice')),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,

    -- Template info
    template_name TEXT,
    template_data JSONB,

    -- Status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,

    -- Gmail tracking
    gmail_message_id TEXT,
    gmail_thread_id TEXT,

    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prospecting_emails_queue ON prospecting_emails(queue_id);
CREATE INDEX idx_prospecting_emails_status ON prospecting_emails(status);
CREATE INDEX idx_prospecting_emails_pending ON prospecting_emails(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_prospecting_emails_type ON prospecting_emails(email_type);

-- Audit log for daily batch runs
CREATE TABLE IF NOT EXISTS prospecting_run_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Run identification
    run_date DATE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Configuration snapshot
    config_snapshot JSONB,

    -- Metrics
    contacts_selected INTEGER DEFAULT 0,
    contacts_processed INTEGER DEFAULT 0,
    accounts_created INTEGER DEFAULT 0,
    emails_queued INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'partial', 'failed')),

    -- Details
    processed_contacts JSONB DEFAULT '[]',
    error_summary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_prospecting_run_date ON prospecting_run_log(run_date);
CREATE INDEX idx_prospecting_run_status ON prospecting_run_log(status);

-- ============================================================================
-- SYSTEM CONFIG for Prospecting
-- ============================================================================

-- Add prospecting config to system_config (if table exists)
INSERT INTO system_config (key, value, description) VALUES
    ('prospecting_enabled', 'true', 'Master on/off switch for prospecting'),
    ('prospecting_daily_limit', '5', 'Number of contacts to process per day'),
    ('prospecting_lead_category', 'null', 'Filter: beauty, fitness, or null for all'),
    ('prospecting_expiry_days', '30', 'Days before removing approved tag'),
    ('prospecting_reminder_1_days', '7', 'Days after welcome for reminder 1'),
    ('prospecting_reminder_2_days', '15', 'Days after welcome for reminder 2'),
    ('prospecting_final_reminder_days', '23', 'Days after welcome for final reminder')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- VIEWS FOR MONITORING
-- ============================================================================

-- Today's prospecting summary
CREATE OR REPLACE VIEW v_prospecting_daily_summary AS
SELECT
    CURRENT_DATE as date,
    (SELECT status FROM prospecting_run_log WHERE run_date = CURRENT_DATE LIMIT 1) as run_status,
    (SELECT contacts_processed FROM prospecting_run_log WHERE run_date = CURRENT_DATE LIMIT 1) as processed_today,
    (SELECT errors_count FROM prospecting_run_log WHERE run_date = CURRENT_DATE LIMIT 1) as errors_today,
    COUNT(*) FILTER (WHERE queue_status = 'pending') as pending_in_queue,
    COUNT(*) FILTER (WHERE queue_status = 'sent') as awaiting_login,
    COUNT(*) FILTER (WHERE queue_status = 'active') as logged_in,
    COUNT(*) FILTER (WHERE queue_status = 'expired') as expired,
    COUNT(*) FILTER (WHERE queue_status = 'failed') as failed
FROM prospecting_queue;

-- Pending emails by type
CREATE OR REPLACE VIEW v_prospecting_pending_emails AS
SELECT
    pe.id,
    pe.email_type,
    pe.recipient_email,
    pq.company_name,
    pq.lead_category,
    pe.subject,
    pe.scheduled_for,
    pe.status,
    pe.retry_count,
    CASE
        WHEN pe.scheduled_for <= NOW() THEN 'overdue'
        WHEN pe.scheduled_for <= NOW() + INTERVAL '1 day' THEN 'due_today'
        ELSE 'scheduled'
    END as urgency
FROM prospecting_emails pe
JOIN prospecting_queue pq ON pe.queue_id = pq.id
WHERE pe.status IN ('pending', 'failed')
ORDER BY pe.scheduled_for ASC;

-- Contacts needing login check (30+ days)
CREATE OR REPLACE VIEW v_prospecting_login_check AS
SELECT
    pq.id,
    pq.hubspot_contact_id,
    pq.email,
    pq.company_name,
    pq.lead_category,
    pq.shopify_customer_id,
    pq.approved_tag_added_at,
    EXTRACT(DAY FROM NOW() - pq.approved_tag_added_at)::INT as days_since_approved,
    CASE
        WHEN pq.first_login_at IS NOT NULL THEN 'logged_in'
        WHEN NOW() - pq.approved_tag_added_at >= INTERVAL '30 days' THEN 'needs_removal'
        ELSE 'waiting'
    END as login_status
FROM prospecting_queue pq
WHERE pq.queue_status = 'sent'
  AND pq.shopify_customer_id IS NOT NULL
ORDER BY pq.approved_tag_added_at ASC;

-- Conversion funnel by lead category
CREATE OR REPLACE VIEW v_prospecting_funnel AS
SELECT
    COALESCE(lead_category, 'all') as category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE queue_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE queue_status = 'sent') as sent,
    COUNT(*) FILTER (WHERE queue_status = 'active') as active,
    COUNT(*) FILTER (WHERE queue_status = 'expired') as expired,
    CASE WHEN COUNT(*) FILTER (WHERE queue_status IN ('sent', 'active', 'expired')) > 0
        THEN ROUND(
            COUNT(*) FILTER (WHERE queue_status = 'active')::NUMERIC /
            COUNT(*) FILTER (WHERE queue_status IN ('sent', 'active', 'expired')) * 100, 2
        )
        ELSE 0
    END as login_rate_pct
FROM prospecting_queue
GROUP BY ROLLUP(lead_category);

-- Weekly run stats
CREATE OR REPLACE VIEW v_prospecting_weekly_stats AS
SELECT
    run_date,
    status as run_status,
    contacts_processed,
    accounts_created,
    emails_queued,
    errors_count,
    EXTRACT(EPOCH FROM (completed_at - started_at))::INT as duration_sec
FROM prospecting_run_log
WHERE run_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY run_date DESC;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE prospecting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospecting_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospecting_run_log ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated (internal tool)
CREATE POLICY "Allow read for authenticated" ON prospecting_queue FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON prospecting_emails FOR SELECT USING (true);
CREATE POLICY "Allow read for authenticated" ON prospecting_run_log FOR SELECT USING (true);

-- Allow write for service role
CREATE POLICY "Allow write for service" ON prospecting_queue FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON prospecting_emails FOR ALL USING (true);
CREATE POLICY "Allow write for service" ON prospecting_run_log FOR ALL USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE prospecting_queue IS 'Tracks HubSpot contacts through outbound B2B prospecting flow';
COMMENT ON TABLE prospecting_emails IS 'Email sequence tracking (welcome, reminders, expiry notices)';
COMMENT ON TABLE prospecting_run_log IS 'Audit log for daily batch processing runs';

COMMENT ON COLUMN prospecting_queue.queue_status IS 'Status: pending, processing, sent, active, expired, failed, skipped';
COMMENT ON COLUMN prospecting_queue.lead_category IS 'Lead segmentation: beauty or fitness';
