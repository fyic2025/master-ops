#!/usr/bin/env tsx
/**
 * Check n8n workflow status and activate it
 */

import * as dotenv from 'dotenv';

dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = '0pogf2zEuEcRup83';

async function checkAndActivate() {
  console.log('🔍 Checking n8n workflow status...\n');

  try {
    // Get workflow
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY || '' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow: ${response.status} ${response.statusText}`);
    }

    const workflow = await response.json();

    console.log('📋 Workflow Details:\n');
    console.log(`   Name: ${workflow.name}`);
    console.log(`   ID: ${workflow.id}`);
    console.log(`   Status: ${workflow.active ? '✅ ACTIVE' : '⚠️  INACTIVE'}`);
    console.log(`   Nodes: ${workflow.nodes?.length || 0}`);
    console.log(`   Created: ${workflow.createdAt}`);
    console.log(`   Updated: ${workflow.updatedAt}\n`);

    // Find webhook node
    const webhookNode = workflow.nodes?.find((n: any) => n.type === 'n8n-nodes-base.webhook');
    if (webhookNode) {
      const webhookPath = webhookNode.parameters?.path || 'smartlead-webhook';
      console.log(`🔗 Webhook URL: ${N8N_BASE_URL}/webhook/${webhookPath}\n`);
    }

    // Check credentials on nodes
    console.log('🔐 Credential Status:\n');
    let nodesWithCreds = 0;
    let nodesMissingCreds = 0;

    workflow.nodes?.forEach((node: any) => {
      if (node.credentials) {
        const hasCredentials = Object.keys(node.credentials).length > 0;
        if (hasCredentials) {
          nodesWithCreds++;
        } else {
          nodesMissingCreds++;
          console.log(`   ⚠️  ${node.name} - missing credentials`);
        }
      }
    });

    console.log(`   Nodes with credentials: ${nodesWithCreds}`);
    console.log(`   Nodes missing credentials: ${nodesMissingCreds}\n`);

    // Activate if inactive
    if (!workflow.active) {
      console.log('🚀 Activating workflow...');

      workflow.active = true;

      const updateResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY || ''
        },
        body: JSON.stringify(workflow)
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        throw new Error(`Failed to activate: ${error}`);
      }

      console.log('   ✅ Workflow activated!\n');
    }

    console.log('='.repeat(70));
    console.log('✅ WORKFLOW STATUS\n');
    console.log(`URL: ${N8N_BASE_URL}/workflow/${WORKFLOW_ID}`);
    console.log(`Webhook: ${N8N_BASE_URL}/webhook/smartlead-webhook`);
    console.log(`Status: ${workflow.active ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);

    if (nodesMissingCreds > 0) {
      console.log(`\n⚠️  Warning: ${nodesMissingCreds} nodes need credentials configured manually`);
      console.log(`   Go to: ${N8N_BASE_URL}/workflow/${WORKFLOW_ID}`);
      console.log(`   Assign "HubSpot API" and "Supabase" credentials to nodes`);
    }

    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndActivate();
