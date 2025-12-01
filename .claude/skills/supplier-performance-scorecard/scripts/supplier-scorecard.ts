#!/usr/bin/env npx tsx

/**
 * Supplier Performance Scorecard Script
 *
 * Calculates performance scores for BOO suppliers across multiple dimensions.
 *
 * Usage:
 *   npx tsx supplier-scorecard.ts                    # All suppliers
 *   npx tsx supplier-scorecard.ts --supplier oborne  # Specific supplier
 *   npx tsx supplier-scorecard.ts --export           # Export to CSV
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface SupplierMetrics {
  // Sync metrics
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncAt: Date | null;
  hoursSinceSync: number;
  avgSyncDuration: number;
  totalRecordsFailed: number;
  totalRecordsProcessed: number;

  // Data quality
  totalProducts: number;
  linkedProducts: number;
  avgMatchConfidence: number;
  highConfidenceLinks: number;
  missingBarcodes: number;
  missingPrices: number;

  // Coverage
  primarySupplierCount: number;
  activeLinks: number;

  // Stock
  avgStockDiscrepancy: number;
  zeroStockProducts: number;
  inStockProducts: number;
}

interface SupplierScore {
  supplier: string;
  overallScore: number;
  syncReliability: number;
  dataQuality: number;
  productCoverage: number;
  pricingConsistency: number;
  fulfillmentSupport: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  metrics: SupplierMetrics;
  alerts: string[];
  recommendations: string[];
}

const SUPPLIERS = ['oborne', 'uhp', 'kadac', 'unleashed'];

/**
 * Fetch sync metrics for a supplier
 */
async function fetchSyncMetrics(supplier: string): Promise<Partial<SupplierMetrics>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: syncs } = await supabase
    .from('sync_logs')
    .select('status, duration_seconds, records_processed, records_failed, created_at')
    .eq('supplier_name', supplier)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (!syncs || syncs.length === 0) {
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncAt: null,
      hoursSinceSync: Infinity,
      avgSyncDuration: 0,
      totalRecordsFailed: 0,
      totalRecordsProcessed: 0
    };
  }

  const successful = syncs.filter(s => s.status === 'completed').length;
  const failed = syncs.filter(s => s.status === 'failed').length;
  const lastSync = syncs[0];
  const lastSyncAt = new Date(lastSync.created_at);
  const hoursSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60);

  const totalDuration = syncs.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalFailed = syncs.reduce((sum, s) => sum + (s.records_failed || 0), 0);
  const totalProcessed = syncs.reduce((sum, s) => sum + (s.records_processed || 0), 0);

  return {
    totalSyncs: syncs.length,
    successfulSyncs: successful,
    failedSyncs: failed,
    lastSyncAt,
    hoursSinceSync: Math.round(hoursSinceSync * 10) / 10,
    avgSyncDuration: syncs.length > 0 ? Math.round(totalDuration / syncs.length) : 0,
    totalRecordsFailed: totalFailed,
    totalRecordsProcessed: totalProcessed
  };
}

/**
 * Fetch product and link metrics
 */
async function fetchProductMetrics(supplier: string): Promise<Partial<SupplierMetrics>> {
  // Get total supplier products
  const { count: totalProducts } = await supabase
    .from('supplier_products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_name', supplier);

  // Get linked products
  const { data: links } = await supabase
    .from('product_supplier_links')
    .select('match_confidence, is_active, priority')
    .eq('supplier_name', supplier);

  if (!links) {
    return {
      totalProducts: totalProducts || 0,
      linkedProducts: 0,
      avgMatchConfidence: 0,
      highConfidenceLinks: 0,
      primarySupplierCount: 0,
      activeLinks: 0
    };
  }

  const activeLinks = links.filter(l => l.is_active);
  const avgConfidence = activeLinks.length > 0
    ? activeLinks.reduce((sum, l) => sum + (l.match_confidence || 0), 0) / activeLinks.length
    : 0;
  const highConfidence = activeLinks.filter(l => (l.match_confidence || 0) >= 0.95).length;
  const primaryCount = activeLinks.filter(l => l.priority === 1).length;

  // Get products with missing data
  const { count: missingBarcodes } = await supabase
    .from('supplier_products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_name', supplier)
    .or('barcode.is.null,barcode.eq.');

  const { count: missingPrices } = await supabase
    .from('supplier_products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_name', supplier)
    .or('rrp.is.null,rrp.eq.0');

  return {
    totalProducts: totalProducts || 0,
    linkedProducts: links.length,
    avgMatchConfidence: Math.round(avgConfidence * 100) / 100,
    highConfidenceLinks: highConfidence,
    primarySupplierCount: primaryCount,
    activeLinks: activeLinks.length,
    missingBarcodes: missingBarcodes || 0,
    missingPrices: missingPrices || 0
  };
}

