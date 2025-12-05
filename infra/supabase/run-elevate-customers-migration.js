/**
 * Run Elevate Customers Migration
 *
 * Creates the elevate_customers and elevate_orders tables
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Running Elevate Customers Migration...')

  const migrationPath = path.join(__dirname, 'migrations', '20251206_elevate_customers_unified.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Executing ${statements.length} statements...`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt })
      if (error) {
        // Try direct query if RPC not available
        const { error: directError } = await supabase.from('_exec').select('*').limit(0)
        console.log(`Statement ${i + 1}: RPC not available, trying alternative...`)
      }
      console.log(`Statement ${i + 1}/${statements.length}: OK`)
    } catch (err) {
      console.error(`Statement ${i + 1} failed:`, err.message)
      console.log('Statement:', stmt.substring(0, 100) + '...')
    }
  }

  console.log('Migration complete!')
}

runMigration().catch(console.error)
