-- ============================================================================
-- Unleashed Reference Tables
-- Created: 2025-12-07
-- Purpose: Add typed tables for reference data endpoints discovered via API
-- Note: AssemblyOrders and TaxRates endpoints not available (405 error)
-- ============================================================================

-- =============================================================================
-- COMPANIES (Company/tenant info)
-- Fields: 4 at 100% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  company_name TEXT NOT NULL,

  -- Settings
  base_currency_code TEXT,
  default_tax_rate DECIMAL(10,4) DEFAULT 0,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_companies_store ON ul_companies(store);

-- =============================================================================
-- CURRENCIES (Currency master)
-- Fields: 6 total, 3 at >90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  description TEXT,

  -- Exchange rates (optional)
  default_sell_rate DECIMAL(20,6),
  default_buy_rate DECIMAL(20,6),

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_currencies_store ON ul_currencies(store);
CREATE INDEX IF NOT EXISTS idx_ul_currencies_code ON ul_currencies(store, currency_code);

-- =============================================================================
-- PRODUCT GROUPS (Product categories)
-- Fields: 4 total, 3 at >90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  group_name TEXT NOT NULL,

  -- Parent group (for hierarchy)
  parent_group_guid TEXT,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_product_groups_store ON ul_product_groups(store);
CREATE INDEX IF NOT EXISTS idx_ul_product_groups_parent ON ul_product_groups(store, parent_group_guid);

-- =============================================================================
-- SELL PRICE TIERS (Wholesale/retail pricing tiers)
-- Fields: 2 at 100% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_sell_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  tier_name TEXT NOT NULL,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_sell_price_tiers_store ON ul_sell_price_tiers(store);

-- =============================================================================
-- PAYMENT TERMS (Payment conditions)
-- Fields: 5 at 99% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  terms_name TEXT NOT NULL,

  -- Terms details
  due_days INTEGER,
  due_next_month_after_days INTEGER,

  -- Status
  obsolete BOOLEAN DEFAULT false,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_payment_terms_store ON ul_payment_terms(store);

-- =============================================================================
-- UNITS OF MEASURE (UOM master)
-- Fields: 3 at 100% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Status
  obsolete BOOLEAN DEFAULT false,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_units_of_measure_store ON ul_units_of_measure(store);

-- =============================================================================
-- DELIVERY METHODS (Shipping methods)
-- Fields: 4 at 100% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_delivery_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Status
  obsolete BOOLEAN DEFAULT false,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_delivery_methods_store ON ul_delivery_methods(store);

-- =============================================================================
-- SALES ORDER GROUPS (Order groupings)
-- Note: Empty in discovery (0 records) but table needed for completeness
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_sales_order_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  group_name TEXT NOT NULL,

  -- Status
  obsolete BOOLEAN DEFAULT false,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_sales_order_groups_store ON ul_sales_order_groups(store);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE ul_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_sell_price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_delivery_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_sales_order_groups ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to ul_companies" ON ul_companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_currencies" ON ul_currencies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_product_groups" ON ul_product_groups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_sell_price_tiers" ON ul_sell_price_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_payment_terms" ON ul_payment_terms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_units_of_measure" ON ul_units_of_measure FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_delivery_methods" ON ul_delivery_methods FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_sales_order_groups" ON ul_sales_order_groups FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read access
CREATE POLICY "Authenticated read access to ul_companies" ON ul_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_currencies" ON ul_currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_product_groups" ON ul_product_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_sell_price_tiers" ON ul_sell_price_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_payment_terms" ON ul_payment_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_units_of_measure" ON ul_units_of_measure FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_delivery_methods" ON ul_delivery_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_sales_order_groups" ON ul_sales_order_groups FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE ul_companies IS 'Unleashed company/tenant information';
COMMENT ON TABLE ul_currencies IS 'Currency master data from Unleashed';
COMMENT ON TABLE ul_product_groups IS 'Product category hierarchy from Unleashed';
COMMENT ON TABLE ul_sell_price_tiers IS 'Wholesale/retail pricing tiers';
COMMENT ON TABLE ul_payment_terms IS 'Payment terms and conditions';
COMMENT ON TABLE ul_units_of_measure IS 'Unit of measure definitions';
COMMENT ON TABLE ul_delivery_methods IS 'Shipping/delivery method options';
COMMENT ON TABLE ul_sales_order_groups IS 'Order grouping categories';
