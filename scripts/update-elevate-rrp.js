#!/usr/bin/env node
/**
 * Update Elevate Products with RRP from all sources
 * - BOO Martin & Pleasance (Biologika, EcoLogic)
 * - Ausganica Catalogue
 * - Base Soaps PDF
 * - Manual entries
 */

const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const credsPath = path.join(__dirname, '..', 'creds.js');
const creds = require(credsPath);

// Base Soaps RRP from PDF
const BASE_SOAPS_RRP = {
  'BBLM': 7.70, 'BBCR': 7.70, 'BBGPC': 7.70, 'BBMW': 7.70, 'BBCC': 7.70,
  'BBLAV': 7.70, 'BBCBB': 9.00, 'BBFACER': 10.00, 'BBFACED': 10.00,
  'BBSH': 12.00, 'BBSC': 12.00, 'BBSM': 12.00, 'BBCONLO': 17.60,
  '10BBLM': 69.30, '10BBCR': 69.30, '10BBGPC': 69.30, '10BBMW': 69.30,
  '10BBCC': 69.30, '10BBLAV': 69.30, '10BBCONLO': 160.00, '10BBSH': 110.00,
  '10BBSC': 110.00, '10BBSM': 110.00, 'TINSH': 50.00, 'L250CR': 17.60,
  'L250LM': 17.60, 'LBW250SM': 17.60, 'LBW250SC': 17.60, 'L1CR': 34.00,
  'L1LM': 34.00, 'LBW1SM': 34.00, 'LBW1SC': 34.00, 'L5CR': 160.00,
  'L5LM': 160.00, 'LBW5SM': 160.00, 'LBW5SC': 160.00, 'L5US': 88.00,
  // Additional Base Soaps SKU mappings (BS-* format)
  'BS-SB': 12.00,      // Shampoo Bar = BBSH
  'BS-CDRM': 7.70,     // Cedarwood & Rosemary = BBCR
  'BS-GPC': 7.70,      // Geranium & Pink Clay = BBGPC
  'BS-LMB': 7.70,      // Lemon Myrtle Bar = BBLM
  'BS-LMHW250': 17.60, // Lemon Myrtle Hand Wash 250ml = L250LM
  'BS-LMHW1L': 34.00,  // Lemon Myrtle Hand Wash 1L = L1LM
  'SRB': 11.95         // Solstice Ritual Bar (manual)
};

// Manual RRP entries
const MANUAL_RRP = {
  'HOF00': 16.95,      // Lavender Hair & Body Travel Kit
  'HRR00': 19.95,      // Rose Hair & Body Travel Kit
  'AEO174': 29.95      // Ylang Ylang Complete Oil 10ml
};

function stripKikPrefix(sku) {
  if (!sku) return '';
  return sku.replace(/^(KIK|AUS)\s*-\s*/i, '').trim();
}

