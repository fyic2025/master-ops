-- ============================================================================
-- BOO Backup System Schema
-- ============================================================================
-- Tracks backup jobs, metadata, and restore operations
-- Replaces third-party backup apps (Rewind/BackHub)
-- ============================================================================

-- Backup Jobs Table
-- Tracks each backup execution
CREATE TABLE IF NOT EXISTS boo_backup_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id text UNIQUE NOT NULL,  -- e.g., 'boo-weekly-2025-W48'
    backup_type text NOT NULL CHECK (backup_type IN ('daily', 'weekly', 'monthly', 'manual')),
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),

    -- Timing
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    duration_seconds integer,

    -- Storage info
    storage_bucket text NOT NULL DEFAULT 'boo-backups',
    storage_path text NOT NULL,  -- e.g., 'weekly/2025-W48/'
    total_size_bytes bigint,

    -- Record counts
    products_count integer DEFAULT 0,
    variants_count integer DEFAULT 0,
    categories_count integer DEFAULT 0,
    brands_count integer DEFAULT 0,
    customers_count integer DEFAULT 0,
    orders_count integer DEFAULT 0,
    coupons_count integer DEFAULT 0,
    redirects_count integer DEFAULT 0,
    total_records integer DEFAULT 0,

    -- Error handling
    error_message text,
    error_details jsonb,

    -- Metadata
    triggered_by text DEFAULT 'scheduled',  -- 'scheduled', 'manual', 'api'
    manifest jsonb,  -- Full manifest file content
    created_at timestamptz NOT NULL DEFAULT now(),

    -- Indexes for common queries
    CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- Backup Files Table
-- Tracks individual files within each backup
CREATE TABLE IF NOT EXISTS boo_backup_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id uuid NOT NULL REFERENCES boo_backup_jobs(id) ON DELETE CASCADE,

    file_name text NOT NULL,  -- e.g., 'products_full.json.gz'
    file_type text NOT NULL,  -- e.g., 'products', 'customers', 'orders'
    storage_key text NOT NULL,  -- Full S3 key

    -- File details
    record_count integer NOT NULL DEFAULT 0,
    size_bytes bigint NOT NULL DEFAULT 0,
    compressed boolean NOT NULL DEFAULT true,
    checksum text,  -- SHA256 hash

    -- Timing
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,

    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed')),
    error_message text,

    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(backup_job_id, file_name)
);

-- Restore Jobs Table
-- Tracks restore operations
CREATE TABLE IF NOT EXISTS boo_restore_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source backup
    backup_job_id uuid REFERENCES boo_backup_jobs(id),
    backup_id text NOT NULL,  -- Reference even if backup_job deleted

    -- What to restore
    restore_type text NOT NULL CHECK (restore_type IN ('full', 'partial', 'single_item')),
    data_types text[],  -- ['products', 'customers'] or null for full

    -- Single item restore
    item_type text,  -- 'product', 'customer', 'order'
    item_identifier text,  -- SKU, email, order_id

    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

    -- Timing
    started_at timestamptz,
    completed_at timestamptz,
    duration_seconds integer,

    -- Results
    records_restored integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    error_message text,
    error_details jsonb,

    -- Audit
    initiated_by text NOT NULL,  -- User or system
    notes text,

    created_at timestamptz NOT NULL DEFAULT now()
);

-- Backup Settings Table
-- Configuration for backup schedules and retention
CREATE TABLE IF NOT EXISTS boo_backup_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key text UNIQUE NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text
);

