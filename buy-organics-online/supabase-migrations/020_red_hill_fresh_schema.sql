-- ==============================================================================
-- RED HILL FRESH (RHF) - WOOCOMMERCE DATA IMPORT SCHEMA
-- ==============================================================================
-- Created: 2025-11-29
-- Purpose: Capture ALL WooCommerce data from Red Hill Fresh WordPress site
-- Approach: Data-first - import everything, optimize later
-- Location: BOO Supabase (shared multi-tenant database)
-- ==============================================================================

-- All RHF tables use business='rhf' for multi-tenant isolation
-- Every table includes raw_data JSONB to capture complete API responses

-- ==============================================================================
-- WOOCOMMERCE PRODUCTS - Complete product catalog
-- ==============================================================================

CREATE TABLE wc_products (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Core Identifiers
  wc_product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug VARCHAR(255),
  permalink TEXT,
  type VARCHAR(50), -- simple, grouped, external, variable
  status VARCHAR(50), -- draft, pending, private, publish
  featured BOOLEAN DEFAULT FALSE,
  catalog_visibility VARCHAR(50), -- visible, catalog, search, hidden

  -- Descriptions
  description TEXT,
  short_description TEXT,

  -- SKU & Identifiers
  sku VARCHAR(255),
  global_unique_id VARCHAR(255), -- GTIN, UPC, EAN, ISBN

  -- Pricing
  price DECIMAL(10,2),
  regular_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  price_html TEXT,
  on_sale BOOLEAN DEFAULT FALSE,
  date_on_sale_from TIMESTAMP WITH TIME ZONE,
  date_on_sale_from_gmt TIMESTAMP WITH TIME ZONE,
  date_on_sale_to TIMESTAMP WITH TIME ZONE,
  date_on_sale_to_gmt TIMESTAMP WITH TIME ZONE,

  -- Availability & Stock
  purchasable BOOLEAN DEFAULT TRUE,
  total_sales INTEGER DEFAULT 0,
  virtual BOOLEAN DEFAULT FALSE,
  downloadable BOOLEAN DEFAULT FALSE,
  manage_stock BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER,
  stock_status VARCHAR(50), -- instock, outofstock, onbackorder
  backorders VARCHAR(50), -- no, notify, yes
  backorders_allowed BOOLEAN DEFAULT FALSE,
  backordered BOOLEAN DEFAULT FALSE,
  sold_individually BOOLEAN DEFAULT FALSE,
  low_stock_amount INTEGER,

  -- Shipping & Dimensions
  weight VARCHAR(50),
  length VARCHAR(50),
  width VARCHAR(50),
  height VARCHAR(50),
  shipping_required BOOLEAN DEFAULT TRUE,
  shipping_taxable BOOLEAN DEFAULT TRUE,
  shipping_class VARCHAR(255),
  shipping_class_id INTEGER,

  -- Taxation
  tax_status VARCHAR(50), -- taxable, shipping, none
  tax_class VARCHAR(255),

  -- Downloads (for digital products)
  downloads JSONB, -- Array of {id, name, file}
  download_limit INTEGER DEFAULT -1,
  download_expiry INTEGER DEFAULT -1,

  -- External Products
  external_url TEXT,
  button_text VARCHAR(255),

  -- Reviews
  reviews_allowed BOOLEAN DEFAULT TRUE,
  average_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,

  -- Relations
  parent_id INTEGER, -- For variations
  related_ids JSONB, -- Array of product IDs
  upsell_ids JSONB, -- Array of product IDs
  cross_sell_ids JSONB, -- Array of product IDs
  grouped_products JSONB, -- Array of product IDs
  variations JSONB, -- Array of variation IDs

  -- Organization
  menu_order INTEGER DEFAULT 0,
  purchase_note TEXT,
  categories JSONB, -- Array of {id, name, slug}
  tags JSONB, -- Array of {id, name, slug}
  images JSONB, -- Array of {id, date_created, date_modified, src, name, alt}
  attributes JSONB, -- Array of {id, name, position, visible, variation, options}
  default_attributes JSONB, -- Array of {id, name, option}
  meta_data JSONB, -- Array of {id, key, value} - CRITICAL for custom fields

  -- WooCommerce Dates
  date_created TIMESTAMP WITH TIME ZONE,
  date_created_gmt TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  date_modified_gmt TIMESTAMP WITH TIME ZONE,

  -- Complete raw API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_products_unique_per_business UNIQUE (business, wc_product_id)
);

