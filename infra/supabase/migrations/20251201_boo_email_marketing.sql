-- ============================================
-- BOO Email Marketing Schema
-- Klaviyo Replacement Infrastructure
-- Created: 2025-12-01
-- ============================================

-- Subscriber management (synced from Listmonk/BigCommerce)
CREATE TABLE IF NOT EXISTS boo_email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    bigcommerce_customer_id TEXT,
    listmonk_subscriber_id INTEGER,
    status TEXT DEFAULT 'active',  -- active, unsubscribed, bounced, cleaned
    source TEXT,  -- checkout, popup, footer, import, klaviyo_migration
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    last_email_sent_at TIMESTAMPTZ,
    last_email_opened_at TIMESTAMPTZ,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    first_order_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_subscribers_email ON boo_email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_boo_subscribers_status ON boo_email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_boo_subscribers_bc_id ON boo_email_subscribers(bigcommerce_customer_id);
CREATE INDEX IF NOT EXISTS idx_boo_subscribers_listmonk_id ON boo_email_subscribers(listmonk_subscriber_id);
CREATE INDEX IF NOT EXISTS idx_boo_subscribers_source ON boo_email_subscribers(source);
CREATE INDEX IF NOT EXISTS idx_boo_subscribers_last_order ON boo_email_subscribers(last_order_at);

-- Automation configuration
CREATE TABLE IF NOT EXISTS boo_email_automation_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_type TEXT UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    last_run_at TIMESTAMPTZ,
    last_run_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default automation configs
INSERT INTO boo_email_automation_config (automation_type, config) VALUES
('welcome_series', '{
    "delay_hours": 1,
    "email_count": 3,
    "sequence": [
        {"delay_hours": 0, "template": "welcome_1", "subject": "Welcome to Buy Organics Online!"},
        {"delay_hours": 24, "template": "welcome_2", "subject": "Your Guide to Organic Living"},
        {"delay_hours": 72, "template": "welcome_3", "subject": "10% off your first order - exclusive for new members"}
    ],
    "discount_code": "WELCOME10",
    "discount_percent": 10,
    "discount_expiry_days": 14
}'::jsonb),
('abandoned_cart', '{
    "trigger_after_hours": 1,
    "email_count": 3,
    "sequence": [
        {"delay_hours": 1, "template": "cart_1", "subject": "You left something behind!"},
        {"delay_hours": 24, "template": "cart_2", "subject": "Your cart is waiting for you..."},
        {"delay_hours": 72, "template": "cart_3", "subject": "Last chance: 10% off your cart", "include_discount": true}
    ],
    "discount_code_prefix": "CART",
    "discount_percent": 10,
    "discount_expiry_days": 7,
    "exclude_if_ordered": true,
    "min_cart_value": 20
}'::jsonb),
('winback', '{
    "trigger_after_days": 90,
    "email_count": 2,
    "sequence": [
        {"delay_days": 0, "template": "winback_1", "subject": "We miss you! Here''s 15% off your next order"},
        {"delay_days": 7, "template": "winback_2", "subject": "Last chance: Your 15% discount expires soon"}
    ],
    "discount_code_prefix": "MISSYOU",
    "discount_percent": 15,
    "discount_expiry_days": 14,
    "min_previous_orders": 1
}'::jsonb),
('review_request', '{
    "trigger_after_days": 14,
    "email_count": 1,
    "sequence": [
        {"delay_days": 14, "template": "review_1", "subject": "How did you enjoy your order?"}
    ],
    "min_order_value": 30
}'::jsonb),
('birthday', '{
    "trigger_days_before": 0,
    "email_count": 1,
    "sequence": [
        {"delay_days": 0, "template": "birthday_1", "subject": "Happy Birthday! A special gift from Buy Organics Online"}
    ],
    "discount_code_prefix": "BDAY",
    "discount_percent": 20,
    "discount_expiry_days": 30
}'::jsonb),
('post_purchase', '{
    "trigger_after_hours": 2,
    "email_count": 1,
    "sequence": [
        {"delay_hours": 2, "template": "post_purchase_1", "subject": "Thanks for your order!"}
    ]
}'::jsonb)
ON CONFLICT (automation_type) DO NOTHING;

