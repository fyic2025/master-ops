#!/usr/bin/env tsx
/**
 * Check ALL businesses in the table - not just beauty
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkAllBusinesses() {
  console.log('🔍 Analyzing ALL businesses in database...\n');
  console.log('='.repeat(70) + '\n');

  // Total count
  const { count: totalCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 TOTAL BUSINESSES: ${totalCount}\n`);

  // Sample lead_ids to see patterns
  const { data: sampleLeads } = await supabase
    .from('businesses')
    .select('lead_id, name, email, category')
    .not('email', 'is', null)
    .limit(20);

  console.log('📝 Sample lead_id patterns:\n');
  sampleLeads?.forEach((lead, i) => {
    const prefix = lead.lead_id?.split('-')[0] || 'unknown';
    console.log(`  ${i + 1}. ${lead.lead_id}`);
    console.log(`     Prefix: ${prefix}`);
    console.log(`     Name: ${lead.name || 'N/A'}`);
    console.log(`     Category: ${lead.category || 'N/A'}`);
    console.log('');
  });

  // Count by lead_id prefix
  console.log('='.repeat(70));
  console.log('📊 BREAKDOWN BY LEAD TYPE\n');

  // Beauty leads
  const { count: beautyCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%');

  console.log(`💄 Beauty leads: ${beautyCount}`);

  // Check for other common prefixes
  const prefixes = ['health', 'fitness', 'wellness', 'food', 'retail', 'service'];

  for (const prefix of prefixes) {
    const { count } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .ilike('lead_id', `${prefix}%`);

    if (count && count > 0) {
      console.log(`🏢 ${prefix.charAt(0).toUpperCase() + prefix.slice(1)} leads: ${count}`);
    }
  }

  // Leads with email
  const { count: withEmail } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null)
    .neq('email', '');

  console.log(`\n✉️  Leads with valid email: ${withEmail} / ${totalCount}`);

  // Beauty leads with email
  const { count: beautyWithEmail } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .neq('email', '');

  console.log(`💄 Beauty leads with email: ${beautyWithEmail} / ${beautyCount}`);

  // Non-beauty leads with email
  const nonBeautyWithEmail = (withEmail || 0) - (beautyWithEmail || 0);
  console.log(`🏢 Non-beauty leads with email: ${nonBeautyWithEmail}`);

  console.log('\n' + '='.repeat(70));
  console.log('📋 SUMMARY\n');
  console.log(`Using beauty leads only: YES`);
  console.log(`Beauty leads: ${beautyCount} (${beautyWithEmail} with email)`);
  console.log(`Other leads available: ${(totalCount || 0) - (beautyCount || 0)}`);
  console.log(`Other leads with email: ${nonBeautyWithEmail}`);
  console.log('='.repeat(70));
}

checkAllBusinesses();