-- Indexes for wc_products
CREATE INDEX idx_wc_products_business ON wc_products(business);
CREATE INDEX idx_wc_products_wc_product_id ON wc_products(wc_product_id);
CREATE INDEX idx_wc_products_sku ON wc_products(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_wc_products_type ON wc_products(type);
CREATE INDEX idx_wc_products_status ON wc_products(status);
CREATE INDEX idx_wc_products_stock_status ON wc_products(stock_status);
CREATE INDEX idx_wc_products_parent ON wc_products(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_wc_products_name_trgm ON wc_products USING gin(name gin_trgm_ops);
CREATE INDEX idx_wc_products_meta_data ON wc_products USING gin(meta_data);
CREATE INDEX idx_wc_products_categories ON wc_products USING gin(categories);

-- ==============================================================================
-- WOOCOMMERCE CUSTOMERS - Complete customer data
-- ==============================================================================

CREATE TABLE wc_customers (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Core Identifiers
  wc_customer_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255),

  -- Personal Info
  first_name VARCHAR(255),
  last_name VARCHAR(255),

  -- Role & Status
  role VARCHAR(100),
  is_paying_customer BOOLEAN DEFAULT FALSE,

  -- Billing Address (complete)
  billing_first_name VARCHAR(255),
  billing_last_name VARCHAR(255),
  billing_company VARCHAR(255),
  billing_address_1 TEXT,
  billing_address_2 TEXT,
  billing_city VARCHAR(255),
  billing_state VARCHAR(100),
  billing_postcode VARCHAR(50),
  billing_country VARCHAR(10),
  billing_email VARCHAR(255),
  billing_phone VARCHAR(50),
  billing_address JSONB, -- Complete billing object

  -- Shipping Address (complete)
  shipping_first_name VARCHAR(255),
  shipping_last_name VARCHAR(255),
  shipping_company VARCHAR(255),
  shipping_address_1 TEXT,
  shipping_address_2 TEXT,
  shipping_city VARCHAR(255),
  shipping_state VARCHAR(100),
  shipping_postcode VARCHAR(50),
  shipping_country VARCHAR(10),
  shipping_address JSONB, -- Complete shipping object

  -- Avatar
  avatar_url TEXT,

  -- Meta data (custom fields from WooCommerce)
  meta_data JSONB, -- Array of {id, key, value}

  -- WooCommerce Dates
  date_created TIMESTAMP WITH TIME ZONE,
  date_created_gmt TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  date_modified_gmt TIMESTAMP WITH TIME ZONE,

  -- Complete raw API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_customers_unique_per_business UNIQUE (business, wc_customer_id)
);

-- Indexes for wc_customers
CREATE INDEX idx_wc_customers_business ON wc_customers(business);
CREATE INDEX idx_wc_customers_wc_customer_id ON wc_customers(wc_customer_id);
CREATE INDEX idx_wc_customers_email ON wc_customers(email);
CREATE INDEX idx_wc_customers_postcode ON wc_customers(shipping_postcode);
CREATE INDEX idx_wc_customers_city ON wc_customers(shipping_city);
CREATE INDEX idx_wc_customers_meta_data ON wc_customers USING gin(meta_data);

-- ==============================================================================
-- WOOCOMMERCE ORDERS - Complete order data
-- ==============================================================================

CREATE TABLE wc_orders (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Core Identifiers
  wc_order_id INTEGER NOT NULL,
  parent_id INTEGER,
  order_number VARCHAR(100), -- Display number
  order_key VARCHAR(255),
  created_via VARCHAR(100), -- checkout, admin, api, etc.
  version VARCHAR(50),
  status VARCHAR(50) NOT NULL, -- pending, processing, on-hold, completed, cancelled, refunded, failed, trash

  -- Currency & Pricing
  currency VARCHAR(10) DEFAULT 'AUD',
  currency_symbol VARCHAR(10),
  prices_include_tax BOOLEAN DEFAULT FALSE,

  -- Order Totals
  discount_total DECIMAL(10,2) DEFAULT 0,
  discount_tax DECIMAL(10,2) DEFAULT 0,
  shipping_total DECIMAL(10,2) DEFAULT 0,
  shipping_tax DECIMAL(10,2) DEFAULT 0,
  cart_tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2),
  total_tax DECIMAL(10,2) DEFAULT 0,

  -- Customer Info
  customer_id INTEGER, -- WC customer ID (0 for guest)
  customer_ip_address VARCHAR(50),
  customer_user_agent TEXT,
  customer_note TEXT,

  -- Billing Address (complete)
  billing_first_name VARCHAR(255),
  billing_last_name VARCHAR(255),
  billing_company VARCHAR(255),
  billing_address_1 TEXT,
  billing_address_2 TEXT,
  billing_city VARCHAR(255),
  billing_state VARCHAR(100),
  billing_postcode VARCHAR(50),
  billing_country VARCHAR(10),
  billing_email VARCHAR(255),
  billing_phone VARCHAR(50),
  billing_address JSONB, -- Complete billing object

  -- Shipping Address (complete)
  shipping_first_name VARCHAR(255),
  shipping_last_name VARCHAR(255),
  shipping_company VARCHAR(255),
  shipping_address_1 TEXT,
  shipping_address_2 TEXT,
  shipping_city VARCHAR(255),
  shipping_state VARCHAR(100),
  shipping_postcode VARCHAR(50),
  shipping_country VARCHAR(10),
  shipping_address JSONB, -- Complete shipping object

  -- Payment
  payment_method VARCHAR(100),
  payment_method_title VARCHAR(255),
  transaction_id VARCHAR(255),

  -- Order Items (stored as JSONB arrays)
  line_items JSONB, -- Array of line items
  tax_lines JSONB, -- Array of tax lines
  shipping_lines JSONB, -- Array of shipping lines
  fee_lines JSONB, -- Array of fee lines
  coupon_lines JSONB, -- Array of coupon lines
  refunds JSONB, -- Array of refunds

  -- Meta data (custom fields - may contain delivery info)
  meta_data JSONB, -- Array of {id, key, value}

  -- Cart Hash
  cart_hash VARCHAR(255),

  -- WooCommerce Dates
  date_created TIMESTAMP WITH TIME ZONE,
  date_created_gmt TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  date_modified_gmt TIMESTAMP WITH TIME ZONE,
  date_completed TIMESTAMP WITH TIME ZONE,
  date_completed_gmt TIMESTAMP WITH TIME ZONE,
  date_paid TIMESTAMP WITH TIME ZONE,
  date_paid_gmt TIMESTAMP WITH TIME ZONE,

  -- Complete raw API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_orders_unique_per_business UNIQUE (business, wc_order_id)
);

