-- ============================================================
-- COMPETITOR TRACKING SAAS PLATFORM
-- Multi-tenant schema for external customers
-- ============================================================

-- ============================================================
-- 1. ORGANIZATIONS (Tenants)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Subscription
  plan TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'starter', 'growth', 'pro', 'enterprise'
  plan_status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'cancelled'
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_id TEXT, -- Stripe subscription ID

  -- Limits based on plan
  max_products INTEGER DEFAULT 100,
  max_competitors INTEGER DEFAULT 2,
  max_users INTEGER DEFAULT 1,

  -- Billing
  stripe_customer_id TEXT,
  billing_email TEXT,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_organizations_slug ON ct_organizations(slug);
CREATE INDEX idx_ct_organizations_stripe ON ct_organizations(stripe_customer_id);

-- ============================================================
-- 2. ORGANIZATION MEMBERS (Users)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  -- User identity (matches NextAuth)
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_image TEXT,

  -- Role within org
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'

  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'invited', 'active', 'suspended'
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, user_email)
);

CREATE INDEX idx_ct_members_email ON ct_organization_members(user_email);
CREATE INDEX idx_ct_members_org ON ct_organization_members(organization_id);

-- ============================================================
-- 3. ORGANIZATION INVITATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  invited_by TEXT, -- email of inviter
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_invitations_token ON ct_organization_invitations(token);
CREATE INDEX idx_ct_invitations_email ON ct_organization_invitations(email);

