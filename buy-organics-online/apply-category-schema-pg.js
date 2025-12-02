/**
 * Apply Category Schema Migration to Supabase using PostgreSQL
 *
 * Run with: node apply-category-schema-pg.js
 */

const { Pool } = require('pg');

// Supabase PostgreSQL connection string
const SUPABASE_DB_URL = 'postgresql://postgres.usibnysqelovfuctmkqw:iF$ug32KkVq5qvv@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

const migrationSQL = `
-- ==============================================================================
-- BIGCOMMERCE CATEGORIES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS bc_categories (
  id BIGSERIAL PRIMARY KEY,
  bc_category_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  parent_id INTEGER DEFAULT 0,
  tree_depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  custom_url JSONB,
  page_title VARCHAR(500),
  meta_keywords TEXT[],
  meta_description TEXT,
  search_keywords VARCHAR(500),
  image_url TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  default_product_sort VARCHAR(100),
  layout_file VARCHAR(255),
  views INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  category_path TEXT,
  category_path_ids INTEGER[],
  raw_data JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_bc_categories_bc_category_id ON bc_categories(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_bc_categories_parent_id ON bc_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_bc_categories_tree_depth ON bc_categories(tree_depth);
CREATE INDEX IF NOT EXISTS idx_bc_categories_is_visible ON bc_categories(is_visible);
CREATE INDEX IF NOT EXISTS idx_bc_categories_product_count ON bc_categories(product_count);
CREATE INDEX IF NOT EXISTS idx_bc_categories_name ON bc_categories(name);

-- ==============================================================================
-- PRODUCT-CATEGORY LINKS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS product_category_links (
  id BIGSERIAL PRIMARY KEY,
  bc_product_id INTEGER NOT NULL,
  bc_category_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_primary_category BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_product_category UNIQUE (bc_product_id, bc_category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_category_links_product ON product_category_links(bc_product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_links_category ON product_category_links(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_product_category_links_primary ON product_category_links(is_primary_category) WHERE is_primary_category = TRUE;

-- ==============================================================================
-- CATEGORY ANALYSIS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS category_analysis (
  id BIGSERIAL PRIMARY KEY,
  bc_category_id INTEGER NOT NULL,
  analysis_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) DEFAULT 'info',
  description TEXT,
  recommendation TEXT,
  related_category_ids INTEGER[],
  related_product_ids INTEGER[],
  status VARCHAR(50) DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_analysis_category ON category_analysis(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_category_analysis_type ON category_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_category_analysis_severity ON category_analysis(severity);
CREATE INDEX IF NOT EXISTS idx_category_analysis_status ON category_analysis(status);
`;

const viewsSQL = `
-- ==============================================================================
-- VIEWS FOR CATEGORY ANALYSIS
-- ==============================================================================

-- View: Categories overview with parent info
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

-- View: Empty or low-product categories
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
`;

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log('Applying category schema migration...\n');

    // Apply tables
    console.log('Creating tables...');
    await client.query(migrationSQL);
    console.log('  Tables created successfully\n');

    // Apply views
    console.log('Creating views...');
    await client.query(viewsSQL);
    console.log('  Views created successfully\n');

    // Verify tables exist
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('bc_categories', 'product_category_links', 'category_analysis')
    `);

    console.log('Tables verified:');
    tableCheck.rows.forEach(row => {
      console.log('  -', row.table_name);
    });

    // Get row counts
    const catCount = await client.query('SELECT COUNT(*) FROM bc_categories');
    const linkCount = await client.query('SELECT COUNT(*) FROM product_category_links');

    console.log('\nCurrent data:');
    console.log('  bc_categories:', catCount.rows[0].count, 'rows');
    console.log('  product_category_links:', linkCount.rows[0].count, 'rows');

    console.log('\nMigration complete! Ready to run sync-categories-to-supabase.ts');

  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
