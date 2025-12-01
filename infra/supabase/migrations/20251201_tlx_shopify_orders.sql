-- ============================================================================
-- Teelixir Shopify B2C Orders Schema
-- Purpose: Store order data for reorder pattern analysis and anniversary campaign
-- ============================================================================

-- 1. Main orders table
CREATE TABLE IF NOT EXISTS tlx_shopify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Shopify identifiers
  shopify_order_id BIGINT NOT NULL UNIQUE,
  order_number INTEGER NOT NULL,
  order_name TEXT,  -- "#1051"

  -- Customer linking
  shopify_customer_id BIGINT,
  customer_email TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,

  -- Timing (processed_at is the "order date" for analysis)
  processed_at TIMESTAMPTZ NOT NULL,
  created_at_shopify TIMESTAMPTZ NOT NULL,

  -- Order status
  financial_status TEXT,  -- 'paid', 'refunded', 'partially_refunded'
  fulfillment_status TEXT,  -- 'fulfilled', 'partial', null
  cancelled_at TIMESTAMPTZ,

  -- Financials (AUD)
  subtotal_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  total_discounts DECIMAL(10,2),
  currency TEXT DEFAULT 'AUD',

  -- Discount codes used (for conversion tracking)
  discount_codes JSONB,  -- [{code: 'MISSYOU40', amount: '12.00'}]

  -- Customer metrics (calculated after sync)
  customer_order_sequence INTEGER,  -- 1st, 2nd, 3rd order for this customer
  is_first_order BOOLEAN DEFAULT FALSE,
  days_since_previous_order INTEGER,  -- NULL for first orders

  -- Source/channel
  source_name TEXT,  -- 'web', 'pos', 'mobile'

  -- Sync tracking
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB,  -- Full Shopify order response

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tlx_shopify_orders_customer_id ON tlx_shopify_orders(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_tlx_shopify_orders_customer_email ON tlx_shopify_orders(LOWER(customer_email));
CREATE INDEX IF NOT EXISTS idx_tlx_shopify_orders_processed ON tlx_shopify_orders(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tlx_shopify_orders_first ON tlx_shopify_orders(is_first_order) WHERE is_first_order = TRUE;
CREATE INDEX IF NOT EXISTS idx_tlx_shopify_orders_sequence ON tlx_shopify_orders(shopify_customer_id, customer_order_sequence);
CREATE INDEX IF NOT EXISTS idx_tlx_shopify_orders_financial ON tlx_shopify_orders(financial_status);

-- 2. Line items table for product/size analysis
CREATE TABLE IF NOT EXISTS tlx_shopify_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to order
  order_id UUID NOT NULL REFERENCES tlx_shopify_orders(id) ON DELETE CASCADE,

  -- Shopify identifiers
  shopify_line_item_id BIGINT NOT NULL,
  shopify_product_id BIGINT,
  shopify_variant_id BIGINT,

  -- Product details
  sku TEXT,
  title TEXT NOT NULL,
  variant_title TEXT,  -- "100g", "250g"
  vendor TEXT,

  -- Parsed product classification (matches tlx_product_groups)
  product_type TEXT,  -- 'Lions Mane', 'Reishi', etc. (46 types)
  product_size_grams INTEGER,  -- 30, 100, 250 (parsed from variant_title)

  -- Quantities & pricing
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2),
  total_discount DECIMAL(10,2) DEFAULT 0,

  -- Flags
  is_gift_card BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tlx_line_items_order ON tlx_shopify_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tlx_line_items_product ON tlx_shopify_line_items(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_tlx_line_items_sku ON tlx_shopify_line_items(sku);
CREATE INDEX IF NOT EXISTS idx_tlx_line_items_type ON tlx_shopify_line_items(product_type) WHERE product_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tlx_line_items_size ON tlx_shopify_line_items(product_size_grams) WHERE product_size_grams IS NOT NULL;

-- 3. Reorder timing lookup table (populated from analysis)
CREATE TABLE IF NOT EXISTS tlx_reorder_timing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT,  -- NULL for size-only fallback
  product_size_grams INTEGER,  -- NULL for global fallback
  avg_days_to_reorder INTEGER NOT NULL,
  email_send_day INTEGER NOT NULL,  -- avg_days - 5
  sample_size INTEGER,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),  -- high (n>50), medium (n>20), low
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_type, product_size_grams)
);

