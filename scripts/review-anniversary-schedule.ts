#!/usr/bin/env npx tsx
/**
 * Review Anniversary Email Timing Schedule
 */

import { createClient } from '@supabase/supabase-js'
const creds = require('../creds')

async function main() {
  const url = await creds.get('global', 'master_supabase_url')
  const key = await creds.get('global', 'master_supabase_service_role_key')
  const supabase = createClient(url, key)

  console.log('═'.repeat(80))
  console.log('  ANNIVERSARY EMAIL TIMING SCHEDULE - DATA REVIEW')
  console.log('═'.repeat(80))

  // Get timing data
  const { data: timing } = await supabase
    .from('tlx_reorder_timing')
    .select('*')
    .order('sample_size', { ascending: false })

  // Separate into categories
  const productSize = (timing || []).filter(t => t.product_type && t.product_size_grams)
  const sizeOnly = (timing || []).filter(t => !t.product_type && t.product_size_grams)
  const global = (timing || []).filter(t => !t.product_type && !t.product_size_grams)

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐')
  console.log('│ PRODUCT + SIZE SPECIFIC TIMING (' + productSize.length + ' combinations)                           │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')
  console.log('│ Product                      Size   Samples  Median Days  Email Day  Conf  │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')

  for (const t of productSize.slice(0, 25)) {
    const conf = t.confidence === 'high' ? '★★★' : t.confidence === 'medium' ? '★★ ' : '★  '
    console.log('│ ' +
      (t.product_type || '').substring(0, 26).padEnd(27) +
      (t.product_size_grams + 'g').padStart(5) +
      String(t.sample_size).padStart(9) +
      String(t.avg_days_to_reorder).padStart(13) +
      String(t.email_send_day).padStart(11) +
      ('  ' + conf).padStart(7) + ' │'
    )
  }
  if (productSize.length > 25) {
    console.log('│ ... and ' + (productSize.length - 25) + ' more product/size combinations                              │')
  }

  console.log('├─────────────────────────────────────────────────────────────────────────────┤')
  console.log('│ SIZE-ONLY FALLBACKS (when product type not matched)                        │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')

  for (const t of sizeOnly) {
    const conf = t.confidence === 'high' ? '★★★' : t.confidence === 'medium' ? '★★ ' : '★  '
    console.log('│ ' +
      'Any product'.padEnd(27) +
      (t.product_size_grams + 'g').padStart(5) +
      String(t.sample_size).padStart(9) +
      String(t.avg_days_to_reorder).padStart(13) +
      String(t.email_send_day).padStart(11) +
      ('  ' + conf).padStart(7) + ' │'
    )
  }

  console.log('├─────────────────────────────────────────────────────────────────────────────┤')
  console.log('│ GLOBAL FALLBACK (last resort)                                              │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')

  for (const t of global) {
    console.log('│ ' +
      'Any product'.padEnd(27) +
      'Any'.padStart(5) +
      String(t.sample_size).padStart(9) +
      String(t.avg_days_to_reorder).padStart(13) +
      String(t.email_send_day).padStart(11) +
      '  ★  ' + ' │'
    )
  }

  console.log('└─────────────────────────────────────────────────────────────────────────────┘')

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐')
  console.log('│ PROPOSED AUTOMATION SETTINGS                                               │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')
  console.log('│ Discount:          15% off                                                 │')
  console.log('│ Code Expiry:       14 days                                                 │')
  console.log('│ Lead Time:         5 days before expected reorder                          │')
  console.log('│ Daily Limit:       50 emails/day                                           │')
  console.log('│ Send Window:       9AM - 7PM AEST                                          │')
  console.log('│ Sender:            Colette from Teelixir <colette@teelixir.com>            │')
  console.log('│ Min Sample Size:   10 reorders for timing data                             │')
  console.log('└─────────────────────────────────────────────────────────────────────────────┘')

  // Count candidates
  const { data: candidates } = await supabase
    .from('v_tlx_first_order_no_reorder')
    .select('*')

  const totalCandidates = candidates?.length || 0

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐')
  console.log('│ CURRENT CANDIDATE POOL                                                     │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')
  console.log('│ First-time buyers who haven\'t reordered: ' + String(totalCandidates).padStart(4) + '                              │')

  // Show sample by days since first order
  if (candidates && candidates.length > 0) {
    const byRange = {
      '30-60 days': candidates.filter(c => c.days_since_first_order >= 30 && c.days_since_first_order < 60).length,
      '60-90 days': candidates.filter(c => c.days_since_first_order >= 60 && c.days_since_first_order < 90).length,
      '90-120 days': candidates.filter(c => c.days_since_first_order >= 90 && c.days_since_first_order < 120).length,
      '120+ days': candidates.filter(c => c.days_since_first_order >= 120).length,
    }
    console.log('├─────────────────────────────────────────────────────────────────────────────┤')
    console.log('│ Breakdown by days since first order:                                       │')
    for (const [range, count] of Object.entries(byRange)) {
      console.log('│   ' + range.padEnd(15) + String(count).padStart(5) + ' customers                                      │')
    }
  }
  console.log('└─────────────────────────────────────────────────────────────────────────────┘')

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐')
  console.log('│ TIMING LOGIC EXAMPLES                                                      │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')
  console.log('│ Customer bought Lions Mane Pure 100g → Email on day 103 (✓ exact match)    │')
  console.log('│ Customer bought Spirulina 50g       → Email on day 68  (S size fallback)   │')
  console.log('│ Customer bought unknown product     → Email on day 76  (G global fallback) │')
  console.log('└─────────────────────────────────────────────────────────────────────────────┘')

  // Show sample candidates
  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐')
  console.log('│ SAMPLE CANDIDATES (first 10)                                               │')
  console.log('├─────────────────────────────────────────────────────────────────────────────┤')

  for (const c of (candidates || []).slice(0, 10)) {
    const product = (c.primary_product_type || 'Unknown').substring(0, 18)
    const size = c.primary_product_size ? c.primary_product_size + 'g' : '?'
    const days = c.days_since_first_order
    console.log('│ ' +
      (c.customer_email || '').substring(0, 28).padEnd(29) +
      String(days).padStart(4) + 'd ago  ' +
      product.padEnd(18) +
      size.padStart(5) + ' │'
    )
  }
  console.log('└─────────────────────────────────────────────────────────────────────────────┘')
}

main().catch(console.error)
