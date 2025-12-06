#!/usr/bin/env node

/**
 * APPLY SUPABASE SCHEMA
 *
 * Connects to Supabase and applies the schema from supabase-schema.sql
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  console.log('========================================');
  console.log('SUPABASE SCHEMA APPLICATION');
  console.log('========================================\n');

  // Load credentials
  const supabaseUrl = process.env.BOO_SUPABASE_URL;
  const supabaseKey = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment');
    console.error('   Required: BOO_SUPABASE_URL, BOO_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`Connecting to: ${supabaseUrl}`);
  console.log('');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read schema file
  const schemaPath = path.join(__dirname, 'supabase-schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`Loaded schema from: ${schemaPath}`);
  console.log(`Schema size: ${(schemaSql.length / 1024).toFixed(2)} KB`);
  console.log('');

  // Split SQL into individual statements
  // Note: This is a simple split - for production, use a proper SQL parser
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);
  console.log('Applying schema...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Skip comments and empty statements
    if (stmt.startsWith('--') || stmt.trim() === '') {
      continue;
    }

    // Extract statement type for logging
    const stmtType = stmt.split(' ')[0].toUpperCase();
    const stmtPreview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: stmt + ';'
      });

      if (error) {
        // Try direct execution via REST API instead
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ query: stmt + ';' })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }

      successCount++;
      console.log(`✓ [${i + 1}/${statements.length}] ${stmtType}: ${stmtPreview}`);

    } catch (error) {
      errorCount++;
      errors.push({
        statement: stmtPreview,
        error: error.message
      });
      console.log(`✗ [${i + 1}/${statements.length}] ${stmtType}: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('SCHEMA APPLICATION SUMMARY');
  console.log('========================================\n');
  console.log(`Total statements: ${statements.length}`);
  console.log(`Successful:       ${successCount}`);
  console.log(`Errors:           ${errorCount}\n`);

  if (errorCount > 0) {
    console.log('⚠️  Some errors occurred:\n');
    errors.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.statement}`);
      console.log(`   Error: ${err.error}\n`);
    });
  } else {
    console.log('✅ Schema applied successfully!\n');
  }

  console.log('========================================\n');

  // Test connection by querying schema_version
  try {
    const { data, error } = await supabase
      .from('schema_version')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log('⚠️  Could not verify schema (this is normal for RPC limitations)');
      console.log('   Please verify manually in Supabase dashboard\n');
    } else {
      console.log('✅ Schema verified!');
      if (data && data.length > 0) {
        console.log(`   Version: ${data[0].version}`);
        console.log(`   Applied: ${data[0].applied_at}\n`);
      }
    }
  } catch (error) {
    console.log('⚠️  Verification failed:', error.message);
    console.log('   Schema may have been applied - check Supabase dashboard\n');
  }
}

// Run the script
applySchema().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