-- 4. Sync log table
CREATE TABLE IF NOT EXISTS tlx_shopify_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,  -- 'full', 'incremental'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_seconds INTEGER
);

-- ============================================================================
-- Functions
-- ============================================================================

-- 5. Function to calculate order sequences for all customers
CREATE OR REPLACE FUNCTION calculate_tlx_order_sequences()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH ordered AS (
    SELECT
      id,
      shopify_customer_id,
      processed_at,
      ROW_NUMBER() OVER (
        PARTITION BY shopify_customer_id
        ORDER BY processed_at
      ) as seq,
      LAG(processed_at) OVER (
        PARTITION BY shopify_customer_id
        ORDER BY processed_at
      ) as prev_order_date
    FROM tlx_shopify_orders
    WHERE shopify_customer_id IS NOT NULL
      AND cancelled_at IS NULL
  )
  UPDATE tlx_shopify_orders o
  SET
    customer_order_sequence = ordered.seq,
    is_first_order = (ordered.seq = 1),
    days_since_previous_order = CASE
      WHEN ordered.seq > 1 THEN
        EXTRACT(EPOCH FROM (o.processed_at - ordered.prev_order_date)) / 86400
      ELSE NULL
    END,
    updated_at = NOW()
  FROM ordered
  WHERE o.id = ordered.id
    AND (o.customer_order_sequence IS DISTINCT FROM ordered.seq
      OR o.is_first_order IS DISTINCT FROM (ordered.seq = 1));

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to classify product type from title
CREATE OR REPLACE FUNCTION classify_tlx_product_type(title TEXT)
RETURNS TEXT AS $$
DECLARE
  title_lower TEXT := LOWER(COALESCE(title, ''));
