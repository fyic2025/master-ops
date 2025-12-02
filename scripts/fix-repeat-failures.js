#!/usr/bin/env node
/**
 * Investigate and fix repeat failure workflows
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

const REPEAT_FAILURES = [
  { id: 'QrVthn0iaHLOXpYW', errors: 47, issue: 'workflow_issues' },
  { id: 'lj35rsDvrz5LK9Ox', errors: 17, issue: 'sheets_row_number' },
  { id: 'jTl7OVli2gTLGSqH', errors: 12, issue: 'type_mismatch' },
  { id: 'CdENdCkCmSQpnbDG', errors: 9, issue: 'module_disallowed' }
];

async function main() {
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  for (const failure of REPEAT_FAILURES) {
    console.log('\n' + '='.repeat(70));
    console.log(`WORKFLOW: ${failure.id}`);
    console.log(`Errors: ${failure.errors} | Issue type: ${failure.issue}`);
    console.log('='.repeat(70));

    const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${failure.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!wf) {
      console.log('❌ Could not fetch workflow');
      continue;
    }

    console.log(`Name: ${wf.name}`);
    console.log(`Active: ${wf.active}`);
    console.log(`Archived: ${wf.isArchived}`);
    console.log(`Nodes: ${wf.nodes?.map(n => n.name).join(', ')}`);

    // Check for specific issues
    if (failure.issue === 'workflow_issues') {
      console.log('\n📋 Checking for validation issues...');
      // Look for missing connections or broken references
      for (const node of wf.nodes || []) {
        if (node.credentials) {
          for (const [credType, credRef] of Object.entries(node.credentials)) {
            console.log(`  Node "${node.name}" uses credential: ${credType} (${credRef.name || credRef.id})`);
          }
        }
      }
    }

    if (failure.issue === 'module_disallowed') {
      console.log('\n📋 Checking for Code nodes using disallowed modules...');
      for (const node of wf.nodes || []) {
        if (node.type === 'n8n-nodes-base.code') {
          const code = node.parameters?.jsCode || '';
          if (code.includes('require(')) {
            const matches = code.match(/require\(['"]([^'"]+)['"]\)/g);
            console.log(`  Node "${node.name}" requires: ${matches?.join(', ') || 'none'}`);
          }
        }
      }
    }

    // Recommendation
    console.log('\n🔧 RECOMMENDATION:');
    if (!wf.active) {
      console.log('  Workflow is already INACTIVE - no action needed');
    } else if (failure.issue === 'workflow_issues') {
      console.log('  ⚠️ DEACTIVATE - workflow has structural issues');
    } else if (failure.issue === 'module_disallowed') {
      console.log('  ⚠️ DEACTIVATE - uses disallowed Node.js modules');
    } else {
      console.log('  ⚠️ Needs manual review - check node configuration');
    }
  }
}

main().catch(console.error);
