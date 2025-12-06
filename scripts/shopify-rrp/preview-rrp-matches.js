#!/usr/bin/env node
/**
 * Preview RRP matches from source files to Elevate products
 * Shows what would be updated WITHOUT making changes
 */

const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const credsPath = path.join(__dirname, '..', 'creds.js');
const creds = require(credsPath);

// Base Soaps data extracted from PDF
const BASE_SOAPS_DATA = {
  'BBLM': { name: 'Bar Box Lemon Myrtle', rrp: 7.70 },
  'BBCR': { name: 'Bar Box Cedarwood Rosemary', rrp: 7.70 },
  'BBGPC': { name: 'Bar Box Geranium and Pink Clay', rrp: 7.70 },
  'BBMW': { name: 'Bar Box Mintwood', rrp: 7.70 },
  'BBCC': { name: 'Bar Box Coconut Castile', rrp: 7.70 },
  'BBLAV': { name: 'Bar Box Lavender and Green Clay', rrp: 7.70 },
  'BBCBB': { name: 'Bar Box Cocoa Body Bar', rrp: 9.00 },
  'BBFACER': { name: 'Bar Box Facial Revitalising (pink)', rrp: 10.00 },
  'BBFACED': { name: 'Bar Box Facial Detox (charcoal)', rrp: 10.00 },
  'BBSH': { name: 'Bar Box Shampoo', rrp: 12.00 },
  'BBSC': { name: 'Bar Box Shampoo Cleansing', rrp: 12.00 },
  'BBSM': { name: 'Bar Box Shampoo Moisturising', rrp: 12.00 },
  'BBCONLO': { name: 'Bar Box Conditioner Lav/Orange', rrp: 17.60 },
  '10BBLM': { name: '10 Pack Lemon Myrtle soap bar', rrp: 69.30 },
  '10BBCR': { name: '10 Pack Cedarwood Rosemary soap bar', rrp: 69.30 },
  '10BBGPC': { name: '10 Pack Geranium and Pink Clay soap bar', rrp: 69.30 },
  '10BBMW': { name: '10 Pack Mintwood soap bar', rrp: 69.30 },
  '10BBCC': { name: '10 Pack Coconut Castile soap bar', rrp: 69.30 },
  '10BBLAV': { name: '10 Pack Lavender and Green Clay soap bar', rrp: 69.30 },
  '10BBCONLO': { name: '10 Pack Conditioner bar Lav/Orange', rrp: 160.00 },
  '10BBSH': { name: '10 Pack Shampoo bar', rrp: 110.00 },
  '10BBSC': { name: '10 Pack Shampoo bar Cleansing', rrp: 110.00 },
  '10BBSM': { name: '10 Pack Shampoo bar Moisturising', rrp: 110.00 },
  'TINSH': { name: 'Shaving soap tin 100g', rrp: 50.00 },
  'L250CR': { name: '250ml Cedarwood Rosemary hand wash', rrp: 17.60 },
  'L250LM': { name: '250ml Lemon Myrtle hand wash', rrp: 17.60 },
  'LBW250SM': { name: '250ml Snowy Mountain body wash', rrp: 17.60 },
  'LBW250SC': { name: '250ml South Coast body wash', rrp: 17.60 },
  'L1CR': { name: '1L Cedarwood Rosemary hand wash', rrp: 34.00 },
  'L1LM': { name: '1L Lemon Myrtle hand wash', rrp: 34.00 },
  'LBW1SM': { name: '1L Snowy Mountain body wash', rrp: 34.00 },
  'LBW1SC': { name: '1L South Coast body wash', rrp: 34.00 },
  'L5CR': { name: '5L refill Cedarwood Rosemary hand wash', rrp: 160.00 },
  'L5LM': { name: '5L refill Lemon Myrtle hand wash', rrp: 160.00 },
  'LBW5SM': { name: '5L refill Snowy Mountain body wash', rrp: 160.00 },
  'LBW5SC': { name: '5L refill South Coast body wash', rrp: 160.00 },
  'L5US': { name: '5L Unscented Castile soap', rrp: 88.00 }
};