BEGIN
  -- Lions Mane
  IF (title_lower LIKE '%lions mane%' OR title_lower LIKE '%lion''s mane%' OR title_lower LIKE '%lion mane%') AND title_lower LIKE '%pure%' THEN RETURN 'Lions Mane Pure';
  ELSIF title_lower LIKE '%lions mane%' OR title_lower LIKE '%lion''s mane%' OR title_lower LIKE '%lion mane%' THEN RETURN 'Lions Mane';
  END IF;

  -- Ashwagandha
  IF (title_lower LIKE '%ashwa%' OR title_lower LIKE '%ashwagan%') AND title_lower LIKE '%pure%' THEN RETURN 'Ashwagandha Pure';
  ELSIF title_lower LIKE '%ashwa%' OR title_lower LIKE '%ashwagan%' THEN RETURN 'Ashwagandha';
  END IF;

  -- Reishi
  IF title_lower LIKE '%reishi%' AND title_lower LIKE '%pure%' THEN RETURN 'Reishi Pure';
  ELSIF title_lower LIKE '%reishi%' THEN RETURN 'Reishi';
  END IF;

  -- Chaga
  IF title_lower LIKE '%chaga%' AND title_lower LIKE '%pure%' THEN RETURN 'Chaga Pure';
  ELSIF title_lower LIKE '%chaga%' THEN RETURN 'Chaga';
  END IF;

  -- Cordyceps
  IF title_lower LIKE '%cordyceps%' AND title_lower LIKE '%pure%' THEN RETURN 'Cordyceps Pure';
  ELSIF title_lower LIKE '%cordyceps%' THEN RETURN 'Cordyceps';
  END IF;

  -- Other mushrooms
  IF title_lower LIKE '%tremella%' THEN RETURN 'Tremella'; END IF;
  IF title_lower LIKE '%maitake%' THEN RETURN 'Maitake'; END IF;
  IF title_lower LIKE '%shiitake%' THEN RETURN 'Shiitake'; END IF;
  IF title_lower LIKE '%turkey tail%' THEN RETURN 'Turkey Tail'; END IF;
  IF title_lower LIKE '%pearl%' THEN RETURN 'Pearl'; END IF;

  -- Immunity
  IF title_lower LIKE '%immun%' THEN RETURN 'Immunity'; END IF;

  -- Cans
  IF title_lower LIKE '%sparkling%' AND title_lower LIKE '%elixir%' THEN RETURN 'Cans'; END IF;

  -- Lattes
  IF title_lower LIKE '%cacao%' AND title_lower LIKE '%latte%' THEN RETURN 'Latte - Cacao Rose'; END IF;
  IF title_lower LIKE '%turmeric%' AND title_lower LIKE '%latte%' THEN RETURN 'Latte - Turmeric'; END IF;
  IF title_lower LIKE '%beet%' AND title_lower LIKE '%latte%' THEN RETURN 'Latte - Beet'; END IF;
  IF title_lower LIKE '%matcha%' AND title_lower LIKE '%latte%' THEN RETURN 'Latte - Matcha'; END IF;

  -- Japanese Matcha
  IF title_lower LIKE '%japanese matcha%' THEN RETURN 'Japanese Matcha'; END IF;

  -- Body blends
  IF title_lower LIKE '%body build%' THEN RETURN 'Body Build'; END IF;
  IF title_lower LIKE '%body repair%' THEN RETURN 'Body Repair'; END IF;

  -- Supplements
  IF title_lower LIKE '%siberian ginseng%' THEN RETURN 'Siberian Ginseng'; END IF;
  IF title_lower LIKE '%bee pollen%' THEN RETURN 'Bee Pollen'; END IF;
  IF title_lower LIKE '%fulvic%' THEN RETURN 'Fulvic Acid'; END IF;
  IF title_lower LIKE '%resveratrol%' THEN RETURN 'Resveratrol'; END IF;
  IF title_lower LIKE '%schizandra%' OR title_lower LIKE '%schisandra%' THEN RETURN 'Schizandra'; END IF;
  IF title_lower LIKE '%red pine%' OR title_lower LIKE '%pine needle%' THEN RETURN 'Red Pine Needle'; END IF;
  IF title_lower LIKE '%camu camu%' THEN RETURN 'Camu Camu'; END IF;
  IF title_lower LIKE '%spirulina%' THEN RETURN 'Spirulina'; END IF;
  IF title_lower LIKE '%stress less%' AND title_lower NOT LIKE '%bundle%' THEN RETURN 'Stress Less'; END IF;
  IF title_lower LIKE '%maca%' THEN RETURN 'Maca'; END IF;
  IF title_lower LIKE '%shilajit%' THEN RETURN 'Shilajit'; END IF;
  IF title_lower LIKE '%he shou wu%' OR title_lower LIKE '%fo-ti%' THEN RETURN 'He Shou Wu'; END IF;
  IF title_lower LIKE '%astragalus%' THEN RETURN 'Astragalus'; END IF;
  IF title_lower LIKE '%goji%' THEN RETURN 'Goji'; END IF;
  IF title_lower LIKE '%eucommia%' THEN RETURN 'Eucommia'; END IF;
  IF title_lower LIKE '%gynostemma%' THEN RETURN 'Gynostemma'; END IF;
  IF title_lower LIKE '%mucuna%' THEN RETURN 'Mucuna'; END IF;
  IF title_lower LIKE '%rhodiola%' THEN RETURN 'Rhodiola'; END IF;
  IF title_lower LIKE '%tocos%' THEN RETURN 'Tocos'; END IF;
  IF title_lower LIKE '%deer antler%' OR title_lower LIKE '%velvet antler%' THEN RETURN 'Deer Antler'; END IF;
  IF title_lower LIKE '%pine pollen%' THEN RETURN 'Pine Pollen'; END IF;
  IF title_lower LIKE '%beauty%' OR title_lower LIKE '%skin%' OR title_lower LIKE '%glow%' THEN RETURN 'Beauty'; END IF;

  RETURN 'Other';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Function to parse size in grams from variant title
CREATE OR REPLACE FUNCTION parse_size_grams(variant_title TEXT)
RETURNS INTEGER AS $$
DECLARE
  matches TEXT[];
BEGIN
  IF variant_title IS NULL THEN RETURN NULL; END IF;

  -- Match patterns like "100g", "100 g", "100G"
  matches := regexp_match(variant_title, '(\d+)\s*[gG]');
  IF matches IS NOT NULL THEN
    RETURN matches[1]::INTEGER;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Views
-- ============================================================================

-- 8. Customer reorder summary
CREATE OR REPLACE VIEW v_tlx_customer_reorder_summary AS
SELECT
  shopify_customer_id,
  customer_email,
  COUNT(*) as total_orders,
  MIN(processed_at) as first_order_date,
  MAX(processed_at) as last_order_date,
  SUM(total_price) as lifetime_value,
  AVG(total_price) as avg_order_value,
  AVG(days_since_previous_order) FILTER (WHERE customer_order_sequence > 1) as avg_days_between_orders
