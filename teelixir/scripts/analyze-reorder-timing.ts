#!/usr/bin/env npx tsx
/**
 * Analyze Teelixir Reorder Timing
 *
 * Analyzes historical order data to determine optimal email send timing
 * based on product type and size combinations.
 */

import { createClient } from '@supabase/supabase-js'
const creds = require('../../creds')

const MIN_SAMPLE_SIZE = 15  // Minimum orders to consider statistically significant
const LEAD_DAYS = 5         // Send email X days before expected reorder

interface ReorderAnalysis {
  product_type: string | null
  product_size_grams: number | null
  sample_size: number
  avg_days_to_reorder: number
  median_days_to_reorder: number
  p25_days: number
  p75_days: number
  std_dev: number
}

async function main() {
  console.log('═'.repeat(60))
  console.log('  TEELIXIR REORDER TIMING ANALYSIS')
  console.log('═'.repeat(60))

  // Load credentials
  const supabaseUrl = await creds.get('global', 'master_supabase_url')
  const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Step 1: Analyze reorder patterns from the view
  console.log('\n1. Fetching reorder pattern analysis...')

  const { data: analysis, error: analysisError } = await supabase
    .from('v_tlx_reorder_timing_analysis')
    .select('*')
    .order('sample_size', { ascending: false })

  if (analysisError) {
    console.error('Error fetching analysis:', analysisError)
    process.exit(1)
  }

  console.log(`   Found ${analysis?.length || 0} product/size combinations`)

  // Step 2: Display top patterns
  console.log('\n2. Top Reorder Patterns (by sample size):')
  console.log('─'.repeat(90))
  console.log(
    'Product Type'.padEnd(30) +
    'Size'.padStart(8) +
    'Samples'.padStart(10) +
    'Avg Days'.padStart(10) +
    'Median'.padStart(10) +
    'Email Day'.padStart(12)
  )
  console.log('─'.repeat(90))

  const significantPatterns: ReorderAnalysis[] = []

  for (const row of analysis || []) {
    const emailDay = Math.round((row.median_days_to_reorder || row.avg_days_to_reorder) - LEAD_DAYS)

    console.log(
      (row.product_type || 'ALL PRODUCTS').padEnd(30) +
      (row.product_size_grams ? `${row.product_size_grams}g` : 'ALL').padStart(8) +
      String(row.sample_size).padStart(10) +
      String(Math.round(row.avg_days_to_reorder)).padStart(10) +
      String(Math.round(row.median_days_to_reorder)).padStart(10) +
      String(emailDay).padStart(12)
    )

    if (row.sample_size >= MIN_SAMPLE_SIZE) {
      significantPatterns.push(row)
    }
  }

  console.log('─'.repeat(90))
  console.log(`\nStatistically significant patterns (n >= ${MIN_SAMPLE_SIZE}): ${significantPatterns.length}`)

  // Step 3: Calculate and insert timing data
  console.log('\n3. Populating tlx_reorder_timing table...')

  // Clear existing timing data
  const { error: deleteError } = await supabase
    .from('tlx_reorder_timing')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')  // Delete all

  if (deleteError) {
    console.error('Error clearing timing table:', deleteError)
  }

  // Insert new timing data for significant patterns
  let inserted = 0

  for (const pattern of significantPatterns) {
    const emailDay = Math.round((pattern.median_days_to_reorder || pattern.avg_days_to_reorder) - LEAD_DAYS)

    const confidence = pattern.sample_size >= 50 ? 'high' : pattern.sample_size >= 20 ? 'medium' : 'low'

    const { error: insertError } = await supabase
      .from('tlx_reorder_timing')
      .upsert({
        product_type: pattern.product_type,
        product_size_grams: pattern.product_size_grams,
        sample_size: pattern.sample_size,
        avg_days_to_reorder: Math.round(pattern.median_days_to_reorder || pattern.avg_days_to_reorder),
        email_send_day: emailDay,
        confidence: confidence
      }, {
        onConflict: 'product_type,product_size_grams'
      })

    if (insertError) {
      console.error(`  Error inserting ${pattern.product_type}/${pattern.product_size_grams}:`, insertError)
    } else {
      inserted++
    }
  }

  // Add SIZE-ONLY fallbacks (aggregate by size across all products)
  console.log('\n   Adding size-only fallbacks...')

  // Query reorder data grouped by size only
  const { data: sizeAnalysis } = await supabase
    .from('v_tlx_reorder_timing_analysis')
    .select('*')

  // Aggregate by size only
  const sizeGroups = new Map<number, { days: number[], samples: number }>()

  for (const row of sizeAnalysis || []) {
    if (row.product_size_grams) {
      if (!sizeGroups.has(row.product_size_grams)) {
        sizeGroups.set(row.product_size_grams, { days: [], samples: 0 })
      }
      const group = sizeGroups.get(row.product_size_grams)!
      // Weight by sample size
      for (let i = 0; i < row.sample_size; i++) {
        group.days.push(row.median_days_to_reorder || row.avg_days_to_reorder)
      }
      group.samples += row.sample_size
    }
  }

  // Insert size-only fallbacks
  for (const [size, data] of sizeGroups) {
    if (data.samples >= MIN_SAMPLE_SIZE) {
      data.days.sort((a, b) => a - b)
      const median = data.days[Math.floor(data.days.length / 2)]
      const emailDay = Math.round(median - LEAD_DAYS)

      const { error } = await supabase
        .from('tlx_reorder_timing')
        .upsert({
          product_type: null,
          product_size_grams: size,
          sample_size: data.samples,
          avg_days_to_reorder: Math.round(median),
          email_send_day: emailDay,
          confidence: data.samples >= 50 ? 'high' : 'medium'
        }, {
          onConflict: 'product_type,product_size_grams'
        })

      if (!error) {
        console.log(`     Size ${size}g: median ${Math.round(median)}d → email day ${emailDay} (n=${data.samples})`)
        inserted++
      }
    }
  }

  // Add true global fallback (all products, all sizes) - last resort
  const allDays: number[] = []
  for (const [, data] of sizeGroups) {
    allDays.push(...data.days)
  }

  if (allDays.length > 0) {
    allDays.sort((a, b) => a - b)
    const globalMedian = allDays[Math.floor(allDays.length / 2)]
    const globalEmailDay = Math.round(globalMedian - LEAD_DAYS)

    console.log(`\n   Global fallback: median ${Math.round(globalMedian)}d → email day ${globalEmailDay} (n=${allDays.length})`)

    const { error: globalError } = await supabase
      .from('tlx_reorder_timing')
      .upsert({
        product_type: null,
        product_size_grams: null,
        sample_size: allDays.length,
        avg_days_to_reorder: Math.round(globalMedian),
        email_send_day: globalEmailDay,
        confidence: 'low'  // Global is always low confidence
      }, {
        onConflict: 'product_type,product_size_grams'
      })

    if (!globalError) {
      inserted++
    }
  }

  console.log(`   Inserted ${inserted} timing records`)

  // Step 4: Show final timing table
  console.log('\n4. Final Reorder Timing Table:')
  console.log('─'.repeat(80))

  const { data: timing } = await supabase
    .from('tlx_reorder_timing')
    .select('*')
    .order('sample_size', { ascending: false })

  for (const row of timing || []) {
    console.log(
      `   ${(row.product_type || 'GLOBAL').padEnd(25)} ` +
      `${(row.product_size_grams ? row.product_size_grams + 'g' : 'ALL').padStart(6)} ` +
      `n=${String(row.sample_size).padStart(5)} ` +
      `median=${String(row.median_reorder_days).padStart(3)}d ` +
      `→ email day ${row.email_send_day}`
    )
  }

  // Step 5: REORDER RATE ANALYSIS - Compare timing with actual reorder rates
  console.log('\n5. Reorder Rate Analysis by Product/Size:')
  console.log('─'.repeat(100))

  // Get all first orders
  const { data: firstOrdersRaw } = await supabase
    .from('tlx_shopify_orders')
    .select('id, shopify_customer_id')
    .eq('customer_order_sequence', 1)

  // Get line items for those orders (batch to avoid query size limits)
  const orderIds = (firstOrdersRaw || []).map(o => o.id)

  const lineItemsRaw: any[] = []
  const BATCH_SIZE = 100
  for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
    const batch = orderIds.slice(i, i + BATCH_SIZE)
    const { data: batchData } = await supabase
      .from('tlx_shopify_line_items')
      .select('order_id, product_type, product_size_grams')
      .in('order_id', batch)

    if (batchData) lineItemsRaw.push(...batchData)
  }

  // Build order -> primary product lookup
  const orderProductMap = new Map<string, { productType: string, size: number }>()
  for (const li of lineItemsRaw) {
    if (li.product_type && li.product_size_grams && !orderProductMap.has(li.order_id)) {
      orderProductMap.set(li.order_id, { productType: li.product_type, size: li.product_size_grams })
    }
  }

  // Build first orders with products
  const firstOrders = (firstOrdersRaw || []).map(o => ({
    shopify_customer_id: o.shopify_customer_id,
    product: orderProductMap.get(o.id)
  })).filter(o => o.product)

  // Get all customers who have reordered
  const { data: reorderers } = await supabase
    .from('tlx_shopify_orders')
    .select('shopify_customer_id')
    .gt('customer_order_sequence', 1)

  const reorderCustomers = new Set((reorderers || []).map(r => r.shopify_customer_id))

  // Build product/size stats
  const productStats = new Map<string, { firstOrders: number, reorders: number }>()

  for (const order of firstOrders) {
    if (!order.product) continue

    const key = `${order.product.productType}|${order.product.size}`

    if (!productStats.has(key)) {
      productStats.set(key, { firstOrders: 0, reorders: 0 })
    }

    const stats = productStats.get(key)!
    stats.firstOrders++

    if (reorderCustomers.has(order.shopify_customer_id)) {
      stats.reorders++
    }
  }

  // Sort by first orders and display
  const sortedStats = Array.from(productStats.entries())
    .map(([key, stats]) => {
      const [productType, size] = key.split('|')
      const reorderRate = stats.firstOrders > 0 ? (stats.reorders / stats.firstOrders * 100) : 0
      return { productType, size: parseInt(size), ...stats, reorderRate }
    })
    .filter(s => s.firstOrders >= 10)  // Only show products with 10+ first orders
    .sort((a, b) => b.firstOrders - a.firstOrders)

  console.log(
    'Product'.padEnd(25) +
    'Size'.padStart(6) +
    '1st Orders'.padStart(12) +
    'Reorders'.padStart(10) +
    'Rate'.padStart(8) +
    'Timing'.padStart(10) +
    'Email Day'.padStart(10)
  )
  console.log('─'.repeat(100))

  // Get timing lookup
  const timingLookup = new Map<string, number>()
  for (const t of timing || []) {
    const key = `${t.product_type || 'NULL'}|${t.product_size_grams || 'NULL'}`
    timingLookup.set(key, t.email_send_day)
  }

  let totalFirstOrders = 0
  let totalReorders = 0

  for (const stat of sortedStats.slice(0, 30)) {
    totalFirstOrders += stat.firstOrders
    totalReorders += stat.reorders

    // Find timing for this product/size
    let emailDay = timingLookup.get(`${stat.productType}|${stat.size}`)
    let timingSource = 'product'

    if (!emailDay) {
      emailDay = timingLookup.get(`NULL|${stat.size}`)
      timingSource = 'size'
    }
    if (!emailDay) {
      emailDay = timingLookup.get('NULL|NULL')
      timingSource = 'global'
    }

    const rateBar = '█'.repeat(Math.round(stat.reorderRate / 5)) // 5% per block

    console.log(
      stat.productType.substring(0, 24).padEnd(25) +
      `${stat.size}g`.padStart(6) +
      String(stat.firstOrders).padStart(12) +
      String(stat.reorders).padStart(10) +
      `${stat.reorderRate.toFixed(1)}%`.padStart(8) +
      (timingSource === 'product' ? '✓' : timingSource === 'size' ? 'S' : 'G').padStart(10) +
      (emailDay ? `Day ${emailDay}` : 'N/A').padStart(10)
    )
  }

  console.log('─'.repeat(100))
  const overallRate = totalFirstOrders > 0 ? (totalReorders / totalFirstOrders * 100) : 0
  console.log(
    'OVERALL'.padEnd(25) +
    ''.padStart(6) +
    String(totalFirstOrders).padStart(12) +
    String(totalReorders).padStart(10) +
    `${overallRate.toFixed(1)}%`.padStart(8)
  )

  console.log('\n   Legend: ✓ = product+size timing, S = size fallback, G = global fallback')

  // Step 6: Show candidate customers for anniversary emails
  console.log('\n6. Anniversary Email Candidates:')

  const { data: candidates, error: candError } = await supabase
    .from('v_tlx_first_order_no_reorder')
    .select('*')
    .limit(20)

  if (candError) {
    console.log('   (View not yet created or empty)')
  } else if (candidates && candidates.length > 0) {
    console.log(`   Found ${candidates.length}+ first-time buyers without reorders`)
    console.log('─'.repeat(80))

    for (const cand of candidates.slice(0, 10)) {
      console.log(
        `   ${cand.customer_email?.substring(0, 30).padEnd(30)} ` +
        `${cand.days_since_first_order}d ago ` +
        `${(cand.primary_product_type || 'Unknown').substring(0, 15).padEnd(15)} ` +
        `${cand.primary_product_size || '?'}g`
      )
    }
  } else {
    console.log('   No candidates found (all first-time buyers have reordered)')
  }

  console.log('\n' + '═'.repeat(60))
  console.log('  ANALYSIS COMPLETE')
  console.log('═'.repeat(60))
}

main().catch(console.error)
