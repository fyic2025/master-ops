-- Migration: Anniversary Upsell Enhancement
-- Description: Adds upsell tracking, product variants cache, and queue for scheduled sending
-- Run in: Supabase SQL Editor

-- ============================================================================
-- Table 1: tlx_shopify_variants - Product/Variant cache for upsell lookups
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_shopify_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id BIGINT NOT NULL,
  shopify_variant_id BIGINT NOT NULL UNIQUE,
  product_title TEXT NOT NULL,
  product_handle TEXT,
  product_type TEXT,  -- Classified type: Lions Mane, Reishi, etc.
  variant_title TEXT,
  size_grams INTEGER,
  size_unit TEXT DEFAULT 'g',  -- g for grams, caps for capsules
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  image_url TEXT,
  inventory_quantity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Computed column for price per unit (works for both grams and capsules)
COMMENT ON TABLE tlx_shopify_variants IS 'Shopify product variants cache for upsell lookups';
COMMENT ON COLUMN tlx_shopify_variants.product_type IS 'Classified product type (Lions Mane, Reishi, Latte, Capsules, etc.)';
COMMENT ON COLUMN tlx_shopify_variants.size_unit IS 'Unit type: g for grams, caps for capsules';

CREATE INDEX IF NOT EXISTS idx_variants_type_size ON tlx_shopify_variants(product_type, size_grams);
CREATE INDEX IF NOT EXISTS idx_variants_available ON tlx_shopify_variants(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON tlx_shopify_variants(shopify_product_id);

-- ============================================================================
-- Table 2: Add upsell columns to tlx_anniversary_discounts
-- ============================================================================
ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS original_product_type TEXT;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS original_product_size INTEGER;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS original_variant_id BIGINT;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS original_price_per_gram DECIMAL(10,4);

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS original_image_url TEXT;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS upsell_product_type TEXT;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS upsell_product_size INTEGER;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS upsell_variant_id BIGINT;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS upsell_price DECIMAL(10,2);

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS upsell_price_per_gram DECIMAL(10,4);

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS upsell_image_url TEXT;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS upsell_savings_percent DECIMAL(5,2);

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS is_largest_size BOOLEAN DEFAULT FALSE;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS send_lead_days INTEGER;

-- Tracking columns (same as winback)
ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS send_hour_melbourne INTEGER;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS first_open_hour_melbourne INTEGER;

ALTER TABLE tlx_anniversary_discounts
ADD COLUMN IF NOT EXISTS first_click_hour_melbourne INTEGER;

COMMENT ON COLUMN tlx_anniversary_discounts.upsell_savings_percent IS 'Percentage savings per gram when upgrading to larger size';
COMMENT ON COLUMN tlx_anniversary_discounts.is_largest_size IS 'True if customer already bought largest size (no upsell available)';

-- Index for open tracking
CREATE INDEX IF NOT EXISTS idx_anniversary_opened
ON tlx_anniversary_discounts(opened_at) WHERE opened_at IS NOT NULL;

-- ============================================================================
-- Table 3: tlx_anniversary_queue - Scheduled sending queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS tlx_anniversary_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  shopify_customer_id TEXT,
  first_name TEXT,
  last_name TEXT,
  shopify_order_id TEXT,
  first_order_date TIMESTAMPTZ,

  -- Original product details
  original_product_type TEXT,
  original_product_size INTEGER,
  original_variant_id BIGINT,

  -- Upsell details (pre-calculated)
  upsell_variant_id BIGINT,
  is_largest_size BOOLEAN DEFAULT FALSE,

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_hour INTEGER NOT NULL CHECK (scheduled_hour >= 0 AND scheduled_hour <= 23),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  CONSTRAINT tlx_anniversary_queue_email_date_unique UNIQUE (email, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_anniversary_queue_pending
ON tlx_anniversary_queue(scheduled_date, scheduled_hour, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_anniversary_queue_email
ON tlx_anniversary_queue(email);

COMMENT ON TABLE tlx_anniversary_queue IS 'Queue for scheduled anniversary emails with upsell offers';

-- ============================================================================
-- View: Queue status summary
-- ============================================================================
CREATE OR REPLACE VIEW v_anniversary_queue_status AS
SELECT
  scheduled_date,
  scheduled_hour,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) as total
FROM tlx_anniversary_queue
WHERE scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY scheduled_date, scheduled_hour
ORDER BY scheduled_date DESC, scheduled_hour;

-- ============================================================================
-- View: Today's anniversary schedule
-- ============================================================================
CREATE OR REPLACE VIEW v_anniversary_today_schedule AS
SELECT
  scheduled_hour,
  CASE
    WHEN scheduled_hour < 12 THEN scheduled_hour || ':00 AM'
    WHEN scheduled_hour = 12 THEN '12:00 PM'
    ELSE (scheduled_hour - 12) || ':00 PM'
  END as hour_label,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) as total
FROM tlx_anniversary_queue
WHERE scheduled_date = CURRENT_DATE
GROUP BY scheduled_hour
ORDER BY scheduled_hour;

-- ============================================================================
-- Update anniversary stats view to include upsell metrics
-- ============================================================================
CREATE OR REPLACE VIEW tlx_anniversary_stats AS
SELECT
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS total_opened,
  COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS total_clicked,
  COUNT(*) FILTER (WHERE status = 'used') AS total_converted,
  COUNT(*) FILTER (WHERE status = 'failed') AS total_failed,
  COALESCE(SUM(converted_order_total) FILTER (WHERE status = 'used'), 0) AS total_revenue,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS sent_today,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS sent_this_week,
  -- Rates
  ROUND(
    (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'used', 'expired')), 0)) * 100,
    2
  ) AS open_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'used', 'expired')), 0)) * 100,
    2
  ) AS click_rate_percent,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'used')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'used', 'expired')), 0)) * 100,
    2
  ) AS conversion_rate_percent,
  -- Upsell breakdown
  COUNT(*) FILTER (WHERE is_largest_size = FALSE AND upsell_variant_id IS NOT NULL) AS upsell_sent,
  COUNT(*) FILTER (WHERE is_largest_size = TRUE) AS repeat_only_sent,
  COUNT(*) FILTER (WHERE status = 'used' AND is_largest_size = FALSE) AS upsell_converted,
  AVG(upsell_savings_percent) FILTER (WHERE upsell_savings_percent IS NOT NULL) AS avg_upsell_savings_percent
