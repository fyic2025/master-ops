#!/usr/bin/env npx tsx

/**
 * Fix Zero Stock Visibility Script
 *
 * Automatically disables products in BigCommerce that have zero stock
 * but are still showing as available on the storefront.
 *
 * Usage:
 *   npx tsx fix-zero-stock.ts              # Fix all zero-stock visible
 *   npx tsx fix-zero-stock.ts --dry-run    # Preview changes without applying
 *   npx tsx fix-zero-stock.ts --limit 10   # Fix only first 10 products
 */

import { createClient } from '@supabase/supabase-js';

// BOO Supabase instance
const supabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

// BigCommerce config
const BC_STORE_HASH = process.env.BC_STORE_HASH || 'hhhi';
const BC_ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN!;
const BC_API_URL = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3`;

interface FixResult {
  bcProductId: number;
  sku: string;
  name: string;
  status: 'fixed' | 'failed' | 'skipped';
  error?: string;
}

interface FixReport {
  timestamp: Date;
  dryRun: boolean;
  totalFound: number;
  fixed: number;
  failed: number;
  skipped: number;
  results: FixResult[];
  duration: number;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get zero-stock visible products from database
 */
async function getZeroStockVisible(limit?: number): Promise<Array<{
  bc_product_id: number;
  sku: string;
  name: string;
  availability: string;
}>> {
  let query = supabase
    .from('ecommerce_products')
    .select('bc_product_id, sku, name, availability')
    .eq('inventory_level', 0)
    .eq('availability', 'available')
    .eq('is_active', true);

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query products: ${error.message}`);
  }

  return data || [];
}

/**
 * Update product availability in BigCommerce
 */
async function updateBigCommerceAvailability(productId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BC_API_URL}/catalog/products/${productId}`, {
      method: 'PUT',
      headers: {
        'X-Auth-Token': BC_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        availability: 'disabled'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `BC API error: ${response.status} - ${errorData.title || response.statusText}`
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log fix action to database
 */
async function logFix(product: { bc_product_id: number; sku: string; name: string }, action: string, reason: string): Promise<void> {
  await supabase.from('zero_stock_visibility_log').insert({
    bc_product_id: product.bc_product_id,
    sku: product.sku,
    product_name: product.name,
    availability_before: 'available',
    availability_after: 'disabled',
    action_taken: action,
    reason
  }).catch(err => {
    console.warn(`Warning: Failed to log fix for ${product.sku}: ${err.message}`);
  });
}

/**
 * Update local database after BigCommerce update
 */
async function updateLocalDatabase(productId: number): Promise<void> {
  await supabase
    .from('ecommerce_products')
    .update({
      availability: 'disabled',
      synced_at: new Date().toISOString()
    })
    .eq('bc_product_id', productId);
}

/**
 * Fix all zero-stock visible products
 */
async function fixZeroStockProducts(options: { dryRun: boolean; limit?: number }): Promise<FixReport> {
  const startTime = Date.now();

  console.log(`\n${options.dryRun ? '[DRY RUN] ' : ''}Fixing zero-stock visible products...\n`);

  // Get products to fix
  const products = await getZeroStockVisible(options.limit);

  console.log(`Found ${products.length} zero-stock visible products\n`);

  if (products.length === 0) {
    return {
      timestamp: new Date(),
      dryRun: options.dryRun,
      totalFound: 0,
      fixed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      duration: Date.now() - startTime
    };
  }

  const results: FixResult[] = [];
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const product of products) {
    console.log(`Processing: [${product.sku}] ${product.name.substring(0, 40)}...`);

    if (options.dryRun) {
      console.log(`  [DRY RUN] Would disable product ${product.bc_product_id}`);
      results.push({
        bcProductId: product.bc_product_id,
        sku: product.sku,
        name: product.name,
        status: 'skipped'
      });
      skipped++;
      continue;
    }

    // Update BigCommerce
    const bcResult = await updateBigCommerceAvailability(product.bc_product_id);

    if (bcResult.success) {
      // Update local database
      await updateLocalDatabase(product.bc_product_id);

      // Log the fix
      await logFix(product, 'disabled', 'zero_stock_auto_fix');

      console.log(`  Fixed: Disabled in BigCommerce`);
      results.push({
        bcProductId: product.bc_product_id,
        sku: product.sku,
        name: product.name,
        status: 'fixed'
      });
      fixed++;
    } else {
      console.log(`  FAILED: ${bcResult.error}`);
      results.push({
        bcProductId: product.bc_product_id,
        sku: product.sku,
        name: product.name,
        status: 'failed',
        error: bcResult.error
      });
      failed++;
    }

    // Rate limit: 250ms between API calls
    await sleep(250);
  }

  return {
    timestamp: new Date(),
    dryRun: options.dryRun,
    totalFound: products.length,
    fixed,
    failed,
    skipped,
    results,
    duration: Date.now() - startTime
  };
}

/**
 * Print report summary
 */
function printReport(report: FixReport) {
  console.log('\n' + '='.repeat(60));
  console.log('ZERO STOCK FIX REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log(`Mode: ${report.dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
  console.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
  console.log('');

  console.log('--- SUMMARY ---');
  console.log(`Total Found: ${report.totalFound}`);
  console.log(`Fixed: ${report.fixed}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log('');

  if (report.failed > 0) {
    console.log('--- FAILURES ---');
    for (const result of report.results.filter(r => r.status === 'failed')) {
      console.log(`  [${result.sku}] ${result.error}`);
    }
    console.log('');
  }

  if (report.fixed > 0) {
    console.log('--- FIXED PRODUCTS ---');
    for (const result of report.results.filter(r => r.status === 'fixed').slice(0, 20)) {
      console.log(`  [${result.sku}] ${result.name.substring(0, 40)}`);
    }
    if (report.fixed > 20) {
      console.log(`  ... and ${report.fixed - 20} more`);
    }
    console.log('');
  }

  console.log('='.repeat(60));

  if (!report.dryRun && report.fixed > 0) {
    console.log('\nProducts have been disabled in BigCommerce and logged to zero_stock_visibility_log.');
    console.log('They will be re-enabled automatically when supplier stock is available.');
  }

  if (report.dryRun && report.totalFound > 0) {
    console.log('\nTo apply these fixes, run without --dry-run flag.');
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1] ||
                   (args.includes('--limit') ? args[args.indexOf('--limit') + 1] : undefined);
  const limit = limitArg ? parseInt(limitArg) : undefined;

  // Validate environment
  if (!process.env.BOO_SUPABASE_URL || !process.env.BOO_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing BOO_SUPABASE_URL or BOO_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!dryRun && !BC_ACCESS_TOKEN) {
    console.error('Missing BC_ACCESS_TOKEN (required for live mode)');
    process.exit(1);
  }

  try {
    const report = await fixZeroStockProducts({ dryRun, limit });
    printReport(report);

    // Save report
    const fs = await import('fs');
    const filename = `zero-stock-fix-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${filename}`);

    // Exit with error if failures occurred
    if (report.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Fix operation failed:', error);
    process.exit(1);
  }
}

main();
