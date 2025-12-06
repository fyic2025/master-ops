-- BC Availability Snapshots for rollback capability
-- Run in: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

CREATE TABLE IF NOT EXISTS bc_availability_snapshots (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  sku TEXT,
  previous_availability TEXT,
  previous_inventory INTEGER,
  intended_action TEXT,
  intended_availability TEXT,
  intended_inventory INTEGER,
  supplier_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rollback queries
CREATE INDEX IF NOT EXISTS idx_bc_snapshots_run_id ON bc_availability_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_bc_snapshots_created_at ON bc_availability_snapshots(created_at);

-- Cleanup old snapshots (keep 30 days)
-- Run this periodically
-- DELETE FROM bc_availability_snapshots WHERE created_at < NOW() - INTERVAL '30 days';

COMMENT ON TABLE bc_availability_snapshots IS 'Pre-update snapshots for BC availability sync rollback capability';
