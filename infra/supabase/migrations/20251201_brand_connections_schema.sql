-- =============================================================================
-- Brand Connections Application Schema
-- =============================================================================
-- Stores brand partner applications from brandconnections.com.au
-- Integrates with HubSpot for CRM sync
--
-- Tables:
--   brand_applications - Main application data
--   brand_application_products - Products submitted for price testing
-- =============================================================================

-- Drop existing tables if needed (for fresh install)
DROP TABLE IF EXISTS brand_application_products CASCADE;
DROP TABLE IF EXISTS brand_applications CASCADE;

-- =============================================================================
-- Main Applications Table
-- =============================================================================

CREATE TABLE brand_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact Details
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Brand Information
  brand_name TEXT NOT NULL,
  website TEXT,
  categories TEXT[] DEFAULT '{}',  -- Array of category slugs
  current_retailers INTEGER,       -- Approximate number

  -- Application Metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'onboarding')),
  source TEXT DEFAULT 'website',   -- How they found us
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Price Test Completion
  price_test_completed BOOLEAN DEFAULT FALSE,
  price_test_viable BOOLEAN,

  -- HubSpot Integration
  hubspot_contact_id TEXT,
  hubspot_deal_id TEXT,
  hubspot_synced_at TIMESTAMPTZ,

  -- Notes and Internal
  internal_notes TEXT,
  assigned_to TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Products Table (for Price Test)
-- =============================================================================

CREATE TABLE brand_application_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES brand_applications(id) ON DELETE CASCADE,

  -- Product Details
  product_name TEXT NOT NULL,
  rrp DECIMAL(10,2) NOT NULL,          -- Retail price
  rrp_includes_gst BOOLEAN DEFAULT TRUE,

  -- Calculated Pricing
  distributor_price DECIMAL(10,2),     -- What we would pay
  retailer_price DECIMAL(10,2),        -- What retailers would pay
  brand_margin DECIMAL(5,2),           -- Brand's margin %
  is_viable BOOLEAN,                   -- Meets minimum margin requirements

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Find applications by status
CREATE INDEX idx_brand_applications_status
  ON brand_applications(status, created_at DESC);

-- Find applications by email (for duplicates)
CREATE INDEX idx_brand_applications_email
  ON brand_applications(email);

-- Find applications by brand name
CREATE INDEX idx_brand_applications_brand
  ON brand_applications(brand_name);

-- HubSpot lookup
CREATE INDEX idx_brand_applications_hubspot
  ON brand_applications(hubspot_contact_id);

-- Products by application
CREATE INDEX idx_brand_products_application
  ON brand_application_products(application_id);

-- =============================================================================
-- Updated At Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_brand_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_application_updated_at_trigger
  BEFORE UPDATE ON brand_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_application_updated_at();

-- =============================================================================
-- Views
-- =============================================================================

-- Pending applications requiring review
CREATE OR REPLACE VIEW brand_applications_pending AS
SELECT
  id,
  brand_name,
  contact_name,
  email,
  website,
  categories,
  current_retailers,
  price_test_completed,
  price_test_viable,
  created_at
FROM brand_applications
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Applications with viable pricing
CREATE OR REPLACE VIEW brand_applications_viable AS
SELECT
  a.id,
  a.brand_name,
  a.contact_name,
  a.email,
  a.website,
  a.status,
  a.created_at,
  COUNT(p.id) as product_count,
  AVG(p.brand_margin) as avg_margin,
  SUM(CASE WHEN p.is_viable THEN 1 ELSE 0 END) as viable_products
FROM brand_applications a
LEFT JOIN brand_application_products p ON a.id = p.application_id
WHERE a.price_test_completed = TRUE
GROUP BY a.id
ORDER BY a.created_at DESC;

-- Daily application stats
CREATE OR REPLACE VIEW brand_applications_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_applications,
  SUM(CASE WHEN price_test_completed THEN 1 ELSE 0 END) as completed_price_test,
  SUM(CASE WHEN price_test_viable THEN 1 ELSE 0 END) as viable_applications,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
FROM brand_applications
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE brand_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_application_products ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY brand_applications_service_role ON brand_applications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY brand_products_service_role ON brand_application_products
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can read
CREATE POLICY brand_applications_read ON brand_applications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY brand_products_read ON brand_application_products
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- Grants
-- =============================================================================

GRANT ALL ON brand_applications TO service_role;
GRANT ALL ON brand_application_products TO service_role;
GRANT SELECT ON brand_applications TO authenticated;
GRANT SELECT ON brand_application_products TO authenticated;
GRANT SELECT ON brand_applications_pending TO service_role, authenticated;
GRANT SELECT ON brand_applications_viable TO service_role, authenticated;
GRANT SELECT ON brand_applications_stats TO service_role, authenticated;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE brand_applications IS 'Brand partner applications from brandconnections.com.au';
COMMENT ON TABLE brand_application_products IS 'Products submitted for price testing';
COMMENT ON COLUMN brand_applications.categories IS 'Array of category slugs: food-grocery, health-supplements, beauty-skincare, baby-kids, pet-care, cleaning-household';
COMMENT ON COLUMN brand_applications.price_test_viable IS 'TRUE if at least one product meets margin requirements';
