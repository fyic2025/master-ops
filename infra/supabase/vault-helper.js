/**
 * Supabase Vault Helper
 * Secure credential management for Claude Code
 *
 * Usage:
 *   node vault-helper.js store <project> <name> <value> [description]
 *   node vault-helper.js get <project> <name>
 *   node vault-helper.js list [project]
 *   node vault-helper.js delete <project> <name>
 *
 * Projects: boo, teelixir, elevate, global
 */

const https = require('https');

const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

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

async function storeCredential(project, name, value, description) {
  const result = await callRpc('store_credential', {
    p_name: name,
    p_value: value,
    p_project: project,
    p_description: description || `${project} - ${name}`
  });
  console.log(`✓ Stored: ${project}/${name}`);
  return result;
}

async function getCredential(project, name) {
  const result = await callRpc('get_credential', {
    p_name: name,
    p_project: project
  });
  return result;
}

async function listCredentials(project = null) {
  const result = await callRpc('list_credentials', {
    p_project: project
  });
  return result;
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
