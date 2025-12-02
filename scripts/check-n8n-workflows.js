#!/usr/bin/env node
/**
 * Check n8n workflows for errors and list status
 */

const https = require('https');
const creds = require('../creds');

const WORKFLOWS_TO_CHECK = [
  '34mwUAzIzd0vWcK6', // Supabase to HubSpot - Lead Metrics Push
  '4cGCmsd0h8r6giD8', // BOO Checkout Error Email Sender
  '8Sq4dp3eD0KfR9TS', // Geelong Fitness Test - WORKING
  'BZU7YiMydr0YNSCP', // UNIFIED - System Monitor & Protection Hub
  'C1ZEjrnPZMzazFRW', // FIXED: Smartlead → Individual Profiles
  'CdENdCkCmSQpnbDG', // n8n Daily Backup to Supabase
  'DuobiL8hagCTbBPo', // Teelixir Partner Application - Production v3
  'FuFWG6epdvYYSiBZ', // Teelixir Partner Form - WORKING VERSION
  'Gqq9VlcTkhkyxQwp', // Teelixir Partner Application Handler
  'Pc0HJwrXy0BR6Bub', // ACTIVE - Master Backup System V4
  'QeEwVaRDrlSsPY2V', // AWS Complete Infrastructure Assessment
  'QrVthn0iaHLOXpYW', // System Health Check
  'R6GpYlXEWtoL0lyy', // MCP Integration Test - Working Solution
  'SbNJBlAwVp2LuMcN', // Geelong Fitness Test - FIXED
  'Tz2Ik0Ak9I0lTzpH', // AWS RDS & Database Analysis
  'UaDjUqMSnbDg6Q6t', // BOO - BigCommerce Product Sync (Daily 3AM)
  'UoZVbtuOAP9Hp9nK', // EXECUTE: AusPost Historical Population
  'as5zMDvtgFJoZPty', // AWS EC2 Resource Analysis
  'dEB3P366LI5fip4G', // Beauty Segment to List Automation
  'i0biUmFZljDQBKaq'  // PROD - Cellcast SMS Logger
];

async function request(path, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'automation.growthcohq.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: { 'X-N8N-API-KEY': apiKey },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const apiKey = await creds.get('global', 'n8n_api_key');
  if (!apiKey) {
    console.error('Could not get n8n API key');
    process.exit(1);
  }

  const batch = parseInt(process.argv[2]) || 1;
  const batchSize = 5;
  const start = (batch - 1) * batchSize;
  const end = start + batchSize;
  const workflowIds = WORKFLOWS_TO_CHECK.slice(start, end);

  if (workflowIds.length === 0) {
    console.log('No more workflows in this batch');
    process.exit(0);
  }

  console.log(`\n=== Checking batch ${batch} (workflows ${start + 1}-${Math.min(end, WORKFLOWS_TO_CHECK.length)} of ${WORKFLOWS_TO_CHECK.length}) ===\n`);

  for (const wfId of workflowIds) {
    // Get workflow details
    const wf = await request(`/api/v1/workflows/${wfId}`, apiKey);
    console.log(`\n📋 ${wf.name || 'Unknown'}`);
    console.log(`   ID: ${wfId}`);
    console.log(`   Active: ${wf.active}`);

    // Get recent error executions
    const executions = await request(`/api/v1/executions?workflowId=${wfId}&limit=5&status=error`, apiKey);

    if (executions.data && executions.data.length > 0) {
      console.log(`   ❌ Recent errors: ${executions.data.length}`);
      for (const exec of executions.data.slice(0, 2)) {
        const time = exec.startedAt ? exec.startedAt.substring(0, 19) : 'unknown';
        console.log(`      - ${time}`);
      }
    } else {
      // Check for successful executions
      const successExec = await request(`/api/v1/executions?workflowId=${wfId}&limit=3`, apiKey);
      if (successExec.data && successExec.data.length > 0) {
        const lastRun = successExec.data[0].startedAt ? successExec.data[0].startedAt.substring(0, 19) : 'unknown';
        console.log(`   ✅ No recent errors. Last run: ${lastRun}`);
      } else {
        console.log(`   ⚠️ No executions found`);
      }
    }

    // Check credentials used
    const nodes = wf.nodes || [];
    const credTypes = new Set();
    for (const node of nodes) {
      if (node.credentials) {
        for (const credName of Object.keys(node.credentials)) {
          credTypes.add(credName);
        }
      }
    }
    if (credTypes.size > 0) {
      console.log(`   Credentials: ${Array.from(credTypes).join(', ')}`);
    }
  }

  console.log(`\n=== End of batch ${batch} ===`);
  if (end < WORKFLOWS_TO_CHECK.length) {
    console.log(`\nRun with: node scripts/check-n8n-workflows.js ${batch + 1}`);
  } else {
    console.log('\nAll workflows checked!');
  }
}

main().catch(console.error);
