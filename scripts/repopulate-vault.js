#!/usr/bin/env node
/**
 * Repopulate Supabase Vault with Client-Side Encryption
 *
 * The vault currently has data encrypted with pgcrypto (server-side),
 * but pgcrypto permissions are broken. This script re-stores all credentials
 * using client-side AES-256-CBC encryption that can be decrypted without
 * database functions.
 *
 * Run: node scripts/repopulate-vault.js
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_HOST = 'usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';
const ENCRYPTION_KEY = 'mstr-ops-vault-2024-secure-key';

// Client-side AES-256-CBC encryption
function encrypt(value) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(value, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

// HTTP request helper
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const preferHeader = method === 'POST'
      ? 'resolution=merge-duplicates,return=representation'
      : method === 'PATCH'
        ? 'return=representation'
        : null;

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: path,
      method: method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        ...(body && { 'Content-Length': Buffer.byteLength(postData) }),
        ...(preferHeader && { 'Prefer': preferHeader })
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

// Store a credential with client-side encryption (upsert)
async function storeCredential(project, name, value, description) {
  const encryptedValue = encrypt(value);

  // First try to update existing
  const updatePath = `/rest/v1/secure_credentials?project=eq.${project}&name=eq.${name}`;
  const updateResult = await request('PATCH', updatePath, {
    encrypted_value: encryptedValue,
    description: description || `${project} - ${name}`
  });

  // If no rows updated, insert new
  if (!updateResult || updateResult.length === 0) {
    // Check if exists first
    const checkPath = `/rest/v1/secure_credentials?project=eq.${project}&name=eq.${name}&select=id`;
    const existing = await request('GET', checkPath);

    if (existing.length === 0) {
      await request('POST', '/rest/v1/secure_credentials', {
        project,
        name,
        encrypted_value: encryptedValue,
        description: description || `${project} - ${name}`
      });
    }
  }
  console.log(`  ✓ ${project}/${name}`);
}

// Load credentials from .env file
function loadEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const creds = {};

  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (!line.trim() || line.startsWith('#')) return;

    // Parse KEY=VALUE
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      let [, key, value] = match;
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
      creds[key] = value;
    }
  });

  return creds;
}

// Map env variables to vault structure
const CREDENTIAL_MAPPINGS = {
  // Global/Shared
  'MASTER_SUPABASE_URL': { project: 'global', name: 'master_supabase_url', desc: 'Master Supabase URL' },
  'MASTER_SUPABASE_SERVICE_ROLE_KEY': { project: 'global', name: 'master_supabase_service_role_key', desc: 'Master Supabase Service Role Key' },
  'N8N_URL': { project: 'global', name: 'n8n_url', desc: 'n8n Automation URL' },
  'N8N_BASE_URL': { project: 'global', name: 'n8n_url', desc: 'n8n Automation URL' },
  'N8N_API_KEY': { project: 'global', name: 'n8n_api_key', desc: 'n8n API Key' },
  'HUBSPOT_ACCESS_TOKEN': { project: 'global', name: 'hubspot_access_token', desc: 'HubSpot Access Token' },
  'HUBSPOT_SECRET': { project: 'global', name: 'hubspot_secret', desc: 'HubSpot Secret' },
  'SMARTLEAD_API_KEY': { project: 'global', name: 'smartlead_api_key', desc: 'Smartlead API Key' },
  'GMAIL_USER': { project: 'global', name: 'gmail_user', desc: 'Gmail User' },
  'GMAIL_APP_PASSWORD': { project: 'global', name: 'gmail_app_password', desc: 'Gmail App Password' },
  'AWS_ACCESS_KEY_ID': { project: 'global', name: 'aws_access_key_id', desc: 'AWS Access Key ID' },
  'AWS_SECRET_ACCESS_KEY': { project: 'global', name: 'aws_secret_access_key', desc: 'AWS Secret Access Key' },
  'GOOGLE_ADS_CLIENT_ID': { project: 'global', name: 'google_ads_client_id', desc: 'Google OAuth Client ID' },
  'GOOGLE_ADS_CLIENT_SECRET': { project: 'global', name: 'google_ads_client_secret', desc: 'Google OAuth Client Secret' },
  'GOOGLE_GSC_REFRESH_TOKEN': { project: 'global', name: 'google_gsc_refresh_token', desc: 'Google Search Console Refresh Token' },
  'DO_API_TOKEN': { project: 'global', name: 'do_api_token', desc: 'DigitalOcean API Token' },

  // BOO
  'BOO_SUPABASE_URL': { project: 'boo', name: 'supabase_url', desc: 'BOO Supabase URL' },
  'BOO_SUPABASE_SERVICE_ROLE_KEY': { project: 'boo', name: 'supabase_service_role_key', desc: 'BOO Supabase Service Role Key' },
  'BOO_SUPABASE_DB_PASSWORD': { project: 'boo', name: 'supabase_db_password', desc: 'BOO Supabase DB Password' },
  'BOO_BC_STORE_HASH': { project: 'boo', name: 'bc_store_hash', desc: 'BOO BigCommerce Store Hash' },
  'BC_BOO_STORE_HASH': { project: 'boo', name: 'bc_store_hash', desc: 'BOO BigCommerce Store Hash' },
  'BOO_BC_CLIENT_ID': { project: 'boo', name: 'bc_client_id', desc: 'BOO BigCommerce Client ID' },
  'BC_BOO_CLIENT_ID': { project: 'boo', name: 'bc_client_id', desc: 'BOO BigCommerce Client ID' },
  'BOO_BC_ACCESS_TOKEN': { project: 'boo', name: 'bc_access_token', desc: 'BOO BigCommerce Access Token' },
  'BC_BOO_ACCESS_TOKEN': { project: 'boo', name: 'bc_access_token', desc: 'BOO BigCommerce Access Token' },
  'BC_BOO_CLIENT_SECRET': { project: 'boo', name: 'bc_client_secret', desc: 'BOO BigCommerce Client Secret' },
  'BOO_KLAVIYO_API_KEY': { project: 'boo', name: 'klaviyo_api_key', desc: 'BOO Klaviyo API Key' },
  'BOO_OBORNE_FTP_HOST': { project: 'boo', name: 'oborne_ftp_host', desc: 'BOO Oborne FTP Host' },
  'BOO_OBORNE_FTP_USER': { project: 'boo', name: 'oborne_ftp_user', desc: 'BOO Oborne FTP User' },
  'BOO_OBORNE_FTP_PASSWORD': { project: 'boo', name: 'oborne_ftp_password', desc: 'BOO Oborne FTP Password' },
  'BOO_UHP_EMAIL': { project: 'boo', name: 'uhp_email', desc: 'BOO UHP Email' },
  'BOO_UHP_PASSWORD': { project: 'boo', name: 'uhp_password', desc: 'BOO UHP Password' },
  'BOO_KADAC_UID': { project: 'boo', name: 'kadac_uid', desc: 'BOO Kadac UID' },
  'GOOGLE_ADS_BOO_CUSTOMER_ID': { project: 'boo', name: 'google_ads_customer_id', desc: 'BOO Google Ads Customer ID' },
  'GOOGLE_ADS_BOO_REFRESH_TOKEN': { project: 'boo', name: 'google_ads_refresh_token', desc: 'BOO Google Ads Refresh Token' },
  'GMC_BOO_MERCHANT_ID': { project: 'boo', name: 'google_merchant_id', desc: 'BOO Google Merchant Center ID' },
  'GMC_BOO_REFRESH_TOKEN': { project: 'boo', name: 'google_merchant_refresh_token', desc: 'BOO Google Merchant Center Refresh Token' },

  // Google Merchant Center - Teelixir
  'GMC_TEELIXIR_MERCHANT_ID': { project: 'teelixir', name: 'google_merchant_id', desc: 'Teelixir Google Merchant Center ID' },
  'GMC_TEELIXIR_REFRESH_TOKEN': { project: 'teelixir', name: 'google_merchant_refresh_token', desc: 'Teelixir GMC Refresh Token' },

  // Google Merchant Center - Red Hill Fresh
  'GMC_RHF_MERCHANT_ID': { project: 'redhillfresh', name: 'google_merchant_id', desc: 'RHF Google Merchant Center ID' },
  'GMC_RHF_REFRESH_TOKEN': { project: 'redhillfresh', name: 'google_merchant_refresh_token', desc: 'RHF GMC Refresh Token' },

  // Google Ads - Teelixir
  'GOOGLE_ADS_TEELIXIR_CUSTOMER_ID': { project: 'teelixir', name: 'google_ads_customer_id', desc: 'Teelixir Google Ads Customer ID' },
  'GOOGLE_ADS_TEELIXIR_REFRESH_TOKEN': { project: 'teelixir', name: 'google_ads_refresh_token', desc: 'Teelixir Google Ads Refresh Token' },

  // Google Ads - RHF
  'GOOGLE_ADS_RHF_CUSTOMER_ID': { project: 'redhillfresh', name: 'google_ads_customer_id', desc: 'RHF Google Ads Customer ID' },
  'GOOGLE_ADS_RHF_REFRESH_TOKEN': { project: 'redhillfresh', name: 'google_ads_refresh_token', desc: 'RHF Google Ads Refresh Token' },
  'LIVECHAT_ACCOUNT_ID': { project: 'boo', name: 'livechat_account_id', desc: 'BOO LiveChat Account ID' },
  'LIVECHAT_PAT': { project: 'boo', name: 'livechat_pat', desc: 'BOO LiveChat PAT' },
  'LIVECHAT_ENTITY_ID': { project: 'boo', name: 'livechat_entity_id', desc: 'BOO LiveChat Entity ID' },
  'XERO_BOO_CLIENT_ID': { project: 'boo', name: 'xero_client_id', desc: 'BOO Xero Client ID' },
  'XERO_BOO_CLIENT_SECRET': { project: 'boo', name: 'xero_client_secret', desc: 'BOO Xero Client Secret' },
  'XERO_BOO_REFRESH_TOKEN': { project: 'boo', name: 'xero_refresh_token', desc: 'BOO Xero Refresh Token' },
  'XERO_BOO_TENANT_ID': { project: 'boo', name: 'xero_tenant_id', desc: 'BOO Xero Tenant ID' },

  // Elevate
  'ELEVATE_SUPABASE_URL': { project: 'elevate', name: 'supabase_url', desc: 'Elevate Supabase URL' },
  'ELEVATE_SUPABASE_ANON_KEY': { project: 'elevate', name: 'supabase_anon_key', desc: 'Elevate Supabase Anon Key' },
  'ELEVATE_SUPABASE_SERVICE_ROLE_KEY': { project: 'elevate', name: 'supabase_service_role_key', desc: 'Elevate Supabase Service Role Key' },
  'ELEVATE_SHOPIFY_STORE_URL': { project: 'elevate', name: 'shopify_store_url', desc: 'Elevate Shopify Store URL' },
  'ELEVATE_SHOPIFY_ACCESS_TOKEN': { project: 'elevate', name: 'shopify_access_token', desc: 'Elevate Shopify Access Token' },
  'ELEVATE_KLAVIYO_API_KEY': { project: 'elevate', name: 'klaviyo_api_key', desc: 'Elevate Klaviyo API Key' },
  'ELEVATE_UNLEASHED_API_ID': { project: 'elevate', name: 'unleashed_api_id', desc: 'Elevate Unleashed API ID' },
  'ELEVATE_UNLEASHED_API_KEY': { project: 'elevate', name: 'unleashed_api_key', desc: 'Elevate Unleashed API Key' },
  'ELEVATE_XERO_CLIENT_ID': { project: 'elevate', name: 'xero_client_id', desc: 'Elevate Xero Client ID' },
  'ELEVATE_XERO_CLIENT_SECRET': { project: 'elevate', name: 'xero_client_secret', desc: 'Elevate Xero Client Secret' },
  'XERO_ELEVATE_CLIENT_ID': { project: 'elevate', name: 'xero_client_id', desc: 'Elevate Xero Client ID' },
  'XERO_ELEVATE_CLIENT_SECRET': { project: 'elevate', name: 'xero_client_secret', desc: 'Elevate Xero Client Secret' },
  'XERO_ELEVATE_REFRESH_TOKEN': { project: 'elevate', name: 'xero_refresh_token', desc: 'Elevate Xero Refresh Token' },
  'XERO_ELEVATE_TENANT_ID': { project: 'elevate', name: 'xero_tenant_id', desc: 'Elevate Xero Tenant ID' },

  // Teelixir
  'TEELIXIR_KLAVIYO_API_KEY': { project: 'teelixir', name: 'klaviyo_api_key', desc: 'Teelixir Klaviyo API Key' },
  'TEELIXIR_XERO_CLIENT_ID': { project: 'teelixir', name: 'xero_client_id', desc: 'Teelixir Xero Client ID' },
  'TEELIXIR_XERO_CLIENT_SECRET': { project: 'teelixir', name: 'xero_client_secret', desc: 'Teelixir Xero Client Secret' },
  'XERO_TEELIXIR_CLIENT_ID': { project: 'teelixir', name: 'xero_client_id', desc: 'Teelixir Xero Client ID' },
  'XERO_TEELIXIR_CLIENT_SECRET': { project: 'teelixir', name: 'xero_client_secret', desc: 'Teelixir Xero Client Secret' },
  'XERO_TEELIXIR_REFRESH_TOKEN': { project: 'teelixir', name: 'xero_refresh_token', desc: 'Teelixir Xero Refresh Token' },
  'XERO_TEELIXIR_TENANT_ID': { project: 'teelixir', name: 'xero_tenant_id', desc: 'Teelixir Xero Tenant ID' },
  'TEELIXIR_UNLEASHED_API_ID': { project: 'teelixir', name: 'unleashed_api_id', desc: 'Teelixir Unleashed API ID' },
  'TEELIXIR_UNLEASHED_API_KEY': { project: 'teelixir', name: 'unleashed_api_key', desc: 'Teelixir Unleashed API Key' },
  'TEELIXIR_SHOPIFY_ACCESS_TOKEN': { project: 'teelixir', name: 'shopify_access_token', desc: 'Teelixir Shopify Access Token' },
  'TEELIXIR_SHOPIFY_SHOP_DOMAIN': { project: 'teelixir', name: 'shopify_shop_domain', desc: 'Teelixir Shopify Shop Domain' },
  'TEELIXIR_SHOPIFY_LOCATION_ID': { project: 'teelixir', name: 'shopify_location_id', desc: 'Teelixir Shopify Location ID' },

  // Additional from backup - BOO
  'BOO_SUPABASE_DB_PASSWORD': { project: 'boo', name: 'supabase_db_password', desc: 'BOO Supabase DB Password' },
  'BOO_KLAVIYO_API_KEY': { project: 'boo', name: 'klaviyo_api_key', desc: 'BOO Klaviyo API Key' },
  'BOO_OBORNE_FTP_HOST': { project: 'boo', name: 'oborne_ftp_host', desc: 'BOO Oborne FTP Host' },
  'BOO_OBORNE_FTP_USER': { project: 'boo', name: 'oborne_ftp_user', desc: 'BOO Oborne FTP User' },
  'BOO_OBORNE_FTP_PASSWORD': { project: 'boo', name: 'oborne_ftp_password', desc: 'BOO Oborne FTP Password' },
  'BOO_UHP_EMAIL': { project: 'boo', name: 'uhp_email', desc: 'BOO UHP Email' },
  'BOO_UHP_PASSWORD': { project: 'boo', name: 'uhp_password', desc: 'BOO UHP Password' },
  'BOO_KADAC_UID': { project: 'boo', name: 'kadac_uid', desc: 'BOO Kadac UID' },

  // Additional from backup - Elevate
  'ELEVATE_SUPABASE_SERVICE_ROLE_KEY': { project: 'elevate', name: 'supabase_service_role_key', desc: 'Elevate Supabase Service Role Key' },
  'ELEVATE_KLAVIYO_API_KEY': { project: 'elevate', name: 'klaviyo_api_key', desc: 'Elevate Klaviyo API Key' },
  'ELEVATE_UNLEASHED_API_ID': { project: 'elevate', name: 'unleashed_api_id', desc: 'Elevate Unleashed API ID' },
  'ELEVATE_UNLEASHED_API_KEY': { project: 'elevate', name: 'unleashed_api_key', desc: 'Elevate Unleashed API Key' },

  // Additional from backup - Global
  'MASTER_SUPABASE_URL': { project: 'global', name: 'master_supabase_url', desc: 'Master Supabase URL' },
  'MASTER_SUPABASE_SERVICE_ROLE_KEY': { project: 'global', name: 'master_supabase_service_role_key', desc: 'Master Supabase Service Role Key' },
  'GMAIL_USER': { project: 'global', name: 'gmail_user', desc: 'Gmail User' },
  'GMAIL_APP_PASSWORD': { project: 'global', name: 'gmail_app_password', desc: 'Gmail App Password' },
  'AWS_ACCESS_KEY_ID': { project: 'global', name: 'aws_access_key_id', desc: 'AWS Access Key ID' },
  'AWS_SECRET_ACCESS_KEY': { project: 'global', name: 'aws_secret_access_key', desc: 'AWS Secret Access Key' },

  // Additional from backup - Red Hill Fresh
  'REDHILLFRESH_WP_URL': { project: 'redhillfresh', name: 'wp_url', desc: 'Red Hill Fresh WordPress URL' },
  'REDHILLFRESH_WP_PASSWORD': { project: 'redhillfresh', name: 'wp_password', desc: 'Red Hill Fresh WP Password' },
  'REDHILLFRESH_WP_APP_PASSWORD': { project: 'redhillfresh', name: 'wp_app_password', desc: 'Red Hill Fresh WP App Password' },

  // Red Hill Fresh
  'REDHILLFRESH_WP_URL': { project: 'redhillfresh', name: 'wp_url', desc: 'Red Hill Fresh WordPress URL' },
  'REDHILLFRESH_WP_USERNAME': { project: 'redhillfresh', name: 'wp_username', desc: 'Red Hill Fresh WP Username' },
  'REDHILLFRESH_WP_PASSWORD': { project: 'redhillfresh', name: 'wp_password', desc: 'Red Hill Fresh WP Password' },
  'REDHILLFRESH_WP_APP_PASSWORD': { project: 'redhillfresh', name: 'wp_app_password', desc: 'Red Hill Fresh WP App Password' },
  'REDHILLFRESH_WC_CONSUMER_KEY': { project: 'redhillfresh', name: 'wc_consumer_key', desc: 'Red Hill Fresh WooCommerce Key' },
  'REDHILLFRESH_WC_CONSUMER_SECRET': { project: 'redhillfresh', name: 'wc_consumer_secret', desc: 'Red Hill Fresh WooCommerce Secret' },
  'XERO_RHF_CLIENT_ID': { project: 'redhillfresh', name: 'xero_client_id', desc: 'RHF Xero Client ID' },
  'XERO_RHF_CLIENT_SECRET': { project: 'redhillfresh', name: 'xero_client_secret', desc: 'RHF Xero Client Secret' },
  'XERO_RHF_REFRESH_TOKEN': { project: 'redhillfresh', name: 'xero_refresh_token', desc: 'RHF Xero Refresh Token' },
  'XERO_RHF_TENANT_ID': { project: 'redhillfresh', name: 'xero_tenant_id', desc: 'RHF Xero Tenant ID' },
};

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' REPOPULATING VAULT WITH CLIENT-SIDE ENCRYPTION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load credentials from both .env files
  const envPath = path.join(__dirname, '..', '.env');
  const backupPath = path.join(__dirname, '..', 'MASTER-CREDENTIALS-COMPLETE.env.backup');

  let creds = {};

  if (fs.existsSync(envPath)) {
    console.log('Loading from .env...');
    Object.assign(creds, loadEnvFile(envPath));
  }

  if (fs.existsSync(backupPath)) {
    console.log('Loading from backup...');
    Object.assign(creds, loadEnvFile(backupPath));
  }

  console.log(`\nFound ${Object.keys(creds).length} environment variables\n`);

  // Store each mapped credential
  let stored = 0;
  const processed = new Set();

  for (const [envKey, mapping] of Object.entries(CREDENTIAL_MAPPINGS)) {
    const value = creds[envKey];
    if (!value || value.startsWith('<') || value === '[OPTIONAL]') continue;

    // Skip if we already stored this credential (handles aliases)
    const credKey = `${mapping.project}/${mapping.name}`;
    if (processed.has(credKey)) continue;
    processed.add(credKey);

    try {
      await storeCredential(mapping.project, mapping.name, value, mapping.desc);
      stored++;
    } catch (err) {
      console.log(`  ✗ ${credKey}: ${err.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` ✓ Stored ${stored} credentials with client-side encryption`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
