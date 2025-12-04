#!/usr/bin/env node

/**
 * BC AVAILABILITY UPDATER
 *
 * Compares supplier stock in Supabase with BigCommerce product availability
 * and updates BC products that need status changes.
 *
 * Logic:
 * - If supplier has stock AND BC is not "available" → Update BC to "available"
 * - If supplier has NO stock AND BC is "available" → Update BC to "disabled"
 */

// Load dotenv only if available (for local dev)
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
} catch (e) {
  // Environment variables provided by App Platform
}
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Supabase connection
const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

// BigCommerce API config
const BC_STORE_HASH = process.env.BC_STORE_HASH || 'hhhi';
const BC_ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN || 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';
const BC_API_URL = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3`;

// Rate limiting
const RATE_LIMIT_DELAY = 250; // ms between API calls
const BATCH_SIZE = 10; // Process in batches

// BigCommerce API helper
async function bcRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BC_API_URL}${endpoint}`,
    headers: {
      'X-Auth-Token': BC_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (data) {
    config.data = data;
  }

  const response = await axios(config);
  return response.data;
}

// Update a single BC product
async function updateBCProduct(productId, updates) {
  try {
    await bcRequest('PUT', `/catalog/products/${productId}`, updates);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.title || error.message
    };
  }
}

// Fetch all linked products with their supplier stock
async function fetchLinkedProducts() {
  const PAGE_SIZE = 1000;
  let allResults = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('product_supplier_links')
      .select(`
        id,
        ecommerce_product_id,
        supplier_product_id,
        supplier_name,
        is_active,
        ecommerce_products!inner(
          id,
          product_id,
          sku,
          name,
          availability,
          inventory_level,
          is_visible
        ),
        supplier_products!inner(
          id,
          supplier_sku,
          stock_level,
          availability,
          product_name
        )
      `)
      .eq('is_active', true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    allResults = allResults.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;
  }

  return allResults;
}

// Determine what availability update is needed
function determineUpdate(link) {
  const supplierStock = link.supplier_products.stock_level || 0;
  const supplierAvailability = link.supplier_products.availability;
  const bcAvailability = link.ecommerce_products.availability;
  const bcInventory = link.ecommerce_products.inventory_level || 0;

  // Supplier has stock but BC is not available
  if (supplierStock > 0 && bcAvailability !== 'available') {
    return {
      action: 'enable',
      updates: {
        availability: 'available'
      },
      reason: `Supplier has ${supplierStock} in stock, BC was "${bcAvailability}"`
    };
  }

  // Supplier has no stock but BC is available
  if (supplierStock === 0 && bcAvailability === 'available') {
    return {
      action: 'disable',
      updates: {
        availability: 'disabled'
      },
      reason: `Supplier out of stock (${supplierAvailability}), BC was "available"`
    };
  }

  return null; // No update needed
}

