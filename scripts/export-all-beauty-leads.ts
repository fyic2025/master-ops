#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabase = createClient(supabaseUrl, supabaseKey)

const BATCH_SIZE = 1000

async function fetchAllLeadsPaginated(orFilter: string) {
  let allLeads: any[] = []
  let offset = 0
  let hasMore = true

  console.log(`   Fetching in batches of ${BATCH_SIZE}...`)

  while (hasMore) {
    let query = supabase
      .from('businesses')
      .select('email, business_name, name, primary_category, city, state, website, phone, lead_id, total_emails_sent')
      .like('lead_id', 'beauty%')
      .not('email', 'is', null)
      .neq('email', '')
      .like('email', '%@%')
      .not('business_name', 'is', null)
      .neq('business_name', '')

    if (orFilter) {
      query = query.or(orFilter)
    }

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

async function exportAllBeautyLeads() {
  console.log('🚀 Exporting ALL Beauty Leads from Supabase\n')
  console.log('=' .repeat(60))

  // Campaign 1: Massage & Spa
  console.log('\n💆 CAMPAIGN 1: MASSAGE & SPA')
  console.log('=' .repeat(60))
  const massageLeads = await fetchAllLeadsPaginated(
    'primary_category.ilike.%massage%,primary_category.ilike.%spa%,primary_category.ilike.%wellness%,primary_category.ilike.%day spa%,primary_category.ilike.%retreat%'
  )
  writeCSV('massage_spa_leads.csv', massageLeads)

  // Campaign 2: Hair & Beauty
  console.log('\n💇 CAMPAIGN 2: HAIR & BEAUTY')
  console.log('=' .repeat(60))
  const hairLeads = await fetchAllLeadsPaginated(
    'primary_category.ilike.%hair%,primary_category.ilike.%salon%,primary_category.ilike.%barber%,primary_category.ilike.%hairdresser%,primary_category.ilike.%beauty salon%,primary_category.ilike.%beauty therapist%'
  )
  writeCSV('hair_beauty_leads.csv', hairLeads)

  // Campaign 3: Cosmetic & Aesthetic
  console.log('\n💉 CAMPAIGN 3: COSMETIC & AESTHETIC')
  console.log('=' .repeat(60))
  const cosmeticLeads = await fetchAllLeadsPaginated(
    'primary_category.ilike.%cosmetic%,primary_category.ilike.%laser%,primary_category.ilike.%aesthetic%,primary_category.ilike.%skin%,primary_category.ilike.%injectable%,primary_category.ilike.%derma%,primary_category.ilike.%botox%,primary_category.ilike.%filler%'
  )
  writeCSV('cosmetic_leads.csv', cosmeticLeads)

  // Summary
  const totalLeads = massageLeads.length + hairLeads.length + cosmeticLeads.length
  const totalEmails = totalLeads * 4

  console.log('\n' + '='.repeat(60))
  console.log('✅ EXPORT COMPLETE!')
  console.log('='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   Massage & Spa:      ${massageLeads.length.toLocaleString()} leads`)
  console.log(`   Hair & Beauty:      ${hairLeads.length.toLocaleString()} leads`)
  console.log(`   Cosmetic:           ${cosmeticLeads.length.toLocaleString()} leads`)
  console.log(`   ` + '-'.repeat(40))
  console.log(`   TOTAL:              ${totalLeads.toLocaleString()} leads`)
  console.log(`   Total emails (4x):  ${totalEmails.toLocaleString()} emails`)
  console.log(`   Quota usage:        ${Math.round((totalEmails / 27000) * 100)}% of 27,000`)
  console.log('')
  console.log('📁 Files created:')
  console.log(`   - massage_spa_leads.csv`)
  console.log(`   - hair_beauty_leads.csv`)
  console.log(`   - cosmetic_leads.csv`)
  console.log('')
  console.log('🎯 Next step: Upload these CSVs to Smartlead campaigns!')
}

exportAllBeautyLeads().catch(console.error)
