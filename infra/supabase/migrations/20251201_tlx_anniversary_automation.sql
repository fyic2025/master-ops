-- ============================================================================
-- Teelixir Anniversary Automation Schema
-- Purpose: Track anniversary discount codes and campaign performance
-- ============================================================================

-- 1. Anniversary discount tracking table
CREATE TABLE IF NOT EXISTS tlx_anniversary_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer identification
  klaviyo_profile_id TEXT,
  email TEXT NOT NULL,
  first_name TEXT,
  shopify_customer_id TEXT,
  shopify_order_id TEXT,  -- Original first order

  -- Discount details
  discount_code TEXT NOT NULL UNIQUE,
  shopify_discount_id TEXT,  -- GraphQL ID from Shopify
  shopify_price_rule_id TEXT,  -- REST API ID
  discount_percent DECIMAL(5,2) DEFAULT 15.0,

  -- Timing
  first_order_date TIMESTAMPTZ,
  trigger_day INTEGER,  -- Days since first order when triggered
  expires_at TIMESTAMPTZ NOT NULL,
  email_sent_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sent', 'used', 'expired', 'failed')),
  used_at TIMESTAMPTZ,
  converted_order_id TEXT,
  converted_order_total DECIMAL(10,2),

  -- Timing lookup used
  timing_product_type TEXT,
  timing_product_size INTEGER,
  timing_match_type TEXT,  -- 'product_size', 'size_only', 'global'

  -- Error handling
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tlx_anniv_email ON tlx_anniversary_discounts(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_tlx_anniv_status ON tlx_anniversary_discounts(status);
CREATE INDEX IF NOT EXISTS idx_tlx_anniv_code ON tlx_anniversary_discounts(discount_code);
CREATE INDEX IF NOT EXISTS idx_tlx_anniv_klaviyo ON tlx_anniversary_discounts(klaviyo_profile_id);
CREATE INDEX IF NOT EXISTS idx_tlx_anniv_expires ON tlx_anniversary_discounts(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tlx_anniv_shopify_customer ON tlx_anniversary_discounts(shopify_customer_id);

-- 2. Add anniversary config to automation_config
INSERT INTO tlx_automation_config (automation_type, enabled, config) VALUES
('anniversary_15', false, '{
  "discount_percent": 15,
  "expiration_days": 14,
  "lead_days": 5,
  "min_sample_size": 15,
  "global_fallback_days": 60,
  "daily_limit": 50,
  "send_window_start": 9,
  "send_window_end": 19,
  "sender_email": "colette@teelixir.com",
  "sender_name": "Colette from Teelixir"
}'::jsonb)
ON CONFLICT (automation_type) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = NOW();

-- 3. Anniversary campaign stats view
CREATE OR REPLACE VIEW tlx_anniversary_stats AS
SELECT
  COUNT(*) AS total_generated,
  COUNT(*) FILTER (WHERE status = 'active') AS active_codes,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_codes,
  COUNT(*) FILTER (WHERE status = 'used') AS used_codes,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_codes,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_codes,
  COALESCE(SUM(converted_order_total) FILTER (WHERE status = 'used'), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS generated_today,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS generated_this_week,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'used')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'used', 'expired')), 0)) * 100,
    2
  ) AS conversion_rate_percent,
  ROUND(
    COALESCE(SUM(converted_order_total) FILTER (WHERE status = 'used'), 0) /
    NULLIF(COUNT(*) FILTER (WHERE status = 'used'), 0),
    2
  ) AS avg_order_value,
  -- Timing match breakdown
  COUNT(*) FILTER (WHERE timing_match_type = 'product_size') AS matched_product_size,
  COUNT(*) FILTER (WHERE timing_match_type = 'size_only') AS matched_size_only,
  COUNT(*) FILTER (WHERE timing_match_type = 'global') AS matched_global
FROM tlx_anniversary_discounts;

