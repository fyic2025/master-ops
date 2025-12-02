-- =============================================================================
-- Marketing Skills Foundation Schema
-- =============================================================================
-- Foundation tables for 10 marketing skills:
-- 1. brand-asset-manager
-- 2. email-template-designer
-- 3. marketing-copywriter
-- 4. email-preview-tester
-- 5. conversion-optimizer
-- 6. marketing-analytics-reporter
-- 7. customer-segmentation-engine
-- 8. product-image-enhancer
-- 9. social-creative-generator
-- 10. landing-page-builder
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1: Brand Guidelines & Assets (brand-asset-manager foundation)
-- -----------------------------------------------------------------------------

-- Core brand configuration table
CREATE TABLE IF NOT EXISTS brand_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT UNIQUE NOT NULL CHECK (business_slug IN ('teelixir', 'boo', 'elevate', 'rhf')),
  business_name TEXT NOT NULL,

  -- Brand Identity
  tagline TEXT,
  mission_statement TEXT,

  -- Colors (Hex format)
  primary_color TEXT NOT NULL,
  secondary_color TEXT,
  accent_color TEXT,
  background_color TEXT DEFAULT '#FFFFFF',
  text_color TEXT DEFAULT '#333333',
  muted_text_color TEXT DEFAULT '#666666',
  success_color TEXT DEFAULT '#22C55E',
  warning_color TEXT DEFAULT '#F59E0B',
  error_color TEXT DEFAULT '#EF4444',

  -- Typography
  heading_font TEXT DEFAULT 'Arial, Helvetica, sans-serif',
  body_font TEXT DEFAULT 'Arial, Helvetica, sans-serif',
  font_cdn_url TEXT,

  -- Brand Voice (for marketing-copywriter)
  voice_personality JSONB DEFAULT '[]'::jsonb,
  tone_characteristics JSONB DEFAULT '{}'::jsonb,
  writing_dos TEXT[] DEFAULT '{}',
  writing_donts TEXT[] DEFAULT '{}',
  example_phrases TEXT[] DEFAULT '{}',
  key_terminology JSONB DEFAULT '{}'::jsonb,

  -- Email Settings
  default_from_name TEXT NOT NULL,
  default_from_email TEXT NOT NULL,
  default_reply_to TEXT,
  email_footer_html TEXT,
  unsubscribe_text TEXT DEFAULT 'Unsubscribe from these emails',
  physical_address TEXT,

  -- Social & Links
  website_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand assets storage tracking
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL REFERENCES brand_guidelines(business_slug) ON DELETE CASCADE,

  -- Asset Identification
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'logo_primary', 'logo_secondary', 'logo_icon', 'logo_white', 'logo_dark',
    'favicon', 'social_banner', 'email_header', 'email_footer',
    'watermark', 'signature', 'pattern', 'icon_set', 'product_placeholder'
  )),
  asset_name TEXT NOT NULL,
  description TEXT,

  -- Storage Reference
  storage_bucket TEXT DEFAULT 'brand-assets',
  storage_path TEXT NOT NULL,
  public_url TEXT,

  -- File Metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER,
  dimensions JSONB,

  -- Usage Context
  usage_contexts TEXT[] DEFAULT '{}',

  -- Versioning
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  previous_version_id UUID REFERENCES brand_assets(id),

  -- Metadata
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_slug, asset_type, asset_name)
);

-- Index for current assets lookup
CREATE INDEX IF NOT EXISTS idx_brand_assets_current ON brand_assets(business_slug, is_current) WHERE is_current = TRUE;

-- -----------------------------------------------------------------------------
-- PART 2: Email Templates (email-template-designer foundation)
-- -----------------------------------------------------------------------------

-- Template categories
CREATE TABLE IF NOT EXISTS email_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO email_template_categories (slug, name, description, sort_order) VALUES
  ('transactional', 'Transactional', 'Order confirmations, shipping updates, password resets', 1),
  ('promotional', 'Promotional', 'Sales, discounts, product launches', 2),
  ('automated', 'Automated Flows', 'Welcome series, abandoned cart, winback, anniversary', 3),
  ('newsletter', 'Newsletter', 'Regular content updates and news', 4),
  ('notification', 'Notification', 'Alerts, reminders, system notifications', 5),
  ('b2b', 'B2B Outreach', 'Wholesale, partnership, prospecting emails', 6)