-- Indexes for wc_orders
CREATE INDEX idx_wc_orders_business ON wc_orders(business);
CREATE INDEX idx_wc_orders_wc_order_id ON wc_orders(wc_order_id);
CREATE INDEX idx_wc_orders_customer_id ON wc_orders(customer_id);
CREATE INDEX idx_wc_orders_status ON wc_orders(status);
CREATE INDEX idx_wc_orders_billing_email ON wc_orders(billing_email);
CREATE INDEX idx_wc_orders_billing_postcode ON wc_orders(billing_postcode);
CREATE INDEX idx_wc_orders_shipping_postcode ON wc_orders(shipping_postcode);
CREATE INDEX idx_wc_orders_date_created ON wc_orders(date_created DESC);
CREATE INDEX idx_wc_orders_date_completed ON wc_orders(date_completed);
CREATE INDEX idx_wc_orders_payment_method ON wc_orders(payment_method);
CREATE INDEX idx_wc_orders_meta_data ON wc_orders USING gin(meta_data);
CREATE INDEX idx_wc_orders_line_items ON wc_orders USING gin(line_items);
CREATE INDEX idx_wc_orders_shipping_lines ON wc_orders USING gin(shipping_lines);

-- ==============================================================================
-- WOOCOMMERCE ORDER LINE ITEMS - Normalized line items for analysis
-- ==============================================================================

