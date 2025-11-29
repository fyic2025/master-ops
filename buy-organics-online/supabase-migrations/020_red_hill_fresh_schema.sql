-- ==============================================================================
-- RED HILL FRESH (RHF) - WOOCOMMERCE SCHEMA
-- ==============================================================================
-- Created: 2025-11-29
-- Purpose: Database schema for Red Hill Fresh WooCommerce delivery business
-- Location: BOO Supabase (shared multi-tenant database)
-- Business: Thu/Fri fresh produce delivery - Mornington Peninsula
-- ==============================================================================

-- All RHF tables use business='rhf' for multi-tenant isolation

-- ==============================================================================
-- WOOCOMMERCE PRODUCTS (RHF product catalog)
-- ==============================================================================

CREATE TABLE wc_products (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce identifiers
  wc_product_id INTEGER NOT NULL,
  sku VARCHAR(255),
  slug VARCHAR(255),
  permalink TEXT,

  -- Product details
  name TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'simple', -- simple, variable, grouped, external
  status VARCHAR(50) DEFAULT 'publish', -- publish, draft, pending, private
  description TEXT,
  short_description TEXT,

  -- Pricing
  price DECIMAL(10,2),
  regular_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  on_sale BOOLEAN DEFAULT FALSE,

  -- Inventory
  manage_stock BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0,
  stock_status VARCHAR(50) DEFAULT 'instock', -- instock, outofstock, onbackorder
  backorders_allowed BOOLEAN DEFAULT FALSE,
  low_stock_threshold INTEGER DEFAULT 5,

  -- Physical attributes
  weight DECIMAL(10,3),
  dimensions JSONB, -- {length, width, height}
  shipping_class VARCHAR(255),

  -- Categorization
  categories JSONB, -- Array of {id, name, slug}
  tags JSONB, -- Array of {id, name, slug}

  -- Images
  images JSONB, -- Array of {id, src, name, alt}
  featured_image_url TEXT,

  -- Fresh produce specific
  is_perishable BOOLEAN DEFAULT TRUE,
  shelf_life_days INTEGER,
  storage_instructions TEXT,
  origin VARCHAR(255), -- e.g., "Mornington Peninsula", "Local Farm"
  organic_certified BOOLEAN DEFAULT FALSE,

  -- Delivery constraints
  requires_refrigeration BOOLEAN DEFAULT FALSE,
  fragile BOOLEAN DEFAULT FALSE,
  max_per_order INTEGER, -- Limit quantity per order

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Raw WooCommerce data
  raw_data JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint per business
  CONSTRAINT wc_products_unique_per_business UNIQUE (business, wc_product_id)
);

-- Indexes for wc_products
CREATE INDEX idx_wc_products_business ON wc_products(business);
CREATE INDEX idx_wc_products_wc_product_id ON wc_products(wc_product_id);
CREATE INDEX idx_wc_products_sku ON wc_products(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_wc_products_status ON wc_products(status);
CREATE INDEX idx_wc_products_stock_status ON wc_products(stock_status);
CREATE INDEX idx_wc_products_is_active ON wc_products(is_active);
CREATE INDEX idx_wc_products_name_trgm ON wc_products USING gin(name gin_trgm_ops);

-- ==============================================================================
-- WOOCOMMERCE CUSTOMERS (RHF customer data)
-- ==============================================================================

CREATE TABLE wc_customers (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce identifiers
  wc_customer_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255),

  -- Personal details
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),

  -- Billing address
  billing_address JSONB, -- {first_name, last_name, company, address_1, address_2, city, state, postcode, country, email, phone}

  -- Shipping/Delivery address
  shipping_address JSONB, -- {first_name, last_name, company, address_1, address_2, city, state, postcode, country}

  -- Delivery preferences (RHF specific)
  preferred_delivery_day VARCHAR(20), -- 'thursday', 'friday'
  preferred_delivery_slot_id BIGINT, -- FK to rhf_delivery_slots
  delivery_notes TEXT, -- Special instructions
  delivery_zone_id BIGINT, -- FK to rhf_delivery_zones

  -- Location for routing
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  geocoded_at TIMESTAMP WITH TIME ZONE,

  -- Customer metrics
  orders_count INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  average_order_value DECIMAL(10,2),
  first_order_date TIMESTAMP WITH TIME ZONE,
  last_order_date TIMESTAMP WITH TIME ZONE,

  -- Subscription/Standing orders
  has_standing_order BOOLEAN DEFAULT FALSE,
  standing_order_details JSONB, -- Recurring order preferences

  -- Communication preferences
  sms_opt_in BOOLEAN DEFAULT FALSE,
  email_opt_in BOOLEAN DEFAULT TRUE,

  -- Raw WooCommerce data
  raw_data JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint per business
  CONSTRAINT wc_customers_unique_per_business UNIQUE (business, wc_customer_id),
  CONSTRAINT wc_customers_unique_email_per_business UNIQUE (business, email)
);

