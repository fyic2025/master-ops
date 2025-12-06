-- Dashboard Pages Monitoring System
-- Tracks all dashboard pages, their analysis history, and improvement suggestions
-- Created: 2024-12-06

-- =============================================================================
-- TABLE: dashboard_pages
-- Catalog of all pages in the dashboard application
-- =============================================================================
CREATE TABLE IF NOT EXISTS dashboard_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL UNIQUE,           -- e.g., '/:business/stock'
  file_path TEXT NOT NULL,              -- e.g., 'dashboard/src/app/(dashboard)/[business]/stock/page.tsx'
  page_name TEXT NOT NULL,              -- e.g., 'Stock Management'
  description TEXT,                     -- AI-generated purpose description
  category TEXT,                        -- operations, marketing, finance, infrastructure, etc.
  business_scope TEXT[],                -- ['all'] or ['teelixir', 'boo', 'elevate', 'rhf']
  implementation_status TEXT DEFAULT 'implemented', -- implemented, coming_soon, placeholder, deprecated
  features JSONB DEFAULT '{}',          -- {hasDataFetching: true, hasCharts: true, etc.}
  dependencies TEXT[],                  -- API routes, external services
  skills_required TEXT[],               -- Skills needed to work on this page
  last_analyzed_at TIMESTAMPTZ,
  last_modified_at TIMESTAMPTZ,         -- Track file changes
  file_hash TEXT,                       -- MD5 hash to detect code changes
  analysis_results JSONB,               -- Latest improvement analysis summary
  improvement_score INT,                -- 0-100 overall page quality
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_improvement_score CHECK (improvement_score IS NULL OR (improvement_score >= 0 AND improvement_score <= 100)),
  CONSTRAINT valid_implementation_status CHECK (implementation_status IN ('implemented', 'coming_soon', 'placeholder', 'deprecated'))
);

