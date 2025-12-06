#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBeautyLeadCounts() {
  console.log('🔍 Checking beauty lead counts in Supabase...\n')

  // Query 1: Total beauty leads - Use count first, then fetch with high limit
  const { count: totalCount, error: countError } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .like('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  if (countError) {
    console.error('❌ Error counting leads:', countError)
    return
  }

  console.log(`🔍 Found ${totalCount} total beauty leads. Fetching all...`)

  // Now fetch all data with proper limit
  const { data: totalData, error: totalError } = await supabase
    .from('businesses')
    .select('lead_id, email, business_name, total_emails_sent')
    .like('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')
    .limit(totalCount || 10000)

  if (totalError) {
    console.error('❌ Error querying total leads:', totalError)
    return
  }

  const total = totalData.length
  const neverContacted = totalData.filter(row => !row.total_emails_sent || row.total_emails_sent === 0).length
  const previouslyContacted = totalData.filter(row => row.total_emails_sent && row.total_emails_sent > 0).length
  const pctFresh = Math.round((neverContacted / total) * 1000) / 10

  console.log('📊 TOTAL BEAUTY LEADS WITH VALID EMAIL')
  console.log('=====================================')
  console.log(`Total leads available: ${total.toLocaleString()}`)
  console.log(`Never contacted: ${neverContacted.toLocaleString()} (${pctFresh}%)`)
  console.log(`Previously contacted: ${previouslyContacted.toLocaleString()} (${100 - pctFresh}%)`)
  console.log(`Estimated total emails (4 per lead): ${(total * 4).toLocaleString()}`)
  console.log('')

  // Query 2: Massage & Spa
  const { data: massageData, error: massageError } = await supabase
    .from('businesses')
    .select('lead_id, email, business_name, primary_category, total_emails_sent')
    .like('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')
    .or('primary_category.ilike.%massage%,primary_category.ilike.%spa%,primary_category.ilike.%wellness%,primary_category.ilike.%day spa%,primary_category.ilike.%retreat%')
    .limit(10000)

  if (!massageError && massageData) {
    const massageTotal = massageData.length
    const massageNever = massageData.filter(row => !row.total_emails_sent || row.total_emails_sent === 0).length
    const massagePrevious = massageData.filter(row => row.total_emails_sent && row.total_emails_sent > 0).length

    console.log('💆 CAMPAIGN 1: MASSAGE & SPA')
    console.log('============================')
    console.log(`Total available: ${massageTotal.toLocaleString()}`)
    console.log(`Never contacted: ${massageNever.toLocaleString()}`)
    console.log(`Previously contacted: ${massagePrevious.toLocaleString()}`)
    console.log(`Emails (4 per lead): ${(massageTotal * 4).toLocaleString()}`)
    console.log('')
  }

  // Query 3: Hair & Beauty
  const { data: hairData, error: hairError } = await supabase
    .from('businesses')
    .select('lead_id, email, business_name, primary_category, total_emails_sent')
    .like('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')
    .or('primary_category.ilike.%hair%,primary_category.ilike.%salon%,primary_category.ilike.%barber%,primary_category.ilike.%hairdresser%,primary_category.ilike.%beauty salon%')
    .limit(10000)

  if (!hairError && hairData) {
    const hairTotal = hairData.length
    const hairNever = hairData.filter(row => !row.total_emails_sent || row.total_emails_sent === 0).length
    const hairPrevious = hairData.filter(row => row.total_emails_sent && row.total_emails_sent > 0).length

    console.log('💇 CAMPAIGN 2: HAIR & BEAUTY')
    console.log('=============================')
    console.log(`Total available: ${hairTotal.toLocaleString()}`)
    console.log(`Never contacted: ${hairNever.toLocaleString()}`)
    console.log(`Previously contacted: ${hairPrevious.toLocaleString()}`)
    console.log(`Emails (4 per lead): ${(hairTotal * 4).toLocaleString()}`)
    console.log('')
  }

  // Query 4: Cosmetic & Aesthetic
  const { data: cosmeticData, error: cosmeticError } = await supabase
    .from('businesses')
    .select('lead_id, email, business_name, primary_category, total_emails_sent')
    .like('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')
    .or('primary_category.ilike.%cosmetic%,primary_category.ilike.%laser%,primary_category.ilike.%aesthetic%,primary_category.ilike.%skin%,primary_category.ilike.%injectable%,primary_category.ilike.%derma%,primary_category.ilike.%botox%')
    .limit(10000)

  if (!cosmeticError && cosmeticData) {
    const cosmeticTotal = cosmeticData.length
    const cosmeticNever = cosmeticData.filter(row => !row.total_emails_sent || row.total_emails_sent === 0).length
    const cosmeticPrevious = cosmeticData.filter(row => row.total_emails_sent && row.total_emails_sent > 0).length

    console.log('💉 CAMPAIGN 3: COSMETIC & AESTHETIC')
    console.log('====================================')
    console.log(`Total available: ${cosmeticTotal.toLocaleString()}`)
    console.log(`Never contacted: ${cosmeticNever.toLocaleString()}`)
    console.log(`Previously contacted: ${cosmeticPrevious.toLocaleString()}`)
    console.log(`Emails (4 per lead): ${(cosmeticTotal * 4).toLocaleString()}`)
    console.log('')
  }

  console.log('✅ Summary')
  console.log('==========')
  console.log(`Total leads across all campaigns: ${total.toLocaleString()}`)
  console.log(`Total emails (4 per lead): ${(total * 4).toLocaleString()}`)
  console.log(`Monthly quota: 27,000`)
  console.log(`Quota usage: ${Math.round((total * 4 / 27000) * 100)}%`)
  console.log('')
  console.log('💡 These are the MAXIMUM available leads.')
  console.log('   Ready to export ALL of them with no limits!')
}

checkBeautyLeadCounts().catch(console.error)