-- 4. Function to expire old anniversary codes
CREATE OR REPLACE FUNCTION expire_anniversary_codes()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE tlx_anniversary_discounts
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE
    status IN ('active', 'sent')
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get email send day for a customer
CREATE OR REPLACE FUNCTION get_anniversary_email_day(
  p_product_type TEXT,
  p_product_size INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  result_day INTEGER;
  config_row RECORD;
BEGIN
  -- Get config
  SELECT config INTO config_row FROM tlx_automation_config WHERE automation_type = 'anniversary_15';

  -- Try product + size match
  SELECT email_send_day INTO result_day
  FROM tlx_reorder_timing
  WHERE product_type = p_product_type
    AND product_size_grams = p_product_size
    AND sample_size >= (config_row.config->>'min_sample_size')::INTEGER;

  IF result_day IS NOT NULL THEN
    RETURN result_day;
  END IF;

  -- Try size-only fallback
  SELECT email_send_day INTO result_day
  FROM tlx_reorder_timing
  WHERE product_type IS NULL
    AND product_size_grams = p_product_size
    AND sample_size >= (config_row.config->>'min_sample_size')::INTEGER;

  IF result_day IS NOT NULL THEN
    RETURN result_day;
  END IF;

  -- Global fallback
  SELECT email_send_day INTO result_day
  FROM tlx_reorder_timing
  WHERE product_type IS NULL
    AND product_size_grams IS NULL;

  IF result_day IS NOT NULL THEN
    RETURN result_day;
  END IF;

  -- Default from config
  RETURN COALESCE(
    (config_row.config->>'global_fallback_days')::INTEGER - (config_row.config->>'lead_days')::INTEGER,
    55  -- 60 - 5
  );
END;
$$ LANGUAGE plpgsql;

-- 6. View for customers due for anniversary email
CREATE OR REPLACE VIEW v_tlx_anniversary_candidates AS
SELECT
  f.shopify_customer_id,
  f.shopify_order_id,
  f.customer_email,
  f.customer_first_name,
  f.first_order_date,
  f.first_order_value,
  f.days_since_first_order,
  f.primary_product_type,
  f.primary_product_size,
  get_anniversary_email_day(f.primary_product_type, f.primary_product_size) as email_send_day,
  CASE
    WHEN rt.product_type IS NOT NULL AND rt.product_size_grams IS NOT NULL THEN 'product_size'
    WHEN rt.product_size_grams IS NOT NULL THEN 'size_only'
    ELSE 'global'
  END as timing_match_type
FROM v_tlx_first_order_no_reorder f
LEFT JOIN tlx_reorder_timing rt ON (
  (rt.product_type = f.primary_product_type AND rt.product_size_grams = f.primary_product_size)
  OR (rt.product_type IS NULL AND rt.product_size_grams = f.primary_product_size)
  OR (rt.product_type IS NULL AND rt.product_size_grams IS NULL)
)
WHERE f.days_since_first_order >= get_anniversary_email_day(f.primary_product_type, f.primary_product_size)
  -- Not already sent anniversary email
  AND NOT EXISTS (
    SELECT 1 FROM tlx_anniversary_discounts ad
    WHERE ad.shopify_customer_id = f.shopify_customer_id::TEXT
  )
  -- Not in winback campaign
  AND NOT EXISTS (
    SELECT 1 FROM tlx_winback_emails w
    WHERE LOWER(w.email) = LOWER(f.customer_email)
  );

-- 7. Add to job monitoring (using DO block to handle existing rows)
DO $$
BEGIN
  -- Insert shopify-order-sync if not exists
  IF NOT EXISTS (SELECT 1 FROM dashboard_job_status WHERE job_name = 'shopify-order-sync') THEN
    INSERT INTO dashboard_job_status (
      job_name, job_type, business, schedule, description,
      expected_interval_hours, relevant_files, status
    ) VALUES (
      'shopify-order-sync', 'sync', 'teelixir', 'Daily 4AM AEST',
      'Syncs Shopify orders to Supabase for reorder analysis',
      25,
      ARRAY['teelixir/scripts/sync-shopify-orders.ts'],
      'unknown'
    );
  END IF;

  -- Insert anniversary-emails if not exists
  IF NOT EXISTS (SELECT 1 FROM dashboard_job_status WHERE job_name = 'anniversary-emails') THEN
    INSERT INTO dashboard_job_status (
      job_name, job_type, business, schedule, description,
      expected_interval_hours, relevant_files, status
    ) VALUES (
      'anniversary-emails', 'automation', 'teelixir', 'Daily 9AM AEST',
      'Sends anniversary emails with unique 15% discount codes to first-time buyers',
      25,
      ARRAY['teelixir/scripts/send-anniversary-emails.ts', 'dashboard/src/app/api/automations/anniversary/generate-code/route.ts'],
      'unknown'
    );
  END IF;

  -- Insert reorder-timing-refresh if not exists (monthly adaptive learning)
  IF NOT EXISTS (SELECT 1 FROM dashboard_job_status WHERE job_name = 'reorder-timing-refresh') THEN
    INSERT INTO dashboard_job_status (
      job_name, job_type, business, schedule, description,
      expected_interval_hours, relevant_files, status
    ) VALUES (
      'reorder-timing-refresh', 'analysis', 'teelixir', 'Monthly 1st at 5AM AEST',
      'Updates email timing based on latest reorder patterns - adaptive learning',
      750,  -- ~31 days
      ARRAY['teelixir/scripts/refresh-reorder-timing.ts', 'teelixir/scripts/analyze-reorder-timing.ts'],
      'unknown'
    );
  END IF;
END $$;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE tlx_anniversary_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to tlx_anniversary_discounts"
  ON tlx_anniversary_discounts FOR ALL
  USING (auth.role() = 'service_role');