-- Indexes for dashboard_pages
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_category ON dashboard_pages(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_status ON dashboard_pages(implementation_status);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_score ON dashboard_pages(improvement_score);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_last_analyzed ON dashboard_pages(last_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_pages_stale ON dashboard_pages(last_analyzed_at)
  WHERE last_analyzed_at < NOW() - INTERVAL '7 days' OR last_analyzed_at IS NULL;

COMMENT ON TABLE dashboard_pages IS 'Catalog of all dashboard pages with metadata and improvement tracking';

-- =============================================================================
-- TABLE: dashboard_page_analysis
-- History of all page analyses performed by agents
-- =============================================================================
CREATE TABLE IF NOT EXISTS dashboard_page_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES dashboard_pages(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analyzer_agent TEXT NOT NULL,         -- 'continuous-improvement', 'ux-auditor', etc.
  analysis_type TEXT NOT NULL,          -- 'ux', 'performance', 'accessibility', 'code_quality', 'comprehensive'
  findings JSONB NOT NULL DEFAULT '{}', -- Structured improvement suggestions
  priority_score INT,                   -- 1-10 priority for improvements
  estimated_effort TEXT,                -- 'small', 'medium', 'large'
  suggested_tasks JSONB,                -- Pre-formatted task suggestions
  skills_used TEXT[],                   -- Skills activated during analysis
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('ux', 'performance', 'accessibility', 'code_quality', 'comprehensive')),
  CONSTRAINT valid_priority CHECK (priority_score IS NULL OR (priority_score >= 1 AND priority_score <= 10)),
  CONSTRAINT valid_effort CHECK (estimated_effort IS NULL OR estimated_effort IN ('small', 'medium', 'large'))
);

-- Indexes for dashboard_page_analysis
CREATE INDEX IF NOT EXISTS idx_page_analysis_page_id ON dashboard_page_analysis(page_id);
CREATE INDEX IF NOT EXISTS idx_page_analysis_analyzed_at ON dashboard_page_analysis(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_analysis_type ON dashboard_page_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_page_analysis_agent ON dashboard_page_analysis(analyzer_agent);

COMMENT ON TABLE dashboard_page_analysis IS 'History of all page analyses with findings and recommendations';

-- =============================================================================
-- TABLE: dashboard_page_improvements
-- Suggested improvements awaiting review
-- =============================================================================
CREATE TABLE IF NOT EXISTS dashboard_page_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES dashboard_pages(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES dashboard_page_analysis(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  improvement_type TEXT NOT NULL,       -- 'ux', 'performance', 'feature', 'code_quality'
  priority_score INT DEFAULT 5,         -- 1-10
  estimated_effort TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'
  suggested_by TEXT NOT NULL,           -- Agent that suggested this
  status TEXT DEFAULT 'pending_review', -- pending_review, approved_auto, approved_manual, rejected, completed
  reviewed_by TEXT,                     -- 'jayson' or supervisor agent
  reviewed_at TIMESTAMPTZ,
  execution_type TEXT,                  -- 'auto' or 'manual' (set after review)
  task_id UUID,                         -- FK to tasks table once created
  rejection_reason TEXT,                -- Why it was rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_improvement_type CHECK (improvement_type IN ('ux', 'performance', 'feature', 'code_quality')),
  CONSTRAINT valid_priority CHECK (priority_score >= 1 AND priority_score <= 10),
  CONSTRAINT valid_effort CHECK (estimated_effort IN ('small', 'medium', 'large')),
  CONSTRAINT valid_status CHECK (status IN ('pending_review', 'approved_auto', 'approved_manual', 'rejected', 'completed')),
  CONSTRAINT valid_execution_type CHECK (execution_type IS NULL OR execution_type IN ('auto', 'manual'))
);

-- Indexes for dashboard_page_improvements
CREATE INDEX IF NOT EXISTS idx_improvements_page_id ON dashboard_page_improvements(page_id);
CREATE INDEX IF NOT EXISTS idx_improvements_status ON dashboard_page_improvements(status);
CREATE INDEX IF NOT EXISTS idx_improvements_pending ON dashboard_page_improvements(created_at DESC)
  WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_improvements_priority ON dashboard_page_improvements(priority_score DESC)
  WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_improvements_type ON dashboard_page_improvements(improvement_type);

COMMENT ON TABLE dashboard_page_improvements IS 'Suggested improvements awaiting Jayson review with auto/manual assignment';

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Pending improvements for home page widget
CREATE OR REPLACE VIEW v_pending_improvements AS
SELECT
  i.id,
  i.title,
  i.description,
  i.improvement_type,
  i.priority_score,
  i.estimated_effort,
  i.suggested_by,
  i.created_at,
  p.page_name,
  p.route,
  p.category as page_category
FROM dashboard_page_improvements i
JOIN dashboard_pages p ON i.page_id = p.id
WHERE i.status = 'pending_review'
ORDER BY i.priority_score DESC, i.created_at ASC;

COMMENT ON VIEW v_pending_improvements IS 'Pending improvements for home page review widget';

-- View: Page health summary
CREATE OR REPLACE VIEW v_page_health_summary AS
SELECT
  p.id,
  p.page_name,
  p.route,
  p.category,
  p.implementation_status,
  p.improvement_score,
  p.last_analyzed_at,
  p.skills_required,
  COUNT(DISTINCT a.id) as total_analyses,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending_review') as pending_improvements,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_improvements,
  CASE
    WHEN p.last_analyzed_at IS NULL THEN 'never'
    WHEN p.last_analyzed_at < NOW() - INTERVAL '7 days' THEN 'stale'
    WHEN p.last_analyzed_at < NOW() - INTERVAL '1 day' THEN 'recent'
    ELSE 'fresh'
  END as analysis_freshness
FROM dashboard_pages p
LEFT JOIN dashboard_page_analysis a ON p.id = a.page_id
LEFT JOIN dashboard_page_improvements i ON p.id = i.page_id
GROUP BY p.id
ORDER BY p.category, p.page_name;

COMMENT ON VIEW v_page_health_summary IS 'Summary of page health for registry view';

-- View: Stale pages needing analysis
CREATE OR REPLACE VIEW v_stale_pages AS
SELECT
  id,
  page_name,
  route,
  category,
  last_analyzed_at,
  improvement_score,
  EXTRACT(DAYS FROM NOW() - COALESCE(last_analyzed_at, '2020-01-01'::timestamptz)) as days_since_analysis
FROM dashboard_pages
WHERE last_analyzed_at IS NULL
   OR last_analyzed_at < NOW() - INTERVAL '7 days'
ORDER BY last_analyzed_at ASC NULLS FIRST;

COMMENT ON VIEW v_stale_pages IS 'Pages needing analysis (not analyzed in 7+ days)';

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function: Log a new page analysis
CREATE OR REPLACE FUNCTION log_page_analysis(
  p_page_id UUID,
  p_analyzer_agent TEXT,
  p_analysis_type TEXT,
  p_findings JSONB,
  p_priority_score INT DEFAULT NULL,
  p_estimated_effort TEXT DEFAULT NULL,
  p_suggested_tasks JSONB DEFAULT NULL,
  p_skills_used TEXT[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_analysis_id UUID;
BEGIN
  INSERT INTO dashboard_page_analysis (
    page_id, analyzer_agent, analysis_type, findings,
    priority_score, estimated_effort, suggested_tasks, skills_used
  ) VALUES (
    p_page_id, p_analyzer_agent, p_analysis_type, p_findings,
    p_priority_score, p_estimated_effort, p_suggested_tasks, p_skills_used
  ) RETURNING id INTO v_analysis_id;

  -- Update page's last_analyzed_at
  UPDATE dashboard_pages
  SET
    last_analyzed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_page_id;

  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_page_analysis IS 'Log a page analysis and update page timestamp';

-- Function: Create improvement from analysis
CREATE OR REPLACE FUNCTION create_page_improvement(
  p_page_id UUID,
  p_analysis_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_improvement_type TEXT,
  p_priority_score INT DEFAULT 5,
  p_estimated_effort TEXT DEFAULT 'medium',
  p_suggested_by TEXT DEFAULT 'continuous-improvement'
) RETURNS UUID AS $$
DECLARE
  v_improvement_id UUID;
BEGIN
  INSERT INTO dashboard_page_improvements (
    page_id, analysis_id, title, description, improvement_type,
    priority_score, estimated_effort, suggested_by
  ) VALUES (
    p_page_id, p_analysis_id, p_title, p_description, p_improvement_type,
    p_priority_score, p_estimated_effort, p_suggested_by
  ) RETURNING id INTO v_improvement_id;

  RETURN v_improvement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_page_improvement IS 'Create a new improvement suggestion for review';

-- Function: Approve improvement and optionally create task
CREATE OR REPLACE FUNCTION approve_improvement(
  p_improvement_id UUID,
  p_execution_type TEXT,
  p_reviewed_by TEXT DEFAULT 'jayson'
) RETURNS UUID AS $$
DECLARE
  v_improvement RECORD;
  v_task_id UUID;
  v_status TEXT;
BEGIN
  -- Get improvement details
  SELECT i.*, p.page_name, p.route, p.category as page_category
  INTO v_improvement
  FROM dashboard_page_improvements i
  JOIN dashboard_pages p ON i.page_id = p.id
  WHERE i.id = p_improvement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Improvement not found: %', p_improvement_id;
  END IF;

  -- Set status based on execution type
  v_status := CASE p_execution_type
    WHEN 'auto' THEN 'approved_auto'
    WHEN 'manual' THEN 'approved_manual'
    ELSE 'approved_manual'
  END;

  -- Create task
  INSERT INTO tasks (
    title,
    description,
    business,
    category,
    priority,
    status,
    execution_type
  ) VALUES (
    v_improvement.title,
    format('Page: %s (%s)

%s

Improvement Type: %s
Estimated Effort: %s
Suggested By: %s',
      v_improvement.page_name,
      v_improvement.route,
      v_improvement.description,
      v_improvement.improvement_type,
      v_improvement.estimated_effort,
      v_improvement.suggested_by
    ),
    'overall',
    'dashboard',
    CASE
      WHEN v_improvement.priority_score >= 8 THEN 1
      WHEN v_improvement.priority_score >= 5 THEN 2
      ELSE 3
    END,
    'pending',
    p_execution_type
  ) RETURNING id INTO v_task_id;

  -- Update improvement
  UPDATE dashboard_page_improvements
  SET
    status = v_status,
    execution_type = p_execution_type,
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    task_id = v_task_id,
    updated_at = NOW()
  WHERE id = p_improvement_id;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_improvement IS 'Approve an improvement and create a task';

-- Function: Reject improvement
CREATE OR REPLACE FUNCTION reject_improvement(
  p_improvement_id UUID,
  p_rejection_reason TEXT DEFAULT NULL,
  p_reviewed_by TEXT DEFAULT 'jayson'
) RETURNS VOID AS $$
BEGIN
  UPDATE dashboard_page_improvements
  SET
    status = 'rejected',
    reviewed_by = p_reviewed_by,
    reviewed_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_improvement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reject_improvement IS 'Reject an improvement suggestion';

-- Function: Update page score based on latest analysis
CREATE OR REPLACE FUNCTION update_page_score(
  p_page_id UUID,
  p_score INT
) RETURNS VOID AS $$
BEGIN
  UPDATE dashboard_pages
  SET
    improvement_score = p_score,
    analysis_results = jsonb_build_object(
      'score', p_score,
      'updated_at', NOW()::text
    ),
    updated_at = NOW()
  WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_page_score IS 'Update page improvement score after analysis';

-- =============================================================================
-- AUTO-UPDATE TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_page_improvements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_page_improvements_updated_at ON dashboard_page_improvements;
CREATE TRIGGER trigger_update_page_improvements_updated_at
  BEFORE UPDATE ON dashboard_page_improvements
  FOR EACH ROW
  EXECUTE FUNCTION update_page_improvements_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE dashboard_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_page_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_page_improvements ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on dashboard_pages" ON dashboard_pages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on dashboard_page_analysis" ON dashboard_page_analysis
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on dashboard_page_improvements" ON dashboard_page_improvements
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can read all
CREATE POLICY "Authenticated read on dashboard_pages" ON dashboard_pages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read on dashboard_page_analysis" ON dashboard_page_analysis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read on dashboard_page_improvements" ON dashboard_page_improvements
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- REGISTER JOB
-- =============================================================================
INSERT INTO dashboard_job_status (
  job_name,
  job_type,
  business,
  schedule,
  description,
  expected_interval_hours,
  relevant_files
) VALUES (
  'page-analyzer',
  'n8n',
  NULL,
  'On change + Daily 6AM',
  'Dashboard page improvement analysis - triggered on code changes and daily sweep',
  24,
  ARRAY[
    'infra/n8n/workflows/page-change-analyzer.json',
    'infra/scripts/seed-dashboard-pages.ts'
  ]
) ON CONFLICT (job_name, business) DO UPDATE SET
  schedule = EXCLUDED.schedule,
  description = EXCLUDED.description,
  expected_interval_hours = EXCLUDED.expected_interval_hours,
  relevant_files = EXCLUDED.relevant_files,
  updated_at = NOW();
