#!/usr/bin/env node
/**
 * Find workflows with broken creds that might be fixable via API
 * (i.e., using HTTP nodes with inline auth rather than n8n credential references)
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

const CONFIG = {
  SUPABASE_HOST: 'usibnysqelovfuctmkqw.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s',
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

  // Load the analysis results
  const analysis = JSON.parse(fs.readFileSync('/tmp/inactive-workflow-analysis.json', 'utf8'));
  const brokenWorkflows = analysis.categories.hasBrokenCreds;

  console.log(`\nAnalyzing ${brokenWorkflows.length} workflows with broken credentials...\n`);

  const fixable = [];
  const notFixable = [];

  // Check first 20 for patterns
  for (const wf of brokenWorkflows.slice(0, 30)) {
    const fullWf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!fullWf) continue;

    // Check if it uses supabaseApi credential in a way we can replace
    // Look for Supabase nodes that might be convertible to HTTP Request
    let hasSupabaseNode = false;
    let hasSupabaseHttpAlternative = false;

    for (const node of (fullWf.nodes || [])) {
      if (node.type === 'n8n-nodes-base.supabase') {
        hasSupabaseNode = true;
      }
      // Check if there's already an HTTP node hitting Supabase
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const url = node.parameters?.url || '';
        if (url.includes('supabase.co')) {
          hasSupabaseHttpAlternative = true;
        }
      }
    }

    // Determine if potentially fixable
    const brokenCreds = wf.creds.filter(c => ['supabaseApi', 'gmailOAuth2', 'postgres', 'googleSheetsOAuth2Api'].includes(c));

    // If ONLY broken cred is supabaseApi and it's used in a simple way, might be fixable
    if (brokenCreds.length === 1 && brokenCreds[0] === 'supabaseApi') {
      // Check node count and complexity
      const nodeCount = fullWf.nodes?.length || 0;
      if (nodeCount <= 5) {
        fixable.push({ ...wf, nodeCount, hasSupabaseNode, hasSupabaseHttpAlternative });
      } else {
        notFixable.push({ ...wf, nodeCount, reason: 'Complex workflow, needs UI fix' });
      }
    } else {
      notFixable.push({ ...wf, reason: `Multiple/OAuth broken creds: ${brokenCreds.join(', ')}` });
    }
  }

  console.log('='.repeat(60));
  console.log('POTENTIALLY FIXABLE VIA API');
  console.log('='.repeat(60));
  console.log(`Found ${fixable.length} simple workflows with only supabaseApi broken\n`);

  for (const wf of fixable.slice(0, 10)) {
    console.log(`${wf.name}`);
    console.log(`  ID: ${wf.id}, Nodes: ${wf.nodeCount}`);
    console.log(`  Fix: Replace Supabase node with HTTP Request + inline auth`);
    console.log('');
  }

  console.log('\n' + '='.repeat(60));
  console.log('NOT FIXABLE VIA API (Need UI)');
  console.log('='.repeat(60));
  console.log(`${notFixable.length} workflows need UI credential fixes\n`);

  // Group by reason
  const byReason = {};
  for (const wf of notFixable) {
    const r = wf.reason;
    if (!byReason[r]) byReason[r] = 0;
    byReason[r]++;
  }
  for (const [reason, count] of Object.entries(byReason)) {
    console.log(`${count} workflows: ${reason}`);
  }
}

main().catch(console.error);
