#!/usr/bin/env npx tsx
/**
 * Teelixir - Monthly Reorder Timing Refresh
 *
 * Runs monthly to keep timing data fresh and adaptive.
 * As reorder patterns change, email timing automatically adjusts.
 *
 * What it does:
 * 1. Syncs recent orders (last 45 days to catch stragglers)
 * 2. Recalculates order sequences
 * 3. Updates timing data based on latest patterns
 *
 * Schedule: Run monthly on 1st of month at 5AM AEST
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import * as path from 'path'

const creds = require('../../creds')

const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const MIN_SAMPLE_SIZE = 15
const LEAD_DAYS = 5

async function main() {
  console.log('═'.repeat(60))
  console.log('  TEELIXIR REORDER TIMING - MONTHLY REFRESH')
  console.log('  Adaptive learning: timing adjusts as patterns change')
  console.log('═'.repeat(60))

  const startTime = new Date()

  // Load credentials
  const supabaseKey = await creds.get('global', 'master_supabase_service_role_key')
  if (!supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, supabaseKey)

  try {
    // Step 1: Sync recent orders (last 45 days)
    console.log('\n1. Syncing recent orders (last 45 days)...')
    const syncScript = path.join(__dirname, 'sync-shopify-orders.ts')
    execSync(`npx tsx "${syncScript}" --days=45`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    })

    // Step 2: Get updated timing analysis from the view
    console.log('\n2. Fetching updated reorder patterns...')
    const { data: analysis, error: analysisError } = await supabase
      .from('v_tlx_reorder_timing_analysis')
      .select('*')
      .order('sample_size', { ascending: false })

    if (analysisError) {
      throw new Error(`Analysis error: ${analysisError.message}`)
    }

    console.log(`   Found ${analysis?.length || 0} product/size combinations`)

    // Step 3: Clear existing timing data
    console.log('\n3. Updating timing table...')
    await supabase
      .from('tlx_reorder_timing')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // Step 4: Insert updated timing data
    let inserted = 0
    const significantPatterns = (analysis || []).filter(p => p.sample_size >= MIN_SAMPLE_SIZE)

    for (const pattern of significantPatterns) {
      const emailDay = Math.round((pattern.median_days_to_reorder || pattern.avg_days_to_reorder) - LEAD_DAYS)
      const confidence = pattern.sample_size >= 50 ? 'high' : pattern.sample_size >= 20 ? 'medium' : 'low'

      const { error } = await supabase
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

      if (!error) inserted++
    }

    // Step 5: Add size-only fallbacks
    const sizeGroups = new Map<number, { days: number[], samples: number }>()
    for (const row of analysis || []) {
      if (row.product_size_grams) {
        if (!sizeGroups.has(row.product_size_grams)) {
          sizeGroups.set(row.product_size_grams, { days: [], samples: 0 })
        }
        const group = sizeGroups.get(row.product_size_grams)!
        for (let i = 0; i < row.sample_size; i++) {
          group.days.push(row.median_days_to_reorder || row.avg_days_to_reorder)
        }
        group.samples += row.sample_size
      }
    }

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

        if (!error) inserted++
      }
    }

    // Step 6: Add global fallback
    const allDays: number[] = []
    for (const [, data] of sizeGroups) {
      allDays.push(...data.days)
    }

    if (allDays.length > 0) {
      allDays.sort((a, b) => a - b)
      const globalMedian = allDays[Math.floor(allDays.length / 2)]
      const globalEmailDay = Math.round(globalMedian - LEAD_DAYS)

      const { error } = await supabase
        .from('tlx_reorder_timing')
        .upsert({
          product_type: null,
          product_size_grams: null,
          sample_size: allDays.length,
          avg_days_to_reorder: Math.round(globalMedian),
          email_send_day: globalEmailDay,
          confidence: 'low'
        }, {
          onConflict: 'product_type,product_size_grams'
        })

      if (!error) inserted++
    }

    // Step 7: Log the refresh
    const duration = Math.round((Date.now() - startTime.getTime()) / 1000)

    // Update job status
    await supabase
      .from('dashboard_job_status')
      .update({
        status: 'healthy',
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        error_message: null
      })
      .eq('job_name', 'reorder-timing-refresh')

    console.log('\n' + '═'.repeat(60))
    console.log('  REFRESH COMPLETE')
    console.log('═'.repeat(60))
    console.log(`  Timing records updated: ${inserted}`)
    console.log(`  Product+Size patterns: ${significantPatterns.length}`)
    console.log(`  Size fallbacks: ${sizeGroups.size}`)
    console.log(`  Duration: ${duration}s`)
    console.log('═'.repeat(60))

  } catch (error: any) {
    console.error('\nRefresh failed:', error.message)

    // Log failure
    await supabase
      .from('dashboard_job_status')
      .update({
        status: 'error',
        last_run_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('job_name', 'reorder-timing-refresh')

    process.exit(1)
  }
}

main().catch(console.error)
