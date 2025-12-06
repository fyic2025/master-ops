#!/usr/bin/env node
/**
 * Find workflows with HTTP Request nodes using genericCredentialType
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

  console.log('Fetching all workflows...');
  const workflows = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows`, { 'X-N8N-API-KEY': n8nApiKey });

  if (!workflows?.data) {
    console.error('Could not fetch workflows');
    process.exit(1);
  }

  console.log(`Found ${workflows.data.length} workflows\n`);

  const badWorkflows = [];

  for (const wfSummary of workflows.data) {
    // Fetch full workflow
    const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfSummary.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!wf?.nodes) continue;

    // Check for HTTP nodes with wrong auth
    for (const node of wf.nodes) {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const auth = node.parameters?.authentication;
        if (auth === 'genericCredentialType') {
          badWorkflows.push({
            id: wf.id,
            name: wf.name,
            nodeName: node.name,
            auth: auth
          });
          console.log(`❌ ${wf.id} - ${wf.name}`);
          console.log(`   Node: ${node.name}, Auth: ${auth}`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Found ${badWorkflows.length} workflows with bad HTTP auth`);

  if (badWorkflows.length > 0) {
    console.log('\nWorkflow IDs to fix:');
    for (const wf of badWorkflows) {
      console.log(`  node scripts/fix-http-auth.js ${wf.id} "${wf.nodeName}"`);
    }
  }
}

main().catch(console.error);
