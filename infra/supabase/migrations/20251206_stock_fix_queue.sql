-- Stock Fix Queue: Actions queued from dashboard, processed by scheduled job
-- Target: BOO Supabase (usibnysqelovfuctmkqw)

CREATE TABLE IF NOT EXISTS stock_fix_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL,
  bc_product_id INTEGER,
  sku VARCHAR(50),
  product_name TEXT,
  action TEXT NOT NULL,  -- disable, discontinue, update_inventory
  params JSONB,          -- { inventory_level: 12 } etc
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  priority INTEGER DEFAULT 5,  -- 1=urgent, 5=normal, 10=low
  initiated_by TEXT,     -- dashboard, claude_code, auto_rule
  source_page TEXT,      -- /boo/stock, /boo/inventory

  -- Processing tracking
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  bc_response JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding pending items to process
CREATE INDEX IF NOT EXISTS idx_stock_fix_queue_status ON stock_fix_queue(status);
CREATE INDEX IF NOT EXISTS idx_stock_fix_queue_pending ON stock_fix_queue(status, priority, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_stock_fix_queue_product ON stock_fix_queue(product_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_stock_fix_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_fix_queue_updated_at ON stock_fix_queue;
CREATE TRIGGER trigger_stock_fix_queue_updated_at
  BEFORE UPDATE ON stock_fix_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_fix_queue_updated_at();

-- Comment
COMMENT ON TABLE stock_fix_queue IS 'Queue for stock fix actions. Dashboard queues, processor executes.';