ON CONFLICT (slug) DO NOTHING;

-- Main email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  business_slug TEXT NOT NULL REFERENCES brand_guidelines(business_slug),
  category_id UUID REFERENCES email_template_categories(id),
  template_slug TEXT NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,

  -- Content
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,

  -- Variables/Personalization
  available_variables JSONB DEFAULT '[]'::jsonb,
  sample_data JSONB DEFAULT '{}'::jsonb,

  -- Design Settings
  layout_type TEXT DEFAULT 'single-column' CHECK (layout_type IN (
    'single-column', 'two-column', 'hero', 'minimal', 'newsletter', 'custom'
  )),
  header_image_url TEXT,
  use_brand_header BOOLEAN DEFAULT TRUE,
  use_brand_footer BOOLEAN DEFAULT TRUE,

  -- Status & Versioning
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'active', 'archived')),
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  previous_version_id UUID REFERENCES email_templates(id),

  -- Performance Tracking
  times_sent INTEGER DEFAULT 0,
  avg_open_rate DECIMAL(5,2),
  avg_click_rate DECIMAL(5,2),
  avg_conversion_rate DECIMAL(5,2),
  last_sent_at TIMESTAMPTZ,

  -- Audit
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_slug, template_slug)
);

-- Reusable email components
CREATE TABLE IF NOT EXISTS email_template_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT REFERENCES brand_guidelines(business_slug),

  component_type TEXT NOT NULL CHECK (component_type IN (
    'header', 'footer', 'hero', 'product-grid', 'cta-button',
    'testimonial', 'social-links', 'divider', 'text-block', 'image-block',
    'discount-box', 'product-card', 'countdown'
  )),
  component_name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  css_styles TEXT,
  available_variables JSONB DEFAULT '[]'::jsonb,

  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test variants
CREATE TABLE IF NOT EXISTS email_template_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,

  -- Variant overrides
  subject_line TEXT,
  preview_text TEXT,
  html_content TEXT,

  -- Test allocation
  traffic_percentage INTEGER DEFAULT 50 CHECK (traffic_percentage BETWEEN 0 AND 100),

  -- Results
  sends INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,

  is_winner BOOLEAN DEFAULT FALSE,
  test_started_at TIMESTAMPTZ,
  test_ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- PART 3: Customer Segments (customer-segmentation-engine foundation)
-- -----------------------------------------------------------------------------

-- Segment definitions
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL,
  segment_name TEXT NOT NULL,
  segment_type TEXT DEFAULT 'dynamic' CHECK (segment_type IN ('static', 'dynamic', 'computed')),
  description TEXT,

  -- Rules definition
  rules JSONB NOT NULL,

  -- External sync
  klaviyo_segment_id TEXT,
  klaviyo_list_id TEXT,

  -- Stats
  member_count INTEGER DEFAULT 0,
  last_computed_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_slug, segment_name)
);

-- RFM scores for customers
CREATE TABLE IF NOT EXISTS customer_rfm_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_id TEXT,

  -- RFM Scores (1-5 scale)
  recency_score INTEGER CHECK (recency_score BETWEEN 1 AND 5),
  frequency_score INTEGER CHECK (frequency_score BETWEEN 1 AND 5),
  monetary_score INTEGER CHECK (monetary_score BETWEEN 1 AND 5),

  -- Composite
  rfm_segment TEXT,
  rfm_score INTEGER GENERATED ALWAYS AS (recency_score * 100 + frequency_score * 10 + monetary_score) STORED,

  -- Source data
  last_order_date DATE,
  total_orders INTEGER,
  total_spent DECIMAL(10,2),
  avg_order_value DECIMAL(10,2),
  days_since_last_order INTEGER,

  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_slug, customer_email)
);

-- Index for segment lookups
CREATE INDEX IF NOT EXISTS idx_rfm_segment ON customer_rfm_scores(business_slug, rfm_segment);

-- -----------------------------------------------------------------------------
-- PART 4: Landing Pages (landing-page-builder foundation)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL,
  page_slug TEXT NOT NULL,
  page_title TEXT NOT NULL,
  page_type TEXT DEFAULT 'campaign' CHECK (page_type IN (
    'product_launch', 'campaign', 'lead_gen', 'sale', 'collection', 'event'
  )),

  -- Content
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- SEO
  meta_tags JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  tracking_config JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Stats
  page_views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_slug, page_slug)
);

