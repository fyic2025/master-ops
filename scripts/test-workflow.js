#!/usr/bin/env node
/**
 * Test a workflow by activating, executing, and checking result
 */

const { execSync } = require('child_process');
const crypto = require('crypto');

const CONFIG = {
  SUPABASE_HOST: 'usibnysqelovfuctmkqw.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s',
  ENCRYPTION_KEY: 'mstr-ops-vault-2024-secure-key',
  N8N_HOST: 'automation.growthcohq.com'
};

function decrypt(enc) {
  const buf = Buffer.from(enc, 'base64');
  const key = crypto.createHash('sha256').update(CONFIG.ENCRYPTION_KEY).digest();
  const d = crypto.createDecipheriv('aes-256-cbc', key, buf.subarray(0, 16));
  return Buffer.concat([d.update(buf.subarray(16)), d.final()]).toString();
}

function curlJson(url, headers = {}, method = 'GET') {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try {
    const result = execSync(`curl -sk -X ${method} "${url}" ${headerArgs}`, { encoding: 'utf8', timeout: 60000 });
    return JSON.parse(result);
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  const workflowId = process.argv[2];
  if (!workflowId) {
    console.log('Usage: node test-workflow.js <workflow_id>');
    process.exit(1);
  }

  // Get API key with retry
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  let vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  if (!vaultData || !vaultData[0]) {
    console.log('Retrying vault...');
    await new Promise(r => setTimeout(r, 1000));
    vaultData = curlJson(vaultUrl, {
      'apikey': CONFIG.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
    });
  }
  if (!vaultData || !vaultData[0]) {
    console.error('Could not get API key from vault');
    process.exit(1);
  }
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  // Check workflow status
  console.log(`\nChecking workflow ${workflowId}...`);
  const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`, { 'X-N8N-API-KEY': n8nApiKey });
  console.log(`Name: ${wf.name}`);
  console.log(`Active: ${wf.active}`);

  // Activate if needed
  if (!wf.active) {
    console.log('\nActivating workflow...');
    const activateResult = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}/activate`, { 'X-N8N-API-KEY': n8nApiKey }, 'POST');
    console.log(`Activated: ${activateResult.active}`);
  }

  // Execute
  console.log('\nExecuting workflow...');
  const execResult = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions`, {
    'X-N8N-API-KEY': n8nApiKey,
    'Content-Type': 'application/json'
  }, 'POST');

  // Wait a moment then check execution
  console.log('Waiting for execution...');
  await new Promise(r => setTimeout(r, 3000));

  // Get latest execution for this workflow
  const executions = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${workflowId}&limit=1`, { 'X-N8N-API-KEY': n8nApiKey });

  if (executions.data && executions.data.length > 0) {
    const latest = executions.data[0];
    console.log(`\nLatest execution:`);
    console.log(`  ID: ${latest.id}`);
    console.log(`  Status: ${latest.status}`);
    console.log(`  Started: ${latest.startedAt}`);
    console.log(`  Finished: ${latest.stoppedAt}`);

    if (latest.status === 'error') {
      // Get full execution with error details
      const fullExec = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions/${latest.id}?includeData=true`, { 'X-N8N-API-KEY': n8nApiKey });
      if (fullExec.data?.resultData?.error) {
        console.log(`\n❌ ERROR: ${fullExec.data.resultData.error.message}`);
      }
    } else if (latest.status === 'success') {
      console.log('\n✅ Workflow executed successfully!');
    }
  } else {
    console.log('No executions found');
  }

  // Deactivate
  console.log('\nDeactivating workflow...');
  curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}/deactivate`, { 'X-N8N-API-KEY': n8nApiKey }, 'POST');
  console.log('Done');
}

main().catch(console.error);
