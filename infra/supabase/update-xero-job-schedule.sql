-- Update xero-financial-sync job to weekly schedule
-- Run this in Supabase SQL Editor (shared instance: qcvfxxsnqvdfmpbcgdni)

UPDATE dashboard_job_status
SET
  job_type = 'cron',
  schedule = '2:00 AM Sunday AEST (16:00 UTC Saturday)',
  description = 'Weekly financial data sync from Xero (Teelixir + Elevate) with intercompany eliminations and consolidated reports',
  expected_interval_hours = 168,  -- 7 days
  relevant_files = ARRAY['infra/xero-financial-sync-cron.js', 'scripts/financials/sync-xero-to-supabase.ts'],
  updated_at = NOW()
WHERE job_name = 'xero-financial-sync'
  AND business IS NULL;

-- Verify the update
SELECT
  job_name,
  job_type,
  schedule,
  description,
  expected_interval_hours,
  status,
  last_run_at,
  relevant_files
FROM dashboard_job_status
WHERE job_name = 'xero-financial-sync';
