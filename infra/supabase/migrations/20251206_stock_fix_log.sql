-- Stock Fix Log: Audit trail of completed fix actions
-- Target: BOO Supabase (usibnysqelovfuctmkqw)

CREATE TABLE IF NOT EXISTS stock_fix_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES stock_fix_queue(id),
  product_id INTEGER NOT NULL,
  bc_product_id INTEGER,
  sku VARCHAR(50),
  product_name TEXT,
  action TEXT NOT NULL,  -- disable, discontinue, update_inventory
  params JSONB,
  result TEXT NOT NULL,  -- success, failed, skipped
  bc_response JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying history
CREATE INDEX IF NOT EXISTS idx_stock_fix_log_product ON stock_fix_log(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_fix_log_executed ON stock_fix_log(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_fix_log_result ON stock_fix_log(result);

-- Comment
COMMENT ON TABLE stock_fix_log IS 'Audit log of all stock fix actions executed by processor.';
