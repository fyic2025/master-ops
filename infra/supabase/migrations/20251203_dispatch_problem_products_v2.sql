-- Migration: Add stock recommendation columns to dispatch_problem_products
-- Purpose: Support dashboard display of recommended stock levels
-- Created: 2025-12-03

-- Add new columns for stock management
ALTER TABLE dispatch_problem_products
ADD COLUMN IF NOT EXISTS avg_units_per_order NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS recommended_stock INTEGER,
ADD COLUMN IF NOT EXISTS monthly_order_volume INTEGER,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_problem_products_review_status
ON dispatch_problem_products(review_status, needs_review);

COMMENT ON COLUMN dispatch_problem_products.avg_units_per_order IS 'Average quantity ordered per order';
COMMENT ON COLUMN dispatch_problem_products.recommended_stock IS 'Suggested stock level based on order patterns';
COMMENT ON COLUMN dispatch_problem_products.monthly_order_volume IS 'Estimated monthly orders for this product';