-- Indexes for wc_customers
CREATE INDEX idx_wc_customers_business ON wc_customers(business);
CREATE INDEX idx_wc_customers_wc_customer_id ON wc_customers(wc_customer_id);
CREATE INDEX idx_wc_customers_email ON wc_customers(email);
CREATE INDEX idx_wc_customers_delivery_zone ON wc_customers(delivery_zone_id);
CREATE INDEX idx_wc_customers_preferred_day ON wc_customers(preferred_delivery_day);
CREATE INDEX idx_wc_customers_last_order ON wc_customers(last_order_date DESC);
CREATE INDEX idx_wc_customers_location ON wc_customers(latitude, longitude) WHERE latitude IS NOT NULL;

-- ==============================================================================
-- WOOCOMMERCE ORDERS (RHF order history)
-- ==============================================================================

CREATE TABLE wc_orders (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce identifiers
  wc_order_id INTEGER NOT NULL,
  order_key VARCHAR(255),

  -- Customer
  customer_id BIGINT, -- FK to wc_customers
  wc_customer_id INTEGER,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Order status
  status VARCHAR(50) NOT NULL, -- pending, processing, on-hold, completed, cancelled, refunded, failed

  -- Financials
  currency VARCHAR(10) DEFAULT 'AUD',
  total DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  shipping_total DECIMAL(10,2),
  discount_total DECIMAL(10,2),

  -- Payment
  payment_method VARCHAR(100),
  payment_method_title VARCHAR(255),
  transaction_id VARCHAR(255),
  date_paid TIMESTAMP WITH TIME ZONE,

  -- Addresses
  billing_address JSONB,
  shipping_address JSONB,

  -- Items
  line_items JSONB, -- Array of order items
  items_count INTEGER,

  -- Delivery details (RHF specific)
  delivery_date DATE, -- Scheduled delivery date
  delivery_slot_id BIGINT, -- FK to rhf_delivery_slots
  delivery_zone_id BIGINT, -- FK to rhf_delivery_zones
  delivery_run_id BIGINT, -- FK to rhf_delivery_runs (assigned run)
  delivery_sequence INTEGER, -- Order in delivery route
  delivery_status VARCHAR(50), -- scheduled, out_for_delivery, delivered, failed, rescheduled
  delivery_notes TEXT, -- Customer delivery instructions

  -- Delivery tracking
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_photo_url TEXT, -- Proof of delivery
  delivery_signature JSONB, -- If signature captured
  driver_notes TEXT, -- Notes from driver

  -- Dates
  date_created TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  date_completed TIMESTAMP WITH TIME ZONE,

  -- Raw WooCommerce data
  raw_data JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint per business
  CONSTRAINT wc_orders_unique_per_business UNIQUE (business, wc_order_id)
);

-- Indexes for wc_orders
CREATE INDEX idx_wc_orders_business ON wc_orders(business);
CREATE INDEX idx_wc_orders_wc_order_id ON wc_orders(wc_order_id);
CREATE INDEX idx_wc_orders_customer_id ON wc_orders(customer_id);
CREATE INDEX idx_wc_orders_customer_email ON wc_orders(customer_email);
CREATE INDEX idx_wc_orders_status ON wc_orders(status);
CREATE INDEX idx_wc_orders_delivery_date ON wc_orders(delivery_date);
CREATE INDEX idx_wc_orders_delivery_status ON wc_orders(delivery_status);
CREATE INDEX idx_wc_orders_delivery_run ON wc_orders(delivery_run_id);
CREATE INDEX idx_wc_orders_date_created ON wc_orders(date_created DESC);

