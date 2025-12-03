#!/usr/bin/env node
/**
 * Audit n8n workflows using curl (to avoid Node.js DNS issues)
 */

const { execSync } = require('child_process');
const crypto = require('crypto');

const CONFIG = {
  SUPABASE_HOST: 'usibnysqelovfuctmkqw.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s',
  ENCRYPTION_KEY: 'mstr-ops-vault-2024-secure-key',
  N8N_HOST: 'automation.growthcohq.com'
};

// All active workflows
const WORKFLOWS = [
  { id: '34mwUAzIzd0vWcK6', name: 'Supabase to HubSpot - Lead Metrics Push' },
  { id: '4cGCmsd0h8r6giD8', name: 'BOO Checkout Error Email Sender' },
  { id: '8Sq4dp3eD0KfR9TS', name: 'Geelong Fitness Test - WORKING' },
  { id: 'BZU7YiMydr0YNSCP', name: 'UNIFIED - System Monitor & Protection Hub' },
  { id: 'C1ZEjrnPZMzazFRW', name: 'FIXED: Smartlead → Individual Profiles' },
  { id: 'CdENdCkCmSQpnbDG', name: 'n8n Daily Backup to Supabase' },
  { id: 'DuobiL8hagCTbBPo', name: 'Teelixir Partner Application - Production v3' },
  { id: 'FuFWG6epdvYYSiBZ', name: 'Teelixir Partner Form - WORKING VERSION' },
  { id: 'Gqq9VlcTkhkyxQwp', name: 'Teelixir Partner Application Handler' },
  { id: 'Pc0HJwrXy0BR6Bub', name: 'ACTIVE - Master Backup System V4' },
  { id: 'QeEwVaRDrlSsPY2V', name: 'AWS Complete Infrastructure Assessment' },
  { id: 'QrVthn0iaHLOXpYW', name: 'System Health Check' },
  { id: 'R6GpYlXEWtoL0lyy', name: 'MCP Integration Test - Working Solution' },
  { id: 'SbNJBlAwVp2LuMcN', name: 'Geelong Fitness Test - FIXED' },
  { id: 'Tz2Ik0Ak9I0lTzpH', name: 'AWS RDS & Database Analysis' },
  { id: 'UaDjUqMSnbDg6Q6t', name: 'BOO - BigCommerce Product Sync (Daily 3AM)' },
  { id: 'UoZVbtuOAP9Hp9nK', name: 'EXECUTE: AusPost Historical Population' },
  { id: 'as5zMDvtgFJoZPty', name: 'AWS EC2 Resource Analysis' },
  { id: 'dEB3P366LI5fip4G', name: 'Beauty Segment to List Automation' },
  { id: 'i0biUmFZljDQBKaq', name: 'PROD - Cellcast SMS Logger' }
];

function decrypt(encryptedValue) {
  try {
    const buffer = Buffer.from(encryptedValue, 'base64');
    const iv = buffer.subarray(0, 16);
    const encrypted = buffer.subarray(16);
    const key = crypto.createHash('sha256').update(CONFIG.ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return null;
  }
}

function curlJson(url, headers = {}) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try {
    const result = execSync(`curl -sk "${url}" ${headerArgs}`, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(result);
  } catch (e) {
    console.error('Curl error:', e.message);
    return null;
  }
}

async function main() {
  // Get n8n API key from vault
  console.log('Fetching n8n API key from vault...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });

  if (!vaultData || !vaultData[0]?.encrypted_value) {
    console.error('Failed to get API key from vault');
    process.exit(1);
  }

  const n8nApiKey = decrypt(vaultData[0].encrypted_value);
  if (!n8nApiKey) {
    console.error('Failed to decrypt API key');
    process.exit(1);
  }
  console.log(`Got API key: ${n8nApiKey.substring(0, 10)}...`);

  // Parse batch argument
  const batch = parseInt(process.argv[2]) || 1;
  const batchSize = 5;
  const start = (batch - 1) * batchSize;
  const end = Math.min(start + batchSize, WORKFLOWS.length);
  const workflowsToCheck = WORKFLOWS.slice(start, end);

  if (workflowsToCheck.length === 0) {
    console.log('No more workflows in this batch');
    process.exit(0);
  }

  console.log(`\n=== Batch ${batch}: Workflows ${start + 1}-${end} of ${WORKFLOWS.length} ===\n`);

  const results = [];

  for (const { id, name } of workflowsToCheck) {
    console.log(`📋 ${name}`);
    console.log(`   ID: ${id}`);

    // Get workflow details
    const wfUrl = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${id}`;
    const wf = curlJson(wfUrl, { 'X-N8N-API-KEY': n8nApiKey });

    if (!wf || wf.message) {
      console.log(`   ⚠️ Could not fetch workflow: ${wf?.message || 'unknown error'}`);
      results.push({ id, name, status: 'error', issue: 'Could not fetch workflow' });
      console.log('');
      continue;
    }

    console.log(`   Active: ${wf.active}`);

    // Get credentials used
    const credTypes = new Set();
    for (const node of (wf.nodes || [])) {
      if (node.credentials) {
        for (const credName of Object.keys(node.credentials)) {
          credTypes.add(credName);
        }
      }
    }
    if (credTypes.size > 0) {
      console.log(`   Credentials: ${Array.from(credTypes).join(', ')}`);
    }

    // Get recent error executions
    const execUrl = `https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${id}&limit=5&status=error`;
    const executions = curlJson(execUrl, { 'X-N8N-API-KEY': n8nApiKey });

    const errorCount = executions?.data?.length || 0;

    if (errorCount > 0) {
      console.log(`   ❌ Recent errors: ${errorCount}`);
      for (const exec of (executions.data || []).slice(0, 2)) {
        const time = exec.startedAt ? exec.startedAt.substring(0, 19) : 'unknown';
        console.log(`      - ${time}`);
      }
      results.push({
        id,
        name,
        active: wf.active,
        status: 'has_errors',
        errorCount,
        credentials: Array.from(credTypes)
      });
    } else {
      // Check for any recent runs
      const successUrl = `https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${id}&limit=1`;
      const successExec = curlJson(successUrl, { 'X-N8N-API-KEY': n8nApiKey });
      const lastRun = successExec?.data?.[0]?.startedAt?.substring(0, 19) || 'never';
      console.log(`   ✅ No recent errors. Last run: ${lastRun}`);
      results.push({
        id,
        name,
        active: wf.active,
        status: 'ok',
        lastRun,
        credentials: Array.from(credTypes)
      });
    }

    console.log('');
  }

  console.log(`=== End of batch ${batch} ===`);

  // Summary
  const withErrors = results.filter(r => r.status === 'has_errors');
  const ok = results.filter(r => r.status === 'ok');

  console.log(`\nSummary: ${ok.length} OK, ${withErrors.length} with errors`);

  if (withErrors.length > 0) {
    console.log('\nWorkflows with errors:');
    for (const r of withErrors) {
      console.log(`  - ${r.name} (${r.errorCount} errors)`);
      if (r.credentials.length > 0) {
        console.log(`    Credentials: ${r.credentials.join(', ')}`);
      }
    }
  }

  if (end < WORKFLOWS.length) {
    console.log(`\nNext batch: node scripts/audit-n8n-workflows.js ${batch + 1}`);
  } else {
    console.log('\n✅ All workflows checked!');
  }
}

main().catch(console.error);
