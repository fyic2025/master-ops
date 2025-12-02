-- ==============================================================================
-- BUY ORGANICS ONLINE - CRM DATABASE SCHEMA
-- ==============================================================================
-- Created: 2025-11-25
-- Purpose: Complete CRM structure for customer intelligence, retention & growth
-- Dependencies: Requires supabase-schema.sql to be applied first
--
-- This schema enables:
--   - Unified customer profiles from all sources
--   - Complete order history with product-level detail
--   - Customer interactions across all touchpoints
--   - Segmentation and tagging for personalization
--   - CLV, RFM, and predictive analytics
--   - Email engagement tracking
--   - Support ticket/live chat integration
--   - Marketing attribution tracking
-- ==============================================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- CUSTOMERS - Master Customer Profile Table
-- ==============================================================================
-- Single source of truth for all customer data
-- Links to: BigCommerce, Klaviyo, live chat, support systems

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External System IDs (for cross-referencing)
  bc_customer_id INTEGER UNIQUE,           -- BigCommerce customer ID
  klaviyo_profile_id VARCHAR(255),         -- Klaviyo profile ID
  hubspot_contact_id VARCHAR(255),         -- HubSpot contact ID
  zendesk_user_id VARCHAR(255),            -- Zendesk/support user ID
  intercom_user_id VARCHAR(255),           -- Intercom user ID

  -- Core Identity
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  phone VARCHAR(50),
  phone_verified BOOLEAN DEFAULT FALSE,

  -- Name
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  full_name VARCHAR(512) GENERATED ALWAYS AS (
    COALESCE(first_name, '') ||
    CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN ' ' ELSE '' END ||
    COALESCE(last_name, '')
  ) STORED,

  -- Company (for B2B customers)
  company_name VARCHAR(255),
  company_abn VARCHAR(50),
  is_wholesale_customer BOOLEAN DEFAULT FALSE,
  wholesale_discount_tier VARCHAR(50),

  -- Demographics
  date_of_birth DATE,
  gender VARCHAR(20),

  -- Source & Acquisition
  acquisition_source VARCHAR(100),         -- 'organic', 'google_ads', 'facebook', 'referral', etc.
  acquisition_campaign VARCHAR(255),       -- Specific campaign name
  acquisition_medium VARCHAR(100),         -- 'cpc', 'email', 'social', etc.
  first_seen_at TIMESTAMP WITH TIME ZONE,
  first_order_at TIMESTAMP WITH TIME ZONE,

  -- Communication Preferences
  email_marketing_consent BOOLEAN DEFAULT FALSE,
  email_consent_date TIMESTAMP WITH TIME ZONE,
  sms_marketing_consent BOOLEAN DEFAULT FALSE,
  sms_consent_date TIMESTAMP WITH TIME ZONE,
  preferred_contact_method VARCHAR(50) DEFAULT 'email',

  -- Customer Status
  status VARCHAR(50) DEFAULT 'active',     -- 'active', 'inactive', 'churned', 'blocked'
  is_guest BOOLEAN DEFAULT FALSE,
  account_created_at TIMESTAMP WITH TIME ZONE,

  -- Notes & Internal Info
  internal_notes TEXT,
  customer_notes TEXT,

  -- Flexible Properties (for custom fields)
  properties JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE,
  data_sources JSONB DEFAULT '[]'          -- Track which systems have contributed data
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_bc_customer_id ON customers(bc_customer_id) WHERE bc_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_klaviyo_id ON customers(klaviyo_profile_id) WHERE klaviyo_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_acquisition ON customers(acquisition_source, acquisition_campaign);
CREATE INDEX IF NOT EXISTS idx_customers_first_order ON customers(first_order_at DESC) WHERE first_order_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_last_activity ON customers(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING gin(full_name gin_trgm_ops);

-- ==============================================================================
-- CUSTOMER ADDRESSES
-- ==============================================================================
-- Multiple addresses per customer (shipping, billing, etc.)

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Address Type
  address_type VARCHAR(50) NOT NULL,       -- 'shipping', 'billing', 'both'
  is_default BOOLEAN DEFAULT FALSE,
  address_label VARCHAR(100),              -- 'Home', 'Work', 'Mum's place', etc.

  -- Contact at Address
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),

  -- Address Fields
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postcode VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'Australia',
  country_code VARCHAR(10) DEFAULT 'AU',

  -- Validation
  is_validated BOOLEAN DEFAULT FALSE,
  validation_date TIMESTAMP WITH TIME ZONE,
  validation_source VARCHAR(50),

  -- Delivery Notes
  delivery_instructions TEXT,
  authority_to_leave BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_addresses
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_type ON customer_addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_postcode ON customer_addresses(postcode);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_state ON customer_addresses(state);

