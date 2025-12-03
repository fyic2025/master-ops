#!/usr/bin/env node
/**
 * Batch fix HTTP nodes using genericCredentialType to use 'none' instead
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

  let fixedWorkflows = 0;
  let fixedNodes = 0;

  for (const wfSummary of workflows.data) {
    const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfSummary.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!wf?.nodes) continue;

    let needsFix = false;
    const nodesToFix = [];

    // Check for HTTP nodes with wrong auth
    for (let i = 0; i < wf.nodes.length; i++) {
      const node = wf.nodes[i];
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const auth = node.parameters?.authentication;
        if (auth === 'genericCredentialType') {
          needsFix = true;
          nodesToFix.push(node.name);

          // Fix the node
          wf.nodes[i].parameters.authentication = 'none';
          delete wf.nodes[i].parameters.genericAuthType;
          delete wf.nodes[i].credentials;
          fixedNodes++;
        }
      }
    }

    if (needsFix) {
      console.log(`\n🔧 Fixing ${wf.id} - ${wf.name}`);
      console.log(`   Nodes: ${nodesToFix.join(', ')}`);

      // Clean workflow for API
      const cleanWf = {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings
      };

      // Update workflow
      const result = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`, {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      }, 'PUT', cleanWf);

      if (result?.id) {
        console.log(`   ✅ Fixed!`);
        fixedWorkflows++;
      } else {
        console.log(`   ❌ Failed to update`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`BATCH FIX COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Workflows fixed: ${fixedWorkflows}`);
  console.log(`Nodes fixed: ${fixedNodes}`);
}

main().catch(console.error);
