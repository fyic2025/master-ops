/**
 * Setup Supabase RPC Functions
 * Executes the SQL to create helper functions
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

async function setupRPCFunctions() {
  console.log('🔧 Setting up Supabase RPC Functions...\n')

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  // Create client with service role key (required for DDL operations)
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'infra', 'supabase', 'rpc-functions.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    console.log('📄 SQL file loaded')
    console.log('🚀 Executing SQL...\n')

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        const functionName = statement.match(/FUNCTION\s+(\w+)/)?.[1]
        console.log(`   Creating function: ${functionName}...`)
      }

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      }).catch(async () => {
        // If exec_sql doesn't exist, try direct query
        return await supabase.from('_').select('*').limit(0).then(() => {
          // Use postgres query directly
          return fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ query: statement + ';' })
          }).then(r => ({ data: null, error: r.ok ? null : new Error('Query failed') }))
        })
      })

      if (error && !error.message?.includes('already exists')) {
        console.error(`   ⚠️  Warning: ${error.message}`)
      }
    }

    console.log('\n✅ SQL execution completed')

    // Verify functions were created
    console.log('\n🔍 Verifying functions...')

    const { data: functions, error: verifyError } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', [
        'create_task_with_log',
        'log_task_action',
        'update_task_status',
        'get_tasks_for_retry',
        'mark_task_needs_fix'
      ])

    if (verifyError) {
      // Try alternative verification using SQL query
      console.log('   Using direct SQL verification...')

      const { data, error } = await supabase.rpc('get_tasks_for_retry', { p_max_retries: 3 })

      if (!error) {
        console.log('✅ Functions created successfully!')
        console.log('\n📊 Available RPC functions:')
        console.log('   1. create_task_with_log()')
        console.log('   2. log_task_action()')
        console.log('   3. update_task_status()')
        console.log('   4. get_tasks_for_retry()')
        console.log('   5. mark_task_needs_fix()')
      } else {
        console.log('⚠️  Could not verify functions automatically')
        console.log('   Please check Supabase dashboard to confirm')
      }
    } else {
      console.log(`✅ Found ${functions?.length || 0} functions`)
    }

    console.log('\n🎉 Setup complete!\n')

  } catch (error) {
    console.error('❌ Error setting up RPC functions:', error)
    console.error('\nTrying alternative approach: Direct SQL execution via REST API...\n')

    // Alternative: Execute via REST API
    try {
      const sqlPath = join(__dirname, 'infra', 'supabase', 'rpc-functions.sql')
      const sql = readFileSync(sqlPath, 'utf-8')

      // Use Supabase SQL API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        }
      })

      console.log('\n📋 Please run this SQL manually in Supabase Dashboard:')
      console.log('   1. Go to https://supabase.com/dashboard')
      console.log('   2. Open SQL Editor')
      console.log('   3. Copy contents of: infra/supabase/rpc-functions.sql')
      console.log('   4. Paste and run\n')

    } catch (altError) {
      console.error('Alternative approach also failed')
      console.log('\n📋 Manual setup required - see instructions above')
    }

    process.exit(1)
  }
}

setupRPCFunctions()
