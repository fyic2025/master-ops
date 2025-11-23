#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSample() {
  console.log('\n📋 Sample beauty leads with all fields:\n');
  
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .ilike('lead_id', 'beauty%')
    .not('email', 'is', null)
    .limit(5);
  
  if (data && data.length > 0) {
    console.log('Available columns:', Object.keys(data[0]).join(', '));
    console.log('\nFirst 3 leads:');
    data.slice(0, 3).forEach((lead, i) => {
      console.log(`\n${i + 1}. ${lead.name || 'N/A'}`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   Category: ${lead.category || 'N/A'}`);
      console.log(`   City: ${lead.city || 'N/A'}`);
      console.log(`   Lead ID: ${lead.lead_id}`);
    });
  }
}

checkSample();
