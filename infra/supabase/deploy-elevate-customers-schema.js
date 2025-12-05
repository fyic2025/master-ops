/**
 * Deploy Elevate Customers Schema to Master Hub Supabase
 *
 * Usage: node deploy-elevate-customers-schema.js [--check] [--copy]
 *
 * Options:
 *   --check  Only verify if tables exist
 *   --copy   Copy SQL to clipboard for manual execution
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'dashboard', '.env.local') })

// Master Hub Supabase (used by dashboard)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

async function checkTables() {
  console.log('Checking Elevate customers tables in Supabase...')
  console.log('URL:', SUPABASE_URL)
  console.log('')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check elevate_customers table
  const { data: customers, error: customersErr } = await supabase
    .from('elevate_customers')
    .select('id, email')
    .limit(5)

  if (customersErr) {
    if (customersErr.code === '42P01' || customersErr.message?.includes('does not exist')) {
      console.log('elevate_customers table: NOT FOUND - needs creation')
      return false
    }
    console.log('elevate_customers table: ERROR -', customersErr.message)
    return false
  }

  console.log('elevate_customers table: OK')
  console.log(`  Found ${customers?.length || 0} existing customers`)

  // Check elevate_orders table
  const { data: orders, error: ordersErr } = await supabase
    .from('elevate_orders')
    .select('id')
    .limit(1)

  if (ordersErr) {
    if (ordersErr.code === '42P01' || ordersErr.message?.includes('does not exist')) {
      console.log('elevate_orders table: NOT FOUND - needs creation')
      return false
    }
    console.log('elevate_orders table: ERROR -', ordersErr.message)
    return false
  }

  console.log('elevate_orders table: OK')
  return true
}

async function copySchemaToClipboard() {
  const schemaPath = path.join(__dirname, 'migrations', '20251206_elevate_customers_unified.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')

  try {
    const { execSync } = require('child_process')
    // Try Windows clip command
    execSync('clip', { input: schema })
    console.log('Schema SQL copied to clipboard!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Go to https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
    console.log('2. Paste the SQL and click Run')
    console.log('3. Run this script again with --check to verify')
  } catch (err) {
    console.log('Could not copy to clipboard. Schema file location:')
    console.log(schemaPath)
    console.log('')
    console.log('SQL Content:')
    console.log('='.repeat(60))
    console.log(schema)
    console.log('='.repeat(60))
  }
}

async function getStats() {
  console.log('\nGetting table statistics...')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { count: customerCount } = await supabase
    .from('elevate_customers')
    .select('*', { count: 'exact', head: true })

  const { count: orderCount } = await supabase
    .from('elevate_orders')
    .select('*', { count: 'exact', head: true })

  console.log(`  Customers: ${customerCount || 0}`)
  console.log(`  Orders: ${orderCount || 0}`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--copy')) {
    await copySchemaToClipboard()
    return
  }

  const tablesExist = await checkTables()

  if (!tablesExist) {
    console.log('')
    console.log('=== Tables need to be created ===')
    console.log('')
    console.log('Option 1: Copy SQL to clipboard')
    console.log('  node infra/supabase/deploy-elevate-customers-schema.js --copy')
    console.log('')
    console.log('Option 2: Manual deployment')
    console.log('  1. Open: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
    console.log('  2. Copy contents of: infra/supabase/migrations/20251206_elevate_customers_unified.sql')
    console.log('  3. Paste and click Run')
    console.log('')
    console.log('After creating tables, run: node infra/supabase/deploy-elevate-customers-schema.js --check')
    return
  }

  if (args.includes('--check')) {
    console.log('\nAll tables exist!')
    await getStats()
    return
  }

  console.log('\nTables exist! Ready for data sync.')
  await getStats()
  console.log('')
  console.log('Next step: Run the sync script:')
  console.log('  npx tsx infra/scripts/elevate-customer-sync.ts')
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
