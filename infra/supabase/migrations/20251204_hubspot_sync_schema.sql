-- HubSpot Sync Schema
-- Required by n8n workflow: Unleashed → HubSpot Order Sync (Deals)

-- HubSpot sync log table for tracking synced records
CREATE TABLE IF NOT EXISTS hubspot_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL,           -- 'contact', 'deal', 'company'
  external_id TEXT NOT NULL,           -- ID from external system (Unleashed customer code, order GUID)
  external_source TEXT NOT NULL,       -- 'unleashed', 'shopify', etc.
  hubspot_id TEXT,                     -- HubSpot record ID
  sync_direction TEXT NOT NULL,        -- 'to_hubspot', 'from_hubspot'
  sync_action TEXT NOT NULL,           -- 'create', 'update', 'skip'
  sync_status TEXT DEFAULT 'success',  -- 'success', 'failed', 'skipped'
  sync_data JSONB,                     -- Full sync payload
  error_message TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_external_object UNIQUE (object_type, external_id, external_source)
);

-- Integration logs table for workflow execution logging
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                -- 'hubspot', 'unleashed', 'shopify'
  service TEXT NOT NULL,               -- 'unleashed_sync', 'order_sync', etc.
  operation TEXT NOT NULL,             -- 'sync_order', 'skip_order_no_contact'
  level TEXT DEFAULT 'info',           -- 'info', 'warning', 'error'
  status TEXT DEFAULT 'success',       -- 'success', 'failed', 'skipped'
  message TEXT,
  details_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to log HubSpot syncs (called by n8n workflow)
CREATE OR REPLACE FUNCTION log_hubspot_sync(
  p_object_type TEXT,
  p_external_id TEXT,
  p_external_source TEXT,
  p_hubspot_id TEXT,
  p_sync_direction TEXT,
  p_sync_action TEXT,
  p_sync_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO hubspot_sync_log (
    object_type, external_id, external_source, hubspot_id,
    sync_direction, sync_action, sync_data, last_synced_at
  ) VALUES (
    p_object_type, p_external_id, p_external_source, p_hubspot_id,
    p_sync_direction, p_sync_action, p_sync_data, NOW()
  )
  ON CONFLICT (object_type, external_id, external_source)
  DO UPDATE SET
    hubspot_id = EXCLUDED.hubspot_id,
    sync_direction = EXCLUDED.sync_direction,
    sync_action = EXCLUDED.sync_action,
    sync_data = EXCLUDED.sync_data,
    last_synced_at = NOW()
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_external ON hubspot_sync_log(external_source, external_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_hubspot ON hubspot_sync_log(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_last_synced ON hubspot_sync_log(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_object_type ON hubspot_sync_log(object_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_source ON integration_logs(source, service);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);

-- RLS Policies
ALTER TABLE hubspot_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access hubspot_sync_log" ON hubspot_sync_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access integration_logs" ON integration_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read access
CREATE POLICY "Authenticated read hubspot_sync_log" ON hubspot_sync_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read integration_logs" ON integration_logs
  FOR SELECT TO authenticated USING (true);

-- Comments
COMMENT ON TABLE hubspot_sync_log IS 'Tracks records synced between external systems and HubSpot';
COMMENT ON TABLE integration_logs IS 'General purpose logging for n8n workflow integrations';
COMMENT ON FUNCTION log_hubspot_sync IS 'Upsert function for logging HubSpot syncs from n8n workflows';