-- ==============================================================================
-- RHF DELIVERY ZONES (Geographic delivery areas)
-- ==============================================================================

CREATE TABLE rhf_delivery_zones (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Zone identification
  zone_code VARCHAR(50) NOT NULL, -- e.g., 'MP-NORTH', 'MP-SOUTH'
  zone_name VARCHAR(255) NOT NULL, -- e.g., 'Mornington Peninsula North'
  description TEXT,

  -- Geographic boundaries
  postcodes TEXT[], -- Array of postcodes in zone
  suburbs TEXT[], -- Array of suburb names
  boundary_geojson JSONB, -- GeoJSON polygon for zone boundary

  -- Delivery configuration
  delivery_days TEXT[] DEFAULT ARRAY['thursday', 'friday'], -- Days this zone gets delivery
  default_delivery_fee DECIMAL(10,2) DEFAULT 0,
  free_delivery_threshold DECIMAL(10,2), -- Order value for free delivery
  minimum_order_value DECIMAL(10,2), -- Min order to deliver

  -- Capacity
  max_orders_per_day INTEGER DEFAULT 50,
  max_orders_per_slot INTEGER DEFAULT 10,

  -- Routing
  depot_distance_km DECIMAL(10,2), -- Distance from depot
  estimated_drive_time_minutes INTEGER,
  route_priority INTEGER DEFAULT 1, -- For route optimization

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  temporarily_closed BOOLEAN DEFAULT FALSE,
  closed_reason TEXT,
  reopen_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique zone code per business
  CONSTRAINT rhf_delivery_zones_unique_code UNIQUE (business, zone_code)
);

-- Indexes for rhf_delivery_zones
CREATE INDEX idx_rhf_delivery_zones_business ON rhf_delivery_zones(business);
CREATE INDEX idx_rhf_delivery_zones_code ON rhf_delivery_zones(zone_code);
CREATE INDEX idx_rhf_delivery_zones_active ON rhf_delivery_zones(is_active);
CREATE INDEX idx_rhf_delivery_zones_postcodes ON rhf_delivery_zones USING gin(postcodes);

-- ==============================================================================
-- RHF DELIVERY SLOTS (Time windows for delivery)
-- ==============================================================================

CREATE TABLE rhf_delivery_slots (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Slot identification
  slot_code VARCHAR(50) NOT NULL, -- e.g., 'THU-AM', 'FRI-PM'
  slot_name VARCHAR(255) NOT NULL, -- e.g., 'Thursday Morning'

  -- Time window
  day_of_week INTEGER NOT NULL, -- 4=Thursday, 5=Friday (ISO)
  start_time TIME NOT NULL, -- e.g., '08:00'
  end_time TIME NOT NULL, -- e.g., '12:00'

  -- Pricing
  slot_fee DECIMAL(10,2) DEFAULT 0, -- Premium/discount for slot

  -- Capacity per zone
  default_capacity INTEGER DEFAULT 20, -- Max orders per slot

  -- Customer display
  display_name VARCHAR(255), -- e.g., '8am - 12pm'
  display_order INTEGER DEFAULT 1,

  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  available_zones BIGINT[], -- Array of zone IDs this slot serves (NULL = all)

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique slot code per business
  CONSTRAINT rhf_delivery_slots_unique_code UNIQUE (business, slot_code)
);

-- Indexes for rhf_delivery_slots
CREATE INDEX idx_rhf_delivery_slots_business ON rhf_delivery_slots(business);
CREATE INDEX idx_rhf_delivery_slots_day ON rhf_delivery_slots(day_of_week);
CREATE INDEX idx_rhf_delivery_slots_active ON rhf_delivery_slots(is_active);

