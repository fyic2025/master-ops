#!/usr/bin/env node
/**
 * Find duplicate/similar workflows that could be consolidated
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

// Normalize name for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[🗄️🗑️✅🎯📦🏋️📊🔍🚀🧪🏁]/g, '')
    .replace(/archived/gi, '')
    .replace(/fixed/gi, '')
    .replace(/working/gi, '')
    .replace(/test/gi, '')
    .replace(/copy/gi, '')
    .replace(/v\d+/gi, '')
    .replace(/\d+/g, '')
    .replace(/[^a-z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract core purpose from name
function extractPurpose(name) {
  const purposes = [];
  const lower = name.toLowerCase();

  if (lower.includes('smartlead') && lower.includes('supabase')) purposes.push('smartlead-to-supabase');
  else if (lower.includes('smartlead') && lower.includes('hubspot')) purposes.push('smartlead-to-hubspot');
  else if (lower.includes('smartlead')) purposes.push('smartlead');

  if (lower.includes('supabase') && lower.includes('hubspot')) purposes.push('supabase-to-hubspot');

  if (lower.includes('fitness') && (lower.includes('scraper') || lower.includes('lead'))) purposes.push('fitness-scraper');

  if (lower.includes('email') && lower.includes('stats')) purposes.push('email-stats');

  if (lower.includes('auspost')) purposes.push('auspost');

  if (lower.includes('unleashed')) purposes.push('unleashed');

  if (lower.includes('n8n') && (lower.includes('update') || lower.includes('backup'))) purposes.push('n8n-maintenance');

  if (lower.includes('teelixir') && lower.includes('partner')) purposes.push('teelixir-partner');

  if (lower.includes('hubspot') && lower.includes('test')) purposes.push('hubspot-test');

  return purposes.length > 0 ? purposes : ['other'];
}

async function main() {
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log('Fetching all workflows...\n');
  const workflowsResp = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows`, { 'X-N8N-API-KEY': n8nApiKey });
  const workflows = workflowsResp?.data || [];

  // Group by purpose
  const byPurpose = {};
  const allWorkflows = [];

  for (const wfSummary of workflows) {
    const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfSummary.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!wf) continue;

    const purposes = extractPurpose(wf.name);
    const normalized = normalizeName(wf.name);

    allWorkflows.push({
      id: wf.id,
      name: wf.name,
      normalized,
      purposes,
      active: wf.active,
      archived: wf.isArchived || wf.name.includes('ARCHIVED') || wf.name.includes('🗄️'),
      nodeCount: wf.nodes?.length || 0,
      createdAt: wf.createdAt
    });

    for (const purpose of purposes) {
      if (!byPurpose[purpose]) byPurpose[purpose] = [];
      byPurpose[purpose].push({
        id: wf.id,
        name: wf.name,
        active: wf.active,
        archived: wf.isArchived || wf.name.includes('ARCHIVED') || wf.name.includes('🗄️'),
        createdAt: wf.createdAt
      });
    }
  }

  // Find duplicate groups (same purpose, multiple workflows)
  console.log('='.repeat(80));
  console.log('DUPLICATE/SIMILAR WORKFLOW ANALYSIS');
  console.log('='.repeat(80));

  const duplicateGroups = Object.entries(byPurpose)
    .filter(([purpose, wfs]) => wfs.length > 1 && purpose !== 'other')
    .sort((a, b) => b[1].length - a[1].length);

  for (const [purpose, wfs] of duplicateGroups) {
    const activeCount = wfs.filter(w => w.active).length;
    const archivedCount = wfs.filter(w => w.archived).length;

    console.log(`\n## ${purpose.toUpperCase()} (${wfs.length} workflows)`);
    console.log(`   Active: ${activeCount} | Archived: ${archivedCount} | Inactive: ${wfs.length - activeCount - archivedCount}`);

    // Sort by created date
    const sorted = wfs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const wf of sorted) {
      const status = wf.active ? '✅ ACTIVE' : wf.archived ? '🗄️ ARCHIVED' : '⬜ INACTIVE';
      const date = wf.createdAt?.split('T')[0] || 'unknown';
      console.log(`   ${status} ${date} ${wf.id} ${wf.name.substring(0, 50)}`);
    }

    // Recommendation
    if (activeCount === 0) {
      console.log(`   ➡️  RECOMMEND: All inactive - review if any should be kept`);
    } else if (activeCount === 1 && wfs.length > 2) {
      console.log(`   ➡️  RECOMMEND: Delete ${wfs.length - 1} inactive copies, keep the active one`);
    } else if (activeCount > 1) {
      console.log(`   ⚠️  WARNING: Multiple active workflows doing same thing!`);
    }
  }

  // Summary
  const totalDuplicateGroups = duplicateGroups.length;
  const totalDuplicateWorkflows = duplicateGroups.reduce((a, [, wfs]) => a + wfs.length, 0);
  const archivableDuplicates = duplicateGroups.reduce((a, [, wfs]) => {
    const activeCount = wfs.filter(w => w.active).length;
    return a + (activeCount <= 1 ? wfs.length - 1 : 0);
  }, 0);

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nDuplicate groups found: ${totalDuplicateGroups}`);
  console.log(`Total workflows in duplicate groups: ${totalDuplicateWorkflows}`);
  console.log(`Workflows that could be safely deleted: ${archivableDuplicates}`);

  // List workflows safe to delete
  console.log('\n## SAFE TO DELETE (inactive duplicates where active version exists):');
  for (const [purpose, wfs] of duplicateGroups) {
    const activeCount = wfs.filter(w => w.active).length;
    if (activeCount === 1) {
      const inactive = wfs.filter(w => !w.active);
      for (const wf of inactive) {
        console.log(`   ${wf.id} - ${wf.name.substring(0, 55)}`);
      }
    }
  }
}

main().catch(console.error);
