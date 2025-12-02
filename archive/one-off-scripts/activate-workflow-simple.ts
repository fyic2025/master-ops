#!/usr/bin/env tsx
/**
 * Simple workflow activation using PATCH
 */

import * as dotenv from 'dotenv';

dotenv.config();

const N8N_BASE_URL = process.env.N8N_BASE_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = '0pogf2zEuEcRup83';

async function activateWorkflow() {
  console.log('🚀 Attempting to activate workflow via PATCH...\n');

  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY || ''
      },
      body: JSON.stringify({ active: true })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Workflow activated successfully!\n');
      console.log(`   Status: ${result.active ? 'ACTIVE ✅' : 'Inactive'}`);
      console.log(`   Webhook URL: ${N8N_BASE_URL}/webhook/smartlead-webhook\n`);
    } else {
      const error = await response.text();
      console.log(`❌ PATCH failed: ${response.status} - ${error}\n`);
      console.log('Manual activation required:\n');
      console.log(`1. Open: ${N8N_BASE_URL}/workflow/${WORKFLOW_ID}`);
      console.log('2. Click the "Inactive" toggle in top-right to activate\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

activateWorkflow();
