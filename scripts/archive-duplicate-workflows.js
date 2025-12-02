#!/usr/bin/env node
/**
 * Archive duplicate/abandoned workflows
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
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

function curlJson(url, headers = {}, method = 'GET') {
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try {
    const result = execSync(`curl -sk -X ${method} "${url}" ${headerArgs}`, { encoding: 'utf8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

// Workflows to archive (inactive duplicates)
const TO_ARCHIVE = [
  // Smartlead (already archived, just verify)
  'FmqMEt44gq7STuqs', '61SCLKlEscAoq6ih', 'HU9S2stFu5W5FH6b', '6071PPJfbsIKWj0G',
  '4h9iLzVnnPoJdG88', '9ZWjjZy74Ds6v24A', '7XgwBh5drEDnl9Ed', '19VuddifZjYeuS1V',
  '0NS3j17aBF3W8NKt', 'C1ZEjrnPZMzazFRW', '0lPDxhrUvElgja58', 'Dwr03KxKZys6o2UC', 'CUNAORiC922FHn2j',

  // Fitness Scraper (keep none - all abandoned)
  'G96rfrqfe6KY7AX4', '4EG3NJdcgwyhq4Q8', 'B9o6SMesTHCUZr6Z', 'EHkKrApUNOdup1x1',
  '0CbJE3BmvFoZR60V', '06NyzDPQnyLqdr9a', 'CdE3wIj8rfax3qXY',

  // Smartlead-to-Supabase (already archived)
  '9Ncp0cJlupRdHcnk', '93Q6Fs75NIKFPVzt', 'Et0HY9cSSEyrX4p7', '8ogEr6UQVxTuJRns',
  'BntyH4rSTw2PhfAA', '5GMpSOxiHZTz9pOR', 'F5xO0sR3WsxSeDki', '2IDAHf0RhsHjuGCb',

  // n8n Maintenance (keep CdENdCkCmSQpnbDG - backup, archive rest)
  'IOnXXvj9SJVaB3MS', 'FcThQgkbOiFNejrq', 'AGIn58GXv4QHfBR9', 'EiLv5sBjHQPpgCeu',
  '3vo3qPvqo4EBeJnT', 'CbY4BSAxGfVuGcdX',

  // Supabase-to-HubSpot (keep 2Et6W0gFCq4xijec - newest/most complete)
  '34mwUAzIzd0vWcK6', '3l0UHck8TiiPWRPc', 'C5Lvd9Hnq1XzDPVE', 'AC7rYC61hVf2jEAI',

  // AusPost (all abandoned attempts)
  'HQiDgHEgEzCDexyq', 'IQUgJ3eYGSdgHPMV', 'DhT4CX6sDB0fT0fu', 'CAxqPiIHE5nMxLoX', '3MEzAEbdYsYGFEng',

  // Email Stats (all attempts)
  'IDsUmn8JUgU8HhYa', '3iY7m2GWanuvduti', '08JUp2FtKWxXmmqI', 'HsKXuzxCtldUY1VX',

  // Unleashed (keep BNAmsM2UrdXW1A1U - order sync, archive rest)
  '7gYjh5mzBRbJsgFF', '9MDBan6geLlmPm4h',

  // HubSpot Test
  'IKMBOOqDAdBQyclu', '4AMjp4gMK6SStSfp'
];

async function main() {
  console.log('Getting n8n API key...');
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  let vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  if (!vaultData?.[0]) {
    await new Promise(r => setTimeout(r, 2000));
    vaultData = curlJson(vaultUrl, {
      'apikey': CONFIG.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
    });
  }
  if (!vaultData?.[0]) {
    console.error('Failed to get API key');
    return;
  }
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  console.log(`\nProcessing ${TO_ARCHIVE.length} workflows...\n`);

  let archived = 0;
  let alreadyArchived = 0;
  let deactivated = 0;

  for (const wfId of TO_ARCHIVE) {
    const wf = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfId}`, { 'X-N8N-API-KEY': n8nApiKey });
    if (!wf) {
      console.log(`⚠️ ${wfId} - Not found`);
      continue;
    }

    const name = wf.name;
    const isArchived = wf.isArchived || name.includes('🗄️') || name.includes('ARCHIVED');

    // Deactivate if active
    if (wf.active) {
      const result = curlJson(`https://${CONFIG.N8N_HOST}/api/v1/workflows/${wfId}/deactivate`, {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json'
      }, 'POST');
      if (result?.active === false) {
        console.log(`🔴 Deactivated: ${name.substring(0, 50)}`);
        deactivated++;
      }
    }

    if (isArchived) {
      console.log(`✓ Already archived: ${name.substring(0, 50)}`);
      alreadyArchived++;
    } else {
      console.log(`🗄️ Should archive: ${wfId} - ${name.substring(0, 50)}`);
      archived++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Already archived: ${alreadyArchived}`);
  console.log(`Need archiving (via UI): ${archived}`);
  console.log(`Deactivated: ${deactivated}`);

  console.log('\n⚠️  NOTE: n8n API cannot set archive flag.');
  console.log('To fully archive, use n8n UI: Select workflow → Archive');
}

main().catch(console.error);
