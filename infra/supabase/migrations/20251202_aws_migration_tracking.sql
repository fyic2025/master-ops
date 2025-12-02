-- AWS Migration Tracking Schema
-- Tracks the migration progress from AWS (RDS/S3) to Supabase
-- Created: 2025-12-02

-- ============================================================================
-- AWS Migration Status Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_aws_migration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Component being migrated
  component TEXT NOT NULL,
  component_type TEXT CHECK (component_type IN ('database', 'storage', 'compute', 'integration', 'data')),

  -- Migration phase and status
  phase TEXT CHECK (phase IN ('discovery', 'planning', 'migration', 'validation', 'cutover', 'completed')) DEFAULT 'discovery',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'not_required')) DEFAULT 'pending',

  -- Progress tracking
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),

  -- Details
  aws_service TEXT, -- e.g., 'RDS', 'S3', 'EC2', 'Lambda'
  aws_resource TEXT, -- e.g., 'newsync6', 'fyic-log'
  supabase_replacement TEXT, -- e.g., 'dashboard_* tables', 'Cloudinary'

  -- Data volume (for planning)
  record_count BIGINT,
  data_size_mb DECIMAL(10,2),

  -- Blockers and notes
  blockers TEXT[],
  notes TEXT,
  dependencies TEXT[], -- Other components that must migrate first

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_aws_migration_status ON dashboard_aws_migration(status);
CREATE INDEX IF NOT EXISTS idx_aws_migration_phase ON dashboard_aws_migration(phase);
CREATE INDEX IF NOT EXISTS idx_aws_migration_component ON dashboard_aws_migration(component);

-- ============================================================================
-- AWS Migration Milestones
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_aws_migration_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  milestone_name TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed_date DATE,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')) DEFAULT 'pending',

  -- Related components
  related_components TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AWS Migration Activity Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_aws_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  component TEXT,
  action TEXT NOT NULL, -- e.g., 'schema_created', 'data_exported', 'data_imported', 'validated'
  message TEXT,
  details JSONB,

  -- Who/what performed the action
  actor TEXT, -- e.g., 'claude', 'manual', 'n8n'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aws_migration_log_component ON dashboard_aws_migration_log(component);
CREATE INDEX IF NOT EXISTS idx_aws_migration_log_created ON dashboard_aws_migration_log(created_at DESC);

