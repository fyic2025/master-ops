-- Shipping Platform Schema
-- Replaces Starshipit with direct AusPost and Sendle integration
-- Supports: BOO (BigCommerce), Teelixir (Shopify+Unleashed), Elevate (Shopify+Unleashed)

-- ============================================
-- CARRIER CONFIGURATIONS TABLE
-- Stores non-secret carrier settings per business
-- ============================================
CREATE TABLE IF NOT EXISTS carrier_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_code TEXT NOT NULL,  -- 'teelixir', 'boo', 'elevate'
  carrier TEXT NOT NULL,        -- 'auspost', 'sendle'

  -- Service configurations (JSON array)
  services JSONB NOT NULL DEFAULT '[]',

  -- Carrier-specific settings (JSON object)
  settings JSONB NOT NULL DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_code, carrier)
);

-- ============================================
-- SHIPPING ORDERS TABLE
-- Unified orders synced from all platforms
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_code TEXT NOT NULL,
  source TEXT NOT NULL,  -- 'shopify', 'bigcommerce', 'unleashed'
  source_order_id TEXT NOT NULL,
  source_order_number TEXT,

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  -- Shipping address
  ship_to_name TEXT,
  ship_to_company TEXT,
  ship_to_address1 TEXT NOT NULL,
  ship_to_address2 TEXT,
  ship_to_city TEXT NOT NULL,
  ship_to_state TEXT,
  ship_to_postcode TEXT NOT NULL,
  ship_to_country TEXT NOT NULL DEFAULT 'AU',

  -- Order details
  order_date TIMESTAMPTZ NOT NULL,
  total_weight_grams INTEGER,
  item_count INTEGER,
  order_total DECIMAL(10,2),
  currency TEXT DEFAULT 'AUD',

  -- Shipping status
  status TEXT DEFAULT 'pending',  -- pending, ready, printed, shipped, delivered, cancelled
  carrier TEXT,  -- 'auspost', 'sendle'
  service_code TEXT,
  service_name TEXT,
  tracking_number TEXT,
  label_url TEXT,
  label_data JSONB,  -- Store raw carrier response for label
  shipping_cost DECIMAL(10,2),
  shipped_at TIMESTAMPTZ,
  manifest_id UUID,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  -- Sync tracking
  source_data JSONB,  -- Store raw order data from source platform
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_code, source, source_order_id)
);

-- ============================================
-- SHIPPING ORDER ITEMS TABLE
-- Line items for each order (for SKUs on labels)
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shipping_orders(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  weight_grams INTEGER,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHIPPING MANIFESTS TABLE
-- End-of-day manifests for carrier pickup
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_code TEXT NOT NULL,
  carrier TEXT NOT NULL,  -- 'auspost', 'sendle'
  manifest_date DATE NOT NULL,
  manifest_number TEXT,  -- Carrier-provided manifest ID
  shipment_count INTEGER DEFAULT 0,
  total_weight_grams INTEGER,
  pdf_url TEXT,
  manifest_data JSONB,  -- Store raw carrier response
  status TEXT DEFAULT 'open',  -- open, closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  UNIQUE(business_code, carrier, manifest_date)
);

