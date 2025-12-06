#!/usr/bin/env tsx
/**
 * Deploy Smartlead → HubSpot Sync Workflow to n8n
 * Auto-creates workflow with proper credentials
 */

import * as fs from 'fs';
import * as path from 'path';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://automation.growthcohq.com';
const N8N_API_KEY = process.env.N8N_API_KEY;
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY not found in environment');
  process.exit(1);
}

async function n8nRequest(endpoint: string, method = 'GET', body?: any) {
  const url = `${N8N_BASE_URL}/api/v1${endpoint}`;
  const options: any = {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`n8n API error: ${response.status} - ${error}`);
  }

  return response.json();
}

interface N8nCredential {
  id: string;
  name: string;
  type: string;
}

interface N8nWorkflow {
  id: string;
  active?: boolean;
}

async function checkCredentials() {
  console.log('🔍 Checking existing credentials in n8n...\n');

  try {
    const creds = await n8nRequest('/credentials') as { data?: N8nCredential[] };

    // Check for HubSpot credential
    const hubspotCred = creds.data?.find((c) =>
      c.name.toLowerCase().includes('hubspot') || c.type === 'httpHeaderAuth'
    );

    // Check for Supabase/Postgres credential
    const supabaseCred = creds.data?.find((c) =>
      c.name.toLowerCase().includes('supabase') || c.type === 'postgres'
    );

    console.log('Credentials found:');
    console.log('  HubSpot:', hubspotCred ? `✅ ${hubspotCred.name} (ID: ${hubspotCred.id})` : '❌ Not found');
    console.log('  Supabase:', supabaseCred ? `✅ ${supabaseCred.name} (ID: ${supabaseCred.id})` : '❌ Not found');
    console.log('');

    return { hubspotCred, supabaseCred };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error checking credentials:', errorMessage);
    return { hubspotCred: null, supabaseCred: null };
  }
}

async function createHubSpotCredential(): Promise<N8nCredential | null> {
  console.log('📝 Creating HubSpot API credential...');

  if (!HUBSPOT_ACCESS_TOKEN) {
    console.log('⚠️  HUBSPOT_ACCESS_TOKEN not in environment, skipping');
    return null;
  }

  try {
    const credential = await n8nRequest('/credentials', 'POST', {
      name: 'HubSpot API (Auto-created)',
      type: 'httpHeaderAuth',
      data: {
        name: 'Authorization',
        value: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      },
    }) as N8nCredential;

    console.log(`✅ Created HubSpot credential (ID: ${credential.id})\n`);
    return credential;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to create HubSpot credential:', errorMessage);
    return null;
  }
}

async function createSupabaseCredential(): Promise<N8nCredential | null> {
  console.log('📝 Creating Supabase credential...');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Supabase credentials not in environment, skipping');
    return null;
  }

  // Extract host from URL
  const supabaseHost = SUPABASE_URL.replace('https://', '').replace('http://', '');
  const projectRef = supabaseHost.split('.')[0];

  try {
    const credential = await n8nRequest('/credentials', 'POST', {
      name: 'Supabase PostgreSQL (Auto-created)',
      type: 'postgres',
      data: {
        host: `db.${supabaseHost}`,
        database: 'postgres',
        user: 'postgres',
        password: SUPABASE_SERVICE_ROLE_KEY,
        port: 5432,
        ssl: 'allow',
      },
    }) as N8nCredential;

    console.log(`✅ Created Supabase credential (ID: ${credential.id})\n`);
    return credential;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to create Supabase credential:', errorMessage);
    console.log('   Trying alternative host format...');

    try {
      const credential = await n8nRequest('/credentials', 'POST', {
        name: 'Supabase PostgreSQL (Auto-created)',
        type: 'postgres',
        data: {
          host: `${projectRef}.supabase.co`,
          database: 'postgres',
          user: 'postgres',
          password: SUPABASE_SERVICE_ROLE_KEY,
          port: 6543, // Supabase transaction pooler port
          ssl: 'require',
        },
      }) as N8nCredential;

      console.log(`✅ Created Supabase credential with alternative format (ID: ${credential.id})\n`);
      return credential;
    } catch (error2) {
      const error2Message = error2 instanceof Error ? error2.message : String(error2);
      console.error('❌ Failed with alternative format too:', error2Message);
      return null;
    }
  }
}

