#!/usr/bin/env node
/**
 * Fix specific n8n workflows via API
 */

const { execSync } = require('child_process');
const crypto = require('crypto');

const CONFIG = {
  SUPABASE_HOST: 'usibnysqelovfuctmkqw.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s',
  ENCRYPTION_KEY: 'mstr-ops-vault-2024-secure-key',
  N8N_HOST: 'automation.growthcohq.com'
};

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

function curlJson(url, headers = {}, method = 'GET', body = null) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : '';
  const cmd = `curl -sk -X ${method} "${url}" ${headerArgs} ${bodyArg}`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
    console.error('Curl error:', e.message);
    return null;
  }
}

async function main() {
  // Get n8n API key from vault
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);
  console.log(`Got API key: ${n8nApiKey.substring(0, 10)}...`);

  const action = process.argv[2];
  const workflowId = process.argv[3];

  if (action === 'disable') {
    // Disable a workflow
    console.log(`\nDisabling workflow ${workflowId}...`);
    const url = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}/deactivate`;
    const result = curlJson(url, { 'X-N8N-API-KEY': n8nApiKey }, 'POST');
    console.log('Result:', result?.active === false ? 'Deactivated' : JSON.stringify(result));
    return;
  }

  if (action === 'show') {
    // Show workflow structure
    const url = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`;
    const wf = curlJson(url, { 'X-N8N-API-KEY': n8nApiKey });
    console.log(`\nWorkflow: ${wf.name}`);
    console.log(`Active: ${wf.active}`);
    console.log(`\nNodes:`);
    for (const node of wf.nodes) {
      console.log(`  - ${node.name} (${node.type})`);
      if (node.type === 'n8n-nodes-base.executeCommand') {
        console.log(`    Command: ${node.parameters?.command?.substring(0, 80)}...`);
      }
    }
    return;
  }

  if (action === 'fix-health-check') {
    // Fix System Health Check workflow
    const wfId = 'QrVthn0iaHLOXpYW';
    console.log(`\nFetching System Health Check workflow...`);
    const url = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfId}`;
    const wf = curlJson(url, { 'X-N8N-API-KEY': n8nApiKey });

    console.log(`Current nodes: ${wf.nodes.map(n => n.name).join(', ')}`);

    // Find the Execute Command node and replace it
    const execNodeIdx = wf.nodes.findIndex(n => n.type === 'n8n-nodes-base.executeCommand');
    if (execNodeIdx >= 0) {
      console.log(`Found Execute Command node at index ${execNodeIdx}`);
      console.log(`Current command: ${wf.nodes[execNodeIdx].parameters?.command?.substring(0, 100)}...`);

      // Replace with HTTP Request node to ping Supabase
      const execNode = wf.nodes[execNodeIdx];
      wf.nodes[execNodeIdx] = {
        id: execNode.id,
        name: 'HTTP Ping Supabase',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: execNode.position,
        parameters: {
          method: 'GET',
          url: 'https://usibnysqelovfuctmkqw.supabase.co/rest/v1/',
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth',
          options: {
            timeout: 10000
          }
        },
        credentials: {
          httpHeaderAuth: {
            id: 'LwQGAUNNw2jGxShz',
            name: 'Supabase anon key'
          }
        }
      };

      // Clean up workflow for API
      const cleanWf = {
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings
      };

      console.log(`\nUpdating workflow...`);
      const updateUrl = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfId}`;
      const result = curlJson(updateUrl, {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      }, 'PUT', cleanWf);

      if (result?.id) {
        console.log('Updated successfully!');

        // Reactivate
        console.log('Reactivating...');
        const activateResult = curlJson(`${updateUrl}/activate`, { 'X-N8N-API-KEY': n8nApiKey }, 'POST');
        console.log('Active:', activateResult?.active);
      } else {
        console.log('Update failed:', JSON.stringify(result).substring(0, 200));
      }
    } else {
      console.log('No Execute Command node found - checking for HTTP Request nodes');
      for (const node of wf.nodes) {
        if (node.type === 'n8n-nodes-base.httpRequest') {
          console.log(`HTTP node: ${node.name} -> ${node.parameters?.url}`);
        }
      }
    }
    return;
  }

  console.log(`
Usage:
  node fix-n8n-workflows.js disable <workflow_id>     - Disable a workflow
  node fix-n8n-workflows.js show <workflow_id>        - Show workflow structure
  node fix-n8n-workflows.js fix-health-check          - Fix System Health Check workflow
`);
}

main().catch(console.error);
