/**
 * Load Credentials from Supabase Vault
 *
 * Use this script to load all credentials from Supabase vault into environment variables.
 * Works remotely - only needs the Supabase service key to access all other credentials.
 *
 * Usage:
 *   // As a module
 *   const { loadCredentials, loadProjectCredentials } = require('./load-vault-credentials');
 *   await loadCredentials(); // Load all
 *   await loadProjectCredentials('boo'); // Load BOO only
 *
 *   // As CLI
 *   node load-vault-credentials.js [project]
 *   node load-vault-credentials.js boo
 */

const https = require('https');

const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

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

/**
 * Convert credential name to environment variable name
 * e.g., "google_ads_client_id" -> "GOOGLE_ADS_CLIENT_ID"
 */
function toEnvName(project, credName) {
  const prefix = project === 'global' ? '' : `${project.toUpperCase()}_`;
  return `${prefix}${credName.toUpperCase()}`;
}

/**
 * Load all credentials from vault into process.env
 */
async function loadCredentials() {
  const creds = await callRpc('list_credentials', { p_project: null });
  const loaded = {};

  for (const cred of creds) {
    const value = await callRpc('get_credential', {
      p_name: cred.credential_name,
      p_project: cred.project
    });

    const envName = toEnvName(cred.project, cred.credential_name);
    process.env[envName] = value;
    loaded[envName] = '***'; // Don't log actual values
  }

  return loaded;
}

/**
 * Load credentials for specific project
 */
async function loadProjectCredentials(project) {
  const creds = await callRpc('list_credentials', { p_project: project });
  const loaded = {};

  for (const cred of creds) {
    const value = await callRpc('get_credential', {
      p_name: cred.credential_name,
      p_project: cred.project
    });

    const envName = toEnvName(cred.project, cred.credential_name);
    process.env[envName] = value;
    loaded[envName] = '***';
  }

  // Also load global credentials
  const globalCreds = await callRpc('list_credentials', { p_project: 'global' });
  for (const cred of globalCreds) {
    const value = await callRpc('get_credential', {
      p_name: cred.credential_name,
      p_project: 'global'
    });

    const envName = toEnvName('global', cred.credential_name);
    process.env[envName] = value;
    loaded[envName] = '***';
  }

  return loaded;
}

/**
 * Get specific credential
 */
async function getCredential(project, name) {
  return callRpc('get_credential', {
    p_name: name,
    p_project: project
  });
}

/**
 * Get Google Ads credentials for a business
 */
async function getGoogleAdsCredentials(business) {
  const clientId = await getCredential('global', 'google_ads_client_id');
  const clientSecret = await getCredential('global', 'google_ads_client_secret');
  const refreshToken = await getCredential(business, 'google_ads_refresh_token');
  const customerId = await getCredential(business, 'google_ads_customer_id');
  const merchantId = await getCredential(business, 'google_merchant_id');

  // Developer token - check both locations
  let developerToken;
  try {
    developerToken = await getCredential('global', 'google_ads_developer_token');
  } catch (e) {
    developerToken = null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    customerId,
    merchantId,
    developerToken,
  };
}

/**
 * Export .env format for a project
 */
async function exportEnvFormat(project) {
  const creds = await callRpc('list_credentials', { p_project: project });
  const lines = [];

  for (const cred of creds) {
    const value = await callRpc('get_credential', {
      p_name: cred.credential_name,
      p_project: cred.project
    });

    const envName = toEnvName(cred.project, cred.credential_name);
    lines.push(`${envName}="${value}"`);
  }

  // Also include global
  const globalCreds = await callRpc('list_credentials', { p_project: 'global' });
  for (const cred of globalCreds) {
    const value = await callRpc('get_credential', {
      p_name: cred.credential_name,
      p_project: 'global'
    });

    const envName = toEnvName('global', cred.credential_name);
    lines.push(`${envName}="${value}"`);
  }

  return lines.join('\n');
}

// CLI handler
async function main() {
  const [,, command, project] = process.argv;

  try {
    if (command === 'export') {
      // Export as .env format
      const env = await exportEnvFormat(project || 'boo');
      console.log(env);
    } else if (command === 'google-ads') {
      // Get Google Ads creds for business
      const creds = await getGoogleAdsCredentials(project || 'boo');
      console.log('Google Ads Credentials:');
      console.log('  Client ID:', creds.clientId ? '✓' : '✗');
      console.log('  Client Secret:', creds.clientSecret ? '✓' : '✗');
      console.log('  Refresh Token:', creds.refreshToken ? '✓' : '✗');
      console.log('  Customer ID:', creds.customerId || '✗');
      console.log('  Merchant ID:', creds.merchantId || '✗');
      console.log('  Developer Token:', creds.developerToken ? '✓' : '✗ (waiting for approval)');
    } else {
      // Default: load and show what was loaded
      const loaded = project
        ? await loadProjectCredentials(project)
        : await loadCredentials();

      console.log(`Loaded ${Object.keys(loaded).length} credentials into environment:`);
      Object.keys(loaded).sort().forEach(key => {
        console.log(`  ${key}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for module use
module.exports = {
  loadCredentials,
  loadProjectCredentials,
  getCredential,
  getGoogleAdsCredentials,
  exportEnvFormat,
};

// Run CLI if called directly
if (require.main === module) {
  main();
}
