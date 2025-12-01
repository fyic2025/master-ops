#!/usr/bin/env npx tsx

/**
 * Predict Stock-Outs Script
 *
 * Calculates sales velocity and predicts when products will run out of stock.
 * Generates alerts for products predicted to stock out soon.
 *
 * Usage:
 *   npx tsx predict-stockouts.ts              # Predict all products
 *   npx tsx predict-stockouts.ts --days 14    # Look ahead 14 days
 *   npx tsx predict-stockouts.ts --critical   # Show critical only (≤3 days)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface ProductVelocity {
  bcProductId: number;
  sku: string;
  name: string;
  currentStock: number;
  avgDailySales: number;
  daysUntilStockout: number | null;
  predictedStockoutDate: Date | null;
  urgency: 'critical' | 'warning' | 'info' | 'ok';
  supplier: string;
}

interface PredictionReport {
  timestamp: Date;
  lookAheadDays: number;
  totalAnalyzed: number;
  predictions: {
    critical: ProductVelocity[];
    warning: ProductVelocity[];
    info: ProductVelocity[];
  };
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    avgDaysToStockout: number;
  };
  recommendations: string[];
}

/**
 * Get products with stock and sales data
 * Note: This uses stock_history to estimate sales velocity
 */
async function getProductsWithVelocity(): Promise<ProductVelocity[]> {
  // Get current product data
  const { data: products } = await supabase
    .from('ecommerce_products')
    .select('bc_product_id, sku, name, inventory_level, primary_supplier')
    .eq('is_active', true)
    .gt('inventory_level', 0);

  if (!products || products.length === 0) {
    return [];
  }

  // Get stock history for velocity calculation (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: history } = await supabase
    .from('stock_history')
    .select('bc_product_id, old_stock, new_stock, stock_change, created_at')
    .gte('created_at', thirtyDaysAgo)
    .lt('stock_change', 0); // Only decreases (sales)

  // Calculate velocity per product
  const velocityMap = new Map<number, { totalSold: number; days: number }>();

  if (history) {
    for (const record of history) {
      const existing = velocityMap.get(record.bc_product_id) || { totalSold: 0, days: 30 };
      existing.totalSold += Math.abs(record.stock_change);
      velocityMap.set(record.bc_product_id, existing);
    }
  }

  // Build velocity data
  const velocities: ProductVelocity[] = [];

  for (const product of products) {
    const velocityData = velocityMap.get(product.bc_product_id);
    const avgDailySales = velocityData
      ? velocityData.totalSold / velocityData.days
      : 0;

    let daysUntilStockout: number | null = null;
    let predictedStockoutDate: Date | null = null;

    if (avgDailySales > 0) {
      daysUntilStockout = Math.floor(product.inventory_level / avgDailySales);
      predictedStockoutDate = new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000);
    }

    let urgency: 'critical' | 'warning' | 'info' | 'ok' = 'ok';
    if (daysUntilStockout !== null) {
      if (daysUntilStockout <= 3) urgency = 'critical';
      else if (daysUntilStockout <= 7) urgency = 'warning';
      else if (daysUntilStockout <= 14) urgency = 'info';
    }

    velocities.push({
      bcProductId: product.bc_product_id,
      sku: product.sku,
      name: product.name,
      currentStock: product.inventory_level,
      avgDailySales: Math.round(avgDailySales * 100) / 100,
      daysUntilStockout,
      predictedStockoutDate,
      urgency,
      supplier: product.primary_supplier || 'unknown'
    });
  }

  return velocities;
}

/**
 * Generate prediction report
 */
