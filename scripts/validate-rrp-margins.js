#!/usr/bin/env node
/**
 * Validate RRP Margins for Elevate Products
 *
 * Formula: RRP = wholesale_price / 0.60 (40% margin for retailer)
 * Rounding: Round to nearest $X.95
 *
 * Example: Wholesale $6.80 -> RRP = 6.80 / 0.60 = 11.33 -> rounds to $11.95
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const MARGIN = 0.40; // 40% margin for retailer
const ROUND_TO = 0.95; // Round to nearest $.95

function calculateRRP(wholesalePrice) {
  // RRP = wholesale / (1 - margin)
  const rawRRP = wholesalePrice / (1 - MARGIN);

  // Round to nearest $.95
  // e.g., 11.33 -> 11.95, 15.67 -> 15.95, 20.10 -> 19.95
  const basePrice = Math.floor(rawRRP);
  const cents = rawRRP - basePrice;

  let rounded;
  if (cents <= 0.475) {
    // Round down to X.95 of previous dollar
    rounded = basePrice - 0.05;
  } else {
    // Round up to X.95 of same dollar
    rounded = basePrice + 0.95;
  }

  // Handle edge case where result is negative
  if (rounded < wholesalePrice) {
    rounded = basePrice + 0.95;
  }

  return Math.round(rounded * 100) / 100;
}

function validateMargin(wholesalePrice, rrp) {
  // Actual margin = (RRP - wholesale) / RRP
  const actualMargin = (rrp - wholesalePrice) / rrp;
  return actualMargin;
}

async function main() {
  console.log('='.repeat(60));
  console.log('VALIDATE RRP MARGINS');
  console.log('='.repeat(60));
  console.log(`Target Margin: ${MARGIN * 100}%`);
  console.log(`Rounding: to nearest $X.95`);
  console.log();

  const [supabaseUrl, supabaseKey] = await Promise.all([
    creds.get('elevate', 'supabase_url'),
    creds.get('elevate', 'supabase_service_role_key')
  ]);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all products with wholesale_price
  const { data: products, error } = await supabase
    .from('elevate_products')
    .select('id, sku, title, vendor, wholesale_price, rrp')
    .not('wholesale_price', 'is', null)
    .order('vendor');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Total products with wholesale_price: ${products.length}`);

  // Categorize products
  const noRRP = [];
  const incorrectRRP = [];
  const correctRRP = [];

  for (const p of products) {
    const wholesale = parseFloat(p.wholesale_price);
    const expectedRRP = calculateRRP(wholesale);

    if (!p.rrp) {
      noRRP.push({ ...p, expectedRRP, wholesale });
    } else {
      const currentRRP = parseFloat(p.rrp);
      const currentMargin = validateMargin(wholesale, currentRRP);
      const expectedMargin = validateMargin(wholesale, expectedRRP);

      // Allow small tolerance for rounding differences
      if (Math.abs(currentRRP - expectedRRP) > 0.10) {
        incorrectRRP.push({
          ...p,
          wholesale,
          currentRRP,
          expectedRRP,
          currentMargin: (currentMargin * 100).toFixed(1) + '%',
          expectedMargin: (expectedMargin * 100).toFixed(1) + '%'
        });
      } else {
        correctRRP.push({ ...p, wholesale, currentRRP, margin: currentMargin });
      }
    }
  }

  // Report
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Correct RRP:   ${correctRRP.length} products`);
  console.log(`Incorrect RRP: ${incorrectRRP.length} products`);
  console.log(`Missing RRP:   ${noRRP.length} products`);

  // Show incorrect RRPs
  if (incorrectRRP.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('INCORRECT RRPs (need fixing)');
    console.log('='.repeat(60));
    incorrectRRP.slice(0, 20).forEach(p => {
      console.log(`  ${p.sku}: $${p.wholesale} -> RRP $${p.currentRRP} (${p.currentMargin})`);
      console.log(`           Should be: $${p.expectedRRP} (${p.expectedMargin})`);
    });
    if (incorrectRRP.length > 20) {
      console.log(`  ... and ${incorrectRRP.length - 20} more`);
    }
  }

  // Show sample of missing RRPs
  if (noRRP.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('MISSING RRPs (need calculation)');
    console.log('='.repeat(60));
    noRRP.slice(0, 10).forEach(p => {
      console.log(`  ${p.sku}: $${p.wholesale} -> should be RRP $${p.expectedRRP}`);
    });
    if (noRRP.length > 10) {
      console.log(`  ... and ${noRRP.length - 10} more`);
    }
  }

  // Show sample of correct RRPs
  if (correctRRP.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('SAMPLE CORRECT RRPs');
    console.log('='.repeat(60));
    correctRRP.slice(0, 5).forEach(p => {
      console.log(`  ${p.sku}: $${p.wholesale} -> RRP $${p.currentRRP} (${(p.margin * 100).toFixed(1)}% margin)`);
    });
  }

  // Return summary for next steps
  return {
    correct: correctRRP.length,
    incorrect: incorrectRRP.length,
    missing: noRRP.length,
    needsUpdate: [...incorrectRRP, ...noRRP]
  };
}

main().catch(console.error);