FROM tlx_shopify_orders
WHERE shopify_customer_id IS NOT NULL
  AND cancelled_at IS NULL
  AND financial_status = 'paid'
GROUP BY shopify_customer_id, customer_email;

-- 9. First-order customers who haven't reordered (anniversary candidates)
CREATE OR REPLACE VIEW v_tlx_first_order_no_reorder AS
SELECT
  o.shopify_customer_id,
  o.shopify_order_id,
  o.customer_email,
  o.customer_first_name,
  o.processed_at as first_order_date,
  o.total_price as first_order_value,
  CURRENT_DATE - o.processed_at::DATE as days_since_first_order,
  STRING_AGG(DISTINCT li.product_type, ', ') FILTER (WHERE li.product_type != 'Other') as products_purchased,
  MAX(li.product_size_grams) as largest_size_purchased,
  -- Get primary product (most expensive)
  (SELECT li2.product_type FROM tlx_shopify_line_items li2
   WHERE li2.order_id = o.id AND li2.product_type != 'Other'
   ORDER BY li2.price DESC LIMIT 1) as primary_product_type,
  (SELECT li2.product_size_grams FROM tlx_shopify_line_items li2
   WHERE li2.order_id = o.id AND li2.product_size_grams IS NOT NULL
   ORDER BY li2.price DESC LIMIT 1) as primary_product_size
FROM tlx_shopify_orders o
LEFT JOIN tlx_shopify_line_items li ON o.id = li.order_id
WHERE o.is_first_order = TRUE
  AND o.cancelled_at IS NULL
  AND o.financial_status = 'paid'
  AND o.customer_email IS NOT NULL
  -- No subsequent orders from this customer
  AND NOT EXISTS (
    SELECT 1 FROM tlx_shopify_orders o2
    WHERE o2.shopify_customer_id = o.shopify_customer_id
      AND o2.customer_order_sequence > 1
      AND o2.cancelled_at IS NULL
  )
GROUP BY o.id, o.shopify_customer_id, o.shopify_order_id, o.customer_email,
         o.customer_first_name, o.processed_at, o.total_price;

-- 10. Reorder timing by product type and size
CREATE OR REPLACE VIEW v_tlx_reorder_timing_analysis AS
WITH first_orders AS (
  SELECT
    o.shopify_customer_id,
    li.product_type,
    li.product_size_grams,
    o.processed_at as first_order_date
  FROM tlx_shopify_orders o
  JOIN tlx_shopify_line_items li ON o.id = li.order_id
  WHERE o.customer_order_sequence = 1
    AND o.cancelled_at IS NULL
    AND o.financial_status = 'paid'
    AND li.product_type IS NOT NULL
    AND li.product_type != 'Other'
),
second_orders AS (
  SELECT
    o.shopify_customer_id,
    o.processed_at as second_order_date
  FROM tlx_shopify_orders o
  WHERE o.customer_order_sequence = 2
    AND o.cancelled_at IS NULL
    AND o.financial_status = 'paid'
)
SELECT
  fo.product_type,
  fo.product_size_grams,
  COUNT(DISTINCT fo.shopify_customer_id) as sample_size,
  ROUND(AVG(EXTRACT(EPOCH FROM (so.second_order_date - fo.first_order_date)) / 86400))::INTEGER as avg_days_to_reorder,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (so.second_order_date - fo.first_order_date)) / 86400
  ))::INTEGER as median_days_to_reorder
FROM first_orders fo
JOIN second_orders so ON fo.shopify_customer_id = so.shopify_customer_id
WHERE so.second_order_date > fo.first_order_date
GROUP BY fo.product_type, fo.product_size_grams
HAVING COUNT(DISTINCT fo.shopify_customer_id) >= 5
ORDER BY sample_size DESC;

-- ============================================================================
-- RLS Policies (if needed)
-- ============================================================================

-- Enable RLS
ALTER TABLE tlx_shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_shopify_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_reorder_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_shopify_sync_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to tlx_shopify_orders"
  ON tlx_shopify_orders FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tlx_shopify_line_items"
  ON tlx_shopify_line_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tlx_reorder_timing"
  ON tlx_reorder_timing FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to tlx_shopify_sync_log"
  ON tlx_shopify_sync_log FOR ALL
  USING (auth.role() = 'service_role');
