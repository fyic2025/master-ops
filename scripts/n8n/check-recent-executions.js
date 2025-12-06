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

function curlJson(url, headers = {}) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try {
    const result = execSync(`curl -sk "${url}" ${headerArgs}`, { encoding: 'utf8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  // Get recent executions
  console.log('Fetching recent executions...\n');
  const executions = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions?limit=50`, { 'X-N8N-API-KEY': n8nApiKey });

  if (!executions?.data) {
    console.log('Could not fetch executions');
    return;
  }

  console.log('='.repeat(80));
  console.log('RECENT EXECUTIONS (last 50)');
  console.log('='.repeat(80));

  // Get workflow names
  const workflows = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows`, { 'X-N8N-API-KEY': n8nApiKey });
  const wfMap = {};
  for (const wf of workflows?.data || []) {
    wfMap[wf.id] = wf.name;
  }

  for (const exec of executions.data) {
    const status = exec.status === 'success' ? '✅' : exec.status === 'error' ? '❌' : '⏳';
    const wfName = (wfMap[exec.workflowId] || 'Unknown').substring(0, 45);
    console.log(`${status} ${exec.startedAt} | ${wfName}`);
    if (exec.status === 'error') {
      // Get error details
      const detail = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions/${exec.id}?includeData=true`, { 'X-N8N-API-KEY': n8nApiKey });
      const errMsg = detail?.data?.resultData?.error?.message || 'Unknown error';
      console.log(`   Error: ${errMsg.substring(0, 70)}`);
    }
  }

  // Summary
  const successCount = executions.data.filter(e => e.status === 'success').length;
  const errorCount = executions.data.filter(e => e.status === 'error').length;

  console.log('\n' + '='.repeat(80));
  console.log(`SUCCESS: ${successCount} | ERROR: ${errorCount} | OTHER: ${executions.data.length - successCount - errorCount}`);
}

main().catch(console.error);