FROM tlx_anniversary_discounts
WHERE status != 'active';

COMMENT ON VIEW tlx_anniversary_stats IS 'Anniversary campaign stats with upsell tracking';

-- ============================================================================
-- Add anniversary_upsell config
-- ============================================================================
INSERT INTO tlx_automation_config (automation_type, enabled, config) VALUES
('anniversary_upsell', false, '{
  "discount_percent": 15,
  "expiration_days": 14,
  "small_size_lead_days": 7,
  "large_size_lead_days": 12,
  "large_size_threshold_grams": 250,
  "daily_limit": 50,
  "send_window_start": 9,
  "send_window_end": 19,
  "sender_email": "colette@teelixir.com",
  "sender_name": "Colette from Teelixir",
  "reply_to_email": "colette@teelixir.com",
  "discount_code_format": "{FULLNAME}15"
}'::jsonb)
ON CONFLICT (automation_type) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = NOW();

-- ============================================================================
-- View: Upsell candidates with product data
-- ============================================================================
CREATE OR REPLACE VIEW v_tlx_anniversary_upsell_candidates AS
WITH ranked_items AS (
  SELECT
    o.shopify_customer_id,
    o.shopify_order_id,
    o.customer_email,
    COALESCE(o.customer_first_name, c.first_name) as customer_first_name,
    COALESCE(o.customer_last_name, c.last_name) as customer_last_name,
    o.processed_at as first_order_date,
    CURRENT_DATE - o.processed_at::DATE as days_since_order,
    li.product_type,
    li.product_size_grams,
    li.shopify_product_id,
    li.shopify_variant_id,
    li.quantity,
    li.price,
    -- Prioritize multi-quantity purchases, then smallest size
    ROW_NUMBER() OVER (
      PARTITION BY o.shopify_customer_id
      ORDER BY
        CASE WHEN li.quantity > 1 THEN 0 ELSE 1 END,
        li.product_size_grams ASC
    ) as rank
  FROM tlx_shopify_orders o
  JOIN tlx_shopify_line_items li ON o.id = li.order_id
  LEFT JOIN tlx_shopify_customers c ON o.shopify_customer_id = c.shopify_customer_id
  WHERE o.is_first_order = TRUE
    AND o.cancelled_at IS NULL
    AND li.product_type IS NOT NULL
    AND li.product_type NOT IN ('Gift Card', 'Bundle', 'Other')
    AND li.product_size_grams IS NOT NULL
)
SELECT
  r.shopify_customer_id,
  r.shopify_order_id,
  r.customer_email,
  r.customer_first_name,
  r.customer_last_name,
  r.first_order_date,
  r.days_since_order,
  r.product_type,
  r.product_size_grams,
  r.shopify_product_id,
  r.shopify_variant_id,
  r.quantity,
  r.price,
  -- Calculate lead days based on size
  CASE WHEN r.product_size_grams >= 250 THEN 12 ELSE 7 END as lead_days,
  -- Calculate upsell target size
  CASE
    WHEN r.product_size_grams = 50 THEN 100
    WHEN r.product_size_grams = 100 THEN 250
    WHEN r.product_size_grams = 250 THEN 500
    WHEN r.product_size_grams = 500 THEN 1000  -- For lattes
    ELSE NULL
  END as upsell_target_size,
  -- Is largest size?
  (r.product_size_grams >= 500 AND r.product_type NOT LIKE '%Latte%')
    OR (r.product_size_grams >= 1000) as is_largest_size,
  -- Get email send day from reorder timing
  COALESCE(rt.email_send_day,
    CASE WHEN r.product_size_grams >= 250 THEN 55 ELSE 40 END  -- Default fallbacks
  ) as email_send_day,
  rt.confidence as timing_confidence
