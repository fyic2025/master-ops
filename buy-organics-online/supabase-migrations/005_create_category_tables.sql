-- ==============================================================================
-- BUY ORGANICS ONLINE - CATEGORY TABLES MIGRATION
-- ==============================================================================
-- Created: 2025-11-25
-- Purpose: Store BigCommerce category pages with all fields and product relationships
-- Goal: Foundation for analyzing redundant categories, content gaps, and linking optimization
-- ==============================================================================

-- ==============================================================================
-- BIGCOMMERCE CATEGORIES (Category Pages)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS bc_categories (
  id BIGSERIAL PRIMARY KEY,
  bc_category_id INTEGER UNIQUE NOT NULL,              -- BigCommerce category ID

  -- Core Category Information
  name VARCHAR(500) NOT NULL,                          -- Category name
  description TEXT,                                     -- Category description (SEO content)

  -- Hierarchy & Structure
  parent_id INTEGER DEFAULT 0,                         -- Parent category ID (0 = root)
  tree_depth INTEGER DEFAULT 0,                        -- Depth in category tree (0 = root)
  sort_order INTEGER DEFAULT 0,                        -- Display order

  -- URL & SEO
  custom_url JSONB,                                    -- {url: "/path/", is_customized: bool}
  page_title VARCHAR(500),                             -- SEO page title
  meta_keywords TEXT[],                                -- SEO meta keywords
  meta_description TEXT,                               -- SEO meta description
  search_keywords VARCHAR(500),                        -- Search keywords

  -- Images
  image_url TEXT,                                      -- Category image URL

  -- Visibility & Status
  is_visible BOOLEAN DEFAULT TRUE,                     -- Is category visible on storefront

  -- Default Product Sort
  default_product_sort VARCHAR(100),                   -- 'use_store_settings', 'featured', 'newest', etc.

  -- Layout & Display
  layout_file VARCHAR(255),                            -- Custom layout template file

  -- BigCommerce Views
  views INTEGER DEFAULT 0,                             -- Number of views (if available)

  -- Product Count (calculated/synced)
  product_count INTEGER DEFAULT 0,                     -- Number of products in this category

  -- Full Category Path (denormalized for easy querying)
  category_path TEXT,                                  -- "Parent > Child > Grandchild"
  category_path_ids INTEGER[],                         -- [parent_id, child_id, grandchild_id]

  -- Raw BigCommerce Data
  raw_data JSONB,                                      -- Complete BC API response for reference

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for bc_categories
CREATE INDEX IF NOT EXISTS idx_bc_categories_bc_category_id ON bc_categories(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_bc_categories_parent_id ON bc_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_bc_categories_tree_depth ON bc_categories(tree_depth);
CREATE INDEX IF NOT EXISTS idx_bc_categories_is_visible ON bc_categories(is_visible);
CREATE INDEX IF NOT EXISTS idx_bc_categories_product_count ON bc_categories(product_count);
CREATE INDEX IF NOT EXISTS idx_bc_categories_name ON bc_categories(name);
CREATE INDEX IF NOT EXISTS idx_bc_categories_name_trgm ON bc_categories USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bc_categories_category_path ON bc_categories(category_path);

-- ==============================================================================
-- PRODUCT-CATEGORY JUNCTION TABLE (Many-to-Many Relationship)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS product_category_links (
  id BIGSERIAL PRIMARY KEY,
  bc_product_id INTEGER NOT NULL,                      -- BigCommerce product ID
  bc_category_id INTEGER NOT NULL,                     -- BigCommerce category ID

  -- Position & Sort
  sort_order INTEGER DEFAULT 0,                        -- Product position within category
  is_primary_category BOOLEAN DEFAULT FALSE,           -- Is this the product's main category

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_product_category UNIQUE (bc_product_id, bc_category_id)
);

-- Indexes for product_category_links
CREATE INDEX IF NOT EXISTS idx_product_category_links_product ON product_category_links(bc_product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_links_category ON product_category_links(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_links_primary ON product_category_links(is_primary_category) WHERE is_primary_category = TRUE;

-- ==============================================================================
-- CATEGORY ANALYSIS TABLES (For optimization work)
-- ==============================================================================

-- Table to track category issues and recommendations
CREATE TABLE IF NOT EXISTS category_analysis (
  id BIGSERIAL PRIMARY KEY,
  bc_category_id INTEGER NOT NULL,

  -- Analysis Type
  analysis_type VARCHAR(100) NOT NULL,                 -- 'redundant', 'empty', 'low_products', 'no_description', 'duplicate_name', etc.

  -- Issue Details
  severity VARCHAR(50) DEFAULT 'info',                 -- 'critical', 'warning', 'info'
  description TEXT,                                    -- Human-readable description of the issue
  recommendation TEXT,                                 -- Suggested action

  -- Related Data
  related_category_ids INTEGER[],                      -- Other categories involved (e.g., duplicate)
  related_product_ids INTEGER[],                       -- Products affected

  -- Status
  status VARCHAR(50) DEFAULT 'open',                   -- 'open', 'reviewed', 'resolved', 'ignored'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_analysis_category ON category_analysis(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_category_analysis_type ON category_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_category_analysis_severity ON category_analysis(severity);
CREATE INDEX IF NOT EXISTS idx_category_analysis_status ON category_analysis(status);

-- ==============================================================================
-- VIEWS FOR CATEGORY ANALYSIS
-- ==============================================================================

-- View: Categories with their product counts and hierarchy info
CREATE OR REPLACE VIEW v_category_overview AS
SELECT
  c.id,
  c.bc_category_id,
  c.name,
  c.description,
  c.parent_id,
  c.tree_depth,
  c.category_path,
  c.product_count,
  c.is_visible,
  c.page_title,
  c.meta_description,
  c.image_url,
  c.custom_url->>'url' AS url,
  parent.name AS parent_name,
  CASE
    WHEN c.description IS NULL OR LENGTH(c.description) < 50 THEN 'missing'
    WHEN LENGTH(c.description) < 150 THEN 'thin'
    ELSE 'good'
  END AS content_quality,
  CASE
    WHEN c.meta_description IS NULL OR LENGTH(c.meta_description) < 50 THEN 'missing'
    WHEN LENGTH(c.meta_description) < 120 THEN 'short'
    ELSE 'good'
  END AS seo_quality,
  c.synced_at
FROM bc_categories c
LEFT JOIN bc_categories parent ON c.parent_id = parent.bc_category_id
WHERE c.is_active = TRUE
ORDER BY c.tree_depth, c.sort_order, c.name;

-- View: Empty or low-product categories (potential redundancy)
CREATE OR REPLACE VIEW v_low_product_categories AS
SELECT
  c.bc_category_id,
  c.name,
  c.category_path,
  c.product_count,
  c.is_visible,
  c.tree_depth,
  CASE
    WHEN c.product_count = 0 THEN 'empty'
    WHEN c.product_count < 3 THEN 'very_low'
    WHEN c.product_count < 10 THEN 'low'
    ELSE 'ok'
  END AS product_status,
  c.description IS NOT NULL AS has_description
FROM bc_categories c
WHERE c.is_active = TRUE
  AND c.product_count < 10
ORDER BY c.product_count, c.name;

-- View: Categories with potential duplicate names
CREATE OR REPLACE VIEW v_duplicate_category_names AS
SELECT
  c1.bc_category_id AS category_id_1,
  c1.name AS name_1,
  c1.category_path AS path_1,
  c1.product_count AS count_1,
  c2.bc_category_id AS category_id_2,
  c2.name AS name_2,
  c2.category_path AS path_2,
  c2.product_count AS count_2,
  similarity(c1.name, c2.name) AS name_similarity
FROM bc_categories c1
JOIN bc_categories c2 ON c1.bc_category_id < c2.bc_category_id
  AND similarity(c1.name, c2.name) > 0.7
WHERE c1.is_active = TRUE AND c2.is_active = TRUE
ORDER BY similarity(c1.name, c2.name) DESC;

-- View: Category content gaps (missing SEO content)
CREATE OR REPLACE VIEW v_category_content_gaps AS
SELECT
  c.bc_category_id,
  c.name,
  c.category_path,
  c.product_count,
  c.is_visible,
  CASE WHEN c.description IS NULL OR LENGTH(c.description) < 10 THEN TRUE ELSE FALSE END AS missing_description,
  CASE WHEN c.meta_description IS NULL OR LENGTH(c.meta_description) < 10 THEN TRUE ELSE FALSE END AS missing_meta_description,
  CASE WHEN c.page_title IS NULL OR LENGTH(c.page_title) < 5 THEN TRUE ELSE FALSE END AS missing_page_title,
  CASE WHEN c.image_url IS NULL THEN TRUE ELSE FALSE END AS missing_image,
  LENGTH(COALESCE(c.description, '')) AS description_length,
  LENGTH(COALESCE(c.meta_description, '')) AS meta_description_length
FROM bc_categories c
WHERE c.is_active = TRUE
  AND c.is_visible = TRUE
  AND (
    c.description IS NULL OR LENGTH(c.description) < 50
    OR c.meta_description IS NULL OR LENGTH(c.meta_description) < 50
    OR c.page_title IS NULL
    OR c.image_url IS NULL
  )
ORDER BY c.product_count DESC, c.name;

-- View: Products and their category assignments
CREATE OR REPLACE VIEW v_product_categories AS
SELECT
  p.bc_product_id,
  p.name AS product_name,
  p.sku,
  p.brand,
  p.is_active AS product_active,
  c.bc_category_id,
  c.name AS category_name,
  c.category_path,
  c.is_visible AS category_visible,
  pcl.is_primary_category
FROM bc_products p
JOIN product_category_links pcl ON p.bc_product_id = pcl.bc_product_id
JOIN bc_categories c ON pcl.bc_category_id = c.bc_category_id
WHERE p.is_active = TRUE
ORDER BY p.name, c.category_path;

-- View: Products with no category (orphaned products)
CREATE OR REPLACE VIEW v_orphaned_products AS
SELECT
  p.bc_product_id,
  p.name,
  p.sku,
  p.brand,
  p.price,
  p.inventory_level,
  p.is_active
FROM bc_products p
LEFT JOIN product_category_links pcl ON p.bc_product_id = pcl.bc_product_id
WHERE pcl.id IS NULL
  AND p.is_active = TRUE
ORDER BY p.name;

-- View: Category hierarchy with rollup counts
CREATE OR REPLACE VIEW v_category_hierarchy AS
WITH RECURSIVE category_tree AS (
  -- Base case: root categories
  SELECT
    bc_category_id,
    name,
    parent_id,
    tree_depth,
    product_count,
    ARRAY[bc_category_id] AS path_ids,
    name AS full_path
  FROM bc_categories
  WHERE parent_id = 0 AND is_active = TRUE

  UNION ALL

  -- Recursive case: child categories
  SELECT
    c.bc_category_id,
    c.name,
    c.parent_id,
    c.tree_depth,
    c.product_count,
    ct.path_ids || c.bc_category_id,
    ct.full_path || ' > ' || c.name
  FROM bc_categories c
  JOIN category_tree ct ON c.parent_id = ct.bc_category_id
  WHERE c.is_active = TRUE
)
SELECT * FROM category_tree
ORDER BY full_path;

-- View: Category-level statistics summary
CREATE OR REPLACE VIEW v_category_stats AS
SELECT
  'total_categories' AS metric,
  COUNT(*)::TEXT AS value
FROM bc_categories WHERE is_active = TRUE
UNION ALL
SELECT
  'root_categories',
  COUNT(*)::TEXT
FROM bc_categories WHERE parent_id = 0 AND is_active = TRUE
UNION ALL
SELECT
  'empty_categories',
  COUNT(*)::TEXT
FROM bc_categories WHERE product_count = 0 AND is_active = TRUE
UNION ALL
SELECT
  'hidden_categories',
  COUNT(*)::TEXT
FROM bc_categories WHERE is_visible = FALSE AND is_active = TRUE
UNION ALL
SELECT
  'categories_without_description',
  COUNT(*)::TEXT
FROM bc_categories WHERE (description IS NULL OR LENGTH(description) < 50) AND is_active = TRUE
UNION ALL
SELECT
  'categories_without_meta_description',
  COUNT(*)::TEXT
FROM bc_categories WHERE (meta_description IS NULL OR LENGTH(meta_description) < 50) AND is_active = TRUE
UNION ALL
SELECT
  'average_products_per_category',
  ROUND(AVG(product_count)::NUMERIC, 2)::TEXT
FROM bc_categories WHERE is_active = TRUE AND product_count > 0
UNION ALL
SELECT
  'max_tree_depth',
  MAX(tree_depth)::TEXT
FROM bc_categories WHERE is_active = TRUE;

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Auto-update updated_at timestamp for bc_categories
CREATE TRIGGER update_bc_categories_updated_at
  BEFORE UPDATE ON bc_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for product_category_links
CREATE TRIGGER update_product_category_links_updated_at
  BEFORE UPDATE ON product_category_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for category_analysis
CREATE TRIGGER update_category_analysis_updated_at
  BEFORE UPDATE ON category_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE bc_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_analysis ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Service role can access all categories" ON bc_categories FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all product_category_links" ON product_category_links FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all category_analysis" ON category_analysis FOR ALL
  USING (auth.role() = 'service_role');

-- ==============================================================================
-- UPDATE SCHEMA VERSION
-- ==============================================================================

INSERT INTO schema_version (version, description) VALUES
  ('1.1.0', 'Add category tables, product-category links, and analysis views');

-- ==============================================================================
-- COMPLETION
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Category tables migration complete!';
  RAISE NOTICE 'Tables created: bc_categories, product_category_links, category_analysis';
  RAISE NOTICE 'Views created: 8 analysis views for category optimization';
  RAISE NOTICE 'Next: Run sync-categories-to-supabase.ts to populate data';
END $$;