-- ==============================================================================
-- RHF DELIVERY RUNS (Scheduled delivery batches)
-- ==============================================================================

CREATE TABLE rhf_delivery_runs (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Run identification
  run_code VARCHAR(50) NOT NULL, -- e.g., 'RHF-2025-11-28-AM'
  run_name VARCHAR(255),

  -- Schedule
  delivery_date DATE NOT NULL,
  slot_id BIGINT REFERENCES rhf_delivery_slots(id),
  zone_id BIGINT REFERENCES rhf_delivery_zones(id),

  -- Driver assignment
  driver_name VARCHAR(255),
  driver_phone VARCHAR(50),
  vehicle_id VARCHAR(50),

  -- Route details
  planned_route JSONB, -- Ordered array of stops with addresses
  route_distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,

  -- Status
  status VARCHAR(50) DEFAULT 'planned', -- planned, loading, in_progress, completed, cancelled
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Statistics
  orders_planned INTEGER DEFAULT 0,
  orders_delivered INTEGER DEFAULT 0,
  orders_failed INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,
  issues JSONB, -- Array of issues encountered

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique run code per business
  CONSTRAINT rhf_delivery_runs_unique_code UNIQUE (business, run_code)
);

-- Indexes for rhf_delivery_runs
CREATE INDEX idx_rhf_delivery_runs_business ON rhf_delivery_runs(business);
CREATE INDEX idx_rhf_delivery_runs_date ON rhf_delivery_runs(delivery_date);
CREATE INDEX idx_rhf_delivery_runs_status ON rhf_delivery_runs(status);
CREATE INDEX idx_rhf_delivery_runs_zone ON rhf_delivery_runs(zone_id);
CREATE INDEX idx_rhf_delivery_runs_slot ON rhf_delivery_runs(slot_id);

-- ==============================================================================
-- RHF SLOT AVAILABILITY (Daily capacity tracking)
-- ==============================================================================

CREATE TABLE rhf_slot_availability (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Date and slot
  delivery_date DATE NOT NULL,
  slot_id BIGINT NOT NULL REFERENCES rhf_delivery_slots(id),
  zone_id BIGINT NOT NULL REFERENCES rhf_delivery_zones(id),

  -- Capacity
  total_capacity INTEGER NOT NULL,
  orders_booked INTEGER DEFAULT 0,
  orders_available INTEGER GENERATED ALWAYS AS (total_capacity - orders_booked) STORED,

  -- Override
  is_blocked BOOLEAN DEFAULT FALSE, -- Manual block
  blocked_reason TEXT,
  capacity_override INTEGER, -- Override default capacity

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique per date/slot/zone
  CONSTRAINT rhf_slot_availability_unique UNIQUE (business, delivery_date, slot_id, zone_id)
);

-- Indexes for rhf_slot_availability
CREATE INDEX idx_rhf_slot_availability_date ON rhf_slot_availability(delivery_date);
CREATE INDEX idx_rhf_slot_availability_slot ON rhf_slot_availability(slot_id);
CREATE INDEX idx_rhf_slot_availability_zone ON rhf_slot_availability(zone_id);
CREATE INDEX idx_rhf_slot_availability_available ON rhf_slot_availability(orders_available) WHERE orders_available > 0;

-- ==============================================================================
-- RHF SYNC LOGS (WooCommerce sync tracking)
-- ==============================================================================

CREATE TABLE rhf_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Sync type
  sync_type VARCHAR(50) NOT NULL, -- 'products', 'orders', 'customers', 'inventory'

  -- Status
  status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed', 'partial'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Statistics
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Details
  error_message TEXT,
  error_details JSONB,
  summary JSONB,

  -- Trigger
  triggered_by VARCHAR(50), -- 'cron', 'manual', 'webhook'

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for rhf_sync_logs
CREATE INDEX idx_rhf_sync_logs_business ON rhf_sync_logs(business);
CREATE INDEX idx_rhf_sync_logs_type ON rhf_sync_logs(sync_type);
CREATE INDEX idx_rhf_sync_logs_status ON rhf_sync_logs(status);
CREATE INDEX idx_rhf_sync_logs_started ON rhf_sync_logs(started_at DESC);

