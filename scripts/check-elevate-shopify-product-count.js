#!/usr/bin/env node
/**
 * Check how many products are actually LIVE on Elevate Shopify
 * vs how many are in Supabase
 */
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));
const { createClient } = require('@supabase/supabase-js');

async function getCount(hostname, token, status) {
  return new Promise((resolve, reject) => {
    const apiPath = status
      ? `/admin/api/2024-01/products/count.json?status=${status}`
      : '/admin/api/2024-01/products/count.json';
    const req = https.request({
      hostname,
      path: apiPath,
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': token }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('ELEVATE PRODUCT COUNT COMPARISON');
  console.log('='.repeat(60));
  console.log();

  const [token, url, supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url'),
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Count products in Supabase
  console.log('📊 Supabase (elevate_products table):');
  const { count: totalSupabase } = await supabase
    .from('elevate_products')
    .select('*', { count: 'exact', head: true });
  console.log(`  Total products: ${totalSupabase}`);

  const { count: withVariants } = await supabase
    .from('elevate_products')
    .select('*', { count: 'exact', head: true })
    .not('shopify_variant_id', 'is', null);
  console.log(`  With Shopify variant IDs: ${withVariants}`);

  const { count: withRRP } = await supabase
    .from('elevate_products')
    .select('*', { count: 'exact', head: true })
    .not('rrp', 'is', null);
  console.log(`  With RRP set: ${withRRP}`);

  // Count products in Shopify using REST API
  console.log('\n📊 Shopify (live store):');

  const [all, active, draft, archived] = await Promise.all([
    getCount(hostname, token),
    getCount(hostname, token, 'active'),
    getCount(hostname, token, 'draft'),
    getCount(hostname, token, 'archived')
  ]);

  console.log(`  Total products: ${all.count}`);
  console.log(`  Active (LIVE): ${active.count} ← visible to customers`);
  console.log(`  Draft: ${draft.count}`);
  console.log(`  Archived: ${archived.count}`);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Supabase has ${totalSupabase} products from Unleashed (inventory).`);
  console.log(`Shopify has ${all.count} total products, but only ${active.count} are ACTIVE/live.`);
  console.log(`RRPs pushed to ALL products so they're ready when published.`);
}

main().catch(console.error);