-- ============================================
-- SHIPPING TRACKING EVENTS TABLE
-- Track delivery status updates
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shipping_orders(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  location TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Carrier configurations
CREATE INDEX IF NOT EXISTS idx_carrier_config_business ON carrier_configurations(business_code);

-- Shipping orders
CREATE INDEX IF NOT EXISTS idx_shipping_orders_business ON shipping_orders(business_code);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_status ON shipping_orders(status);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_order_date ON shipping_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_source ON shipping_orders(source);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_carrier ON shipping_orders(carrier);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tracking ON shipping_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_manifest ON shipping_orders(manifest_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_business_status ON shipping_orders(business_code, status);

-- Order items
CREATE INDEX IF NOT EXISTS idx_shipping_order_items_order ON shipping_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_order_items_sku ON shipping_order_items(sku);

-- Manifests
CREATE INDEX IF NOT EXISTS idx_shipping_manifests_business ON shipping_manifests(business_code);
CREATE INDEX IF NOT EXISTS idx_shipping_manifests_date ON shipping_manifests(manifest_date DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_manifests_status ON shipping_manifests(status);

-- Tracking events
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_order ON shipping_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_number ON shipping_tracking_events(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_time ON shipping_tracking_events(event_time DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE carrier_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_tracking_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to carrier_configurations" ON carrier_configurations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to shipping_orders" ON shipping_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to shipping_order_items" ON shipping_order_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to shipping_manifests" ON shipping_manifests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to shipping_tracking_events" ON shipping_tracking_events
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can read
CREATE POLICY "Authenticated read carrier_configurations" ON carrier_configurations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read shipping_orders" ON shipping_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read shipping_order_items" ON shipping_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read shipping_manifests" ON shipping_manifests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read shipping_tracking_events" ON shipping_tracking_events
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_shipping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipping_orders_updated_at
  BEFORE UPDATE ON shipping_orders
  FOR EACH ROW EXECUTE FUNCTION update_shipping_updated_at();

CREATE TRIGGER carrier_configurations_updated_at
  BEFORE UPDATE ON carrier_configurations
  FOR EACH ROW EXECUTE FUNCTION update_shipping_updated_at();

-- ============================================
-- INSERT CARRIER CONFIGURATIONS
-- ============================================

-- Teelixir AusPost
INSERT INTO carrier_configurations (business_code, carrier, services, settings) VALUES (
  'teelixir',
  'auspost',
  '[
    {"code": "3J85", "name": "EXPRESS POST + SIGNATURE", "type": "domestic", "is_default": false},
    {"code": "3D85", "name": "PARCEL POST + SIGNATURE", "type": "domestic", "is_default": true},
    {"code": "PTI7", "name": "INTL STANDARD WITH SIGNATURE", "type": "international", "is_default": false},
    {"code": "PTI8", "name": "INTL STANDARD/PACK & TRACK", "type": "international", "is_default": true}
  ]'::jsonb,
  '{
    "authority_to_leave": false,
    "safe_drop": false,
    "display_skus_on_label": true,
    "email_tracking_notification": true,
    "label_format": "PDF_100x150",
    "manifest_at_end_of_day": true,
    "default_export_type": "sale_of_goods"
  }'::jsonb
) ON CONFLICT (business_code, carrier) DO UPDATE SET
  services = EXCLUDED.services,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- Teelixir Sendle
INSERT INTO carrier_configurations (business_code, carrier, services, settings) VALUES (
  'teelixir',
  'sendle',
  '[
    {"code": "STANDARD-PICKUP", "name": "Standard Pickup", "type": "domestic", "is_default": true},
    {"code": "STANDARD-PICKUP-UNLIMITED-SATCHEL", "name": "Standard Pickup Unlimited Satchel", "type": "domestic", "is_default": false},
    {"code": "STANDARD-DROPOFF", "name": "Standard Dropoff", "type": "domestic", "is_default": false},
    {"code": "STANDARD-DROPOFF-UNLIMITED-SATCHEL", "name": "Standard Dropoff Unlimited Satchel", "type": "domestic", "is_default": false},
    {"code": "EXPRESS-PICKUP", "name": "Express Pickup", "type": "domestic", "is_default": false}
  ]'::jsonb,
  '{
    "default_service": "STANDARD-PICKUP"
  }'::jsonb
) ON CONFLICT (business_code, carrier) DO UPDATE SET
  services = EXCLUDED.services,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- BOO AusPost
INSERT INTO carrier_configurations (business_code, carrier, services, settings) VALUES (
  'boo',
  'auspost',
  '[
    {"code": "3J85", "name": "EXPRESS POST + SIGNATURE", "type": "domestic", "is_default": false},
    {"code": "3D85", "name": "PARCEL POST + SIGNATURE", "type": "domestic", "is_default": true},
    {"code": "PTI7", "name": "INTL STANDARD WITH SIGNATURE", "type": "international", "is_default": false},
    {"code": "PTI8", "name": "INTL STANDARD/PACK & TRACK", "type": "international", "is_default": true},
    {"code": "ECD8", "name": "INTL EXPRESS DOCS/ECI DOCS", "type": "international", "is_default": false},
    {"code": "ECM8", "name": "INTL EXPRESS MERCH/ECI MERCH", "type": "international", "is_default": false}
  ]'::jsonb,
  '{
    "label_format": "PDF_100x150",
    "manifest_at_end_of_day": true
  }'::jsonb
) ON CONFLICT (business_code, carrier) DO UPDATE SET
  services = EXCLUDED.services,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- BOO Sendle
