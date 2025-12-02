#!/usr/bin/env node
/**
 * Comprehensive workflow analysis - status, errors, fly.io, organization
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
    console.error('Curl error for', url);
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
  if (!vaultData?.[0]) {
    console.error('Failed to get API key');
    return;
  }
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log('Fetching all workflows...');
  const workflowsResp = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows`, { 'X-N8N-API-KEY': n8nApiKey });
  const workflows = workflowsResp?.data || [];
  console.log(`Found ${workflows.length} workflows\n`);

  const analysis = {
    total: workflows.length,
    active: 0,
    inactive: 0,
    archived: 0,
    flyio: [],
    markedRemove: [],
    markedTest: [],
    brokenCreds: {},
    businessTags: { teelixir: [], boo: [], rhf: [], elevate: [], growthco: [], smartlead: [], hubspot: [], general: [] },
    bugFree: [],
    hasIssues: []
  };

  // Analyze each workflow
  for (const wfSummary of workflows) {
    const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfSummary.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!wf) continue;

    const name = wf.name.toLowerCase();
    const nameOrig = wf.name;
    const wfJson = JSON.stringify(wf);

    // Active/Inactive
    if (wf.active) analysis.active++;
    else analysis.inactive++;

    // Check archived status
    if (wf.isArchived) analysis.archived++;

    // Check for remove/test markers
    if (name.includes('remove') || name.includes('🗑️')) {
      analysis.markedRemove.push({ id: wf.id, name: nameOrig, active: wf.active });
    }
    if (name.includes('test') && !name.includes('latest')) {
      analysis.markedTest.push({ id: wf.id, name: nameOrig, active: wf.active });
    }

    // Check for fly.io references
    if (wfJson.includes('fly.io') || wfJson.includes('fly.dev') || wfJson.includes('.fly.') || name.includes('fly')) {
      analysis.flyio.push({ id: wf.id, name: nameOrig, active: wf.active });
    }

    // Business categorization
    if (name.includes('teelixir')) analysis.businessTags.teelixir.push({ id: wf.id, name: nameOrig });
    else if (name.includes('boo') || name.includes('organics online')) analysis.businessTags.boo.push({ id: wf.id, name: nameOrig });
    else if (name.includes('rhf') || name.includes('red hill')) analysis.businessTags.rhf.push({ id: wf.id, name: nameOrig });
    else if (name.includes('elevate')) analysis.businessTags.elevate.push({ id: wf.id, name: nameOrig });
    else if (name.includes('smartlead')) analysis.businessTags.smartlead.push({ id: wf.id, name: nameOrig });
    else if (name.includes('hubspot')) analysis.businessTags.hubspot.push({ id: wf.id, name: nameOrig });
    else if (name.includes('growthco')) analysis.businessTags.growthco.push({ id: wf.id, name: nameOrig });
    else analysis.businessTags.general.push({ id: wf.id, name: nameOrig });

    // Check for broken credentials
    let hasBrokenCreds = false;
    for (const node of wf.nodes || []) {
      if (node.credentials) {
        for (const credType of Object.keys(node.credentials)) {
          if (['supabaseApi', 'gmailOAuth2', 'postgres', 'googleSheetsOAuth2Api', 'googleDriveOAuth2Api', 'googleApi'].includes(credType)) {
            if (!analysis.brokenCreds[credType]) analysis.brokenCreds[credType] = [];
            analysis.brokenCreds[credType].push({ id: wf.id, name: nameOrig });
            hasBrokenCreds = true;
          }
        }
      }
    }

    // Categorize as bug-free or has issues
    if (!hasBrokenCreds && !wf.isArchived && !name.includes('remove') && !name.includes('🗑️')) {
      analysis.bugFree.push({ id: wf.id, name: nameOrig, active: wf.active });
    } else {
      analysis.hasIssues.push({ id: wf.id, name: nameOrig, reason: hasBrokenCreds ? 'broken_creds' : 'marked_for_cleanup' });
    }
  }

  // Get recent executions to analyze error patterns
  console.log('Fetching recent executions for error analysis...');
  const execResp = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions?limit=200`, { 'X-N8N-API-KEY': n8nApiKey });
  const executions = execResp?.data || [];

  const errorPatterns = {};
  const workflowErrors = {};

  for (const exec of executions) {
    if (exec.status === 'error') {
      const detail = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/executions/${exec.id}?includeData=true`, { 'X-N8N-API-KEY': n8nApiKey });
      const errMsg = detail?.data?.resultData?.error?.message || 'Unknown';

      // Categorize error
      let category = 'other';
      if (errMsg.includes('disallowed')) category = 'module_disallowed';
      else if (errMsg.includes('type') || errMsg.includes('string but was expecting')) category = 'type_mismatch';
      else if (errMsg.includes('row_number')) category = 'sheets_row_number';
      else if (errMsg.includes('cannot be executed')) category = 'workflow_issues';
      else if (errMsg.includes('Authorization') || errMsg.includes('credential')) category = 'auth_error';
      else if (errMsg.includes('is not a function')) category = 'code_error';
      else if (errMsg.includes('Command failed')) category = 'command_failed';
      else if (errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT')) category = 'network_error';

      if (!errorPatterns[category]) errorPatterns[category] = [];
      errorPatterns[category].push({ workflowId: exec.workflowId, message: errMsg.substring(0, 100) });

      if (!workflowErrors[exec.workflowId]) workflowErrors[exec.workflowId] = 0;
      workflowErrors[exec.workflowId]++;
    }
  }

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE WORKFLOW ANALYSIS');
  console.log('='.repeat(80));

  console.log('\n## OVERALL STATUS');
  console.log(`Total workflows: ${analysis.total}`);
  console.log(`Active: ${analysis.active}`);
  console.log(`Inactive: ${analysis.inactive}`);
  console.log(`Archived (via API flag): ${analysis.archived}`);
  console.log(`Bug-free (no broken creds, not archived): ${analysis.bugFree.length}`);
  console.log(`Has issues: ${analysis.hasIssues.length}`);

  console.log('\n## CLEANUP CANDIDATES');
  console.log(`\n### Marked for removal (${analysis.markedRemove.length}):`);
  for (const wf of analysis.markedRemove) {
    console.log(`  ${wf.active ? '✅' : '⬜'} ${wf.id} - ${wf.name.substring(0, 60)}`);
  }

  console.log(`\n### Test workflows (${analysis.markedTest.length}):`);
  for (const wf of analysis.markedTest.slice(0, 10)) {
    console.log(`  ${wf.active ? '✅' : '⬜'} ${wf.id} - ${wf.name.substring(0, 60)}`);
  }
  if (analysis.markedTest.length > 10) console.log(`  ... and ${analysis.markedTest.length - 10} more`);

  console.log(`\n### Fly.io references (${analysis.flyio.length}):`);
  for (const wf of analysis.flyio) {
    console.log(`  ${wf.active ? '✅' : '⬜'} ${wf.id} - ${wf.name.substring(0, 60)}`);
  }

  console.log('\n## BROKEN CREDENTIALS');
  for (const [cred, wfs] of Object.entries(analysis.brokenCreds)) {
    const uniqueWfs = [...new Set(wfs.map(w => w.id))];
    console.log(`${cred}: ${uniqueWfs.length} unique workflows`);
  }

  console.log('\n## ERROR PATTERNS (from last 200 executions)');
  for (const [pattern, errors] of Object.entries(errorPatterns).sort((a, b) => b[1].length - a[1].length)) {
    const uniqueWfs = [...new Set(errors.map(e => e.workflowId))];
    console.log(`\n${pattern}: ${errors.length} occurrences across ${uniqueWfs.length} workflows`);
    console.log(`  Example: ${errors[0]?.message}`);
  }

  // Repeat offenders
  const repeatOffenders = Object.entries(workflowErrors).filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1]);
  if (repeatOffenders.length > 0) {
    console.log('\n## REPEAT FAILURE WORKFLOWS (3+ errors in last 200 executions)');
    for (const [wfId, count] of repeatOffenders.slice(0, 10)) {
      console.log(`  ${wfId}: ${count} errors`);
    }
  }

  console.log('\n## BUSINESS CATEGORIZATION');
  for (const [biz, wfs] of Object.entries(analysis.businessTags)) {
    if (wfs.length > 0) {
      console.log(`${biz.toUpperCase()}: ${wfs.length}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log(`\n✅ BUG-FREE WORKFLOWS: ${analysis.bugFree.length}/${analysis.total} (${Math.round(analysis.bugFree.length/analysis.total*100)}%)`);
  console.log(`❌ NEEDS ATTENTION: ${analysis.hasIssues.length}/${analysis.total} (${Math.round(analysis.hasIssues.length/analysis.total*100)}%)`);
  console.log(`\n1. IMMEDIATE CLEANUP: ${analysis.markedRemove.length} workflows marked for removal`);
  console.log(`2. FLY.IO CLEANUP: ${analysis.flyio.length} workflows reference old hosting`);
  console.log(`3. TEST CLEANUP: ${analysis.markedTest.length} test workflows to review`);
  console.log(`4. CREDENTIAL FIXES: ${Object.keys(analysis.brokenCreds).length} credential types need UI fixes`);
}

main().catch(console.error);