// Main update function
async function updateBCAvailability(dryRun = false) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         BC AVAILABILITY UPDATER                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  // Fetch all linked products
  console.log('Fetching linked products from Supabase...');
  const links = await fetchLinkedProducts();
  console.log(`Found ${links.length} active product-supplier links\n`);

  // Analyze what needs updating
  const updates = {
    enable: [],
    disable: [],
    noChange: []
  };

  for (const link of links) {
    const update = determineUpdate(link);

    if (update) {
      const item = {
        link,
        ...update,
        bcProductId: link.ecommerce_products.product_id,
        sku: link.ecommerce_products.sku,
        name: link.ecommerce_products.name
      };

      if (update.action === 'enable') {
        updates.enable.push(item);
      } else {
        updates.disable.push(item);
      }
    } else {
      updates.noChange.push(link);
    }
  }

  // Summary
  console.log('Analysis Complete:');
  console.log(`  Products to ENABLE:  ${updates.enable.length}`);
  console.log(`  Products to DISABLE: ${updates.disable.length}`);
  console.log(`  No change needed:    ${updates.noChange.length}\n`);

  if (updates.enable.length === 0 && updates.disable.length === 0) {
    console.log('✅ All products are already in sync with supplier stock!');
    return { enabled: 0, disabled: 0, errors: 0 };
  }

  // Show samples
  if (updates.enable.length > 0) {
    console.log('Sample products to ENABLE:');
    updates.enable.slice(0, 5).forEach(item => {
      console.log(`  [${item.sku}] ${item.name?.substring(0, 40)}`);
      console.log(`    Reason: ${item.reason}`);
    });
    if (updates.enable.length > 5) {
      console.log(`  ... and ${updates.enable.length - 5} more`);
    }
    console.log('');
  }

  if (updates.disable.length > 0) {
    console.log('Sample products to DISABLE:');
    updates.disable.slice(0, 5).forEach(item => {
      console.log(`  [${item.sku}] ${item.name?.substring(0, 40)}`);
      console.log(`    Reason: ${item.reason}`);
    });
    if (updates.disable.length > 5) {
      console.log(`  ... and ${updates.disable.length - 5} more`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('DRY RUN - No changes made.\n');
    console.log('Run with --live flag to apply changes.');
    return { enabled: updates.enable.length, disabled: updates.disable.length, errors: 0, dryRun: true };
  }

  // Apply updates to BigCommerce
  console.log('Applying updates to BigCommerce...\n');

  let enabledCount = 0;
  let disabledCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process ENABLE updates
  console.log(`Enabling ${updates.enable.length} products...`);
  for (let i = 0; i < updates.enable.length; i++) {
    const item = updates.enable[i];

    const result = await updateBCProduct(item.bcProductId, item.updates);

    if (result.success) {
      enabledCount++;
    } else {
      errorCount++;
      errors.push({ sku: item.sku, action: 'enable', error: result.error });
    }

    // Progress update every 50 products
    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/${updates.enable.length} (${enabledCount} enabled, ${errorCount} errors)`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // Process DISABLE updates
  console.log(`\nDisabling ${updates.disable.length} products...`);
  for (let i = 0; i < updates.disable.length; i++) {
    const item = updates.disable[i];

    const result = await updateBCProduct(item.bcProductId, item.updates);

    if (result.success) {
      disabledCount++;
    } else {
      errorCount++;
      errors.push({ sku: item.sku, action: 'disable', error: result.error });
    }

    // Progress update every 50 products
    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/${updates.disable.length} (${disabledCount} disabled, ${errorCount} errors)`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // Update local database to match
  console.log('\nUpdating Supabase ecommerce_products...');
  for (const item of updates.enable) {
    await supabase
      .from('ecommerce_products')
      .update({ availability: 'available', updated_at: new Date().toISOString() })
      .eq('id', item.link.ecommerce_product_id);
  }
  for (const item of updates.disable) {
    await supabase
      .from('ecommerce_products')
      .update({ availability: 'disabled', updated_at: new Date().toISOString() })
      .eq('id', item.link.ecommerce_product_id);
  }

  // Log to automation_logs
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  try {
    await supabase.from('automation_logs').insert({
      workflow_name: 'bc-availability-update',
      status: errorCount === 0 ? 'success' : 'partial_failure',
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: parseFloat(duration),
      metadata: {
        enabled: enabledCount,
        disabled: disabledCount,
        errors: errorCount,
        error_details: errors.slice(0, 20) // First 20 errors
      }
    });
  } catch (err) {
    // Table might not exist
  }

  // Final summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    UPDATE SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`  Products ENABLED:  ${enabledCount}`);
  console.log(`  Products DISABLED: ${disabledCount}`);
  console.log(`  Errors:            ${errorCount}`);
  console.log(`  Duration:          ${duration}s\n`);

  if (errors.length > 0) {
    console.log('Errors (first 10):');
    errors.slice(0, 10).forEach(e => {
      console.log(`  [${e.sku}] ${e.action}: ${e.error}`);
    });
    console.log('');
  }

  if (errorCount === 0) {
    console.log('✅ All updates completed successfully!');
  } else {
    console.log(`⚠️  Completed with ${errorCount} error(s)`);
  }

  console.log(`\nCompleted at: ${new Date().toISOString()}\n`);

  return { enabled: enabledCount, disabled: disabledCount, errors: errorCount };
}

// Export for use in cron
module.exports = { updateBCAvailability };

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');

  if (dryRun) {
    console.log('\n⚠️  Running in DRY RUN mode (no changes will be made)');
    console.log('    Use --live flag to apply changes\n');
  }

  updateBCAvailability(dryRun).catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}
