#!/usr/bin/env node

/**
 * BC AVAILABILITY UPDATER (Enhanced with Business Rules)
 *
 * Compares supplier stock in Supabase with BigCommerce product availability
 * and updates BC products that need status changes.
 *
 * BUSINESS RULES:
 * 1. UHP/Oborne/Kadac: stock > 0 → inventory = 1000, availability = available
 * 2. UHP/Oborne/Kadac: stock = 0 → inventory = 0, availability = disabled
 * 3. Sale items (sale_price > 0 or SKU starts with "Copy of"): SKIP - respect existing inventory
 * 4. Unleashed/Elevate: Always respect actual stock levels
 * 5. Normal products: sale_price must not exceed 8% below RRP (warning only)
 */

// Load environment variables from multiple possible locations
const dotenv = require('dotenv');
const pathModule = require('path');

const envPaths = [
  pathModule.join(__dirname, '../.env'),
  pathModule.join(__dirname, '../../.env'),
  '/var/www/master-ops/.env',
  pathModule.join(__dirname, '../MASTER-CREDENTIALS-COMPLETE.env')
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Supabase connection
const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

// BigCommerce API config (check multiple env var naming conventions)
const BC_STORE_HASH = process.env.BC_BOO_STORE_HASH || process.env.BOO_BC_STORE_HASH || process.env.BC_STORE_HASH || 'hhhi';
const BC_ACCESS_TOKEN = process.env.BC_BOO_ACCESS_TOKEN || process.env.BOO_BC_ACCESS_TOKEN || process.env.BC_ACCESS_TOKEN || 'a96rfpx8xvhkb23h7esqy3y1i0jynpt';
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

// Supplier-specific rules
const SUPPLIER_RULES = {
  // UHP/Oborne/Kadac: stock > 0 → inventory = 1000
  uhp: { inventoryWhenInStock: 1000, respectActualStock: false },
  oborne: { inventoryWhenInStock: 1000, respectActualStock: false },
  kadac: { inventoryWhenInStock: 1000, respectActualStock: false },
  // Unleashed/Elevate: respect actual stock levels
  unleashed: { inventoryWhenInStock: null, respectActualStock: true },
  elevate: { inventoryWhenInStock: null, respectActualStock: true }
};

// Check if product is a sale item (should be skipped)
function isSaleItem(bcProduct) {
  const sku = (bcProduct.sku || '').toLowerCase();
  const salePrice = bcProduct.sale_price || 0;

  // Sale item if:
  // 1. sale_price > 0 (has an active sale)
  // 2. SKU starts with "copy of" (clearance/sale copy)
  // 3. SKU contains "sale" (sale item marker)
  return salePrice > 0 || sku.startsWith('copy of') || sku.includes('sale');
}

// Check margin protection (8% max discount for normal products)
function checkMarginProtection(bcProduct) {
  const salePrice = bcProduct.sale_price || 0;
  const rrp = bcProduct.price || 0;

  // Only check if sale price is set and RRP is valid
  if (salePrice === 0 || rrp <= 0) {
    return { valid: true };
  }

  // Calculate discount percentage
  const discount = ((rrp - salePrice) / rrp) * 100;

  if (discount > 8) {
    return {
      valid: false,
      discount: discount.toFixed(1),
      message: `Sale price ${salePrice} is ${discount.toFixed(1)}% below RRP ${rrp} (max 8%)`
    };
  }

  return { valid: true, discount: discount.toFixed(1) };
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
          is_visible,
          price,
          sale_price
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

// Determine what availability update is needed (enhanced with business rules)
function determineUpdate(link) {
  const supplierStock = link.supplier_products.stock_level || 0;
  const supplierName = (link.supplier_name || '').toLowerCase();
  const bcProduct = link.ecommerce_products;
  const bcAvailability = bcProduct.availability;
  const bcInventory = bcProduct.inventory_level || 0;

  // RULE 1: Sale items - SKIP (respect existing inventory)
  if (isSaleItem(bcProduct)) {
    return {
      action: 'skip',
      reason: `Sale item (sale_price=${bcProduct.sale_price}, sku=${bcProduct.sku}) - keeping current inventory`,
      skipReason: 'sale_item'
    };
  }

  // Get supplier-specific rules
  const rules = SUPPLIER_RULES[supplierName] || { respectActualStock: true };

  // Determine target inventory based on supplier rules
  let targetInventory;
  if (rules.respectActualStock) {
    // Unleashed/Elevate: use actual stock level
    targetInventory = supplierStock;
  } else {
    // UHP/Oborne/Kadac: 1000 if in stock, 0 if out
    targetInventory = supplierStock > 0 ? rules.inventoryWhenInStock : 0;
  }

  // Determine target availability
  const targetAvailability = targetInventory > 0 ? 'available' : 'disabled';

  // Check if update is needed
  const needsAvailabilityUpdate = bcAvailability !== targetAvailability;
  const needsInventoryUpdate = bcInventory !== targetInventory;

  if (!needsAvailabilityUpdate && !needsInventoryUpdate) {
    return null; // No update needed
  }

  // Build update object
  const updates = {};
  if (needsAvailabilityUpdate) {
    updates.availability = targetAvailability;
  }
  if (needsInventoryUpdate) {
    updates.inventory_level = targetInventory;
  }

  // Determine action type
  let action;
  if (targetInventory > 0 && bcAvailability !== 'available') {
    action = 'enable';
  } else if (targetInventory === 0 && bcAvailability === 'available') {
    action = 'disable';
  } else {
    action = 'update';
  }

  return {
    action,
    updates,
    reason: `${supplierName}: stock=${supplierStock} → inventory=${targetInventory}, availability=${targetAvailability}`,
    supplierName,
    targetInventory,
    targetAvailability
  };
}

// Main update function
async function updateBCAvailability(dryRun = false) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    BC AVAILABILITY UPDATER (Enhanced with Business Rules)  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  console.log('Business Rules Applied:');
  console.log('  • UHP/Oborne/Kadac: stock > 0 → inventory = 1000');
  console.log('  • Unleashed/Elevate: respect actual stock levels');
  console.log('  • Sale items (sale_price > 0 or SKU "Copy of"): SKIP');
  console.log('  • 8% margin protection: warning if exceeded\n');

  const startTime = Date.now();

  // Fetch all linked products
  console.log('Fetching linked products from Supabase...');
  const links = await fetchLinkedProducts();
  console.log(`Found ${links.length} active product-supplier links\n`);

  // Analyze what needs updating
  const updates = {
    enable: [],
    disable: [],
    update: [],
    skip: [],
    noChange: [],
    marginWarnings: []
  };

  for (const link of links) {
    const update = determineUpdate(link);
    const bcProduct = link.ecommerce_products;

    // Check margin protection for all products (warning only)
    const marginCheck = checkMarginProtection(bcProduct);
    if (!marginCheck.valid) {
      updates.marginWarnings.push({
        sku: bcProduct.sku,
        name: bcProduct.name,
        ...marginCheck
      });
    }

    if (!update) {
      updates.noChange.push(link);
      continue;
    }

    const item = {
      link,
      ...update,
      bcProductId: bcProduct.product_id,
      sku: bcProduct.sku,
      name: bcProduct.name
    };

    if (update.action === 'skip') {
      updates.skip.push(item);
    } else if (update.action === 'enable') {
      updates.enable.push(item);
    } else if (update.action === 'disable') {
      updates.disable.push(item);
    } else {
      updates.update.push(item);
    }
  }

  // Summary
  console.log('Analysis Complete:');
  console.log(`  Products to ENABLE:  ${updates.enable.length}`);
  console.log(`  Products to DISABLE: ${updates.disable.length}`);
  console.log(`  Products to UPDATE:  ${updates.update.length}`);
  console.log(`  Products SKIPPED:    ${updates.skip.length} (sale items)`);
  console.log(`  No change needed:    ${updates.noChange.length}`);
  console.log(`  Margin warnings:     ${updates.marginWarnings.length}\n`);

  // Show margin warnings
  if (updates.marginWarnings.length > 0) {
    console.log('⚠️  MARGIN WARNINGS (sale_price > 8% below RRP):');
    updates.marginWarnings.slice(0, 10).forEach(w => {
      console.log(`  [${w.sku}] ${w.name?.substring(0, 35)} - ${w.discount}% discount`);
    });
    if (updates.marginWarnings.length > 10) {
      console.log(`  ... and ${updates.marginWarnings.length - 10} more`);
    }
    console.log('');
  }

  // Show skipped items
  if (updates.skip.length > 0) {
    console.log('Sale items SKIPPED (inventory preserved):');
    updates.skip.slice(0, 5).forEach(item => {
      console.log(`  [${item.sku}] ${item.name?.substring(0, 40)}`);
    });
    if (updates.skip.length > 5) {
      console.log(`  ... and ${updates.skip.length - 5} more`);
    }
    console.log('');
  }

  const allUpdates = [...updates.enable, ...updates.disable, ...updates.update];

  if (allUpdates.length === 0) {
    console.log('✅ All products are already in sync with supplier stock!');
    console.log(`   (${updates.skip.length} sale items skipped as expected)\n`);
    return { enabled: 0, disabled: 0, updated: 0, skipped: updates.skip.length, errors: 0 };
  }

  // Show samples
  if (updates.enable.length > 0) {
    console.log('Sample products to ENABLE:');
    updates.enable.slice(0, 5).forEach(item => {
      console.log(`  [${item.sku}] ${item.name?.substring(0, 40)}`);
      console.log(`    ${item.reason}`);
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
      console.log(`    ${item.reason}`);
    });
    if (updates.disable.length > 5) {
      console.log(`  ... and ${updates.disable.length - 5} more`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('DRY RUN - No changes made.\n');
    console.log('Run with --live flag to apply changes.');
    return {
      enabled: updates.enable.length,
      disabled: updates.disable.length,
      updated: updates.update.length,
      skipped: updates.skip.length,
      marginWarnings: updates.marginWarnings.length,
      errors: 0,
      dryRun: true
    };
  }

  // Apply updates to BigCommerce
  console.log('Applying updates to BigCommerce...\n');

  let enabledCount = 0;
  let disabledCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process ENABLE updates
  if (updates.enable.length > 0) {
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
  }

  // Process DISABLE updates
  if (updates.disable.length > 0) {
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
  }

  // Process inventory-only updates
  if (updates.update.length > 0) {
    console.log(`\nUpdating inventory for ${updates.update.length} products...`);
    for (let i = 0; i < updates.update.length; i++) {
      const item = updates.update[i];

      const result = await updateBCProduct(item.bcProductId, item.updates);

      if (result.success) {
        updatedCount++;
      } else {
        errorCount++;
        errors.push({ sku: item.sku, action: 'update', error: result.error });
      }

      // Progress update every 50 products
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${updates.update.length} (${updatedCount} updated, ${errorCount} errors)`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  // Update local database to match
  console.log('\nUpdating Supabase ecommerce_products...');

  // Update enabled products
  for (const item of updates.enable) {
    const updateData = {
      availability: 'available',
      updated_at: new Date().toISOString()
    };
    if (item.targetInventory !== undefined) {
      updateData.inventory_level = item.targetInventory;
    }
    await supabase
      .from('ecommerce_products')
      .update(updateData)
      .eq('id', item.link.ecommerce_product_id);
  }

  // Update disabled products
  for (const item of updates.disable) {
    await supabase
      .from('ecommerce_products')
      .update({
        availability: 'disabled',
        inventory_level: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.link.ecommerce_product_id);
  }

  // Update inventory-only products
  for (const item of updates.update) {
    const updateData = {
      updated_at: new Date().toISOString()
    };
    if (item.targetInventory !== undefined) {
      updateData.inventory_level = item.targetInventory;
    }
    if (item.targetAvailability) {
      updateData.availability = item.targetAvailability;
    }
    await supabase
      .from('ecommerce_products')
      .update(updateData)
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
        updated: updatedCount,
        skipped: updates.skip.length,
        marginWarnings: updates.marginWarnings.length,
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
  console.log(`  Products UPDATED:  ${updatedCount}`);
  console.log(`  Products SKIPPED:  ${updates.skip.length} (sale items)`);
  console.log(`  Margin Warnings:   ${updates.marginWarnings.length}`);
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

  return {
    enabled: enabledCount,
    disabled: disabledCount,
    updated: updatedCount,
    skipped: updates.skip.length,
    marginWarnings: updates.marginWarnings.length,
    errors: errorCount
  };
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
