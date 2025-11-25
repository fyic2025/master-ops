#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBeautyLeads() {
  console.log('🔍 Checking businesses table for beauty leads...\n');

  // Get table structure first
  const { data: sample, error: sampleError } = await supabase
    .from('businesses')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('Error:', sampleError.message);
    return;
  }

  if (sample && sample.length > 0) {
    console.log('📋 Table columns:', Object.keys(sample[0]).join(', '));
    console.log('\n📝 Sample row:', JSON.stringify(sample[0], null, 2));
    console.log('\n');
  }

  // Check total businesses
  const { count: totalCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total businesses: ${totalCount}\n`);

  // Check beauty leads
  const { count: beautyCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%');

  console.log(`💄 Beauty leads (lead_id LIKE 'beauty%'): ${beautyCount}\n`);

  // Get sample beauty leads
  const { data: beautyLeads } = await supabase
    .from('businesses')
    .select('*')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .limit(10);

  console.log('📝 Sample beauty leads:\n');
  beautyLeads?.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.business_name || 'N/A'}`);
    console.log(`   Lead ID: ${lead.lead_id}`);
    console.log(`   Email: ${lead.email}`);
    console.log(`   Category: ${lead.primary_category || 'N/A'}`);
    console.log(`   Location: ${lead.location || 'N/A'}`);
    console.log(`   Contacted: ${lead.contacted_via_smartlead || 'No'}`);
    console.log('');
  });

  // Count by segment
  console.log('📊 Breakdown by segment:\n');

  const { count: massageSpa } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('primary_category.ilike.%massage%,primary_category.ilike.%spa%,primary_category.ilike.%wellness%');

  const { count: hairBeauty } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('primary_category.ilike.%hair%,primary_category.ilike.%salon%,primary_category.ilike.%barber%,primary_category.ilike.%hairdresser%');

  const { count: cosmetic } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('primary_category.ilike.%cosmetic%,primary_category.ilike.%laser%,primary_category.ilike.%aesthetic%,primary_category.ilike.%skin%');

  const { count: neverContacted } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .not('business_name', 'is', null)
    .or('contacted_via_smartlead.is.null,contacted_via_smartlead.eq.false');

  console.log(`  🧘 Massage & Spa: ${massageSpa}`);
  console.log(`  💇 Hair & Beauty: ${hairBeauty}`);
  console.log(`  💉 Cosmetic & Aesthetic: ${cosmetic}`);
  console.log(`  ✉️  Never contacted: ${neverContacted}\n`);

  // Check data quality
  const { count: withEmail } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null);

  const { count: withCompany } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('business_name', 'is', null);

  const { count: exportReady } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .not('business_name', 'is', null)
    .or('contacted_via_smartlead.is.null,contacted_via_smartlead.eq.false');

  console.log('📊 Data Quality:\n');
  console.log(`  ✉️  With email: ${withEmail}`);
  console.log(`  🏢 With company name: ${withCompany}`);
  console.log(`  ✅ Export-ready (email + company + never contacted): ${exportReady}\n`);

  console.log('─'.repeat(60));
  console.log('📋 SUMMARY FOR 27K EMAIL BLAST\n');
  console.log(`Total beauty leads: ${beautyCount}`);
  console.log(`Export-ready (fresh, quality): ${exportReady}`);
  console.log(`Target needed: 3,950`);
  console.log(`\nCan launch blast? ${(exportReady || 0) >= 3950 ? '✅ YES' : '❌ NO'}`);

  if ((exportReady || 0) >= 3950) {
    console.log(`\n🎉 You have ${exportReady} quality leads ready!`);
    console.log(`   That's enough for the full 27K email blast!`);
  } else if ((exportReady || 0) > 0) {
    console.log(`\n⚠️  You have ${exportReady} leads available.`);
    console.log(`   Need ${3950 - (exportReady || 0)} more for full 27K blast.`);
    console.log(`   Can still launch with reduced target: ${Math.floor((exportReady || 0) * 6.84)} emails`);
  }

  console.log('─'.repeat(60));
}

checkBeautyLeads();
