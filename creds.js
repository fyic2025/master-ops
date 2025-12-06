#!/usr/bin/env node
/**
 * UNIFIED CREDENTIAL LOADER
 *
 * Single script for all credential operations - works identically local and remote.
 * All credentials stored in Supabase vault with AES-256-CBC encryption.
 *
 * USAGE:
 *   node creds.js                     # Show all credentials (masked)
 *   node creds.js list                # List all credentials
 *   node creds.js list boo            # List BOO project credentials
 *   node creds.js get boo bc_access_token  # Get specific credential
 *   node creds.js load                # Load all into process.env (for module use)
 *   node creds.js load boo            # Load BOO + global credentials
 *   node creds.js export boo          # Export .env format (for local file)
 *   node creds.js store boo name value "description"  # Store new credential
 *   node creds.js verify              # Test all integrations
 *
 * PROJECTS: boo, elevate, teelixir, redhillfresh, global
 *
 * AS MODULE:
 *   const creds = require('./creds');
 *   await creds.load('boo');          // Loads BOO + global into process.env
 *   const token = await creds.get('boo', 'bc_access_token');
 */

const https = require('https');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Vault connection details (from environment variables)
// ═══════════════════════════════════════════════════════════════════════════

// SECURITY: These MUST be set via environment variables, never hardcoded
// Set in .env file or system environment before running
const CONFIG = {
  SUPABASE_HOST: process.env.VAULT_SUPABASE_HOST || (() => { throw new Error('VAULT_SUPABASE_HOST not set'); })(),
  SUPABASE_SERVICE_KEY: process.env.VAULT_SERVICE_KEY || (() => { throw new Error('VAULT_SERVICE_KEY not set'); })(),
  ENCRYPTION_KEY: process.env.VAULT_ENCRYPTION_KEY || (() => { throw new Error('VAULT_ENCRYPTION_KEY not set'); })()
};

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS - Client-side AES-256-CBC encryption
// ═══════════════════════════════════════════════════════════════════════════

