-- =============================================================================
-- HubSpot Sync Log Schema
-- =============================================================================
-- Tracks synchronization between external systems (Shopify, Unleashed, etc.)
-- and HubSpot CRM. Used for deduplication, error tracking, and audit trails.
--
-- Usage:
--   - Log every sync operation (create/update) between systems and HubSpot
--   - Query by external_id to find corresponding HubSpot ID
--   - Monitor sync health and identify failed syncs
--   - Prevent duplicate object creation in HubSpot
-- =============================================================================

-- Drop existing table if needed (for fresh install)
DROP TABLE IF EXISTS hubspot_sync_log CASCADE;

-- Create hubspot_sync_log table
CREATE TABLE hubspot_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Object identification
  object_type TEXT NOT NULL CHECK (object_type IN ('contact', 'company', 'deal')),
  external_id TEXT NOT NULL,  -- Shopify customer ID, Unleashed customer code, etc.
  external_source TEXT NOT NULL CHECK (external_source IN ('shopify_teelixir', 'shopify_elevate', 'unleashed', 'klaviyo', 'smartlead', 'manual')),
  hubspot_id TEXT NOT NULL,   -- HubSpot object ID

  -- Sync metadata
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('to_hubspot', 'from_hubspot', 'bidirectional')),
  sync_operation TEXT NOT NULL CHECK (sync_operation IN ('create', 'update', 'delete')),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'partial', 'failed')),

  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,

  -- Additional context
  properties_synced JSONB,  -- Snapshot of properties that were synced
  metadata JSONB DEFAULT '{}',  -- Additional custom metadata

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Primary lookup: find HubSpot ID by external ID
CREATE INDEX idx_hubspot_sync_external
  ON hubspot_sync_log(external_id, external_source, object_type);

-- Reverse lookup: find external ID by HubSpot ID
CREATE INDEX idx_hubspot_sync_hubspot
  ON hubspot_sync_log(hubspot_id, object_type);

-- Monitor sync health
CREATE INDEX idx_hubspot_sync_status
  ON hubspot_sync_log(sync_status, last_synced_at DESC);

-- Failed syncs requiring attention
CREATE INDEX idx_hubspot_sync_failed
  ON hubspot_sync_log(sync_status, retry_count)
  WHERE sync_status = 'failed';

-- Recent syncs by source
CREATE INDEX idx_hubspot_sync_source_time
  ON hubspot_sync_log(external_source, last_synced_at DESC);

-- =============================================================================
-- Automatic Updated At Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_hubspot_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hubspot_sync_updated_at_trigger
  BEFORE UPDATE ON hubspot_sync_log
  FOR EACH ROW
  EXECUTE FUNCTION update_hubspot_sync_updated_at();

-- =============================================================================
-- Helper Views
-- =============================================================================

-- View: Recent sync activity (last 24 hours)
CREATE OR REPLACE VIEW hubspot_sync_recent AS
SELECT
  object_type,
  external_source,
  sync_operation,
  sync_status,
  COUNT(*) as count,
  MAX(last_synced_at) as last_sync,
  SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM hubspot_sync_log
WHERE last_synced_at >= NOW() - INTERVAL '24 hours'
GROUP BY object_type, external_source, sync_operation, sync_status
ORDER BY last_sync DESC;

-- View: Failed syncs requiring retry
CREATE OR REPLACE VIEW hubspot_sync_failed AS
SELECT
  id,
  object_type,
  external_id,
  external_source,
  hubspot_id,
  sync_operation,
  error_message,
  retry_count,
  last_synced_at,
  created_at
FROM hubspot_sync_log
WHERE sync_status = 'failed'
  AND retry_count < 5  -- Max 5 retries
ORDER BY last_synced_at DESC;