/**
 * Fetch stock metrics
 */
async function fetchStockMetrics(supplier: string): Promise<Partial<SupplierMetrics>> {
  const { data: products } = await supabase
    .from('supplier_products')
    .select('stock_level')
    .eq('supplier_name', supplier);

  if (!products || products.length === 0) {
    return {
      zeroStockProducts: 0,
      inStockProducts: 0,
      avgStockDiscrepancy: 0
    };
  }

  const zeroStock = products.filter(p => (p.stock_level || 0) === 0).length;
  const inStock = products.filter(p => (p.stock_level || 0) > 0).length;

  return {
    zeroStockProducts: zeroStock,
    inStockProducts: inStock,
    avgStockDiscrepancy: 0 // Would need BC comparison for real discrepancy
  };
}

/**
 * Calculate component scores
 */
function calculateScores(metrics: SupplierMetrics): Omit<SupplierScore, 'supplier' | 'metrics' | 'alerts' | 'recommendations'> {
  // Sync Reliability (0-100)
  const syncSuccessRate = metrics.totalSyncs > 0
    ? (metrics.successfulSyncs / metrics.totalSyncs) * 100
    : 0;
  const recencyScore = Math.max(0, 100 - (metrics.hoursSinceSync * 4)); // -4 points per hour
  const failedRecordsRate = metrics.totalRecordsProcessed > 0
    ? (metrics.totalRecordsFailed / metrics.totalRecordsProcessed) * 100
    : 0;
  const recordsScore = Math.max(0, 100 - failedRecordsRate * 5);

  const syncReliability = Math.round(
    syncSuccessRate * 0.4 + recencyScore * 0.4 + recordsScore * 0.2
  );

  // Data Quality (0-100)
  const confidenceScore = metrics.avgMatchConfidence * 100;
  const coverageScore = metrics.totalProducts > 0
    ? (metrics.linkedProducts / metrics.totalProducts) * 100
    : 0;
  const completenessScore = metrics.totalProducts > 0
    ? Math.max(0, 100 - ((metrics.missingBarcodes + metrics.missingPrices) / metrics.totalProducts) * 50)
    : 0;

  const dataQuality = Math.round(
    confidenceScore * 0.4 + coverageScore * 0.3 + completenessScore * 0.3
  );

  // Product Coverage (0-100)
  const linkRate = metrics.totalProducts > 0
    ? (metrics.activeLinks / metrics.totalProducts) * 100
    : 0;
  const primaryRate = metrics.activeLinks > 0
    ? (metrics.primarySupplierCount / metrics.activeLinks) * 100
    : 0;

  const productCoverage = Math.round(
    linkRate * 0.6 + primaryRate * 0.4
  );

  // Pricing Consistency (simplified - would need price comparison)
  const pricingConsistency = metrics.missingPrices === 0 ? 90 :
    Math.max(0, 90 - (metrics.missingPrices / (metrics.totalProducts || 1)) * 100);

  // Fulfillment Support (0-100)
  const totalStockProducts = metrics.zeroStockProducts + metrics.inStockProducts;
  const inStockRate = totalStockProducts > 0
    ? (metrics.inStockProducts / totalStockProducts) * 100
    : 0;

  const fulfillmentSupport = Math.round(inStockRate);

  // Overall Score
  const overallScore = Math.round(
    syncReliability * 0.30 +
    dataQuality * 0.25 +
    productCoverage * 0.20 +
    pricingConsistency * 0.15 +
    fulfillmentSupport * 0.10
  );

  // Status
  let status: SupplierScore['status'];
  if (overallScore >= 90) status = 'excellent';
  else if (overallScore >= 75) status = 'good';
  else if (overallScore >= 60) status = 'fair';
  else if (overallScore >= 40) status = 'poor';
  else status = 'critical';

  return {
    overallScore,
    syncReliability,
    dataQuality,
    productCoverage,
    pricingConsistency,
    fulfillmentSupport,
    status
  };
}

