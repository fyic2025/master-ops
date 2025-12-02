#!/usr/bin/env tsx
/**
 * Setup n8n Credentials for SmartLead → HubSpot Workflow
 */

import * as dotenv from 'dotenv';

dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupCredentials() {
  console.log('🔐 Setting up n8n credentials...\n');

  // 1. Create HubSpot API credential (HTTP Header Auth)
  console.log('1️⃣  Creating HubSpot API credential...');

  const hubspotCred = {
    name: 'HubSpot API',
    type: 'httpHeaderAuth',
    data: {
      name: 'Authorization',
      value: `Bearer ${HUBSPOT_TOKEN}`
    }
  };

  try {
    const hubspotResponse = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY || ''
      },
      body: JSON.stringify(hubspotCred)
    });

    if (hubspotResponse.ok) {
      const hubspotResult = await hubspotResponse.json();
      console.log(`   ✅ HubSpot credential created (ID: ${hubspotResult.id})\n`);
    } else {
      const error = await hubspotResponse.text();
      console.log(`   ⚠️  ${error} (may already exist)\n`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // 2. Create Supabase PostgreSQL credential
  console.log('2️⃣  Creating Supabase credential...');

  // Extract host from Supabase URL
  const supabaseHost = SUPABASE_URL?.replace('https://', '').replace('http://', '');

  const supabaseCred = {
    name: 'Supabase',
    type: 'postgres',
    data: {
      host: `db.${supabaseHost}`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: SUPABASE_KEY,
      ssl: {
        rejectUnauthorized: false
      }
    }
  };

  try {
    const supabaseResponse = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY || ''
      },
      body: JSON.stringify(supabaseCred)
    });

    if (supabaseResponse.ok) {
      const supabaseResult = await supabaseResponse.json();
      console.log(`   ✅ Supabase credential created (ID: ${supabaseResult.id})\n`);
    } else {
      const error = await supabaseResponse.text();
      console.log(`   ⚠️  ${error} (may already exist)\n`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  console.log('─'.repeat(70));
  console.log('✅ Credential setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Go to: https://automation.growthcohq.com/workflow/sgZiv2UUHYBnAA7f');
  console.log('  2. Click on each node that shows credential error');
  console.log('  3. Select the matching credential from dropdown');
  console.log('  4. Save and activate workflow');
  console.log('─'.repeat(70));
}

setupCredentials();
