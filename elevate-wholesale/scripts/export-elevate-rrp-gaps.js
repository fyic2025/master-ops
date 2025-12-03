#!/usr/bin/env node
/**
 * Export Elevate Products Missing RRP
 *
 * This script queries the elevate_products table for products
 * that don't have an RRP set and exports them to CSV.
 * The user can then fill in the RRP values and import back.
 *
 * Usage: node scripts/export-elevate-rrp-gaps.js [output-path]
 * Default output: elevate-wholesale/elevate-rrp-gaps.csv
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load credentials
const credsPath = path.join(__dirname, '..', 'creds.js');
const creds = require(credsPath);

async function getSupabaseCredentials() {
  const [supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);
  return { supabaseUrl, supabaseKey };
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  console.log('='.repeat(60));
  console.log('EXPORT ELEVATE RRP GAPS');
  console.log('='.repeat(60));
  console.log();

  // Determine output path
  const outputPath = process.argv[2] || path.join(__dirname, '..', 'elevate-wholesale', 'elevate-rrp-gaps.csv');

  try {
    // Get credentials
    const { supabaseUrl, supabaseKey } = await getSupabaseCredentials();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Elevate Supabase credentials');
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query products with missing RRP
    console.log('Querying products with missing RRP...');

    const { data: products, error } = await supabase
      .from('elevate_products')
      .select('sku, title, variant_title, vendor, wholesale_price, rrp')
      .is('rrp', null)
      .not('sku', 'is', null)
      .order('vendor', { ascending: true })
      .order('title', { ascending: true });

    if (error) {
      throw new Error(`Error querying: ${error.message}`);
    }

    console.log(`Found ${products.length} products missing RRP\n`);

    if (products.length === 0) {
      console.log('All products have RRP set!');
      return;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Build CSV
    const headers = ['sku', 'title', 'variant_title', 'vendor', 'wholesale_price', 'rrp'];
    const rows = [headers.join(',')];

    for (const p of products) {
      const row = [
        escapeCsvField(p.sku),
        escapeCsvField(p.title),
        escapeCsvField(p.variant_title),
        escapeCsvField(p.vendor),
        p.wholesale_price !== null ? p.wholesale_price.toFixed(2) : '',
        '' // Empty RRP for user to fill
      ];
      rows.push(row.join(','));
    }

    fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');

    console.log('='.repeat(60));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Output file: ${outputPath}`);
    console.log(`  Products:    ${products.length}`);

    // Show vendor breakdown
    const vendors = {};
    products.forEach(p => {
      vendors[p.vendor || 'Unknown'] = (vendors[p.vendor || 'Unknown'] || 0) + 1;
    });

    console.log('\nBy vendor (needs RRP):');
    Object.entries(vendors)
      .sort((a, b) => b[1] - a[1])
      .forEach(([vendor, count]) => {
        console.log(`  ${vendor}: ${count} products`);
      });

    console.log('\n📝 Next steps:');
    console.log('  1. Open the CSV file');
    console.log('  2. Fill in the "rrp" column with RRP values');
    console.log('  3. Run: node scripts/import-elevate-rrp-csv.js <path-to-filled-csv>');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
