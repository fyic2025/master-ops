#!/usr/bin/env tsx
/**
 * Check Beauty Leads in teelixir_businesses Table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeelixirBusinesses() {
  console.log('🔍 Checking teelixir_businesses table for beauty leads...\n');

  // Check total leads
  const { count: totalCount, error: totalError } = await supabase
    .from('teelixir_businesses')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error querying table:', totalError.message);
    return;
  }

  console.log(`📊 Total businesses in database: ${totalCount}`);

  // Check beauty leads
  const { count: beautyCount } = await supabase
    .from('teelixir_businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%');

  console.log(`💄 Beauty leads (lead_id LIKE 'beauty%'): ${beautyCount}\n`);

  // Get sample beauty leads
  const { data: sampleBeauty } = await supabase
    .from('teelixir_businesses')
    .select('lead_id, email, business_name, primary_category, location, contacted_via_smartlead')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .limit(10);

  console.log('📝 Sample beauty leads:');
  sampleBeauty?.forEach((lead, i) => {
    console.log(`  ${i + 1}. ${lead.business_name || 'N/A'}`);
    console.log(`     Email: ${lead.email}`);
    console.log(`     Category: ${lead.primary_category || 'N/A'}`);
    console.log(`     Location: ${lead.location || 'N/A'}`);
    console.log(`     Contacted: ${lead.contacted_via_smartlead || 'No'}`);
    console.log('');
  });

  // Count by category
  console.log('📊 Breakdown by segment:\n');

  const { count: massageSpa } = await supabase
    .from('teelixir_businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('primary_category.ilike.%massage%,primary_category.ilike.%spa%,primary_category.ilike.%wellness%');

  console.log(`  🧘 Massage & Spa: ${massageSpa}`);

  const { count: hairBeauty } = await supabase
    .from('teelixir_businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('primary_category.ilike.%hair%,primary_category.ilike.%salon%,primary_category.ilike.%barber%');

  console.log(`  💇 Hair & Beauty: ${hairBeauty}`);

  const { count: cosmetic } = await supabase
    .from('teelixir_businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('primary_category.ilike.%cosmetic%,primary_category.ilike.%laser%,primary_category.ilike.%aesthetic%');

  console.log(`  💉 Cosmetic & Aesthetic: ${cosmetic}`);

  // Check never contacted
  const { count: neverContacted } = await supabase
    .from('teelixir_businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .not('business_name', 'is', null)
    .or('contacted_via_smartlead.is.null,contacted_via_smartlead.eq.false');

  console.log(`  ✉️  Never contacted: ${neverContacted}\n`);

  // Summary
  console.log('─'.repeat(60));
  console.log('📋 SUMMARY\n');
  console.log(`Total beauty leads: ${beautyCount}`);
  console.log(`Fresh (never contacted): ${neverContacted}`);
  console.log(`Enough for 27K blast (need 3,950): ${(beautyCount || 0) >= 3950 ? '✅ YES' : '❌ NO'}`);

  if ((beautyCount || 0) < 3950) {
    console.log(`\n⚠️  Need ${3950 - (beautyCount || 0)} more leads to reach target`);
  }

  console.log('─'.repeat(60));
}

checkTeelixirBusinesses();
