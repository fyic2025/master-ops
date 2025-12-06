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

// Safety thresholds
const MAX_STALE_HOURS = 24; // Skip if supplier data is older than 24 hours
const MAX_DISABLE_COUNT = 500; // Stop if trying to disable more than 500 products at once
const ANOMALY_PERCENTAGE = 15; // Alert if >15% of products would be disabled

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

// Check if product is a clearance/sale item (should be skipped - manual inventory control)
function isClearanceItem(bcProduct) {
  // Use is_clearance field from database if available (preferred)
  if (bcProduct.is_clearance === true) {
    return true;
  }

  // Fallback to SKU check for backwards compatibility
  // Only skip products with explicit clearance markers in SKU:
  // 1. SKU starts with "copy of" - clearance copies with manual inventory
  // 2. SKU contains "sale" - explicit sale items
  // NOTE: sale_price > 0 alone does NOT make it a clearance item - that's just a normal discount
  const sku = (bcProduct.sku || '').toLowerCase();
  return sku.startsWith('copy of') || sku.includes('sale');
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

// Check supplier data freshness - returns stale suppliers
async function checkSupplierDataFreshness() {
  const staleThreshold = new Date(Date.now() - MAX_STALE_HOURS * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('supplier_products')
    .select('supplier_name, last_synced_at')
    .order('last_synced_at', { ascending: false });

  if (error) {
    console.error('Error checking supplier freshness:', error.message);
    return { stale: [], fresh: [] };
  }

  // Group by supplier, get most recent sync for each
  const supplierLastSync = {};
  for (const row of data) {
    if (!supplierLastSync[row.supplier_name]) {
      supplierLastSync[row.supplier_name] = new Date(row.last_synced_at);
    }
  }

  const stale = [];
  const fresh = [];

  for (const [supplier, lastSync] of Object.entries(supplierLastSync)) {
    const ageHours = ((Date.now() - lastSync.getTime()) / (1000 * 60 * 60)).toFixed(1);
    if (lastSync < staleThreshold) {
      stale.push({ supplier, lastSync: lastSync.toISOString(), ageHours });
    } else {
      fresh.push({ supplier, lastSync: lastSync.toISOString(), ageHours });
    }
  }

  return { stale, fresh };
}

// Anomaly detection - check if too many products would be disabled
function checkAnomalies(updates, totalLinks) {
  const warnings = [];

  // Check absolute count
  if (updates.disable.length > MAX_DISABLE_COUNT) {
    warnings.push({
      type: 'excessive_disable',
      severity: 'critical',
      message: `Would disable ${updates.disable.length} products (max ${MAX_DISABLE_COUNT}). This could indicate a supplier sync failure.`
    });
  }

  // Check percentage
  const disablePercentage = (updates.disable.length / totalLinks) * 100;
  if (disablePercentage > ANOMALY_PERCENTAGE) {
    warnings.push({
      type: 'high_disable_percentage',
      severity: 'warning',
      message: `Would disable ${disablePercentage.toFixed(1)}% of products (${updates.disable.length}/${totalLinks}). Threshold: ${ANOMALY_PERCENTAGE}%`
    });
  }

  // Check if ALL products from a single supplier would be disabled
  const disableBySupplier = {};
  for (const item of updates.disable) {
    const supplier = item.supplierName || 'unknown';
    disableBySupplier[supplier] = (disableBySupplier[supplier] || 0) + 1;
  }

  // Also count total by supplier
  const totalBySupplier = {};
  for (const item of [...updates.enable, ...updates.disable, ...updates.update, ...updates.noChange]) {
    const supplier = item.supplierName || item.link?.supplier_name || 'unknown';
    totalBySupplier[supplier] = (totalBySupplier[supplier] || 0) + 1;
  }

  for (const [supplier, count] of Object.entries(disableBySupplier)) {
    const total = totalBySupplier[supplier] || count;
    const pct = (count / total) * 100;
    if (pct > 80 && count > 10) {
      warnings.push({
        type: 'supplier_wipe',
        severity: 'critical',
        message: `Would disable ${pct.toFixed(0)}% of ${supplier} products (${count}/${total}). Supplier sync may have failed.`
      });
    }
  }

  return warnings;
}

// Create pre-update snapshot for rollback capability
async function createSnapshot(updates, runId) {
  const snapshotItems = [];

  for (const item of [...updates.enable, ...updates.disable, ...updates.update]) {
    snapshotItems.push({
      run_id: runId,
      product_id: item.bcProductId,
      sku: item.sku,
      previous_availability: item.link?.ecommerce_products?.availability,
      previous_inventory: item.link?.ecommerce_products?.inventory_level,
      intended_action: item.action,
      intended_availability: item.targetAvailability,
      intended_inventory: item.targetInventory,
      supplier_name: item.supplierName
    });
  }

  // Store snapshot in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < snapshotItems.length; i += BATCH_SIZE) {
    const batch = snapshotItems.slice(i, i + BATCH_SIZE);
    await supabase.from('bc_availability_snapshots').insert(batch).catch(() => {
      // Table may not exist yet - that's OK
    });
  }

  return snapshotItems.length;
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
          sale_price,
          is_clearance
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

  // RULE 1: Clearance items (SKU "Copy of" or "sale") - SKIP (manual inventory control)
  if (isClearanceItem(bcProduct)) {
    return {
      action: 'skip',
      reason: `Clearance item (sku=${bcProduct.sku}) - manual inventory control`,
      skipReason: 'clearance_item'
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
async function updateBCAvailability(dryRun = false, forceRun = false) {
  const runId = `run_${Date.now()}`;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    BC AVAILABILITY UPDATER (Enhanced with Business Rules)  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}${forceRun ? ' (FORCE)' : ''}`);
  console.log(`Run ID: ${runId}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  console.log('Business Rules Applied:');
  console.log('  • UHP/Oborne/Kadac: stock > 0 → inventory = 1000');
  console.log('  • Unleashed/Elevate: respect actual stock levels');
  console.log('  • Clearance items (SKU "Copy of" or "sale"): SKIP');
  console.log('  • 8% margin protection: warning if exceeded\n');

  console.log('Safety Checks:');
  console.log(`  • Stale data threshold: ${MAX_STALE_HOURS} hours`);
  console.log(`  • Max disable at once: ${MAX_DISABLE_COUNT} products`);
  console.log(`  • Anomaly threshold: ${ANOMALY_PERCENTAGE}% of products\n`);

  const startTime = Date.now();

  // SAFETY CHECK 1: Supplier data freshness
  console.log('Checking supplier data freshness...');
  const freshness = await checkSupplierDataFreshness();

  if (freshness.fresh.length > 0) {
    console.log('  Fresh suppliers:');
    freshness.fresh.forEach(s => console.log(`    ✓ ${s.supplier}: ${s.ageHours}h ago`));
  }

  if (freshness.stale.length > 0) {
    console.log('  ⚠️  STALE suppliers (data older than 24h):');
    freshness.stale.forEach(s => console.log(`    ✗ ${s.supplier}: ${s.ageHours}h ago`));

    if (!forceRun && !dryRun) {
      console.log('\n❌ ABORTING: Stale supplier data detected. Run with --force to override.');
      return { aborted: true, reason: 'stale_data', staleSuppliers: freshness.stale };
    } else if (forceRun) {
      console.log('\n  ⚠️  FORCE mode enabled - proceeding despite stale data\n');
    }
  }
  console.log('');

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
  console.log(`  Products SKIPPED:    ${updates.skip.length} (clearance items)`);
  console.log(`  No change needed:    ${updates.noChange.length}`);
  console.log(`  Margin warnings:     ${updates.marginWarnings.length}\n`);

  // SAFETY CHECK 2: Anomaly detection
  const anomalies = checkAnomalies(updates, links.length);
  if (anomalies.length > 0) {
    console.log('⚠️  ANOMALY DETECTION WARNINGS:');
    anomalies.forEach(a => {
      console.log(`  [${a.severity.toUpperCase()}] ${a.message}`);
    });
    console.log('');

    const hasCritical = anomalies.some(a => a.severity === 'critical');
    if (hasCritical && !forceRun && !dryRun) {
      console.log('❌ ABORTING: Critical anomalies detected. Run with --force to override.');
      return { aborted: true, reason: 'anomaly_detected', anomalies };
    } else if (hasCritical && forceRun) {
      console.log('  ⚠️  FORCE mode enabled - proceeding despite anomalies\n');
    }
  }

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
    console.log('Clearance items SKIPPED (manual inventory control):');
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
    console.log(`   (${updates.skip.length} clearance items skipped as expected)\n`);
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

  // SAFETY CHECK 3: Create snapshot for rollback
  console.log('Creating pre-update snapshot for rollback capability...');
  const snapshotCount = await createSnapshot(updates, runId);
  console.log(`  Snapshot saved: ${snapshotCount} products (run_id: ${runId})\n`);

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
  console.log(`  Products SKIPPED:  ${updates.skip.length} (clearance items)`);
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
  const forceRun = args.includes('--force');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
BC Availability Updater - Sync supplier stock to BigCommerce

Usage:
  node update-bc-availability.js [options]

Options:
  --live     Apply changes to BigCommerce (default: dry run)
  --force    Override safety checks (stale data, anomaly detection)
  --help     Show this help message

Safety Features:
  • Stale data protection: Aborts if supplier data is >24h old
  • Anomaly detection: Aborts if >500 products would be disabled
  • Supplier wipe detection: Aborts if >80% of a supplier's products would be disabled
  • Pre-update snapshots: Saves previous state for rollback

Examples:
  node update-bc-availability.js              # Dry run
  node update-bc-availability.js --live       # Live update with safety checks
  node update-bc-availability.js --live --force  # Live update, bypass safety checks
`);
    process.exit(0);
  }

  if (dryRun) {
    console.log('\n⚠️  Running in DRY RUN mode (no changes will be made)');
    console.log('    Use --live flag to apply changes\n');
  }

  updateBCAvailability(dryRun, forceRun).catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}
