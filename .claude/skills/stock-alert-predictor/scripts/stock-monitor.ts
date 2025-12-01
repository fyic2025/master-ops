#!/usr/bin/env npx tsx

/**
 * Stock Monitor Script
 *
 * Real-time monitoring of stock levels across all BOO products.
 * Identifies low stock, critical stock, and zero-stock visible products.
 *
 * Usage:
 *   npx tsx stock-monitor.ts              # Full stock check
 *   npx tsx stock-monitor.ts --critical   # Critical items only
 *   npx tsx stock-monitor.ts --zero       # Zero-stock visible only
 *   npx tsx stock-monitor.ts --supplier oborne  # Filter by supplier
 */

import { createClient } from '@supabase/supabase-js';

// Use BOO Supabase instance
const supabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface StockCheckReport {
  timestamp: Date;
  summary: {
    totalProducts: number;
    activeProducts: number;
    zeroStockCount: number;
    zeroStockVisibleCount: number;
    criticalStockCount: number;
    lowStockCount: number;
    healthyStockCount: number;
  };
  bySupplier: Record<string, {
    total: number;
    zeroStock: number;
    lowStock: number;
  }>;
  alerts: {
    zeroStockVisible: ProductAlert[];
    criticalStock: ProductAlert[];
    lowStock: ProductAlert[];
  };
  recommendations: string[];
}

interface ProductAlert {
  bcProductId: number;
  sku: string;
  name: string;
  currentStock: number;
  availability: string;
  supplier: string;
  lastSynced: string;
}

// Default thresholds
const LOW_STOCK_THRESHOLD = 10;
const CRITICAL_STOCK_THRESHOLD = 3;

/**
 * Get total product counts
 */
