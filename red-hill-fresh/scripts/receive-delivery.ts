#!/usr/bin/env npx tsx
/**
 * Red Hill Fresh - Receive Delivery
 *
 * Records received quantities from supplier deliveries:
 * - Updates order status to 'received'
 * - Records actual quantities received
 * - Updates stock levels
 * - Logs variances (ordered vs received)
 *
 * Usage:
 *   npx tsx red-hill-fresh/scripts/receive-delivery.ts [options]
 *
 * Options:
 *   --order-id UUID      Weekly order ID to receive
 *   --week YYYY-MM-DD    Week start to find order
 *   --supplier CODE      Supplier code (poh, melba, ogg, bdm)
 *   --interactive        Prompt for each line item quantity
 *   --receive-all        Mark all items as fully received
 *   --dry-run            Preview without saving
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

// ============================================================================
// TYPES
// ============================================================================

interface OrderLine {
  id: string
  supplier_product_id: string
  product_name: string
  quantity_to_order: number
  quantity_received: number
  unit: string
  unit_cost: number
}

interface WeeklyOrder {
  id: string
  supplier_id: string
  supplier_name: string
  supplier_code: string
  week_start: string
  status: string
  total: number
  line_count: number
}

interface ReceivedItem {
  line_id: string
  supplier_product_id: string
  product_name: string
  ordered: number
  received: number
  variance: number
  unit: string
}

interface Config {
  orderId?: string
  weekStart?: string
  supplierCode?: string
  interactive: boolean
  receiveAll: boolean
  dryRun: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function parseArgs(): Config {
  const args = process.argv.slice(2)

  const config: Config = {
    interactive: args.includes('--interactive') || args.includes('-i'),
    receiveAll: args.includes('--receive-all'),
    dryRun: args.includes('--dry-run'),
  }

  const orderIdx = args.indexOf('--order-id')
  if (orderIdx !== -1 && args[orderIdx + 1]) {
    config.orderId = args[orderIdx + 1]
  }

  const weekIdx = args.indexOf('--week')
  if (weekIdx !== -1 && args[weekIdx + 1]) {
    config.weekStart = args[weekIdx + 1]
  }

  const supplierIdx = args.indexOf('--supplier')
  if (supplierIdx !== -1 && args[supplierIdx + 1]) {
    config.supplierCode = args[supplierIdx + 1]
  }

  return config
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function findOrder(supabase: SupabaseClient, config: Config): Promise<WeeklyOrder | null> {
  let query = supabase
    .from('rhf_weekly_orders')
    .select(`
      id,
      supplier_id,
      week_start,
      status,
      total,
      line_count,
      rhf_suppliers(name, code)
    `)

  if (config.orderId) {
    query = query.eq('id', config.orderId)
  } else if (config.weekStart && config.supplierCode) {
    query = query
      .eq('week_start', config.weekStart)
      .eq('rhf_suppliers.code', config.supplierCode)
  } else if (config.weekStart) {
    query = query.eq('week_start', config.weekStart)
  }

  query = query.in('status', ['submitted', 'confirmed', 'draft'])

  const { data, error } = await query.limit(1).single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find order: ${error.message}`)
  }

  return {
    id: data.id,
    supplier_id: data.supplier_id,
    supplier_name: (data.rhf_suppliers as any)?.name || 'Unknown',
    supplier_code: (data.rhf_suppliers as any)?.code || '',
    week_start: data.week_start,
    status: data.status,
    total: data.total,
    line_count: data.line_count,
  }
}

async function getOrderLines(supabase: SupabaseClient, orderId: string): Promise<OrderLine[]> {
  const { data, error } = await supabase
    .from('rhf_weekly_order_lines')
    .select(`
      id,
      supplier_product_id,
      product_name,
      quantity_to_order,
      quantity_received,
      unit,
      unit_cost
    `)
    .eq('weekly_order_id', orderId)
    .order('product_name')

  if (error) throw new Error(`Failed to get order lines: ${error.message}`)
  return data || []
}

async function updateOrderLine(
  supabase: SupabaseClient,
  lineId: string,
  quantityReceived: number
): Promise<void> {
  const { error } = await supabase
    .from('rhf_weekly_order_lines')
    .update({ quantity_received: quantityReceived })
    .eq('id', lineId)

  if (error) throw new Error(`Failed to update line: ${error.message}`)
}

async function markOrderReceived(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await supabase
    .from('rhf_weekly_orders')
    .update({
      status: 'received',
      received_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) throw new Error(`Failed to update order status: ${error.message}`)
}

async function updateStockLevel(
  supabase: SupabaseClient,
  supplierProductId: string,
  productName: string,
  quantity: number,
  unit: string
): Promise<void> {
  // Calculate expiry (default 7 days for produce)
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 7)

  const { error } = await supabase
    .from('rhf_stock_levels')
    .insert({
      supplier_product_id: supplierProductId,
      product_name: productName,
      quantity,
      unit,
      received_date: new Date().toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      status: 'available',
      storage_location: 'coolroom_1',
    })

  if (error) throw new Error(`Failed to update stock: ${error.message}`)
}

async function logVariance(
  supabase: SupabaseClient,
  orderId: string,
  items: ReceivedItem[]
): Promise<void> {
  const variances = items.filter(i => i.variance !== 0)

  if (variances.length === 0) return

  // Log to integration_logs for visibility
  await supabase.from('integration_logs').insert({
    source: 'rhf',
    service: 'delivery_receipt',
    operation: 'variance_detected',
    level: 'warning',
    status: 'logged',
    message: `${variances.length} items with quantity variances`,
    details_json: {
      order_id: orderId,
      variances: variances.map(v => ({
        product: v.product_name,
        ordered: v.ordered,
        received: v.received,
        variance: v.variance,
      })),
    },
  })
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const config = parseArgs()

  console.log('='.repeat(60))
  console.log('RHF Delivery Receipt')
  console.log('='.repeat(60))

  if (!config.orderId && !config.weekStart) {
    console.error('Error: Must specify --order-id or --week')
    console.log('\nUsage:')
    console.log('  npx tsx receive-delivery.ts --order-id <uuid>')
    console.log('  npx tsx receive-delivery.ts --week 2024-12-09 --supplier poh')
    console.log('  npx tsx receive-delivery.ts --week 2024-12-09 --supplier poh --receive-all')
    process.exit(1)
  }

  // Initialize Supabase
  const supabaseUrl = process.env.MASTER_SUPABASE_URL || process.env.BOO_SUPABASE_URL
  const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Find order
    const order = await findOrder(supabase, config)

    if (!order) {
      console.error('Order not found')
      process.exit(1)
    }

    console.log(`\nOrder: ${order.id}`)
    console.log(`Supplier: ${order.supplier_name} (${order.supplier_code})`)
    console.log(`Week: ${order.week_start}`)
    console.log(`Status: ${order.status}`)
    console.log(`Lines: ${order.line_count}`)
    console.log(`Total: $${order.total.toFixed(2)}`)

    // Get order lines
    const lines = await getOrderLines(supabase, order.id)

    if (lines.length === 0) {
      console.log('\nNo order lines found')
      return
    }

    console.log('\n' + '-'.repeat(60))
    console.log('ORDER LINES')
    console.log('-'.repeat(60))

    const receivedItems: ReceivedItem[] = []

    for (const line of lines) {
      let received = line.quantity_to_order // Default to ordered quantity

      if (config.receiveAll) {
        // Receive all as ordered
        received = line.quantity_to_order
      } else if (config.interactive) {
        // Prompt for each line
        console.log(`\n${line.product_name}`)
        console.log(`  Ordered: ${line.quantity_to_order} ${line.unit}`)
        const input = await prompt(`  Received [${line.quantity_to_order}]: `)
        received = input ? parseFloat(input) : line.quantity_to_order
      }

      const variance = received - line.quantity_to_order

      receivedItems.push({
        line_id: line.id,
        supplier_product_id: line.supplier_product_id,
        product_name: line.product_name,
        ordered: line.quantity_to_order,
        received,
        variance,
        unit: line.unit,
      })

      // Show line
      const varianceStr = variance === 0 ? '' : variance > 0 ? ` (+${variance})` : ` (${variance})`
      console.log(`  ${line.product_name}: ${received}/${line.quantity_to_order} ${line.unit}${varianceStr}`)
    }

    // Summary
    console.log('\n' + '-'.repeat(60))
    console.log('SUMMARY')
    console.log('-'.repeat(60))

    const totalOrdered = receivedItems.reduce((sum, i) => sum + i.ordered, 0)
    const totalReceived = receivedItems.reduce((sum, i) => sum + i.received, 0)
    const itemsWithVariance = receivedItems.filter(i => i.variance !== 0).length

    console.log(`Items: ${receivedItems.length}`)
    console.log(`Total ordered: ${totalOrdered}`)
    console.log(`Total received: ${totalReceived}`)
    console.log(`Items with variance: ${itemsWithVariance}`)

    if (config.dryRun) {
      console.log('\n[DRY RUN - No changes saved]')
      return
    }

    // Confirm
    if (!config.receiveAll && !config.interactive) {
      const confirm = await prompt('\nSave receipt? (y/n): ')
      if (confirm.toLowerCase() !== 'y') {
        console.log('Cancelled')
        return
      }
    }

    // Save updates
    console.log('\nSaving...')

    for (const item of receivedItems) {
      // Update order line
      await updateOrderLine(supabase, item.line_id, item.received)

      // Update stock levels
      if (item.received > 0) {
        await updateStockLevel(
          supabase,
          item.supplier_product_id,
          item.product_name,
          item.received,
          item.unit
        )
      }
    }

    // Mark order as received
    await markOrderReceived(supabase, order.id)

    // Log variances
    await logVariance(supabase, order.id, receivedItems)

    console.log('Done!')
    console.log(`Order ${order.id} marked as received`)
    console.log(`${receivedItems.length} stock entries created`)

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