-- Insert default settings
INSERT INTO boo_backup_settings (setting_key, setting_value, description) VALUES
    ('daily_schedule', '"0 16 * * *"', 'Daily backup cron (2 AM AEST = 16:00 UTC)'),
    ('weekly_schedule', '"0 17 * * 0"', 'Weekly backup cron (3 AM AEST Sunday = 17:00 UTC Saturday)'),
    ('monthly_schedule', '"0 18 1 * *"', 'Monthly backup cron (4 AM AEST 1st = 18:00 UTC last day)'),
    ('daily_retention_days', '30', 'Days to keep daily backups'),
    ('weekly_retention_weeks', '12', 'Weeks to keep weekly backups'),
    ('monthly_retention_months', '12', 'Months to keep monthly backups'),
    ('storage_bucket', '"boo-backups"', 'Digital Ocean Spaces bucket name'),
    ('storage_region', '"syd1"', 'Digital Ocean Spaces region'),
    ('alert_email', '"alerts@buyorganicsonline.com.au"', 'Email for backup alerts'),
    ('enabled', 'true', 'Whether backups are enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- Views
-- ============================================================================

-- Latest backup status view
CREATE OR REPLACE VIEW v_boo_backup_status AS
SELECT
    backup_type,
    backup_id,
    status,
    started_at,
    completed_at,
    duration_seconds,
    total_records,
    total_size_bytes,
    pg_size_pretty(total_size_bytes::bigint) as size_human,
    error_message,
    CASE
        WHEN status = 'completed' THEN
            EXTRACT(EPOCH FROM (now() - completed_at)) / 3600
        ELSE NULL
    END as hours_since_backup
FROM boo_backup_jobs
WHERE (backup_type, started_at) IN (
    SELECT backup_type, MAX(started_at)
    FROM boo_backup_jobs
    GROUP BY backup_type
)
ORDER BY started_at DESC;

-- Backup health summary
CREATE OR REPLACE VIEW v_boo_backup_health AS
SELECT
    (SELECT COUNT(*) FROM boo_backup_jobs WHERE status = 'completed' AND started_at > now() - interval '7 days') as successful_last_7_days,
    (SELECT COUNT(*) FROM boo_backup_jobs WHERE status = 'failed' AND started_at > now() - interval '7 days') as failed_last_7_days,
    (SELECT MAX(completed_at) FROM boo_backup_jobs WHERE backup_type = 'daily' AND status = 'completed') as last_daily_backup,
    (SELECT MAX(completed_at) FROM boo_backup_jobs WHERE backup_type = 'weekly' AND status = 'completed') as last_weekly_backup,
    (SELECT MAX(completed_at) FROM boo_backup_jobs WHERE backup_type = 'monthly' AND status = 'completed') as last_monthly_backup,
    (SELECT SUM(total_size_bytes) FROM boo_backup_jobs WHERE status = 'completed') as total_storage_used,
    (SELECT pg_size_pretty(SUM(total_size_bytes)::bigint) FROM boo_backup_jobs WHERE status = 'completed') as total_storage_human;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to start a new backup job
CREATE OR REPLACE FUNCTION start_boo_backup(
    p_backup_type text,
    p_triggered_by text DEFAULT 'scheduled'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_backup_id text;
    v_storage_path text;
    v_job_id uuid;
BEGIN
    -- Generate backup_id based on type
    CASE p_backup_type
        WHEN 'daily' THEN
            v_backup_id := 'boo-daily-' || to_char(now(), 'YYYY-MM-DD');
            v_storage_path := 'daily/' || to_char(now(), 'YYYY-MM-DD') || '/';
        WHEN 'weekly' THEN
            v_backup_id := 'boo-weekly-' || to_char(now(), 'IYYY-"W"IW');
            v_storage_path := 'weekly/' || to_char(now(), 'IYYY-"W"IW') || '/';
        WHEN 'monthly' THEN
            v_backup_id := 'boo-monthly-' || to_char(now(), 'YYYY-MM');
            v_storage_path := 'monthly/' || to_char(now(), 'YYYY-MM') || '/';
        ELSE
            v_backup_id := 'boo-manual-' || to_char(now(), 'YYYY-MM-DD-HH24MISS');
            v_storage_path := 'manual/' || to_char(now(), 'YYYY-MM-DD-HH24MISS') || '/';
    END CASE;

    -- Create the job record
    INSERT INTO boo_backup_jobs (backup_id, backup_type, storage_path, triggered_by)
    VALUES (v_backup_id, p_backup_type, v_storage_path, p_triggered_by)
    RETURNING id INTO v_job_id;

    RETURN v_job_id;
END;
$$;

-- Function to complete a backup job
CREATE OR REPLACE FUNCTION complete_boo_backup(
    p_job_id uuid,
    p_status text,
    p_manifest jsonb DEFAULT NULL,
    p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_records integer;
    v_total_size bigint;
BEGIN
    -- Calculate totals from files
    SELECT
        COALESCE(SUM(record_count), 0),
        COALESCE(SUM(size_bytes), 0)
    INTO v_total_records, v_total_size
    FROM boo_backup_files
    WHERE backup_job_id = p_job_id;

    -- Update job record
    UPDATE boo_backup_jobs
    SET
        status = p_status,
        completed_at = now(),
        duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer,
        total_records = v_total_records,
        total_size_bytes = v_total_size,
        manifest = p_manifest,
        error_message = p_error_message,
        -- Update individual counts from manifest if provided
        products_count = COALESCE((p_manifest->'counts'->>'products')::integer, products_count),
        variants_count = COALESCE((p_manifest->'counts'->>'variants')::integer, variants_count),
        categories_count = COALESCE((p_manifest->'counts'->>'categories')::integer, categories_count),
        brands_count = COALESCE((p_manifest->'counts'->>'brands')::integer, brands_count),
        customers_count = COALESCE((p_manifest->'counts'->>'customers')::integer, customers_count),
        orders_count = COALESCE((p_manifest->'counts'->>'orders')::integer, orders_count)
    WHERE id = p_job_id;
END;
$$;

-- Function to clean up old backups
CREATE OR REPLACE FUNCTION cleanup_old_boo_backups()
RETURNS TABLE(deleted_count integer, freed_bytes bigint)
LANGUAGE plpgsql
AS $$
DECLARE
    v_daily_retention integer;
    v_weekly_retention integer;
    v_monthly_retention integer;
    v_deleted integer := 0;
    v_freed bigint := 0;
BEGIN
    -- Get retention settings
    SELECT (setting_value)::integer INTO v_daily_retention
    FROM boo_backup_settings WHERE setting_key = 'daily_retention_days';

    SELECT (setting_value)::integer INTO v_weekly_retention
    FROM boo_backup_settings WHERE setting_key = 'weekly_retention_weeks';

    SELECT (setting_value)::integer INTO v_monthly_retention
    FROM boo_backup_settings WHERE setting_key = 'monthly_retention_months';

    -- Default values if not set
    v_daily_retention := COALESCE(v_daily_retention, 30);
    v_weekly_retention := COALESCE(v_weekly_retention, 12);
    v_monthly_retention := COALESCE(v_monthly_retention, 12);

    -- Calculate bytes to be freed and count
    SELECT COUNT(*), COALESCE(SUM(total_size_bytes), 0)
    INTO v_deleted, v_freed
    FROM boo_backup_jobs
    WHERE
        (backup_type = 'daily' AND started_at < now() - (v_daily_retention || ' days')::interval)
        OR (backup_type = 'weekly' AND started_at < now() - (v_weekly_retention || ' weeks')::interval)
        OR (backup_type = 'monthly' AND started_at < now() - (v_monthly_retention || ' months')::interval);

    -- Delete old backups (files cascade delete)
    DELETE FROM boo_backup_jobs
    WHERE
        (backup_type = 'daily' AND started_at < now() - (v_daily_retention || ' days')::interval)
        OR (backup_type = 'weekly' AND started_at < now() - (v_weekly_retention || ' weeks')::interval)
        OR (backup_type = 'monthly' AND started_at < now() - (v_monthly_retention || ' months')::interval);

    RETURN QUERY SELECT v_deleted, v_freed;
END;
$$;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_boo_backup_jobs_type_date ON boo_backup_jobs(backup_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_boo_backup_jobs_status ON boo_backup_jobs(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_boo_backup_files_job ON boo_backup_files(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_boo_restore_jobs_backup ON boo_restore_jobs(backup_job_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE boo_backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_backup_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_restore_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE boo_backup_settings ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on boo_backup_jobs" ON boo_backup_jobs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on boo_backup_files" ON boo_backup_files
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on boo_restore_jobs" ON boo_restore_jobs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on boo_backup_settings" ON boo_backup_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE boo_backup_jobs IS 'Tracks BigCommerce backup jobs for Buy Organics Online';
COMMENT ON TABLE boo_backup_files IS 'Individual files within each backup job';
COMMENT ON TABLE boo_restore_jobs IS 'Tracks restore operations from backups';
COMMENT ON TABLE boo_backup_settings IS 'Configuration for backup schedules and retention';
COMMENT ON VIEW v_boo_backup_status IS 'Latest backup status by type';
COMMENT ON VIEW v_boo_backup_health IS 'Overall backup health summary';
