#!/usr/bin/env npx tsx
/**
 * Red Hill Fresh - Update Margins
 *
 * Calculates product margins after pricelist import:
 * - Compares supplier costs to WooCommerce selling prices
 * - Flags low-margin products (<25%)
 * - Detects price changes from previous pricelist
 * - Generates margin report
 *
 * Usage:
 *   npx tsx red-hill-fresh/scripts/update-margins.ts [options]
 *
 * Options:
 *   --threshold N    Margin threshold % (default: 25)
 *   --report         Generate detailed report
 *   --alert          Log alerts for low margins
 *   --supplier CODE  Only process specific supplier
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

// ============================================================================
// TYPES
// ============================================================================

interface ProductMapping {
  id: string
  woo_product_id: string
  supplier_product_id: string
  is_primary: boolean
  supplier_unit_kg: number | null
}

interface WooProduct {
  id: string
  woo_id: number
  name: string
  sku: string
  price: number
}

interface SupplierProduct {
  id: string
  supplier_id: string
  name: string
  cost_price: number
  unit: string
}

interface Supplier {
  id: string
  code: string
  name: string
}

interface MarginResult {
  woo_product_id: string
  woo_name: string
  sku: string
  selling_price: number
  supplier_name: string
  supplier_code: string
  cost_price: number
  margin_amount: number
  margin_percent: number
  is_low_margin: boolean
}

interface PriceChange {
  product_name: string
  supplier_code: string
  old_price: number
  new_price: number
  change_percent: number
}

interface Config {
  threshold: number
  generateReport: boolean
  logAlerts: boolean
  supplierFilter?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function parseArgs(): Config {
  const args = process.argv.slice(2)

  const config: Config = {
    threshold: 25,
    generateReport: args.includes('--report'),
    logAlerts: args.includes('--alert'),
  }

  const thresholdIdx = args.indexOf('--threshold')
  if (thresholdIdx !== -1 && args[thresholdIdx + 1]) {
    config.threshold = parseFloat(args[thresholdIdx + 1])
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

async function getSuppliers(supabase: SupabaseClient): Promise<Map<string, Supplier>> {
  const { data, error } = await supabase
    .from('rhf_suppliers')
    .select('id, code, name')
    .eq('is_active', true)

  if (error) throw new Error(`Failed to get suppliers: ${error.message}`)

  const map = new Map<string, Supplier>()
  for (const s of data || []) {
    map.set(s.id, s)
  }
  return map
}

async function getProductMappings(supabase: SupabaseClient): Promise<ProductMapping[]> {
  const { data, error } = await supabase
    .from('rhf_product_mappings')
    .select('id, woo_product_id, supplier_product_id, is_primary, supplier_unit_kg')

  if (error) throw new Error(`Failed to get mappings: ${error.message}`)
  return data || []
}

async function getWooProducts(supabase: SupabaseClient): Promise<Map<string, WooProduct>> {
  const { data, error } = await supabase
    .from('rhf_woo_products')
    .select('id, woo_id, name, sku, price')
    .eq('status', 'publish')

  if (error) throw new Error(`Failed to get WooCommerce products: ${error.message}`)

  const map = new Map<string, WooProduct>()
  for (const p of data || []) {
    map.set(p.id, p)
  }
  return map
}

async function getSupplierProducts(supabase: SupabaseClient): Promise<Map<string, SupplierProduct>> {
  const { data, error } = await supabase
    .from('rhf_supplier_products')
    .select('id, supplier_id, name, cost_price, unit')
    .eq('is_available', true)

  if (error) throw new Error(`Failed to get supplier products: ${error.message}`)

  const map = new Map<string, SupplierProduct>()
  for (const p of data || []) {
    map.set(p.id, p)
  }
  return map
}

async function upsertMargin(
  supabase: SupabaseClient,
  result: MarginResult,
  supplierId: string,
  threshold: number
): Promise<void> {
  const { error } = await supabase
    .from('rhf_margins')
    .upsert({
      woo_product_id: result.woo_product_id,
      selling_price: result.selling_price,
      primary_supplier_id: supplierId,
      primary_cost: result.cost_price,
      lowest_cost: result.cost_price,
      margin_amount: result.margin_amount,
      margin_percent: result.margin_percent,
      is_low_margin: result.margin_percent < threshold,
      margin_threshold: threshold,
      calculated_at: new Date().toISOString(),
    }, {
      onConflict: 'woo_product_id',
    })

  if (error) throw new Error(`Failed to upsert margin: ${error.message}`)
}

async function logLowMarginAlert(
  supabase: SupabaseClient,
  lowMarginProducts: MarginResult[]
): Promise<void> {
  if (lowMarginProducts.length === 0) return

  await supabase.from('integration_logs').insert({
    source: 'rhf',
    service: 'margin_calculator',
    operation: 'low_margin_alert',
    level: 'warning',
    status: 'logged',
    message: `${lowMarginProducts.length} products with low margins detected`,
    details_json: {
      count: lowMarginProducts.length,
      products: lowMarginProducts.slice(0, 20).map(p => ({
        name: p.woo_name,
        margin: p.margin_percent.toFixed(1) + '%',
        cost: p.cost_price,
        sell: p.selling_price,
        supplier: p.supplier_code,
      })),
    },
  })
}

// ============================================================================
// MARGIN CALCULATION
// ============================================================================

function calculateMargins(
  mappings: ProductMapping[],
  wooProducts: Map<string, WooProduct>,
  supplierProducts: Map<string, SupplierProduct>,
  suppliers: Map<string, Supplier>,
  config: Config
): MarginResult[] {
  const results: MarginResult[] = []

  for (const mapping of mappings) {
    const woo = wooProducts.get(mapping.woo_product_id)
    const supplier = supplierProducts.get(mapping.supplier_product_id)

    if (!woo || !supplier) continue
    if (!woo.price || woo.price === 0) continue

    const supplierInfo = suppliers.get(supplier.supplier_id)
    if (!supplierInfo) continue

    // Filter by supplier if specified
    if (config.supplierFilter && supplierInfo.code !== config.supplierFilter) {
      continue
    }

    // Calculate cost per unit sold
    // If supplier_unit_kg is set, convert from box price to per-kg price
    let costPerUnit = supplier.cost_price
    if (mapping.supplier_unit_kg && mapping.supplier_unit_kg > 0) {
      costPerUnit = supplier.cost_price / mapping.supplier_unit_kg
    }

    const marginAmount = woo.price - costPerUnit
    const marginPercent = (marginAmount / woo.price) * 100

    results.push({
      woo_product_id: woo.id,
      woo_name: woo.name,
      sku: woo.sku || '',
      selling_price: woo.price,
      supplier_name: supplierInfo.name,
      supplier_code: supplierInfo.code,
      cost_price: costPerUnit,
      margin_amount: marginAmount,
      margin_percent: marginPercent,
      is_low_margin: marginPercent < config.threshold,
    })
  }

  // Sort by margin (lowest first)
  results.sort((a, b) => a.margin_percent - b.margin_percent)

  return results
}

// ============================================================================
// REPORTING
// ============================================================================

function printReport(results: MarginResult[], config: Config): void {
  console.log('\n' + '='.repeat(80))
  console.log('MARGIN REPORT')
  console.log('='.repeat(80))

  // Summary
  const lowMargin = results.filter(r => r.is_low_margin)
  const avgMargin = results.length > 0
    ? results.reduce((sum, r) => sum + r.margin_percent, 0) / results.length
    : 0

  console.log(`\nProducts analyzed: ${results.length}`)
  console.log(`Average margin: ${avgMargin.toFixed(1)}%`)
  console.log(`Low margin (<${config.threshold}%): ${lowMargin.length}`)

  // Low margin products
  if (lowMargin.length > 0) {
    console.log('\n' + '-'.repeat(80))
    console.log('LOW MARGIN PRODUCTS')
    console.log('-'.repeat(80))
    console.log(
      'Product'.padEnd(35) +
      'Margin'.padEnd(10) +
      'Cost'.padEnd(10) +
      'Sell'.padEnd(10) +
      'Supplier'
    )
    console.log('-'.repeat(80))

    for (const p of lowMargin.slice(0, 30)) {
      console.log(
        p.woo_name.substring(0, 34).padEnd(35) +
        (p.margin_percent.toFixed(1) + '%').padEnd(10) +
        ('$' + p.cost_price.toFixed(2)).padEnd(10) +
        ('$' + p.selling_price.toFixed(2)).padEnd(10) +
        p.supplier_code
      )
    }

    if (lowMargin.length > 30) {
      console.log(`... and ${lowMargin.length - 30} more`)
    }
  }

  // Healthy margin products (top 10)
  const healthyMargin = results.filter(r => !r.is_low_margin)
  if (healthyMargin.length > 0 && config.generateReport) {
    console.log('\n' + '-'.repeat(80))
    console.log('TOP MARGIN PRODUCTS')
    console.log('-'.repeat(80))

    const topProducts = [...healthyMargin].reverse().slice(0, 10)
    for (const p of topProducts) {
      console.log(
        p.woo_name.substring(0, 34).padEnd(35) +
        (p.margin_percent.toFixed(1) + '%').padEnd(10) +
        ('$' + p.cost_price.toFixed(2)).padEnd(10) +
        ('$' + p.selling_price.toFixed(2)).padEnd(10) +
        p.supplier_code
      )
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const config = parseArgs()

  console.log('='.repeat(60))
  console.log('RHF Margin Calculator')
  console.log('='.repeat(60))
  console.log(`Threshold: ${config.threshold}%`)
  console.log(`Supplier filter: ${config.supplierFilter || 'all'}`)
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
    // Load data
    console.log('\nLoading data...')
    const suppliers = await getSuppliers(supabase)
    const mappings = await getProductMappings(supabase)
    const wooProducts = await getWooProducts(supabase)
    const supplierProducts = await getSupplierProducts(supabase)

    console.log(`Suppliers: ${suppliers.size}`)
    console.log(`Product mappings: ${mappings.length}`)
    console.log(`WooCommerce products: ${wooProducts.size}`)
    console.log(`Supplier products: ${supplierProducts.size}`)

    if (mappings.length === 0) {
      console.log('\nNo product mappings found.')
      console.log('Create mappings between supplier products and WooCommerce products first.')
      return
    }

    // Calculate margins
    console.log('\nCalculating margins...')
    const results = calculateMargins(mappings, wooProducts, supplierProducts, suppliers, config)

    if (results.length === 0) {
      console.log('No margins calculated (check product mappings)')
      return
    }

    // Save to database
    console.log(`\nSaving ${results.length} margin records...`)
    for (const result of results) {
      const supplierProduct = supplierProducts.get(
        mappings.find(m => m.woo_product_id === result.woo_product_id)?.supplier_product_id || ''
      )
      if (supplierProduct) {
        await upsertMargin(supabase, result, supplierProduct.supplier_id, config.threshold)
      }
    }

    // Log alerts
    const lowMargin = results.filter(r => r.is_low_margin)
    if (config.logAlerts && lowMargin.length > 0) {
      console.log(`Logging ${lowMargin.length} low margin alerts...`)
      await logLowMarginAlert(supabase, lowMargin)
    }

    // Print report
    printReport(results, config)

    console.log('\nDone!')

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