async function main() {
  console.log('='.repeat(70));
  console.log('UPDATE ELEVATE PRODUCTS WITH RRP');
  console.log('='.repeat(70));
  console.log();

  // Get Supabase credentials
  const [supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all Elevate products needing RRP
  const { data: elevateProducts, error } = await supabase
    .from('elevate_products')
    .select('id, sku, title, vendor, wholesale_price, rrp')
    .is('rrp', null);

  if (error) throw error;
  console.log(`Found ${elevateProducts.length} products needing RRP\n`);

  // Load BOO Excel for Biologika/EcoLogic
  const booPath = path.join(__dirname, '..', 'BOO Martin & Pleasance Order 24th nov (1).xlsx');
  const boo = XLSX.readFile(booPath);
  const booSheet = boo.Sheets[boo.SheetNames[0]];
  const booData = XLSX.utils.sheet_to_json(booSheet, { header: 1 });

  // Build BOO RRP map (Code -> RRP)
  const booRrpMap = {};
  for (let i = 6; i < booData.length; i++) {
    const row = booData[i];
    if (row && row[0] && row[4]) {
      const code = String(row[0]).trim();
      const rrp = parseFloat(row[4]);
      if (!isNaN(rrp) && rrp > 0) {
        booRrpMap[code] = rrp;
      }
    }
  }
  console.log(`Loaded ${Object.keys(booRrpMap).length} products from BOO pricelist`);

  // Load Ausganica Excel
  const ausPath = path.join(__dirname, '..', 'Ausganica_Product_Catalogue&OrderForm_Wholesale 2025 (1).xlsx');
  const aus = XLSX.readFile(ausPath);
  const ausSheet = aus.Sheets['WS_Catalogue 2025'];
  const ausData = XLSX.utils.sheet_to_json(ausSheet, { header: 1 });

  // Build Ausganica RRP map (Code -> RRP)
  const ausRrpMap = {};
  for (let i = 7; i < ausData.length; i++) {
    const row = ausData[i];
    if (row && row[1] && row[7]) {
      const code = String(row[1]).trim();
      const rrp = parseFloat(row[7]);
      if (!isNaN(rrp) && rrp > 0) {
        ausRrpMap[code] = rrp;
      }
    }
  }
  console.log(`Loaded ${Object.keys(ausRrpMap).length} products from Ausganica catalogue`);
  console.log(`Loaded ${Object.keys(BASE_SOAPS_RRP).length} products from Base Soaps`);
  console.log(`Loaded ${Object.keys(MANUAL_RRP).length} manual entries\n`);

  // Process updates
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const updates = { biologika: 0, ecologic: 0, ausganica: 0, baseSoaps: 0, manual: 0 };

  for (const ep of elevateProducts) {
    const rawSku = ep.sku ? ep.sku.trim() : '';
    const sku = stripKikPrefix(rawSku);
    const vendor = (ep.vendor || '').toLowerCase();
    let rrp = null;
    let source = null;

    // Try Biologika/EcoLogic from BOO
    if (vendor.includes('biologika') || vendor.includes('ecologic')) {
      if (booRrpMap[sku]) {
        rrp = booRrpMap[sku];
        source = vendor.includes('biologika') ? 'boo_biologika' : 'boo_ecologic';
        updates[vendor.includes('biologika') ? 'biologika' : 'ecologic']++;
      }
    }

    // Try Ausganica
    if (!rrp && vendor.includes('ausganica')) {
      if (ausRrpMap[rawSku]) {
        rrp = ausRrpMap[rawSku];
        source = 'ausganica_catalogue';
        updates.ausganica++;
      } else if (ausRrpMap[sku]) {
        rrp = ausRrpMap[sku];
        source = 'ausganica_catalogue';
        updates.ausganica++;
      } else if (MANUAL_RRP[sku]) {
        rrp = MANUAL_RRP[sku];
        source = 'manual';
        updates.manual++;
      }
    }

    // Try Base Soaps
    if (!rrp && vendor.includes('base')) {
      if (BASE_SOAPS_RRP[sku]) {
        rrp = BASE_SOAPS_RRP[sku];
        source = 'base_soaps_pdf';
        updates.baseSoaps++;
      }
    }

    // Update if we found an RRP
    if (rrp) {
      const { error: updateError } = await supabase
        .from('elevate_products')
        .update({ rrp, rrp_source: source })
        .eq('id', ep.id);

      if (updateError) {
        console.error(`  Error: ${ep.sku} - ${updateError.message}`);
        errors++;
      } else {
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log('='.repeat(70));
  console.log('UPDATE COMPLETE');
  console.log('='.repeat(70));
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log();
  console.log('By source:');
  console.log(`  Biologika:  ${updates.biologika}`);
  console.log(`  EcoLogic:   ${updates.ecologic}`);
  console.log(`  Ausganica:  ${updates.ausganica}`);
  console.log(`  Base Soaps: ${updates.baseSoaps}`);
  console.log(`  Manual:     ${updates.manual}`);

  if (updated > 0) {
    console.log('\nNext step:');
    console.log('  node scripts/sync-rrp-to-elevate-shopify.js --dry-run');
  }
}

main().catch(console.error);
