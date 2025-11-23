#!/usr/bin/env tsx
/**
 * Automatically configure and activate n8n workflow
 */

import * as dotenv from 'dotenv';

dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'sgZiv2UUHYBnAA7f';

async function activateWorkflow() {
  console.log('🔧 Configuring and activating n8n workflow...\n');

  try {
    // 1. Get existing credentials
    console.log('1️⃣  Fetching credentials...');
    const credsResponse = await fetch(`${N8N_BASE_URL}/api/v1/credentials`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY || '' }
    });

    if (!credsResponse.ok) {
      throw new Error(`Failed to fetch credentials: ${credsResponse.statusText}`);
    }

    const credentials = await credsResponse.json();

    // Find HubSpot and Supabase credentials
    const hubspotCred = credentials.data?.find((c: any) =>
      c.name === 'HubSpot API' || c.type === 'httpHeaderAuth'
    );

    const supabaseCred = credentials.data?.find((c: any) =>
      c.name === 'Supabase' || c.type === 'postgres'
    );

    console.log(`   ✅ Found HubSpot credential: ${hubspotCred?.name} (ID: ${hubspotCred?.id})`);
    console.log(`   ✅ Found Supabase credential: ${supabaseCred?.name} (ID: ${supabaseCred?.id})\n`);

    if (!hubspotCred || !supabaseCred) {
      throw new Error('Could not find required credentials');
    }

    // 2. Get workflow
    console.log('2️⃣  Fetching workflow...');
    const workflowResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY || '' }
    });

    if (!workflowResponse.ok) {
      throw new Error(`Failed to fetch workflow: ${workflowResponse.statusText}`);
    }

    const workflow = await workflowResponse.json();
    console.log(`   ✅ Loaded workflow: ${workflow.data.name}\n`);

    // 3. Update workflow nodes with correct credential IDs
    console.log('3️⃣  Updating workflow credentials...');

    let updatedNodes = 0;
    workflow.data.nodes.forEach((node: any) => {
      if (node.credentials) {
        // Update HubSpot API credentials
        if (node.credentials.httpHeaderAuth) {
          node.credentials.httpHeaderAuth.id = hubspotCred.id;
          updatedNodes++;
        }
        // Update Supabase credentials
        if (node.credentials.postgres) {
          node.credentials.postgres.id = supabaseCred.id;
          updatedNodes++;
        }
      }
    });

    console.log(`   ✅ Updated ${updatedNodes} node credentials\n`);

    // 4. Activate workflow
    workflow.data.active = true;

    // 5. Save workflow
    console.log('4️⃣  Saving and activating workflow...');
    const updateResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY || ''
      },
      body: JSON.stringify(workflow.data)
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update workflow: ${error}`);
    }

    const result = await updateResponse.json();

    console.log('   ✅ Workflow saved and activated!\n');
    console.log('='.repeat(70));
    console.log('✅ SUCCESS - Workflow is ready!\n');
    console.log(`📍 Workflow URL: ${N8N_BASE_URL}/workflow/${WORKFLOW_ID}`);
    console.log(`🔗 Webhook URL: ${N8N_BASE_URL}/webhook/smartlead-webhook`);
    console.log(`📊 Status: ${result.data.active ? 'ACTIVE ✅' : 'Inactive'}`);
    console.log(`🔧 Nodes configured: ${updatedNodes}`);
    console.log('='.repeat(70));
    console.log('\n🚀 Next step: Create SmartLead campaign using this webhook URL:');
    console.log(`   ${N8N_BASE_URL}/webhook/smartlead-webhook\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

activateWorkflow();
