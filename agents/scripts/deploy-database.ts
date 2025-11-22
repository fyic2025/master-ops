#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
import 'dotenv/config';

interface DeployResult {
  project: string;
  success: boolean;
  error?: string;
}

async function deploySchema(url: string, key: string, projectName: string): Promise<DeployResult> {
  console.log(`\n📦 Deploying schema to ${projectName}...`);

  try {
    const supabase = createClient(url, key);

    // Read the schema file
    const schemaPath = join(__dirname, '..', 'database-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute the schema
    // Note: Supabase JS client doesn't have direct SQL execution
    // We'll use the REST API endpoint instead
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ query: schema })
    });

    if (!response.ok) {
      // Try alternative approach - split into individual statements
      console.log(`⚠️  Direct execution failed, trying statement-by-statement approach...`);

      // Split SQL into individual statements
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Found ${statements.length} SQL statements to execute`);

      // For now, we'll return instructions for manual execution
      // since Supabase JS client doesn't support arbitrary SQL execution
      return {
        project: projectName,
        success: false,
        error: 'Supabase JS client requires manual SQL execution via dashboard'
      };
    }

    console.log(`✅ Schema deployed successfully to ${projectName}`);
    return {
      project: projectName,
      success: true
    };

  } catch (error) {
    console.error(`❌ Error deploying to ${projectName}:`, error);
    return {
      project: projectName,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Database Schema Deployment                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results: DeployResult[] = [];

  // Deploy to Teelixir
  if (process.env.TEELIXIR_SUPABASE_URL && process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY) {
    results.push(
      await deploySchema(
        process.env.TEELIXIR_SUPABASE_URL,
        process.env.TEELIXIR_SUPABASE_SERVICE_ROLE_KEY,
        'Teelixir'
      )
    );
  }

  // Deploy to Elevate
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    results.push(
      await deploySchema(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Elevate'
      )
    );
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.project}: ${result.success ? 'Success' : result.error}`);
  });

  const allSuccess = results.every(r => r.success);

  if (!allSuccess) {
    console.log('\n⚠️  Note: Supabase requires manual SQL execution via the dashboard');
    console.log('\nPlease execute the schema manually:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Copy contents of: /root/master-ops/agents/database-schema.sql');
    console.log('3. Paste and execute for each project');
  }

  process.exit(allSuccess ? 0 : 1);
}

main();
