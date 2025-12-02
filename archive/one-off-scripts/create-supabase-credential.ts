#!/usr/bin/env tsx
/**
 * Create Supabase Postgres Credential in n8n
 */

import * as dotenv from 'dotenv';

dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createSupabaseCredential() {
  console.log('🔐 Creating Supabase PostgreSQL credential in n8n...\n');

  // Extract project ref from Supabase URL
  // https://qcvfxxsnqvdfmpbcgdni.supabase.co -> qcvfxxsnqvdfmpbcgdni
  const projectRef = SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '');
  const host = `db.${projectRef}.supabase.co`;

  console.log(`   Host: ${host}`);
  console.log(`   Database: postgres`);
  console.log(`   User: postgres`);
  console.log(`   SSL: require\n`);

  // Create Postgres credential with complete n8n schema (including SSH fields)
  const credential = {
    name: 'Supabase',
    type: 'postgres',
    data: {
      host: host,
      database: 'postgres',
      user: 'postgres',
      password: SUPABASE_KEY,
      port: 5432,
      ssl: 'require',
      allowUnauthorizedCerts: false,
      sshTunnel: false,
      sshAuthenticateWith: 'password',
      sshHost: '',
      sshPort: 22,
      sshUser: '',
      sshPassword: '',
      privateKey: '',
      passphrase: ''
    }
  };

  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY || ''
      },
      body: JSON.stringify(credential)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Supabase credential created successfully!\n');
      console.log(`   Credential ID: ${result.id}`);
      console.log(`   Credential Name: ${result.name}`);
      console.log(`   Type: ${result.type}\n`);

      console.log('─'.repeat(70));
      console.log('🎯 Next Steps:\n');
      console.log('1. Open workflow: https://automation.growthcohq.com/workflow/sgZiv2UUHYBnAA7f');
      console.log('2. Configure credentials on nodes:');
      console.log('   - "Check HubSpot Contact" → Select "Supabase"');
      console.log('   - "Log to Supabase" → Select "Supabase"');
      console.log('3. Save workflow');
      console.log('4. Activate workflow (toggle switch to "Active")');
      console.log('─'.repeat(70));

      return result;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create credential\n');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${errorText}\n`);

      // If credential already exists, list existing credentials
      if (response.status === 400 || response.status === 409) {
        console.log('💡 Credential may already exist. Checking...\n');
        await listCredentials();
      }

      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error creating credential:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

async function listCredentials() {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY || ''
      }
    });

    if (response.ok) {
      const credentials = await response.json();
      console.log('📋 Existing credentials:\n');

      const postgresCreds = credentials.data?.filter((c: any) => c.type === 'postgres') || [];
      const hubspotCreds = credentials.data?.filter((c: any) => c.type === 'httpHeaderAuth') || [];

      if (postgresCreds.length > 0) {
        console.log('   Postgres credentials:');
        postgresCreds.forEach((c: any) => {
          console.log(`     - ${c.name} (ID: ${c.id})`);
        });
      }

      if (hubspotCreds.length > 0) {
        console.log('\n   HubSpot credentials:');
        hubspotCreds.forEach((c: any) => {
          console.log(`     - ${c.name} (ID: ${c.id})`);
        });
      }

      console.log('\n   You can use these existing credentials in your workflow.');
    }
  } catch (error) {
    console.log('   Could not list credentials');
  }
}

createSupabaseCredential();
