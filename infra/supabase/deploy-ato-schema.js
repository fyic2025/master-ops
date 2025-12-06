/**
 * Deploy ATO Rulings Schema to Supabase
 *
 * Usage: node deploy-ato-schema.js [--check] [--rls-only]
 *
 * Options:
 *   --check     Only verify if tables exist
 *   --rls-only  Only deploy RLS fix migration
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'dashboard', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Get from environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set in .env file or dashboard/.env.local')
  process.exit(1)
}

async function checkTables() {
  console.log('Checking ATO tables in Supabase...')
  console.log('URL:', SUPABASE_URL)
  console.log('')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check ato_rulings table
  const { data: rulings, error: rulingsErr } = await supabase
    .from('ato_rulings')
    .select('id, ruling_id, ruling_type')
    .limit(5)

  if (rulingsErr) {
    if (rulingsErr.code === '42P01' || rulingsErr.message?.includes('does not exist')) {
      console.log('ato_rulings table: NOT FOUND - needs creation')
      return { exists: false, needsRls: false }
    }
    console.log('ato_rulings table: ERROR -', rulingsErr.message)
    return { exists: false, needsRls: false }
  }

  console.log('ato_rulings table: OK')
  console.log(`  Found ${rulings?.length || 0} existing rulings`)

  // Check ato_ruling_topics table
  const { data: topics, error: topicsErr } = await supabase
    .from('ato_ruling_topics')
    .select('id, slug, name')
    .limit(5)

  if (topicsErr) {
    console.log('ato_ruling_topics table: ERROR -', topicsErr.message)
    return { exists: false, needsRls: false }
  }

  console.log('ato_ruling_topics table: OK')
  console.log(`  Found ${topics?.length || 0} topics`)

  // Check ato_sync_log table
  const { data: logs, error: logsErr } = await supabase
    .from('ato_sync_log')
    .select('id')
    .limit(1)

  if (logsErr) {
    console.log('ato_sync_log table: ERROR -', logsErr.message)
    return { exists: false, needsRls: false }
  }

  console.log('ato_sync_log table: OK')

  return { exists: true, needsRls: true }
}

async function deploySchema() {
  console.log('\n=== Deploying ATO Schema ===\n')

  const schemaPath = path.join(__dirname, 'migrations', '20251204_ato_rulings_schema.sql')

  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found:', schemaPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(schemaPath, 'utf8')

  console.log('Schema file loaded:', schemaPath)
  console.log('SQL length:', sql.length, 'characters')
  console.log('')
  console.log('⚠️  NOTE: Supabase JS client cannot execute raw DDL SQL.')
  console.log('   You need to run this migration manually in the Supabase SQL Editor.')
  console.log('')
  console.log('Steps:')
  console.log('1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
  console.log('2. Paste the contents of:', schemaPath)
  console.log('3. Click "Run"')
  console.log('')
  console.log('Or copy the SQL to clipboard with:')
  console.log('  type "' + schemaPath + '" | clip')
  console.log('')
}

async function deployRlsFix() {
  console.log('\n=== Deploying RLS Fix ===\n')

  const rlsPath = path.join(__dirname, 'migrations', '20251206_ato_fix_rls.sql')

  if (!fs.existsSync(rlsPath)) {
    console.error('RLS fix file not found:', rlsPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(rlsPath, 'utf8')

  console.log('RLS fix file loaded:', rlsPath)
  console.log('SQL length:', sql.length, 'characters')
  console.log('')
  console.log('⚠️  NOTE: Run this AFTER the schema migration.')
  console.log('')
  console.log('Paste in SQL Editor:')
  console.log('  https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql')
  console.log('')
}

async function main() {
  const args = process.argv.slice(2)
  const checkOnly = args.includes('--check')
  const rlsOnly = args.includes('--rls-only')

  const { exists, needsRls } = await checkTables()

  if (checkOnly) {
    console.log('')
    console.log('Check complete.')
    if (!exists) {
      console.log('Tables need to be created. Run: node deploy-ato-schema.js')
    } else if (needsRls) {
      console.log('Tables exist. Run --rls-only if RLS needs updating.')
    }
    return
  }

  if (rlsOnly) {
    await deployRlsFix()
    return
  }

  if (!exists) {
    await deploySchema()
  } else {
    console.log('\nTables already exist. Use --rls-only to update RLS policies.')
  }
}

main().catch(console.error)
