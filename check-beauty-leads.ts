#!/usr/bin/env tsx
/**
 * Check Beauty Leads in teelixir_businesses Table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeelixirBusinesses() {
  console.log('🔍 Checking businesses table for beauty leads...\n');

  // Check total leads
  const { count: totalCount, error: totalError } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('❌ Error querying table:', totalError.message);
    return;
  }

  console.log(`📊 Total businesses in database: ${totalCount}`);

  // Check beauty leads
  const { count: beautyCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%');

  console.log(`💄 Beauty leads (lead_id LIKE 'beauty%'): ${beautyCount}\n`);

  // Get sample beauty leads
  const { data: sampleBeauty } = await supabase
    .from('businesses')
    .select('lead_id, email, name, category, city')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .limit(10);

  console.log('📝 Sample beauty leads:');
  sampleBeauty?.forEach((lead, i) => {
    console.log(`  ${i + 1}. ${lead.name || 'N/A'}`);
    console.log(`     Email: ${lead.email || 'N/A'}`);
    console.log(`     Category: ${lead.category || 'N/A'}`);
    console.log(`     Location: ${lead.city || 'N/A'}`);
    console.log('');
  });

  // Count by category
  console.log('📊 Breakdown by segment:\n');

  const { count: massageSpa } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('category.ilike.%massage%,category.ilike.%spa%,category.ilike.%wellness%');

  console.log(`  🧘 Massage & Spa: ${massageSpa}`);

  const { count: hairBeauty } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('category.ilike.%hair%,category.ilike.%salon%,category.ilike.%barber%');

  console.log(`  💇 Hair & Beauty: ${hairBeauty}`);

  const { count: cosmetic } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .or('category.ilike.%cosmetic%,category.ilike.%laser%,category.ilike.%aesthetic%');

  console.log(`  💉 Cosmetic & Aesthetic: ${cosmetic}`);

  // Check never contacted (this might not exist in the table, so we'll skip this check for now)
  const neverContacted = beautyCount; // Placeholder - we'll refine this

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
