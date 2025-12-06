-- Add fix status tracking to dispatch_problem_products
-- Target: BOO Supabase (usibnysqelovfuctmkqw)

-- Add columns for tracking fix status
ALTER TABLE dispatch_problem_products
ADD COLUMN IF NOT EXISTS fix_status VARCHAR(50) DEFAULT 'none',  -- none, queued, processing, fixed, failed
ADD COLUMN IF NOT EXISTS fix_queue_id UUID,
ADD COLUMN IF NOT EXISTS last_fix_at TIMESTAMPTZ;

-- Index for filtering by fix status
CREATE INDEX IF NOT EXISTS idx_dispatch_products_fix_status
ON dispatch_problem_products(fix_status);

-- Comment on new columns
COMMENT ON COLUMN dispatch_problem_products.fix_status IS 'Status of fix action: none, queued, processing, fixed, failed';
COMMENT ON COLUMN dispatch_problem_products.fix_queue_id IS 'Reference to pending queue item if queued';
COMMENT ON COLUMN dispatch_problem_products.last_fix_at IS 'Timestamp of last fix attempt';