CREATE TABLE wc_order_line_items (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Parent order reference
  order_id BIGINT NOT NULL REFERENCES wc_orders(id) ON DELETE CASCADE,
  wc_order_id INTEGER NOT NULL,

  -- WooCommerce Line Item Fields
  wc_line_item_id INTEGER,
  name TEXT,
  product_id INTEGER,
  variation_id INTEGER,
  quantity INTEGER,
  tax_class VARCHAR(100),
  subtotal DECIMAL(10,2),
  subtotal_tax DECIMAL(10,2),
  total DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  sku VARCHAR(255),
  price DECIMAL(10,2),

  -- Meta data on line item
  meta_data JSONB,

  -- Raw line item data
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for wc_order_line_items
CREATE INDEX idx_wc_order_line_items_business ON wc_order_line_items(business);
CREATE INDEX idx_wc_order_line_items_order_id ON wc_order_line_items(order_id);
CREATE INDEX idx_wc_order_line_items_product_id ON wc_order_line_items(product_id);
CREATE INDEX idx_wc_order_line_items_sku ON wc_order_line_items(sku);

-- ==============================================================================
-- WOOCOMMERCE PRODUCT CATEGORIES - Category hierarchy
-- ==============================================================================

CREATE TABLE wc_categories (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Category Fields
  wc_category_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  parent INTEGER DEFAULT 0,
  description TEXT,
  display VARCHAR(50), -- default, products, subcategories, both
  image JSONB, -- {id, src, name, alt}
  menu_order INTEGER DEFAULT 0,
  count INTEGER DEFAULT 0,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_categories_unique_per_business UNIQUE (business, wc_category_id)
);

-- Indexes for wc_categories
CREATE INDEX idx_wc_categories_business ON wc_categories(business);
CREATE INDEX idx_wc_categories_wc_category_id ON wc_categories(wc_category_id);
CREATE INDEX idx_wc_categories_parent ON wc_categories(parent);
CREATE INDEX idx_wc_categories_slug ON wc_categories(slug);

-- ==============================================================================
-- WOOCOMMERCE PRODUCT TAGS
-- ==============================================================================

CREATE TABLE wc_tags (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Tag Fields
  wc_tag_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  count INTEGER DEFAULT 0,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_tags_unique_per_business UNIQUE (business, wc_tag_id)
);

-- Indexes for wc_tags
CREATE INDEX idx_wc_tags_business ON wc_tags(business);
CREATE INDEX idx_wc_tags_wc_tag_id ON wc_tags(wc_tag_id);
CREATE INDEX idx_wc_tags_slug ON wc_tags(slug);

-- ==============================================================================
-- WOOCOMMERCE SHIPPING ZONES - From WooCommerce settings
-- ==============================================================================

CREATE TABLE wc_shipping_zones (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Shipping Zone Fields
  wc_zone_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  zone_order INTEGER DEFAULT 0,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_shipping_zones_unique_per_business UNIQUE (business, wc_zone_id)
);

-- Indexes for wc_shipping_zones
CREATE INDEX idx_wc_shipping_zones_business ON wc_shipping_zones(business);
CREATE INDEX idx_wc_shipping_zones_wc_zone_id ON wc_shipping_zones(wc_zone_id);

-- ==============================================================================
-- WOOCOMMERCE SHIPPING ZONE LOCATIONS - Postcodes/regions per zone
-- ==============================================================================

CREATE TABLE wc_shipping_zone_locations (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Parent zone reference
  zone_id BIGINT NOT NULL REFERENCES wc_shipping_zones(id) ON DELETE CASCADE,
  wc_zone_id INTEGER NOT NULL,

  -- WooCommerce Location Fields
  code VARCHAR(255) NOT NULL, -- Postcode, state code, or country code
  type VARCHAR(50) NOT NULL, -- postcode, state, country, continent

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for wc_shipping_zone_locations
CREATE INDEX idx_wc_shipping_zone_locations_business ON wc_shipping_zone_locations(business);
CREATE INDEX idx_wc_shipping_zone_locations_zone_id ON wc_shipping_zone_locations(zone_id);
CREATE INDEX idx_wc_shipping_zone_locations_code ON wc_shipping_zone_locations(code);
CREATE INDEX idx_wc_shipping_zone_locations_type ON wc_shipping_zone_locations(type);

-- ==============================================================================
-- WOOCOMMERCE SHIPPING ZONE METHODS - Shipping methods per zone
-- ==============================================================================

CREATE TABLE wc_shipping_zone_methods (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Parent zone reference
  zone_id BIGINT NOT NULL REFERENCES wc_shipping_zones(id) ON DELETE CASCADE,
  wc_zone_id INTEGER NOT NULL,

  -- WooCommerce Method Fields
  wc_instance_id INTEGER NOT NULL,
  method_id VARCHAR(100), -- flat_rate, free_shipping, local_pickup, etc.
  method_title VARCHAR(255),
  method_description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  method_order INTEGER DEFAULT 0,
  settings JSONB, -- All method settings (cost, min_amount, etc.)

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT wc_shipping_zone_methods_unique UNIQUE (business, wc_zone_id, wc_instance_id)
);

-- Indexes for wc_shipping_zone_methods
CREATE INDEX idx_wc_shipping_zone_methods_business ON wc_shipping_zone_methods(business);
CREATE INDEX idx_wc_shipping_zone_methods_zone_id ON wc_shipping_zone_methods(zone_id);
CREATE INDEX idx_wc_shipping_zone_methods_method_id ON wc_shipping_zone_methods(method_id);

-- ==============================================================================
-- WOOCOMMERCE COUPONS - Discount codes
-- ==============================================================================

CREATE TABLE wc_coupons (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Coupon Fields
  wc_coupon_id INTEGER NOT NULL,
  code VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2),
  discount_type VARCHAR(50), -- percent, fixed_cart, fixed_product
  description TEXT,

  -- Usage limits
  usage_count INTEGER DEFAULT 0,
  usage_limit INTEGER,
  usage_limit_per_user INTEGER,
  limit_usage_to_x_items INTEGER,

  -- Validity
  date_expires TIMESTAMP WITH TIME ZONE,
  date_expires_gmt TIMESTAMP WITH TIME ZONE,
  individual_use BOOLEAN DEFAULT FALSE,
  free_shipping BOOLEAN DEFAULT FALSE,
  exclude_sale_items BOOLEAN DEFAULT FALSE,

  -- Restrictions
  minimum_amount DECIMAL(10,2),
  maximum_amount DECIMAL(10,2),
  product_ids JSONB,
  excluded_product_ids JSONB,
  product_categories JSONB,
  excluded_product_categories JSONB,
  email_restrictions JSONB,
  used_by JSONB,

  -- Meta data
  meta_data JSONB,

  -- WooCommerce Dates
  date_created TIMESTAMP WITH TIME ZONE,
  date_created_gmt TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  date_modified_gmt TIMESTAMP WITH TIME ZONE,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_coupons_unique_per_business UNIQUE (business, wc_coupon_id)
);

-- Indexes for wc_coupons
CREATE INDEX idx_wc_coupons_business ON wc_coupons(business);
CREATE INDEX idx_wc_coupons_code ON wc_coupons(code);
CREATE INDEX idx_wc_coupons_discount_type ON wc_coupons(discount_type);

-- ==============================================================================
-- WOOCOMMERCE PAYMENT GATEWAYS - Available payment methods
-- ==============================================================================

CREATE TABLE wc_payment_gateways (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Payment Gateway Fields
  gateway_id VARCHAR(100) NOT NULL, -- bacs, cheque, cod, paypal, stripe, etc.
  title VARCHAR(255),
  description TEXT,
  method_title VARCHAR(255),
  method_description TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  order_num INTEGER,
  settings JSONB, -- All gateway settings

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_payment_gateways_unique_per_business UNIQUE (business, gateway_id)
);

-- Indexes for wc_payment_gateways
CREATE INDEX idx_wc_payment_gateways_business ON wc_payment_gateways(business);
CREATE INDEX idx_wc_payment_gateways_enabled ON wc_payment_gateways(enabled);

-- ==============================================================================
-- WOOCOMMERCE TAX RATES - Tax configuration
-- ==============================================================================

CREATE TABLE wc_tax_rates (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Tax Rate Fields
  wc_tax_rate_id INTEGER NOT NULL,
  country VARCHAR(10),
  state VARCHAR(100),
  postcode VARCHAR(100),
  city VARCHAR(255),
  postcodes JSONB, -- Array of postcodes
  cities JSONB, -- Array of cities
  rate DECIMAL(8,4),
  name VARCHAR(255),
  priority INTEGER DEFAULT 0,
  compound BOOLEAN DEFAULT FALSE,
  shipping BOOLEAN DEFAULT FALSE,
  tax_class VARCHAR(100),
  order_num INTEGER,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_tax_rates_unique_per_business UNIQUE (business, wc_tax_rate_id)
);

-- Indexes for wc_tax_rates
CREATE INDEX idx_wc_tax_rates_business ON wc_tax_rates(business);
CREATE INDEX idx_wc_tax_rates_country ON wc_tax_rates(country);
CREATE INDEX idx_wc_tax_rates_state ON wc_tax_rates(state);

-- ==============================================================================
-- WOOCOMMERCE ORDER NOTES - Notes on orders
-- ==============================================================================

CREATE TABLE wc_order_notes (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Parent order reference
  order_id BIGINT NOT NULL REFERENCES wc_orders(id) ON DELETE CASCADE,
  wc_order_id INTEGER NOT NULL,

  -- WooCommerce Note Fields
  wc_note_id INTEGER NOT NULL,
  author VARCHAR(255),
  note TEXT,
  customer_note BOOLEAN DEFAULT FALSE,
  added_by_user BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMP WITH TIME ZONE,
  date_created_gmt TIMESTAMP WITH TIME ZONE,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT wc_order_notes_unique UNIQUE (business, wc_order_id, wc_note_id)
);

-- Indexes for wc_order_notes
CREATE INDEX idx_wc_order_notes_business ON wc_order_notes(business);
CREATE INDEX idx_wc_order_notes_order_id ON wc_order_notes(order_id);
CREATE INDEX idx_wc_order_notes_customer_note ON wc_order_notes(customer_note);

-- ==============================================================================
-- WOOCOMMERCE PRODUCT VARIATIONS - Variable product children
-- ==============================================================================

CREATE TABLE wc_product_variations (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Parent product reference
  parent_product_id BIGINT REFERENCES wc_products(id) ON DELETE CASCADE,
  wc_parent_id INTEGER NOT NULL,

  -- WooCommerce Variation Fields
  wc_variation_id INTEGER NOT NULL,
  description TEXT,
  permalink TEXT,
  sku VARCHAR(255),

  -- Pricing
  price DECIMAL(10,2),
  regular_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  on_sale BOOLEAN DEFAULT FALSE,
  date_on_sale_from TIMESTAMP WITH TIME ZONE,
  date_on_sale_to TIMESTAMP WITH TIME ZONE,

  -- Stock
  status VARCHAR(50),
  purchasable BOOLEAN DEFAULT TRUE,
  virtual BOOLEAN DEFAULT FALSE,
  downloadable BOOLEAN DEFAULT FALSE,
  manage_stock BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER,
  stock_status VARCHAR(50),
  backorders VARCHAR(50),
  backorders_allowed BOOLEAN DEFAULT FALSE,
  backordered BOOLEAN DEFAULT FALSE,

  -- Shipping
  weight VARCHAR(50),
  length VARCHAR(50),
  width VARCHAR(50),
  height VARCHAR(50),
  shipping_class VARCHAR(255),
  shipping_class_id INTEGER,

  -- Taxation
  tax_status VARCHAR(50),
  tax_class VARCHAR(255),

  -- Downloads
  downloads JSONB,
  download_limit INTEGER,
  download_expiry INTEGER,

  -- Attributes
  attributes JSONB, -- Array of {id, name, option}
  image JSONB, -- Single image object
  meta_data JSONB,

  -- WooCommerce Dates
  date_created TIMESTAMP WITH TIME ZONE,
  date_created_gmt TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  date_modified_gmt TIMESTAMP WITH TIME ZONE,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_product_variations_unique UNIQUE (business, wc_variation_id)
);

-- Indexes for wc_product_variations
CREATE INDEX idx_wc_product_variations_business ON wc_product_variations(business);
CREATE INDEX idx_wc_product_variations_parent ON wc_product_variations(wc_parent_id);
CREATE INDEX idx_wc_product_variations_sku ON wc_product_variations(sku);
CREATE INDEX idx_wc_product_variations_stock_status ON wc_product_variations(stock_status);

-- ==============================================================================
-- WOOCOMMERCE PRODUCT ATTRIBUTES - Global product attributes
-- ==============================================================================

CREATE TABLE wc_product_attributes (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- WooCommerce Attribute Fields
  wc_attribute_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  type VARCHAR(50), -- select, text
  order_by VARCHAR(50), -- menu_order, name, name_num, id
  has_archives BOOLEAN DEFAULT FALSE,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT wc_product_attributes_unique UNIQUE (business, wc_attribute_id)
);

-- Indexes for wc_product_attributes
CREATE INDEX idx_wc_product_attributes_business ON wc_product_attributes(business);
CREATE INDEX idx_wc_product_attributes_slug ON wc_product_attributes(slug);

-- ==============================================================================
-- WOOCOMMERCE PRODUCT ATTRIBUTE TERMS - Values for attributes
-- ==============================================================================

CREATE TABLE wc_product_attribute_terms (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Parent attribute reference
  attribute_id BIGINT NOT NULL REFERENCES wc_product_attributes(id) ON DELETE CASCADE,
  wc_attribute_id INTEGER NOT NULL,

  -- WooCommerce Term Fields
  wc_term_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  menu_order INTEGER DEFAULT 0,
  count INTEGER DEFAULT 0,

  -- Raw API response
  raw_data JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT wc_product_attribute_terms_unique UNIQUE (business, wc_attribute_id, wc_term_id)
);

-- Indexes for wc_product_attribute_terms
CREATE INDEX idx_wc_product_attribute_terms_business ON wc_product_attribute_terms(business);
CREATE INDEX idx_wc_product_attribute_terms_attribute ON wc_product_attribute_terms(attribute_id);
CREATE INDEX idx_wc_product_attribute_terms_slug ON wc_product_attribute_terms(slug);

-- ==============================================================================
-- RHF SYNC LOGS - Track all WooCommerce sync operations
-- ==============================================================================

CREATE TABLE rhf_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  business TEXT NOT NULL DEFAULT 'rhf',

  -- Sync identification
  sync_type VARCHAR(50) NOT NULL, -- products, orders, customers, categories, tags, shipping_zones, etc.
  endpoint VARCHAR(255), -- API endpoint called

  -- Status
  status VARCHAR(50) NOT NULL, -- running, completed, failed, partial
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Statistics
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  total_pages INTEGER,

  -- API details
  api_calls_made INTEGER DEFAULT 0,
  rate_limit_remaining INTEGER,

  -- Details
  error_message TEXT,
  error_details JSONB,
  summary JSONB,

  -- Trigger info
  triggered_by VARCHAR(50), -- cron, manual, webhook, initial_sync

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for rhf_sync_logs
CREATE INDEX idx_rhf_sync_logs_business ON rhf_sync_logs(business);
CREATE INDEX idx_rhf_sync_logs_sync_type ON rhf_sync_logs(sync_type);
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

CREATE TRIGGER update_wc_categories_updated_at
  BEFORE UPDATE ON wc_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_tags_updated_at
  BEFORE UPDATE ON wc_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_shipping_zones_updated_at
  BEFORE UPDATE ON wc_shipping_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_shipping_zone_methods_updated_at
  BEFORE UPDATE ON wc_shipping_zone_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_coupons_updated_at
  BEFORE UPDATE ON wc_coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_payment_gateways_updated_at
  BEFORE UPDATE ON wc_payment_gateways
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_tax_rates_updated_at
  BEFORE UPDATE ON wc_tax_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_product_variations_updated_at
  BEFORE UPDATE ON wc_product_variations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wc_product_attributes_updated_at
  BEFORE UPDATE ON wc_product_attributes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - Multi-tenant isolation
-- ==============================================================================

ALTER TABLE wc_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_shipping_zone_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_shipping_zone_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_product_attribute_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rhf_sync_logs ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for backend operations)
CREATE POLICY "Service role full access" ON wc_products FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_customers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_order_line_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_categories FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_shipping_zones FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_shipping_zone_locations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_shipping_zone_methods FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_coupons FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_payment_gateways FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_tax_rates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_order_notes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_product_variations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_product_attributes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON wc_product_attribute_terms FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON rhf_sync_logs FOR ALL USING (auth.role() = 'service_role');

