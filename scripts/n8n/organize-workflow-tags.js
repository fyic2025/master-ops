#!/usr/bin/env node
/**
 * Organize workflows with business tags (with node cleaning)
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

// Clean node - keep only allowed fields
function cleanNode(node) {
  const allowedFields = ['id', 'name', 'type', 'typeVersion', 'position', 'parameters', 'credentials', 'disabled', 'continueOnFail', 'notes', 'alwaysOutputData', 'executeOnce', 'notesInFlow', 'retryOnFail', 'maxTries', 'waitBetweenTries', 'onError'];
  const cleaned = {};
  for (const field of allowedFields) {
    if (node[field] !== undefined) {
      cleaned[field] = node[field];
    }
  }
  return cleaned;
}

async function main() {
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  // Get existing tags
  console.log('\nFetching existing tags...');
  const tagsResp = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/tags`, { 'X-N8N-API-KEY': n8nApiKey });
  const tagIds = {};
  for (const tag of tagsResp?.data || []) {
    tagIds[tag.name.toLowerCase()] = tag.id;
  }

  console.log('Available tags:', Object.keys(tagIds).join(', '));

  // Fetch all workflows and apply tags
  console.log('\nFetching workflows...');
  const workflowsResp = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows`, { 'X-N8N-API-KEY': n8nApiKey });
  const workflows = workflowsResp?.data || [];
  console.log(`Found ${workflows.length} workflows\n`);

  let tagged = 0;
  let failed = 0;

  for (const wfSummary of workflows) {
    const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfSummary.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!wf) continue;

    const name = wf.name.toLowerCase();
    const tagsToApply = [];

    // Business detection
    if (name.includes('teelixir')) tagsToApply.push(tagIds['teelixir']);
    if (name.includes('boo') || name.includes('organics online') || name.includes('buy organics')) tagsToApply.push(tagIds['boo']);
    if (name.includes('rhf') || name.includes('red hill')) tagsToApply.push(tagIds['red hill fresh']);
    if (name.includes('elevate')) tagsToApply.push(tagIds['elevate']);
    if (name.includes('smartlead')) tagsToApply.push(tagIds['smartlead']);
    if (name.includes('hubspot')) tagsToApply.push(tagIds['hubspot']);
    if (name.includes('growthco')) tagsToApply.push(tagIds['growthco']);

    // Function detection
    if (name.includes('sync')) tagsToApply.push(tagIds['sync']);
    if (name.includes('monitor') || name.includes('health') || name.includes('check')) tagsToApply.push(tagIds['monitor']);
    if (name.includes('backup')) tagsToApply.push(tagIds['backup']);
    if (name.includes('api') || name.includes('webhook')) tagsToApply.push(tagIds['api']);
    if (name.includes('lead') || name.includes('fitness') || name.includes('scraper')) tagsToApply.push(tagIds['lead gen']);

    // Archive detection
    if (name.includes('archived') || name.includes('🗄️') || wf.isArchived) tagsToApply.push(tagIds['archive']);

    // Infrastructure
    if (name.includes('n8n') || name.includes('aws') || name.includes('util') || name.includes('unleashed') || name.includes('auspost') || name.includes('sendle')) {
      tagsToApply.push(tagIds['infrastructure']);
    }

    // Filter out nulls and duplicates
    const uniqueTags = [...new Set(tagsToApply.filter(t => t))];

    if (uniqueTags.length > 0) {
      // Clean all nodes
      const cleanedNodes = (wf.nodes || []).map(cleanNode);

      // Prepare update data with tags
      const updateData = {
        name: wf.name,
        nodes: cleanedNodes,
        connections: wf.connections,
        settings: wf.settings,
        tags: uniqueTags.map(id => ({ id }))
      };

      const result = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`, {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      }, 'PUT', updateData);

      if (result?.id) {
        const tagNames = Object.entries(tagIds).filter(([, id]) => uniqueTags.includes(id)).map(([name]) => name);
        console.log(`✅ ${wf.name.substring(0, 40).padEnd(40)} → [${tagNames.join(', ')}]`);
        tagged++;
      } else {
        console.log(`❌ ${wf.name.substring(0, 40).padEnd(40)} - update failed`);
        failed++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TAGGING COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Tagged: ${tagged}`);
  console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error);