-- ============================================================
-- 4. CONNECTED STORES (Customer's own store)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_connected_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  -- Store details
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'shopify', 'bigcommerce', 'woocommerce', 'manual'
  store_url TEXT NOT NULL,

  -- OAuth/API credentials (encrypted)
  credentials JSONB, -- stored encrypted: access_token, api_key, etc.

  -- Sync status
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'synced', 'error'
  sync_error TEXT,
  product_count INTEGER DEFAULT 0,

  -- Settings
  auto_sync BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_stores_org ON ct_connected_stores(organization_id);

-- ============================================================
-- 5. MY PRODUCTS (Customer's synced products)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_my_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES ct_connected_stores(id) ON DELETE CASCADE,

  -- Product identifiers
  external_id TEXT, -- ID from their platform
  sku TEXT,
  barcode TEXT,

  -- Product details
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  description TEXT,

  -- Pricing
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  cost DECIMAL(10,2),
  currency TEXT DEFAULT 'AUD',

  -- Inventory
  stock_quantity INTEGER,
  in_stock BOOLEAN DEFAULT true,

  -- Images
  image_url TEXT,

  -- Metadata for matching
  keywords TEXT[], -- extracted keywords for fuzzy matching
  normalized_name TEXT, -- lowercase, stripped for matching

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_my_products_org ON ct_my_products(organization_id);
CREATE INDEX idx_ct_my_products_sku ON ct_my_products(organization_id, sku);
CREATE INDEX idx_ct_my_products_name ON ct_my_products USING gin(to_tsvector('english', name));
CREATE INDEX idx_ct_my_products_normalized ON ct_my_products(organization_id, normalized_name);

-- ============================================================
-- 6. COMPETITORS
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  -- Competitor details
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo_url TEXT,

  -- Scraping config
  platform_detected TEXT, -- 'shopify', 'bigcommerce', 'woocommerce', 'custom'
  scrape_config JSONB, -- custom scraping rules if needed

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  scrape_status TEXT DEFAULT 'pending', -- 'pending', 'scraping', 'completed', 'error'
  scrape_error TEXT,
  product_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_competitors_org ON ct_competitors(organization_id);

-- ============================================================
-- 7. COMPETITOR PRODUCTS (Scraped products)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_competitor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES ct_competitors(id) ON DELETE CASCADE,

  -- Product identifiers
  external_id TEXT, -- from competitor site
  external_url TEXT, -- product page URL

  -- Product details
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  description TEXT,

  -- Pricing
  price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  currency TEXT DEFAULT 'AUD',

  -- Stock status
  in_stock BOOLEAN,

  -- Images
  image_url TEXT,

  -- Metadata for matching
  normalized_name TEXT,
  keywords TEXT[],

  -- Matching status
  match_status TEXT DEFAULT 'unmatched', -- 'unmatched', 'matched', 'no_match', 'ignored'

  -- Timestamps
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_competitor_products_org ON ct_competitor_products(organization_id);
CREATE INDEX idx_ct_competitor_products_competitor ON ct_competitor_products(competitor_id);
CREATE INDEX idx_ct_competitor_products_match ON ct_competitor_products(organization_id, match_status);
CREATE INDEX idx_ct_competitor_products_name ON ct_competitor_products USING gin(to_tsvector('english', name));

-- ============================================================
-- 8. PRODUCT PAIRINGS (Matches between my products & competitor)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_product_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  my_product_id UUID NOT NULL REFERENCES ct_my_products(id) ON DELETE CASCADE,
  competitor_product_id UUID NOT NULL REFERENCES ct_competitor_products(id) ON DELETE CASCADE,

  -- Match metadata
  match_type TEXT NOT NULL DEFAULT 'manual', -- 'auto', 'manual', 'suggested'
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00 for auto matches
  match_reason TEXT, -- 'sku_match', 'barcode_match', 'name_similarity', 'manual'

  -- User confirmation
  confirmed BOOLEAN DEFAULT false,
  confirmed_by TEXT, -- user email
  confirmed_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(my_product_id, competitor_product_id)
);

CREATE INDEX idx_ct_pairings_org ON ct_product_pairings(organization_id);
CREATE INDEX idx_ct_pairings_my_product ON ct_product_pairings(my_product_id);
CREATE INDEX idx_ct_pairings_competitor ON ct_product_pairings(competitor_product_id);
CREATE INDEX idx_ct_pairings_unconfirmed ON ct_product_pairings(organization_id) WHERE confirmed = false;

-- ============================================================
-- 9. PRICE HISTORY (Track price changes over time)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  pairing_id UUID NOT NULL REFERENCES ct_product_pairings(id) ON DELETE CASCADE,

  -- Snapshot
  my_price DECIMAL(10,2),
  competitor_price DECIMAL(10,2),
  price_difference DECIMAL(10,2), -- my_price - competitor_price
  price_difference_pct DECIMAL(5,2), -- percentage difference

  -- Who's cheaper
  cheaper TEXT, -- 'me', 'competitor', 'same'

  -- Recorded at
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_price_history_pairing ON ct_price_history(pairing_id);
CREATE INDEX idx_ct_price_history_date ON ct_price_history(organization_id, recorded_at DESC);

-- Partition by month for performance (optional, enable for high volume)
-- CREATE INDEX idx_ct_price_history_month ON ct_price_history(organization_id, date_trunc('month', recorded_at));

-- ============================================================
-- 10. ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  -- Alert config
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'price_drop', 'price_increase', 'out_of_stock', 'new_product', 'threshold'

  -- Conditions
  threshold_value DECIMAL(10,2), -- e.g., 5 for 5% or $5
  threshold_type TEXT, -- 'percentage', 'absolute'
  competitor_id UUID REFERENCES ct_competitors(id), -- null = all competitors

  -- Notifications
  notify_email BOOLEAN DEFAULT true,
  notify_webhook BOOLEAN DEFAULT false,
  webhook_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_alerts_org ON ct_alerts(organization_id);

-- ============================================================
-- 11. ALERT EVENTS (Triggered alerts)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES ct_alerts(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL,
  pairing_id UUID REFERENCES ct_product_pairings(id),

  -- Values at trigger
  previous_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  change_value DECIMAL(10,2),
  change_pct DECIMAL(5,2),

  -- Product context
  my_product_name TEXT,
  competitor_name TEXT,
  competitor_product_name TEXT,

  -- Notification status
  email_sent_at TIMESTAMPTZ,
  webhook_sent_at TIMESTAMPTZ,

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamp
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_alert_events_org ON ct_alert_events(organization_id);
CREATE INDEX idx_ct_alert_events_unread ON ct_alert_events(organization_id) WHERE is_read = false;
CREATE INDEX idx_ct_alert_events_date ON ct_alert_events(organization_id, triggered_at DESC);

-- ============================================================
-- 12. USAGE TRACKING (For billing)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Counts
  products_tracked INTEGER DEFAULT 0,
  competitors_tracked INTEGER DEFAULT 0,
  price_checks INTEGER DEFAULT 0,
  alerts_triggered INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, period_start)
);

CREATE INDEX idx_ct_usage_org ON ct_usage(organization_id);

-- ============================================================
-- 13. API KEYS (For programmatic access)
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES ct_organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "ct_live_a1b2c3d4...")
  key_hash TEXT NOT NULL, -- SHA256 hash of full key

  -- Permissions
  scopes TEXT[] DEFAULT ARRAY['read'], -- 'read', 'write', 'admin'

  -- Limits
  rate_limit_per_minute INTEGER DEFAULT 60,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_api_keys_org ON ct_api_keys(organization_id);
CREATE INDEX idx_ct_api_keys_prefix ON ct_api_keys(key_prefix);
CREATE INDEX idx_ct_api_keys_hash ON ct_api_keys(key_hash);