/**
 * Generate alerts and recommendations
 */
function generateAlerts(metrics: SupplierMetrics, scores: ReturnType<typeof calculateScores>): { alerts: string[]; recommendations: string[] } {
  const alerts: string[] = [];
  const recommendations: string[] = [];

  // Sync alerts
  if (metrics.hoursSinceSync > 24) {
    alerts.push(`CRITICAL: No sync in ${Math.round(metrics.hoursSinceSync)} hours`);
    recommendations.push('Run manual sync immediately');
  } else if (metrics.hoursSinceSync > 14) {
    alerts.push(`WARNING: Sync overdue (${Math.round(metrics.hoursSinceSync)}h)`);
  }

  const successRate = metrics.totalSyncs > 0 ? metrics.successfulSyncs / metrics.totalSyncs : 0;
  if (successRate < 0.7) {
    alerts.push(`CRITICAL: Sync success rate ${Math.round(successRate * 100)}%`);
    recommendations.push('Check supplier connection credentials');
  } else if (successRate < 0.9) {
    alerts.push(`WARNING: Sync success rate ${Math.round(successRate * 100)}%`);
  }

  // Data quality alerts
  if (metrics.avgMatchConfidence < 0.6) {
    alerts.push(`CRITICAL: Low match confidence (${Math.round(metrics.avgMatchConfidence * 100)}%)`);
    recommendations.push('Review product matching rules');
  } else if (metrics.avgMatchConfidence < 0.8) {
    alerts.push(`WARNING: Match confidence ${Math.round(metrics.avgMatchConfidence * 100)}%`);
  }

  // Coverage alerts
  const linkRate = metrics.totalProducts > 0 ? metrics.activeLinks / metrics.totalProducts : 0;
  if (linkRate < 0.5) {
    alerts.push(`WARNING: Only ${Math.round(linkRate * 100)}% products linked`);
    recommendations.push('Run product matching job');
  }

  // Stock alerts
  const stockRate = (metrics.zeroStockProducts + metrics.inStockProducts) > 0
    ? metrics.inStockProducts / (metrics.zeroStockProducts + metrics.inStockProducts)
    : 0;
  if (stockRate < 0.6) {
    alerts.push(`WARNING: Low in-stock rate (${Math.round(stockRate * 100)}%)`);
    recommendations.push('Review supplier stock feed');
  }

  return { alerts, recommendations };
}

/**
 * Calculate scorecard for a supplier
 */
async function calculateSupplierScore(supplier: string): Promise<SupplierScore> {
  console.log(`Calculating score for ${supplier}...`);

  const syncMetrics = await fetchSyncMetrics(supplier);
  const productMetrics = await fetchProductMetrics(supplier);
  const stockMetrics = await fetchStockMetrics(supplier);

  const metrics: SupplierMetrics = {
    totalSyncs: syncMetrics.totalSyncs || 0,
    successfulSyncs: syncMetrics.successfulSyncs || 0,
    failedSyncs: syncMetrics.failedSyncs || 0,
    lastSyncAt: syncMetrics.lastSyncAt || null,
    hoursSinceSync: syncMetrics.hoursSinceSync || Infinity,
    avgSyncDuration: syncMetrics.avgSyncDuration || 0,
    totalRecordsFailed: syncMetrics.totalRecordsFailed || 0,
    totalRecordsProcessed: syncMetrics.totalRecordsProcessed || 0,
    totalProducts: productMetrics.totalProducts || 0,
    linkedProducts: productMetrics.linkedProducts || 0,
    avgMatchConfidence: productMetrics.avgMatchConfidence || 0,
    highConfidenceLinks: productMetrics.highConfidenceLinks || 0,
    missingBarcodes: productMetrics.missingBarcodes || 0,
    missingPrices: productMetrics.missingPrices || 0,
    primarySupplierCount: productMetrics.primarySupplierCount || 0,
    activeLinks: productMetrics.activeLinks || 0,
    avgStockDiscrepancy: stockMetrics.avgStockDiscrepancy || 0,
    zeroStockProducts: stockMetrics.zeroStockProducts || 0,
    inStockProducts: stockMetrics.inStockProducts || 0
  };

  const scores = calculateScores(metrics);
  const { alerts, recommendations } = generateAlerts(metrics, scores);

  return {
    supplier,
    ...scores,
    metrics,
    alerts,
    recommendations
  };
}

