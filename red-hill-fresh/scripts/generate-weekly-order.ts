#!/usr/bin/env npx tsx
/**
 * Red Hill Fresh - Generate Weekly Order
 *
 * Calculates quantities needed from suppliers based on:
 * - Box contents for the week
 * - Custom orders from WooCommerce
 * - Current stock levels (if tracked)
 *
 * Usage:
 *   npx tsx red-hill-fresh/scripts/generate-weekly-order.ts [options]
 *
 * Options:
 *   --week YYYY-MM-DD    Week start date (default: next Monday)
 *   --supplier CODE      Only generate for specific supplier (poh, melba, ogg, bdm)
 *   --dry-run            Preview without saving to database
 *   --verbose            Show detailed output
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

// ============================================================================
// TYPES
// ============================================================================

interface Supplier {
  id: string
  code: string
  name: string
  minimum_order: number
}

interface SupplierProduct {
  id: string
  supplier_id: string
  name: string
  unit: string
  cost_price: number
  is_available: boolean
}

interface BoxContent {
  box_id: string
  box_name: string
  supplier_product_id: string
  product_name: string
  quantity: number
  unit: string
  supplier_id: string
}

interface CustomOrder {
  id: string
  product_name: string
  quantity: number
  unit: string
}

interface OrderLine {
  supplier_product_id: string
  product_name: string
  quantity_needed: number
  quantity_in_stock: number
  quantity_to_order: number
  unit: string
  unit_cost: number
  line_total: number
  source_breakdown: Record<string, number>
}

interface Config {
  weekStart: string
  supplierFilter?: string
  dryRun: boolean
  verbose: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function getNextMonday(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  return nextMonday.toISOString().split('T')[0]
}

function parseArgs(): Config {
  const args = process.argv.slice(2)
  const config: Config = {
    weekStart: getNextMonday(),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  }

  const weekIdx = args.indexOf('--week')
  if (weekIdx !== -1 && args[weekIdx + 1]) {
    config.weekStart = args[weekIdx + 1]
  }

  const supplierIdx = args.indexOf('--supplier')
  if (supplierIdx !== -1 && args[supplierIdx + 1]) {
    config.supplierFilter = args[supplierIdx + 1]
  }

  return config
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getSuppliers(supabase: SupabaseClient, supplierFilter?: string): Promise<Supplier[]> {
  let query = supabase
    .from('rhf_suppliers')
    .select('id, code, name, minimum_order')
    .eq('is_active', true)

  if (supplierFilter) {
    query = query.eq('code', supplierFilter)
  }

  const { data, error } = await query.order('name')

  if (error) throw new Error(`Failed to get suppliers: ${error.message}`)
  return data || []
}

async function getBoxContents(supabase: SupabaseClient, weekStart: string): Promise<BoxContent[]> {
  const { data, error } = await supabase
    .from('rhf_box_contents')
    .select(`
      box_id,
      item_name,
      quantity,
      unit,
      supplier_id,
      supplier_product_id,
      rhf_boxes(name)
    `)
    .eq('week_start', weekStart)

  if (error) throw new Error(`Failed to get box contents: ${error.message}`)

  return (data || []).map((row: any) => ({
    box_id: row.box_id,
    box_name: row.rhf_boxes?.name || 'Unknown Box',
    supplier_product_id: row.supplier_product_id,
    product_name: row.item_name,
    quantity: row.quantity,
    unit: row.unit,
    supplier_id: row.supplier_id,
  }))
}

async function getCustomOrders(supabase: SupabaseClient, weekStart: string): Promise<CustomOrder[]> {
  const { data, error } = await supabase
    .from('rhf_custom_orders')
    .select('id, product_name, quantity, unit')
    .eq('week_start', weekStart)
    .eq('status', 'pending')

  if (error) throw new Error(`Failed to get custom orders: ${error.message}`)
  return data || []
}

async function getStockLevels(supabase: SupabaseClient): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('rhf_stock_levels')
    .select('supplier_product_id, quantity')
    .eq('status', 'available')

  if (error) {
    console.warn(`Warning: Could not fetch stock levels: ${error.message}`)
    return new Map()
  }

  const stockMap = new Map<string, number>()
  for (const row of data || []) {
    if (row.supplier_product_id) {
      const current = stockMap.get(row.supplier_product_id) || 0
      stockMap.set(row.supplier_product_id, current + row.quantity)
    }
  }
  return stockMap
}

async function getSupplierProducts(supabase: SupabaseClient, supplierId: string): Promise<Map<string, SupplierProduct>> {
  const { data, error } = await supabase
    .from('rhf_supplier_products')
    .select('id, supplier_id, name, unit, cost_price, is_available')
    .eq('supplier_id', supplierId)
    .eq('is_available', true)

  if (error) throw new Error(`Failed to get supplier products: ${error.message}`)

  const productMap = new Map<string, SupplierProduct>()
  for (const product of data || []) {
    productMap.set(product.id, product)
  }
  return productMap
}

async function saveWeeklyOrder(
  supabase: SupabaseClient,
  supplierId: string,
  weekStart: string,
  lines: OrderLine[]
): Promise<string> {
  // Calculate totals
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0)
  const gst = subtotal * 0.1
  const total = subtotal + gst

  // Upsert order header
  const { data: order, error: orderError } = await supabase
    .from('rhf_weekly_orders')
    .upsert({
      supplier_id: supplierId,
      week_start: weekStart,
      status: 'draft',
      subtotal,
      gst,
      total,
      line_count: lines.length,
    }, {
      onConflict: 'supplier_id,week_start',
    })
    .select('id')
    .single()

  if (orderError) throw new Error(`Failed to save order: ${orderError.message}`)

  // Delete existing lines
  await supabase
    .from('rhf_weekly_order_lines')
    .delete()
    .eq('weekly_order_id', order.id)

  // Insert new lines
  if (lines.length > 0) {
    const lineInserts = lines.map(line => ({
      weekly_order_id: order.id,
      supplier_product_id: line.supplier_product_id,
      product_name: line.product_name,
      quantity_needed: line.quantity_needed,
      quantity_in_stock: line.quantity_in_stock,
      quantity_to_order: line.quantity_to_order,
      unit: line.unit,
      unit_cost: line.unit_cost,
      line_total: line.line_total,
      source_breakdown: line.source_breakdown,
    }))

    const { error: linesError } = await supabase
      .from('rhf_weekly_order_lines')
      .insert(lineInserts)

    if (linesError) throw new Error(`Failed to save order lines: ${linesError.message}`)
  }

  return order.id
}

// ============================================================================
// ORDER GENERATION
// ============================================================================

async function generateOrderForSupplier(
  supabase: SupabaseClient,
  supplier: Supplier,
  weekStart: string,
  boxContents: BoxContent[],
  customOrders: CustomOrder[],
  stockLevels: Map<string, number>,
  config: Config
): Promise<{ orderId?: string; lineCount: number; total: number }> {
  // Filter box contents for this supplier
  const supplierBoxContents = boxContents.filter(bc => bc.supplier_id === supplier.id)

  // Get supplier products for lookups
  const products = await getSupplierProducts(supabase, supplier.id)

  // Aggregate quantities by product
  const productQuantities = new Map<string, {
    quantity: number
    sources: Record<string, number>
    product: SupplierProduct | undefined
  }>()

  // Add box content quantities
  for (const bc of supplierBoxContents) {
    const existing = productQuantities.get(bc.supplier_product_id) || {
      quantity: 0,
      sources: {},
      product: products.get(bc.supplier_product_id),
    }
    existing.quantity += bc.quantity
    existing.sources[bc.box_name] = (existing.sources[bc.box_name] || 0) + bc.quantity
    productQuantities.set(bc.supplier_product_id, existing)
  }

  // TODO: Match custom orders to supplier products by name
  // For now, custom orders need manual matching

  // Build order lines
  const lines: OrderLine[] = []

  for (const [productId, data] of productQuantities) {
    if (!data.product) {
      if (config.verbose) {
        console.log(`  Warning: Product ${productId} not found in supplier products`)
      }
      continue
    }

    const stockQty = stockLevels.get(productId) || 0
    const qtyToOrder = Math.max(0, data.quantity - stockQty)

    if (qtyToOrder > 0) {
      lines.push({
        supplier_product_id: productId,
        product_name: data.product.name,
        quantity_needed: data.quantity,
        quantity_in_stock: stockQty,
        quantity_to_order: qtyToOrder,
        unit: data.product.unit,
        unit_cost: data.product.cost_price,
        line_total: qtyToOrder * data.product.cost_price,
        source_breakdown: data.sources,
      })
    }
  }

  // Check minimum order
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0)
  if (subtotal < supplier.minimum_order && lines.length > 0) {
    console.log(`  Warning: Order total $${subtotal.toFixed(2)} below minimum $${supplier.minimum_order}`)
  }

  // Save order
  let orderId: string | undefined
  if (!config.dryRun && lines.length > 0) {
    orderId = await saveWeeklyOrder(supabase, supplier.id, weekStart, lines)
  }

  const total = subtotal * 1.1 // Include GST
  return { orderId, lineCount: lines.length, total }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const config = parseArgs()

  console.log('='.repeat(60))
  console.log('RHF Weekly Order Generator')
  console.log('='.repeat(60))
  console.log(`Week: ${config.weekStart}`)
  console.log(`Supplier filter: ${config.supplierFilter || 'all'}`)
  console.log(`Dry run: ${config.dryRun}`)
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
    // Get data
    const suppliers = await getSuppliers(supabase, config.supplierFilter)
    const boxContents = await getBoxContents(supabase, config.weekStart)
    const customOrders = await getCustomOrders(supabase, config.weekStart)
    const stockLevels = await getStockLevels(supabase)

    console.log(`\nFound ${suppliers.length} suppliers`)
    console.log(`Found ${boxContents.length} box content items`)
    console.log(`Found ${customOrders.length} custom orders`)
    console.log(`Found ${stockLevels.size} products with stock`)

    if (boxContents.length === 0) {
      console.log('\nNo box contents defined for this week.')
      console.log('Add box contents first, then run this script.')
      return
    }

    // Generate orders for each supplier
    let totalOrders = 0
    let grandTotal = 0

    for (const supplier of suppliers) {
      console.log(`\nProcessing ${supplier.name}...`)

      const result = await generateOrderForSupplier(
        supabase,
        supplier,
        config.weekStart,
        boxContents,
        customOrders,
        stockLevels,
        config
      )

      if (result.lineCount > 0) {
        totalOrders++
        grandTotal += result.total
        console.log(`  Lines: ${result.lineCount}`)
        console.log(`  Total: $${result.total.toFixed(2)} (inc GST)`)
        if (result.orderId) {
          console.log(`  Order ID: ${result.orderId}`)
        }
      } else {
        console.log('  No items to order')
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('SUMMARY')
    console.log('='.repeat(60))
    console.log(`Orders created: ${totalOrders}`)
    console.log(`Grand total: $${grandTotal.toFixed(2)} (inc GST)`)

    if (config.dryRun) {
      console.log('\n[DRY RUN - No changes saved]')
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