-- ============================================================
-- 14. AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS ct_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES ct_organizations(id) ON DELETE SET NULL,

  -- Actor
  actor_email TEXT,
  actor_type TEXT, -- 'user', 'api', 'system'

  -- Action
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'sync', 'scrape'
  resource_type TEXT NOT NULL, -- 'store', 'competitor', 'pairing', 'alert'
  resource_id UUID,

  -- Details
  details JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_audit_org ON ct_audit_log(organization_id);
CREATE INDEX idx_ct_audit_date ON ct_audit_log(created_at DESC);

-- ============================================================
-- PLAN LIMITS REFERENCE
-- ============================================================

COMMENT ON TABLE ct_organizations IS '
Plan Limits:
- trial: 100 products, 2 competitors, 1 user, 14 days
- starter ($29/mo): 100 products, 2 competitors, 2 users
- growth ($79/mo): 500 products, 5 competitors, 5 users
- pro ($199/mo): 2000 products, 10 competitors, 10 users
- enterprise: unlimited (custom pricing)
';

-- ============================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================

ALTER TABLE ct_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_connected_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_my_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_competitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_product_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "service_role_all" ON ct_organizations FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_organization_members FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_organization_invitations FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_connected_stores FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_my_products FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_competitors FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_competitor_products FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_product_pairings FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_price_history FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_alerts FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_alert_events FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_usage FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_api_keys FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON ct_audit_log FOR ALL TO service_role USING (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get user's organization IDs
CREATE OR REPLACE FUNCTION ct_get_user_orgs(user_email TEXT)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(organization_id)
  FROM ct_organization_members
  WHERE ct_organization_members.user_email = $1
  AND status = 'active';
$$ LANGUAGE SQL STABLE;

-- Check if user has access to organization
CREATE OR REPLACE FUNCTION ct_user_has_org_access(user_email TEXT, org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM ct_organization_members
    WHERE organization_id = org_id
    AND ct_organization_members.user_email = $1
    AND status = 'active'
  );
$$ LANGUAGE SQL STABLE;

-- Get plan limits
CREATE OR REPLACE FUNCTION ct_get_plan_limits(plan_name TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE plan_name
    WHEN 'trial' THEN '{"max_products": 100, "max_competitors": 2, "max_users": 1}'::jsonb
    WHEN 'starter' THEN '{"max_products": 100, "max_competitors": 2, "max_users": 2}'::jsonb
    WHEN 'growth' THEN '{"max_products": 500, "max_competitors": 5, "max_users": 5}'::jsonb
    WHEN 'pro' THEN '{"max_products": 2000, "max_competitors": 10, "max_users": 10}'::jsonb
    WHEN 'enterprise' THEN '{"max_products": -1, "max_competitors": -1, "max_users": -1}'::jsonb
    ELSE '{"max_products": 0, "max_competitors": 0, "max_users": 0}'::jsonb
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate pricing tier based on products/competitors
CREATE OR REPLACE FUNCTION ct_calculate_required_plan(product_count INTEGER, competitor_count INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF product_count <= 100 AND competitor_count <= 2 THEN
    RETURN 'starter';
  ELSIF product_count <= 500 AND competitor_count <= 5 THEN
    RETURN 'growth';
  ELSIF product_count <= 2000 AND competitor_count <= 10 THEN
    RETURN 'pro';
  ELSE
    RETURN 'enterprise';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fuzzy match score function
CREATE OR REPLACE FUNCTION ct_fuzzy_match_score(name1 TEXT, name2 TEXT)
RETURNS DECIMAL AS $$
DECLARE
  n1 TEXT;
  n2 TEXT;
  similarity_score DECIMAL;
BEGIN
  -- Normalize names
  n1 := lower(regexp_replace(name1, '[^a-zA-Z0-9\s]', '', 'g'));
  n2 := lower(regexp_replace(name2, '[^a-zA-Z0-9\s]', '', 'g'));

  -- Use trigram similarity if extension is available
  BEGIN
    SELECT similarity(n1, n2) INTO similarity_score;
  EXCEPTION WHEN undefined_function THEN
    -- Fallback to basic word match if pg_trgm not available
    similarity_score := (
      SELECT COUNT(*)::DECIMAL / GREATEST(
        array_length(regexp_split_to_array(n1, '\s+'), 1),
        array_length(regexp_split_to_array(n2, '\s+'), 1)
      )
      FROM unnest(regexp_split_to_array(n1, '\s+')) AS w1
      WHERE w1 = ANY(regexp_split_to_array(n2, '\s+'))
    );
  END;

  RETURN COALESCE(similarity_score, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- VIEWS
-- ============================================================

-- Price comparison view
CREATE OR REPLACE VIEW ct_price_comparison AS
SELECT
  p.organization_id,
  p.id AS pairing_id,
  mp.name AS my_product_name,
  mp.sku AS my_sku,
  mp.price AS my_price,
  c.name AS competitor_name,
  cp.name AS competitor_product_name,
  cp.price AS competitor_price,
  cp.sale_price AS competitor_sale_price,
  COALESCE(cp.sale_price, cp.price) AS competitor_best_price,
  mp.price - COALESCE(cp.sale_price, cp.price) AS price_diff,
  CASE
    WHEN mp.price > COALESCE(cp.sale_price, cp.price) THEN 'competitor'
    WHEN mp.price < COALESCE(cp.sale_price, cp.price) THEN 'me'
    ELSE 'same'
  END AS cheaper,
  ROUND(((mp.price - COALESCE(cp.sale_price, cp.price)) / NULLIF(mp.price, 0)) * 100, 1) AS price_diff_pct,
  p.confirmed,
  cp.last_scraped_at
FROM ct_product_pairings p
JOIN ct_my_products mp ON p.my_product_id = mp.id
JOIN ct_competitor_products cp ON p.competitor_product_id = cp.id
JOIN ct_competitors c ON cp.competitor_id = c.id
WHERE p.is_active = true;

-- Organization summary view
CREATE OR REPLACE VIEW ct_organization_summary AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.plan,
  o.plan_status,
  o.max_products,
  o.max_competitors,
  (SELECT COUNT(*) FROM ct_my_products WHERE organization_id = o.id AND is_active = true) AS current_products,
  (SELECT COUNT(*) FROM ct_competitors WHERE organization_id = o.id AND is_active = true) AS current_competitors,
  (SELECT COUNT(*) FROM ct_organization_members WHERE organization_id = o.id AND status = 'active') AS current_users,
  (SELECT COUNT(*) FROM ct_product_pairings WHERE organization_id = o.id AND confirmed = true) AS confirmed_pairings,
  (SELECT COUNT(*) FROM ct_product_pairings WHERE organization_id = o.id AND confirmed = false) AS pending_pairings,
  (SELECT COUNT(*) FROM ct_alert_events WHERE organization_id = o.id AND is_read = false) AS unread_alerts,
  o.created_at
FROM ct_organizations o;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION ct_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ct_organizations_updated BEFORE UPDATE ON ct_organizations FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_organization_members_updated BEFORE UPDATE ON ct_organization_members FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_connected_stores_updated BEFORE UPDATE ON ct_connected_stores FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_my_products_updated BEFORE UPDATE ON ct_my_products FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_competitors_updated BEFORE UPDATE ON ct_competitors FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_competitor_products_updated BEFORE UPDATE ON ct_competitor_products FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_product_pairings_updated BEFORE UPDATE ON ct_product_pairings FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_alerts_updated BEFORE UPDATE ON ct_alerts FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();
CREATE TRIGGER ct_usage_updated BEFORE UPDATE ON ct_usage FOR EACH ROW EXECUTE FUNCTION ct_update_timestamp();

-- Auto-populate normalized name for matching
CREATE OR REPLACE FUNCTION ct_normalize_product_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9\s]', '', 'g'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ct_my_products_normalize BEFORE INSERT OR UPDATE OF name ON ct_my_products FOR EACH ROW EXECUTE FUNCTION ct_normalize_product_name();
CREATE TRIGGER ct_competitor_products_normalize BEFORE INSERT OR UPDATE OF name ON ct_competitor_products FOR EACH ROW EXECUTE FUNCTION ct_normalize_product_name();

-- Record price history on pairing price change
CREATE OR REPLACE FUNCTION ct_record_price_history()
RETURNS TRIGGER AS $$
DECLARE
  my_price DECIMAL;
  comp_price DECIMAL;
BEGIN
  -- Get current prices
  SELECT mp.price INTO my_price
  FROM ct_my_products mp
  WHERE mp.id = NEW.my_product_id;

  SELECT COALESCE(cp.sale_price, cp.price) INTO comp_price
  FROM ct_competitor_products cp
  WHERE cp.id = NEW.competitor_product_id;

  -- Insert history record
  INSERT INTO ct_price_history (
    organization_id, pairing_id, my_price, competitor_price,
    price_difference, price_difference_pct, cheaper
  ) VALUES (
    NEW.organization_id,
    NEW.id,
    my_price,
    comp_price,
    my_price - comp_price,
    ROUND(((my_price - comp_price) / NULLIF(my_price, 0)) * 100, 2),
    CASE
      WHEN my_price > comp_price THEN 'competitor'
      WHEN my_price < comp_price THEN 'me'
      ELSE 'same'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ct_pairings_record_history
AFTER INSERT ON ct_product_pairings
FOR EACH ROW
WHEN (NEW.confirmed = true)
EXECUTE FUNCTION ct_record_price_history();

COMMENT ON TABLE ct_organizations IS 'Multi-tenant organizations for the Competitor Tracking SaaS';