-- ==============================================================================
-- TRIGGERS - Auto-update timestamps
-- ==============================================================================

CREATE TRIGGER update_wc_products_updated_at
  BEFORE UPDATE ON wc_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_customers_updated_at
  BEFORE UPDATE ON wc_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_orders_updated_at
  BEFORE UPDATE ON wc_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rhf_delivery_zones_updated_at
  BEFORE UPDATE ON rhf_delivery_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rhf_delivery_slots_updated_at
  BEFORE UPDATE ON rhf_delivery_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rhf_delivery_runs_updated_at
  BEFORE UPDATE ON rhf_delivery_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rhf_slot_availability_updated_at
  BEFORE UPDATE ON rhf_slot_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - Multi-tenant isolation
-- ==============================================================================

ALTER TABLE wc_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_delivery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_slot_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_sync_logs ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
CREATE POLICY "Service role full access to wc_products" ON wc_products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to wc_customers" ON wc_customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to wc_orders" ON wc_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to rhf_delivery_zones" ON rhf_delivery_zones
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to rhf_delivery_slots" ON rhf_delivery_slots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to rhf_delivery_runs" ON rhf_delivery_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to rhf_slot_availability" ON rhf_slot_availability
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to rhf_sync_logs" ON rhf_sync_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================================================================
-- DEFAULT DATA - Delivery Zones (Mornington Peninsula)
-- ==============================================================================

INSERT INTO rhf_delivery_zones (zone_code, zone_name, description, postcodes, suburbs, delivery_days, default_delivery_fee, free_delivery_threshold, minimum_order_value, max_orders_per_day, depot_distance_km, route_priority) VALUES
  ('MP-CENTRAL', 'Mornington Peninsula Central', 'Central peninsula including Mornington, Mt Eliza, Mt Martha',
   ARRAY['3931', '3930', '3934', '3933'],
   ARRAY['Mornington', 'Mount Eliza', 'Mount Martha', 'Moorooduc'],
   ARRAY['thursday', 'friday'], 0, 80, 40, 60, 10, 1),

  ('MP-SOUTH', 'Mornington Peninsula South', 'Southern peninsula including Rosebud, Dromana, Rye',
   ARRAY['3939', '3936', '3941', '3940', '3942'],
   ARRAY['Rosebud', 'Dromana', 'Rye', 'Tootgarook', 'Blairgowrie'],
   ARRAY['thursday', 'friday'], 5, 100, 50, 40, 25, 2),

  ('MP-NORTH', 'Mornington Peninsula North', 'Northern areas including Frankston, Langwarrin',
   ARRAY['3199', '3910', '3911', '3912'],
   ARRAY['Frankston', 'Frankston South', 'Langwarrin', 'Langwarrin South'],
   ARRAY['thursday'], 0, 80, 40, 50, 8, 1),

  ('RED-HILL', 'Red Hill & Surrounds', 'Red Hill, Main Ridge, Merricks - the heart of RHF',
   ARRAY['3937', '3928'],
   ARRAY['Red Hill', 'Red Hill South', 'Main Ridge', 'Merricks', 'Merricks North', 'Balnarring'],
   ARRAY['thursday', 'friday'], 0, 60, 30, 80, 5, 1);

-- ==============================================================================
-- DEFAULT DATA - Delivery Slots
-- ==============================================================================

INSERT INTO rhf_delivery_slots (slot_code, slot_name, day_of_week, start_time, end_time, display_name, display_order, default_capacity) VALUES
  ('THU-AM', 'Thursday Morning', 4, '08:00', '12:00', '8am - 12pm', 1, 30),
  ('THU-PM', 'Thursday Afternoon', 4, '12:00', '17:00', '12pm - 5pm', 2, 25),
  ('FRI-AM', 'Friday Morning', 5, '08:00', '12:00', '8am - 12pm', 3, 30),
  ('FRI-PM', 'Friday Afternoon', 5, '12:00', '17:00', '12pm - 5pm', 4, 25);

