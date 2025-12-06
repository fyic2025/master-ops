#!/usr/bin/env node

/**
 * MASTER SUPPLIER SYNC SCRIPT
 *
 * Runs all 4 supplier loaders in sequence:
 * 1. UHP (XLSX download)
 * 2. Kadac (CSV API)
 * 3. Oborne (FTP)
 * 4. Unleashed (API)
 *
 * Logs results to automation_logs table
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const path = require('path');

// Supabase connection
const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

// Run a supplier loader script
function runLoader(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    console.log(`\n>>> Running ${scriptName}...\n`);

    const startTime = Date.now();
    const child = spawn('node', [scriptPath], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`\n>>> ${scriptName} completed in ${duration}s\n`);
        resolve({ script: scriptName, success: true, duration });
      } else {
        console.error(`\n>>> ${scriptName} FAILED (exit code ${code}) after ${duration}s\n`);
        resolve({ script: scriptName, success: false, duration, exitCode: code });
      }
    });

    child.on('error', (err) => {
      console.error(`\n>>> ${scriptName} ERROR: ${err.message}\n`);
      resolve({ script: scriptName, success: false, error: err.message });
    });
  });
}

// Log sync results to automation_logs table
async function logSyncResult(results, totalDuration) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  try {
    // Get supplier counts from database
    const supplierCounts = {};
    for (const supplier of ['uhp', 'kadac', 'oborne', 'unleashed']) {
      const { count } = await supabase
        .from('supplier_products')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_name', supplier);
      supplierCounts[supplier] = count || 0;
    }

    const totalProducts = Object.values(supplierCounts).reduce((a, b) => a + b, 0);

    // Log to automation_logs (if table exists)
    const logEntry = {
      workflow_name: 'supplier-stock-sync',
      status: failed === 0 ? 'success' : 'partial_failure',
      started_at: new Date(Date.now() - totalDuration * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: totalDuration,
      metadata: {
        results,
        supplier_counts: supplierCounts,
        total_products: totalProducts,
        successful_loaders: successful,
        failed_loaders: failed
      }
    };

    const { error } = await supabase
      .from('automation_logs')
      .insert(logEntry);

    if (error && !error.message.includes('does not exist')) {
      console.log('Note: Could not log to automation_logs:', error.message);
    }

    return { supplierCounts, totalProducts };
  } catch (err) {
    console.log('Note: Could not log sync results:', err.message);
    return {};
  }
}

// Main sync function
async function syncAllSuppliers() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           SUPPLIER STOCK SYNC - ALL SUPPLIERS              ║');
  console.log('║                                                            ║');
  console.log('║  Syncing: UHP, Kadac, Oborne, Unleashed                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toISOString()}\n`);

  const startTime = Date.now();
  const results = [];

  // Run loaders sequentially
  const loaders = [
    'load-uhp-products.js',
    'load-kadac-products.js',
    'load-oborne-products.js',
    'load-unleashed-products.js'
  ];

  for (const loader of loaders) {
    const result = await runLoader(loader);
    results.push(result);
  }

  // Sync stock status to product-supplier links
  console.log('\n>>> Syncing stock status to product links...\n');
  const stockSyncResult = await runLoader('sync-stock-to-links.js');
  results.push(stockSyncResult);

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Log results
  const { supplierCounts, totalProducts } = await logSyncResult(results, parseFloat(totalDuration));

  // Final summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SYNC SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Loader Results:');
  results.forEach(r => {
    const status = r.success ? '✓ SUCCESS' : '✗ FAILED';
    console.log(`  ${status} - ${r.script} (${r.duration}s)`);
  });

  if (supplierCounts) {
    console.log('\nSupplier Product Counts:');
    for (const [supplier, count] of Object.entries(supplierCounts)) {
      console.log(`  ${supplier.toUpperCase().padEnd(10)} ${count.toLocaleString()} products`);
    }
    console.log(`  ${'TOTAL'.padEnd(10)} ${totalProducts.toLocaleString()} products`);
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal Duration: ${totalDuration}s`);
  console.log(`Completed: ${successful}/${loaders.length} loaders`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} loader(s) failed - check logs above`);
    process.exit(1);
  }

  console.log('\n✅ All suppliers synced successfully!');
  console.log(`\nCompleted at: ${new Date().toISOString()}\n`);
}

// Export for use in cron
module.exports = { syncAllSuppliers };

// Run if called directly
if (require.main === module) {
  syncAllSuppliers().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
}
