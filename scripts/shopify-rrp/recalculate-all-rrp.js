#!/usr/bin/env node
/**
 * Recalculate ALL RRPs for Elevate Products
 *
 * Formula: RRP = wholesale_price / 0.60 (40% margin for retailer)
 * Rounding: Round to nearest $X.95
 *
 * Usage:
 *   node scripts/recalculate-all-rrp.js           # Preview only
 *   node scripts/recalculate-all-rrp.js --apply   # Apply changes
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const MARGIN = 0.40; // 40% margin for retailer
const APPLY = process.argv.includes('--apply');

function calculateRRP(wholesalePrice) {
  // RRP = wholesale / (1 - margin)
  const rawRRP = wholesalePrice / (1 - MARGIN);

  // Round to nearest $.95
  // Logic: Find the nearest X.95 value
  // e.g., 11.33 -> 11.95 (round up)
  // e.g., 11.80 -> 11.95 (round up)
  // e.g., 12.10 -> 11.95 (round down)
  // e.g., 12.50 -> 12.95 (round up)

  const basePrice = Math.floor(rawRRP);
  const cents = rawRRP - basePrice;

  let rounded;
  if (cents < 0.45) {
    // Round down to previous .95
    rounded = basePrice - 0.05;
  } else {
    // Round up to this .95
    rounded = basePrice + 0.95;
  }

  // Ensure result is at least greater than wholesale (minimum viable RRP)
  if (rounded <= wholesalePrice) {
    rounded = basePrice + 0.95;
  }

  return Math.round(rounded * 100) / 100;
}

async function main() {
  console.log('='.repeat(60));
  console.log('RECALCULATE ALL RRPs');
  console.log('='.repeat(60));
  console.log(`Target Margin: ${MARGIN * 100}%`);
  console.log(`Rounding: to nearest $X.95`);
  console.log(`Mode: ${APPLY ? 'APPLY CHANGES' : 'PREVIEW ONLY'}`);
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

  // Calculate new RRPs
  const updates = [];
  let unchanged = 0;
  let toUpdate = 0;

  for (const p of products) {
    const wholesale = parseFloat(p.wholesale_price);
    const newRRP = calculateRRP(wholesale);
    const currentRRP = p.rrp ? parseFloat(p.rrp) : null;

    // Check if update needed
    if (currentRRP !== newRRP) {
      toUpdate++;
      updates.push({
        id: p.id,
        sku: p.sku,
        vendor: p.vendor,
        wholesale,
        currentRRP,
        newRRP,
        margin: ((newRRP - wholesale) / newRRP * 100).toFixed(1) + '%'
      });
    } else {
      unchanged++;
    }
  }

  console.log(`\nUnchanged: ${unchanged}`);
  console.log(`To update: ${toUpdate}`);

  // Show sample updates
  console.log('\n' + '='.repeat(60));
  console.log('SAMPLE UPDATES');
  console.log('='.repeat(60));

  updates.slice(0, 20).forEach(u => {
    const change = u.currentRRP ? `$${u.currentRRP} -> $${u.newRRP}` : `(none) -> $${u.newRRP}`;
    console.log(`  ${u.sku}: $${u.wholesale} | RRP ${change} (${u.margin})`);
  });

  if (updates.length > 20) {
    console.log(`  ... and ${updates.length - 20} more`);
  }

  // Group by vendor for summary
  const byVendor = {};
  updates.forEach(u => {
    byVendor[u.vendor] = (byVendor[u.vendor] || 0) + 1;
  });

  console.log('\n' + '='.repeat(60));
  console.log('BY VENDOR');
  console.log('='.repeat(60));
  Object.entries(byVendor).sort((a, b) => b[1] - a[1]).forEach(([vendor, count]) => {
    console.log(`  ${vendor}: ${count} products`);
  });

  // Apply changes if requested
  if (APPLY && updates.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('APPLYING CHANGES...');
    console.log('='.repeat(60));

    let success = 0;
    let errors = 0;

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);

      for (const u of batch) {
        const { error: updateError } = await supabase
          .from('elevate_products')
          .update({
            rrp: u.newRRP,
            rrp_source: 'calculated_40pct',
            updated_at: new Date().toISOString()
          })
          .eq('id', u.id);

        if (updateError) {
          console.error(`  Error updating ${u.sku}: ${updateError.message}`);
          errors++;
        } else {
          success++;
        }
      }

      // Progress
      console.log(`  Processed ${Math.min(i + batchSize, updates.length)}/${updates.length}`);
    }

    console.log(`\nDone: ${success} updated, ${errors} errors`);
  } else if (!APPLY && updates.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('To apply these changes, run:');
    console.log('  node scripts/recalculate-all-rrp.js --apply');
    console.log('='.repeat(60));
  }
}

main().catch(console.error);
