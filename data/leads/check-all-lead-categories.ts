#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllLeadCategories() {
  console.log('🔍 Discovering All Lead Categories in Supabase\n')
  console.log('='.repeat(60))

  // First, get a sample of lead_id values to understand the pattern
  const { data: sampleLeads, error: sampleError } = await supabase
    .from('businesses')
    .select('lead_id, primary_category, business_name')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .limit(100)

  if (sampleError) {
    console.error('❌ Error:', sampleError)
    return
  }

  // Extract unique lead_id prefixes
  const leadPrefixes = new Map<string, number>()
  sampleLeads?.forEach(lead => {
    if (lead.lead_id) {
      const prefix = lead.lead_id.split('_')[0]
      leadPrefixes.set(prefix, (leadPrefixes.get(prefix) || 0) + 1)
    }
  })

  console.log('\n📊 LEAD CATEGORIES FOUND (sample):\n')
  for (const [prefix, count] of leadPrefixes) {
    console.log(`   ${prefix}: ${count} in sample`)
  }

  // Now count each category properly
  console.log('\n' + '='.repeat(60))
  console.log('📊 FULL LEAD COUNTS BY CATEGORY\n')

  // Beauty (we know this one)
  const { count: beautyCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .like('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  console.log(`💄 Beauty: ${beautyCount?.toLocaleString()} leads`)

  // Fitness/Gym
  const { count: fitnessCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .like('lead_id', 'fitness%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  if (fitnessCount && fitnessCount > 0) {
    console.log(`💪 Fitness/Gym: ${fitnessCount.toLocaleString()} leads`)
  }

  // Health/Medical
  const { count: healthCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .like('lead_id', 'health%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  if (healthCount && healthCount > 0) {
    console.log(`🏥 Health/Medical: ${healthCount.toLocaleString()} leads`)
  }

  // Wellness
  const { count: wellnessCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .like('lead_id', 'wellness%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  if (wellnessCount && wellnessCount > 0) {
    console.log(`🧘 Wellness: ${wellnessCount.toLocaleString()} leads`)
  }

  // Food/Cafe/Restaurant
  const { count: foodCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .or('lead_id.like.food%,lead_id.like.cafe%,lead_id.like.restaurant%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  if (foodCount && foodCount > 0) {
    console.log(`🍽️  Food/Cafe/Restaurant: ${foodCount.toLocaleString()} leads`)
  }

  // Retail
  const { count: retailCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .like('lead_id', 'retail%')
    .not('email', 'is', null)
    .neq('email', '')
    .like('email', '%@%')
    .not('business_name', 'is', null)
    .neq('business_name', '')

  if (retailCount && retailCount > 0) {
    console.log(`🛍️  Retail: ${retailCount.toLocaleString()} leads`)
  }

  // Get actual distinct categories from a larger sample
  console.log('\n' + '='.repeat(60))
  console.log('🔍 Analyzing actual lead_id patterns...\n')

  const { data: largeSample } = await supabase
    .from('businesses')
    .select('lead_id')
    .not('email', 'is', null)
    .neq('email', '')
    .limit(1000)

  const allPrefixes = new Map<string, number>()
  largeSample?.forEach(lead => {
    if (lead.lead_id) {
      const prefix = lead.lead_id.split('_')[0]
      allPrefixes.set(prefix, (allPrefixes.get(prefix) || 0) + 1)
    }
  })

  console.log('📊 All lead_id prefixes found (in 1000-lead sample):\n')
  const sortedPrefixes = Array.from(allPrefixes.entries())
    .sort((a, b) => b[1] - a[1])

  sortedPrefixes.forEach(([prefix, count]) => {
    console.log(`   ${prefix}: ${count} leads`)
  })

  // Calculate total potential
  console.log('\n' + '='.repeat(60))
  console.log('💰 SMARTLEAD CAPACITY ANALYSIS\n')

  const totalAvailable = (beautyCount || 0) + (fitnessCount || 0) + (healthCount || 0) + (wellnessCount || 0) + (foodCount || 0) + (retailCount || 0)
  const monthlyQuota = 27000
  const emailsPerLead = 4

  console.log(`Current monthly quota: ${monthlyQuota.toLocaleString()} emails`)
  console.log(`Emails per lead: ${emailsPerLead}`)
  console.log(`Max leads per month: ${Math.floor(monthlyQuota / emailsPerLead).toLocaleString()} leads`)
  console.log(`\nBeauty campaign using: 6,442 leads × 4 = 25,768 emails (95% quota)`)
  console.log(`Remaining quota: ${(monthlyQuota - 25768).toLocaleString()} emails (${Math.floor((monthlyQuota - 25768) / emailsPerLead)} leads)`)

  console.log('\n' + '='.repeat(60))
  console.log('🎯 NEXT CAMPAIGN OPPORTUNITIES\n')

  if (fitnessCount && fitnessCount > 1000) {
    console.log(`✅ FITNESS/GYM CAMPAIGN - ${fitnessCount.toLocaleString()} leads available`)
    console.log(`   Product fit: High (protein powders, adaptogens, performance nutrition)`)
    console.log(`   Potential: Same Ambassador program approach`)
  }

  if (healthCount && healthCount > 1000) {
    console.log(`✅ HEALTH/MEDICAL CAMPAIGN - ${healthCount.toLocaleString()} leads available`)
    console.log(`   Product fit: Medium (wellness focus, naturopaths, nutritionists)`)
    console.log(`   Potential: Practitioner referral program`)
  }

  if (foodCount && foodCount > 1000) {
    console.log(`✅ FOOD/CAFE/RESTAURANT CAMPAIGN - ${foodCount.toLocaleString()} leads available`)
    console.log(`   Product fit: High (menu items, mushroom coffee/latte add-ons)`)
    console.log(`   Potential: B2B wholesale + Ambassador program`)
  }

  console.log('\n' + '='.repeat(60))
}

checkAllLeadCategories().catch(console.error)
