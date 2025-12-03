#!/usr/bin/env node
/**
 * Actually run a workflow and wait for result
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

function curl(url, headers = {}, method = 'GET', body = null) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : '';
  try {
    return execSync(`curl -sk -X ${method} "${url}" ${headerArgs} ${bodyArg}`, { encoding: 'utf8', timeout: 60000 });
  } catch (e) {
    return e.stdout || '';
  }
}

function curlJson(url, headers = {}, method = 'GET', body = null) {
  const result = curl(url, headers, method, body);
  try {
    return JSON.parse(result);
  } catch {
    console.log('Raw response:', result?.substring(0, 200));
    return null;
  }
}

async function main() {
  const workflowId = process.argv[2];
  if (!workflowId) {
    console.log('Usage: node run-workflow.js <workflow_id>');
    process.exit(1);
  }

  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  let vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  if (!vaultData?.[0]) {
    await new Promise(r => setTimeout(r, 2000));
    vaultData = curlJson(vaultUrl, {
      'apikey': CONFIG.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
    });
  }
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);
  console.log('Got API key');

  // Get workflow info
  const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`, { 'X-N8N-API-KEY': n8nApiKey });
  console.log(`\nWorkflow: ${wf?.name || 'Unknown'}`);
  console.log(`Active: ${wf?.active}`);

  // Execute workflow using test webhook endpoint
  console.log('\nExecuting workflow...');
  const execUrl = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}/run`;
  const execResult = curl(execUrl, {
    'X-N8N-API-KEY': n8nApiKey,
    'Content-Type': 'application/json'
  }, 'POST', {});

  console.log('Execute response:', execResult?.substring(0, 300));

  // Wait and check latest execution
  console.log('\nWaiting 5s for execution...');
  await new Promise(r => setTimeout(r, 5000));

  const executions = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${workflowId}&limit=3`, { 'X-N8N-API-KEY': n8nApiKey });

  console.log('\nRecent executions:');
  for (const exec of (executions?.data || [])) {
    console.log(`  ${exec.id}: ${exec.status} @ ${exec.startedAt?.substring(0, 19)}`);
  }

  // Get error details if latest failed
  if (executions?.data?.[0]?.status === 'error') {
    const latestId = executions.data[0].id;
    const fullExec = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions/${latestId}?includeData=true`, { 'X-N8N-API-KEY': n8nApiKey });
    if (fullExec?.data?.resultData?.error) {
      console.log(`\n❌ ERROR: ${fullExec.data.resultData.error.message}`);
      if (fullExec.data.resultData.error.node) {
        console.log(`   Node: ${fullExec.data.resultData.error.node}`);
      }
    }
  } else if (executions?.data?.[0]?.status === 'success') {
    console.log('\n✅ SUCCESS!');
  }
}

main().catch(console.error);
