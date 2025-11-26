#!/usr/bin/env node

/**
 * SYNC STOCK STATUS TO PRODUCT-SUPPLIER LINKS
 *
 * Updates the product_supplier_links table with current stock levels
 * from supplier_products. Stores stock info in notes JSON field.
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

async function syncStockToLinks() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         SYNC STOCK STATUS TO LINKS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  // Fetch all links with supplier data
  console.log('Fetching links with supplier data...');

  const PAGE_SIZE = 1000;
  let allLinks = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('product_supplier_links')
      .select(`
        id,
        supplier_product_id,
        supplier_name,
        supplier_products!inner(
          stock_level,
          availability
        )
      `)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    allLinks = allLinks.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;
  }

  console.log(`Found ${allLinks.length} links to update\n`);

  // Pre-count stock status
  let inStock = 0;
  let outOfStock = 0;
  for (const link of allLinks) {
    if ((link.supplier_products.stock_level || 0) > 0) inStock++;
    else outOfStock++;
  }
  console.log(`Stock Status: ${inStock} in stock, ${outOfStock} out of stock\n`);

  // Update using parallel batches
  console.log('Updating links...');
  let updated = 0;
  let errors = 0;
  const BATCH_SIZE = 50;
  const now = new Date().toISOString();

  for (let i = 0; i < allLinks.length; i += BATCH_SIZE) {
    const batch = allLinks.slice(i, i + BATCH_SIZE);

    const updates = batch.map(link => {
      const stockLevel = link.supplier_products.stock_level || 0;
      const availability = link.supplier_products.availability || 'unknown';

      return supabase
        .from('product_supplier_links')
        .update({
          notes: { stock_level: stockLevel, availability, in_stock: stockLevel > 0, last_sync: now },
          updated_at: now
        })
        .eq('id', link.id)
        .then(({ error }) => error ? errors++ : updated++);
    });

    await Promise.all(updates);

    if ((i + BATCH_SIZE) % 1000 < BATCH_SIZE || i + BATCH_SIZE >= allLinks.length) {
      console.log(`  ${Math.min(i + BATCH_SIZE, allLinks.length)}/${allLinks.length}`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SYNC SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`  Links updated:   ${updated}`);
  console.log(`  In Stock:        ${inStock}`);
  console.log(`  Out of Stock:    ${outOfStock}`);
  console.log(`  Errors:          ${errors}`);
  console.log(`  Duration:        ${duration}s\n`);

  console.log(errors === 0 ? '✅ All links updated!' : `⚠️  ${errors} error(s)`);

  return { updated, inStock, outOfStock, errors };
}

module.exports = { syncStockToLinks };

if (require.main === module) {
  syncStockToLinks().catch(e => { console.error('Error:', e.message); process.exit(1); });
}