-- ==============================================================================
-- SCHEMA VERSION
-- ==============================================================================

INSERT INTO schema_version (version, description) VALUES
  ('2.0.0', 'Red Hill Fresh WooCommerce data import schema - captures all WC API data');

-- ==============================================================================
-- COMPLETION MESSAGE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Red Hill Fresh WooCommerce schema created!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Core Data Tables:';
  RAISE NOTICE '  - wc_products (all product fields + raw_data)';
  RAISE NOTICE '  - wc_customers (all customer fields + raw_data)';
  RAISE NOTICE '  - wc_orders (all order fields + raw_data)';
  RAISE NOTICE '  - wc_order_line_items (normalized line items)';
  RAISE NOTICE '  - wc_product_variations (variable product children)';
  RAISE NOTICE '';
  RAISE NOTICE 'Taxonomy Tables:';
  RAISE NOTICE '  - wc_categories (product categories)';
  RAISE NOTICE '  - wc_tags (product tags)';
  RAISE NOTICE '  - wc_product_attributes (global attributes)';
  RAISE NOTICE '  - wc_product_attribute_terms (attribute values)';
  RAISE NOTICE '';
  RAISE NOTICE 'Configuration Tables:';
  RAISE NOTICE '  - wc_shipping_zones (delivery zones from WC)';
  RAISE NOTICE '  - wc_shipping_zone_locations (postcodes/regions)';
  RAISE NOTICE '  - wc_shipping_zone_methods (shipping methods)';
  RAISE NOTICE '  - wc_coupons (discount codes)';
  RAISE NOTICE '  - wc_payment_gateways (payment methods)';
  RAISE NOTICE '  - wc_tax_rates (tax configuration)';
  RAISE NOTICE '';
  RAISE NOTICE 'Supporting Tables:';
  RAISE NOTICE '  - wc_order_notes (order notes/history)';
  RAISE NOTICE '  - rhf_sync_logs (sync operation tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'All tables include:';
  RAISE NOTICE '  - business field for multi-tenant isolation';
  RAISE NOTICE '  - raw_data JSONB for complete API responses';
  RAISE NOTICE '  - meta_data JSONB for custom WooCommerce fields';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run this migration against BOO Supabase';
  RAISE NOTICE '  2. Create WooCommerce API sync script';
  RAISE NOTICE '  3. Initial full data sync from WordPress';
  RAISE NOTICE '  4. Analyze data to understand delivery structure';
  RAISE NOTICE '==========================================';
END $$;