async function main() {
  console.log('='.repeat(70));
  console.log('PREVIEW RRP MATCHES - NO CHANGES WILL BE MADE');
  console.log('='.repeat(70));
  console.log();

  // Get Supabase credentials
  const [supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all Elevate products
  const { data: elevateProducts, error } = await supabase
    .from('elevate_products')
    .select('id, sku, title, variant_title, vendor, wholesale_price, rrp')
    .is('rrp', null);

  if (error) throw error;
  console.log(`Found ${elevateProducts.length} Elevate products needing RRP\n`);

  // Load BOO Excel for Biologika/EcoLogic
  const booPath = path.join(__dirname, '..', 'BOO Martin & Pleasance Order 24th nov (1).xlsx');
  const boo = XLSX.readFile(booPath);
  const booSheet = boo.Sheets[boo.SheetNames[0]];
  const booData = XLSX.utils.sheet_to_json(booSheet, { header: 1 });

  // Build BOO RRP map (Code -> { brand, desc, rrp })
  const booRrpMap = {};
  for (let i = 6; i < booData.length; i++) {
    const row = booData[i];
    if (row && row[0] && row[4]) {
      const code = String(row[0]).trim();
      const brand = String(row[1] || '').trim();
      const desc = String(row[2] || '').trim();
      const rrp = parseFloat(row[4]);
      if (!isNaN(rrp) && rrp > 0) {
        booRrpMap[code] = { brand, desc, rrp };
      }
    }
  }
  console.log(`Loaded ${Object.keys(booRrpMap).length} products from BOO pricelist`);

  // Load Ausganica Excel
  const ausPath = path.join(__dirname, '..', 'Ausganica_Product_Catalogue&OrderForm_Wholesale 2025 (1).xlsx');
  const aus = XLSX.readFile(ausPath);
  const ausSheet = aus.Sheets['WS_Catalogue 2025'];
  const ausData = XLSX.utils.sheet_to_json(ausSheet, { header: 1 });

  // Build Ausganica RRP map (Code -> { product, rrp })
  const ausRrpMap = {};
  for (let i = 7; i < ausData.length; i++) {
    const row = ausData[i];
    if (row && row[1] && row[7]) {
      const code = String(row[1]).trim();
      const product = String(row[2] || '').trim();
      const rrp = parseFloat(row[7]);
      if (!isNaN(rrp) && rrp > 0) {
        ausRrpMap[code] = { product, rrp };
      }
    }
  }
  console.log(`Loaded ${Object.keys(ausRrpMap).length} products from Ausganica catalogue`);
  console.log(`Loaded ${Object.keys(BASE_SOAPS_DATA).length} products from Base Soaps PDF\n`);

  // Match and preview
  const matches = {
    biologika: [],
    ecologic: [],
    ausganica: [],
    baseSoaps: [],
    unmatched: []
  };

  // Helper to strip KIK prefix
  function stripKikPrefix(sku) {
    if (!sku) return '';
    return sku.replace(/^KIK\s*-\s*/i, '').trim();
  }

  for (const ep of elevateProducts) {
    const rawSku = ep.sku ? ep.sku.trim() : '';
    const sku = stripKikPrefix(rawSku); // SKU without KIK prefix
    const vendor = (ep.vendor || '').toLowerCase();
    let matched = false;

    // Try Biologika/EcoLogic from BOO
    if (vendor.includes('biologika') || vendor.includes('ecologic')) {
      // Try exact SKU match (with KIK stripped)
      if (booRrpMap[sku]) {
        const m = booRrpMap[sku];
        if (vendor.includes('biologika')) {
          matches.biologika.push({ elevate: ep, source: m });
        } else {
          matches.ecologic.push({ elevate: ep, source: m });
        }
        matched = true;
      }
    }

    // Try Ausganica - match both raw and stripped SKU
    if (vendor.includes('ausganica') && !matched) {
      if (ausRrpMap[rawSku]) {
        matches.ausganica.push({ elevate: ep, source: ausRrpMap[rawSku] });
        matched = true;
      } else if (ausRrpMap[sku]) {
        matches.ausganica.push({ elevate: ep, source: ausRrpMap[sku] });
        matched = true;
      }
    }

    // Try Base Soaps - match stripped SKU
    if (vendor.includes('base') && !matched) {
      if (BASE_SOAPS_DATA[sku]) {
        matches.baseSoaps.push({ elevate: ep, source: BASE_SOAPS_DATA[sku] });
        matched = true;
      }
    }

    if (!matched && ['biologika', 'ecologic', 'ausganica', 'base'].some(v => vendor.includes(v))) {
      matches.unmatched.push(ep);
    }
  }

  // Display results
  console.log('='.repeat(70));
  console.log('MATCH RESULTS');
  console.log('='.repeat(70));

  console.log('\n### BIOLOGIKA MATCHES ###');
  console.log(`Matched: ${matches.biologika.length}`);
  matches.biologika.slice(0, 5).forEach(m => {
    console.log(`  Elevate: ${m.elevate.title}`);
    console.log(`    SKU: ${m.elevate.sku} | Wholesale: $${m.elevate.wholesale_price}`);
    console.log(`    Source: ${m.source.desc} | RRP: $${m.source.rrp.toFixed(2)}`);
    console.log();
  });

  console.log('\n### ECOLOGIC MATCHES ###');
  console.log(`Matched: ${matches.ecologic.length}`);
  matches.ecologic.slice(0, 5).forEach(m => {
    console.log(`  Elevate: ${m.elevate.title}`);
    console.log(`    SKU: ${m.elevate.sku} | Wholesale: $${m.elevate.wholesale_price}`);
    console.log(`    Source: ${m.source.desc} | RRP: $${m.source.rrp.toFixed(2)}`);
    console.log();
  });

  console.log('\n### AUSGANICA MATCHES ###');
  console.log(`Matched: ${matches.ausganica.length}`);
  matches.ausganica.slice(0, 5).forEach(m => {
    console.log(`  Elevate: ${m.elevate.title}`);
    console.log(`    SKU: ${m.elevate.sku} | Wholesale: $${m.elevate.wholesale_price}`);
    console.log(`    Source: ${m.source.product} | RRP: $${m.source.rrp.toFixed(2)}`);
    console.log();
  });

  console.log('\n### BASE SOAPS MATCHES ###');
  console.log(`Matched: ${matches.baseSoaps.length}`);
  matches.baseSoaps.slice(0, 5).forEach(m => {
    console.log(`  Elevate: ${m.elevate.title}`);
    console.log(`    SKU: ${m.elevate.sku} | Wholesale: $${m.elevate.wholesale_price}`);
    console.log(`    Source: ${m.source.name} | RRP: $${m.source.rrp.toFixed(2)}`);
    console.log();
  });

  console.log('\n### UNMATCHED (from target brands) ###');
  console.log(`Unmatched: ${matches.unmatched.length}`);
  matches.unmatched.slice(0, 10).forEach(ep => {
    console.log(`  ${ep.vendor}: ${ep.title} (SKU: ${ep.sku})`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Biologika:  ${matches.biologika.length} matched`);
  console.log(`EcoLogic:   ${matches.ecologic.length} matched`);
  console.log(`Ausganica:  ${matches.ausganica.length} matched`);
  console.log(`Base Soaps: ${matches.baseSoaps.length} matched`);
  console.log(`Unmatched:  ${matches.unmatched.length}`);
  console.log(`\nTotal matchable: ${matches.biologika.length + matches.ecologic.length + matches.ausganica.length + matches.baseSoaps.length}`);
}

main().catch(console.error);