-- ==============================================================================
-- VIEWS - Useful reporting views
-- ==============================================================================

-- View: Today's/Tomorrow's deliveries
CREATE OR REPLACE VIEW v_rhf_upcoming_deliveries AS
SELECT
  o.id,
  o.wc_order_id,
  o.customer_email,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.phone AS customer_phone,
  o.total,
  o.delivery_date,
  s.display_name AS delivery_slot,
  z.zone_name AS delivery_zone,
  o.delivery_status,
  o.delivery_notes,
  o.shipping_address,
  r.run_code AS assigned_run,
  r.driver_name
FROM wc_orders o
LEFT JOIN wc_customers c ON c.id = o.customer_id
LEFT JOIN rhf_delivery_slots s ON s.id = o.delivery_slot_id
LEFT JOIN rhf_delivery_zones z ON z.id = o.delivery_zone_id
LEFT JOIN rhf_delivery_runs r ON r.id = o.delivery_run_id
WHERE o.business = 'rhf'
  AND o.delivery_date >= CURRENT_DATE
  AND o.status IN ('processing', 'on-hold')
ORDER BY o.delivery_date, s.display_order, o.delivery_sequence;

-- View: Slot availability for next 7 days
CREATE OR REPLACE VIEW v_rhf_slot_availability AS
SELECT
  sa.delivery_date,
  s.slot_name,
  s.display_name AS time_window,
  z.zone_name,
  sa.total_capacity,
  sa.orders_booked,
  sa.orders_available,
  sa.is_blocked,
  CASE
    WHEN sa.is_blocked THEN 'Blocked'
    WHEN sa.orders_available <= 0 THEN 'Full'
    WHEN sa.orders_available <= 5 THEN 'Limited'
    ELSE 'Available'
  END AS availability_status
FROM rhf_slot_availability sa
JOIN rhf_delivery_slots s ON s.id = sa.slot_id
JOIN rhf_delivery_zones z ON z.id = sa.zone_id
WHERE sa.business = 'rhf'
  AND sa.delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY sa.delivery_date, s.display_order, z.zone_name;

-- View: Customer delivery summary
CREATE OR REPLACE VIEW v_rhf_customer_summary AS
SELECT
  c.id,
  c.email,
  c.first_name || ' ' || c.last_name AS full_name,
  c.phone,
  z.zone_name AS delivery_zone,
  c.preferred_delivery_day,
  c.orders_count,
  c.total_spent,
  c.average_order_value,
  c.last_order_date,
  c.has_standing_order
FROM wc_customers c
LEFT JOIN rhf_delivery_zones z ON z.id = c.delivery_zone_id
WHERE c.business = 'rhf'
  AND c.is_active = TRUE
ORDER BY c.last_order_date DESC;

-- View: Delivery run summary
CREATE OR REPLACE VIEW v_rhf_run_summary AS
SELECT
  r.id,
  r.run_code,
  r.delivery_date,
  s.slot_name,
  z.zone_name,
  r.driver_name,
  r.status,
  r.orders_planned,
  r.orders_delivered,
  r.orders_failed,
  r.route_distance_km,
  r.estimated_duration_minutes,
  r.started_at,
  r.completed_at
FROM rhf_delivery_runs r
LEFT JOIN rhf_delivery_slots s ON s.id = r.slot_id
LEFT JOIN rhf_delivery_zones z ON z.id = r.zone_id
WHERE r.business = 'rhf'
ORDER BY r.delivery_date DESC, s.display_order;

-- ==============================================================================
-- FUNCTIONS - Utility functions
-- ==============================================================================

