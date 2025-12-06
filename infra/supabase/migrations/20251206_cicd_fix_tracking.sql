-- Migration: CI/CD Fix Tracking
-- Description: Add fix status tracking to distinguish attempted vs not-attempted issues
-- Run in: Supabase SQL Editor (shared instance: qcvfxxsnqvdfmpbcgdni)

-- Add fix tracking columns to cicd_issues
ALTER TABLE cicd_issues ADD COLUMN IF NOT EXISTS fix_status TEXT
  DEFAULT 'pending' CHECK (fix_status IN ('pending', 'in_progress', 'failed', 'resolved'));
ALTER TABLE cicd_issues ADD COLUMN IF NOT EXISTS fix_attempt_count INT DEFAULT 0;
ALTER TABLE cicd_issues ADD COLUMN IF NOT EXISTS last_fix_attempt_at TIMESTAMPTZ;
ALTER TABLE cicd_issues ADD COLUMN IF NOT EXISTS fix_prompt_used TEXT;

-- Index for filtering by fix status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_cicd_issues_fix_status ON cicd_issues(fix_status);

-- Update view to include fix status
CREATE OR REPLACE VIEW v_active_cicd_issues AS
SELECT
  id,
  issue_type,
  severity,
  file_path,
  line_number,
  message,
  code,
  auto_fixable,
  occurrence_count,
  first_seen_at,
  last_seen_at,
  fix_status,
  fix_attempt_count,
  last_fix_attempt_at,
  EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 3600 AS hours_open
FROM cicd_issues
WHERE resolved_at IS NULL
ORDER BY
  CASE severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
  last_seen_at DESC;

-- Function to mark issues as in_progress when fix is started
CREATE OR REPLACE FUNCTION start_fix_attempt(
  p_issue_ids UUID[],
  p_prompt TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE cicd_issues
  SET
    fix_status = 'in_progress',
    fix_attempt_count = fix_attempt_count + 1,
    last_fix_attempt_at = NOW(),
    fix_prompt_used = COALESCE(p_prompt, fix_prompt_used)
  WHERE id = ANY(p_issue_ids)
    AND resolved_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to process verification results
CREATE OR REPLACE FUNCTION process_fix_verification(
  p_issue_id UUID,
  p_still_exists BOOLEAN
)
RETURNS TEXT AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  IF p_still_exists THEN
    -- Issue still exists after fix attempt - mark as failed
    v_new_status := 'failed';
    UPDATE cicd_issues
    SET fix_status = 'failed'
    WHERE id = p_issue_id;
  ELSE
    -- Issue is fixed - mark as resolved
    v_new_status := 'resolved';
    UPDATE cicd_issues
    SET
      fix_status = 'resolved',
      resolved_at = NOW()
    WHERE id = p_issue_id;
  END IF;

  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- Function to get issues grouped by fix status
CREATE OR REPLACE FUNCTION get_cicd_issues_by_fix_status()
RETURNS TABLE (
  fix_status TEXT,
  issue_count INTEGER,
  issues JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.fix_status,
    COUNT(*)::INTEGER as issue_count,
    jsonb_agg(jsonb_build_object(
      'id', ci.id,
      'issue_type', ci.issue_type,
      'severity', ci.severity,
      'file_path', ci.file_path,
      'line_number', ci.line_number,
      'message', ci.message,
      'code', ci.code,
      'fix_attempt_count', ci.fix_attempt_count,
      'last_fix_attempt_at', ci.last_fix_attempt_at
    ) ORDER BY ci.last_seen_at DESC) as issues
  FROM cicd_issues ci
  WHERE ci.resolved_at IS NULL
  GROUP BY ci.fix_status;
END;
$$ LANGUAGE plpgsql;

-- Update stats function to include fix status breakdown
CREATE OR REPLACE FUNCTION get_cicd_stats()
RETURNS TABLE (
  total_active INTEGER,
  typescript_errors INTEGER,
  test_failures INTEGER,
  lint_errors INTEGER,
  build_errors INTEGER,
  auto_fixable INTEGER,
  oldest_issue_hours NUMERIC,
  pending_count INTEGER,
  in_progress_count INTEGER,
  failed_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN resolved_at IS NULL THEN 1 END)::INTEGER as total_active,
    COUNT(CASE WHEN issue_type = 'typescript_error' AND resolved_at IS NULL THEN 1 END)::INTEGER as typescript_errors,
    COUNT(CASE WHEN issue_type = 'test_failure' AND resolved_at IS NULL THEN 1 END)::INTEGER as test_failures,
    COUNT(CASE WHEN issue_type = 'lint_error' AND resolved_at IS NULL THEN 1 END)::INTEGER as lint_errors,
    COUNT(CASE WHEN issue_type = 'build_error' AND resolved_at IS NULL THEN 1 END)::INTEGER as build_errors,
    COUNT(CASE WHEN auto_fixable AND resolved_at IS NULL THEN 1 END)::INTEGER as auto_fixable,
    COALESCE(ROUND(EXTRACT(EPOCH FROM (NOW() - MIN(CASE WHEN resolved_at IS NULL THEN first_seen_at END))) / 3600, 1), 0) as oldest_issue_hours,
    COUNT(CASE WHEN fix_status = 'pending' AND resolved_at IS NULL THEN 1 END)::INTEGER as pending_count,
    COUNT(CASE WHEN fix_status = 'in_progress' AND resolved_at IS NULL THEN 1 END)::INTEGER as in_progress_count,
    COUNT(CASE WHEN fix_status = 'failed' AND resolved_at IS NULL THEN 1 END)::INTEGER as failed_count
  FROM cicd_issues;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN cicd_issues.fix_status IS 'Fix attempt status: pending (never tried), in_progress (awaiting verification), failed (attempted but still broken), resolved (fixed)';
COMMENT ON COLUMN cicd_issues.fix_attempt_count IS 'Number of times a fix has been attempted for this issue';
COMMENT ON COLUMN cicd_issues.last_fix_attempt_at IS 'Timestamp of most recent fix attempt';
COMMENT ON COLUMN cicd_issues.fix_prompt_used IS 'The prompt that was used for the most recent fix attempt';
