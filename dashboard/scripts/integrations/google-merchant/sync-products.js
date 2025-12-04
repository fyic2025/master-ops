/**
 * Sync Google Merchant Center Products to Supabase
 *
 * Fetches product statuses from GMC and stores in google_merchant_products table
 *
 * Credentials are fetched from Supabase Vault (secure_credentials table)
 * Vault location: https://usibnysqelovfuctmkqw.supabase.co
 *
 * Required vault credentials:
 *   - global/google_ads_client_id
 *   - global/google_ads_client_secret
 *   - boo/google_merchant_refresh_token
 *   - boo/google_merchant_id
 *
 * Usage: node sync-products.js
 */

const https = require('https');
const path = require('path');

// Load environment variables (fallback only)
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

// ============================================
// VAULT CONFIGURATION
// ============================================
// Credentials are stored in Supabase Vault with pgcrypto encryption
// Vault Project: usibnysqelovfuctmkqw (BOO Supabase)
// See: infra/supabase/vault-setup.sql for schema
// See: infra/supabase/vault-helper.js for CLI access

const VAULT_ENCRYPTION_KEY = 'mstr-ops-vault-2024-secure-key';
const SUPABASE_ACCESS_TOKEN = 'sbp_b3c8e4797261a1dd37e4e85bdc00917cdb98d1f5';

// Data storage Supabase (where google_merchant_products table lives)
const DATA_SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const DATA_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

// Credentials object - populated from vault at runtime
const CREDENTIALS = {
  clientId: null,
  clientSecret: null,
  refreshToken: null,
  merchantId: null,
};

let accessToken = null;

// ============================================
// HTTP HELPERS
// ============================================

function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ============================================
// GOOGLE OAUTH
// ============================================

async function getAccessToken() {
  if (accessToken) return accessToken;

  const postData = new URLSearchParams({
    client_id: CREDENTIALS.clientId,
    client_secret: CREDENTIALS.clientSecret,
    refresh_token: CREDENTIALS.refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  const response = await httpsRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, postData);

  const json = JSON.parse(response.data);
  accessToken = json.access_token;
  return accessToken;
}

// ============================================
// MERCHANT CENTER API
// ============================================

async function merchantRequest(path, params = {}) {
  const token = await getAccessToken();
  const url = new URL(`https://shoppingcontent.googleapis.com/content/v2.1/${CREDENTIALS.merchantId}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.append(key, String(value));
  });

  const response = await httpsRequest({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return JSON.parse(response.data);
}

async function getAccountStatus() {
  return merchantRequest(`/accountstatuses/${CREDENTIALS.merchantId}`);
}

async function getProductStatuses(pageToken = null) {
  const params = { maxResults: 250 };
  if (pageToken) params.pageToken = pageToken;
  return merchantRequest('/productstatuses', params);
}

async function getProducts(pageToken = null) {
  const params = { maxResults: 250 };
  if (pageToken) params.pageToken = pageToken;
  return merchantRequest('/products', params);
}

async function getAllProductStatuses() {
  const allProducts = [];
  let pageToken = null;
  let page = 1;

  do {
    console.log(`  Fetching page ${page}...`);
    const result = await getProductStatuses(pageToken);

    if (result.resources) {
      allProducts.push(...result.resources);
      console.log(`  Got ${result.resources.length} products (total: ${allProducts.length})`);
    }

    pageToken = result.nextPageToken;
    page++;
  } while (pageToken);

  return allProducts;
}

// ============================================
// CREDENTIAL LOADING
// ============================================
// Load credentials from .env file (same as test-connection.js)

async function loadCredentialsFromVault() {
  console.log('  Loading credentials from .env...');

  // Load from environment variables
  CREDENTIALS.clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  CREDENTIALS.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  CREDENTIALS.refreshToken = process.env.GOOGLE_ADS_BOO_REFRESH_TOKEN;
  CREDENTIALS.merchantId = process.env.GMC_BOO_MERCHANT_ID;

  // Validate all credentials loaded
  const missing = [];
  if (!CREDENTIALS.clientId) missing.push('GOOGLE_ADS_CLIENT_ID');
  if (!CREDENTIALS.clientSecret) missing.push('GOOGLE_ADS_CLIENT_SECRET');
  if (!CREDENTIALS.refreshToken) missing.push('GOOGLE_ADS_BOO_REFRESH_TOKEN');
  if (!CREDENTIALS.merchantId) missing.push('GMC_BOO_MERCHANT_ID');

  if (missing.length > 0) {
    throw new Error(`Missing .env credentials: ${missing.join(', ')}`);
  }

  console.log('  ✓ All credentials loaded from .env');
}

// ============================================
// SUPABASE DATA FUNCTIONS
// ============================================

async function supabaseRequest(method, path, body = null) {
  const url = new URL(DATA_SUPABASE_URL + path);

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method,
    headers: {
      'apikey': DATA_SUPABASE_KEY,
      'Authorization': `Bearer ${DATA_SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  };

  const postData = body ? JSON.stringify(body) : null;
  if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

  const response = await httpsRequest(options, postData);
  return JSON.parse(response.data || '[]');
}

async function getOrCreateAccount() {
  // Check if BOO account exists
  const existing = await supabaseRequest('GET', '/rest/v1/google_ads_accounts?business=eq.boo');

  if (existing && existing.length > 0) {
    console.log('  Found existing BOO account:', existing[0].id);
    return existing[0];
  }

  // Create BOO account
  console.log('  Creating BOO account...');
  const created = await supabaseRequest('POST', '/rest/v1/google_ads_accounts', {
    business: 'boo',
    customer_id: process.env.GOOGLE_ADS_BOO_CUSTOMER_ID || '5275169559',
    merchant_center_id: CREDENTIALS.merchantId,
    display_name: 'Buy Organics Online',
    currency_code: 'AUD',
    timezone: 'Australia/Melbourne',
    is_active: true,
  });

  console.log('  Created BOO account:', created[0].id);
  return created[0];
}

async function upsertProducts(accountId, products) {
  if (!products.length) {
    console.log('  No products to sync');
    return { inserted: 0, updated: 0 };
  }

  // Transform products for database
  const records = products.map(p => {
    // Determine approval status
    let approvalStatus = 'pending';
    if (p.destinationStatuses?.some(d => d.status === 'approved' || d.approvedCountries?.length > 0)) {
      approvalStatus = 'approved';
    } else if (p.destinationStatuses?.some(d => d.status === 'disapproved' || d.disapprovedCountries?.length > 0)) {
      approvalStatus = 'disapproved';
    }

    return {
      account_id: accountId,
      product_id: p.productId,
      offer_id: p.offerId || null,
      title: p.title || null,
      approval_status: approvalStatus,
      destination_statuses: p.destinationStatuses || [],
      item_issues: p.itemLevelIssues || [],
      last_synced_at: new Date().toISOString(),
    };
  });

  // Upsert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      // Use upsert with on_conflict - specify the unique constraint columns
      const url = new URL(DATA_SUPABASE_URL + '/rest/v1/google_merchant_products?on_conflict=account_id,product_id');

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'apikey': DATA_SUPABASE_KEY,
          'Authorization': `Bearer ${DATA_SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
      };

      const postData = JSON.stringify(batch);
      options.headers['Content-Length'] = Buffer.byteLength(postData);

      const response = await httpsRequest(options, postData);
      const result = JSON.parse(response.data || '[]');

      // Count results
      result.forEach(r => {
        // If created_at equals last_synced_at (within 1 second), it's new
        const createdAt = new Date(r.created_at).getTime();
        const syncedAt = new Date(r.last_synced_at).getTime();
        if (Math.abs(syncedAt - createdAt) < 1000) {
          inserted++;
        } else {
          updated++;
        }
      });

      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: processed ${batch.length} products`);
    } catch (err) {
      console.error(`  Batch ${Math.floor(i / batchSize) + 1} failed:`, err.message);
    }
  }

  return { inserted, updated };
}

