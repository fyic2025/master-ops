/**
 * Verify Multi-Business Setup
 * Checks that all businesses and structures are in place
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifySetup() {
  console.log('🔍 Verifying Multi-Business Setup...\n')

  let allGood = true

  try {
    // 1. Check businesses table exists
    console.log('1️⃣ Checking businesses table...')
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('*')

    if (bizError) {
      console.log('   ❌ Businesses table not found')
      console.log('   Error:', bizError.message)
      allGood = false
    } else {
      console.log(`   ✅ Found ${businesses?.length || 0} businesses`)
      businesses?.forEach(biz => {
        console.log(`      - ${biz.display_name} (${biz.name})`)
      })
    }

    // 2. Check if tasks table has business column
    console.log('\n2️⃣ Checking tasks table structure...')
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1)

    if (tasksError) {
      console.log('   ⚠️  Tasks table check:', tasksError.message)
    } else {
      const hasBusiness = tasks && tasks.length > 0 && 'business' in tasks[0]
      if (hasBusiness) {
        console.log('   ✅ Tasks table has business column')
      } else {
        console.log('   ⚠️  Tasks table exists but may not have business column yet')
      }
    }

    // 3. Check RPC functions
    console.log('\n3️⃣ Checking RPC functions...')

    const functions = [
      'create_task_with_log',
      'get_business_tasks',
      'set_business_context'
    ]

    for (const funcName of functions) {
      try {
        // Try calling with test params to see if it exists
        if (funcName === 'get_business_tasks') {
          const { error } = await supabase.rpc(funcName, {
            p_business: 'master_ops',
            p_limit: 1
          })

          if (!error || error.message.includes('relation') || error.message.includes('does not exist')) {
            console.log(`   ⚠️  ${funcName} - needs setup`)
          } else {
            console.log(`   ✅ ${funcName} - ready`)
          }
        }
      } catch (e) {
        console.log(`   ⚠️  ${funcName} - not found`)
      }
    }

    // 4. Check views
    console.log('\n4️⃣ Checking views...')
    const { data: summary, error: viewError } = await supabase
      .from('business_task_summary')
      .select('*')
      .limit(1)

    if (viewError) {
      console.log('   ⚠️  Views not created yet')
      console.log('   Error:', viewError.message)
    } else {
      console.log('   ✅ Views created successfully')
    }

    // Summary
    console.log('\n' + '=' .repeat(60))
    if (allGood && businesses && businesses.length >= 5) {
      console.log('✅ Multi-business setup is complete!')
      console.log('\nYou can now:')
      console.log('  - Import product data: npx tsx import-products.ts')
      console.log('  - View business summary: npx tsx view-business-summary.ts')
      console.log('  - Run examples: npx tsx shared/libs/supabase/multi-business-example.ts')
    } else {
      console.log('⚠️  Setup incomplete - run the SQL from multi-business-setup.sql')
    }
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('\n❌ Verification error:', error)
  }
}

verifySetup()
