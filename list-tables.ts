#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('\n🔍 Checking database tables...\n');
  
  // Try different table names
  const tablesToCheck = [
    'businesses',
    'teelixir_businesses', 
    'smartlead_leads',
    'leads',
    'contacts'
  ];
  
  for (const table of tablesToCheck) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✅ Table "${table}" exists - ${count} rows`);
      
      // Get a sample row to see columns
      const { data: sample } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (sample && sample.length > 0) {
        console.log(`   Columns: ${Object.keys(sample[0]).slice(0, 10).join(', ')}...`);
      }
    } else {
      console.log(`❌ Table "${table}" - ${error.message}`);
    }
  }
}

listTables();
