/**
 * Apply CRM Schema via Supabase Client
 *
 * This script applies the CRM schema using the Supabase JavaScript client.
 * It creates tables individually using RPC calls.
 *
 * Run: npx tsx apply-crm-via-supabase-client.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// CRM Table definitions as individual SQL statements
const tableDefinitions: { name: string; sql: string }[] = [
  {
    name: 'customers',
    sql: `
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bc_customer_id INTEGER UNIQUE,
  klaviyo_profile_id VARCHAR(255),
  hubspot_contact_id VARCHAR(255),
  zendesk_user_id VARCHAR(255),
  intercom_user_id VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  phone VARCHAR(50),
  phone_verified BOOLEAN DEFAULT FALSE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company_name VARCHAR(255),
  company_abn VARCHAR(50),
  is_wholesale_customer BOOLEAN DEFAULT FALSE,
  wholesale_discount_tier VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(20),
  acquisition_source VARCHAR(100),
  acquisition_campaign VARCHAR(255),
  acquisition_medium VARCHAR(100),
  first_seen_at TIMESTAMP WITH TIME ZONE,
  first_order_at TIMESTAMP WITH TIME ZONE,
  email_marketing_consent BOOLEAN DEFAULT FALSE,
  email_consent_date TIMESTAMP WITH TIME ZONE,
  sms_marketing_consent BOOLEAN DEFAULT FALSE,
  sms_consent_date TIMESTAMP WITH TIME ZONE,
  preferred_contact_method VARCHAR(50) DEFAULT 'email',
  status VARCHAR(50) DEFAULT 'active',
  is_guest BOOLEAN DEFAULT FALSE,
  account_created_at TIMESTAMP WITH TIME ZONE,
  internal_notes TEXT,
  customer_notes TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE,
  data_sources JSONB DEFAULT '[]'
)`
  },
  {
    name: 'customer_addresses',
    sql: `
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_type VARCHAR(50) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  address_label VARCHAR(100),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postcode VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'Australia',
  country_code VARCHAR(10) DEFAULT 'AU',
  is_validated BOOLEAN DEFAULT FALSE,
  validation_date TIMESTAMP WITH TIME ZONE,
  validation_source VARCHAR(50),
  delivery_instructions TEXT,
  authority_to_leave BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'orders',
    sql: `
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bc_order_id INTEGER UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50),
  fulfillment_status VARCHAR(50),
  subtotal DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  coupon_code VARCHAR(100),
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'AUD',
  shipping_method VARCHAR(100),
  shipping_carrier VARCHAR(100),
  tracking_number VARCHAR(255),
  shipping_address_id UUID REFERENCES customer_addresses(id),
  billing_address_id UUID REFERENCES customer_addresses(id),
  shipping_address JSONB,
  billing_address JSONB,
  items_count INTEGER DEFAULT 0,
  items_quantity INTEGER DEFAULT 0,
  order_source VARCHAR(100),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  referrer_url TEXT,
  landing_page_url TEXT,
  customer_email VARCHAR(255),
  customer_first_name VARCHAR(255),
  customer_last_name VARCHAR(255),
  customer_phone VARCHAR(50),
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  shipped_date TIMESTAMP WITH TIME ZONE,
  delivered_date TIMESTAMP WITH TIME ZONE,
  cancelled_date TIMESTAMP WITH TIME ZONE,
  staff_notes TEXT,
  customer_notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'order_items',
    sql: `
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bc_product_id INTEGER,
  bc_variant_id INTEGER,
  sku VARCHAR(255),
  name TEXT NOT NULL,
  brand VARCHAR(255),
  category VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  options JSONB DEFAULT '[]',
  fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
  quantity_shipped INTEGER DEFAULT 0,
  quantity_refunded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'customer_interactions',
    sql: `
CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  interaction_type VARCHAR(100) NOT NULL,
  interaction_subtype VARCHAR(100),
  order_id UUID REFERENCES orders(id),
  support_ticket_id UUID,
  email_campaign_id VARCHAR(255),
  product_id INTEGER,
  channel VARCHAR(50) NOT NULL,
  direction VARCHAR(20),
  subject VARCHAR(500),
  summary TEXT,
  content TEXT,
  properties JSONB DEFAULT '{}',
  source_system VARCHAR(50),
  external_id VARCHAR(255),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'customer_segments',
    sql: `
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  segment_type VARCHAR(50) NOT NULL,
  criteria JSONB,
  category VARCHAR(100),
  sync_to_klaviyo BOOLEAN DEFAULT FALSE,
  klaviyo_list_id VARCHAR(255),
  sync_to_hubspot BOOLEAN DEFAULT FALSE,
  hubspot_list_id VARCHAR(255),
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'customer_segment_memberships',
    sql: `
CREATE TABLE IF NOT EXISTS customer_segment_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  score DECIMAL(5,4),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  added_by VARCHAR(50),
  reason TEXT,
  UNIQUE(customer_id, segment_id)
)`
  },
  {
    name: 'customer_tags',
    sql: `
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7),
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'customer_tag_assignments',
    sql: `
CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by VARCHAR(50),
  UNIQUE(customer_id, tag_id)
)`
  },
  {
    name: 'customer_metrics',
    sql: `
CREATE TABLE IF NOT EXISTS customer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_items_purchased INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  largest_order_value DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  total_profit DECIMAL(12,2) DEFAULT 0,
  profit_margin_percent DECIMAL(5,2) DEFAULT 0,
  days_since_first_order INTEGER,
  days_since_last_order INTEGER,
  average_days_between_orders DECIMAL(10,2),
  rfm_recency_score INTEGER,
  rfm_frequency_score INTEGER,
  rfm_monetary_score INTEGER,
  rfm_combined_score INTEGER,
  rfm_segment VARCHAR(50),
  clv_historical DECIMAL(12,2) DEFAULT 0,
  clv_predicted DECIMAL(12,2),
  clv_segment VARCHAR(50),
  churn_risk_score DECIMAL(5,4),
  churn_risk_segment VARCHAR(50),
  predicted_next_order_date DATE,
  favorite_categories JSONB DEFAULT '[]',
  favorite_brands JSONB DEFAULT '[]',
  favorite_products JSONB DEFAULT '[]',
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  email_open_rate DECIMAL(5,4) DEFAULT 0,
  email_click_rate DECIMAL(5,4) DEFAULT 0,
  last_email_opened_at TIMESTAMP WITH TIME ZONE,
  total_support_tickets INTEGER DEFAULT 0,
  open_support_tickets INTEGER DEFAULT 0,
  average_satisfaction_score DECIMAL(3,2),
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_version INTEGER DEFAULT 1
)`
  },
  {
    name: 'email_campaigns',
    sql: `
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klaviyo_campaign_id VARCHAR(255) UNIQUE,
  klaviyo_flow_id VARCHAR(255),
  name VARCHAR(500) NOT NULL,
  subject VARCHAR(500),
  campaign_type VARCHAR(50),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'email_events',
    sql: `
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  clicked_url TEXT,
  klaviyo_event_id VARCHAR(255),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'support_tickets',
    sql: `
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  external_ticket_id VARCHAR(255),
  external_system VARCHAR(50),
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'normal',
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags JSONB DEFAULT '[]',
  order_id UUID REFERENCES orders(id),
  assigned_to VARCHAR(255),
  assigned_group VARCHAR(255),
  satisfaction_rating INTEGER,
  satisfaction_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
)`
  },
  {
    name: 'support_messages',
    sql: `
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT,
  sender_type VARCHAR(50),
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  attachments JSONB DEFAULT '[]',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'marketing_campaigns',
    sql: `
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  external_id VARCHAR(255),
  platform VARCHAR(100) NOT NULL,
  campaign_type VARCHAR(100),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  total_spend DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'AUD',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'customer_attribution',
    sql: `
CREATE TABLE IF NOT EXISTS customer_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id),
  order_id UUID REFERENCES orders(id),
  attribution_model VARCHAR(50) NOT NULL,
  attribution_weight DECIMAL(5,4) DEFAULT 1.0000,
  touchpoint_type VARCHAR(50),
  touchpoint_date TIMESTAMP WITH TIME ZONE NOT NULL,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  attributed_revenue DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'product_reviews',
    sql: `
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  bc_product_id INTEGER NOT NULL,
  order_id UUID REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  external_review_id VARCHAR(255),
  external_platform VARCHAR(50),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`
  },
  {
    name: 'customer_wishlists',
    sql: `
CREATE TABLE IF NOT EXISTS customer_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bc_product_id INTEGER NOT NULL,
  price_when_added DECIMAL(10,2),
  current_price DECIMAL(10,2),
  price_drop_notified BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, bc_product_id)
)`
  }
]

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    return !error
  } catch {
    return false
  }
}

async function executeRawSql(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Use the REST API to execute SQL via RPC
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql_query: sql })
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: text }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('APPLY CRM SCHEMA VIA SUPABASE CLIENT')
  console.log('='.repeat(60))
  console.log('')

  // Test connection
  console.log('Testing Supabase connection...')
  try {
    const { data, error } = await supabase.from('bc_products').select('id').limit(1)
    if (error && !error.message.includes('does not exist')) {
      console.error('Connection test failed:', error.message)
    } else {
      console.log('Connection successful!')
    }
  } catch (error: any) {
    console.error('Connection failed:', error.message)
    process.exit(1)
  }

  console.log('')
  console.log('Checking/Creating CRM tables...')
  console.log('-'.repeat(40))

  let created = 0
  let existing = 0
  let failed = 0

  for (const table of tableDefinitions) {
    process.stdout.write(`   ${table.name.padEnd(30)}`)

    // Check if table exists
    const exists = await checkTableExists(table.name)

    if (exists) {
      console.log('EXISTS')
      existing++
      continue
    }

    // Table doesn't exist, need to create it
    // Try via RPC first
    const result = await executeRawSql(table.sql)

    if (result.success) {
      console.log('CREATED')
      created++
    } else {
      // RPC might not exist, this is expected
      console.log('PENDING (apply via SQL Editor)')
      failed++
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`   Existing: ${existing}`)
  console.log(`   Created:  ${created}`)
  console.log(`   Pending:  ${failed}`)
  console.log('')

  if (failed > 0) {
    console.log('Some tables need to be created via the Supabase SQL Editor.')
    console.log('')
    console.log('Please:')
    console.log('1. Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
    console.log('2. Copy and paste the contents of: supabase-schema-crm.sql')
    console.log('3. Click "Run"')
    console.log('')
    console.log('The SQL file is located at:')
    console.log('/home/user/master-ops/buy-organics-online/supabase-schema-crm.sql')
  } else {
    console.log('All CRM tables exist!')
    console.log('')
    console.log('Next step: Run the data population script:')
    console.log('  npx tsx populate-crm-data.ts')
  }
}

main().catch(console.error)
