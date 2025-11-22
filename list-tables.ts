#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('🔍 Listing all tables in database...\n');

  // Try to query information_schema
  const { data, error } = await supabase
    .rpc('list_tables');

  if (error) {
    console.log('Cannot use RPC, trying direct query...');

    // Try some common table names
    const tablesToCheck = [
      'teelixir_businesses',
      'businesses',
      'leads',
      'beauty_leads',
      'smartlead_leads',
      'contacts',
      'teelixir_leads'
    ];

    console.log('Testing common table names:\n');

    for (const table of tablesToCheck) {
      const { count, error: tableError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (tableError) {
        console.log(`❌ ${table}: ${tableError.message}`);
      } else {
        console.log(`✅ ${table}: ${count} rows`);
      }
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