async function generatePredictions(lookAheadDays: number): Promise<PredictionReport> {
  console.log(`\nAnalyzing stock velocity and predicting stock-outs (${lookAheadDays} day horizon)...\n`);

  const velocities = await getProductsWithVelocity();

  // Filter to products that will stock out within look-ahead period
  const atRisk = velocities.filter(v =>
    v.daysUntilStockout !== null && v.daysUntilStockout <= lookAheadDays
  );

  const critical = atRisk.filter(v => v.urgency === 'critical').sort((a, b) => (a.daysUntilStockout || 0) - (b.daysUntilStockout || 0));
  const warning = atRisk.filter(v => v.urgency === 'warning').sort((a, b) => (a.daysUntilStockout || 0) - (b.daysUntilStockout || 0));
  const info = atRisk.filter(v => v.urgency === 'info').sort((a, b) => (a.daysUntilStockout || 0) - (b.daysUntilStockout || 0));

  // Calculate average
  const avgDays = atRisk.length > 0
    ? atRisk.reduce((sum, v) => sum + (v.daysUntilStockout || 0), 0) / atRisk.length
    : 0;

  // Generate recommendations
  const recommendations: string[] = [];

  if (critical.length > 0) {
    recommendations.push(`URGENT: ${critical.length} products will stock out within 3 days. Order immediately.`);

    // Group by supplier
    const supplierCounts = critical.reduce((acc, v) => {
      acc[v.supplier] = (acc[v.supplier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [supplier, count] of Object.entries(supplierCounts)) {
      if (count > 5) {
        recommendations.push(`Contact ${supplier}: ${count} products at critical stock levels.`);
      }
    }
  }

  if (warning.length > 10) {
    recommendations.push(`Review ${warning.length} products predicted to stock out within 7 days.`);
  }

  // Look for high-velocity products
  const highVelocity = velocities.filter(v => v.avgDailySales > 5).sort((a, b) => b.avgDailySales - a.avgDailySales);
  if (highVelocity.length > 0) {
    recommendations.push(`Monitor ${highVelocity.length} high-velocity products (>5 units/day) closely.`);
  }

  return {
    timestamp: new Date(),
    lookAheadDays,
    totalAnalyzed: velocities.length,
    predictions: { critical, warning, info },
    summary: {
      criticalCount: critical.length,
      warningCount: warning.length,
      infoCount: info.length,
      avgDaysToStockout: Math.round(avgDays * 10) / 10
    },
    recommendations
  };
}

/**
 * Store predictions in database
 */
async function storePredictions(predictions: ProductVelocity[]): Promise<void> {
  for (const pred of predictions) {
    await supabase.from('stock_alert_thresholds').upsert({
      bc_product_id: pred.bcProductId,
      sku: pred.sku,
      product_name: pred.name,
      avg_daily_sales: pred.avgDailySales,
      days_until_stockout: pred.daysUntilStockout,
      last_calculated_at: new Date().toISOString()
    }, { onConflict: 'bc_product_id' }).catch(() => {
      // Table might not exist yet, that's OK
    });
  }
}

/**
 * Create alerts for critical predictions
 */
async function createAlerts(predictions: ProductVelocity[]): Promise<number> {
  let created = 0;

  for (const pred of predictions.filter(p => p.urgency === 'critical' || p.urgency === 'warning')) {
    // Check if alert already exists
    const { data: existing } = await supabase
      .from('stock_alerts')
      .select('id')
      .eq('bc_product_id', pred.bcProductId)
      .eq('alert_type', 'stockout_prediction')
      .eq('resolved', false)
      .single();

    if (!existing) {
      await supabase.from('stock_alerts').insert({
        bc_product_id: pred.bcProductId,
        sku: pred.sku,
        product_name: pred.name,
        alert_type: 'stockout_prediction',
        severity: pred.urgency,
        current_stock: pred.currentStock,
        predicted_stockout_date: pred.predictedStockoutDate?.toISOString().split('T')[0],
        message: `Predicted stockout in ${pred.daysUntilStockout} days (${pred.avgDailySales} units/day)`
      }).catch(() => {
        // Table might not exist
      });
      created++;
    }
  }

  return created;
}

/**
 * Print report
 */
function printReport(report: PredictionReport, criticalOnly: boolean) {
  console.log('='.repeat(70));
  console.log('STOCK-OUT PREDICTION REPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log(`Look-ahead: ${report.lookAheadDays} days`);
  console.log(`Products Analyzed: ${report.totalAnalyzed.toLocaleString()}`);
  console.log('');

  // Summary
  console.log('--- SUMMARY ---');
  console.log(`Critical (≤3 days): ${report.summary.criticalCount}`);
  console.log(`Warning (≤7 days): ${report.summary.warningCount}`);
  console.log(`Info (≤14 days): ${report.summary.infoCount}`);
  console.log(`Avg Days to Stockout: ${report.summary.avgDaysToStockout}`);
  console.log('');

  // Critical items
  if (report.predictions.critical.length > 0) {
    console.log('--- CRITICAL (Stock out in ≤3 days) ---');
    console.log('SKU'.padEnd(15) + 'Stock'.padStart(8) + 'Daily'.padStart(8) + 'Days'.padStart(6) + '  Product');
    console.log('-'.repeat(70));
    for (const p of report.predictions.critical.slice(0, 20)) {
      console.log(
        p.sku.substring(0, 13).padEnd(15) +
        p.currentStock.toString().padStart(8) +
        p.avgDailySales.toFixed(1).padStart(8) +
        (p.daysUntilStockout?.toString() || 'N/A').padStart(6) +
        `  ${p.name.substring(0, 30)}`
      );
    }
    if (report.predictions.critical.length > 20) {
      console.log(`... and ${report.predictions.critical.length - 20} more`);
    }
    console.log('');
  }

  // Warning items (if not critical only)
  if (!criticalOnly && report.predictions.warning.length > 0) {
    console.log('--- WARNING (Stock out in 4-7 days) ---');
    console.log('SKU'.padEnd(15) + 'Stock'.padStart(8) + 'Daily'.padStart(8) + 'Days'.padStart(6) + '  Product');
    console.log('-'.repeat(70));
    for (const p of report.predictions.warning.slice(0, 15)) {
      console.log(
        p.sku.substring(0, 13).padEnd(15) +
        p.currentStock.toString().padStart(8) +
        p.avgDailySales.toFixed(1).padStart(8) +
        (p.daysUntilStockout?.toString() || 'N/A').padStart(6) +
        `  ${p.name.substring(0, 30)}`
      );
    }
    if (report.predictions.warning.length > 15) {
      console.log(`... and ${report.predictions.warning.length - 15} more`);
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
  const daysArg = args.find(a => a.startsWith('--days='))?.split('=')[1] ||
                  (args.includes('--days') ? args[args.indexOf('--days') + 1] : undefined);
  const lookAheadDays = daysArg ? parseInt(daysArg) : 14;
  const criticalOnly = args.includes('--critical');

  try {
    const report = await generatePredictions(lookAheadDays);

    // Store predictions
    const allPredictions = [
      ...report.predictions.critical,
      ...report.predictions.warning,
      ...report.predictions.info
    ];
    await storePredictions(allPredictions);

    // Create alerts
    const alertsCreated = await createAlerts(allPredictions);
    if (alertsCreated > 0) {
      console.log(`Created ${alertsCreated} new alerts`);
    }

    // Print report
    printReport(report, criticalOnly);

    // Save report
    const fs = await import('fs');
    const filename = `stockout-predictions-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${filename}`);

    // Exit with error if critical items found
    if (report.summary.criticalCount > 0) {
      console.log('\n⚠️ CRITICAL: Products predicted to stock out within 3 days!');
      process.exit(1);
    }

  } catch (error) {
    console.error('Prediction failed:', error);
    process.exit(1);
  }
}

main();
