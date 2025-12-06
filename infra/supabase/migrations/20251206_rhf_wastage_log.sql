-- ============================================================================
-- RHF Wastage Log Table
-- Tracks produce wastage/spoilage for reporting and cost analysis
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new
-- ============================================================================

CREATE TABLE IF NOT EXISTS rhf_wastage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stock reference
  stock_level_id UUID REFERENCES rhf_stock_levels(id) ON DELETE SET NULL,
  supplier_product_id UUID REFERENCES rhf_supplier_products(id) ON DELETE SET NULL,

  -- Product info (denormalized for history)
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'each',

  -- Wastage details
  reason TEXT NOT NULL, -- 'expired', 'damaged', 'quality', 'other'
  cost_value DECIMAL(10,2) DEFAULT 0, -- Cost value of wasted stock

  -- Notes
  notes TEXT,

  -- Tracking
  logged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rhf_wastage_created ON rhf_wastage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rhf_wastage_reason ON rhf_wastage_log(reason);
CREATE INDEX IF NOT EXISTS idx_rhf_wastage_product ON rhf_wastage_log(supplier_product_id);

-- RLS
ALTER TABLE rhf_wastage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on rhf_wastage_log" ON rhf_wastage_log;
CREATE POLICY "Service role full access on rhf_wastage_log" ON rhf_wastage_log FOR ALL USING (true);

-- View for wastage summary
CREATE OR REPLACE VIEW v_rhf_wastage_summary AS
SELECT
  date_trunc('week', created_at)::date as week_start,
  reason,
  COUNT(*) as entry_count,
  SUM(quantity) as total_quantity,
  SUM(cost_value) as total_cost
FROM rhf_wastage_log
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY date_trunc('week', created_at), reason
ORDER BY week_start DESC, reason;

-- Comments
COMMENT ON TABLE rhf_wastage_log IS 'Tracks produce wastage/spoilage at RHF';
COMMENT ON COLUMN rhf_wastage_log.reason IS 'Reason: expired, damaged, quality, other';
COMMENT ON COLUMN rhf_wastage_log.cost_value IS 'Cost value of wasted produce for reporting';