-- -----------------------------------------------------------------------------
-- PART 5: Marketing Copy Library (marketing-copywriter foundation)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing_copy_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_slug TEXT NOT NULL,
  copy_type TEXT NOT NULL CHECK (copy_type IN (
    'subject_line', 'headline', 'tagline', 'cta', 'body', 'preheader',
    'social_caption', 'ad_copy', 'product_description'
  )),

  -- Context
  context_tags TEXT[] DEFAULT '{}',
  campaign_type TEXT,

  -- Content
  content TEXT NOT NULL,
  variables_used TEXT[] DEFAULT '{}',

  -- Performance
  performance_score DECIMAL(3,2),
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Source
  generated_by TEXT DEFAULT 'manual',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for copy lookups
CREATE INDEX IF NOT EXISTS idx_copy_library_lookup
  ON marketing_copy_library(business_slug, copy_type, campaign_type);

-- -----------------------------------------------------------------------------
-- PART 6: Skill Implementation Progress Tracking
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS skill_implementation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL UNIQUE,
  phase INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'validated')),
  quality_score INTEGER DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  files_created TEXT[] DEFAULT '{}',
  integration_tested BOOLEAN DEFAULT FALSE,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate skill tracking
INSERT INTO skill_implementation_progress (skill_name, phase) VALUES
  ('brand-asset-manager', 1),
  ('email-template-designer', 1),
  ('marketing-copywriter', 2),
  ('email-preview-tester', 2),
  ('conversion-optimizer', 2),
  ('marketing-analytics-reporter', 3),
  ('customer-segmentation-engine', 3),
  ('product-image-enhancer', 4),
  ('social-creative-generator', 4),
  ('landing-page-builder', 4)