-- Function: Get available slots for a postcode on a date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_postcode TEXT,
  p_delivery_date DATE
)
RETURNS TABLE (
  slot_id BIGINT,
  slot_name VARCHAR,
  display_name VARCHAR,
  start_time TIME,
  end_time TIME,
  zone_id BIGINT,
  zone_name VARCHAR,
  slots_available INTEGER,
  delivery_fee DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS slot_id,
    s.slot_name,
    s.display_name,
    s.start_time,
    s.end_time,
    z.id AS zone_id,
    z.zone_name,
    COALESCE(sa.orders_available, s.default_capacity) AS slots_available,
    z.default_delivery_fee AS delivery_fee
  FROM rhf_delivery_zones z
  JOIN rhf_delivery_slots s ON s.is_active = TRUE
    AND (s.available_zones IS NULL OR z.id = ANY(s.available_zones))
  LEFT JOIN rhf_slot_availability sa ON sa.zone_id = z.id
    AND sa.slot_id = s.id
    AND sa.delivery_date = p_delivery_date
  WHERE z.business = 'rhf'
    AND z.is_active = TRUE
    AND NOT z.temporarily_closed
    AND p_postcode = ANY(z.postcodes)
    AND EXTRACT(DOW FROM p_delivery_date)::TEXT = ANY(
      CASE WHEN 'thursday' = ANY(z.delivery_days) AND EXTRACT(DOW FROM p_delivery_date) = 4 THEN ARRAY['4']
           WHEN 'friday' = ANY(z.delivery_days) AND EXTRACT(DOW FROM p_delivery_date) = 5 THEN ARRAY['5']
           ELSE ARRAY[]::TEXT[]
      END
    )
    AND (sa.is_blocked IS NULL OR sa.is_blocked = FALSE)
    AND (sa.orders_available IS NULL OR sa.orders_available > 0)
  ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql;

-- Function: Book a delivery slot
CREATE OR REPLACE FUNCTION book_delivery_slot(
  p_slot_id BIGINT,
  p_zone_id BIGINT,
  p_delivery_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_capacity INTEGER;
  v_booked INTEGER;
BEGIN
  -- Try to update existing availability record
  UPDATE rhf_slot_availability
  SET orders_booked = orders_booked + 1,
      updated_at = NOW()
  WHERE slot_id = p_slot_id
    AND zone_id = p_zone_id
    AND delivery_date = p_delivery_date
    AND NOT is_blocked
    AND orders_booked < total_capacity
  RETURNING orders_booked INTO v_booked;

  IF FOUND THEN
    RETURN TRUE;
  END IF;

  -- If no record exists, create one
  SELECT default_capacity INTO v_capacity FROM rhf_delivery_slots WHERE id = p_slot_id;

  INSERT INTO rhf_slot_availability (business, delivery_date, slot_id, zone_id, total_capacity, orders_booked)
  VALUES ('rhf', p_delivery_date, p_slot_id, p_zone_id, v_capacity, 1)
  ON CONFLICT (business, delivery_date, slot_id, zone_id) DO NOTHING;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- SCHEMA VERSION
-- ==============================================================================

INSERT INTO schema_version (version, description) VALUES
  ('2.0.0', 'Red Hill Fresh WooCommerce schema - delivery operations');

-- ==============================================================================
-- COMPLETION MESSAGE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Red Hill Fresh schema created successfully!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - wc_products (WooCommerce products)';
  RAISE NOTICE '  - wc_customers (Customer data + delivery prefs)';
  RAISE NOTICE '  - wc_orders (Orders with delivery tracking)';
  RAISE NOTICE '  - rhf_delivery_zones (Geographic zones)';
  RAISE NOTICE '  - rhf_delivery_slots (Time windows)';
  RAISE NOTICE '  - rhf_delivery_runs (Delivery batches)';
  RAISE NOTICE '  - rhf_slot_availability (Capacity tracking)';
  RAISE NOTICE '  - rhf_sync_logs (WooCommerce sync logs)';
  RAISE NOTICE '';
  RAISE NOTICE 'Default data inserted:';
  RAISE NOTICE '  - 4 delivery zones (Mornington Peninsula)';
  RAISE NOTICE '  - 4 delivery slots (Thu/Fri AM/PM)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run this migration against BOO Supabase';
  RAISE NOTICE '  2. Set up WooCommerce webhook for order sync';
  RAISE NOTICE '  3. Initial product sync from WooCommerce';
  RAISE NOTICE '  4. Configure n8n workflows for automation';
  RAISE NOTICE '==========================================';
END $$;
