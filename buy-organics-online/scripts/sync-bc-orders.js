/**
 * Sync BigCommerce Orders to Supabase
 *
 * Fetches orders from BigCommerce API and stores in bc_orders table
 * for customer context in LiveChat dashboard.
 *
 * Usage: node sync-bc-orders.js [--days=90] [--full]
 *   --days=N   Sync orders from last N days (default: 90)
 *   --full     Full sync (all orders, ignore date filter)
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// BigCommerce config
const BC_STORE_HASH = process.env.BC_BOO_STORE_HASH || 'hhhi';
const BC_ACCESS_TOKEN = process.env.BC_BOO_ACCESS_TOKEN || 'eeikmonznnsxcq4f24m9d6uvv1e0qjn';

// Supabase config (BOO database)
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

// Parse command line args
const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const DAYS_TO_SYNC = daysArg ? parseInt(daysArg.split('=')[1]) : 90;
const FULL_SYNC = args.includes('--full');

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
          resolve({ statusCode: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// ============================================
// BIGCOMMERCE API
// ============================================

async function bcRequest(endpoint, params = {}) {
  const url = new URL(`https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v2${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'X-Auth-Token': BC_ACCESS_TOKEN,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  const response = await httpsRequest(options);
  return JSON.parse(response.data);
}

async function getOrderCount() {
  const result = await bcRequest('/orders/count');
  return result.count;
}

async function getOrders(page = 1, limit = 250, minDateCreated = null) {
  const params = { page, limit };
  if (minDateCreated) {
    params.min_date_created = minDateCreated;
  }
  params.sort = 'date_created:desc';

  return bcRequest('/orders', params);
}

async function getAllOrders(fromDate = null) {
  const allOrders = [];
  let page = 1;
  const limit = 250;

  const minDate = fromDate ? fromDate.toISOString().replace('T', ' ').split('.')[0] : null;

  while (true) {
    console.log(`  Fetching page ${page}...`);
    const orders = await getOrders(page, limit, minDate);

    if (!orders || orders.length === 0) {
      break;
    }

    allOrders.push(...orders);
    console.log(`  Got ${orders.length} orders (total: ${allOrders.length})`);

    if (orders.length < limit) {
      break; // Last page
    }

    page++;

    // Rate limiting - be gentle with BC API
    await new Promise(r => setTimeout(r, 300));
  }

  return allOrders;
}

// ============================================
// SUPABASE FUNCTIONS
// ============================================

async function supabaseRequest(method, path, body = null, headers = {}) {
  const url = new URL(SUPABASE_URL + path);

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...headers,
    },
  };

  const postData = body ? JSON.stringify(body) : null;
  if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

  const response = await httpsRequest(options, postData);
  return JSON.parse(response.data || '[]');
}

function transformOrder(order) {
  // Extract billing address info
  const billing = order.billing_address || {};

  // Extract shipping address (first one)
  const shipping = order.shipping_addresses?.[0] || {};

  return {
    bc_order_id: order.id,
    customer_id: order.customer_id,
    customer_email: billing.email || null,
    customer_first_name: billing.first_name || null,
    customer_last_name: billing.last_name || null,
    date_created: order.date_created,
    date_modified: order.date_modified || null,
    date_shipped: order.date_shipped || null,
    status: order.status,
    status_id: order.status_id,
    payment_status: order.payment_status,
    subtotal_inc_tax: parseFloat(order.subtotal_inc_tax) || 0,
    subtotal_ex_tax: parseFloat(order.subtotal_ex_tax) || 0,
    shipping_cost_inc_tax: parseFloat(order.shipping_cost_inc_tax) || 0,
    total_inc_tax: parseFloat(order.total_inc_tax) || 0,
    total_ex_tax: parseFloat(order.total_ex_tax) || 0,
    discount_amount: parseFloat(order.discount_amount) || 0,
    refunded_amount: parseFloat(order.refunded_amount) || 0,
    items_total: order.items_total,
    items_shipped: order.items_shipped,
    payment_method: order.payment_method,
    order_source: order.order_source,
    channel_id: order.channel_id,
    billing_country: billing.country || null,
    billing_state: billing.state || null,
    billing_city: billing.city || null,
    billing_postcode: billing.zip || null,
    shipping_country: shipping.country || null,
    shipping_state: shipping.state || null,
    shipping_city: shipping.city || null,
    shipping_postcode: shipping.zip || null,
    staff_notes: order.staff_notes || null,
    customer_message: order.customer_message || null,
    currency_code: order.currency_code || 'AUD',
    last_synced_at: new Date().toISOString(),
  };
}

async function upsertOrders(orders) {
  if (orders.length === 0) return 0;

  const records = orders.map(transformOrder);

  // Upsert in batches
  const batchSize = 100;
  let total = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      await supabaseRequest(
        'POST',
        '/rest/v1/bc_orders?on_conflict=bc_order_id',
        batch,
        { 'Prefer': 'resolution=merge-duplicates' }
      );
      total += batch.length;
    } catch (err) {
      console.error(`  Failed to upsert batch: ${err.message}`);
    }
  }

  return total;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('========================================');
  console.log('BigCommerce Orders → Supabase Sync');
  console.log('========================================\n');

  // Validate credentials
  if (!BC_ACCESS_TOKEN || !BC_STORE_HASH) {
    console.error('ERROR: Missing BigCommerce credentials');
    console.error('Please set BC_BOO_STORE_HASH and BC_BOO_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  console.log(`Store Hash: ${BC_STORE_HASH}`);
  console.log(`Sync Mode: ${FULL_SYNC ? 'Full sync (all orders)' : `Last ${DAYS_TO_SYNC} days`}\n`);

  // Calculate date range
  let fromDate = null;
  if (!FULL_SYNC) {
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - DAYS_TO_SYNC);
    console.log(`From date: ${fromDate.toISOString().split('T')[0]}\n`);
  }

  // Step 1: Test BC API connection
  console.log('1. Testing BigCommerce API connection...');
  try {
    const count = await getOrderCount();
    console.log(`   Total orders in store: ${count}\n`);
  } catch (err) {
    console.error('   Failed to connect to BigCommerce API:', err.message);
    console.error('\n   Check your credentials:');
    console.error('   - BC_BOO_STORE_HASH');
    console.error('   - BC_BOO_ACCESS_TOKEN');
    process.exit(1);
  }

  // Step 2: Fetch orders
  console.log('2. Fetching orders from BigCommerce...');
  let orders;
  try {
    orders = await getAllOrders(fromDate);
    console.log(`   Total orders fetched: ${orders.length}\n`);
  } catch (err) {
    console.error('   Failed to fetch orders:', err.message);
    process.exit(1);
  }

  if (orders.length === 0) {
    console.log('No orders found in date range.');
    return;
  }

  // Step 3: Sync to Supabase
  console.log('3. Syncing to Supabase...');
  const synced = await upsertOrders(orders);

  // Summary
  console.log('\n========================================');
  console.log('Sync Complete!');
  console.log('========================================');
  console.log(`Orders synced: ${synced}`);

  // Show stats
  const withEmail = orders.filter(o => o.billing_address?.email).length;
  console.log(`Orders with customer email: ${withEmail}/${orders.length}`);

  // Show date range of synced orders
  if (orders.length > 0) {
    const dates = orders.map(o => new Date(o.date_created));
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));
    console.log(`Date range: ${oldest.toISOString().split('T')[0]} to ${newest.toISOString().split('T')[0]}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