ON CONFLICT (skill_name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- PART 7: Pre-populate Brand Guidelines (from BRAND-VOICE-GUIDE.md)
-- -----------------------------------------------------------------------------

INSERT INTO brand_guidelines (
  business_slug,
  business_name,
  tagline,
  primary_color,
  secondary_color,
  accent_color,
  heading_font,
  body_font,
  voice_personality,
  tone_characteristics,
  writing_dos,
  writing_donts,
  example_phrases,
  default_from_name,
  default_from_email,
  website_url,
  social_links
) VALUES
-- Teelixir
(
  'teelixir',
  'Teelixir',
  'Unlock Your Full Potential',
  '#1B4D3E',
  '#D4AF37',
  '#8B4513',
  'Playfair Display, Georgia, serif',
  'Lato, Arial, sans-serif',
  '["Expert", "Passionate", "Premium", "Mystical"]'::jsonb,
  '{"tone": "Inspiring, knowledgeable, passionate", "language": "Elevated but accessible, wellness-focused", "perspective": "Educational expert sharing wisdom", "expertise": "Deep authority on functional mushrooms/adaptogens"}'::jsonb,
  ARRAY['Reference traditional use and history', 'Explain dual-extraction and quality processes', 'Use proper terminology (adaptogens, tonic herbs)', 'Connect to modern wellness goals', 'Highlight potency and bioavailability', 'Create desire for transformation'],
  ARRAY['Don''t make therapeutic claims', 'Don''t oversimplify (audience is knowledgeable)', 'Don''t use generic health food language', 'Don''t ignore sourcing/quality story', 'Don''t be boring or clinical'],
  ARRAY['Harness the power of...', 'Used for centuries in traditional medicine...', 'Support your body''s natural ability to...', 'Experience the transformative benefits...', 'Potent, pure, and powerful...'],
  'Teelixir',
  'colette@teelixir.com',
  'https://teelixir.com',
  '{"instagram": "https://instagram.com/teelixir", "facebook": "https://facebook.com/teelixir"}'::jsonb
),
-- Buy Organics Online
(
  'boo',
  'Buy Organics Online',
  'Your Wellness Journey Starts Here',
  '#4CAF50',
  '#2E7D32',
  '#FFA000',
  'Arial, Helvetica, sans-serif',
  'Arial, Helvetica, sans-serif',
  '["Trustworthy", "Supportive", "Knowledgeable", "Accessible"]'::jsonb,
  '{"tone": "Warm, informative, encouraging", "language": "Clear, educational, jargon-free", "perspective": "We and you - conversational", "expertise": "Confident but not condescending"}'::jsonb,
  ARRAY['Lead with benefits to the customer', 'Explain what makes products special', 'Use Australian spelling and terms', 'Include serving/usage suggestions', 'Mention certifications prominently', 'Connect products to lifestyle goals'],
  ARRAY['Don''t use medical claims', 'Don''t be overly salesy or pushy', 'Don''t assume prior knowledge', 'Don''t use complex scientific terms without explanation', 'Don''t copy supplier descriptions verbatim'],
  ARRAY['Nourish your body with...', 'A natural choice for...', 'Sourced from trusted suppliers...', 'Supporting your wellness journey...', 'Quality you can trust...'],
  'Buy Organics Online',
  'sales@buyorganicsonline.com.au',
  'https://www.buyorganicsonline.com.au',
  '{"instagram": "https://instagram.com/buyorganicsonline", "facebook": "https://facebook.com/buyorganicsonline"}'::jsonb
),
-- Elevate Wholesale
(
  'elevate',
  'Elevate Wholesale',
  'Elevate Your Retail Business',
  '#1E3A5F',
  '#3498DB',
  '#E74C3C',
  'Arial, Helvetica, sans-serif',
  'Arial, Helvetica, sans-serif',
  '["Professional", "Supportive", "Reliable", "Value-focused"]'::jsonb,
  '{"tone": "Professional, helpful, business-like", "language": "Clear, efficient, benefit-focused", "perspective": "Business partner perspective", "expertise": "Retail and wholesale expertise"}'::jsonb,
  ARRAY['Focus on retail benefits (margins, turnover)', 'Mention customer demand/popularity', 'Include practical details (shelf life, MOQ)', 'Highlight marketing support available', 'Use business metrics where relevant', 'Position as partnership opportunity'],
  ARRAY['Don''t use consumer marketing language', 'Don''t ignore commercial realities', 'Don''t be overly casual', 'Don''t forget decision-makers are businesses', 'Don''t skip practical ordering information'],
  ARRAY['A proven seller that delivers...', 'Stock your shelves with customer favourites...', 'Competitive wholesale pricing...', 'Marketing support included...', 'Partner with us for...'],
  'Elevate Wholesale',
  'wholesale@elevatewholesale.com.au',
  'https://elevatewholesale.com.au',
  '{"instagram": "https://instagram.com/elevatewholesale"}'::jsonb
),
-- Red Hill Fresh
(
  'rhf',
  'Red Hill Fresh',
  'Fresh From the Peninsula',
  '#C62828',
  '#4E342E',
  '#43A047',
  'Arial, Helvetica, sans-serif',
  'Arial, Helvetica, sans-serif',
  '["Local", "Fresh", "Community", "Family"]'::jsonb,
  '{"tone": "Friendly, warm, authentic", "language": "Simple, honest, down-to-earth", "perspective": "Neighbor sharing good finds", "expertise": "Local knowledge, farm connections"}'::jsonb,
  ARRAY['Mention local sourcing when applicable', 'Include farm/producer names when known', 'Emphasize freshness and seasonality', 'Connect to local community', 'Use friendly, conversational tone', 'Suggest family-friendly uses'],
  ARRAY['Don''t use corporate language', 'Don''t be impersonal', 'Don''t ignore the local story', 'Don''t use generic supermarket descriptions', 'Don''t forget seasonal availability notes'],
  ARRAY['Straight from local farms...', 'Fresh from the Mornington Peninsula...', 'Supporting local growers...', 'A family favourite...', 'Picked fresh and delivered to you...'],
  'Red Hill Fresh',
  'hello@redhillfresh.com.au',
  'https://redhillfresh.com.au',
  '{"instagram": "https://instagram.com/redhillfresh", "facebook": "https://facebook.com/redhillfresh"}'::jsonb
)
ON CONFLICT (business_slug) DO UPDATE SET
  tagline = EXCLUDED.tagline,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  voice_personality = EXCLUDED.voice_personality,
  tone_characteristics = EXCLUDED.tone_characteristics,
  writing_dos = EXCLUDED.writing_dos,
  writing_donts = EXCLUDED.writing_donts,
  example_phrases = EXCLUDED.example_phrases,
  updated_at = NOW();

-- -----------------------------------------------------------------------------
-- PART 8: Analytics Views (conversion-optimizer, marketing-analytics-reporter)
-- -----------------------------------------------------------------------------

-- Unified conversions view (cross-campaign)
CREATE OR REPLACE VIEW v_unified_conversions AS
SELECT
  'anniversary' AS campaign_type,
  'teelixir' AS business_slug,
  email,
  sent_at AS event_date,
  CASE WHEN status = 'used' THEN 1 ELSE 0 END AS converted,
  converted_order_total AS revenue,
  discount_code AS campaign_ref
FROM tlx_anniversary_discounts
WHERE sent_at IS NOT NULL

UNION ALL

SELECT
  'winback' AS campaign_type,
  'teelixir' AS business_slug,
  email,
  sent_at AS event_date,
  CASE WHEN status = 'converted' THEN 1 ELSE 0 END AS converted,
  order_total AS revenue,
  discount_code AS campaign_ref
FROM tlx_winback_emails
WHERE sent_at IS NOT NULL;

-- Marketing summary by channel
CREATE OR REPLACE VIEW v_marketing_summary AS
SELECT
  'email_anniversary' AS channel,
  'teelixir' AS business_slug,
  DATE(sent_at) AS date,
  COUNT(*) AS sends,
  0 AS opens,
  0 AS clicks,
  SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS conversions,
  SUM(COALESCE(converted_order_total, 0)) AS revenue
FROM tlx_anniversary_discounts
WHERE sent_at IS NOT NULL
GROUP BY DATE(sent_at)

UNION ALL

SELECT
  'email_winback' AS channel,
  'teelixir' AS business_slug,
  DATE(sent_at) AS date,
  COUNT(*) AS sends,
  SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) AS opens,
  SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS clicks,
  SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS conversions,
  SUM(COALESCE(order_total, 0)) AS revenue
