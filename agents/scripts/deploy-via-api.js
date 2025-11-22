#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeSQL(url, serviceKey, sql, projectName) {
  console.log(`\n📦 Deploying to ${projectName}...`);

  try {
    // Extract project reference from URL
    const projectRef = url.match(/https:\/\/([^.]+)/)[1];

    // Use Supabase REST API's query endpoint
    const apiUrl = `${url}/rest/v1/rpc/exec`;

    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements`);

    // Create client with service role
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Try executing via raw SQL - using postgres REST API
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    console.log(`   Response status: ${response.status}`);
    const result = await response.text();
    console.log(`   Result:`, result.substring(0, 200));

    if (response.ok) {
      console.log(`   ✅ Schema deployed successfully to ${projectName}`);
      return { success: true, project: projectName };
    } else {
      console.log(`   ❌ Deployment failed: ${result}`);
      return { success: false, project: projectName, error: result };
    }

  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return { success: false, project: projectName, error: error.message };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Database Schema Deployment via API                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Read schema
  const schemaPath = path.join(__dirname, '..', 'database-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const results = [];

  // Deploy to Teelixir
  if (process.env.TEELIXIR_SUPABASE_URL && process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY) {
    results.push(await executeSQL(
      process.env.TEELIXIR_SUPABASE_URL,
      process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY,
      schema,
      'Teelixir'
    ));
  }

  // Deploy to Elevate
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    results.push(await executeSQL(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      schema,
      'Elevate'
    ));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.project}: ${r.success ? 'Success' : r.error}`);
  });

  const allSuccess = results.every(r => r.success);
  process.exit(allSuccess ? 0 : 1);
}

main().catch(console.error);
