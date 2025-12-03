-- Cron Job Execution Logs
-- Tracks all scheduled job runs for monitoring and debugging

CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL,
  business TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error', 'running')),
  items_processed INT DEFAULT 0,
  items_updated INT DEFAULT 0,
  items_skipped INT DEFAULT 0,
  errors INT DEFAULT 0,
  error_details JSONB,
  duration_ms INT,
  dry_run BOOLEAN DEFAULT FALSE,
  triggered_by TEXT DEFAULT 'n8n',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent runs by job
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_id ON cron_job_logs(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_business ON cron_job_logs(business, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron_job_logs(status, created_at DESC);

-- RLS
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON cron_job_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to read
CREATE POLICY "Authenticated read access" ON cron_job_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE cron_job_logs IS 'Execution logs for scheduled cron jobs';
COMMENT ON COLUMN cron_job_logs.job_id IS 'Unique identifier for the cron job type';
COMMENT ON COLUMN cron_job_logs.business IS 'Business code (teelixir, elevate, boo, rhf)';
COMMENT ON COLUMN cron_job_logs.status IS 'Execution status: success, partial (some errors), error, running';
