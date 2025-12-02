#!/usr/bin/env node
/**
 * Get detailed error info for specific workflows
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
    const result = execSync(`curl -sk "${url}" ${headerArgs}`, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(result);
  } catch (e) {
    return null;
  }
}

async function main() {
  // Get n8n API key from vault
  const vaultUrl = `https://${CONFIG.SUPABASE_HOST}/rest/v1/secure_credentials?project=eq.global&name=eq.n8n_api_key&select=encrypted_value`;
  const vaultData = curlJson(vaultUrl, {
    'apikey': CONFIG.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`
  });
  const n8nApiKey = decrypt(vaultData[0].encrypted_value);

  // Workflows to check for errors
  const workflows = [
    { id: 'C1ZEjrnPZMzazFRW', name: 'FIXED: Smartlead → Individual Profiles' },
    { id: 'CdENdCkCmSQpnbDG', name: 'n8n Daily Backup to Supabase' },
    { id: 'QrVthn0iaHLOXpYW', name: 'System Health Check' }
  ];

  for (const { id, name } of workflows) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 ${name}`);
    console.log(`   ID: ${id}`);
    console.log('='.repeat(70));

    // Get latest error execution with full data
    const execUrl = `https://${CONFIG.N8N_HOST}/api/v1/executions?workflowId=${id}&limit=1&status=error&includeData=true`;
    const executions = curlJson(execUrl, { 'X-N8N-API-KEY': n8nApiKey });

    if (executions?.data?.length > 0) {
      const exec = executions.data[0];
      console.log(`\nLatest error: ${exec.startedAt?.substring(0, 19)}`);

      // Find the node that failed
      if (exec.data?.resultData?.error) {
        const error = exec.data.resultData.error;
        console.log(`\nError message: ${error.message}`);
        if (error.node) {
          console.log(`Failed node: ${error.node}`);
        }
        if (error.description) {
          console.log(`Description: ${error.description}`);
        }
      }

      // Check for node-specific errors
      const runData = exec.data?.resultData?.runData;
      if (runData) {
        for (const [nodeName, nodeResults] of Object.entries(runData)) {
          for (const result of (nodeResults || [])) {
            if (result.error) {
              console.log(`\nNode "${nodeName}" error:`);
              console.log(`  Message: ${result.error.message}`);
              if (result.error.description) {
                console.log(`  Description: ${result.error.description}`);
              }
            }
          }
        }
      }
    } else {
      console.log('\nNo error details found');
    }
  }
}

main().catch(console.error);
