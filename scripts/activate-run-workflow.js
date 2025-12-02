#!/usr/bin/env node
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

function curlJson(url, headers = {}, method = 'GET', body = null) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : '';
  try {
    const result = execSync(`curl -sk -X ${method} "${url}" ${headerArgs} ${bodyArg}`, { encoding: 'utf8', timeout: 60000 });
    return JSON.parse(result);
  } catch (e) {
    console.log('curl error');
    return null;
  }
}

async function main() {
  const workflowId = process.argv[2];
  if (!workflowId) {
    console.log('Usage: node activate-run-workflow.js <workflow_id>');
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
  if (!vaultData?.[0]) {
    console.error('Could not get API key');
    process.exit(1);
  }
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  // 1. Activate workflow
  console.log('\n1. Activating workflow...');
  const activateResult = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}/activate`, { 'X-N8N-API-KEY': n8nApiKey }, 'POST');
  console.log(`   Active: ${activateResult?.active}`);

  // 2. Manually trigger execution via the execute endpoint
  console.log('\n2. Triggering execution...');
  const execResult = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}/run`, {
    'X-N8N-API-KEY': n8nApiKey,
    'Content-Type': 'application/json'
  }, 'POST', {});
  console.log(`   Result: ${JSON.stringify(execResult)?.substring(0, 100)}`);

  // 3. Wait for execution
  console.log('\n3. Waiting 8 seconds...');
  await new Promise(r => setTimeout(r, 8000));

  // 4. Get latest execution
  console.log('\n4. Checking latest execution...');
  const executions = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${workflowId}&limit=1`, { 'X-N8N-API-KEY': n8nApiKey });

  if (executions?.data?.[0]) {
    const latest = executions.data[0];
    console.log(`   ID: ${latest.id}`);
    console.log(`   Status: ${latest.status}`);
    console.log(`   Started: ${latest.startedAt}`);

    if (latest.status === 'error') {
      const fullExec = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions/${latest.id}?includeData=true`, { 'X-N8N-API-KEY': n8nApiKey });
      console.log(`\n   ❌ ERROR: ${fullExec?.data?.resultData?.error?.message || 'Unknown'}`);
    } else if (latest.status === 'success') {
      console.log(`\n   ✅ SUCCESS!`);
    }
  }

  // 5. Deactivate workflow
  console.log('\n5. Deactivating workflow...');
  curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}/deactivate`, { 'X-N8N-API-KEY': n8nApiKey }, 'POST');
  console.log('   Done');
}

main().catch(console.error);
