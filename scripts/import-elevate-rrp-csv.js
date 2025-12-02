#!/usr/bin/env node
/**
 * Import RRP values from CSV to Supabase
 *
 * This script reads a CSV file with SKU and RRP columns
 * and updates the elevate_products table with the RRP values.
 *
 * CSV format:
 *   sku,title,variant_title,vendor,wholesale_price,rrp
 *   PROD-001,Product Name,Size,Vendor,29.97,49.95
 *
 * Usage: node scripts/import-elevate-rrp-csv.js <csv-path>
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

function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have header row and at least one data row');
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Find column indexes
  const skuIndex = headers.findIndex(h => h.toLowerCase() === 'sku');
  const rrpIndex = headers.findIndex(h => h.toLowerCase() === 'rrp');

  if (skuIndex === -1) {
    throw new Error('CSV must have a "sku" column');
  }
  if (rrpIndex === -1) {
    throw new Error('CSV must have a "rrp" column');
  }

  // Parse data rows
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const sku = values[skuIndex]?.trim();
    const rrpStr = values[rrpIndex]?.trim();

    if (!sku) continue;

    // Parse RRP - skip if empty
    if (!rrpStr) continue;

    const rrp = parseFloat(rrpStr.replace(/[$,]/g, ''));
    if (isNaN(rrp) || rrp <= 0) {
      console.warn(`  Warning: Invalid RRP "${rrpStr}" for SKU ${sku}, skipping`);
      continue;
    }

    records.push({ sku, rrp });
  }

  return records;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  values.push(current);

  return values;
}

async function main() {
  console.log('='.repeat(60));
  console.log('IMPORT ELEVATE RRP FROM CSV');
  console.log('='.repeat(60));
  console.log();

  // Get CSV path from args
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/import-elevate-rrp-csv.js <csv-path>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  try {
    // Get credentials
    const { supabaseUrl, supabaseKey } = await getSupabaseCredentials();

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Elevate Supabase credentials');
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read and parse CSV
    console.log(`Reading CSV: ${csvPath}`);
    const content = fs.readFileSync(csvPath, 'utf8');
    const records = parseCSV(content);

    console.log(`Found ${records.length} records with RRP values\n`);

    if (records.length === 0) {
      console.log('No records to import');
      return;
    }

    // Update Supabase
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const record of records) {
      // Find product by SKU
      const { data: existing, error: findError } = await supabase
        .from('elevate_products')
        .select('id, sku, rrp')
        .eq('sku', record.sku)
        .single();

      if (findError || !existing) {
        console.log(`  ⚠ SKU not found: ${record.sku}`);
        notFound++;
        continue;
      }

      // Update RRP
      const { error: updateError } = await supabase
        .from('elevate_products')
        .update({
          rrp: record.rrp,
          rrp_source: 'csv_import'
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`  Error updating ${record.sku}: ${updateError.message}`);
        errors++;
      } else {
        const oldRRP = existing.rrp ? `$${existing.rrp}` : 'null';
        console.log(`  ✓ ${record.sku}: ${oldRRP} → $${record.rrp.toFixed(2)}`);
        updated++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('IMPORT COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Updated:   ${updated}`);
    console.log(`  Not found: ${notFound}`);
    console.log(`  Errors:    ${errors}`);

    if (updated > 0) {
      console.log('\n📝 Next steps:');
      console.log('  Run: node scripts/sync-rrp-to-elevate-shopify.js');
      console.log('  to push RRPs to Elevate Shopify');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
