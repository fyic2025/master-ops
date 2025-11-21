-- Elevate Wholesale B2B Automation System
-- Initial Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: trial_customers
-- Purpose: Master customer tracking and trial management
-- =====================================================
CREATE TABLE trial_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Contact Information
  email TEXT UNIQUE NOT NULL,
  firstname TEXT,
  lastname TEXT,
  phone TEXT,

  -- Business Information
  business_name TEXT NOT NULL,
  abn TEXT,
  business_type TEXT, -- 'Retail Store', 'Online Store', 'Both'
  website TEXT,

  -- Address
  street_address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',

  -- Trial Management
  trial_status TEXT NOT NULL DEFAULT 'pending',
    -- Status values: 'pending', 'active', 'logged_in', 'converted', 'expired', 'deactivated'
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  trial_coupon_code TEXT,

  -- Integration IDs
  hubspot_contact_id TEXT,
  hubspot_company_id TEXT,
  shopify_customer_id TEXT,
  shopify_company_id TEXT,
  unleashed_customer_code TEXT,
  unleashed_customer_guid TEXT,

  -- Engagement Tracking
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  total_order_value DECIMAL(10,2) DEFAULT 0.00,

  -- Email Tracking
  welcome_email_sent_at TIMESTAMPTZ,
  reminder_email_1_sent_at TIMESTAMPTZ,
  reminder_email_2_sent_at TIMESTAMPTZ,
  reminder_email_3_sent_at TIMESTAMPTZ,
  expiry_warning_sent_at TIMESTAMPTZ,
  conversion_email_sent_at TIMESTAMPTZ,

  -- Lead Source & Marketing
  lead_source TEXT, -- 'Google Form', 'Referral', 'Direct', etc.
  referral_source TEXT,
  product_interests TEXT[], -- Array of product categories
  estimated_order_volume TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_trial_status CHECK (trial_status IN (
    'pending', 'active', 'logged_in', 'converted', 'expired', 'deactivated'
  )),
  CONSTRAINT valid_business_type CHECK (business_type IN (
    'Retail Store', 'Online Store', 'Both'
  ) OR business_type IS NULL)
);

-- Indexes for trial_customers
CREATE INDEX idx_trial_customers_email ON trial_customers(email);
CREATE INDEX idx_trial_customers_status ON trial_customers(trial_status);
CREATE INDEX idx_trial_customers_trial_end_date ON trial_customers(trial_end_date);
CREATE INDEX idx_trial_customers_hubspot_id ON trial_customers(hubspot_contact_id);
CREATE INDEX idx_trial_customers_shopify_id ON trial_customers(shopify_customer_id);
CREATE INDEX idx_trial_customers_created_at ON trial_customers(created_at DESC);

-- RLS Policies for trial_customers
ALTER TABLE trial_customers ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to trial_customers"
  ON trial_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Table: customer_activity_log
-- Purpose: Audit trail of all customer actions and events
-- =====================================================
CREATE TABLE customer_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES trial_customers(id) ON DELETE CASCADE,

  -- Event Details
  event_type TEXT NOT NULL,
    -- Event types: 'account_created', 'login', 'order_placed', 'email_sent',
    -- 'status_change', 'shopify_sync', 'unleashed_sync', 'hubspot_update', etc.
  event_description TEXT,
  event_data JSONB, -- Flexible storage for event-specific data

  -- Source & Metadata
  source TEXT NOT NULL, -- 'shopify_webhook', 'hubspot_webhook', 'supabase_function', 'manual'
  ip_address INET,
  user_agent TEXT,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type <> ''),
  CONSTRAINT valid_source CHECK (source <> '')
);

-- Indexes for customer_activity_log
CREATE INDEX idx_activity_log_customer_id ON customer_activity_log(customer_id);
CREATE INDEX idx_activity_log_event_type ON customer_activity_log(event_type);
CREATE INDEX idx_activity_log_created_at ON customer_activity_log(created_at DESC);
CREATE INDEX idx_activity_log_source ON customer_activity_log(source);
CREATE INDEX idx_activity_log_event_data ON customer_activity_log USING gin(event_data);

-- RLS Policies for customer_activity_log
ALTER TABLE customer_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to activity log"
  ON customer_activity_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Table: email_queue
