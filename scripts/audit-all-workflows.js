#!/usr/bin/env node
/**
 * Audit ALL n8n workflows (including inactive) using curl
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

function curlJson(url, headers = {}) {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  const cmd = `curl -sk "${url}" ${headerArgs}`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
    console.error('Curl error:', e.message?.substring(0, 100));
    return null;
  }
}

async function getAllWorkflows(apiKey) {
  const allWorkflows = [];
  let cursor = null;

  do {
    const url = cursor
      ? `https://${CONFIG.N8N_HOST}/api/v1/workflows?limit=50&cursor=${cursor}`
      : `https://${CONFIG.N8N_HOST}/api/v1/workflows?limit=50`;

    console.log(`  Fetching: ${url.substring(0, 60)}...`);
    const result = curlJson(url, { 'X-N8N-API-KEY': apiKey });

    if (!result) {
      console.log('  No result from API');
      break;
    }

    if (result.data) {
      console.log(`  Got ${result.data.length} workflows`);
      allWorkflows.push(...result.data);
      cursor = result.nextCursor;
    } else {
      console.log('  No data in result:', JSON.stringify(result).substring(0, 100));
      break;
    }
  } while (cursor);

  return allWorkflows;
}

async function main() {
  // Get n8n API key from vault
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });

  if (!vaultData || !vaultData[0] || !vaultData[0].encrypted_value) {
    console.error('Failed to get API key from vault. Retrying...');
    // Retry once
    const vaultData2 = curlJson(vaultUrl, {
      'apikey': CONFIG.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
    });
    if (!vaultData2 || !vaultData2[0]) {
      console.error('Vault access failed');
      process.exit(1);
    }
    var n8nApiKey = decrypt(vaultData2[0].encrypted_value);
  } else {
    var n8nApiKey = decrypt(vaultData[0].encrypted_value);
  }
  console.log(`Got API key: ${n8nApiKey.substring(0, 10)}...`);

  // Get all workflows
  console.log('\nFetching all workflows...');
  const allWorkflows = await getAllWorkflows(n8nApiKey);
  console.log(`Total workflows: ${allWorkflows.length}`);

  // Sort by updatedAt descending (most recent first)
  allWorkflows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Parse arguments
  const batch = parseInt(process.argv[2]) || 1;
  const batchSize = 20;
  const start = (batch - 1) * batchSize;
  const end = Math.min(start + batchSize, allWorkflows.length);
  const workflowsToCheck = allWorkflows.slice(start, end);

  if (workflowsToCheck.length === 0) {
    console.log('No more workflows in this batch');
    process.exit(0);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Batch ${batch}: Workflows ${start + 1}-${end} of ${allWorkflows.length}`);
  console.log('='.repeat(70));

  const results = { working: [], fixed: [], needsUIFix: [], inactive: [] };

  for (const wf of workflowsToCheck) {
    console.log(`\n📋 ${wf.name}`);
    console.log(`   ID: ${wf.id} | Active: ${wf.active}`);
    console.log(`   Updated: ${wf.updatedAt?.substring(0, 10)}`);

    // Get full workflow details
    const wfUrl = `https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`;
    const fullWf = curlJson(wfUrl, { 'X-N8N-API-KEY': n8nApiKey });

    // Get credentials used
    const credTypes = new Set();
    for (const node of (fullWf?.nodes || [])) {
      if (node.credentials) {
        for (const credName of Object.keys(node.credentials)) {
          credTypes.add(credName);
        }
      }
    }
    if (credTypes.size > 0) {
      console.log(`   Credentials: ${Array.from(credTypes).join(', ')}`);
    }

    if (!wf.active) {
      console.log(`   ⏸️ Inactive`);
      results.inactive.push({ id: wf.id, name: wf.name, credentials: Array.from(credTypes) });
      continue;
    }

    // Get recent error executions
    const execUrl = `https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${wf.id}&limit=5&status=error`;
    const executions = curlJson(execUrl, { 'X-N8N-API-KEY': n8nApiKey });
    const errorCount = executions?.data?.length || 0;

    if (errorCount > 0) {
      console.log(`   ❌ Recent errors: ${errorCount}`);

      // Get error details
      const errorExecUrl = `https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${wf.id}&limit=1&status=error&includeData=true`;
      const errorExec = curlJson(errorExecUrl, { 'X-N8N-API-KEY': n8nApiKey });

      if (errorExec?.data?.[0]?.data?.resultData?.error) {
        const errorMsg = errorExec.data[0].data.resultData.error.message || 'Unknown';
        console.log(`   Error: ${errorMsg.substring(0, 80)}...`);
      }

      // Check if it's a credential issue that needs UI
      const credIssue = Array.from(credTypes).some(c =>
        ['gmailOAuth2', 'googleSheetsOAuth2Api', 'supabaseApi', 'postgres'].includes(c)
      );

      if (credIssue) {
        results.needsUIFix.push({ id: wf.id, name: wf.name, credentials: Array.from(credTypes), errorCount });
      } else {
        results.needsUIFix.push({ id: wf.id, name: wf.name, credentials: Array.from(credTypes), errorCount });
      }
    } else {
      // Check for recent successful runs
      const successUrl = `https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${wf.id}&limit=1`;
      const successExec = curlJson(successUrl, { 'X-N8N-API-KEY': n8nApiKey });
      const lastRun = successExec?.data?.[0]?.startedAt?.substring(0, 19) || 'never';
      console.log(`   ✅ No errors. Last run: ${lastRun}`);
      results.working.push({ id: wf.id, name: wf.name, lastRun });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('BATCH SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Working: ${results.working.length}`);
  console.log(`🔧 Fixed: ${results.fixed.length}`);
  console.log(`❌ Needs UI Fix: ${results.needsUIFix.length}`);
  console.log(`⏸️ Inactive: ${results.inactive.length}`);

  if (results.needsUIFix.length > 0) {
    console.log('\nWorkflows needing UI fix:');
    for (const r of results.needsUIFix) {
      console.log(`  - ${r.name} (${r.credentials.join(', ')})`);
    }
  }

  if (end < allWorkflows.length) {
    console.log(`\nNext: node scripts/audit-all-workflows.js ${batch + 1}`);
  } else {
    console.log('\n✅ All workflows audited!');
  }

  // Output JSON summary
  const summaryFile = `/tmp/n8n-audit-batch-${batch}.json`;
  require('fs').writeFileSync(summaryFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${summaryFile}`);
}

main().catch(console.error);