-- View: Sync health summary
CREATE OR REPLACE VIEW hubspot_sync_health AS
SELECT
  external_source,
  object_type,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN sync_status = 'partial' THEN 1 ELSE 0 END) as partial,
  ROUND(
    100.0 * SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as success_rate_pct,
  MAX(last_synced_at) as last_sync_time
FROM hubspot_sync_log
WHERE last_synced_at >= NOW() - INTERVAL '7 days'
GROUP BY external_source, object_type
ORDER BY external_source, object_type;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Find HubSpot ID by external ID
CREATE OR REPLACE FUNCTION get_hubspot_id(
  p_external_id TEXT,
  p_external_source TEXT,
  p_object_type TEXT
) RETURNS TEXT AS $$
DECLARE
  v_hubspot_id TEXT;
BEGIN
  SELECT hubspot_id INTO v_hubspot_id
  FROM hubspot_sync_log
  WHERE external_id = p_external_id
    AND external_source = p_external_source
    AND object_type = p_object_type
    AND sync_status = 'success'
  ORDER BY last_synced_at DESC
  LIMIT 1;

  RETURN v_hubspot_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Log successful sync
CREATE OR REPLACE FUNCTION log_hubspot_sync(
  p_object_type TEXT,
  p_external_id TEXT,
  p_external_source TEXT,
  p_hubspot_id TEXT,
  p_sync_direction TEXT,
  p_sync_operation TEXT,
  p_properties_synced JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO hubspot_sync_log (
    object_type,
    external_id,
    external_source,
    hubspot_id,
    sync_direction,
    sync_operation,
    sync_status,
    properties_synced
  ) VALUES (
    p_object_type,
    p_external_id,
    p_external_source,
    p_hubspot_id,
    p_sync_direction,
    p_sync_operation,
    'success',
    p_properties_synced
  )
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Log failed sync
CREATE OR REPLACE FUNCTION log_hubspot_sync_error(
  p_object_type TEXT,
  p_external_id TEXT,
  p_external_source TEXT,
  p_hubspot_id TEXT,
  p_sync_direction TEXT,
  p_sync_operation TEXT,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
  v_retry_count INTEGER;
BEGIN
  -- Get current retry count
  SELECT COALESCE(MAX(retry_count), 0) INTO v_retry_count
  FROM hubspot_sync_log
  WHERE external_id = p_external_id
    AND external_source = p_external_source
    AND object_type = p_object_type;

  INSERT INTO hubspot_sync_log (
    object_type,
    external_id,
    external_source,
    hubspot_id,
    sync_direction,
    sync_operation,
    sync_status,
    error_message,
    error_details,
    retry_count
  ) VALUES (
    p_object_type,
    p_external_id,
    p_external_source,
    p_hubspot_id,
    p_sync_direction,
    p_sync_operation,
    'failed',
    p_error_message,
    p_error_details,
    v_retry_count + 1
  )
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE hubspot_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY hubspot_sync_service_role_policy ON hubspot_sync_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to read sync logs
CREATE POLICY hubspot_sync_read_policy ON hubspot_sync_log
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- Sample Data & Testing
-- =============================================================================

-- Example: Log a successful customer sync from Shopify to HubSpot
-- SELECT log_hubspot_sync(
--   'contact',
--   '7234567890',
--   'shopify_teelixir',
--   '12345',
--   'to_hubspot',
--   'create',
--   '{"email": "customer@example.com", "firstname": "John"}'::jsonb
-- );

-- Example: Find HubSpot ID for Shopify customer
-- SELECT get_hubspot_id('7234567890', 'shopify_teelixir', 'contact');

-- Example: Check sync health
-- SELECT * FROM hubspot_sync_health;

-- =============================================================================
-- Grants
-- =============================================================================

-- Grant access to service role
GRANT ALL ON hubspot_sync_log TO service_role;
GRANT ALL ON hubspot_sync_log TO postgres;

-- Grant read access to authenticated users
GRANT SELECT ON hubspot_sync_log TO authenticated;

-- Grant access to views
GRANT SELECT ON hubspot_sync_recent TO service_role, authenticated;
GRANT SELECT ON hubspot_sync_failed TO service_role, authenticated;
GRANT SELECT ON hubspot_sync_health TO service_role, authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_hubspot_id TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION log_hubspot_sync TO service_role;
GRANT EXECUTE ON FUNCTION log_hubspot_sync_error TO service_role;
GRANT EXECUTE ON FUNCTION update_hubspot_sync_updated_at TO service_role;

COMMENT ON TABLE hubspot_sync_log IS 'Tracks synchronization between external systems and HubSpot CRM';
COMMENT ON COLUMN hubspot_sync_log.external_id IS 'ID from external system (Shopify customer ID, Unleashed code, etc.)';
COMMENT ON COLUMN hubspot_sync_log.hubspot_id IS 'Corresponding HubSpot object ID';
COMMENT ON COLUMN hubspot_sync_log.properties_synced IS 'Snapshot of properties that were synchronized';
