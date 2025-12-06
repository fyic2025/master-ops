/**
 * Stock Fix Queue Processor
 *
 * Processes stock fix actions queued from the dashboard.
 * Runs every 15 minutes via PM2 cron.
 *
 * Architecture: Supabase-first pattern
 * - Dashboard queues actions to stock_fix_queue
 * - This processor executes them against BigCommerce API
 * - Results logged to stock_fix_log
 *
 * Usage:
 *   npx tsx stock-fix-processor.ts           # Process queue once
 *   npx tsx stock-fix-processor.ts --status  # Show queue status
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// Configuration
const BOO_SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co'
const BOO_SUPABASE_KEY = process.env.BOO_SUPABASE_SERVICE_KEY
const BC_STORE_HASH = process.env.BOO_BC_STORE_HASH
const BC_ACCESS_TOKEN = process.env.BOO_BC_ACCESS_TOKEN

// Dashboard Supabase for job status updates
const DASHBOARD_SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const DASHBOARD_SUPABASE_KEY = process.env.DASHBOARD_SUPABASE_SERVICE_KEY

const BATCH_SIZE = 50
const RATE_LIMIT_MS = 250

interface QueueItem {
  id: string
  product_id: number
  bc_product_id: number
  sku: string
  product_name: string
  action: string
  params: Record<string, any> | null
  status: string
  priority: number
  retry_count: number
  created_at: string
}

interface ProcessResult {
  queueId: string
  productId: number
  sku: string
  action: string
  result: 'success' | 'failed' | 'skipped'
  bcResponse?: any
  error?: string
}

// Validate required environment variables
function validateEnv(): boolean {
  const required = [
    'BOO_SUPABASE_SERVICE_KEY',
    'BOO_BC_STORE_HASH',
    'BOO_BC_ACCESS_TOKEN',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    console.error('ERROR: Missing required environment variables:')
    missing.forEach(key => console.error(`  - ${key}`))
    console.error('\nSet in .env file or run: node creds.js export boo')
    return false
  }

  return true
}

// BigCommerce API call
async function callBigCommerceAPI(
  productId: number,
  data: Record<string, any>
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    const url = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3/catalog/products/${productId}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Auth-Token': BC_ACCESS_TOKEN!,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const responseData = await response.json() as { title?: string; errors?: string[] }

    if (!response.ok) {
      return {
        success: false,
        response: responseData,
        error: responseData?.title || responseData?.errors?.[0] || `HTTP ${response.status}`,
      }
    }

    return { success: true, response: responseData }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Execute a single queue action
async function executeAction(item: QueueItem): Promise<ProcessResult> {
  const result: ProcessResult = {
    queueId: item.id,
    productId: item.bc_product_id,
    sku: item.sku,
    action: item.action,
    result: 'failed',
  }

  // Determine what to send to BigCommerce
  let bcData: Record<string, any> = {}

  switch (item.action) {
    case 'disable':
      bcData = { is_visible: false }
      break

    case 'discontinue':
      bcData = { availability: 'disabled' }
      break

    case 'update_inventory':
      if (!item.params?.inventory_level) {
        result.error = 'Missing inventory_level in params'
        return result
      }
      bcData = { inventory_level: item.params.inventory_level }
      break

    default:
      result.error = `Unknown action: ${item.action}`
      return result
  }

  // Call BigCommerce API
  const bcResult = await callBigCommerceAPI(item.bc_product_id, bcData)

  if (bcResult.success) {
    result.result = 'success'
    result.bcResponse = bcResult.response
  } else {
    result.result = 'failed'
    result.error = bcResult.error
    result.bcResponse = bcResult.response
  }

  return result
}

// Process the queue
async function processQueue(): Promise<{
  processed: number
  succeeded: number
  failed: number
  results: ProcessResult[]
}> {
  if (!validateEnv()) {
    throw new Error('Missing required environment variables')
  }

  const supabase = createClient(BOO_SUPABASE_URL, BOO_SUPABASE_KEY!)

  console.log('\n' + '='.repeat(60))
  console.log(`STOCK FIX PROCESSOR - ${new Date().toISOString()}`)
  console.log('='.repeat(60))

  // Fetch pending items
  const { data: pendingItems, error: fetchError } = await supabase
    .from('stock_fix_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    throw new Error(`Failed to fetch queue: ${fetchError.message}`)
  }

  if (!pendingItems?.length) {
    console.log('No pending items in queue')
    return { processed: 0, succeeded: 0, failed: 0, results: [] }
  }

  console.log(`Found ${pendingItems.length} pending items`)

  // Mark batch as processing
  const queueIds = pendingItems.map(item => item.id)
  await supabase
    .from('stock_fix_queue')
    .update({
      status: 'processing',
      picked_up_at: new Date().toISOString(),
    })
    .in('id', queueIds)

  // Process each item
  const results: ProcessResult[] = []
  let succeeded = 0
  let failed = 0

  for (const item of pendingItems) {
    console.log(`\nProcessing: ${item.sku} - ${item.action}`)

    const result = await executeAction(item)
    results.push(result)

    if (result.result === 'success') {
      succeeded++
      console.log(`  ✓ Success`)
    } else {
      failed++
      console.log(`  ✗ Failed: ${result.error}`)
    }

    // Update queue item
    await supabase
      .from('stock_fix_queue')
      .update({
        status: result.result === 'success' ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        bc_response: result.bcResponse || null,
        error_message: result.error || null,
        retry_count: item.retry_count + (result.result === 'failed' ? 1 : 0),
      })
      .eq('id', item.id)

    // Log to audit table
    await supabase
      .from('stock_fix_log')
      .insert({
        queue_id: item.id,
        product_id: item.product_id,
        bc_product_id: item.bc_product_id,
        sku: item.sku,
        product_name: item.product_name,
        action: item.action,
        params: item.params,
        result: result.result,
        bc_response: result.bcResponse || null,
        error_message: result.error || null,
      })

    // Update dispatch_problem_products fix status
    await supabase
      .from('dispatch_problem_products')
      .update({
        fix_status: result.result === 'success' ? 'fixed' : 'failed',
        last_fix_at: new Date().toISOString(),
      })
      .eq('id', item.product_id)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
  }

  console.log('\n' + '-'.repeat(60))
  console.log(`Processed: ${results.length} | Succeeded: ${succeeded} | Failed: ${failed}`)

  // Update dashboard job status
  if (DASHBOARD_SUPABASE_KEY) {
    try {
      const dashboardSupabase = createClient(DASHBOARD_SUPABASE_URL, DASHBOARD_SUPABASE_KEY)
      await dashboardSupabase.rpc('update_job_status', {
        p_job_name: 'stock-fix-processor',
        p_business: 'boo',
        p_last_run: new Date().toISOString(),
        p_success: failed === 0,
        p_error_message: failed > 0 ? `${failed} items failed` : null,
      })
      console.log('Updated dashboard job status')
    } catch (err: any) {
      console.error('Failed to update dashboard:', err.message)
    }
  }

  return { processed: results.length, succeeded, failed, results }
}

// Get queue status
async function getQueueStatus(): Promise<void> {
  if (!BOO_SUPABASE_KEY) {
    console.error('ERROR: Missing BOO_SUPABASE_SERVICE_KEY')
    return
  }

  const supabase = createClient(BOO_SUPABASE_URL, BOO_SUPABASE_KEY)

  // Get counts by status
  const { data: pending } = await supabase
    .from('stock_fix_queue')
    .select('id')
    .eq('status', 'pending')

  const { data: processing } = await supabase
    .from('stock_fix_queue')
    .select('id')
    .eq('status', 'processing')

  // Get recent completed
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: completed } = await supabase
    .from('stock_fix_queue')
    .select('id, status')
    .in('status', ['completed', 'failed'])
    .gte('completed_at', oneDayAgo)

  const succeededCount = completed?.filter(c => c.status === 'completed').length || 0
  const failedCount = completed?.filter(c => c.status === 'failed').length || 0

  console.log('\nStock Fix Queue Status')
  console.log('-'.repeat(40))
  console.log(`Pending:    ${pending?.length || 0}`)
  console.log(`Processing: ${processing?.length || 0}`)
  console.log(`\nLast 24 hours:`)
  console.log(`  Succeeded: ${succeededCount}`)
  console.log(`  Failed:    ${failedCount}`)
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--status')) {
    await getQueueStatus()
  } else {
    try {
      const result = await processQueue()
      process.exit(result.failed > 0 ? 1 : 0)
    } catch (err: any) {
      console.error('Processor error:', err.message)
      process.exit(1)
    }
  }
}

main()
