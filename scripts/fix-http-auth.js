#!/usr/bin/env node
/**
 * Fix HTTP node authentication to use 'none' (inline headers)
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

function curlJson(url, headers = {}, method = 'GET', body = null) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : '';
  try {
    const result = execSync(`curl -sk -X ${method} "${url}" ${headerArgs} ${bodyArg}`, { encoding: 'utf8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

async function main() {
  const workflowId = process.argv[2] || '34mwUAzIzd0vWcK6';
  const nodeName = process.argv[3] || 'Get Supabase Data (HTTP)';

  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  let vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  if (!vaultData?.[0]) {
    await new Promise(r => setTimeout(r, 1000));
    vaultData = curlJson(vaultUrl, {
      'apikey': CONFIG.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
    });
  }
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log(`\nFetching workflow ${workflowId}...`);
  const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`, { 'X-N8N-API-KEY': n8nApiKey });

  if (!wf) {
    console.error('Could not fetch workflow');
    process.exit(1);
  }

  console.log(`Workflow: ${wf.name}`);

  // Find the HTTP node
  const nodeIdx = wf.nodes.findIndex(n => n.name === nodeName);
  if (nodeIdx === -1) {
    console.log(`Node "${nodeName}" not found`);
    console.log('Available nodes:', wf.nodes.map(n => n.name));
    process.exit(1);
  }

  const node = wf.nodes[nodeIdx];
  console.log(`\nFound node: ${node.name}`);
  console.log(`Current auth: ${node.parameters?.authentication}`);

  // Fix authentication
  node.parameters.authentication = 'none';
  delete node.parameters.genericAuthType;
  delete node.credentials;

  console.log(`\nUpdated auth to: none`);

  // Clean workflow
  const cleanWf = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  // Update
  console.log('\nUpdating workflow...');
  const result = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`, {
    'X-N8N-API-KEY': n8nApiKey,
    'Content-Type': 'application/json'
  }, 'PUT', cleanWf);

  if (result?.id) {
    console.log('✅ Node auth fixed!');
  } else {
    console.log('❌ Update failed');
  }
}

main().catch(console.error);
