#!/usr/bin/env node
/**
 * Deactivate broken workflows via API
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

// Workflows to deactivate
const TO_DEACTIVATE = [
  { id: 'QrVthn0iaHLOXpYW', reason: 'Structural issues - 47 errors' },
  { id: 'jTl7OVli2gTLGSqH', reason: 'Type mismatch - 12 errors' },
  { id: 'CdENdCkCmSQpnbDG', reason: 'Uses disallowed crypto module - 9 errors' }
];

// Workflows to archive/clean up
const TO_ARCHIVE = [
  { id: 'IOnXXvj9SJVaB3MS', reason: 'References fly.io (old hosting)' },
  { id: '0NS3j17aBF3W8NKt', reason: 'Marked for removal' },
  { id: '0XKG66I0NljmDS0L', reason: 'Marked for removal' },
  { id: '0a927chGOXIwiv8e', reason: 'Marked for removal' },
  { id: '4eb2cflSsbZaYlHf', reason: 'Marked for removal (DELETE ALL)' }
];

async function main() {
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log('\n## DEACTIVATING BROKEN WORKFLOWS');
  console.log('='.repeat(60));

  for (const wf of TO_DEACTIVATE) {
    console.log(`\n${wf.id}: ${wf.reason}`);

    // Get current workflow
    const current = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!current) {
      console.log('  ❌ Could not fetch');
      continue;
    }
    console.log(`  Name: ${current.name}`);
    console.log(`  Currently active: ${current.active}`);

    if (!current.active) {
      console.log('  ✅ Already inactive');
      continue;
    }

    // Deactivate
    const result = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}/deactivate`, {
      'X-N8N-API-KEY': n8nApiKey,
      'Content-Type': 'application/json'
    }, 'POST');

    if (result?.active === false) {
      console.log('  ✅ Deactivated!');
    } else {
      console.log('  ❌ Failed to deactivate');
    }
  }

  console.log('\n\n## ARCHIVING CLEANUP CANDIDATES');
  console.log('='.repeat(60));

  for (const wf of TO_ARCHIVE) {
    console.log(`\n${wf.id}: ${wf.reason}`);

    const current = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!current) {
      console.log('  ❌ Could not fetch');
      continue;
    }
    console.log(`  Name: ${current.name}`);

    // First deactivate if active
    if (current.active) {
      const deact = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}/deactivate`, {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      }, 'POST');
      if (deact?.active === false) {
        console.log('  ✅ Deactivated');
      }
    }

    // Rename to mark as archived if not already
    if (!current.name.includes('🗄️') && !current.name.includes('ARCHIVED')) {
      const newName = `🗄️ ARCHIVED - ${current.name}`;
      const updateData = {
        name: newName,
        nodes: current.nodes,
        connections: current.connections,
        settings: current.settings
      };

      const result = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wf.id}`, {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      }, 'PUT', updateData);

      if (result?.id) {
        console.log(`  ✅ Renamed to: ${newName.substring(0, 50)}...`);
      } else {
        console.log('  ⚠️ Could not rename (may have extra fields)');
      }
    } else {
      console.log('  ✅ Already marked as archived');
    }
  }

  console.log('\n\nDone!');
}

main().catch(console.error);
