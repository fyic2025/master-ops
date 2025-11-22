-- ============================================
-- Multi-Business Setup for Master Operations
-- Extends existing tables to support multiple businesses
-- ============================================

-- 1. Create business type enum
CREATE TYPE business_type AS ENUM (
  'redhillfresh',
  'teelixir',
  'ai_automation',
  'elevate_wholesale',
  'buy_organics',
  'master_ops'
);

-- 2. Add business column to existing tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS business business_type DEFAULT 'master_ops';
    CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_logs') THEN
    ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS business business_type;
    CREATE INDEX IF NOT EXISTS idx_task_logs_business ON task_logs(business);
  END IF;
END $$;

-- 3. Create business registry table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name business_type UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert your businesses
INSERT INTO businesses (name, display_name, description, settings) VALUES
  ('redhillfresh', 'Red Hill Fresh', 'Local delivery business - Thursday/Friday operations', '{"focus": "Retain + Attract", "days": ["Thursday", "Friday"]}'::jsonb),
  ('teelixir', 'Teelixir', 'Medicinal mushroom products', '{"focus": "Product + Wholesale"}'::jsonb),
  ('ai_automation', 'AI Automation Services', 'Service/Product business - Monday-Wednesday', '{"focus": "Attract + Convert", "days": ["Monday", "Tuesday", "Wednesday"]}'::jsonb),
  ('elevate_wholesale', 'Elevate Wholesale', 'B2B wholesale operations', '{"focus": "Ascend"}'::jsonb),
  ('buy_organics', 'Buy Organics Online', 'Online organic products', '{"focus": "Convert"}'::jsonb),
  ('master_ops', 'Master Operations', 'Central Business OS coordination', '{}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 5. Update RPC functions to support business context
CREATE OR REPLACE FUNCTION create_task_with_log(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_plan_json JSONB DEFAULT NULL,
  p_source TEXT DEFAULT 'system',
  p_business business_type DEFAULT 'master_ops'
)
RETURNS TABLE(task_id UUID, log_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
  v_log_id UUID;
BEGIN
  -- Insert task with business
  INSERT INTO tasks (title, description, plan_json, status, business)
  VALUES (p_title, p_description, p_plan_json, 'pending', p_business)
  RETURNING id INTO v_task_id;

  -- Log the creation
  INSERT INTO task_logs (task_id, source, status, message, business)
  VALUES (v_task_id, p_source, 'info', 'Task created: ' || p_title, p_business)
  RETURNING id INTO v_log_id;

  RETURN QUERY SELECT v_task_id, v_log_id;
END;
$$;

-- 6. Create view for business-specific tasks
CREATE OR REPLACE VIEW tasks_by_business AS
SELECT
  t.*,
  b.display_name as business_name,
  b.settings as business_settings,
  COUNT(tl.id) as log_count,
  MAX(tl.created_at) as last_log_at
FROM tasks t
JOIN businesses b ON t.business = b.name
LEFT JOIN task_logs tl ON t.id = tl.task_id
GROUP BY t.id, b.display_name, b.settings;

-- 7. Create function to get tasks for specific business
CREATE OR REPLACE FUNCTION get_business_tasks(
  p_business business_type,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  task_id UUID,
  title TEXT,
  status TEXT,
  business business_type,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.status,
    t.business,
    t.created_at
  FROM tasks t
  WHERE t.business = p_business
    AND (p_status IS NULL OR t.status = p_status)
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 8. Create cross-business analytics view
CREATE OR REPLACE VIEW business_task_summary AS
SELECT
  b.name as business,
  b.display_name,
  COUNT(t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'failed') as failed_tasks,
  COUNT(t.id) as total_tasks,
  MAX(t.updated_at) as last_activity
FROM businesses b
LEFT JOIN tasks t ON b.name = t.business
WHERE b.is_active = true
GROUP BY b.name, b.display_name
ORDER BY b.name;

-- 9. Create helper to switch business context
CREATE OR REPLACE FUNCTION set_business_context(p_business business_type)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_business', p_business::text, false);
END;
$$;

-- ============================================
-- Verification
-- ============================================

SELECT 'Multi-Business Setup Complete' as status;

SELECT
  'Businesses Registered' as check_type,
  COUNT(*) as count
FROM businesses;

SELECT
  'Business Tasks View' as check_type,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.views
    WHERE table_name = 'business_task_summary'
  ) THEN 'Created' ELSE 'Missing' END as status;

-- Expected: 6 businesses registered, view created
