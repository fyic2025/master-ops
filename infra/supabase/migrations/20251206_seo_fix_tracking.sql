-- SEO Fix Tracking Schema
-- Adds fix tracking columns to gsc_issue_urls for auto-fix pipeline
-- Created: 2025-12-06

-- ============================================================================
-- ALTER TABLE: gsc_issue_urls - Add fix tracking columns
-- ============================================================================

-- Add fix tracking columns
ALTER TABLE gsc_issue_urls
ADD COLUMN IF NOT EXISTS fix_status TEXT DEFAULT 'pending'
  CHECK (fix_status IN ('pending', 'in_progress', 'failed', 'resolved')),
ADD COLUMN IF NOT EXISTS fix_attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_fix_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fix_prompt TEXT,
ADD COLUMN IF NOT EXISTS linked_task_id UUID;

-- Add comment for documentation
COMMENT ON COLUMN gsc_issue_urls.fix_status IS 'Fix workflow status: pending, in_progress, failed, resolved';
COMMENT ON COLUMN gsc_issue_urls.fix_attempt_count IS 'Number of fix attempts made';
COMMENT ON COLUMN gsc_issue_urls.last_fix_attempt_at IS 'Timestamp of last fix attempt';
COMMENT ON COLUMN gsc_issue_urls.fix_prompt IS 'The prompt used for the fix attempt';
COMMENT ON COLUMN gsc_issue_urls.linked_task_id IS 'Link to task in main task queue';

-- Create index for fix status queries
CREATE INDEX IF NOT EXISTS idx_gsc_issues_fix_status
  ON gsc_issue_urls(business, fix_status)
  WHERE status = 'active';

-- Create index for task linkage
CREATE INDEX IF NOT EXISTS idx_gsc_issues_task
  ON gsc_issue_urls(linked_task_id)
  WHERE linked_task_id IS NOT NULL;

-- ============================================================================
-- FUNCTION: Start fix attempt
-- ============================================================================

CREATE OR REPLACE FUNCTION start_seo_fix_attempt(
  p_issue_ids UUID[],
  p_prompt TEXT DEFAULT NULL,
  p_task_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE gsc_issue_urls
  SET
    fix_status = 'in_progress',
    fix_attempt_count = fix_attempt_count + 1,
    last_fix_attempt_at = NOW(),
    fix_prompt = COALESCE(p_prompt, fix_prompt),
    linked_task_id = COALESCE(p_task_id, linked_task_id),
    updated_at = NOW()
  WHERE id = ANY(p_issue_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Complete fix (resolved or failed)
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_seo_fix(
  p_issue_id UUID,
  p_success BOOLEAN,
  p_resolution_type TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE gsc_issue_urls
  SET
    fix_status = CASE WHEN p_success THEN 'resolved' ELSE 'failed' END,
    status = CASE WHEN p_success THEN 'resolved' ELSE status END,
    resolved_at = CASE WHEN p_success THEN NOW() ELSE resolved_at END,
    resolution_type = COALESCE(p_resolution_type, resolution_type),
    updated_at = NOW()
  WHERE id = p_issue_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Issues with fix status for dashboard
-- ============================================================================

CREATE OR REPLACE VIEW v_gsc_issues_for_fix AS
SELECT
  id,
  business,
  url,
  issue_type,
  severity,
  status,
  fix_status,
  fix_attempt_count,
  last_fix_attempt_at,
  linked_task_id,
  first_detected,
  last_checked,
  detection_reason,
  traffic_before,
  traffic_after,
  api_coverage_state,
  api_page_fetch_state,
  created_at,
  updated_at
FROM gsc_issue_urls
WHERE status = 'active'
ORDER BY
  CASE severity WHEN 'critical' THEN 1 ELSE 2 END,
  first_detected DESC;

-- ============================================================================
-- VIEW: Fix progress summary
-- ============================================================================

CREATE OR REPLACE VIEW v_gsc_fix_progress AS
SELECT
  business,
  fix_status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning_count
FROM gsc_issue_urls
WHERE status = 'active'
GROUP BY business, fix_status
ORDER BY business, fix_status;