-- Email automation queue
CREATE TABLE IF NOT EXISTS boo_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES boo_email_subscribers(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    automation_type TEXT NOT NULL,
    sequence_number INTEGER DEFAULT 1,
    template_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, sent, failed, cancelled, skipped
    sent_at TIMESTAMPTZ,
    listmonk_campaign_id INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    context JSONB DEFAULT '{}',  -- cart contents, order details, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_queue_scheduled ON boo_email_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_boo_queue_status ON boo_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_boo_queue_email ON boo_email_queue(email);
CREATE INDEX IF NOT EXISTS idx_boo_queue_automation ON boo_email_queue(automation_type);

-- Abandoned cart tracking
CREATE TABLE IF NOT EXISTS boo_abandoned_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bigcommerce_cart_id TEXT UNIQUE,
    bigcommerce_checkout_id TEXT,
    customer_email TEXT,
    customer_name TEXT,
    bigcommerce_customer_id TEXT,
    cart_contents JSONB NOT NULL,
    cart_value DECIMAL(10,2),
    currency_code TEXT DEFAULT 'AUD',
    abandoned_at TIMESTAMPTZ DEFAULT NOW(),
    recovered_at TIMESTAMPTZ,
    recovery_order_id TEXT,
    recovery_order_value DECIMAL(10,2),
    emails_sent INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMPTZ,
    discount_code_used TEXT,
    status TEXT DEFAULT 'abandoned',  -- abandoned, recovered, expired, converted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_carts_status ON boo_abandoned_carts(status);
CREATE INDEX IF NOT EXISTS idx_boo_carts_email ON boo_abandoned_carts(customer_email);
CREATE INDEX IF NOT EXISTS idx_boo_carts_abandoned ON boo_abandoned_carts(abandoned_at);
CREATE INDEX IF NOT EXISTS idx_boo_carts_bc_cart ON boo_abandoned_carts(bigcommerce_cart_id);

-- Email send history (for analytics)
CREATE TABLE IF NOT EXISTS boo_email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES boo_email_subscribers(id) ON DELETE SET NULL,
    queue_id UUID REFERENCES boo_email_queue(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    campaign_type TEXT NOT NULL,  -- bulk_campaign, automation, transactional
    automation_type TEXT,  -- welcome_series, abandoned_cart, etc.
    listmonk_campaign_id INTEGER,
    template_name TEXT,
    subject TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    open_count INTEGER DEFAULT 0,
    clicked_at TIMESTAMPTZ,
    click_count INTEGER DEFAULT 0,
    bounced_at TIMESTAMPTZ,
    bounce_type TEXT,  -- hard, soft
    bounce_reason TEXT,
    unsubscribed_at TIMESTAMPTZ,
    spam_reported_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_boo_sends_email ON boo_email_sends(email);
CREATE INDEX IF NOT EXISTS idx_boo_sends_campaign ON boo_email_sends(campaign_type);
CREATE INDEX IF NOT EXISTS idx_boo_sends_automation ON boo_email_sends(automation_type);
CREATE INDEX IF NOT EXISTS idx_boo_sends_sent ON boo_email_sends(sent_at);
CREATE INDEX IF NOT EXISTS idx_boo_sends_opened ON boo_email_sends(opened_at) WHERE opened_at IS NOT NULL;

-- Discount codes generated for automations
CREATE TABLE IF NOT EXISTS boo_automation_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    subscriber_id UUID REFERENCES boo_email_subscribers(id) ON DELETE SET NULL,
    automation_type TEXT NOT NULL,
    discount_code TEXT UNIQUE NOT NULL,
    discount_type TEXT DEFAULT 'percentage',  -- percentage, fixed_amount
    discount_value DECIMAL(10,2) NOT NULL,
    bigcommerce_coupon_id TEXT,
    min_purchase DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',  -- active, used, expired, cancelled
    used_at TIMESTAMPTZ,
    order_id TEXT,
    order_total DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_discounts_code ON boo_automation_discounts(discount_code);
CREATE INDEX IF NOT EXISTS idx_boo_discounts_email ON boo_automation_discounts(email);
CREATE INDEX IF NOT EXISTS idx_boo_discounts_status ON boo_automation_discounts(status);
CREATE INDEX IF NOT EXISTS idx_boo_discounts_expires ON boo_automation_discounts(expires_at) WHERE status = 'active';

-- Segmentation rules
CREATE TABLE IF NOT EXISTS boo_email_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    rules JSONB NOT NULL,
    listmonk_list_id INTEGER,
    subscriber_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMPTZ,
    auto_sync BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default segments
INSERT INTO boo_email_segments (name, description, rules) VALUES
('all_subscribers', 'All active email subscribers',
 '{"status": "active"}'::jsonb),
('vip_customers', 'Customers with 5+ orders or $500+ spent',
 '{"or": [{"total_orders": {"gte": 5}}, {"total_spent": {"gte": 500}}]}'::jsonb),
('new_customers', 'Customers with first order in last 30 days',
 '{"total_orders": {"eq": 1}, "first_order_days_ago": {"lte": 30}}'::jsonb),
('repeat_customers', 'Customers with 2+ orders',
 '{"total_orders": {"gte": 2}}'::jsonb),
('at_risk', 'Customers with no order in 60-90 days',
 '{"last_order_days_ago": {"gte": 60, "lte": 90}}'::jsonb),
('lapsed', 'Customers with no order in 90+ days',
 '{"last_order_days_ago": {"gte": 90}}'::jsonb),
('high_aov', 'Customers with average order value > $100',
 '{"average_order_value": {"gte": 100}}'::jsonb),
('never_purchased', 'Subscribers who never purchased',
 '{"total_orders": {"eq": 0}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Suppression list (do not email)
CREATE TABLE IF NOT EXISTS boo_email_suppression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    reason TEXT NOT NULL,  -- hard_bounce, spam_complaint, manual, unsubscribe
    source TEXT,  -- automation name, campaign id, manual
    suppressed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_boo_suppression_email ON boo_email_suppression(email);

-- Klaviyo migration tracking
CREATE TABLE IF NOT EXISTS boo_klaviyo_migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    klaviyo_profile_id TEXT UNIQUE,
    email TEXT NOT NULL,
    migration_status TEXT DEFAULT 'pending',  -- pending, migrated, failed, skipped
    listmonk_subscriber_id INTEGER,
    error_message TEXT,
    source_data JSONB,
    migrated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boo_klaviyo_migration_status ON boo_klaviyo_migration_log(migration_status);

-- ============================================
-- Views for Analytics & Reporting
-- ============================================

-- Email campaign performance
CREATE OR REPLACE VIEW boo_email_campaign_stats AS
SELECT
    campaign_type,
    automation_type,
    DATE_TRUNC('day', sent_at) as send_date,
    COUNT(*) as total_sent,
    COUNT(delivered_at) as delivered,
    COUNT(opened_at) as opened,
    COUNT(clicked_at) as clicked,
    COUNT(bounced_at) as bounced,
    COUNT(unsubscribed_at) as unsubscribed,
    COUNT(spam_reported_at) as spam_reports,
    ROUND(COUNT(opened_at)::numeric / NULLIF(COUNT(delivered_at), 0) * 100, 2) as open_rate,
    ROUND(COUNT(clicked_at)::numeric / NULLIF(COUNT(opened_at), 0) * 100, 2) as click_rate,
    ROUND(COUNT(bounced_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as bounce_rate,
    ROUND(COUNT(unsubscribed_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as unsubscribe_rate
FROM boo_email_sends
GROUP BY campaign_type, automation_type, DATE_TRUNC('day', sent_at);

-- Abandoned cart recovery stats
CREATE OR REPLACE VIEW boo_cart_recovery_stats AS
SELECT
    DATE_TRUNC('week', abandoned_at) as week,
    COUNT(*) as total_abandoned,
    COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovered,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
    SUM(cart_value) as total_abandoned_value,
    SUM(CASE WHEN status = 'recovered' THEN recovery_order_value END) as recovered_value,
    ROUND(COUNT(CASE WHEN status = 'recovered' THEN 1 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 2) as recovery_rate,
    ROUND(AVG(emails_sent), 1) as avg_emails_sent
FROM boo_abandoned_carts
GROUP BY DATE_TRUNC('week', abandoned_at);

-- Automation discount performance
CREATE OR REPLACE VIEW boo_discount_performance AS
SELECT
    automation_type,
    COUNT(*) as total_generated,
    COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as still_active,
    SUM(CASE WHEN status = 'used' THEN order_total END) as total_revenue,
    ROUND(COUNT(CASE WHEN status = 'used' THEN 1 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 2) as redemption_rate,
    ROUND(AVG(CASE WHEN status = 'used' THEN order_total END), 2) as avg_order_value
FROM boo_automation_discounts
GROUP BY automation_type;

-- Subscriber growth over time
CREATE OR REPLACE VIEW boo_subscriber_growth AS
SELECT
    DATE_TRUNC('week', subscribed_at) as week,
    COUNT(*) as new_subscribers,
    COUNT(CASE WHEN source = 'checkout' THEN 1 END) as from_checkout,
    COUNT(CASE WHEN source = 'popup' THEN 1 END) as from_popup,
    COUNT(CASE WHEN source = 'footer' THEN 1 END) as from_footer,
    COUNT(CASE WHEN source = 'import' THEN 1 END) as from_import,
    COUNT(CASE WHEN source = 'klaviyo_migration' THEN 1 END) as from_klaviyo
FROM boo_email_subscribers
GROUP BY DATE_TRUNC('week', subscribed_at);

-- Automation funnel view
CREATE OR REPLACE VIEW boo_automation_funnel AS
SELECT
    automation_type,
    COUNT(DISTINCT CASE WHEN sequence_number = 1 THEN email END) as started,
    COUNT(DISTINCT CASE WHEN sequence_number = 2 THEN email END) as reached_step_2,
    COUNT(DISTINCT CASE WHEN sequence_number = 3 THEN email END) as reached_step_3,
    COUNT(DISTINCT CASE WHEN status = 'sent' THEN email END) as total_sent,
    COUNT(DISTINCT CASE WHEN status = 'cancelled' THEN email END) as cancelled
FROM boo_email_queue
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY automation_type;

-- Email deliverability summary
CREATE OR REPLACE VIEW boo_deliverability_summary AS
SELECT
    DATE_TRUNC('day', sent_at) as date,
    COUNT(*) as total_sent,
    COUNT(delivered_at) as delivered,
    COUNT(bounced_at) as bounced,
    COUNT(CASE WHEN bounce_type = 'hard' THEN 1 END) as hard_bounces,
    COUNT(CASE WHEN bounce_type = 'soft' THEN 1 END) as soft_bounces,
    COUNT(spam_reported_at) as spam_complaints,
    ROUND(COUNT(delivered_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as delivery_rate,
    ROUND(COUNT(bounced_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as bounce_rate,
    ROUND(COUNT(spam_reported_at)::numeric / NULLIF(COUNT(*), 0) * 100, 4) as spam_rate
FROM boo_email_sends
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', sent_at)
ORDER BY date DESC;

-- ============================================
-- Functions for Automation
-- ============================================

-- Function to queue automation email
CREATE OR REPLACE FUNCTION boo_queue_automation_email(
    p_email TEXT,
    p_automation_type TEXT,
    p_sequence_number INTEGER DEFAULT 1,
    p_delay_hours INTEGER DEFAULT 0,
    p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_config JSONB;
    v_sequence JSONB;
    v_subscriber_id UUID;
    v_queue_id UUID;
BEGIN
    -- Get automation config
    SELECT config INTO v_config
    FROM boo_email_automation_config
    WHERE automation_type = p_automation_type AND enabled = true;

    IF v_config IS NULL THEN
        RAISE NOTICE 'Automation % not found or disabled', p_automation_type;
        RETURN NULL;
    END IF;

    -- Get sequence step (0-indexed)
    v_sequence := v_config->'sequence'->(p_sequence_number - 1);

    IF v_sequence IS NULL THEN
        RETURN NULL;  -- No more sequence steps
    END IF;

    -- Check suppression list
    IF EXISTS (SELECT 1 FROM boo_email_suppression WHERE email = p_email) THEN
        RAISE NOTICE 'Email % is suppressed, skipping', p_email;
        RETURN NULL;
    END IF;

    -- Get subscriber ID
    SELECT id INTO v_subscriber_id
    FROM boo_email_subscribers
    WHERE email = p_email AND status = 'active';

    -- Calculate scheduled time
    -- Use delay from sequence if not overridden
    IF p_delay_hours = 0 THEN
        p_delay_hours := COALESCE((v_sequence->>'delay_hours')::INTEGER, 0);
    END IF;

    -- Insert into queue
    INSERT INTO boo_email_queue (
        subscriber_id,
        email,
        automation_type,
        sequence_number,
        template_name,
        subject,
        scheduled_at,
        context
    ) VALUES (
        v_subscriber_id,
        p_email,
        p_automation_type,
        p_sequence_number,
        v_sequence->>'template',
        v_sequence->>'subject',
        NOW() + (p_delay_hours || ' hours')::INTERVAL,
        p_context
    ) RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending emails ready to send
CREATE OR REPLACE FUNCTION boo_get_pending_emails(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    queue_id UUID,
    email TEXT,
    automation_type TEXT,
    sequence_number INTEGER,
    template_name TEXT,
    subject TEXT,
    context JSONB,
    subscriber_first_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id as queue_id,
        q.email,
        q.automation_type,
        q.sequence_number,
        q.template_name,
        q.subject,
        q.context,
        s.first_name as subscriber_first_name
    FROM boo_email_queue q
    LEFT JOIN boo_email_subscribers s ON q.subscriber_id = s.id
    WHERE q.status = 'pending'
      AND q.scheduled_at <= NOW()
      AND NOT EXISTS (
          SELECT 1 FROM boo_email_suppression sup
          WHERE sup.email = q.email
      )
      AND (s.status IS NULL OR s.status = 'active')
    ORDER BY q.scheduled_at
    LIMIT p_limit
    FOR UPDATE OF q SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION boo_mark_email_sent(
    p_queue_id UUID,
    p_listmonk_campaign_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_queue RECORD;
BEGIN
    -- Get queue record
    SELECT * INTO v_queue FROM boo_email_queue WHERE id = p_queue_id;

    IF v_queue IS NULL THEN
        RAISE EXCEPTION 'Queue record not found: %', p_queue_id;
    END IF;

    -- Update queue status
    UPDATE boo_email_queue
    SET status = 'sent',
        sent_at = NOW(),
        listmonk_campaign_id = p_listmonk_campaign_id
    WHERE id = p_queue_id;

    -- Record in send history
    INSERT INTO boo_email_sends (
        subscriber_id,
        queue_id,
        email,
        campaign_type,
        automation_type,
        listmonk_campaign_id,
        template_name,
        subject
    ) VALUES (
        v_queue.subscriber_id,
        p_queue_id,
        v_queue.email,
        'automation',
        v_queue.automation_type,
        p_listmonk_campaign_id,
        v_queue.template_name,
        v_queue.subject
    );

    -- Update subscriber last email sent
    UPDATE boo_email_subscribers
    SET last_email_sent_at = NOW(),
        updated_at = NOW()
    WHERE email = v_queue.email;
END;
$$ LANGUAGE plpgsql;

-- Function to mark email as failed
CREATE OR REPLACE FUNCTION boo_mark_email_failed(
    p_queue_id UUID,
    p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE boo_email_queue
    SET status = 'failed',
        error_message = p_error_message,
        retry_count = retry_count + 1
    WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel pending emails for a subscriber/automation
CREATE OR REPLACE FUNCTION boo_cancel_pending_emails(
    p_email TEXT,
    p_automation_type TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE boo_email_queue
    SET status = 'cancelled'
    WHERE email = p_email
      AND status = 'pending'
      AND (p_automation_type IS NULL OR automation_type = p_automation_type);

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old discount codes
CREATE OR REPLACE FUNCTION boo_expire_discount_codes()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE boo_automation_discounts
    SET status = 'expired'
    WHERE status = 'active' AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark cart as recovered
CREATE OR REPLACE FUNCTION boo_mark_cart_recovered(
    p_cart_id TEXT,
    p_order_id TEXT,
    p_order_value DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE boo_abandoned_carts
    SET status = 'recovered',
        recovered_at = NOW(),
        recovery_order_id = p_order_id,
        recovery_order_value = COALESCE(p_order_value, cart_value),
        updated_at = NOW()
    WHERE bigcommerce_cart_id = p_cart_id;

    -- Also cancel any pending cart emails
    PERFORM boo_cancel_pending_emails(
        (SELECT customer_email FROM boo_abandoned_carts WHERE bigcommerce_cart_id = p_cart_id),
        'abandoned_cart'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to upsert subscriber from BigCommerce
CREATE OR REPLACE FUNCTION boo_upsert_subscriber(
    p_email TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_bigcommerce_customer_id TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'checkout'
)
RETURNS UUID AS $$
DECLARE
    v_subscriber_id UUID;
BEGIN
    INSERT INTO boo_email_subscribers (
        email,
        first_name,
        last_name,
        bigcommerce_customer_id,
        source
    ) VALUES (
        LOWER(TRIM(p_email)),
        p_first_name,
        p_last_name,
        p_bigcommerce_customer_id,
        p_source
    )
    ON CONFLICT (email) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, boo_email_subscribers.first_name),
        last_name = COALESCE(EXCLUDED.last_name, boo_email_subscribers.last_name),
        bigcommerce_customer_id = COALESCE(EXCLUDED.bigcommerce_customer_id, boo_email_subscribers.bigcommerce_customer_id),
        updated_at = NOW()
    RETURNING id INTO v_subscriber_id;

    RETURN v_subscriber_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update subscriber order stats
CREATE OR REPLACE FUNCTION boo_update_subscriber_order_stats(
    p_email TEXT,
    p_order_total DECIMAL,
    p_order_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
BEGIN
    UPDATE boo_email_subscribers
    SET total_orders = total_orders + 1,
        total_spent = total_spent + p_order_total,
        average_order_value = (total_spent + p_order_total) / (total_orders + 1),
        first_order_at = COALESCE(first_order_at, p_order_date),
        last_order_at = p_order_date,
        updated_at = NOW()
    WHERE email = LOWER(TRIM(p_email));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_boo_subscribers_updated
    BEFORE UPDATE ON boo_email_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_boo_automation_config_updated
    BEFORE UPDATE ON boo_email_automation_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_boo_segments_updated
    BEFORE UPDATE ON boo_email_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE boo_email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_automation_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_email_suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_email_automation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_email_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_klaviyo_migration_log ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
CREATE POLICY "Service role access" ON boo_email_subscribers FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_email_queue FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_abandoned_carts FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_email_sends FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_automation_discounts FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_email_suppression FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_email_automation_config FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_email_segments FOR ALL USING (true);
CREATE POLICY "Service role access" ON boo_klaviyo_migration_log FOR ALL USING (true);

-- ============================================
-- Scheduled Jobs (to be run via pg_cron or external scheduler)
-- ============================================

-- Daily: Expire old discount codes
-- SELECT boo_expire_discount_codes();

-- Daily: Expire old abandoned carts (after 30 days)
-- UPDATE boo_abandoned_carts SET status = 'expired' WHERE status = 'abandoned' AND abandoned_at < NOW() - INTERVAL '30 days';

-- Daily: Clean old queue entries (failed/cancelled older than 90 days)
-- DELETE FROM boo_email_queue WHERE status IN ('failed', 'cancelled') AND created_at < NOW() - INTERVAL '90 days';

COMMENT ON TABLE boo_email_subscribers IS 'BOO email subscribers - synced from BigCommerce and Listmonk';
COMMENT ON TABLE boo_email_queue IS 'Email automation queue - pending emails to be sent';
COMMENT ON TABLE boo_abandoned_carts IS 'Abandoned cart tracking for recovery emails';
COMMENT ON TABLE boo_email_sends IS 'Email send history for analytics and deliverability tracking';
COMMENT ON TABLE boo_automation_discounts IS 'Discount codes generated by automation flows';
COMMENT ON TABLE boo_email_segments IS 'Customer segments for targeted campaigns';
COMMENT ON TABLE boo_email_suppression IS 'Email suppression list - do not email';
