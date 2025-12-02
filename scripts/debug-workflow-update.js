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

function curlRaw(url, headers = {}, method = 'GET', body = null) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : '';
  try {
    const result = execSync(`curl -sk -X ${method} "${url}" ${headerArgs} ${bodyArg}`, { encoding: 'utf8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return result;
  } catch (e) {
    console.error('Curl error:', e.message);
    return null;
  }
}

async function main() {
  const workflowId = process.argv[2] || 'AC7rYC61hVf2jEAI';

  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultRaw = curlRaw(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const vaultData = JSON.parse(vaultRaw);
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log(`Fetching workflow ${workflowId}...`);
  const wfRaw = curlRaw(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`, { 'X-N8N-API-KEY': n8nApiKey });
  const wf = JSON.parse(wfRaw);

  console.log(`Workflow: ${wf.name}`);

  // Fix all HTTP nodes
  for (let i = 0; i < wf.nodes.length; i++) {
    const node = wf.nodes[i];
    if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters?.authentication === 'genericCredentialType') {
      console.log(`Fixing node: ${node.name}`);
      wf.nodes[i].parameters.authentication = 'none';
      delete wf.nodes[i].parameters.genericAuthType;
      delete wf.nodes[i].credentials;
    }
  }

  const cleanWf = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  console.log('\nUpdating workflow...');
  const result = curlRaw(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`, {
    'X-N8N-API-KEY': n8nApiKey,
    'Content-Type': 'application/json'
  }, 'PUT', cleanWf);

  console.log('\nRaw response:');
  console.log(result?.substring(0, 1000));
}

main().catch(console.error);