-- ==============================================================================
-- ORDERS - Enhanced Order Table
-- ==============================================================================
-- Extends bc_orders with full CRM linking

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External IDs
  bc_order_id INTEGER UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),

  -- Order Status
  status VARCHAR(50) NOT NULL,             -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  payment_status VARCHAR(50),              -- 'pending', 'paid', 'partially_paid', 'refunded'
  fulfillment_status VARCHAR(50),          -- 'unfulfilled', 'partially_fulfilled', 'fulfilled'

  -- Financial
  subtotal DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  coupon_code VARCHAR(100),
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'AUD',

  -- Shipping
  shipping_method VARCHAR(100),
  shipping_carrier VARCHAR(100),
  tracking_number VARCHAR(255),
  shipping_address_id UUID REFERENCES customer_addresses(id),
  billing_address_id UUID REFERENCES customer_addresses(id),

  -- Shipping Address (denormalized for historical accuracy)
  shipping_address JSONB,
  billing_address JSONB,

  -- Order Details
  items_count INTEGER DEFAULT 0,
  items_quantity INTEGER DEFAULT 0,

  -- Source & Attribution
  order_source VARCHAR(100),               -- 'web', 'phone', 'in_store', 'marketplace'
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  referrer_url TEXT,
  landing_page_url TEXT,

  -- Customer Info at Order Time (for guests)
  customer_email VARCHAR(255),
  customer_first_name VARCHAR(255),
  customer_last_name VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Important Dates
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  shipped_date TIMESTAMP WITH TIME ZONE,
  delivered_date TIMESTAMP WITH TIME ZONE,
  cancelled_date TIMESTAMP WITH TIME ZONE,

  -- Staff & Notes
  staff_notes TEXT,
  customer_notes TEXT,

  -- Raw Data
  raw_data JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_bc_order_id ON orders(bc_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_attribution ON orders(utm_source, utm_medium, utm_campaign);

-- ==============================================================================
-- ORDER ITEMS - Individual line items per order
-- ==============================================================================
-- Proper structure instead of JSONB blob

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product Reference
  bc_product_id INTEGER,                   -- Links to bc_products
  bc_variant_id INTEGER,
  sku VARCHAR(255),

  -- Product Details (denormalized at time of purchase)
  name TEXT NOT NULL,
  brand VARCHAR(255),
  category VARCHAR(255),

  -- Pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),               -- For margin calculation
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,

  -- Product Options (size, flavor, etc.)
  options JSONB DEFAULT '[]',

  -- Fulfillment
  fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
  quantity_shipped INTEGER DEFAULT 0,
  quantity_refunded INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_bc_product ON order_items(bc_product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sku ON order_items(sku);
CREATE INDEX IF NOT EXISTS idx_order_items_brand ON order_items(brand);

-- ==============================================================================
-- CUSTOMER INTERACTIONS - Activity/Event Log
-- ==============================================================================
-- Tracks all customer touchpoints for complete history

CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Interaction Type
  interaction_type VARCHAR(100) NOT NULL,  -- Categories below
  interaction_subtype VARCHAR(100),

  -- Reference to Related Objects
  order_id UUID REFERENCES orders(id),
  support_ticket_id UUID,                  -- Will link to support_tickets
  email_campaign_id VARCHAR(255),
  product_id INTEGER,                      -- BC product ID

  -- Interaction Details
  channel VARCHAR(50) NOT NULL,            -- 'email', 'web', 'phone', 'chat', 'sms', 'social'
  direction VARCHAR(20),                   -- 'inbound', 'outbound', 'internal'

  -- Content
  subject VARCHAR(500),
  summary TEXT,
  content TEXT,

  -- Metadata
  properties JSONB DEFAULT '{}',
  source_system VARCHAR(50),               -- 'bigcommerce', 'klaviyo', 'zendesk', 'intercom', 'manual'
  external_id VARCHAR(255),                -- ID in source system

  -- Timestamps
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interaction Type Categories:
-- ORDERS: order_placed, order_updated, order_shipped, order_delivered, order_cancelled, order_refunded
-- EMAIL: email_sent, email_opened, email_clicked, email_bounced, email_unsubscribed
-- WEB: page_view, product_view, cart_add, cart_abandon, checkout_start, search
-- SUPPORT: ticket_created, ticket_replied, ticket_resolved, chat_started, chat_ended
-- ACCOUNT: account_created, login, password_reset, profile_updated, address_added
-- REVIEW: review_submitted, review_requested
-- SMS: sms_sent, sms_received
-- PHONE: call_inbound, call_outbound

-- Indexes for customer_interactions
CREATE INDEX IF NOT EXISTS idx_interactions_customer ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON customer_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_occurred ON customer_interactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_channel ON customer_interactions(channel);
CREATE INDEX IF NOT EXISTS idx_interactions_order ON customer_interactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_source ON customer_interactions(source_system, external_id);

-- ==============================================================================
-- CUSTOMER SEGMENTS - Dynamic & Static Groupings
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Segment Definition
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,

  -- Segment Type
  segment_type VARCHAR(50) NOT NULL,       -- 'static', 'dynamic', 'predictive'

  -- Dynamic Segment Criteria (if segment_type = 'dynamic')
  criteria JSONB,                          -- Rules for automatic membership

  -- Segment Purpose
  category VARCHAR(100),                   -- 'lifecycle', 'value', 'behavior', 'demographic', 'custom'

  -- Automation
  sync_to_klaviyo BOOLEAN DEFAULT FALSE,
  klaviyo_list_id VARCHAR(255),
  sync_to_hubspot BOOLEAN DEFAULT FALSE,
  hubspot_list_id VARCHAR(255),

  -- Stats (denormalized for quick access)
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example Segments:
-- Lifecycle: new_customer, repeat_customer, vip, at_risk, churned, reactivated
-- Value: high_value, medium_value, low_value, whale
-- Behavior: frequent_buyer, bulk_buyer, discount_hunter, browser_no_buy
-- Product: organic_lover, supplement_buyer, skincare_enthusiast

CREATE INDEX IF NOT EXISTS idx_segments_slug ON customer_segments(slug);
CREATE INDEX IF NOT EXISTS idx_segments_type ON customer_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_segments_category ON customer_segments(category);

-- ==============================================================================
-- CUSTOMER SEGMENT MEMBERSHIPS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customer_segment_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,

  -- Membership Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Dynamic Segment Score (for predictive segments)
  score DECIMAL(5,4),                      -- 0.0000 to 1.0000

  -- Membership Timeline
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,

  -- Source
  added_by VARCHAR(50),                    -- 'system', 'manual', 'import'
  reason TEXT,

  UNIQUE(customer_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_members_customer ON customer_segment_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_segment ON customer_segment_memberships(segment_id) WHERE is_active = TRUE;

-- ==============================================================================
-- CUSTOMER TAGS - Flexible Labels
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7),                        -- Hex color for UI
  description TEXT,

  -- Tag Category
  category VARCHAR(50),                    -- 'behavior', 'interest', 'source', 'custom'

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,

  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by VARCHAR(50),                 -- 'system', 'manual', 'import'

  UNIQUE(customer_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_assignments_customer ON customer_tag_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_tag ON customer_tag_assignments(tag_id);

-- ==============================================================================
-- CUSTOMER METRICS - Calculated Analytics
-- ==============================================================================
-- Pre-calculated metrics for fast querying

CREATE TABLE IF NOT EXISTS customer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Order Metrics
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_items_purchased INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  largest_order_value DECIMAL(10,2) DEFAULT 0,

  -- Profitability (if cost data available)
  total_cost DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  profit_margin_percent DECIMAL(5,2) DEFAULT 0,

  -- Order Frequency
  days_since_first_order INTEGER,
  days_since_last_order INTEGER,
  average_days_between_orders DECIMAL(10,2),

  -- RFM Scores (1-5 scale)
  rfm_recency_score INTEGER,               -- 5 = most recent
  rfm_frequency_score INTEGER,             -- 5 = most frequent
  rfm_monetary_score INTEGER,              -- 5 = highest spend
  rfm_combined_score INTEGER,              -- Sum of R+F+M
  rfm_segment VARCHAR(50),                 -- 'champion', 'loyal', 'at_risk', etc.

  -- Customer Lifetime Value
  clv_historical DECIMAL(12,2) DEFAULT 0,  -- Actual lifetime spend
  clv_predicted DECIMAL(12,2),             -- ML-predicted future value
  clv_segment VARCHAR(50),                 -- 'high', 'medium', 'low'

  -- Churn Risk
  churn_risk_score DECIMAL(5,4),           -- 0.0000 to 1.0000
  churn_risk_segment VARCHAR(50),          -- 'safe', 'monitor', 'at_risk', 'critical'
  predicted_next_order_date DATE,

  -- Product Preferences
  favorite_categories JSONB DEFAULT '[]',
  favorite_brands JSONB DEFAULT '[]',
  favorite_products JSONB DEFAULT '[]',

  -- Email Engagement
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  email_open_rate DECIMAL(5,4) DEFAULT 0,
  email_click_rate DECIMAL(5,4) DEFAULT 0,
  last_email_opened_at TIMESTAMP WITH TIME ZONE,

  -- Support Metrics
  total_support_tickets INTEGER DEFAULT 0,
  open_support_tickets INTEGER DEFAULT 0,
  average_satisfaction_score DECIMAL(3,2),

  -- Calculation Metadata
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_customer_metrics_customer ON customer_metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_clv ON customer_metrics(clv_historical DESC);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_rfm ON customer_metrics(rfm_combined_score DESC);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_churn ON customer_metrics(churn_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_last_order ON customer_metrics(days_since_last_order);

-- ==============================================================================
-- EMAIL ENGAGEMENT TRACKING
-- ==============================================================================
-- Detailed email interaction history from Klaviyo

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External IDs
  klaviyo_campaign_id VARCHAR(255) UNIQUE,
  klaviyo_flow_id VARCHAR(255),

  -- Campaign Info
  name VARCHAR(500) NOT NULL,
  subject VARCHAR(500),
  campaign_type VARCHAR(50),               -- 'campaign', 'flow', 'automation'

  -- Timing
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Stats
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,

  -- Event Info
  event_type VARCHAR(50) NOT NULL,         -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'marked_spam'
  email_address VARCHAR(255) NOT NULL,

  -- Click Details (if event_type = 'clicked')
  clicked_url TEXT,

  -- External Reference
  klaviyo_event_id VARCHAR(255),

  -- Timing
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_customer ON email_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_occurred ON email_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email_address);

-- ==============================================================================
-- SUPPORT TICKETS - For Future Live Chat/Helpdesk Integration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- External IDs
  external_ticket_id VARCHAR(255),
  external_system VARCHAR(50),             -- 'zendesk', 'intercom', 'crisp', 'freshdesk'

  -- Ticket Info
  subject VARCHAR(500) NOT NULL,
  description TEXT,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'open',  -- 'open', 'pending', 'on_hold', 'solved', 'closed'
  priority VARCHAR(20) DEFAULT 'normal',       -- 'low', 'normal', 'high', 'urgent'

  -- Classification
  category VARCHAR(100),                   -- 'order', 'product', 'shipping', 'return', 'general'
  subcategory VARCHAR(100),
  tags JSONB DEFAULT '[]',

  -- Related Objects
  order_id UUID REFERENCES orders(id),

  -- Assignment
  assigned_to VARCHAR(255),
  assigned_group VARCHAR(255),

  -- Satisfaction
  satisfaction_rating INTEGER,             -- 1-5 stars
  satisfaction_comment TEXT,

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  -- Message Type
  message_type VARCHAR(50) NOT NULL,       -- 'customer', 'agent', 'system', 'internal_note'

  -- Content
  body TEXT NOT NULL,
  body_html TEXT,

  -- Sender
  sender_type VARCHAR(50),                 -- 'customer', 'agent', 'bot'
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),

  -- Attachments
  attachments JSONB DEFAULT '[]',

  -- Timing
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

-- ==============================================================================
-- MARKETING ATTRIBUTION
-- ==============================================================================
-- Track campaign performance and customer acquisition

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign Identity
  name VARCHAR(255) NOT NULL,
  external_id VARCHAR(255),                -- Google Ads ID, Facebook Campaign ID, etc.

  -- Platform
  platform VARCHAR(100) NOT NULL,          -- 'google_ads', 'facebook', 'instagram', 'email', 'organic', 'referral'
  campaign_type VARCHAR(100),              -- 'search', 'display', 'shopping', 'social', 'email', 'retargeting'

  -- UTM Parameters
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- Costs
  total_spend DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'AUD',

  -- Timing
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id),
  order_id UUID REFERENCES orders(id),

  -- Attribution Model
  attribution_model VARCHAR(50) NOT NULL,  -- 'first_touch', 'last_touch', 'linear', 'time_decay'
  attribution_weight DECIMAL(5,4) DEFAULT 1.0000,  -- For multi-touch attribution

  -- Touchpoint Info
  touchpoint_type VARCHAR(50),             -- 'impression', 'click', 'conversion'
  touchpoint_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- UTM Data (snapshot)
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),

  -- Revenue Attribution
  attributed_revenue DECIMAL(10,2),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_platform ON marketing_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_active ON marketing_campaigns(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_attribution_customer ON customer_attribution(customer_id);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON customer_attribution(campaign_id);
CREATE INDEX IF NOT EXISTS idx_attribution_order ON customer_attribution(order_id);

-- ==============================================================================
-- PRODUCT REVIEWS (for future use)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Product Reference
  bc_product_id INTEGER NOT NULL,
  order_id UUID REFERENCES orders(id),

  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',    -- 'pending', 'approved', 'rejected'
  is_verified_purchase BOOLEAN DEFAULT FALSE,

  -- Helpfulness
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,

  -- External
  external_review_id VARCHAR(255),
  external_platform VARCHAR(50),           -- 'yotpo', 'judge_me', 'stamped', 'bigcommerce'

  -- Timing
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_customer ON product_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(bc_product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON product_reviews(rating);

-- ==============================================================================
-- WISHLIST / SAVED PRODUCTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customer_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bc_product_id INTEGER NOT NULL,

  -- Price Tracking
  price_when_added DECIMAL(10,2),
  current_price DECIMAL(10,2),
  price_drop_notified BOOLEAN DEFAULT FALSE,

  -- Timing
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(customer_id, bc_product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON customer_wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON customer_wishlists(bc_product_id);

-- ==============================================================================
-- VIEWS - Customer Intelligence Dashboards
-- ==============================================================================

-- View: Customer 360 - Complete customer profile with metrics
CREATE OR REPLACE VIEW v_customer_360 AS
SELECT
  c.id,
  c.email,
  c.full_name,
  c.phone,
  c.company_name,
  c.status,
  c.is_wholesale_customer,
  c.acquisition_source,
  c.first_order_at,
  c.email_marketing_consent,
  c.last_activity_at,

  -- Metrics
  m.total_orders,
  m.total_revenue,
  m.average_order_value,
  m.days_since_last_order,
  m.rfm_segment,
  m.clv_historical,
  m.clv_predicted,
  m.churn_risk_segment,
  m.churn_risk_score,
  m.email_open_rate,

  -- Preferences
  m.favorite_categories,
  m.favorite_brands,

  -- Support
  m.total_support_tickets,
  m.open_support_tickets

FROM customers c
LEFT JOIN customer_metrics m ON m.customer_id = c.id;

-- View: High Value Customers (Champions)
CREATE OR REPLACE VIEW v_high_value_customers AS
SELECT
  c.id,
  c.email,
  c.full_name,
  c.phone,
  m.total_orders,
  m.total_revenue,
  m.average_order_value,
  m.clv_historical,
  m.rfm_combined_score,
  m.rfm_segment,
  m.days_since_last_order
FROM customers c
JOIN customer_metrics m ON m.customer_id = c.id
WHERE m.rfm_combined_score >= 12  -- Top tier
   OR m.clv_historical >= 1000
ORDER BY m.clv_historical DESC;

-- View: At-Risk Customers (Need Attention)
CREATE OR REPLACE VIEW v_at_risk_customers AS
SELECT
  c.id,
  c.email,
  c.full_name,
  c.phone,
  m.total_orders,
  m.total_revenue,
  m.days_since_last_order,
  m.churn_risk_score,
  m.churn_risk_segment,
  m.predicted_next_order_date,
  m.last_email_opened_at
FROM customers c
JOIN customer_metrics m ON m.customer_id = c.id
WHERE m.churn_risk_segment IN ('at_risk', 'critical')
   OR m.days_since_last_order > 90
ORDER BY m.churn_risk_score DESC;

-- View: Recent Customer Activity
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT
  i.id,
  c.email,
  c.full_name,
  i.interaction_type,
  i.interaction_subtype,
  i.channel,
  i.summary,
  i.occurred_at,
  i.source_system
FROM customer_interactions i
JOIN customers c ON c.id = i.customer_id
WHERE i.occurred_at >= NOW() - INTERVAL '7 days'
ORDER BY i.occurred_at DESC
LIMIT 1000;

-- View: Customer Acquisition Report
CREATE OR REPLACE VIEW v_acquisition_report AS
SELECT
  DATE_TRUNC('month', c.first_order_at) AS month,
  c.acquisition_source,
  c.acquisition_campaign,
  COUNT(DISTINCT c.id) AS new_customers,
  SUM(m.total_revenue) AS total_revenue,
  AVG(m.total_orders) AS avg_orders_per_customer,
  AVG(m.clv_historical) AS avg_clv
FROM customers c
JOIN customer_metrics m ON m.customer_id = c.id
WHERE c.first_order_at IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

-- View: Product Purchase Frequency (for recommendations)
CREATE OR REPLACE VIEW v_product_purchase_frequency AS
SELECT
  oi.bc_product_id,
  oi.sku,
  oi.name,
  oi.brand,
  COUNT(DISTINCT o.customer_id) AS unique_customers,
  COUNT(*) AS times_ordered,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.total_price) AS total_revenue,
  AVG(oi.unit_price) AS avg_price
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status NOT IN ('cancelled', 'refunded')
GROUP BY oi.bc_product_id, oi.sku, oi.name, oi.brand
ORDER BY unique_customers DESC;

-- View: Customer Segment Summary
CREATE OR REPLACE VIEW v_segment_summary AS
SELECT
  s.name AS segment_name,
  s.segment_type,
  s.category,
  s.member_count,
  AVG(m.total_revenue) AS avg_revenue,
  AVG(m.total_orders) AS avg_orders,
  AVG(m.days_since_last_order) AS avg_days_since_order
FROM customer_segments s
JOIN customer_segment_memberships sm ON sm.segment_id = s.id AND sm.is_active = TRUE
JOIN customer_metrics m ON m.customer_id = sm.customer_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.name, s.segment_type, s.category, s.member_count
ORDER BY s.member_count DESC;

-- ==============================================================================
-- FUNCTIONS - Customer Metrics Calculation
-- ==============================================================================

-- Function: Calculate RFM Scores for a customer
CREATE OR REPLACE FUNCTION calculate_customer_rfm(p_customer_id UUID)
RETURNS void AS $$
DECLARE
  v_recency INTEGER;
  v_frequency INTEGER;
  v_monetary DECIMAL;
  v_r_score INTEGER;
  v_f_score INTEGER;
  v_m_score INTEGER;
  v_segment VARCHAR(50);
BEGIN
  -- Calculate raw values
  SELECT
    EXTRACT(DAY FROM NOW() - MAX(o.order_date))::INTEGER,
    COUNT(*)::INTEGER,
    COALESCE(SUM(o.total), 0)
  INTO v_recency, v_frequency, v_monetary
  FROM orders o
  WHERE o.customer_id = p_customer_id
    AND o.status NOT IN ('cancelled', 'refunded');

  -- Calculate R score (lower recency = higher score)
  v_r_score := CASE
    WHEN v_recency IS NULL THEN 1
    WHEN v_recency <= 30 THEN 5
    WHEN v_recency <= 60 THEN 4
    WHEN v_recency <= 90 THEN 3
    WHEN v_recency <= 180 THEN 2
    ELSE 1
  END;

  -- Calculate F score
  v_f_score := CASE
    WHEN v_frequency >= 10 THEN 5
    WHEN v_frequency >= 5 THEN 4
    WHEN v_frequency >= 3 THEN 3
    WHEN v_frequency >= 2 THEN 2
    ELSE 1
  END;

  -- Calculate M score
  v_m_score := CASE
    WHEN v_monetary >= 1000 THEN 5
    WHEN v_monetary >= 500 THEN 4
    WHEN v_monetary >= 250 THEN 3
    WHEN v_monetary >= 100 THEN 2
    ELSE 1
  END;

  -- Determine segment
  v_segment := CASE
    WHEN v_r_score >= 4 AND v_f_score >= 4 AND v_m_score >= 4 THEN 'champion'
    WHEN v_r_score >= 4 AND v_f_score >= 3 THEN 'loyal'
    WHEN v_r_score >= 4 AND v_f_score <= 2 THEN 'new'
    WHEN v_r_score >= 3 AND v_f_score >= 3 THEN 'potential_loyalist'
    WHEN v_r_score >= 3 AND v_f_score <= 2 THEN 'promising'
    WHEN v_r_score <= 2 AND v_f_score >= 4 THEN 'at_risk'
    WHEN v_r_score <= 2 AND v_f_score >= 2 THEN 'need_attention'
    WHEN v_r_score <= 2 AND v_f_score <= 1 AND v_m_score >= 3 THEN 'hibernating'
    ELSE 'lost'
  END;

  -- Update metrics
  UPDATE customer_metrics SET
    rfm_recency_score = v_r_score,
    rfm_frequency_score = v_f_score,
    rfm_monetary_score = v_m_score,
    rfm_combined_score = v_r_score + v_f_score + v_m_score,
    rfm_segment = v_segment,
    last_calculated_at = NOW()
  WHERE customer_id = p_customer_id;

END;
$$ LANGUAGE plpgsql;

-- Function: Recalculate all customer metrics
CREATE OR REPLACE FUNCTION recalculate_customer_metrics(p_customer_id UUID)
RETURNS void AS $$
DECLARE
  v_metrics RECORD;
BEGIN
  -- Calculate order metrics
  SELECT
    COUNT(*) AS total_orders,
    COALESCE(SUM(total), 0) AS total_revenue,
    COALESCE(SUM(items_quantity), 0) AS total_items,
    COALESCE(AVG(total), 0) AS avg_order_value,
    COALESCE(MAX(total), 0) AS max_order_value,
    MIN(order_date) AS first_order,
    MAX(order_date) AS last_order,
    EXTRACT(DAY FROM NOW() - MIN(order_date))::INTEGER AS days_since_first,
    EXTRACT(DAY FROM NOW() - MAX(order_date))::INTEGER AS days_since_last
  INTO v_metrics
  FROM orders
  WHERE customer_id = p_customer_id
    AND status NOT IN ('cancelled', 'refunded');

  -- Insert or update metrics
  INSERT INTO customer_metrics (
    customer_id,
    total_orders,
    total_revenue,
    total_items_purchased,
    average_order_value,
    largest_order_value,
    days_since_first_order,
    days_since_last_order,
    clv_historical,
    last_calculated_at
  ) VALUES (
    p_customer_id,
    v_metrics.total_orders,
    v_metrics.total_revenue,
    v_metrics.total_items,
    v_metrics.avg_order_value,
    v_metrics.max_order_value,
    v_metrics.days_since_first,
    v_metrics.days_since_last,
    v_metrics.total_revenue,
    NOW()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_revenue = EXCLUDED.total_revenue,
    total_items_purchased = EXCLUDED.total_items_purchased,
    average_order_value = EXCLUDED.average_order_value,
    largest_order_value = EXCLUDED.largest_order_value,
    days_since_first_order = EXCLUDED.days_since_first_order,
    days_since_last_order = EXCLUDED.days_since_last_order,
    clv_historical = EXCLUDED.clv_historical,
    last_calculated_at = NOW();

  -- Now calculate RFM
  PERFORM calculate_customer_rfm(p_customer_id);

  -- Update customer first_order_at
  UPDATE customers SET
    first_order_at = v_metrics.first_order,
    last_activity_at = GREATEST(last_activity_at, v_metrics.last_order)
  WHERE id = p_customer_id;

END;
$$ LANGUAGE plpgsql;

-- Function: Calculate churn risk score
CREATE OR REPLACE FUNCTION calculate_churn_risk(p_customer_id UUID)
RETURNS void AS $$
DECLARE
  v_days_since_last INTEGER;
  v_avg_days_between DECIMAL;
  v_risk_score DECIMAL;
  v_risk_segment VARCHAR(50);
BEGIN
  -- Get days since last order and average frequency
  SELECT
    days_since_last_order,
    average_days_between_orders
  INTO v_days_since_last, v_avg_days_between
  FROM customer_metrics
  WHERE customer_id = p_customer_id;

  -- Calculate risk score (0 = safe, 1 = definitely churned)
  IF v_days_since_last IS NULL THEN
    v_risk_score := 0.5;  -- New customer, unknown
  ELSIF v_avg_days_between IS NULL OR v_avg_days_between = 0 THEN
    -- One-time buyer
    v_risk_score := CASE
      WHEN v_days_since_last <= 30 THEN 0.2
      WHEN v_days_since_last <= 90 THEN 0.5
      WHEN v_days_since_last <= 180 THEN 0.7
      ELSE 0.9
    END;
  ELSE
    -- Repeat buyer - compare to their pattern
    v_risk_score := LEAST(1.0, v_days_since_last / (v_avg_days_between * 2));
  END IF;

  -- Determine segment
  v_risk_segment := CASE
    WHEN v_risk_score <= 0.25 THEN 'safe'
    WHEN v_risk_score <= 0.5 THEN 'monitor'
    WHEN v_risk_score <= 0.75 THEN 'at_risk'
    ELSE 'critical'
  END;

  -- Update
  UPDATE customer_metrics SET
    churn_risk_score = v_risk_score,
    churn_risk_segment = v_risk_segment,
    predicted_next_order_date = CASE
      WHEN v_avg_days_between IS NOT NULL THEN
        (SELECT MAX(order_date) + (v_avg_days_between || ' days')::INTERVAL FROM orders WHERE customer_id = p_customer_id)::DATE
      ELSE NULL
    END,
    last_calculated_at = NOW()
  WHERE customer_id = p_customer_id;

END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Trigger: Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all CRM tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customers', 'customer_addresses', 'orders', 'customer_segments',
    'customer_metrics', 'support_tickets', 'marketing_campaigns'
  ]) LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- Trigger: Update customer last_activity_at on new interaction
CREATE OR REPLACE FUNCTION update_customer_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    last_activity_at = NEW.occurred_at
  WHERE id = NEW.customer_id
    AND (last_activity_at IS NULL OR last_activity_at < NEW.occurred_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interaction_updates_customer_activity
AFTER INSERT ON customer_interactions
FOR EACH ROW EXECUTE FUNCTION update_customer_last_activity();

-- Trigger: Create customer metrics row on new customer
CREATE OR REPLACE FUNCTION create_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_metrics (customer_id)
  VALUES (NEW.id)
  ON CONFLICT (customer_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_creates_metrics
AFTER INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION create_customer_metrics();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on all CRM tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_wishlists ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customers', 'customer_addresses', 'orders', 'order_items',
    'customer_interactions', 'customer_segments', 'customer_segment_memberships',
    'customer_tags', 'customer_tag_assignments', 'customer_metrics',
    'email_campaigns', 'email_events', 'support_tickets', 'support_messages',
    'marketing_campaigns', 'customer_attribution', 'product_reviews', 'customer_wishlists'
  ]) LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS service_role_%s ON %s;
      CREATE POLICY service_role_%s ON %s FOR ALL
      USING (auth.role() = ''service_role'');
    ', t, t, t, t);
  END LOOP;
END $$;

-- ==============================================================================
-- DEFAULT SEGMENTS - Pre-populate common segments
-- ==============================================================================

INSERT INTO customer_segments (name, slug, description, segment_type, category, criteria) VALUES
-- Lifecycle Segments
('New Customers', 'new-customers', 'Customers who placed their first order in the last 30 days', 'dynamic', 'lifecycle',
 '{"conditions": [{"field": "first_order_at", "operator": ">=", "value": "30_days_ago"}]}'::JSONB),

('Repeat Customers', 'repeat-customers', 'Customers with 2+ orders', 'dynamic', 'lifecycle',
 '{"conditions": [{"field": "total_orders", "operator": ">=", "value": 2}]}'::JSONB),

('VIP Customers', 'vip-customers', 'High-value repeat customers (RFM Champions)', 'dynamic', 'lifecycle',
 '{"conditions": [{"field": "rfm_segment", "operator": "=", "value": "champion"}]}'::JSONB),

('At Risk', 'at-risk', 'Previously active customers showing churn signals', 'dynamic', 'lifecycle',
 '{"conditions": [{"field": "churn_risk_segment", "operator": "in", "value": ["at_risk", "critical"]}]}'::JSONB),

('Churned', 'churned', 'Customers inactive for 180+ days', 'dynamic', 'lifecycle',
 '{"conditions": [{"field": "days_since_last_order", "operator": ">=", "value": 180}]}'::JSONB),

-- Value Segments
('High Spenders', 'high-spenders', 'Customers with lifetime value > $500', 'dynamic', 'value',
 '{"conditions": [{"field": "clv_historical", "operator": ">=", "value": 500}]}'::JSONB),

('Wholesale Customers', 'wholesale', 'Registered wholesale customers', 'dynamic', 'value',
 '{"conditions": [{"field": "is_wholesale_customer", "operator": "=", "value": true}]}'::JSONB),

-- Behavior Segments
('Email Engaged', 'email-engaged', 'Customers who opened an email in last 30 days', 'dynamic', 'behavior',
 '{"conditions": [{"field": "last_email_opened_at", "operator": ">=", "value": "30_days_ago"}]}'::JSONB),

('Cart Abandoners', 'cart-abandoners', 'Customers with recent cart abandonment', 'dynamic', 'behavior',
 '{"conditions": [{"field": "last_interaction_type", "operator": "=", "value": "cart_abandon"}]}'::JSONB),

('Newsletter Subscribers', 'newsletter-subscribers', 'Opted in for email marketing', 'dynamic', 'behavior',
 '{"conditions": [{"field": "email_marketing_consent", "operator": "=", "value": true}]}'::JSONB)

ON CONFLICT (slug) DO NOTHING;

-- ==============================================================================
-- DEFAULT TAGS
-- ==============================================================================

INSERT INTO customer_tags (name, slug, color, category) VALUES
-- Source Tags
('Referral', 'referral', '#10B981', 'source'),
('Google Ads', 'google-ads', '#4285F4', 'source'),
('Facebook', 'facebook', '#1877F2', 'source'),
('Organic', 'organic', '#22C55E', 'source'),

-- Behavior Tags
('First Time Buyer', 'first-time-buyer', '#3B82F6', 'behavior'),
('Bulk Buyer', 'bulk-buyer', '#8B5CF6', 'behavior'),
('Discount Hunter', 'discount-hunter', '#F59E0B', 'behavior'),
('Gift Buyer', 'gift-buyer', '#EC4899', 'behavior'),

-- Interest Tags
('Organic Products', 'organic-products', '#22C55E', 'interest'),
('Supplements', 'supplements', '#6366F1', 'interest'),
('Skincare', 'skincare', '#F472B6', 'interest'),
('Vegan', 'vegan', '#84CC16', 'interest'),
('Gluten Free', 'gluten-free', '#F59E0B', 'interest'),

-- Custom Tags
('Influencer', 'influencer', '#A855F7', 'custom'),
('Press/Media', 'press-media', '#06B6D4', 'custom'),
('Loyalty Member', 'loyalty-member', '#FBBF24', 'custom')

ON CONFLICT (slug) DO NOTHING;

-- ==============================================================================
-- GRANTS
-- ==============================================================================

-- Service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Authenticated read access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- ==============================================================================
-- SCHEMA VERSION
-- ==============================================================================

INSERT INTO schema_version (version, description) VALUES
  ('2.0.0', 'CRM database schema for customer intelligence')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- COMPLETION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'BOO CRM Schema Created Successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CORE TABLES:';
  RAISE NOTICE '  - customers (master profile)';
  RAISE NOTICE '  - customer_addresses';
  RAISE NOTICE '  - orders (enhanced)';
  RAISE NOTICE '  - order_items';
  RAISE NOTICE '';
  RAISE NOTICE 'ENGAGEMENT:';
  RAISE NOTICE '  - customer_interactions';
  RAISE NOTICE '  - email_campaigns';
  RAISE NOTICE '  - email_events';
  RAISE NOTICE '';
  RAISE NOTICE 'SEGMENTATION:';
  RAISE NOTICE '  - customer_segments';
  RAISE NOTICE '  - customer_segment_memberships';
  RAISE NOTICE '  - customer_tags';
  RAISE NOTICE '  - customer_tag_assignments';
  RAISE NOTICE '';
  RAISE NOTICE 'ANALYTICS:';
  RAISE NOTICE '  - customer_metrics (CLV, RFM, churn)';
  RAISE NOTICE '';
  RAISE NOTICE 'SUPPORT:';
  RAISE NOTICE '  - support_tickets';
  RAISE NOTICE '  - support_messages';
  RAISE NOTICE '';
  RAISE NOTICE 'MARKETING:';
  RAISE NOTICE '  - marketing_campaigns';
  RAISE NOTICE '  - customer_attribution';
  RAISE NOTICE '';
  RAISE NOTICE 'ADDITIONAL:';
  RAISE NOTICE '  - product_reviews';
  RAISE NOTICE '  - customer_wishlists';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Migrate BigCommerce orders to new orders table';
  RAISE NOTICE '  2. Create customers from order emails';
  RAISE NOTICE '  3. Import Klaviyo profiles into customers';
  RAISE NOTICE '  4. Calculate initial customer metrics';
  RAISE NOTICE '  5. Set up sync scripts';
END $$;
