/**
 * Run Migration 005 - Expand Product Attributes
 *
 * This script runs the SQL migration to add all BigCommerce product fields
 * to the ecommerce_products table in Supabase.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Individual ALTER TABLE statements to run
const migrations = [
  // Part 1: Product Type & Description
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'physical'",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS description TEXT",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'New'",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_condition_shown BOOLEAN DEFAULT FALSE",

  // Part 2: SEO & Marketing
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS page_title VARCHAR(500)",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS meta_description TEXT",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS meta_keywords JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS search_keywords TEXT",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_type VARCHAR(50) DEFAULT 'product'",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_title VARCHAR(500)",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_description TEXT",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_use_meta_description BOOLEAN DEFAULT TRUE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_use_product_name BOOLEAN DEFAULT TRUE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS open_graph_use_image BOOLEAN DEFAULT TRUE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS custom_url JSONB",

  // Part 3: Additional Pricing
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS map_price DECIMAL(10,2)",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2)",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_price_hidden BOOLEAN DEFAULT FALSE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS price_hidden_label VARCHAR(255)",

  // Part 4: Tax
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS tax_class_id INTEGER",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS product_tax_code VARCHAR(100)",

  // Part 5: Inventory
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS inventory_tracking VARCHAR(20) DEFAULT 'product'",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS inventory_warning_level INTEGER DEFAULT 0",

  // Part 6: Ordering & Display
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS order_quantity_minimum INTEGER DEFAULT 1",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS order_quantity_maximum INTEGER DEFAULT 0",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS related_products JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS warranty TEXT",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS layout_file VARCHAR(255)",

  // Part 7: Shipping
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN DEFAULT FALSE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS fixed_cost_shipping_price DECIMAL(10,2)",

  // Part 8: Preorder
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS is_preorder_only BOOLEAN DEFAULT FALSE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS preorder_release_date TIMESTAMP WITH TIME ZONE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS preorder_message TEXT",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS availability_description TEXT",

  // Part 9: Statistics
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS reviews_rating_sum DECIMAL(5,2) DEFAULT 0",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0",

  // Part 10: Gift Wrapping
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS gift_wrapping_options_type VARCHAR(50)",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS gift_wrapping_options_list JSONB DEFAULT '[]'::jsonb",

  // Part 11: Brand ID & Base Variant
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS brand_id INTEGER",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS base_variant_id INTEGER",

  // Part 12: Sub-Resources
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS bulk_pricing_rules JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb",

  // Part 13: BC Dates
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS bc_date_created TIMESTAMP WITH TIME ZONE",
  "ALTER TABLE ecommerce_products ADD COLUMN IF NOT EXISTS bc_date_modified TIMESTAMP WITH TIME ZONE"
]

async function runMigration() {
  console.log('==========================================')
  console.log('Running Migration 005: Expand Product Attributes')
  console.log('==========================================\n')

  let successCount = 0
  let errorCount = 0

  for (const sql of migrations) {
    try {
      // Use RPC to execute SQL (requires a function to be set up, or we use a workaround)
      // For now, we'll use Supabase's management API indirectly
      const { error } = await supabase.rpc('exec_sql', { query: sql })

      if (error) {
        // If RPC doesn't exist, the columns might already exist or we need another approach
        console.log(`Note: ${sql.substring(0, 60)}... - ${error.message}`)
        errorCount++
      } else {
        console.log(`OK: ${sql.substring(0, 60)}...`)
        successCount++
      }
    } catch (e: any) {
      console.log(`Skip: ${sql.substring(0, 60)}... - ${e.message}`)
      errorCount++
    }
  }

  console.log(`\nMigration Summary:`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Skipped/Errors: ${errorCount}`)
  console.log('\nNote: If columns already exist, they will be skipped.')
  console.log('\nTo run the full migration with indexes, please run the SQL file directly:')
  console.log('  https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
  console.log('  File: supabase-migrations/005_expand_product_attributes.sql')
}

// Alternative: Test if columns exist by trying to select them
async function checkColumnsExist() {
  console.log('Checking which columns already exist...\n')

  const columnsToCheck = [
    'type', 'description', 'condition', 'page_title', 'meta_description',
    'is_featured', 'variants', 'options', 'modifiers', 'videos'
  ]

  const { data, error } = await supabase
    .from('ecommerce_products')
    .select(columnsToCheck.join(','))
    .limit(1)

  if (error) {
    console.log('Some columns are missing. Migration needed.')
    console.log('Error:', error.message)
    return false
  } else {
    console.log('All checked columns exist!')
    return true
  }
}

async function main() {
  const columnsExist = await checkColumnsExist()

  if (!columnsExist) {
    console.log('\n*** MIGRATION REQUIRED ***')
    console.log('\nPlease run the migration SQL file manually in Supabase:')
    console.log('1. Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
    console.log('2. Copy and paste the contents of:')
    console.log('   /home/user/master-ops/buy-organics-online/supabase-migrations/005_expand_product_attributes.sql')
    console.log('3. Click "Run"')
    console.log('\nThis will add 47 new columns to capture all BigCommerce product attributes.')
  } else {
    console.log('\nSchema appears to be up to date.')
  }
}

main()
