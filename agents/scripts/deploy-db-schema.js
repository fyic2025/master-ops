#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deploySchema(projectName, url, serviceKey) {
  console.log(`\n📦 Deploying schema to ${projectName}...`);
  console.log(`   URL: ${url}`);

  try {
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Read schema file
    const schemaPath = path.join(__dirname, '..', 'database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split into individual statements for execution
    // We need to execute via RPC since Supabase doesn't expose raw SQL execution
    // Instead, let's verify if we can connect and check existing tables

    const { data, error } = await supabase
      .from('lighthouse_audits')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`   ⚠️  Tables don't exist yet - need manual deployment`);
        return { project: projectName, needsManual: true };
      }
      throw error;
    }

    console.log(`   ✅ Database already configured for ${projectName}`);
    return { project: projectName, success: true };

  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return { project: projectName, error: error.message, needsManual: true };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Database Schema Deployment Check                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results = [];

  // Check Teelixir
  if (process.env.TEELIXIR_SUPABASE_URL && process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY) {
    results.push(await deploySchema(
      'Teelixir',
      process.env.TEELIXIR_SUPABASE_URL,
      process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY
    ));
  }

  // Check Elevate
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    results.push(await deploySchema(
      'Elevate',
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const needsManual = results.filter(r => r.needsManual);

  if (needsManual.length > 0) {
    console.log('⚠️  Manual SQL execution required for:');
    needsManual.forEach(r => console.log(`   - ${r.project}`));
    console.log('\nExecute via Supabase Dashboard → SQL Editor:');
    console.log('   File: /root/master-ops/agents/database-schema.sql');
    console.log('\nTeelixir: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new');
    console.log('Elevate:  https://supabase.com/dashboard/project/xioudaqfmkdpkgujxehv/sql/new');
  } else {
    console.log('✅ All databases configured!');
  }
}

main().catch(console.error);