function encrypt(value) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(CONFIG.ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(value, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

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

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: CONFIG.SUPABASE_HOST,
      port: 443,
      path: path,
      method: method,
      headers: {
        'apikey': CONFIG.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        ...(body && { 'Content-Length': Buffer.byteLength(postData) }),
        ...(method === 'POST' && { 'Prefer': 'resolution=merge-duplicates,return=representation' })
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API Error (${res.statusCode}): ${data}`));
        } else {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List all credentials (or for specific project)
 */
async function list(project = null) {
  let path = '/rest/v1/secure_credentials?select=project,name,description&order=project,name';
  if (project) path += `&project=eq.${project}`;
  const rows = await request('GET', path);
  return rows.map(r => ({ project: r.project, name: r.name, description: r.description }));
}

/**
 * Get a specific credential value (client-side decryption)
 */
async function get(project, name) {
  const path = `/rest/v1/secure_credentials?project=eq.${project}&name=eq.${name}&select=encrypted_value`;
  const rows = await request('GET', path);
  if (rows.length > 0 && rows[0].encrypted_value) {
    return decrypt(rows[0].encrypted_value);
  }
  return null;
}

/**
 * Store a credential (client-side encryption, with upsert)
 */
async function store(project, name, value, description = null) {
  const encryptedValue = encrypt(value);

  // Try update first
  const updatePath = `/rest/v1/secure_credentials?project=eq.${project}&name=eq.${name}`;
  const existing = await request('GET', updatePath + '&select=id');

  if (existing && existing.length > 0) {
    // Update existing
    await request('PATCH', updatePath, {
      encrypted_value: encryptedValue,
      description: description || `${project} - ${name}`
    });
  } else {
    // Insert new
    await request('POST', '/rest/v1/secure_credentials', {
      project,
      name,
      encrypted_value: encryptedValue,
      description: description || `${project} - ${name}`
    });
  }
  return true;
}

/**
 * Delete a credential
 */
async function remove(project, name) {
  await request('DELETE', `/rest/v1/secure_credentials?project=eq.${project}&name=eq.${name}`);
  return true;
}

/**
 * Convert vault name to env variable name
 * boo/bc_access_token -> BOO_BC_ACCESS_TOKEN
 * global/n8n_api_key -> N8N_API_KEY
 */
function toEnvName(project, name) {
  const prefix = project === 'global' ? '' : `${project.toUpperCase()}_`;
  return `${prefix}${name.toUpperCase()}`;
}

/**
 * Load credentials into process.env
 */
async function load(project = null) {
  const loaded = {};

  // Get list of credentials to load
  const creds = await list(project);

  for (const cred of creds) {
    const value = await get(cred.project, cred.name);
    if (value) {
      const envName = toEnvName(cred.project, cred.name);
      process.env[envName] = value;
      loaded[envName] = true;
    }
  }

  // Always load global if loading a specific project
  if (project && project !== 'global') {
    const globalCreds = await list('global');
    for (const cred of globalCreds) {
      const value = await get('global', cred.name);
      if (value) {
        const envName = toEnvName('global', cred.name);
        process.env[envName] = value;
        loaded[envName] = true;
      }
    }
  }

  return loaded;
}

/**
 * Export credentials as .env format string
 */
async function exportEnv(project = null) {
  const lines = [];
  const creds = await list(project);

  for (const cred of creds) {
    const value = await get(cred.project, cred.name);
    if (value) {
      const envName = toEnvName(cred.project, cred.name);
      // Escape quotes and handle multiline
      const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      lines.push(`${envName}="${escaped}"`);
    }
  }

  // Always include global if exporting a specific project
  if (project && project !== 'global') {
    const globalCreds = await list('global');
    for (const cred of globalCreds) {
      const value = await get('global', cred.name);
      if (value) {
        const envName = toEnvName('global', cred.name);
        const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        lines.push(`${envName}="${escaped}"`);
      }
    }
  }

  return lines.sort().join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

async function cli() {
  const [,, command, ...args] = process.argv;

  try {
    switch (command) {
      case 'list':
      case undefined:
      case '': {
        const project = args[0] || null;
        const creds = await list(project);

        if (creds.length === 0) {
          console.log('No credentials found.');
          return;
        }

        console.log('\n' + '═'.repeat(70));
        console.log(' VAULT CREDENTIALS' + (project ? ` (${project})` : ' (all)'));
        console.log('═'.repeat(70));

        let currentProject = null;
        for (const c of creds) {
          if (c.project !== currentProject) {
            currentProject = c.project;
            console.log(`\n  [${currentProject.toUpperCase()}]`);
          }
          const envName = toEnvName(c.project, c.name);
          console.log(`    ${c.name.padEnd(30)} → ${envName}`);
        }

        console.log('\n' + '═'.repeat(70));
        console.log(` Total: ${creds.length} credentials`);
        console.log('═'.repeat(70) + '\n');
        break;
      }

      case 'get': {
        const [project, name] = args;
        if (!project || !name) {
          console.log('Usage: node creds.js get <project> <name>');
          process.exit(1);
        }
        const value = await get(project, name);
        if (value) {
          console.log(value);
        } else {
          console.error(`Not found: ${project}/${name}`);
          process.exit(1);
        }
        break;
      }

      case 'store': {
        const [project, name, value, description] = args;
        if (!project || !name || !value) {
          console.log('Usage: node creds.js store <project> <name> <value> [description]');
          process.exit(1);
        }
        await store(project, name, value, description);
        console.log(`✓ Stored: ${project}/${name}`);
        break;
      }

      case 'delete':
      case 'remove': {
        const [project, name] = args;
        if (!project || !name) {
          console.log('Usage: node creds.js delete <project> <name>');
          process.exit(1);
        }
        await remove(project, name);
        console.log(`✓ Deleted: ${project}/${name}`);
        break;
      }

      case 'load': {
        const project = args[0] || null;
        const loaded = await load(project);
        console.log(`✓ Loaded ${Object.keys(loaded).length} credentials into process.env`);
        Object.keys(loaded).sort().forEach(k => console.log(`  ${k}`));
        break;
      }

      case 'export': {
        const project = args[0] || null;
        const env = await exportEnv(project);
        console.log(env);
        break;
      }

      case 'verify': {
        console.log('\n🔍 Verifying credential access...\n');

        // Test a credential from each project
        const tests = [
          ['boo', 'bc_access_token'],
          ['elevate', 'shopify_access_token'],
          ['teelixir', 'klaviyo_api_key'],
          ['global', 'n8n_api_key']
        ];

        let passed = 0;
        for (const [project, name] of tests) {
          const value = await get(project, name);
          if (value) {
            console.log(`  ✓ ${project}/${name}`);
            passed++;
          } else {
            console.log(`  ✗ ${project}/${name} - not found`);
          }
        }

        console.log(`\n${passed}/${tests.length} tests passed\n`);
        break;
      }

      default:
        console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  UNIFIED CREDENTIAL LOADER                                           ║
║  Works identically local and remote                                  ║
╚══════════════════════════════════════════════════════════════════════╝

COMMANDS:
  node creds.js                           List all credentials
  node creds.js list [project]            List credentials (optional: filter by project)
  node creds.js get <project> <name>      Get specific credential value
  node creds.js store <p> <n> <v> [desc]  Store a new credential
  node creds.js delete <project> <name>   Delete a credential
  node creds.js export [project]          Export as .env format
  node creds.js verify                    Test vault access

PROJECTS:
  boo          Buy Organics Online
  elevate      Elevate Wholesale
  teelixir     Teelixir
  redhillfresh Red Hill Fresh
  global       Shared credentials (n8n, Google, AWS, etc.)

EXAMPLES:
  node creds.js list boo
  node creds.js get boo bc_access_token
  node creds.js export boo > .env.local
  node creds.js store boo new_api_key "abc123" "Description here"

AS MODULE:
  const creds = require('./creds');
  await creds.load('boo');                // Load into process.env
  const token = await creds.get('boo', 'bc_access_token');
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = { list, get, store, remove, load, exportEnv, toEnvName };

if (require.main === module) {
  cli();
}
