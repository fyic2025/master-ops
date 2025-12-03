-- Migration: CI/CD Issues Monitoring
-- Description: Track TypeScript errors, test failures, and build issues
-- Run in: Supabase SQL Editor (shared instance: qcvfxxsnqvdfmpbcgdni)

-- Table: cicd_issues
CREATE TABLE IF NOT EXISTS cicd_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type TEXT NOT NULL,  -- 'typescript_error', 'test_failure', 'lint_error', 'build_error', 'health_check'
  severity TEXT NOT NULL DEFAULT 'error',  -- 'error', 'warning', 'info'
  file_path TEXT,
  line_number INTEGER,
  message TEXT NOT NULL,
  code TEXT,  -- Error code (e.g., TS1005)
  details JSONB,  -- Additional context
  auto_fixable BOOLEAN DEFAULT false,
  fix_applied BOOLEAN DEFAULT false,
  fix_applied_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  occurrence_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'local',  -- 'local', 'github_actions', 'n8n'
  commit_sha TEXT,
  branch TEXT DEFAULT 'main',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(issue_type, file_path, line_number, message)
);

-- Table: cicd_scan_history
CREATE TABLE IF NOT EXISTS cicd_scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL,  -- 'full', 'typescript', 'tests', 'lint'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_issues INTEGER DEFAULT 0,
  new_issues INTEGER DEFAULT 0,
  resolved_issues INTEGER DEFAULT 0,
  auto_fixed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',  -- 'running', 'completed', 'failed'
  error_message TEXT,
  source TEXT DEFAULT 'local',
  commit_sha TEXT,
  branch TEXT DEFAULT 'main'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cicd_issues_type ON cicd_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_cicd_issues_severity ON cicd_issues(severity);
CREATE INDEX IF NOT EXISTS idx_cicd_issues_resolved ON cicd_issues(resolved_at);
CREATE INDEX IF NOT EXISTS idx_cicd_issues_file ON cicd_issues(file_path);
CREATE INDEX IF NOT EXISTS idx_cicd_issues_last_seen ON cicd_issues(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_cicd_scan_history_started ON cicd_scan_history(started_at DESC);

-- View for active issues
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
  EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 3600 AS hours_open
FROM cicd_issues
WHERE resolved_at IS NULL
ORDER BY
  CASE severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
  last_seen_at DESC;

-- View for issue summary by type
CREATE OR REPLACE VIEW v_cicd_issues_summary AS
SELECT
  issue_type,
  COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as active_count,
  COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved_count,
  COUNT(CASE WHEN auto_fixable AND resolved_at IS NULL THEN 1 END) as auto_fixable_count,
  MAX(last_seen_at) as latest_occurrence
FROM cicd_issues
GROUP BY issue_type;

-- Function to upsert an issue (increment count if exists)
CREATE OR REPLACE FUNCTION upsert_cicd_issue(
  p_issue_type TEXT,
  p_severity TEXT,
  p_file_path TEXT,
  p_line_number INTEGER,
  p_message TEXT,
  p_code TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_auto_fixable BOOLEAN DEFAULT false,
  p_source TEXT DEFAULT 'local',
  p_commit_sha TEXT DEFAULT NULL,
  p_branch TEXT DEFAULT 'main'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO cicd_issues (
    issue_type, severity, file_path, line_number, message, code,
    details, auto_fixable, source, commit_sha, branch
  )
  VALUES (
    p_issue_type, p_severity, p_file_path, p_line_number, p_message, p_code,
    p_details, p_auto_fixable, p_source, p_commit_sha, p_branch
  )
  ON CONFLICT (issue_type, file_path, line_number, message) DO UPDATE SET
    last_seen_at = NOW(),
    occurrence_count = cicd_issues.occurrence_count + 1,
    severity = EXCLUDED.severity,
    code = COALESCE(EXCLUDED.code, cicd_issues.code),
    details = COALESCE(EXCLUDED.details, cicd_issues.details),
    auto_fixable = EXCLUDED.auto_fixable,
    source = EXCLUDED.source,
    commit_sha = COALESCE(EXCLUDED.commit_sha, cicd_issues.commit_sha),
    resolved_at = NULL  -- Re-open if it was resolved
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark issues as resolved (for issues not seen in latest scan)
CREATE OR REPLACE FUNCTION resolve_stale_issues(
  p_issue_type TEXT,
  p_cutoff_time TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE cicd_issues
  SET resolved_at = NOW()
  WHERE issue_type = p_issue_type
    AND resolved_at IS NULL
    AND last_seen_at < p_cutoff_time;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get issue stats for dashboard
CREATE OR REPLACE FUNCTION get_cicd_stats()
RETURNS TABLE (
  total_active INTEGER,
  typescript_errors INTEGER,
  test_failures INTEGER,
  lint_errors INTEGER,
  build_errors INTEGER,
  auto_fixable INTEGER,
  oldest_issue_hours NUMERIC
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
    COALESCE(ROUND(EXTRACT(EPOCH FROM (NOW() - MIN(CASE WHEN resolved_at IS NULL THEN first_seen_at END))) / 3600, 1), 0) as oldest_issue_hours
  FROM cicd_issues;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE cicd_issues IS 'Tracks CI/CD issues (TypeScript errors, test failures, lint errors) across the codebase';
COMMENT ON TABLE cicd_scan_history IS 'History of CI/CD scans with summary metrics';
