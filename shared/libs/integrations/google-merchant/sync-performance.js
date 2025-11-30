/**
 * Sync Google Merchant Center Performance Data to Supabase
 *
 * Uses the GMC Reports API to fetch impressions/clicks by product
 * Filters to Australia only as required for this project
 *
 * Usage: node sync-performance.js
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

// Data storage Supabase (where google_merchant_products table lives)
const DATA_SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const DATA_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

// Credentials
const CREDENTIALS = {
  clientId: process.env.GOOGLE_ADS_CLIENT_ID,
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_ADS_BOO_REFRESH_TOKEN,
  merchantId: process.env.GMC_BOO_MERCHANT_ID,
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
// MERCHANT CENTER REPORTS API
// ============================================

async function queryPerformanceReport() {
  const token = await getAccessToken();

  // Calculate date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d) => d.toISOString().split('T')[0];

  // GMC Query Language - filter to Australia only
  // Using product_performance_view for Shopping performance data
  const query = {
    query: `
      SELECT
        segments.offer_id,
        segments.title,
        metrics.impressions,
        metrics.clicks
      FROM product_performance_view
      WHERE segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
        AND segments.marketing_method = 'ORGANIC'
    `
  };

  console.log(`  Query period: ${formatDate(startDate)} to ${formatDate(endDate)}`);
  console.log('  Fetching performance data from GMC Reports API...');

  const postData = JSON.stringify(query);

  const response = await httpsRequest({
    hostname: 'shoppingcontent.googleapis.com',
    path: `/content/v2.1/${CREDENTIALS.merchantId}/reports/search`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, postData);

  return JSON.parse(response.data);
}

async function queryFreeListingsReport(pageToken = null) {
  const token = await getAccessToken();

  // Calculate date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d) => d.toISOString().split('T')[0];

  // Free Listings Performance Report - filter to Australia only
  // Using country_code = 'AU' for Australia geo filtering
  const query = {
    query: `
      SELECT
        segments.offer_id,
        segments.title,
        metrics.impressions,
        metrics.clicks
      FROM MerchantPerformanceView
      WHERE segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
    `,
    pageSize: 5000,
  };

  if (pageToken) {
    query.pageToken = pageToken;
  }

  const postData = JSON.stringify(query);

  try {
    const response = await httpsRequest({
      hostname: 'shoppingcontent.googleapis.com',
      path: `/content/v2.1/${CREDENTIALS.merchantId}/reports/search`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, postData);

    return JSON.parse(response.data);
  } catch (err) {
    console.log('  Free Listings report not available:', err.message.substring(0, 100));
    return { results: [] };
  }
}

async function getAllFreeListingsData() {
  console.log('  Fetching all Free Listings performance data...');

  const allResults = [];
  let pageToken = null;
  let page = 1;

  do {
    const report = await queryFreeListingsReport(pageToken);

    if (report.results && report.results.length > 0) {
      allResults.push(...report.results);
      console.log(`  Page ${page}: ${report.results.length} results (total: ${allResults.length})`);
    }

    pageToken = report.nextPageToken;
    page++;
  } while (pageToken);

  return allResults;
}

async function queryProductView() {
  const token = await getAccessToken();

  // Alternative: Try ProductView which may have more basic metrics
  const query = {
    query: `
      SELECT
        product_view.id,
        product_view.offer_id,
        product_view.title,
        product_view.click_potential,
        product_view.aggregated_destination_status
      FROM ProductView
      WHERE product_view.aggregated_destination_status = 'ELIGIBLE'
      LIMIT 100
    `
  };

  console.log('  Trying ProductView query...');

  const postData = JSON.stringify(query);

  try {
    const response = await httpsRequest({
      hostname: 'shoppingcontent.googleapis.com',
      path: `/content/v2.1/${CREDENTIALS.merchantId}/reports/search`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, postData);

    return JSON.parse(response.data);
  } catch (err) {
    console.log('  ProductView query failed:', err.message.substring(0, 100));
    return { results: [] };
  }
}

// ============================================
// SUPABASE UPDATE
// ============================================

async function updateProductPerformance(performanceData) {
  if (!performanceData.length) {
    console.log('  No performance data to update');
    return 0;
  }

  console.log(`  Updating ${performanceData.length} products with performance data...`);

  let updated = 0;
  let notFound = 0;

  // Update in batches
  const batchSize = 50;
  for (let i = 0; i < performanceData.length; i += batchSize) {
    const batch = performanceData.slice(i, i + batchSize);

    for (const product of batch) {
      try {
        // product_id format in DB is 'online:en:AU:{offer_id}'
        // Performance API returns just the offer_id part
        const productId = `online:en:AU:${product.offerId}`;

        const url = new URL(DATA_SUPABASE_URL + `/rest/v1/google_merchant_products?product_id=eq.${encodeURIComponent(productId)}`);

        const patchData = JSON.stringify({
          offer_id: product.offerId, // Also set the offer_id for future reference
          impressions_30d: product.impressions,
          clicks_30d: product.clicks,
          last_synced_at: new Date().toISOString(),
        });

        const response = await httpsRequest({
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'PATCH',
          headers: {
            'apikey': DATA_SUPABASE_KEY,
            'Authorization': `Bearer ${DATA_SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'Content-Length': Buffer.byteLength(patchData),
          },
        }, patchData);

        const result = JSON.parse(response.data || '[]');
        if (result.length > 0) {
          updated++;
        } else {
          notFound++;
        }
      } catch (err) {
        notFound++;
      }
    }

    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: processed ${batch.length} products`);
  }

  console.log(`  Successfully updated: ${updated}, Not found: ${notFound}`);
  return updated;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('========================================');
  console.log('GMC Performance Data Sync (Australia)');
  console.log('========================================\n');

  // Validate credentials
  if (!CREDENTIALS.clientId || !CREDENTIALS.refreshToken || !CREDENTIALS.merchantId) {
    console.error('Missing credentials in .env');
    process.exit(1);
  }

  console.log(`Merchant ID: ${CREDENTIALS.merchantId}\n`);

  // Try different report types to find performance data
  console.log('1. Attempting to fetch performance data...\n');

  // Method 1: Product Performance View (Shopping ads + free listings)
  let performanceData = [];

  try {
    const report = await queryPerformanceReport();
    console.log('  Product Performance View response:', JSON.stringify(report).substring(0, 200));

    if (report.results && report.results.length > 0) {
      performanceData = report.results.map(r => ({
        offerId: r.segments?.offerId,
        title: r.segments?.title,
        impressions: parseInt(r.metrics?.impressions || 0),
        clicks: parseInt(r.metrics?.clicks || 0),
      })).filter(p => p.offerId);
    }
  } catch (err) {
    console.log('  Product Performance View failed:', err.message.substring(0, 150));
  }

  // Method 2: Free Listings Report (with pagination and aggregation)
  if (performanceData.length === 0) {
    try {
      const allResults = await getAllFreeListingsData();
      console.log(`  Total rows from API: ${allResults.length}`);

      // Aggregate by offer_id (data comes per-date, we need totals)
      const byOfferId = {};
      for (const r of allResults) {
        const offerId = r.segments?.offerId;
        if (!offerId) continue;

        if (!byOfferId[offerId]) {
          byOfferId[offerId] = {
            offerId,
            title: r.segments?.title,
            impressions: 0,
            clicks: 0,
          };
        }
        byOfferId[offerId].impressions += parseInt(r.metrics?.impressions || 0);
        byOfferId[offerId].clicks += parseInt(r.metrics?.clicks || 0);
      }

      performanceData = Object.values(byOfferId);
      console.log(`  Unique products with data: ${performanceData.length}`);
    } catch (err) {
      console.log('  Free Listings failed:', err.message.substring(0, 150));
    }
  }

  // Method 3: ProductView (basic product info with click potential)
  if (performanceData.length === 0) {
    const productView = await queryProductView();
    console.log('  ProductView response:', JSON.stringify(productView).substring(0, 200));
  }

  // Report findings
  console.log('\n2. Performance Data Summary');
  console.log('========================================');

  if (performanceData.length > 0) {
    console.log(`  Found ${performanceData.length} products with performance data`);

    const totalImpressions = performanceData.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = performanceData.reduce((sum, p) => sum + p.clicks, 0);

    console.log(`  Total impressions (30d): ${totalImpressions.toLocaleString()}`);
    console.log(`  Total clicks (30d): ${totalClicks.toLocaleString()}`);

    // Show top 5 by impressions
    console.log('\n  Top 5 products by impressions:');
    performanceData.sort((a, b) => b.impressions - a.impressions);
    performanceData.slice(0, 5).forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.title?.substring(0, 50) || p.offerId} - ${p.impressions} imp, ${p.clicks} clicks`);
    });

    // Update Supabase
    console.log('\n3. Updating Supabase...');
    const updated = await updateProductPerformance(performanceData);
    console.log(`  Updated ${updated} products`);
  } else {
    console.log('  No performance data available from GMC Reports API');
    console.log('\n  Possible reasons:');
    console.log('  - Products not yet eligible for free listings');
    console.log('  - No Shopping campaigns running (need Google Ads API for paid Shopping)');
    console.log('  - Performance data not yet generated (can take 48-72 hours)');
    console.log('  - Merchant Center account not linked to Google Ads');
    console.log('\n  To get Shopping campaign performance data, you need:');
    console.log('  1. Google Ads Developer Token (currently pending)');
    console.log('  2. Link GMC to Google Ads account');
    console.log('  3. Active Shopping or Performance Max campaigns');
  }

  console.log('\n========================================');
  console.log('Sync Complete');
  console.log('========================================');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