/**
 * Print scorecard report
 */
function printReport(scores: SupplierScore[]) {
  console.log('\n' + '='.repeat(90));
  console.log('SUPPLIER PERFORMANCE SCORECARD');
  console.log('='.repeat(90));
  console.log(`Generated: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log('');

  // Summary table
  console.log('--- OVERALL SCORES ---');
  console.log(
    'Supplier'.padEnd(12) +
    'Score'.padStart(7) +
    'Status'.padStart(12) +
    'Sync'.padStart(7) +
    'Quality'.padStart(9) +
    'Coverage'.padStart(10) +
    'Price'.padStart(7) +
    'Stock'.padStart(7) +
    'Products'.padStart(10)
  );
  console.log('-'.repeat(81));

  for (const s of scores) {
    console.log(
      s.supplier.padEnd(12) +
      `${s.overallScore}`.padStart(7) +
      s.status.toUpperCase().padStart(12) +
      `${s.syncReliability}`.padStart(7) +
      `${s.dataQuality}`.padStart(9) +
      `${s.productCoverage}`.padStart(10) +
      `${s.pricingConsistency}`.padStart(7) +
      `${s.fulfillmentSupport}`.padStart(7) +
      `${s.metrics.totalProducts}`.padStart(10)
    );
  }
  console.log('');

  // Alerts
  const allAlerts = scores.flatMap(s => s.alerts.map(a => ({ supplier: s.supplier, alert: a })));
  if (allAlerts.length > 0) {
    console.log('--- ALERTS ---');
    for (const { supplier, alert } of allAlerts) {
      console.log(`  [${supplier.toUpperCase()}] ${alert}`);
    }
    console.log('');
  }

  // Recommendations
  const allRecs = scores.flatMap(s => s.recommendations.map(r => ({ supplier: s.supplier, rec: r })));
  if (allRecs.length > 0) {
    console.log('--- RECOMMENDATIONS ---');
    for (const { supplier, rec } of allRecs) {
      console.log(`  [${supplier}] ${rec}`);
    }
    console.log('');
  }

  // Detailed metrics
  console.log('--- DETAILED METRICS ---');
  for (const s of scores) {
    console.log(`\n${s.supplier.toUpperCase()}:`);
    console.log(`  Syncs (30d): ${s.metrics.successfulSyncs}/${s.metrics.totalSyncs} successful`);
    console.log(`  Last sync: ${s.metrics.lastSyncAt ? `${s.metrics.hoursSinceSync}h ago` : 'Never'}`);
    console.log(`  Products: ${s.metrics.totalProducts} total, ${s.metrics.activeLinks} linked`);
    console.log(`  Match confidence: ${Math.round(s.metrics.avgMatchConfidence * 100)}%`);
    console.log(`  Primary supplier for: ${s.metrics.primarySupplierCount} products`);
    console.log(`  Stock: ${s.metrics.inStockProducts} in-stock, ${s.metrics.zeroStockProducts} zero`);
  }

  console.log('\n' + '='.repeat(90));
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const supplierArg = args.find(a => a.startsWith('--supplier='))?.split('=')[1];
  const shouldExport = args.includes('--export');

  console.log('\n=== Supplier Performance Scorecard ===\n');

  const suppliers = supplierArg ? [supplierArg] : SUPPLIERS;
  const scores: SupplierScore[] = [];

  for (const supplier of suppliers) {
    const score = await calculateSupplierScore(supplier);
    scores.push(score);
  }

  printReport(scores);

  // Export if requested
  if (shouldExport) {
    const fs = await import('fs');
    const filename = `supplier-scorecard-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(scores, null, 2));
    console.log(`\nExported to ${filename}`);
  }

  // Exit with error if any critical
  if (scores.some(s => s.status === 'critical')) {
    process.exit(1);
  }
}

main().catch(console.error);