-- ============================================================================
-- Seed Initial Migration Components
-- ============================================================================
INSERT INTO dashboard_aws_migration (
  component, component_type, aws_service, aws_resource, supabase_replacement,
  phase, status, progress_percent, record_count, data_size_mb, notes, dependencies
) VALUES
  -- RDS Database - BOO Products
  ('BOO Products', 'database', 'RDS', 'newsync6.new_fyic_db.bc_products',
   'Supabase bc_products table', 'planning', 'pending', 40,
   11357, 25.0, 'BigCommerce product catalog - schema ready, needs data migration', ARRAY[]::TEXT[]),

  -- RDS Database - BOO Orders
  ('BOO Orders', 'database', 'RDS', 'newsync6.new_fyic_db.bc_orders',
   'Supabase bc_orders table', 'planning', 'pending', 30,
   157126, 150.0, 'Historical order data - large volume', ARRAY['BOO Products']),

  -- RDS Database - Oborne Supplier
  ('Oborne Supplier Data', 'database', 'RDS', 'newsync6.new_fyic_db.oborne_products',
   'Supabase oborne_products table', 'planning', 'pending', 20,
   8570, 5.0, 'Oborne product feed - synced via FTP every 2 hours', ARRAY[]::TEXT[]),

  -- RDS Database - Oborne Stock History
  ('Oborne Stock History', 'database', 'RDS', 'newsync6.new_fyic_db.oborne_stocks',
   'Supabase stock_history table', 'discovery', 'pending', 10,
   3400000, 500.0, 'Historical stock tracking - 3.4M records, need archival strategy', ARRAY['Oborne Supplier Data']),

  -- RDS Database - UHP Supplier
  ('UHP Supplier Data', 'database', 'RDS', 'newsync6.new_fyic_db.uhp_products',
   'Supabase uhp_products table', 'planning', 'pending', 20,
   4501, 3.0, 'UHP product feed - synced via HTTPS Excel', ARRAY[]::TEXT[]),

  -- RDS Database - Kadac Supplier
  ('Kadac Supplier Data', 'database', 'RDS', 'newsync6.new_fyic_db.kadac_products',
   'Supabase kadac_products table', 'planning', 'pending', 20,
   945, 1.0, 'Kadac product feed - synced via REST API', ARRAY[]::TEXT[]),

  -- RDS Database - KIK/Teelixir
  ('KIK Supplier Data', 'database', 'RDS', 'newsync6.new_fyic_db.kik_products',
   'Supabase kik_products table', 'planning', 'pending', 20,
   424, 0.5, 'KIK/Teelixir products - synced via Unleashed API', ARRAY[]::TEXT[]),

  -- RDS Database - Klaviyo Profiles
  ('Klaviyo Profiles', 'database', 'RDS', 'newsync6.new_fyic_db.klaviyo_profiles',
   'Supabase klaviyo_profiles table', 'completed', 'completed', 100,
   36938, 15.0, 'Already migrated to Supabase', ARRAY[]::TEXT[]),

  -- RDS Database - AI Scores
  ('AI Content Scores', 'database', 'RDS', 'newsync6.new_fyic_db.bc_ai_score',
   'Supabase bc_ai_score table', 'planning', 'pending', 15,
   10347, 2.0, 'Product description AI quality scores', ARRAY['BOO Products']),

  -- RDS Database - Cron Logs
  ('Sync Cron Logs', 'database', 'RDS', 'newsync6.new_fyic_db.crons',
   'Supabase integration_logs table', 'migration', 'in_progress', 60,
   1037, 5.0, 'Cron execution history - being replaced by dashboard_job_status', ARRAY[]::TEXT[]),

  -- S3 Storage
  ('S3 Log Storage', 'storage', 'S3', 'fyic-log bucket',
   'Supabase Storage or Cloudinary', 'planning', 'pending', 25,
   NULL, 50.0, 'Sync execution logs stored in S3 - evaluate if needed', ARRAY['Sync Cron Logs']),

  -- EC2 Compute (fyic-portal)
  ('FYIC Portal App', 'compute', 'EC2', 'dev.growthcohq.com (170.64.223.141)',
   'n8n workflows + Supabase Edge Functions', 'planning', 'in_progress', 35,
   NULL, NULL, 'Node.js sync app - being replaced by n8n workflows',
   ARRAY['Oborne Supplier Data', 'UHP Supplier Data', 'Kadac Supplier Data', 'KIK Supplier Data']),

  -- Teelixir (Already Migrated)
  ('Teelixir Orders', 'database', 'RDS', 'N/A - Shopify Direct',
   'Supabase tlx_shopify_orders', 'completed', 'completed', 100,
   30535, 20.0, 'Fully migrated - pulling direct from Shopify to Supabase', ARRAY[]::TEXT[]),

  -- Teelixir Anniversary
  ('Teelixir Automations', 'integration', 'N/A', 'N/A',
   'Supabase tlx_anniversary_* tables', 'completed', 'completed', 100,
   NULL, NULL, 'Anniversary automation fully in Supabase', ARRAY[]::TEXT[]),

  -- Image Storage
  ('Product Images', 'storage', 'S3', 'N/A - Was S3',
   'Cloudinary', 'completed', 'completed', 100,
   NULL, NULL, 'Images now served via Cloudinary with optimization', ARRAY[]::TEXT[])

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Seed Initial Milestones
-- ============================================================================
INSERT INTO dashboard_aws_migration_milestones (
  milestone_name, description, target_date, status, related_components
) VALUES
  ('Discovery Complete', 'All AWS resources identified and documented', '2025-11-30', 'completed',
   ARRAY['BOO Products', 'BOO Orders', 'FYIC Portal App']),

  ('Supabase Schemas Ready', 'All database schemas created in Supabase', '2025-12-05', 'in_progress',
   ARRAY['BOO Products', 'BOO Orders', 'Oborne Supplier Data', 'UHP Supplier Data', 'Kadac Supplier Data']),

  ('n8n Workflows Built', 'All supplier sync workflows replicated in n8n', '2025-12-15', 'pending',
   ARRAY['FYIC Portal App', 'Oborne Supplier Data', 'UHP Supplier Data', 'Kadac Supplier Data', 'KIK Supplier Data']),

  ('Data Migration Complete', 'All historical data migrated to Supabase', '2025-12-20', 'pending',
   ARRAY['BOO Products', 'BOO Orders', 'Oborne Stock History', 'AI Content Scores']),

  ('Parallel Run Started', 'Both systems running simultaneously for validation', '2025-12-22', 'pending',
   ARRAY['FYIC Portal App']),

  ('AWS Shutdown', 'All AWS resources decommissioned', '2026-01-15', 'pending',
   ARRAY['S3 Log Storage', 'FYIC Portal App'])

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Helper Function: Update Migration Progress
-- ============================================================================
CREATE OR REPLACE FUNCTION update_aws_migration_progress(
  p_component TEXT,
  p_phase TEXT,
  p_status TEXT,
  p_progress INTEGER,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE dashboard_aws_migration
  SET
    phase = COALESCE(p_phase, phase),
    status = COALESCE(p_status, status),
    progress_percent = COALESCE(p_progress, progress_percent),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW(),
    started_at = CASE WHEN p_status = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END
  WHERE component = p_component;

  -- Log the update
  INSERT INTO dashboard_aws_migration_log (component, action, message, actor)
  VALUES (p_component, 'status_update',
          format('Phase: %s, Status: %s, Progress: %s%%', p_phase, p_status, p_progress),
          'system');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- View: Migration Summary
-- ============================================================================
CREATE OR REPLACE VIEW v_aws_migration_summary AS
SELECT
  COUNT(*) as total_components,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
  ROUND(AVG(progress_percent)::NUMERIC, 1) as overall_progress,
  SUM(record_count) as total_records,
  SUM(data_size_mb) as total_data_mb
FROM dashboard_aws_migration
WHERE status != 'not_required';

-- ============================================================================
-- RLS Policies (Permissive for service role)
-- ============================================================================
ALTER TABLE dashboard_aws_migration ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_aws_migration_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_aws_migration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON dashboard_aws_migration
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON dashboard_aws_migration_milestones
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON dashboard_aws_migration_log
  FOR ALL USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON dashboard_aws_migration TO service_role;
GRANT ALL ON dashboard_aws_migration_milestones TO service_role;
GRANT ALL ON dashboard_aws_migration_log TO service_role;
GRANT ALL ON v_aws_migration_summary TO service_role;
