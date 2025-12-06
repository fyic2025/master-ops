-- ============================================================================
-- COMBINED MIGRATIONS FOR 2025-12-06
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new
-- ============================================================================

-- ============================================================================
-- 1. BOO CHECKOUT HEALTH MONITORING
-- ============================================================================

-- Checkout health config table
CREATE TABLE IF NOT EXISTS boo_checkout_health_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configs
INSERT INTO boo_checkout_health_config (check_type, enabled, config) VALUES
('error_analysis', true, '{"threshold": 5, "lookback_hours": 1, "alert_on_spike": true}'::jsonb),
('inventory', true, '{"zero_stock_alert": true, "low_stock_threshold": 5, "check_visible_only": true}'::jsonb),
('shipping', true, '{"test_postcodes": ["3000", "2000", "4000", "6000", "5000", "7000"], "carriers": ["australia_post", "sendle"], "timeout_seconds": 30}'::jsonb),
('api_health', true, '{"error_rate_threshold": 0.1, "lookback_hours": 1}'::jsonb)
ON CONFLICT (check_type) DO UPDATE SET
  config = EXCLUDED.config,
  updated_at = NOW();

-- Checkout health issues table
CREATE TABLE IF NOT EXISTS boo_checkout_health_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL REFERENCES boo_checkout_health_config(check_type),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_issues_check_type ON boo_checkout_health_issues(check_type);
CREATE INDEX IF NOT EXISTS idx_health_issues_status ON boo_checkout_health_issues(status);
CREATE INDEX IF NOT EXISTS idx_health_issues_severity ON boo_checkout_health_issues(severity);
CREATE INDEX IF NOT EXISTS idx_health_issues_detected ON boo_checkout_health_issues(detected_at DESC);

