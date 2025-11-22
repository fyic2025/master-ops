/**
 * Multi-Business Supabase Usage Examples
 * Shows how to work with multiple businesses in one database
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Business = 'redhillfresh' | 'teelixir' | 'ai_automation' | 'elevate_wholesale' | 'buy_organics' | 'master_ops'

// ============================================
// Example 1: Create tasks for different businesses
// ============================================

async function createTasksForMultipleBusinesses() {
  console.log('📝 Creating tasks for different businesses...\n')

  // Red Hill Fresh task
  const { data: rhhTask } = await supabase.rpc('create_task_with_log', {
    p_title: 'Process Thursday deliveries',
    p_description: 'Prepare delivery routes for Red Hill Fresh',
    p_business: 'redhillfresh',
    p_source: 'n8n_automation'
  })
  console.log('✅ Red Hill Fresh task:', rhhTask)

  // Teelixir task
  const { data: teelixirTask } = await supabase.rpc('create_task_with_log', {
    p_title: 'Update product images',
    p_description: 'Sync Teelixir product images across platforms',
    p_business: 'teelixir',
    p_source: 'shopify_webhook'
  })
  console.log('✅ Teelixir task:', teelixirTask)

  // AI Automation task
  const { data: aiTask } = await supabase.rpc('create_task_with_log', {
    p_title: 'Deploy client workflow',
    p_description: 'Deploy new n8n workflow for client project',
    p_business: 'ai_automation',
    p_source: 'github_webhook'
  })
  console.log('✅ AI Automation task:', aiTask)
}

// ============================================
// Example 2: Query tasks for specific business
// ============================================

async function getBusinessSpecificTasks(business: Business) {
  console.log(`\n🔍 Getting tasks for ${business}...\n`)

  const { data, error } = await supabase.rpc('get_business_tasks', {
    p_business: business,
    p_status: null, // null = all statuses
    p_limit: 10
  })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${data?.length || 0} tasks for ${business}:`)
  data?.forEach((task, i) => {
    console.log(`  ${i + 1}. [${task.status}] ${task.title}`)
  })
}

// ============================================
// Example 3: Get cross-business analytics
// ============================================

async function getBusinessSummary() {
  console.log('\n📊 Business Task Summary:\n')

  const { data, error } = await supabase
    .from('business_task_summary')
    .select('*')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.table(data)
}

// ============================================
// Example 4: Filter tasks by business in direct queries
// ============================================

async function directQueryWithBusinessFilter() {
  console.log('\n🎯 Direct query with business filter...\n')

  // Get all Teelixir tasks that are pending
  const { data: teelixirPending } = await supabase
    .from('tasks')
    .select('*')
    .eq('business', 'teelixir')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  console.log(`Pending Teelixir tasks: ${teelixirPending?.length || 0}`)

  // Get all failed tasks across all businesses
  const { data: allFailed } = await supabase
    .from('tasks')
    .select('*, businesses(display_name)')
    .eq('status', 'failed')

  console.log(`\nFailed tasks across all businesses: ${allFailed?.length || 0}`)
  allFailed?.forEach(task => {
    console.log(`  - [${task.business}] ${task.title}`)
  })
}

// ============================================
// Example 5: Business context switching
// ============================================

async function useBusinessContext() {
  console.log('\n🔄 Using business context...\n')

  // Set context to Teelixir
  await supabase.rpc('set_business_context', { p_business: 'teelixir' })

  console.log('Context set to: Teelixir')
  console.log('Now all operations can reference current_setting(\'app.current_business\')')

  // You could use this in your own custom queries
  const { data } = await supabase.rpc('exec', {
    query: `
      SELECT * FROM tasks
      WHERE business = current_setting('app.current_business', true)::business_type
      LIMIT 5
    `
  })

  console.log('Tasks in current context:', data)
}

// ============================================
// Example 6: Cross-business workflow
// ============================================

async function crossBusinessWorkflow() {
  console.log('\n🔗 Cross-business workflow example...\n')

  // Scenario: Teelixir product update affects Elevate Wholesale

  // 1. Create task for Teelixir
  const { data: teelixirTask } = await supabase.rpc('create_task_with_log', {
    p_title: 'Update product pricing',
    p_business: 'teelixir',
    p_source: 'price_change_trigger'
  })

  console.log('✅ Created Teelixir pricing task')

  // 2. Create related task for Elevate Wholesale
  const { data: elevateTask } = await supabase.rpc('create_task_with_log', {
    p_title: 'Sync wholesale pricing from Teelixir',
    p_description: `Related to Teelixir task: ${teelixirTask?.[0]?.task_id}`,
    p_business: 'elevate_wholesale',
    p_source: 'cross_business_trigger'
  })

  console.log('✅ Created Elevate Wholesale sync task')

  // 3. Log the relationship
  if (teelixirTask?.[0] && elevateTask?.[0]) {
    await supabase.rpc('log_task_action', {
      p_task_id: elevateTask[0].task_id,
      p_source: 'master_ops',
      p_status: 'info',
      p_message: 'Task triggered by Teelixir pricing update',
      p_details_json: {
        source_business: 'teelixir',
        source_task_id: teelixirTask[0].task_id
      }
    })

    console.log('✅ Logged cross-business relationship')
  }
}

// ============================================
// Example 7: Business-specific configuration
// ============================================

async function getBusinessConfig(business: Business) {
  console.log(`\n⚙️  Getting config for ${business}...\n`)

  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('name', business)
    .single()

  if (data) {
    console.log('Business:', data.display_name)
    console.log('Active:', data.is_active)
    console.log('Settings:', data.settings)
  }
}

// ============================================
// Run examples
// ============================================

async function runExamples() {
  console.log('=' .repeat(60))
  console.log('Multi-Business Supabase Examples')
  console.log('=' .repeat(60))

  try {
    // Uncomment to run specific examples:

    // await createTasksForMultipleBusinesses()
    // await getBusinessSpecificTasks('teelixir')
    // await getBusinessSummary()
    // await directQueryWithBusinessFilter()
    // await crossBusinessWorkflow()
    await getBusinessConfig('redhillfresh')

  } catch (error) {
    console.error('Error running examples:', error)
  }
}

// Run if called directly
if (require.main === module) {
  runExamples()
}

export {
  createTasksForMultipleBusinesses,
  getBusinessSpecificTasks,
  getBusinessSummary,
  directQueryWithBusinessFilter,
  crossBusinessWorkflow,
  getBusinessConfig
}
