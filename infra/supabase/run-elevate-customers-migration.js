/**
 * Apply Elevate Customers Migration
 *
 * Creates the elevate_customers and elevate_orders tables
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'dashboard', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Running Elevate Customers Migration...')

  const migrationPath = path.join(__dirname, 'migrations', '20251206_elevate_customers_unified.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Test connectivity first
  console.log('Testing Supabase connection...')
  const { data: test, error: testError } = await supabase.from('businesses').select('count').limit(1)
  if (testError) {
    console.error('Connection failed:', testError.message)
    console.log('You may need to run this migration via the Supabase Dashboard SQL Editor')
    console.log('\nCopy the SQL from:')
    console.log(migrationPath)
    process.exit(1)
  }
  console.log('Connection OK')

  // Try using the exec_sql RPC function if available
  console.log('Attempting to run migration via RPC...')

  // Split into major statements and try to execute
  // For complex migrations, recommend using Supabase Dashboard
  console.log('\n⚠️  For this migration, please use the Supabase Dashboard SQL Editor:')
  console.log('1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
  console.log('2. Copy and paste the contents of:')
  console.log('   ' + migrationPath)
  console.log('3. Click "Run" to execute the migration')
  console.log('\nAlternatively, you can try running individual statements...\n')

  // Output the SQL for easy copying
  console.log('--- SQL CONTENT ---')
  console.log(sql)
  console.log('--- END SQL ---')
}

runMigration().catch(console.error)
