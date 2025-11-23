#!/usr/bin/env tsx
/**
 * List all n8n workflows
 */

import * as dotenv from 'dotenv';

dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function listWorkflows() {
  console.log('📋 Fetching all n8n workflows...\n');

  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY || '' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const workflows = result.data || [];

    console.log(`Found ${workflows.length} workflows:\n`);
    console.log('='.repeat(80) + '\n');

    workflows.forEach((workflow: any, index: number) => {
      console.log(`${index + 1}. ${workflow.name}`);
      console.log(`   ID: ${workflow.id}`);
      console.log(`   Status: ${workflow.active ? '🟢 Active' : '⚪ Inactive'}`);
      console.log(`   Created: ${workflow.createdAt}`);
      console.log(`   Updated: ${workflow.updatedAt}`);
      console.log(`   URL: ${N8N_BASE_URL}/workflow/${workflow.id}`);
      console.log('');
    });

    console.log('='.repeat(80));

    // Find SmartLead workflows
    const smartleadWorkflows = workflows.filter((w: any) =>
      w.name.toLowerCase().includes('smartlead') || w.name.toLowerCase().includes('hubspot')
    );

    if (smartleadWorkflows.length > 0) {
      console.log('\n📌 SmartLead/HubSpot Workflows:\n');
      smartleadWorkflows.forEach((w: any) => {
        console.log(`   ✅ ${w.name}`);
        console.log(`      ID: ${w.id}`);
        console.log(`      Status: ${w.active ? 'Active' : 'Inactive'}`);
        console.log(`      URL: ${N8N_BASE_URL}/workflow/${w.id}\n`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

listWorkflows();