// ============================================
// SNAPSHOT FUNCTIONS
// ============================================

async function createDailySnapshot(accountId, products) {
  console.log('\n5. Creating daily snapshot...');

  // Calculate product counts
  let approved = 0, disapproved = 0, pending = 0;
  let totalErrors = 0, totalWarnings = 0, totalSuggestions = 0;
  let totalImpressions = 0, totalClicks = 0;

  for (const p of products) {
    // Count by status
    if (p.destinationStatuses?.some(d => d.status === 'approved' || d.approvedCountries?.length > 0)) {
      approved++;
    } else if (p.destinationStatuses?.some(d => d.status === 'disapproved' || d.disapprovedCountries?.length > 0)) {
      disapproved++;
    } else {
      pending++;
    }

    // Count issues
    if (p.itemLevelIssues && Array.isArray(p.itemLevelIssues)) {
      for (const issue of p.itemLevelIssues) {
        const severity = issue.severity || 'warning';
        if (severity === 'error') totalErrors++;
        else if (severity === 'warning') totalWarnings++;
        else totalSuggestions++;
      }
    }
  }

  const total = products.length;
  const approvalRate = total > 0 ? (approved * 100.0 / total) : 0;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const snapshot = {
    account_id: accountId,
    snapshot_date: today,
    products_total: total,
    products_active: approved,
    products_pending: pending,
    products_disapproved: disapproved,
    products_expiring: 0, // Not tracked in current data
    total_errors: totalErrors,
    total_warnings: totalWarnings,
    total_suggestions: totalSuggestions,
    total_impressions_30d: totalImpressions,
    total_clicks_30d: totalClicks,
    approval_rate: approvalRate,
    ctr: 0, // Will be calculated if we have impressions/clicks
  };

  try {
    // Upsert snapshot (update if exists for today) - use account_id,snapshot_date as conflict columns
    const url = new URL(DATA_SUPABASE_URL + '/rest/v1/google_merchant_account_snapshots?on_conflict=account_id,snapshot_date');

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'apikey': DATA_SUPABASE_KEY,
        'Authorization': `Bearer ${DATA_SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
    };

    const postData = JSON.stringify(snapshot);
    options.headers['Content-Length'] = Buffer.byteLength(postData);

    const response = await httpsRequest(options, postData);
    const result = JSON.parse(response.data || '[]');

    console.log(`   ✓ Snapshot created for ${today}`);
    console.log(`     Total: ${total}, Approved: ${approved}, Disapproved: ${disapproved}, Pending: ${pending}`);
    console.log(`     Issues: ${totalErrors} errors, ${totalWarnings} warnings, ${totalSuggestions} suggestions`);

    return result[0];
  } catch (err) {
    console.error('   Failed to create snapshot:', err.message);
    return null;
  }
}

async function logSyncCompletion(accountId, productCount) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const logEntry = {
      account_id: accountId,
      sync_type: 'merchant',
      date_range_start: today,
      date_range_end: today,
      status: 'success',
      records_fetched: productCount,
      records_inserted: productCount,
      records_updated: 0,
      completed_at: new Date().toISOString(),
    };

    await supabaseRequest('POST', '/rest/v1/google_ads_sync_log', logEntry);
    console.log('   ✓ Sync logged to google_ads_sync_log');
  } catch (err) {
    console.error('   Failed to log sync:', err.message);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('========================================');
  console.log('Google Merchant Center → Supabase Sync');
  console.log('========================================\n');

  // Step 0: Load credentials from vault
  console.log('0. Loading credentials from vault...');
  try {
    await loadCredentialsFromVault();
  } catch (err) {
    console.error('   Failed to load credentials:', err.message);
    process.exit(1);
  }

  // Step 1: Get account status
  console.log('1. Checking Merchant Center account...');
  try {
    const status = await getAccountStatus();
    console.log(`   Account ID: ${status.accountId}`);
    console.log(`   Products: Active=${status.products?.active || 0}, Pending=${status.products?.pending || 0}, Disapproved=${status.products?.disapproved || 0}`);

    if (status.accountLevelIssues?.length > 0) {
      console.log('   Account Issues:');
      status.accountLevelIssues.forEach(issue => {
        console.log(`   - [${issue.severity}] ${issue.title}`);
      });
    }
  } catch (err) {
    console.error('   Failed to get account status:', err.message);
    process.exit(1);
  }

  // Step 2: Get/create Supabase account
  console.log('\n2. Setting up Supabase account...');
  let account;
  try {
    account = await getOrCreateAccount();
  } catch (err) {
    console.error('   Failed to setup account:', err.message);
    process.exit(1);
  }

  // Step 3: Fetch all product statuses
  console.log('\n3. Fetching product statuses from Merchant Center...');
  let products;
  try {
    products = await getAllProductStatuses();
    console.log(`   Total products: ${products.length}`);
  } catch (err) {
    console.error('   Failed to fetch products:', err.message);
    process.exit(1);
  }

  // Step 4: Sync to Supabase
  console.log('\n4. Syncing to Supabase...');
  try {
    const { inserted, updated } = await upsertProducts(account.id, products);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Updated: ${updated}`);
  } catch (err) {
    console.error('   Failed to sync:', err.message);
    process.exit(1);
  }

  // Step 5: Create daily snapshot for trend tracking
  await createDailySnapshot(account.id, products);

  // Step 6: Log sync completion
  console.log('\n6. Logging sync completion...');
  await logSyncCompletion(account.id, products.length);

  // Summary
  console.log('\n========================================');
  console.log('Sync Complete!');
  console.log('========================================');

  // Show stats by approval status
  if (products.length > 0) {
    const byStatus = products.reduce((acc, p) => {
      let status = 'pending';
      if (p.destinationStatuses?.some(d => d.status === 'approved' || d.approvedCountries?.length > 0)) {
        status = 'approved';
      } else if (p.destinationStatuses?.some(d => d.status === 'disapproved' || d.disapprovedCountries?.length > 0)) {
        status = 'disapproved';
      }
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    console.log('\nProducts by status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show some disapproved products if any
    const disapproved = products.filter(p =>
      p.destinationStatuses?.some(d => d.status === 'disapproved' || d.disapprovedCountries?.length > 0)
    );

    if (disapproved.length > 0) {
      console.log(`\nSample disapproved products (first 5):`);
      disapproved.slice(0, 5).forEach(p => {
        console.log(`  - ${p.title || p.offerId}`);
        p.itemLevelIssues?.slice(0, 2).forEach(issue => {
          console.log(`    [${issue.severity}] ${issue.description}`);
        });
      });
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