FROM tlx_winback_emails
WHERE sent_at IS NOT NULL
GROUP BY DATE(sent_at);

-- RFM segment definitions (standard naming)
CREATE OR REPLACE VIEW v_rfm_segment_definitions AS
SELECT * FROM (VALUES
  ('Champions', 5, 5, 5, 'Best customers - buy often, spend most, bought recently'),
  ('Loyal Customers', 4, 4, 4, 'Spend good money, responsive to promotions'),
  ('Potential Loyalist', 5, 3, 3, 'Recent customers with average frequency'),
  ('New Customers', 5, 1, 1, 'Bought recently but not frequently'),
  ('Promising', 4, 2, 2, 'Recent shoppers but havent spent much'),
  ('Need Attention', 3, 3, 3, 'Above average but may be slipping'),
  ('About To Sleep', 3, 2, 2, 'Below average recency, frequency and monetary'),
  ('At Risk', 2, 4, 4, 'Spent big money, purchased often but long time ago'),
  ('Cant Lose Them', 2, 5, 5, 'Made biggest purchases but havent returned'),
  ('Hibernating', 2, 2, 2, 'Low recency, frequency, monetary'),
  ('Lost', 1, 1, 1, 'Lowest scores across the board')
) AS t(segment_name, min_recency, min_frequency, min_monetary, description);

-- -----------------------------------------------------------------------------
-- PART 9: Trigger for updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'brand_guidelines_updated_at') THEN
    CREATE TRIGGER brand_guidelines_updated_at
      BEFORE UPDATE ON brand_guidelines
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'email_templates_updated_at') THEN
    CREATE TRIGGER email_templates_updated_at
      BEFORE UPDATE ON email_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customer_segments_updated_at') THEN
    CREATE TRIGGER customer_segments_updated_at
      BEFORE UPDATE ON customer_segments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'landing_pages_updated_at') THEN
    CREATE TRIGGER landing_pages_updated_at
      BEFORE UPDATE ON landing_pages
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Tables created:
-- - brand_guidelines (4 businesses pre-populated)
-- - brand_assets
-- - email_template_categories (6 categories)
-- - email_templates
-- - email_template_components
-- - email_template_variants
-- - customer_segments
-- - customer_rfm_scores
-- - landing_pages
-- - marketing_copy_library
-- - skill_implementation_progress (10 skills tracked)
--
-- Views created:
-- - v_unified_conversions
-- - v_marketing_summary
-- - v_rfm_segment_definitions
-- =============================================================================