INSERT INTO carrier_configurations (business_code, carrier, services, settings) VALUES (
  'boo',
  'sendle',
  '[
    {"code": "STANDARD-PICKUP", "name": "Sendle", "type": "domestic", "is_default": true},
    {"code": "STANDARD-PICKUP-UNLIMITED-SATCHEL", "name": "Standard Pickup Unlimited Satchel", "type": "domestic", "is_default": false},
    {"code": "STANDARD-DROPOFF", "name": "Standard Dropoff", "type": "domestic", "is_default": false},
    {"code": "STANDARD-DROPOFF-UNLIMITED-SATCHEL", "name": "Standard Dropoff Unlimited Satchel", "type": "domestic", "is_default": false},
    {"code": "EXPRESS-PICKUP", "name": "Express Pickup", "type": "domestic", "is_default": false}
  ]'::jsonb,
  '{
    "default_service": "STANDARD-PICKUP"
  }'::jsonb
) ON CONFLICT (business_code, carrier) DO UPDATE SET
  services = EXCLUDED.services,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- Elevate AusPost (no Sendle)
INSERT INTO carrier_configurations (business_code, carrier, services, settings) VALUES (
  'elevate',
  'auspost',
  '[
    {"code": "3J85", "name": "EXPRESS POST + SIGNATURE", "type": "domestic", "is_default": false},
    {"code": "3D35", "name": "PARCEL POST + SIGNATURE", "type": "domestic", "is_default": true},
    {"code": "7C85", "name": "AP 0.5kg standard", "type": "domestic", "is_default": false},
    {"code": "PTI8", "name": "PACK & TRACK INTL 8", "type": "international", "is_default": true},
    {"code": "RPI8", "name": "REGISTERED POST INTL 8", "type": "international", "is_default": false},
    {"code": "ECM8", "name": "EXPRESS COURIER INTL MERCH 8Z", "type": "international", "is_default": false},
    {"code": "ECD8", "name": "EXPRESS COURIER INTL DOC 8", "type": "international", "is_default": false},
    {"code": "AIR8", "name": "INTERNATIONAL AIRMAIL 8Z", "type": "international", "is_default": false}
  ]'::jsonb,
  '{
    "label_format": "PDF_100x150",
    "manifest_at_end_of_day": true
  }'::jsonb
) ON CONFLICT (business_code, carrier) DO UPDATE SET
  services = EXCLUDED.services,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- Pending orders summary by business
CREATE OR REPLACE VIEW shipping_pending_summary AS
SELECT
  business_code,
  status,
  COUNT(*) as order_count,
  SUM(order_total) as total_value,
  MIN(order_date) as oldest_order
FROM shipping_orders
WHERE status IN ('pending', 'ready')
GROUP BY business_code, status;

-- Today's shipments by carrier
CREATE OR REPLACE VIEW shipping_today_summary AS
SELECT
  business_code,
  carrier,
  COUNT(*) as shipment_count,
  SUM(shipping_cost) as total_cost
FROM shipping_orders
WHERE shipped_at::date = CURRENT_DATE
GROUP BY business_code, carrier;
