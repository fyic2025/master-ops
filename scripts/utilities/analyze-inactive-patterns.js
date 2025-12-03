#!/usr/bin/env node
/**
 * Analyze inactive n8n workflows for credential patterns
 * Goal: Identify which inactive workflows would work if activated vs need fixes
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

// Credential types that are KNOWN to be broken (from audit)
const BROKEN_CREDS = ['gmailOAuth2', 'googleSheetsOAuth2Api', 'supabaseApi', 'postgres'];

// Credential types that should be working
const WORKING_CREDS = ['httpHeaderAuth', 'httpBasicAuth', 'httpQueryAuth', 'aws', 'unleashedSoftwareApi'];

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
  try {
    const result = execSync(`curl -sk "${url}" ${headerArgs}`, { encoding: 'utf8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
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
    const result = curlJson(url, { 'X-N8N-API-KEY': apiKey });
    if (result?.data) {
      allWorkflows.push(...result.data);
      cursor = result.nextCursor;
    } else break;
  } while (cursor);
  return allWorkflows;
}

async function main() {
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log('Fetching all workflows...');
  const allWorkflows = await getAllWorkflows(n8nApiKey);
  console.log(`Total: ${allWorkflows.length} workflows\n`);

  // Filter to inactive only
  const inactive = allWorkflows.filter(w => !w.active);
  console.log(`Inactive: ${inactive.length} workflows\n`);

  // Categorize by credential patterns
  const categories = {
    noCreds: [],           // No credentials needed - should be clean
    onlyWorkingCreds: [],  // Only uses working credential types
    hasBrokenCreds: [],    // Has at least one broken credential type
    mixedCreds: [],        // Has both working and broken
    unknownCreds: []       // Has credentials we haven't categorized
  };

  const credUsage = {};    // Count of each credential type
  const brokenByType = {}; // Workflows broken by each credential type

  for (const wf of inactive) {
    // Get full workflow to see credentials
    const fullWf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`, { 'X-N8N-API-KEY': n8nApiKey });

    // Extract credential types from nodes
    const credTypes = new Set();
    for (const node of (fullWf?.nodes || [])) {
      if (node.credentials) {
        for (const credType of Object.keys(node.credentials)) {
          credTypes.add(credType);
          credUsage[credType] = (credUsage[credType] || 0) + 1;
        }
      }
    }

    const creds = Array.from(credTypes);
    const hasBroken = creds.some(c => BROKEN_CREDS.includes(c));
    const hasWorking = creds.some(c => WORKING_CREDS.includes(c));
    const hasUnknown = creds.some(c => !BROKEN_CREDS.includes(c) && !WORKING_CREDS.includes(c));

    const entry = { id: wf.id, name: wf.name, creds, updatedAt: wf.updatedAt?.substring(0, 10) };

    if (creds.length === 0) {
      categories.noCreds.push(entry);
    } else if (hasBroken) {
      categories.hasBrokenCreds.push(entry);
      // Track which broken creds affect which workflows
      for (const c of creds.filter(c => BROKEN_CREDS.includes(c))) {
        if (!brokenByType[c]) brokenByType[c] = [];
        brokenByType[c].push(entry);
      }
    } else if (hasUnknown) {
      categories.unknownCreds.push(entry);
    } else {
      categories.onlyWorkingCreds.push(entry);
    }
  }

  // Report
  console.log('=' .repeat(70));
  console.log('INACTIVE WORKFLOW ANALYSIS');
  console.log('='.repeat(70));

  console.log(`\n✅ NO CREDENTIALS NEEDED (${categories.noCreds.length}) - Ready to activate`);
  if (categories.noCreds.length <= 20) {
    categories.noCreds.forEach(w => console.log(`   - ${w.name}`));
  } else {
    console.log(`   (showing first 10)`);
    categories.noCreds.slice(0, 10).forEach(w => console.log(`   - ${w.name}`));
  }

  console.log(`\n✅ ONLY WORKING CREDS (${categories.onlyWorkingCreds.length}) - Should work if activated`);
  if (categories.onlyWorkingCreds.length <= 20) {
    categories.onlyWorkingCreds.forEach(w => console.log(`   - ${w.name} [${w.creds.join(', ')}]`));
  } else {
    console.log(`   (showing first 10)`);
    categories.onlyWorkingCreds.slice(0, 10).forEach(w => console.log(`   - ${w.name} [${w.creds.join(', ')}]`));
  }

  console.log(`\n❌ HAS BROKEN CREDS (${categories.hasBrokenCreds.length}) - Would fail if activated`);
  console.log('\n   Breakdown by broken credential type:');
  for (const [credType, workflows] of Object.entries(brokenByType)) {
    console.log(`   ${credType}: ${workflows.length} workflows`);
  }

  console.log(`\n⚠️ UNKNOWN CREDS (${categories.unknownCreds.length}) - Need to verify`);
  categories.unknownCreds.slice(0, 10).forEach(w => console.log(`   - ${w.name} [${w.creds.join(', ')}]`));

  console.log('\n' + '='.repeat(70));
  console.log('CREDENTIAL USAGE ACROSS ALL INACTIVE');
  console.log('='.repeat(70));
  const sortedCreds = Object.entries(credUsage).sort((a, b) => b[1] - a[1]);
  for (const [cred, count] of sortedCreds) {
    const status = BROKEN_CREDS.includes(cred) ? '❌' : WORKING_CREDS.includes(cred) ? '✅' : '⚠️';
    console.log(`${status} ${cred}: ${count} workflows`);
  }

  // Save detailed results
  const outputFile = '/tmp/inactive-workflow-analysis.json';
  fs.writeFileSync(outputFile, JSON.stringify({ categories, credUsage, brokenByType }, null, 2));
  console.log(`\nDetailed results saved to: ${outputFile}`);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  const clean = categories.noCreds.length + categories.onlyWorkingCreds.length;
  const needsFix = categories.hasBrokenCreds.length;
  const unknown = categories.unknownCreds.length;
  console.log(`Clean (ready to use): ${clean}`);
  console.log(`Needs credential fix: ${needsFix}`);
  console.log(`Unknown (verify): ${unknown}`);
  console.log(`Total inactive: ${inactive.length}`);
}

main().catch(console.error);
