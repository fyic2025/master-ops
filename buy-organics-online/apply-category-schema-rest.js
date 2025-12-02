/**
 * Apply Category Schema Migration to Supabase via REST API
 *
 * Run with: node apply-category-schema-rest.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkAndCreateTables() {
  console.log('Checking and creating category tables...\n');

  // Check if bc_categories exists
  const { data: catData, error: catError } = await supabase
    .from('bc_categories')
    .select('id')
    .limit(1);

  if (catError?.code === 'PGRST116' || catError?.message?.includes('does not exist')) {
    console.log('bc_categories table does not exist.');
    console.log('\n=== MANUAL MIGRATION REQUIRED ===');
    console.log('\nPlease run the following SQL in the Supabase Dashboard:');
    console.log('URL: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new');
    console.log('\nOr copy from: supabase-migrations/005_create_category_tables.sql\n');
    return false;
  }

  if (catError) {
    // Table might exist but have other errors
    console.log('bc_categories check result:', catError.message);
  } else {
    console.log('bc_categories table exists');
  }

  // Check product_category_links
  const { error: linkError } = await supabase
    .from('product_category_links')
    .select('id')
    .limit(1);

  if (linkError?.code === 'PGRST116' || linkError?.message?.includes('does not exist')) {
    console.log('product_category_links table does not exist.');
    return false;
  }

  if (linkError) {
    console.log('product_category_links check result:', linkError.message);
  } else {
    console.log('product_category_links table exists');
  }

  // Check category_analysis
  const { error: analysisError } = await supabase
    .from('category_analysis')
    .select('id')
    .limit(1);

  if (analysisError?.code === 'PGRST116' || analysisError?.message?.includes('does not exist')) {
    console.log('category_analysis table does not exist.');
    return false;
  }

  if (analysisError) {
    console.log('category_analysis check result:', analysisError.message);
  } else {
    console.log('category_analysis table exists');
  }

  // Get current counts
  const { count: catCount } = await supabase
    .from('bc_categories')
    .select('*', { count: 'exact', head: true });

  const { count: linkCount } = await supabase
    .from('product_category_links')
    .select('*', { count: 'exact', head: true });

  console.log('\nCurrent data:');
  console.log('  bc_categories:', catCount || 0, 'rows');
  console.log('  product_category_links:', linkCount || 0, 'rows');

  return true;
}

async function main() {
  const exists = await checkAndCreateTables();

  if (exists) {
    console.log('\nAll tables exist! Ready to run sync-categories-to-supabase.ts');
  } else {
    console.log('\n=== MIGRATION SQL ===\n');
    console.log('Please run this SQL in Supabase Dashboard SQL Editor:');
    console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new\n');

    // Print the essential SQL
    console.log(`
-- Create bc_categories table
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

-- Create product_category_links table
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

-- Create category_analysis table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bc_categories_bc_category_id ON bc_categories(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_bc_categories_parent_id ON bc_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_bc_categories_product_count ON bc_categories(product_count);
CREATE INDEX IF NOT EXISTS idx_product_category_links_product ON product_category_links(bc_product_id);
CREATE INDEX IF NOT EXISTS idx_product_category_links_category ON product_category_links(bc_category_id);
CREATE INDEX IF NOT EXISTS idx_category_analysis_category ON category_analysis(bc_category_id);
`);
  }
}

main();