async function getProductCounts(): Promise<{ total: number; active: number }> {
  const { count: total } = await supabase
    .from('ecommerce_products')
    .select('*', { count: 'exact', head: true });

  const { count: active } = await supabase
    .from('ecommerce_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  return { total: total || 0, active: active || 0 };
}

/**
 * Get zero stock products that are still visible
 */
async function getZeroStockVisible(): Promise<ProductAlert[]> {
  const { data } = await supabase
    .from('ecommerce_products')
    .select('bc_product_id, sku, name, inventory_level, availability, primary_supplier, synced_at')
    .eq('inventory_level', 0)
    .eq('availability', 'available')
    .eq('is_active', true);

  return (data || []).map(p => ({
    bcProductId: p.bc_product_id,
    sku: p.sku,
    name: p.name,
    currentStock: p.inventory_level,
    availability: p.availability,
    supplier: p.primary_supplier || 'unknown',
    lastSynced: p.synced_at
  }));
}

/**
 * Get critical stock products (≤3 units)
 */
async function getCriticalStock(): Promise<ProductAlert[]> {
  const { data } = await supabase
    .from('ecommerce_products')
    .select('bc_product_id, sku, name, inventory_level, availability, primary_supplier, synced_at')
    .gt('inventory_level', 0)
    .lte('inventory_level', CRITICAL_STOCK_THRESHOLD)
    .eq('is_active', true)
    .order('inventory_level');

  return (data || []).map(p => ({
    bcProductId: p.bc_product_id,
    sku: p.sku,
    name: p.name,
    currentStock: p.inventory_level,
    availability: p.availability,
    supplier: p.primary_supplier || 'unknown',
    lastSynced: p.synced_at
  }));
}

/**
 * Get low stock products (≤10 units, >3 units)
 */
async function getLowStock(): Promise<ProductAlert[]> {
  const { data } = await supabase
    .from('ecommerce_products')
    .select('bc_product_id, sku, name, inventory_level, availability, primary_supplier, synced_at')
    .gt('inventory_level', CRITICAL_STOCK_THRESHOLD)
    .lte('inventory_level', LOW_STOCK_THRESHOLD)
    .eq('is_active', true)
    .order('inventory_level');

  return (data || []).map(p => ({
    bcProductId: p.bc_product_id,
    sku: p.sku,
    name: p.name,
    currentStock: p.inventory_level,
    availability: p.availability,
    supplier: p.primary_supplier || 'unknown',
    lastSynced: p.synced_at
  }));
}

/**
 * Get stock counts by supplier
 */
async function getStockBySupplier(): Promise<Record<string, { total: number; zeroStock: number; lowStock: number }>> {
  const { data: products } = await supabase
    .from('ecommerce_products')
    .select('primary_supplier, inventory_level')
    .eq('is_active', true);

  const bySupplier: Record<string, { total: number; zeroStock: number; lowStock: number }> = {};

  for (const product of products || []) {
    const supplier = product.primary_supplier || 'unassigned';

    if (!bySupplier[supplier]) {
      bySupplier[supplier] = { total: 0, zeroStock: 0, lowStock: 0 };
    }

    bySupplier[supplier].total++;

    if (product.inventory_level === 0) {
      bySupplier[supplier].zeroStock++;
    } else if (product.inventory_level <= LOW_STOCK_THRESHOLD) {
      bySupplier[supplier].lowStock++;
    }
  }

  return bySupplier;
}

/**
 * Generate recommendations based on findings
 */
function generateRecommendations(report: StockCheckReport): string[] {
  const recommendations: string[] = [];

  if (report.summary.zeroStockVisibleCount > 0) {
    recommendations.push(
      `CRITICAL: ${report.summary.zeroStockVisibleCount} products have zero stock but are still visible. Run fix-zero-stock.ts immediately.`
    );
  }

  if (report.summary.criticalStockCount > 50) {
    recommendations.push(
      `HIGH: ${report.summary.criticalStockCount} products at critical stock levels. Review supplier orders.`
    );
  }

  const problematicSuppliers = Object.entries(report.bySupplier)
    .filter(([_, data]) => data.zeroStock > data.total * 0.3)
    .map(([name]) => name);

  if (problematicSuppliers.length > 0) {
    recommendations.push(
      `WARNING: High zero-stock rate from suppliers: ${problematicSuppliers.join(', ')}. Check supplier feed health.`
    );
  }

  if (report.summary.zeroStockCount > report.summary.activeProducts * 0.2) {
    recommendations.push(
      `WARNING: Over 20% of products have zero stock. Review inventory strategy.`
    );
  }

  return recommendations;
}

/**
 * Run full stock check
 */
async function runStockCheck(options: { supplier?: string; criticalOnly?: boolean; zeroOnly?: boolean }): Promise<StockCheckReport> {
  console.log('\nRunning stock check...\n');

  const counts = await getProductCounts();
  const zeroStockVisible = await getZeroStockVisible();
  const criticalStock = await getCriticalStock();
  const lowStock = await getLowStock();
  const bySupplier = await getStockBySupplier();

  // Filter by supplier if specified
  const filterBySupplier = (alerts: ProductAlert[]) => {
    if (!options.supplier) return alerts;
    return alerts.filter(a => a.supplier.toLowerCase() === options.supplier!.toLowerCase());
  };

  const report: StockCheckReport = {
    timestamp: new Date(),
    summary: {
      totalProducts: counts.total,
      activeProducts: counts.active,
      zeroStockCount: Object.values(bySupplier).reduce((sum, s) => sum + s.zeroStock, 0),
      zeroStockVisibleCount: zeroStockVisible.length,
      criticalStockCount: criticalStock.length,
      lowStockCount: lowStock.length,
      healthyStockCount: counts.active - Object.values(bySupplier).reduce((sum, s) => sum + s.zeroStock + s.lowStock, 0)
    },
    bySupplier,
    alerts: {
      zeroStockVisible: filterBySupplier(zeroStockVisible),
      criticalStock: filterBySupplier(criticalStock),
      lowStock: filterBySupplier(lowStock)
    },
    recommendations: []
  };

  report.recommendations = generateRecommendations(report);

  return report;
}

/**
 * Print report to console
 */
function printReport(report: StockCheckReport, options: { criticalOnly?: boolean; zeroOnly?: boolean }) {
  console.log('='.repeat(70));
  console.log('STOCK MONITORING REPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log('');

  // Summary
  console.log('--- SUMMARY ---');
  console.log(`Total Products: ${report.summary.totalProducts.toLocaleString()}`);
  console.log(`Active Products: ${report.summary.activeProducts.toLocaleString()}`);
  console.log(`Zero Stock: ${report.summary.zeroStockCount.toLocaleString()} (${Math.round(report.summary.zeroStockCount / report.summary.activeProducts * 100)}%)`);
  console.log(`Zero Stock VISIBLE: ${report.summary.zeroStockVisibleCount} (CRITICAL)`);
  console.log(`Critical Stock (≤${CRITICAL_STOCK_THRESHOLD}): ${report.summary.criticalStockCount}`);
  console.log(`Low Stock (≤${LOW_STOCK_THRESHOLD}): ${report.summary.lowStockCount}`);
  console.log(`Healthy Stock: ${report.summary.healthyStockCount.toLocaleString()}`);
  console.log('');

  // By Supplier
  console.log('--- BY SUPPLIER ---');
  console.log('Supplier'.padEnd(15) + 'Total'.padStart(8) + 'Zero'.padStart(8) + 'Low'.padStart(8) + 'Rate'.padStart(8));
  console.log('-'.repeat(47));
  for (const [supplier, data] of Object.entries(report.bySupplier).sort((a, b) => b[1].total - a[1].total)) {
    const zeroRate = Math.round(data.zeroStock / data.total * 100);
    console.log(
      supplier.substring(0, 13).padEnd(15) +
      data.total.toString().padStart(8) +
      data.zeroStock.toString().padStart(8) +
      data.lowStock.toString().padStart(8) +
      `${zeroRate}%`.padStart(8)
    );
  }
  console.log('');

  // Zero Stock Visible (CRITICAL)
  if (!options.criticalOnly || report.alerts.zeroStockVisible.length > 0) {
    console.log('--- ZERO STOCK VISIBLE (CHECKOUT ERROR RISK) ---');
    if (report.alerts.zeroStockVisible.length === 0) {
      console.log('None found');
    } else {
      console.log(`Found ${report.alerts.zeroStockVisible.length} products:`);
      for (const p of report.alerts.zeroStockVisible.slice(0, 20)) {
        console.log(`  [${p.sku}] ${p.name.substring(0, 40)} - ${p.supplier}`);
      }
      if (report.alerts.zeroStockVisible.length > 20) {
        console.log(`  ... and ${report.alerts.zeroStockVisible.length - 20} more`);
      }
    }
    console.log('');
  }

  // Critical Stock
  if (!options.zeroOnly && report.alerts.criticalStock.length > 0) {
    console.log('--- CRITICAL STOCK (≤3 units) ---');
    console.log(`Found ${report.alerts.criticalStock.length} products:`);
    for (const p of report.alerts.criticalStock.slice(0, 15)) {
      console.log(`  [${p.sku}] ${p.name.substring(0, 35)} - ${p.currentStock} units (${p.supplier})`);
    }
    if (report.alerts.criticalStock.length > 15) {
      console.log(`  ... and ${report.alerts.criticalStock.length - 15} more`);
    }
    console.log('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('--- RECOMMENDATIONS ---');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    console.log('');
  }

  console.log('='.repeat(70));
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    supplier: args.find(a => a.startsWith('--supplier='))?.split('=')[1] ||
              (args.includes('--supplier') ? args[args.indexOf('--supplier') + 1] : undefined),
    criticalOnly: args.includes('--critical'),
    zeroOnly: args.includes('--zero')
  };

  try {
    const report = await runStockCheck(options);
    printReport(report, options);

    // Save report to JSON
    const fs = await import('fs');
    const filename = `stock-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${filename}`);

    // Exit with error if critical issues found
    if (report.summary.zeroStockVisibleCount > 0) {
      console.log('\n⚠️ CRITICAL: Zero-stock visible products detected!');
      console.log('Run: npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts');
      process.exit(1);
    }

  } catch (error) {
    console.error('Stock check failed:', error);
    process.exit(1);
  }
}

main();