-- Purpose: Scheduled email management (if not using HubSpot native)
-- =====================================================
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES trial_customers(id) ON DELETE CASCADE,

  -- Email Details
  email_type TEXT NOT NULL,
    -- Types: 'welcome', 'reminder_1', 'reminder_2', 'reminder_3',
    -- 'expiry_warning', 'trial_expired', 'conversion_offer', 'custom'
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- Status Tracking
  status TEXT DEFAULT 'pending',
    -- Status values: 'pending', 'sending', 'sent', 'failed', 'cancelled'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Email Data & Personalization
  email_data JSONB, -- Variables for template personalization
  template_id TEXT, -- External email template ID (if applicable)

  -- Error Tracking
  error_message TEXT,
  error_timestamp TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_email_type CHECK (email_type <> ''),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  CONSTRAINT valid_recipient_email CHECK (recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for email_queue
CREATE INDEX idx_email_queue_customer_id ON email_queue(customer_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_email_type ON email_queue(email_type);
CREATE INDEX idx_email_queue_pending ON email_queue(scheduled_for, status)
  WHERE status = 'pending';

-- RLS Policies for email_queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to email queue"
  ON email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Table: integration_sync_log
-- Purpose: Track all API calls and sync operations for debugging
-- =====================================================
CREATE TABLE integration_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES trial_customers(id) ON DELETE SET NULL,

  -- Integration Details
  integration TEXT NOT NULL, -- 'hubspot', 'shopify', 'unleashed', 'gmail'
  operation TEXT NOT NULL, -- 'create', 'update', 'delete', 'sync'
  endpoint TEXT, -- API endpoint called
  http_method TEXT, -- 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'

  -- Request/Response
  request_payload JSONB,
  response_payload JSONB,
  response_status_code INTEGER,

  -- Status & Timing
  status TEXT DEFAULT 'pending',
    -- Status: 'pending', 'success', 'failed', 'retrying'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Duration in milliseconds

  -- Error Handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  function_name TEXT, -- Supabase Edge Function that initiated the call
  correlation_id TEXT, -- For tracing related operations

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_integration CHECK (integration IN ('hubspot', 'shopify', 'unleashed', 'gmail', 'other')),
  CONSTRAINT valid_sync_status CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

-- Indexes for integration_sync_log
CREATE INDEX idx_sync_log_customer_id ON integration_sync_log(customer_id);
CREATE INDEX idx_sync_log_integration ON integration_sync_log(integration);
CREATE INDEX idx_sync_log_status ON integration_sync_log(status);
CREATE INDEX idx_sync_log_created_at ON integration_sync_log(created_at DESC);
CREATE INDEX idx_sync_log_correlation_id ON integration_sync_log(correlation_id);
CREATE INDEX idx_sync_log_function_name ON integration_sync_log(function_name);

-- RLS Policies for integration_sync_log
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to sync log"
  ON integration_sync_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Table: system_config
-- Purpose: Store system configuration and feature flags
-- =====================================================
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- RLS Policies for system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to system config"
  ON system_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default configuration
INSERT INTO system_config (key, value, description) VALUES
  ('trial_duration_days', '30', 'Default trial duration in days'),
  ('trial_discount_percentage', '10', 'Trial discount percentage'),
  ('free_shipping_threshold', '300', 'Minimum order value for free shipping (AUD)'),
  ('standard_shipping_cost', '20', 'Shipping cost for orders under threshold (AUD)'),
  ('email_from_address', '"sales@elevatewholesale.com.au"', 'Default email sender address'),
  ('email_from_name', '"Elevate Wholesale"', 'Default email sender name'),
  ('sync_enabled', 'true', 'Master switch for all sync operations'),
  ('dry_run_mode', 'false', 'If true, log actions without executing');

-- =====================================================
-- Functions & Triggers
-- =====================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at for trial_customers
CREATE TRIGGER update_trial_customers_updated_at
  BEFORE UPDATE ON trial_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at for email_queue
CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at for system_config
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Log customer status changes
CREATE OR REPLACE FUNCTION log_customer_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.trial_status IS DISTINCT FROM NEW.trial_status THEN
    INSERT INTO customer_activity_log (
      customer_id,
      event_type,
      event_description,
      event_data,
      source
    ) VALUES (
      NEW.id,
      'status_change',
      'Trial status changed from ' || COALESCE(OLD.trial_status, 'NULL') ||
        ' to ' || NEW.trial_status,
      jsonb_build_object(
        'old_status', OLD.trial_status,
        'new_status', NEW.trial_status,
        'changed_at', NOW()
      ),
      'database_trigger'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log trial_customers status changes
CREATE TRIGGER log_trial_customer_status_changes
  AFTER UPDATE ON trial_customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_status_change();

-- Function: Calculate trial end date
CREATE OR REPLACE FUNCTION calculate_trial_end_date(start_date TIMESTAMPTZ, duration_days INTEGER DEFAULT 30)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN start_date + (duration_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Views for Analytics & Reporting
-- =====================================================

-- View: Active Trials Summary
CREATE OR REPLACE VIEW active_trials_summary AS
SELECT
  trial_status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE login_count > 0) as logged_in_count,
  COUNT(*) FILTER (WHERE order_count > 0) as ordered_count,
  AVG(order_count) as avg_orders_per_trial,
  AVG(total_order_value) as avg_spend_per_trial,
  SUM(total_order_value) as total_revenue
FROM trial_customers
WHERE trial_status IN ('active', 'logged_in')
GROUP BY trial_status;

-- View: Trial Conversion Funnel
CREATE OR REPLACE VIEW trial_conversion_funnel AS
SELECT
  COUNT(*) as total_trials,
  COUNT(*) FILTER (WHERE trial_status = 'pending') as pending_trials,
  COUNT(*) FILTER (WHERE trial_status = 'active') as active_trials,
  COUNT(*) FILTER (WHERE login_count > 0) as trials_with_login,
  COUNT(*) FILTER (WHERE order_count > 0) as trials_with_orders,
  COUNT(*) FILTER (WHERE order_count >= 3) as high_intent_trials,
  COUNT(*) FILTER (WHERE trial_status = 'converted') as converted_trials,
  COUNT(*) FILTER (WHERE trial_status = 'expired') as expired_trials,
  ROUND(
    COUNT(*) FILTER (WHERE trial_status = 'converted')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as conversion_rate_percent
FROM trial_customers
WHERE created_at > NOW() - INTERVAL '90 days';

-- View: Integration Health Check
CREATE OR REPLACE VIEW integration_health AS
SELECT
  integration,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE status = 'success') as successful_calls,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_calls,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'success')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate_percent,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_call_at
FROM integration_sync_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY integration;

-- =====================================================
-- Sample Data (for testing)
-- =====================================================

-- Uncomment to insert sample trial customer
/*
INSERT INTO trial_customers (
  email, firstname, lastname, phone,
  business_name, abn, business_type,
  trial_status, trial_start_date, trial_end_date,
  lead_source
) VALUES (
  'john@example.com', 'John', 'Smith', '+61400000000',
  'Smith''s Boutique', '12 345 678 901', 'Retail Store',
  'pending', NOW(), calculate_trial_end_date(NOW(), 30),
  'Google Form'
);
*/

-- =====================================================
-- Grants & Permissions
-- =====================================================

-- Grant necessary permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON active_trials_summary TO authenticated;
GRANT SELECT ON trial_conversion_funnel TO authenticated;
GRANT SELECT ON integration_health TO authenticated;

-- Comments for documentation
COMMENT ON TABLE trial_customers IS 'Master customer tracking and trial management table';
COMMENT ON TABLE customer_activity_log IS 'Audit trail of all customer actions and events';
COMMENT ON TABLE email_queue IS 'Scheduled email management queue';
COMMENT ON TABLE integration_sync_log IS 'API call tracking for debugging and monitoring';
COMMENT ON TABLE system_config IS 'System configuration and feature flags';

COMMENT ON COLUMN trial_customers.trial_status IS 'Current trial status: pending, active, logged_in, converted, expired, deactivated';
COMMENT ON COLUMN trial_customers.trial_coupon_code IS 'Unique Shopify discount code for this trial';
COMMENT ON COLUMN trial_customers.hubspot_contact_id IS 'HubSpot contact ID for bi-directional sync';
COMMENT ON COLUMN trial_customers.shopify_customer_id IS 'Shopify customer ID for order tracking';
COMMENT ON COLUMN trial_customers.unleashed_customer_code IS 'Unleashed customer code for inventory sync';
