/**
 * Apply Category Schema Migration to Supabase
 *
 * This script creates the bc_categories, product_category_links,
 * and category_analysis tables along with all views.
 *
 * Run with: npx tsx apply-category-schema.ts
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function applyMigration() {
  console.log('Applying category schema migration...\n')

  // Note: Supabase JS client doesn't support raw SQL execution directly
  // The migration SQL should be run via Supabase Dashboard SQL Editor
  // This script will check if tables exist and provide guidance

  // Check if bc_categories table exists
  const { data: catData, error: catError } = await supabase
    .from('bc_categories')
    .select('id')
    .limit(1)

  if (catError?.code === 'PGRST116' || catError?.message?.includes('does not exist')) {
    console.log('bc_categories table does not exist.')
    console.log('\nTo apply the migration:')
    console.log('1. Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new')
    console.log('2. Copy and paste the contents of: supabase-migrations/005_create_category_tables.sql')
    console.log('3. Click "Run" to execute the migration')
    console.log('\nAlternatively, you can use the Supabase CLI:')
    console.log('  supabase db push')
    return false
  }

  if (catError) {
    console.error('Error checking bc_categories:', catError.message)
    return false
  }

  console.log('bc_categories table exists')

  // Check product_category_links
  const { error: linkError } = await supabase
    .from('product_category_links')
    .select('id')
    .limit(1)

  if (linkError?.code === 'PGRST116' || linkError?.message?.includes('does not exist')) {
    console.log('product_category_links table does not exist.')
    console.log('Please run the migration SQL.')
    return false
  }

  console.log('product_category_links table exists')

  // Check category_analysis
  const { error: analysisError } = await supabase
    .from('category_analysis')
    .select('id')
    .limit(1)

  if (analysisError?.code === 'PGRST116' || analysisError?.message?.includes('does not exist')) {
    console.log('category_analysis table does not exist.')
    console.log('Please run the migration SQL.')
    return false
  }

  console.log('category_analysis table exists')

  // Get current counts
  const { count: catCount } = await supabase
    .from('bc_categories')
    .select('*', { count: 'exact', head: true })

  const { count: linkCount } = await supabase
    .from('product_category_links')
    .select('*', { count: 'exact', head: true })

  console.log('\nCurrent data:')
  console.log(`  bc_categories: ${catCount || 0} rows`)
  console.log(`  product_category_links: ${linkCount || 0} rows`)

  return true
}

async function main() {
  const exists = await applyMigration()

  if (exists) {
    console.log('\nAll tables exist! Ready to run sync-categories-to-supabase.ts')
  } else {
    console.log('\nPlease apply the migration first, then run this script again.')
    process.exit(1)
  }
}

main()