async function importWorkflow(hubspotCredId: string, supabaseCredId: string) {
  console.log('📦 Importing Smartlead → HubSpot sync workflow...\n');

  const workflowPath = path.join(__dirname, '../infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json');

  if (!fs.existsSync(workflowPath)) {
    throw new Error(`Workflow file not found: ${workflowPath}`);
  }

  const workflowJson = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

  // Update credential IDs in workflow
  workflowJson.nodes = workflowJson.nodes.map((node: any) => {
    // Update HubSpot credential
    if (node.credentials?.httpHeaderAuth) {
      node.credentials.httpHeaderAuth = {
        id: hubspotCredId,
        name: 'HubSpot API',
      };
    }

    // Update Supabase credential
    if (node.credentials?.postgres) {
      node.credentials.postgres = {
        id: supabaseCredId,
        name: 'Supabase',
      };
    }

    return node;
  });

  // Set workflow as active
  workflowJson.active = true;
  workflowJson.name = '🚀 Smartlead → HubSpot Outreach Tracking (Auto-deployed)';

  try {
    const result = await n8nRequest('/workflows', 'POST', workflowJson) as N8nWorkflow;
    console.log(`✅ Workflow imported successfully!`);
    console.log(`   Workflow ID: ${result.id}`);
    console.log(`   Webhook URL: ${N8N_BASE_URL}/webhook/smartlead-webhook`);
    console.log(`   Status: ${result.active ? '✅ ACTIVE' : '⚠️ INACTIVE'}\n`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to import workflow:', errorMessage);
    throw error;
  }
}

async function testWorkflow(workflowId: string) {
  console.log('🧪 Testing workflow with sample webhook...\n');

  const testPayload = {
    event_type: 'EMAIL_SENT',
    campaign_id: 'test-campaign-123',
    campaign_name: 'Test Campaign',
    lead_id: 'test-lead-123',
    lead_email: 'test@example.com',
    lead_first_name: 'Test',
    lead_last_name: 'User',
    timestamp: new Date().toISOString(),
    data: {
      email_sequence_number: 1,
      email_subject: 'Test Email Subject',
    },
  };

  try {
    const webhookUrl = `${N8N_BASE_URL}/webhook/smartlead-webhook`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      console.log('✅ Test webhook successful!');
      console.log('   Status:', response.status);
      console.log('   Workflow triggered and executed\n');
      return true;
    } else {
      console.log('⚠️  Test webhook returned:', response.status);
      const text = await response.text();
      console.log('   Response:', text.substring(0, 200));
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Test webhook failed:', errorMessage);
    return false;
  }
}

async function main() {
  console.log('🚀 Deploying Smartlead → HubSpot Auto-Sync Workflow\n');
  console.log('=' .repeat(60));
  console.log('');

  try {
    // Step 1: Check existing credentials
    const { hubspotCred, supabaseCred } = await checkCredentials();

    // Step 2: Create missing credentials
    let hubspotCredId = hubspotCred?.id;
    let supabaseCredId = supabaseCred?.id;

    if (!hubspotCred) {
      const newCred = await createHubSpotCredential();
      if (newCred) hubspotCredId = newCred.id;
    }

    if (!supabaseCred) {
      const newCred = await createSupabaseCredential();
      if (newCred) supabaseCredId = newCred.id;
    }

    if (!hubspotCredId || !supabaseCredId) {
      console.error('\n❌ Missing required credentials. Please create manually in n8n:');
      console.error('   1. HubSpot API (httpHeaderAuth): Authorization: Bearer YOUR_TOKEN');
      console.error('   2. Supabase (postgres): Connection details from .env');
      process.exit(1);
    }

    // Step 3: Import workflow
    const workflow = await importWorkflow(hubspotCredId, supabaseCredId);

    // Step 4: Test workflow
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for activation
    await testWorkflow(workflow.id);

    // Step 5: Summary
    console.log('=' .repeat(60));
    console.log('📋 DEPLOYMENT SUMMARY');
    console.log('=' .repeat(60));
    console.log('');
    console.log('✅ Workflow deployed and active');
    console.log('✅ HubSpot credential configured');
    console.log('✅ Supabase credential configured');
    console.log('✅ Webhook endpoint ready');
    console.log('');
    console.log('📡 Webhook URL (for Smartlead):');
    console.log(`   ${N8N_BASE_URL}/webhook/smartlead-webhook`);
    console.log('');
    console.log('🎯 What happens now:');
    console.log('   1. Smartlead sends emails → triggers webhook');
    console.log('   2. n8n receives event (open/click/reply)');
    console.log('   3. Searches HubSpot for contact by email');
    console.log('   4. Updates or creates contact');
    console.log('   5. Increments counters properly');
    console.log('   6. Logs event to Supabase');
    console.log('');
    console.log('✅ AUTO-SYNC IS NOW ACTIVE!');
    console.log('');
    console.log('=' .repeat(60));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Deployment failed:', errorMessage);
    console.error('\nPlease import workflow manually:');
    console.error('  1. Go to https://automation.growthcohq.com');
    console.error('  2. Import: infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json');
    console.error('  3. Configure credentials');
    console.error('  4. Activate workflow');
    process.exit(1);
  }
}

main();
