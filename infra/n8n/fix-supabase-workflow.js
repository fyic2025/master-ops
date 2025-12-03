#!/usr/bin/env node
/**
 * Fix a workflow by replacing Supabase node with HTTP Request node
 */

const { execSync } = require('child_process');
const crypto = require('crypto');

const CONFIG = {
  SUPABASE_HOST: 'usibnysqelovfuctmkqw.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk0NjIwNDgsImV4cCI6MjAzNTAzODA0OH0.BzM4Ld3dB1YDjPBzHGXaJaTrCrsfK7qXMqZ_E9XKQO8',
  ENCRYPTION_KEY: 'mstr-ops-vault-2024-secure-key',
  N8N_HOST: 'automation.growthcohq.com'
};

function decrypt(encryptedValue) {
  const buffer = Buffer.from(encryptedValue, 'base64');
  const iv = buffer.subarray(0, 16);
  const encrypted = buffer.subarray(16);
  const key = crypto.createHash('sha256').update(CONFIG.ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

function curlJson(url, headers = {}, method = 'GET', body = null) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : '';
  const cmd = `curl -sk -X ${method} "${url}" ${headerArgs} ${bodyArg}`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
    console.error('Curl error:', e.message?.substring(0, 200));
    return null;
  }
}

async function main() {
  const workflowId = process.argv[2];
  if (!workflowId) {
    console.log('Usage: node fix-supabase-workflow.js <workflow_id>');
    process.exit(1);
  }

  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log(`\nFetching workflow ${workflowId}...`);
  const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`, { 'X-N8N-API-KEY': n8nApiKey });

  if (!wf || !wf.nodes) {
    console.error('Could not fetch workflow');
    process.exit(1);
  }

  console.log(`Workflow: ${wf.name}`);
  console.log(`Nodes: ${wf.nodes.map(n => n.name).join(', ')}`);

  // Find Supabase node
  const supabaseNodeIdx = wf.nodes.findIndex(n => n.type === 'n8n-nodes-base.supabase');
  if (supabaseNodeIdx === -1) {
    console.log('No Supabase node found');
    process.exit(0);
  }

  const supabaseNode = wf.nodes[supabaseNodeIdx];
  console.log(`\nFound Supabase node: ${supabaseNode.name}`);
  console.log(`Operation: ${supabaseNode.parameters?.operation}`);
  console.log(`Table: ${supabaseNode.parameters?.tableId}`);

  // Build replacement HTTP Request node
  const table = supabaseNode.parameters?.tableId || 'unknown_table';
  const operation = supabaseNode.parameters?.operation || 'getAll';

  // Construct Supabase REST URL
  let url = `https://${CONFIG.SUPABASE_HOST}/rest/v1/${table}`;
  let method = 'GET';

  // Add query params based on operation
  if (operation === 'getAll') {
    // Get all records
    url += '?select=*';
    if (supabaseNode.parameters?.filterByOr) {
      // Has filters - need to parse
      console.log('Note: Complex filters - may need manual adjustment');
    }
  }

  const newNode = {
    id: supabaseNode.id,
    name: supabaseNode.name + ' (HTTP)',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: supabaseNode.position,
    parameters: {
      method: method,
      url: url,
      authentication: 'none',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: CONFIG.SUPABASE_SERVICE_KEY },
          { name: 'Authorization', value: `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}` }
        ]
      },
      options: {}
    }
  };

  console.log(`\nReplacing with HTTP Request node:`);
  console.log(`  URL: ${url}`);
  console.log(`  Method: ${method}`);
  console.log(`  Auth: Inline service key headers`);

  // Replace node
  wf.nodes[supabaseNodeIdx] = newNode;

  // Clean workflow for API
  const cleanWf = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  // Update workflow
  console.log('\nUpdating workflow...');
  const updateUrl = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${workflowId}`;
  const result = curlJson(updateUrl, {
    'X-N8N-API-KEY': n8nApiKey,
    'Content-Type': 'application/json'
  }, 'PUT', cleanWf);

  if (result?.id) {
    console.log('✅ Workflow updated successfully!');
    console.log(`\nNodes now: ${result.nodes.map(n => n.name).join(', ')}`);
  } else {
    console.log('❌ Update failed:', JSON.stringify(result)?.substring(0, 300));
  }
}

main().catch(console.error);
