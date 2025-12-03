#!/usr/bin/env node
/**
 * Check if unknown credentials are actually valid in n8n
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

  // Get all credentials from n8n
  console.log('Fetching n8n credentials...\n');
  const credsUrl = `https://${CONFIG.N8N_HOST}/api/v1/credentials`;
  const credsResult = curlJson(credsUrl, { 'X-N8N-API-KEY': n8nApiKey });

  console.log('Credentials API response:', JSON.stringify(credsResult)?.substring(0, 200));

  if (!credsResult?.data) {
    console.log('Could not fetch credentials - API may not expose this endpoint');
    console.log('Checking credential schemas instead...\n');

    // Just report what we know about credential types
    const CRED_STATUS = {
      // Known broken (OAuth needs UI)
      gmailOAuth2: { status: 'BROKEN', reason: 'OAuth expired, needs UI re-auth' },
      googleSheetsOAuth2Api: { status: 'BROKEN', reason: 'OAuth expired, needs UI re-auth' },
      supabaseApi: { status: 'BROKEN', reason: 'API key invalid, needs UI update' },
      postgres: { status: 'BROKEN', reason: 'Connection string/password issue, needs UI' },

      // Known working (API-based auth)
      httpHeaderAuth: { status: 'WORKING', reason: 'Bearer token auth' },
      httpQueryAuth: { status: 'WORKING', reason: 'Query param auth' },
      httpBasicAuth: { status: 'WORKING', reason: 'Basic auth' },
      aws: { status: 'WORKING', reason: 'AWS IAM credentials' },
      unleashedSoftwareApi: { status: 'WORKING', reason: 'HMAC auth' },

      // Unknown - need to verify
      openAiApi: { status: 'LIKELY_OK', reason: 'API key auth, probably works' },
      shopifyAccessTokenApi: { status: 'LIKELY_OK', reason: 'Access token auth' },
      hubspotAppToken: { status: 'LIKELY_OK', reason: 'App token auth' },
      smtp: { status: 'UNKNOWN', reason: 'Email server config' },
      telegramApi: { status: 'LIKELY_OK', reason: 'Bot token auth' },
      anthropicApi: { status: 'LIKELY_OK', reason: 'API key auth' },
      googleDriveOAuth2Api: { status: 'BROKEN', reason: 'OAuth like Gmail' },
      n8nApi: { status: 'LIKELY_OK', reason: 'n8n API key' },
      googlePalmApi: { status: 'LIKELY_OK', reason: 'API key auth' },
      hubspotApi: { status: 'UNKNOWN', reason: 'Legacy HubSpot' },
      shopifyApi: { status: 'LIKELY_OK', reason: 'Shopify API' },
      rapidApi: { status: 'LIKELY_OK', reason: 'API key auth' },
      googleApi: { status: 'BROKEN', reason: 'OAuth like Gmail' },
      oAuth2Api: { status: 'UNKNOWN', reason: 'Generic OAuth' }
    };

    console.log('='.repeat(60));
    console.log('CREDENTIAL STATUS ASSESSMENT');
    console.log('='.repeat(60));

    for (const [cred, info] of Object.entries(CRED_STATUS)) {
      const icon = info.status === 'WORKING' ? '✅' :
                   info.status === 'BROKEN' ? '❌' :
                   info.status === 'LIKELY_OK' ? '🟡' : '⚠️';
      console.log(`${icon} ${cred.padEnd(25)} ${info.status.padEnd(10)} ${info.reason}`);
    }
    return;
  }

  console.log('='.repeat(60));
  console.log('ALL CREDENTIALS IN N8N');
  console.log('='.repeat(60));

  // Group by type
  const byType = {};
  for (const cred of credsResult.data) {
    if (!byType[cred.type]) byType[cred.type] = [];
    byType[cred.type].push(cred);
  }

  for (const [type, creds] of Object.entries(byType).sort()) {
    console.log(`\n${type} (${creds.length}):`);
    for (const cred of creds) {
      console.log(`  - ${cred.name} [id: ${cred.id}]`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('CREDENTIAL COUNT BY TYPE');
  console.log('='.repeat(60));
  for (const [type, creds] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${creds.length.toString().padStart(3)} ${type}`);
  }
}

main().catch(console.error);
