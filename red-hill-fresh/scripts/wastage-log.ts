#!/usr/bin/env npx tsx
/**
 * Red Hill Fresh - Wastage Logger
 *
 * Tracks produce wastage/spoilage:
 * - Logs written-off stock with reason
 * - Updates stock levels
 * - Calculates wastage rate
 * - Generates wastage reports
 *
 * Usage:
 *   npx tsx red-hill-fresh/scripts/wastage-log.ts [options]
 *
 * Options:
 *   --product NAME       Product name to write off
 *   --quantity N         Quantity to write off
 *   --reason TEXT        Reason (expired, damaged, quality, other)
 *   --stock-id UUID      Specific stock entry to write off
 *   --check-expired      Find and report expired stock
 *   --report             Generate wastage report
 *   --period N           Report period in days (default: 7)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

// ============================================================================
// TYPES
// ============================================================================

interface StockEntry {
  id: string
  supplier_product_id: string | null
  woo_product_id: string | null
  product_name: string
  quantity: number
  unit: string
  received_date: string
  expiry_date: string | null
  status: string
  storage_location: string | null
}

interface WastageEntry {
  id: string
  product_name: string
  quantity: number
  unit: string
  reason: string
  cost_value: number
  created_at: string
}

interface Config {
  productName?: string
  quantity?: number
  reason?: string
  stockId?: string
  checkExpired: boolean
  generateReport: boolean
  periodDays: number
}

// ============================================================================
// HELPERS
// ============================================================================

function parseArgs(): Config {
  const args = process.argv.slice(2)

  const config: Config = {
    checkExpired: args.includes('--check-expired'),
    generateReport: args.includes('--report'),
    periodDays: 7,
  }

  const productIdx = args.indexOf('--product')
  if (productIdx !== -1 && args[productIdx + 1]) {
    config.productName = args[productIdx + 1]
  }

  const qtyIdx = args.indexOf('--quantity')
  if (qtyIdx !== -1 && args[qtyIdx + 1]) {
    config.quantity = parseFloat(args[qtyIdx + 1])
  }

  const reasonIdx = args.indexOf('--reason')
  if (reasonIdx !== -1 && args[reasonIdx + 1]) {
    config.reason = args[reasonIdx + 1]
  }

  const stockIdx = args.indexOf('--stock-id')
  if (stockIdx !== -1 && args[stockIdx + 1]) {
    config.stockId = args[stockIdx + 1]
  }

  const periodIdx = args.indexOf('--period')
  if (periodIdx !== -1 && args[periodIdx + 1]) {
    config.periodDays = parseInt(args[periodIdx + 1])
  }

  return config
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getExpiredStock(supabase: SupabaseClient): Promise<StockEntry[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('rhf_stock_levels')
    .select('*')
    .eq('status', 'available')
    .lte('expiry_date', today)
    .order('expiry_date')

  if (error) throw new Error(`Failed to get expired stock: ${error.message}`)
  return data || []
}

async function getAvailableStock(supabase: SupabaseClient): Promise<StockEntry[]> {
  const { data, error } = await supabase
    .from('rhf_stock_levels')
    .select('*')
    .eq('status', 'available')
    .order('product_name')

  if (error) throw new Error(`Failed to get stock: ${error.message}`)
  return data || []
}

async function findStockByProduct(supabase: SupabaseClient, productName: string): Promise<StockEntry | null> {
  const { data, error } = await supabase
    .from('rhf_stock_levels')
    .select('*')
    .eq('status', 'available')
    .ilike('product_name', `%${productName}%`)
    .order('expiry_date')
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find stock: ${error.message}`)
  }
  return data
}

async function getStockById(supabase: SupabaseClient, stockId: string): Promise<StockEntry | null> {
  const { data, error } = await supabase
    .from('rhf_stock_levels')
    .select('*')
    .eq('id', stockId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get stock: ${error.message}`)
  }
  return data
}

async function getProductCost(supabase: SupabaseClient, supplierProductId: string): Promise<number> {
  const { data } = await supabase
    .from('rhf_supplier_products')
    .select('cost_price')
    .eq('id', supplierProductId)
    .single()

  return data?.cost_price || 0
}

async function writeOffStock(
  supabase: SupabaseClient,
  stock: StockEntry,
  quantity: number,
  reason: string
): Promise<void> {
  // Get cost for value calculation
  let costValue = 0
  if (stock.supplier_product_id) {
    const costPrice = await getProductCost(supabase, stock.supplier_product_id)
    costValue = quantity * costPrice
  }

  // Update or delete stock entry
  if (quantity >= stock.quantity) {
    // Write off entire stock entry
    const { error } = await supabase
      .from('rhf_stock_levels')
      .update({
        status: 'written_off',
        notes: `Written off: ${reason}`,
      })
      .eq('id', stock.id)

    if (error) throw new Error(`Failed to update stock: ${error.message}`)
  } else {
    // Reduce quantity
    const { error } = await supabase
      .from('rhf_stock_levels')
      .update({
        quantity: stock.quantity - quantity,
      })
      .eq('id', stock.id)

    if (error) throw new Error(`Failed to update stock: ${error.message}`)
  }

  // Log the wastage
  const { error: logError } = await supabase
    .from('rhf_wastage_log')
    .insert({
      stock_level_id: stock.id,
      supplier_product_id: stock.supplier_product_id,
      product_name: stock.product_name,
      quantity,
      unit: stock.unit,
      reason,
      cost_value: costValue,
      notes: `Original stock qty: ${stock.quantity}, Expiry: ${stock.expiry_date || 'N/A'}`,
    })

  // If wastage log table doesn't exist, log to integration_logs
  if (logError && logError.code === '42P01') {
    await supabase.from('integration_logs').insert({
      source: 'rhf',
      service: 'wastage_tracker',
      operation: 'write_off',
      level: 'info',
      status: 'logged',
      message: `Wrote off ${quantity} ${stock.unit} of ${stock.product_name}`,
      details_json: {
        stock_id: stock.id,
        product_name: stock.product_name,
        quantity,
        unit: stock.unit,
        reason,
        cost_value: costValue,
      },
    })
  }
}

async function getWastageLog(supabase: SupabaseClient, periodDays: number): Promise<WastageEntry[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - periodDays)

  // Try wastage log table first
  const { data, error } = await supabase
    .from('rhf_wastage_log')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error && error.code === '42P01') {
    // Table doesn't exist, try integration_logs
    const { data: logs } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('source', 'rhf')
      .eq('service', 'wastage_tracker')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    return (logs || []).map((log: any) => ({
      id: log.id,
      product_name: log.details_json?.product_name || 'Unknown',
      quantity: log.details_json?.quantity || 0,
      unit: log.details_json?.unit || 'each',
      reason: log.details_json?.reason || 'unknown',
      cost_value: log.details_json?.cost_value || 0,
      created_at: log.created_at,
    }))
  }

  return data || []
}

// ============================================================================
// REPORTING
// ============================================================================

function printExpiredStock(expired: StockEntry[]): void {
  console.log('\n' + '='.repeat(70))
  console.log('EXPIRED STOCK')
  console.log('='.repeat(70))

  if (expired.length === 0) {
    console.log('No expired stock found')
    return
  }

  console.log(
    'Product'.padEnd(30) +
    'Qty'.padEnd(10) +
    'Expired'.padEnd(12) +
    'Location'
  )
  console.log('-'.repeat(70))

  for (const stock of expired) {
    console.log(
      stock.product_name.substring(0, 29).padEnd(30) +
      `${stock.quantity} ${stock.unit}`.padEnd(10) +
      (stock.expiry_date || 'N/A').padEnd(12) +
      (stock.storage_location || 'Unknown')
    )
  }

  console.log(`\nTotal: ${expired.length} items expired`)
}

function printWastageReport(wastage: WastageEntry[], periodDays: number): void {
  console.log('\n' + '='.repeat(70))
  console.log(`WASTAGE REPORT (Last ${periodDays} days)`)
  console.log('='.repeat(70))

  if (wastage.length === 0) {
    console.log('No wastage recorded in this period')
    return
  }

  // Group by reason
  const byReason = new Map<string, { count: number; value: number }>()
  for (const w of wastage) {
    const existing = byReason.get(w.reason) || { count: 0, value: 0 }
    existing.count++
    existing.value += w.cost_value
    byReason.set(w.reason, existing)
  }

  console.log('\nBy Reason:')
  console.log('-'.repeat(40))
  for (const [reason, stats] of byReason) {
    console.log(`  ${reason}: ${stats.count} items, $${stats.value.toFixed(2)}`)
  }

  // Total value
  const totalValue = wastage.reduce((sum, w) => sum + w.cost_value, 0)

  console.log('\n' + '-'.repeat(40))
  console.log(`Total wastage: ${wastage.length} items`)
  console.log(`Total value lost: $${totalValue.toFixed(2)}`)

  // Recent items
  console.log('\nRecent Items:')
  console.log('-'.repeat(70))
  console.log(
    'Date'.padEnd(12) +
    'Product'.padEnd(30) +
    'Qty'.padEnd(10) +
    'Reason'.padEnd(12) +
    'Value'
  )
  console.log('-'.repeat(70))

  for (const w of wastage.slice(0, 15)) {
    const date = new Date(w.created_at).toISOString().split('T')[0]
    console.log(
      date.padEnd(12) +
      w.product_name.substring(0, 29).padEnd(30) +
      `${w.quantity}`.padEnd(10) +
      w.reason.padEnd(12) +
      `$${w.cost_value.toFixed(2)}`
    )
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const config = parseArgs()

  console.log('='.repeat(60))
  console.log('RHF Wastage Tracker')
  console.log('='.repeat(60))

  // Initialize Supabase
  const supabaseUrl = process.env.MASTER_SUPABASE_URL || process.env.BOO_SUPABASE_URL
  const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Check expired stock
    if (config.checkExpired) {
      const expired = await getExpiredStock(supabase)
      printExpiredStock(expired)
      return
    }

    // Generate report
    if (config.generateReport) {
      const wastage = await getWastageLog(supabase, config.periodDays)
      printWastageReport(wastage, config.periodDays)
      return
    }

    // Write off specific stock
    if (config.productName || config.stockId) {
      if (!config.quantity) {
        console.error('Error: --quantity required')
        process.exit(1)
      }
      if (!config.reason) {
        console.error('Error: --reason required (expired, damaged, quality, other)')
        process.exit(1)
      }

      let stock: StockEntry | null

      if (config.stockId) {
        stock = await getStockById(supabase, config.stockId)
      } else if (config.productName) {
        stock = await findStockByProduct(supabase, config.productName)
      } else {
        stock = null
      }

      if (!stock) {
        console.error('Stock entry not found')
        process.exit(1)
      }

      console.log(`\nWriting off stock:`)
      console.log(`  Product: ${stock.product_name}`)
      console.log(`  Available: ${stock.quantity} ${stock.unit}`)
      console.log(`  Write off: ${config.quantity} ${stock.unit}`)
      console.log(`  Reason: ${config.reason}`)

      if (config.quantity > stock.quantity) {
        console.error(`\nError: Cannot write off more than available (${stock.quantity})`)
        process.exit(1)
      }

      await writeOffStock(supabase, stock, config.quantity, config.reason)

      console.log('\nDone!')
      return
    }

    // No action specified - show available stock
    const available = await getAvailableStock(supabase)

    console.log('\nAvailable Stock:')
    console.log('-'.repeat(70))

    if (available.length === 0) {
      console.log('No stock entries found')
    } else {
      console.log(
        'Product'.padEnd(30) +
        'Qty'.padEnd(10) +
        'Expiry'.padEnd(12) +
        'Status'
      )
      console.log('-'.repeat(70))

      for (const stock of available.slice(0, 20)) {
        const isExpired = stock.expiry_date && new Date(stock.expiry_date) < new Date()
        console.log(
          stock.product_name.substring(0, 29).padEnd(30) +
          `${stock.quantity} ${stock.unit}`.padEnd(10) +
          (stock.expiry_date || 'N/A').padEnd(12) +
          (isExpired ? 'EXPIRED' : 'OK')
        )
      }

      if (available.length > 20) {
        console.log(`... and ${available.length - 20} more items`)
      }
    }

    console.log('\nUsage:')
    console.log('  --check-expired              Find expired stock')
    console.log('  --report                     Generate wastage report')
    console.log('  --product NAME --quantity N --reason expired/damaged/quality')

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
