-- ============================================
-- COMPLETE MULTI-BUSINESS + PRODUCTS SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- PART 1: Business Types and Multi-Business Structure
-- ============================================

CREATE TYPE business_type AS ENUM (
  'redhillfresh',
  'teelixir',
  'ai_automation',
  'elevate_wholesale',
  'buy_organics',
  'master_ops'
);

-- Business registry table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name business_type UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert businesses
INSERT INTO businesses (name, display_name, description, settings) VALUES
  ('redhillfresh', 'Red Hill Fresh', 'Local delivery business - Thursday/Friday operations', '{"focus": "Retain + Attract", "days": ["Thursday", "Friday"]}'::jsonb),
  ('teelixir', 'Teelixir', 'Medicinal mushroom products', '{"focus": "Product + Wholesale"}'::jsonb),
  ('ai_automation', 'AI Automation Services', 'Service/Product business - Monday-Wednesday', '{"focus": "Attract + Convert", "days": ["Monday", "Tuesday", "Wednesday"]}'::jsonb),
  ('elevate_wholesale', 'Elevate Wholesale', 'B2B wholesale operations', '{"focus": "Ascend"}'::jsonb),
  ('buy_organics', 'Buy Organics Online', 'Online organic products', '{"focus": "Convert"}'::jsonb),
  ('master_ops', 'Master Operations', 'Central Business OS coordination', '{}'::jsonb)
ON CONFLICT (name) DO NOTHING;


-- PART 2: Products Table
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business business_type NOT NULL,

  -- Product identifiers
  external_id INT,
  bc_sku TEXT,
  sku TEXT NOT NULL,

  -- Product details
  name TEXT NOT NULL,
  description TEXT,

  -- Availability
  availability TEXT,
  status TEXT,

  -- Inventory
  inventory_level INT DEFAULT 0,
  available_qty INT DEFAULT 0,

  -- Metadata
  keyword TEXT,
  ignore_product BOOLEAN DEFAULT false,

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  UNIQUE(business, sku)
);

-- Add indexes for products
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_bc_sku ON products(bc_sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_keyword ON products(keyword);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for products
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- PART 3: Tasks with Business Support (if tasks table exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    -- Add business column to tasks
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS business business_type DEFAULT 'master_ops';
    CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business);
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_logs') THEN
    -- Add business column to task_logs
    ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS business business_type;
    CREATE INDEX IF NOT EXISTS idx_task_logs_business ON task_logs(business);
  END IF;
END $$;


-- PART 4: Views and Analytics
-- ============================================

-- Business summary view
CREATE OR REPLACE VIEW business_summary AS
SELECT
  b.name as business,
  b.display_name,
  b.is_active,
  COUNT(p.id) as product_count,
  SUM(p.inventory_level) as total_inventory,
  COUNT(p.id) FILTER (WHERE p.status = 'In Stock') as in_stock_count,
  COUNT(p.id) FILTER (WHERE p.inventory_level < 10 AND p.inventory_level > 0) as low_stock_count,
  COUNT(p.id) FILTER (WHERE p.inventory_level = 0) as out_of_stock_count
FROM businesses b
LEFT JOIN products p ON b.name = p.business
WHERE b.is_active = true
GROUP BY b.name, b.display_name, b.is_active
ORDER BY b.name;

-- Product inventory view
CREATE OR REPLACE VIEW product_inventory_status AS
SELECT
  p.*,
  b.display_name as business_name,
  CASE
    WHEN p.inventory_level = 0 THEN 'OUT_OF_STOCK'
    WHEN p.inventory_level < 10 THEN 'LOW_STOCK'
    WHEN p.inventory_level < 50 THEN 'MEDIUM_STOCK'
    ELSE 'GOOD_STOCK'
  END as stock_status
FROM products p
JOIN businesses b ON p.business = b.name
ORDER BY p.business, p.name;


-- PART 5: Helper Functions
-- ============================================

-- Function: Get products by business
CREATE OR REPLACE FUNCTION get_business_products(
  p_business business_type,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  product_id UUID,
  sku TEXT,
  name TEXT,
  inventory_level INT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    p.inventory_level,
    p.status
  FROM products p
  WHERE p.business = p_business
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p.name
  LIMIT p_limit;
END;
$$;

-- Function: Get low stock products across all businesses
CREATE OR REPLACE FUNCTION get_low_stock_products(
  p_threshold INT DEFAULT 10
)
RETURNS TABLE(
  business business_type,
  business_name TEXT,
  product_name TEXT,
  sku TEXT,
  current_stock INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.business,
    b.display_name,
    p.name,
    p.sku,
    p.inventory_level
  FROM products p
  JOIN businesses b ON p.business = b.name
  WHERE p.inventory_level < p_threshold
    AND p.inventory_level > 0
    AND p.ignore_product = false
  ORDER BY p.inventory_level ASC, p.business;
END;
$$;

-- Function: Update product inventory
CREATE OR REPLACE FUNCTION update_product_inventory(
  p_business business_type,
  p_sku TEXT,
  p_new_level INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET inventory_level = p_new_level,
      updated_at = NOW()
  WHERE business = p_business
    AND sku = p_sku;

  RETURN FOUND;
END;
$$;


-- ============================================
-- VERIFICATION
-- ============================================

-- Check what was created
SELECT 'Businesses' as item, COUNT(*) as count FROM businesses
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Views', COUNT(*) FROM information_schema.views
  WHERE table_name IN ('business_summary', 'product_inventory_status');

-- Show business summary
SELECT * FROM business_summary;

-- Success message
SELECT '✅ Multi-Business + Products Setup Complete!' as status;
