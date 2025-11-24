#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabase = createClient(supabaseUrl, supabaseKey)

const BATCH_SIZE = 1000

async function fetchAllLeadsPaginated(limit?: number) {
  let allLeads: any[] = []
  let offset = 0
  let hasMore = true

  console.log(`   Fetching in batches of ${BATCH_SIZE}...`)

  while (hasMore) {
    let query = supabase
      .from('businesses')
      .select('email, business_name, name, primary_category, city, state, website, phone, lead_id, total_emails_sent')
      .like('lead_id', 'fitness%')
      .not('email', 'is', null)
      .neq('email', '')
      .like('email', '%@%')
      .not('business_name', 'is', null)
      .neq('business_name', '')

    const { data, error } = await query
      .range(offset, offset + BATCH_SIZE - 1)
      .order('total_emails_sent', { ascending: true, nullsFirst: true })
      .order('website', { ascending: false, nullsFirst: false })

    if (error) {
      console.error(`   ❌ Error fetching batch at offset ${offset}:`, error)
      break
    }

    if (!data || data.length === 0) {
      hasMore = false
      break
    }

    allLeads.push(...data)
    offset += BATCH_SIZE
    process.stdout.write(`\r   Fetched ${allLeads.length} leads...`)

    // If limit specified and reached, stop
    if (limit && allLeads.length >= limit) {
      allLeads = allLeads.slice(0, limit)
      hasMore = false
      break
    }

    if (data.length < BATCH_SIZE) {
      hasMore = false
    }
  }

  console.log(`\r   ✅ Total fetched: ${allLeads.length} leads`)
  return allLeads
}

function writeCSV(filename: string, data: any[]) {
  if (data.length === 0) {
    console.log(`   ⚠️  No data to write for ${filename}`)
    return
  }

  // CSV header
  const headers = ['name', 'email', 'city', 'phone', 'website']
  const csvLines = [headers.join(',')]

  // CSV rows
  data.forEach(row => {
    const csvRow = [
      `"${(row.business_name || row.name || '').replace(/"/g, '""')}"`,
      `"${(row.email || '').replace(/"/g, '""')}"`,
      `"${(row.city || '').replace(/"/g, '""')}"`,
      `"${(row.phone || '').replace(/"/g, '""')}"`,
      `"${(row.website || '').replace(/"/g, '""')}"`
    ]
    csvLines.push(csvRow.join(','))
  })

  const filepath = join(process.cwd(), filename)
  writeFileSync(filepath, csvLines.join('\n'), 'utf8')
  console.log(`   ✅ Wrote ${data.length} leads to: ${filename}`)
}

async function exportFitnessLeads() {
  console.log('🚀 Exporting Fitness Leads from Supabase\n')
  console.log('='.repeat(60))

  // Check total available
  const { count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .like('lead_id', 'fitness%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  console.log(`\n💪 Total fitness leads available: ${count}`)
  console.log(`\n📊 Export options:`)
  console.log(`   1. Test Campaign: 308 leads (fits remaining monthly quota)`)
  console.log(`   2. Full Campaign: ${count} leads (requires next month or upgraded quota)`)

  // Ask which one to export (we'll export both for now)
  console.log(`\n🎯 Exporting BOTH options...\n`)

  // Export test campaign (308 leads)
  console.log('\n📦 OPTION 1: TEST CAMPAIGN (308 LEADS)')
  console.log('='.repeat(60))
  const testLeads = await fetchAllLeadsPaginated(308)
  writeCSV('fitness_leads_test_308.csv', testLeads)

  // Export full campaign
  console.log('\n📦 OPTION 2: FULL CAMPAIGN (ALL LEADS)')
  console.log('='.repeat(60))
  const fullLeads = await fetchAllLeadsPaginated()
  writeCSV('fitness_leads_full.csv', fullLeads)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ EXPORT COMPLETE!')
  console.log('='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   Test campaign:      ${testLeads.length.toLocaleString()} leads (1,232 emails)`)
  console.log(`   Full campaign:      ${fullLeads.length.toLocaleString()} leads (${fullLeads.length * 4} emails)`)
  console.log(`   Quota available:    1,232 emails remaining this month`)
  console.log('')
  console.log('📁 Files created:')
  console.log(`   - fitness_leads_test_308.csv (launch THIS month)`)
  console.log(`   - fitness_leads_full.csv (launch NEXT month or after quota upgrade)`)
  console.log('')
  console.log('🎯 Next step: Choose which campaign to launch!')
  console.log('   → Test (308 leads): Use remaining quota, validate fitness market')
  console.log('   → Full (all leads): Wait for Dec 1 OR upgrade Smartlead plan')
}

exportFitnessLeads().catch(console.error)
