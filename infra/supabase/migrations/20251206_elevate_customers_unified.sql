-- ============================================
-- ELEVATE UNIFIED CUSTOMERS TABLE
-- Single source of truth, deduplicated by email
-- ============================================
CREATE TABLE IF NOT EXISTS elevate_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary identifier (dedup key)
  email TEXT UNIQUE NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED,

  -- Customer details
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
  ) STORED,
  business_name TEXT,
  phone TEXT,

  -- Address
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',

  -- Integration IDs (for linking back to sources)
  shopify_customer_id TEXT,  -- e.g., "gid://shopify/Customer/123"
  unleashed_customer_code TEXT,
  unleashed_customer_guid TEXT,

  -- Shopify status
  shopify_state TEXT,  -- ENABLED, DISABLED, INVITED, etc.
  shopify_tags TEXT[],
  is_approved BOOLEAN DEFAULT false,  -- has 'approved' tag in Shopify

  -- Aggregated metrics (updated by sync job)
  total_orders INTEGER DEFAULT 0,
  total_spend DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,

  -- Brand breakdown (JSON for flexibility)
  brand_breakdown JSONB DEFAULT '{}',
  -- Format: {"Teelixir": {"amount": 1500.00, "order_count": 5}, "BOO": {...}}

  -- Source tracking
  primary_source TEXT DEFAULT 'shopify',  -- 'shopify' or 'unleashed'
  shopify_synced_at TIMESTAMPTZ,
  unleashed_synced_at TIMESTAMPTZ,
  metrics_calculated_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_elevate_customers_email_normalized ON elevate_customers(email_normalized);
CREATE INDEX IF NOT EXISTS idx_elevate_customers_shopify_id ON elevate_customers(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_elevate_customers_unleashed_code ON elevate_customers(unleashed_customer_code);
CREATE INDEX IF NOT EXISTS idx_elevate_customers_is_approved ON elevate_customers(is_approved);
CREATE INDEX IF NOT EXISTS idx_elevate_customers_last_order ON elevate_customers(last_order_date DESC);
CREATE INDEX IF NOT EXISTS idx_elevate_customers_total_spend ON elevate_customers(total_spend DESC);

-- ============================================
-- ELEVATE ORDERS TABLE
-- All orders from both Shopify and Unleashed
-- ============================================
CREATE TABLE IF NOT EXISTS elevate_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to unified customer
  customer_id UUID REFERENCES elevate_customers(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,  -- Denormalized for quick lookups

  -- Order identifiers
  source TEXT NOT NULL,  -- 'shopify' or 'unleashed'
  source_order_id TEXT NOT NULL,  -- Shopify GID or Unleashed GUID
  order_number TEXT NOT NULL,

  -- Order details
  order_date TIMESTAMPTZ NOT NULL,
  order_status TEXT,

  -- Financials
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_total DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'AUD',

  -- Line items (stored as JSON)
  line_items JSONB DEFAULT '[]',
  -- Format: [{"title": "Product", "vendor": "Brand", "quantity": 2, "price": "10.00", "total": "20.00"}]

  -- Audit
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per source order
  UNIQUE(source, source_order_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_elevate_orders_customer ON elevate_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_elevate_orders_email ON elevate_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_elevate_orders_date ON elevate_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_elevate_orders_source ON elevate_orders(source);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE elevate_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevate_orders ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access customers" ON elevate_customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access orders" ON elevate_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read access
CREATE POLICY "Authenticated read customers" ON elevate_customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read orders" ON elevate_orders
  FOR SELECT TO authenticated USING (true);

-- Anon read access (for dashboard)
CREATE POLICY "Anon read customers" ON elevate_customers
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon read orders" ON elevate_orders
  FOR SELECT TO anon USING (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_elevate_customers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_elevate_customers_timestamp ON elevate_customers;
CREATE TRIGGER update_elevate_customers_timestamp
  BEFORE UPDATE ON elevate_customers
  FOR EACH ROW EXECUTE FUNCTION update_elevate_customers_timestamp();
