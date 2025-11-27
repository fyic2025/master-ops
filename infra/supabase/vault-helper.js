/**
 * Supabase Vault Helper
 * Secure credential management for Claude Code
 *
 * Vault Location: https://usibnysqelovfuctmkqw.supabase.co
 * Table: secure_credentials
 * Encryption: AES-256-CBC via pgcrypto
 *
 * Usage:
 *   node vault-helper.js store <project> <name> <value> [description]
 *   node vault-helper.js get <project> <name>
 *   node vault-helper.js list [project]
 *   node vault-helper.js delete <project> <name>
 *
 * Projects: boo, teelixir, elevate, redhillfresh, global
 *
 * Example credentials stored:
 *   global/google_ads_client_id        - OAuth client ID for Google APIs
 *   global/google_ads_client_secret    - OAuth client secret
 *   boo/google_merchant_refresh_token  - BOO Merchant Center refresh token
 *   boo/google_merchant_id             - BOO Merchant Center ID (10043678)
 */

const https = require('https');
const crypto = require('crypto');

const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';
const ENCRYPTION_KEY = 'mstr-ops-vault-2024-secure-key';

function callRpc(functionName, params) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(params);

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: `/rest/v1/rpc/${functionName}`,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API Error (${res.statusCode}): ${data}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function encryptValue(value) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(value, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

async function storeCredential(project, name, value, description) {
  // Encrypt locally and store directly in table
  return new Promise((resolve, reject) => {
    const encryptedValue = encryptValue(value);
    const postData = JSON.stringify({
      project,
      name,
      encrypted_value: encryptedValue,
      description: description || `${project} - ${name}`
    });

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: '/rest/v1/secure_credentials',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Prefer': 'resolution=merge-duplicates,return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API Error (${res.statusCode}): ${data}`));
        } else {
          console.log(`✓ Stored: ${project}/${name}`);
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function decryptValue(encryptedValue) {
  try {
    const buffer = Buffer.from(encryptedValue, 'base64');
    const iv = buffer.subarray(0, 16);
    const encrypted = buffer.subarray(16);
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return null;
  }
}

async function getCredential(project, name) {
  // Fetch encrypted value from table and decrypt locally
  return new Promise((resolve, reject) => {
    const path = `/rest/v1/secure_credentials?project=eq.${project}&name=eq.${name}&select=encrypted_value`;

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const rows = JSON.parse(data);
          if (rows.length > 0 && rows[0].encrypted_value) {
            resolve(decryptValue(rows[0].encrypted_value));
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function listCredentials(project = null) {
  // Query table directly since RPC function may not exist
  return new Promise((resolve, reject) => {
    let path = '/rest/v1/secure_credentials?select=project,name,description';
    if (project) {
      path += `&project=eq.${project}`;
    }

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const rows = JSON.parse(data);
          // Map to expected format
          resolve(rows.map(r => ({ project: r.project, credential_name: r.name, description: r.description })));
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function deleteCredential(project, name) {
  const result = await callRpc('delete_credential', {
    p_name: name,
    p_project: project
  });
  console.log(result ? `✓ Deleted: ${project}/${name}` : `✗ Not found: ${project}/${name}`);
  return result;
}

// CLI handler
async function main() {
  const [,, command, ...args] = process.argv;

  try {
    switch (command) {
      case 'store': {
        const [project, name, value, description] = args;
        if (!project || !name || !value) {
          console.log('Usage: node vault-helper.js store <project> <name> <value> [description]');
          process.exit(1);
        }
        await storeCredential(project, name, value, description);
        break;
      }

      case 'get': {
        const [project, name] = args;
        if (!project || !name) {
          console.log('Usage: node vault-helper.js get <project> <name>');
          process.exit(1);
        }
        const value = await getCredential(project, name);
        console.log(value);
        break;
      }

      case 'list': {
        const [project] = args;
        const creds = await listCredentials(project || null);
        if (creds.length === 0) {
          console.log('No credentials stored yet.');
        } else {
          console.log('\nStored Credentials:');
          console.log('-'.repeat(60));
          creds.forEach(c => {
            console.log(`  ${c.project}/${c.credential_name}`);
            if (c.description) console.log(`    -> ${c.description}`);
          });
          console.log('-'.repeat(60));
          console.log(`Total: ${creds.length} credentials\n`);
        }
        break;
      }

      case 'delete': {
        const [project, name] = args;
        if (!project || !name) {
          console.log('Usage: node vault-helper.js delete <project> <name>');
          process.exit(1);
        }
        await deleteCredential(project, name);
        break;
      }

      default:
        console.log(`
Supabase Vault Helper - Secure Credential Management

Usage:
  node vault-helper.js store <project> <name> <value> [description]
  node vault-helper.js get <project> <name>
  node vault-helper.js list [project]
  node vault-helper.js delete <project> <name>

Projects:
  boo       - Buy Organics Online
  teelixir  - Teelixir
  elevate   - Elevate Wholesale
  global    - Shared credentials

Examples:
  node vault-helper.js store boo bigcommerce_api_key "abc123" "BOO BigCommerce API"
  node vault-helper.js get boo bigcommerce_api_key
  node vault-helper.js list boo
  node vault-helper.js list
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { storeCredential, getCredential, listCredentials, deleteCredential };

// Run CLI if called directly
if (require.main === module) {
  main();
}