-- Function to update config after health check run
CREATE OR REPLACE FUNCTION boo_update_health_check_result(
  p_check_type TEXT,
  p_result JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE boo_checkout_health_config
  SET
    last_run_at = NOW(),
    last_run_result = p_result,
    updated_at = NOW()
  WHERE check_type = p_check_type;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE boo_checkout_health_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_checkout_health_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access config" ON boo_checkout_health_config;
CREATE POLICY "Service role full access config" ON boo_checkout_health_config FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access issues" ON boo_checkout_health_issues;
CREATE POLICY "Service role full access issues" ON boo_checkout_health_issues FOR ALL USING (true);


-- ============================================================================
-- 2. STOCK FIX QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_fix_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL,
  bc_product_id INTEGER,
  sku VARCHAR(50),
  product_name TEXT,
  action TEXT NOT NULL,
  params JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  initiated_by TEXT,
  source_page TEXT,
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  bc_response JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_fix_queue_status ON stock_fix_queue(status);
CREATE INDEX IF NOT EXISTS idx_stock_fix_queue_pending ON stock_fix_queue(status, priority, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_stock_fix_queue_product ON stock_fix_queue(product_id);

CREATE OR REPLACE FUNCTION update_stock_fix_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_fix_queue_updated_at ON stock_fix_queue;
CREATE TRIGGER trigger_stock_fix_queue_updated_at
  BEFORE UPDATE ON stock_fix_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_fix_queue_updated_at();


-- ============================================================================
-- 3. STOCK FIX LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_fix_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES stock_fix_queue(id),
  product_id INTEGER NOT NULL,
  bc_product_id INTEGER,
  sku VARCHAR(50),
  product_name TEXT,
  action TEXT NOT NULL,
  params JSONB,
  result TEXT NOT NULL,
  bc_response JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_fix_log_product ON stock_fix_log(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_fix_log_executed ON stock_fix_log(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_fix_log_result ON stock_fix_log(result);


-- ============================================================================
-- 4. DISPATCH FIX STATUS - SKIPPED (table doesn't exist yet)
-- ============================================================================
-- Will be added when dispatch_problem_products table is created


-- ============================================================================
-- 5. SEO FIX TRACKING - SKIPPED (gsc_issue_urls table doesn't exist yet)
-- ============================================================================
-- Will be added when gsc_issue_urls table is created


-- ============================================================================
-- 6. DASHBOARD PAGES MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  page_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  business_scope TEXT[],
  implementation_status TEXT DEFAULT 'implemented',
  features JSONB DEFAULT '{}',
  dependencies TEXT[],
  skills_required TEXT[],
  last_analyzed_at TIMESTAMPTZ,
  last_modified_at TIMESTAMPTZ,
  file_hash TEXT,
  analysis_results JSONB,
  improvement_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_improvement_score CHECK (improvement_score IS NULL OR (improvement_score >= 0 AND improvement_score <= 100)),
  CONSTRAINT valid_implementation_status CHECK (implementation_status IN ('implemented', 'coming_soon', 'placeholder', 'deprecated'))
);

CREATE INDEX IF NOT EXISTS idx_dashboard_pages_category ON dashboard_pages(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_status ON dashboard_pages(implementation_status);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_score ON dashboard_pages(improvement_score);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_last_analyzed ON dashboard_pages(last_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_stale ON dashboard_pages(last_analyzed_at NULLS FIRST);

CREATE TABLE IF NOT EXISTS dashboard_page_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES dashboard_pages(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analyzer_agent TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '{}',
  priority_score INT,
  estimated_effort TEXT,
  suggested_tasks JSONB,
  skills_used TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('ux', 'performance', 'accessibility', 'code_quality', 'comprehensive')),
  CONSTRAINT valid_priority CHECK (priority_score IS NULL OR (priority_score >= 1 AND priority_score <= 10)),
  CONSTRAINT valid_effort CHECK (estimated_effort IS NULL OR estimated_effort IN ('small', 'medium', 'large'))
);

CREATE INDEX IF NOT EXISTS idx_page_analysis_page_id ON dashboard_page_analysis(page_id);
CREATE INDEX IF NOT EXISTS idx_page_analysis_analyzed_at ON dashboard_page_analysis(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_analysis_type ON dashboard_page_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_page_analysis_agent ON dashboard_page_analysis(analyzer_agent);

CREATE TABLE IF NOT EXISTS dashboard_page_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES dashboard_pages(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES dashboard_page_analysis(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  improvement_type TEXT NOT NULL,
  priority_score INT DEFAULT 5,
  estimated_effort TEXT DEFAULT 'medium',
  suggested_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending_review',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  execution_type TEXT,
  task_id UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_improvement_type CHECK (improvement_type IN ('ux', 'performance', 'feature', 'code_quality')),
  CONSTRAINT valid_priority CHECK (priority_score >= 1 AND priority_score <= 10),
  CONSTRAINT valid_effort CHECK (estimated_effort IN ('small', 'medium', 'large')),
  CONSTRAINT valid_status CHECK (status IN ('pending_review', 'approved_auto', 'approved_manual', 'rejected', 'completed')),
  CONSTRAINT valid_execution_type CHECK (execution_type IS NULL OR execution_type IN ('auto', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_improvements_page_id ON dashboard_page_improvements(page_id);
CREATE INDEX IF NOT EXISTS idx_improvements_status ON dashboard_page_improvements(status);
CREATE INDEX IF NOT EXISTS idx_improvements_pending ON dashboard_page_improvements(created_at DESC)
  WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_improvements_priority ON dashboard_page_improvements(priority_score DESC)
  WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_improvements_type ON dashboard_page_improvements(improvement_type);

-- RLS
ALTER TABLE dashboard_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_page_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_page_improvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on dashboard_pages" ON dashboard_pages;
CREATE POLICY "Service role full access on dashboard_pages" ON dashboard_pages FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access on dashboard_page_analysis" ON dashboard_page_analysis;
CREATE POLICY "Service role full access on dashboard_page_analysis" ON dashboard_page_analysis FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access on dashboard_page_improvements" ON dashboard_page_improvements;
CREATE POLICY "Service role full access on dashboard_page_improvements" ON dashboard_page_improvements FOR ALL USING (true);


-- ============================================================================
-- 7. RHF UNIT CONVERSION ENHANCEMENT
-- ============================================================================
-- Adds proper box → kg conversion support for RHF
-- Context: RHF buys in BOXES from suppliers but sells by KG to customers

-- Add weight_kg to supplier products
ALTER TABLE rhf_supplier_products
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,3);

COMMENT ON COLUMN rhf_supplier_products.weight_kg IS
  'Weight in kg for box/tray items. Parsed from unit_size or entered manually. Used for cost-per-kg calculation.';

-- Add supplier unit type (what form does supplier sell in)
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS supplier_unit_type TEXT DEFAULT 'box';

COMMENT ON COLUMN rhf_product_mappings.supplier_unit_type IS
  'Unit type supplier sells: box, tray, each, kg, bunch, punnet, pack';

-- Add weight per supplier unit
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS supplier_unit_kg DECIMAL(10,3);

COMMENT ON COLUMN rhf_product_mappings.supplier_unit_kg IS
  'Weight in kg per supplier unit. E.g., 11 for "11KG Box". NULL if sold by each/bunch.';

-- Add sell unit type (how RHF sells to customers)
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS sell_unit TEXT DEFAULT 'kg';

COMMENT ON COLUMN rhf_product_mappings.sell_unit IS
  'Unit type RHF sells: kg, each, bunch, punnet, pack';

-- Add calculated cost per sell unit
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS cost_per_sell_unit DECIMAL(10,4);

COMMENT ON COLUMN rhf_product_mappings.cost_per_sell_unit IS
  'Calculated cost per sell unit. For kg items: supplier_price / supplier_unit_kg';

-- Add margin percentage (for quick reference)
ALTER TABLE rhf_product_mappings
ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2);

COMMENT ON COLUMN rhf_product_mappings.margin_percent IS
  'Target or actual margin percentage. Calculated: (sell_price - cost_per_sell_unit) / sell_price * 100';

-- Helper view for cost calculations
CREATE OR REPLACE VIEW rhf_product_costs AS
SELECT
  pm.id AS mapping_id,
  wp.woo_id,
  wp.name AS woo_product_name,
  wp.price AS sell_price,
  sp.name AS supplier_product_name,
  sp.cost_price AS supplier_price,
  s.name AS supplier_name,
  s.code AS supplier_code,
  pm.is_primary,
  pm.supplier_unit_type,
  pm.supplier_unit_kg,
  pm.sell_unit,
  CASE
    WHEN pm.supplier_unit_kg IS NOT NULL AND pm.supplier_unit_kg > 0
    THEN sp.cost_price / pm.supplier_unit_kg
    WHEN sp.weight_kg IS NOT NULL AND sp.weight_kg > 0
    THEN sp.cost_price / sp.weight_kg
    ELSE sp.cost_price
  END AS calculated_cost_per_kg,
  CASE
    WHEN wp.price IS NOT NULL AND wp.price > 0 AND pm.supplier_unit_kg IS NOT NULL AND pm.supplier_unit_kg > 0
    THEN ROUND(((wp.price - (sp.cost_price / pm.supplier_unit_kg)) / wp.price * 100)::numeric, 2)
    ELSE NULL
  END AS calculated_margin_percent
FROM rhf_product_mappings pm
JOIN rhf_woo_products wp ON pm.woo_product_id = wp.id
JOIN rhf_supplier_products sp ON pm.supplier_product_id = sp.id
JOIN rhf_suppliers s ON sp.supplier_id = s.id;

-- Common unit weight reference table
CREATE TABLE IF NOT EXISTS rhf_unit_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_pattern TEXT NOT NULL,
  default_unit_type TEXT NOT NULL,
  default_weight_kg DECIMAL(10,3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rhf_unit_weights IS
  'Default weights for common products. Used to auto-fill weight_kg when parsing pricelists.';

-- Insert common defaults
INSERT INTO rhf_unit_weights (product_pattern, default_unit_type, default_weight_kg, notes) VALUES
  ('banana%', 'box', 13, 'Standard banana box ~13kg'),
  ('apple%', 'box', 18, 'Standard apple box ~18kg'),
  ('orange%', 'box', 15, 'Standard orange box ~15kg'),
  ('mandarin%', 'box', 10, 'Standard mandarin box ~10kg'),
  ('avocado%', 'tray', 5.5, 'Standard avocado tray ~5.5kg'),
  ('tomato%', 'box', 10, 'Standard tomato box ~10kg'),
  ('potato%', 'bag', 20, 'Standard potato bag ~20kg'),
  ('onion%', 'bag', 20, 'Standard onion bag ~20kg'),
  ('carrot%', 'bag', 10, 'Standard carrot bag ~10kg'),
  ('broccoli%', 'box', 8, 'Standard broccoli box ~8kg'),
  ('lettuce%', 'box', 6, 'Standard lettuce box ~6 heads'),
  ('capsicum%', 'box', 5, 'Standard capsicum box ~5kg'),
  ('strawberr%', 'punnet', 0.25, 'Standard strawberry punnet 250g'),
  ('blueberr%', 'punnet', 0.125, 'Standard blueberry punnet 125g'),
  ('grape%', 'box', 9, 'Standard grape box ~9kg'),
  ('mango%', 'tray', 7, 'Standard mango tray ~7kg'),
  ('mushroom%', 'box', 3, 'Standard mushroom box ~3kg'),
  ('asparagus%', 'bunch', 0.25, 'Standard asparagus bunch ~250g'),
  ('celery%', 'each', 0.7, 'Average celery ~700g each'),
  ('ginger%', 'kg', 1, 'Sold by kg'),
  ('garlic%', 'kg', 1, 'Sold by kg')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE rhf_unit_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to rhf_unit_weights" ON rhf_unit_weights;
CREATE POLICY "Allow read access to rhf_unit_weights" ON rhf_unit_weights FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow auth users to manage rhf_unit_weights" ON rhf_unit_weights;
CREATE POLICY "Allow auth users to manage rhf_unit_weights" ON rhf_unit_weights FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- DONE! All migrations applied.
-- ============================================================================