FROM ranked_items r
LEFT JOIN tlx_reorder_timing rt ON r.product_type = rt.product_type
  AND r.product_size_grams = rt.product_size_grams
WHERE r.rank = 1
  -- Not already sent anniversary email
  AND NOT EXISTS (
    SELECT 1 FROM tlx_anniversary_discounts ad
    WHERE ad.shopify_customer_id = r.shopify_customer_id::TEXT
      OR LOWER(ad.email) = LOWER(r.customer_email)
  )
  -- Not already in queue
  AND NOT EXISTS (
    SELECT 1 FROM tlx_anniversary_queue aq
    WHERE LOWER(aq.email) = LOWER(r.customer_email)
      AND aq.status = 'pending'
  )
  -- Not in winback campaign
  AND NOT EXISTS (
    SELECT 1 FROM tlx_winback_emails w
    WHERE LOWER(w.email) = LOWER(r.customer_email)
  );

COMMENT ON VIEW v_tlx_anniversary_upsell_candidates IS
  'First-time customers eligible for anniversary upsell emails, with product ranking';

-- ============================================================================
-- Add to job monitoring
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dashboard_job_status WHERE job_name = 'anniversary-upsell-emails') THEN
    INSERT INTO dashboard_job_status (
      job_name, job_type, business, schedule, description,
      expected_interval_hours, relevant_files, status
    ) VALUES (
      'anniversary-upsell-emails', 'automation', 'teelixir', 'Hourly 9AM-6PM AEST',
      'Sends anniversary emails with personalized upsell offers and 15% discount codes',
      2,
      ARRAY['teelixir/scripts/send-anniversary-upsell.ts', 'teelixir/scripts/queue-anniversary-emails.ts'],
      'unknown'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM dashboard_job_status WHERE job_name = 'shopify-variants-sync') THEN
    INSERT INTO dashboard_job_status (
      job_name, job_type, business, schedule, description,
      expected_interval_hours, relevant_files, status
    ) VALUES (
      'shopify-variants-sync', 'sync', 'teelixir', 'Daily 3AM AEST',
      'Syncs Shopify product variants for upsell pricing lookups',
      25,
      ARRAY['teelixir/scripts/sync-shopify-variants.ts'],
      'unknown'
    );
  END IF;
END $$;

-- ============================================================================
-- Enable RLS on new tables
-- ============================================================================
ALTER TABLE tlx_shopify_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_anniversary_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to tlx_shopify_variants"
  ON tlx_shopify_variants FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tlx_anniversary_queue"
  ON tlx_anniversary_queue FOR ALL
  USING (auth.role() = 'service_role');
