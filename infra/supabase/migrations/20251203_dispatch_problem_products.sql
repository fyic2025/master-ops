-- Migration: Create dispatch_problem_products table
-- Purpose: Track products with >80% slow dispatch rates from BOO order analysis
-- Created: 2025-12-03

CREATE TABLE IF NOT EXISTS dispatch_problem_products (
  id SERIAL PRIMARY KEY,
  analysis_date DATE NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  sku VARCHAR(50),
  slow_order_count INTEGER NOT NULL,
  fast_order_count INTEGER DEFAULT 0,
  slow_rate_percent NUMERIC(5,2) NOT NULL,
  avg_dispatch_days NUMERIC(5,2) NOT NULL,
  impact_score NUMERIC(10,2),
  sample_order_ids JSONB,
  needs_review BOOLEAN DEFAULT TRUE,
  supplier_name VARCHAR(100),
  review_status VARCHAR(50) DEFAULT 'pending',
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_problem_products_date ON dispatch_problem_products(analysis_date);
CREATE INDEX IF NOT EXISTS idx_problem_products_sku ON dispatch_problem_products(sku);
CREATE INDEX IF NOT EXISTS idx_problem_products_slow_rate ON dispatch_problem_products(slow_rate_percent DESC);
CREATE INDEX IF NOT EXISTS idx_problem_products_needs_review ON dispatch_problem_products(needs_review);
CREATE INDEX IF NOT EXISTS idx_problem_products_supplier ON dispatch_problem_products(supplier_name);

-- Enable RLS
ALTER TABLE dispatch_problem_products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow read access" ON dispatch_problem_products
  FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON dispatch_problem_products
  FOR ALL USING (true);

COMMENT ON TABLE dispatch_problem_products IS 'Products with high slow dispatch rates (>80%) identified from BOO order analysis';
COMMENT ON COLUMN dispatch_problem_products.slow_rate_percent IS 'Percentage of orders with >3 day dispatch time';
COMMENT ON COLUMN dispatch_problem_products.impact_score IS 'slow_order_count * (slow_rate_percent / 100) - higher = more impactful';
