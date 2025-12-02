#!/usr/bin/env node
const { execSync } = require('child_process');
const crypto = require('crypto');

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

// Get API key
const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
const vaultResult = execSync(`curl -sk "${vaultUrl}" -H "apikey: ${CONFIG.SUPABASE_SERVICE_KEY}" -H "Authorization: Bearer ${CONFIG.SUPABASE_SERVICE_KEY}"`, { encoding: 'utf8' });
console.log('Vault response:', vaultResult.substring(0, 100));

const vaultData = JSON.parse(vaultResult);
const apiKey = decrypt(vaultData[0].encrypted_value);
console.log('API Key:', apiKey.substring(0, 15) + '...');

// Test n8n API
console.log('\nTesting n8n API...');
const n8nUrl = `https://${CONFIG.N8N_HOST}/api/v1/workflows?limit=5`;
const n8nResult = execSync(`curl -sk "${n8nUrl}" -H "X-N8N-API-KEY: ${apiKey}"`, { encoding: 'utf8' });
console.log('n8n response length:', n8nResult.length);
const n8nData = JSON.parse(n8nResult);
console.log('Workflows returned:', n8nData.data?.length || 0);
if (n8nData.data?.length > 0) {
  console.log('First workflow:', n8nData.data[0].name);
}
