#!/usr/bin/env npx tsx

/**
 * Sync Health Check Script
 *
 * Monitors the health of supplier sync jobs.
 * Alerts on missed syncs, failures, and data quality issues.
 *
 * Usage:
 *   npx tsx sync-health-check.ts              # Full health check
 *   npx tsx sync-health-check.ts --supplier oborne  # Check specific supplier
 *   npx tsx sync-health-check.ts --alert      # Generate alerts only
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface SupplierHealth {
  supplier: string;
  lastSync: Date | null;
  hoursSinceSync: number;
  syncCount7d: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration: number;
  productCount: number;
  zeroStockCount: number;
  zeroStockRate: number;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  issues: string[];
}

interface SyncHealthReport {
  timestamp: Date;
  suppliers: SupplierHealth[];
  overallStatus: 'healthy' | 'warning' | 'critical';
  alerts: Array<{
    type: string;
    supplier: string;
    severity: 'warning' | 'critical';
    message: string;
  }>;
  recommendations: string[];
}

const EXPECTED_SUPPLIERS = ['oborne', 'uhp', 'kadac', 'unleashed'];

/**
 * Get sync logs for a supplier
 */
async function getSupplierSyncLogs(supplier: string, days: number = 7): Promise<Array<{
  status: string;
  started_at: string;
  completed_at: string | null;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
}>> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('sync_logs')
    .select('status, started_at, completed_at, records_processed, records_failed, error_message')
    .eq('supplier_name', supplier)
    .gte('started_at', startDate)
    .order('started_at', { ascending: false });

  return data || [];
}

/**
 * Get product counts by supplier
 */
async function getSupplierProductCounts(): Promise<Record<string, { total: number; zeroStock: number }>> {
  const { data: products } = await supabase
    .from('ecommerce_products')
    .select('primary_supplier, inventory_level')
    .eq('is_active', true);

  const counts: Record<string, { total: number; zeroStock: number }> = {};

  for (const supplier of EXPECTED_SUPPLIERS) {
    counts[supplier] = { total: 0, zeroStock: 0 };
  }
  counts['unassigned'] = { total: 0, zeroStock: 0 };

  for (const product of products || []) {
    const supplier = product.primary_supplier || 'unassigned';
    if (!counts[supplier]) {
      counts[supplier] = { total: 0, zeroStock: 0 };
    }
    counts[supplier].total++;
    if (product.inventory_level === 0) {
      counts[supplier].zeroStock++;
    }
  }

  return counts;
}

/**
 * Check health of a single supplier
 */
async function checkSupplierHealth(supplier: string): Promise<SupplierHealth> {
  const logs = await getSupplierSyncLogs(supplier);
  const productCounts = await getSupplierProductCounts();

  const health: SupplierHealth = {
    supplier,
    lastSync: null,
    hoursSinceSync: Infinity,
    syncCount7d: logs.length,
    successCount: 0,
    failureCount: 0,
    successRate: 0,
    avgDuration: 0,
    productCount: productCounts[supplier]?.total || 0,
    zeroStockCount: productCounts[supplier]?.zeroStock || 0,
    zeroStockRate: 0,
    status: 'unknown',
    issues: []
  };

  if (logs.length === 0) {
    health.status = 'critical';
    health.issues.push('No sync logs found in last 7 days');
    return health;
  }

  // Calculate metrics
  const latestLog = logs[0];
  health.lastSync = new Date(latestLog.started_at);
  health.hoursSinceSync = (Date.now() - health.lastSync.getTime()) / (1000 * 60 * 60);

  health.successCount = logs.filter(l => l.status === 'completed').length;
  health.failureCount = logs.filter(l => l.status === 'failed').length;
  health.successRate = Math.round((health.successCount / logs.length) * 100);

  // Calculate average duration
  const completedLogs = logs.filter(l => l.completed_at);
  if (completedLogs.length > 0) {
    const totalDuration = completedLogs.reduce((sum, l) => {
      const start = new Date(l.started_at).getTime();
      const end = new Date(l.completed_at!).getTime();
      return sum + (end - start);
    }, 0);
    health.avgDuration = Math.round(totalDuration / completedLogs.length / 1000); // seconds
  }

  // Product metrics
  if (health.productCount > 0) {
    health.zeroStockRate = Math.round((health.zeroStockCount / health.productCount) * 100);
  }

  // Determine status and issues
  if (health.hoursSinceSync > 14) {
    health.status = 'critical';
    health.issues.push(`Sync overdue: ${Math.round(health.hoursSinceSync)} hours since last sync`);
  } else if (health.hoursSinceSync > 10) {
    health.status = 'warning';
    health.issues.push(`Sync may be delayed: ${Math.round(health.hoursSinceSync)} hours since last sync`);
  }

  if (health.failureCount > 0) {
    if (health.failureCount > health.successCount) {
      health.status = 'critical';
      health.issues.push(`High failure rate: ${health.failureCount} failures vs ${health.successCount} successes`);
    } else {
      if (health.status !== 'critical') health.status = 'warning';
      health.issues.push(`${health.failureCount} sync failures in last 7 days`);
    }
  }

  if (health.zeroStockRate > 50) {
    if (health.status !== 'critical') health.status = 'warning';
    health.issues.push(`High zero-stock rate: ${health.zeroStockRate}% of products`);
  }

  if (health.status === 'unknown') {
    health.status = 'healthy';
  }

  return health;
}

/**
 * Run full health check
 */
async function runHealthCheck(filterSupplier?: string): Promise<SyncHealthReport> {
  console.log('\nRunning supplier sync health check...\n');

  const suppliers = filterSupplier
    ? [filterSupplier]
    : EXPECTED_SUPPLIERS;

  const supplierHealth: SupplierHealth[] = [];

  for (const supplier of suppliers) {
    console.log(`Checking ${supplier}...`);
    const health = await checkSupplierHealth(supplier);
    supplierHealth.push(health);
  }

  // Generate alerts
  const alerts: SyncHealthReport['alerts'] = [];

  for (const health of supplierHealth) {
    if (health.hoursSinceSync > 14) {
      alerts.push({
        type: 'sync_overdue',
        supplier: health.supplier,
        severity: 'critical',
        message: `${health.supplier} sync is ${Math.round(health.hoursSinceSync)} hours overdue`
      });
    }

    if (health.failureCount > health.successCount) {
      alerts.push({
        type: 'high_failure_rate',
        supplier: health.supplier,
        severity: 'critical',
        message: `${health.supplier} has more failures (${health.failureCount}) than successes (${health.successCount})`
      });
    } else if (health.failureCount > 0) {
      alerts.push({
        type: 'sync_failures',
        supplier: health.supplier,
        severity: 'warning',
        message: `${health.supplier} had ${health.failureCount} failed syncs in last 7 days`
      });
    }

    if (health.zeroStockRate > 50) {
      alerts.push({
        type: 'high_zero_stock',
        supplier: health.supplier,
        severity: 'warning',
        message: `${health.supplier} has ${health.zeroStockRate}% products with zero stock`
      });
    }
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (supplierHealth.some(s => s.status === 'critical')) {
    overallStatus = 'critical';
  } else if (supplierHealth.some(s => s.status === 'warning')) {
    overallStatus = 'warning';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  const overdueSuppliers = supplierHealth.filter(s => s.hoursSinceSync > 14);
  if (overdueSuppliers.length > 0) {
    recommendations.push(`Run manual sync for: ${overdueSuppliers.map(s => s.supplier).join(', ')}`);
    recommendations.push('Command: node buy-organics-online/sync-all-suppliers.js');
  }

  const failingSuppliers = supplierHealth.filter(s => s.failureCount > 0);
  if (failingSuppliers.length > 0) {
    recommendations.push('Review sync_logs for error details on failing suppliers');
  }

  const highZeroStock = supplierHealth.filter(s => s.zeroStockRate > 30);
  if (highZeroStock.length > 0) {
    recommendations.push(`Review supplier feeds for: ${highZeroStock.map(s => s.supplier).join(', ')}`);
  }

  return {
    timestamp: new Date(),
    suppliers: supplierHealth,
    overallStatus,
    alerts,
    recommendations
  };
}

/**
 * Print report
 */
function printReport(report: SyncHealthReport) {
  console.log('\n' + '='.repeat(70));
  console.log('SUPPLIER SYNC HEALTH REPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log(`Overall Status: ${report.overallStatus.toUpperCase()}`);
  console.log('');

  // Supplier details
  console.log('--- SUPPLIER STATUS ---');
  console.log(
    'Supplier'.padEnd(12) +
    'Status'.padEnd(10) +
    'Last Sync'.padEnd(14) +
    'Success'.padStart(8) +
    'Failed'.padStart(8) +
    'Products'.padStart(10) +
    'Zero%'.padStart(8)
  );
  console.log('-'.repeat(70));

  for (const s of report.suppliers) {
    const lastSyncStr = s.lastSync
      ? `${Math.round(s.hoursSinceSync)}h ago`
      : 'Never';

    const statusIcon = s.status === 'healthy' ? 'OK' :
                       s.status === 'warning' ? 'WARN' : 'FAIL';

    console.log(
      s.supplier.padEnd(12) +
      statusIcon.padEnd(10) +
      lastSyncStr.padEnd(14) +
      s.successCount.toString().padStart(8) +
      s.failureCount.toString().padStart(8) +
      s.productCount.toString().padStart(10) +
      `${s.zeroStockRate}%`.padStart(8)
    );
  }
  console.log('');

  // Issues by supplier
  const suppliersWithIssues = report.suppliers.filter(s => s.issues.length > 0);
  if (suppliersWithIssues.length > 0) {
    console.log('--- ISSUES ---');
    for (const s of suppliersWithIssues) {
      console.log(`${s.supplier}:`);
      s.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    console.log('');
  }

  // Alerts
  if (report.alerts.length > 0) {
    console.log('--- ALERTS ---');
    for (const alert of report.alerts) {
      const icon = alert.severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
      console.log(`${icon} ${alert.supplier}: ${alert.message}`);
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
  const supplierArg = args.find(a => a.startsWith('--supplier='))?.split('=')[1] ||
                      (args.includes('--supplier') ? args[args.indexOf('--supplier') + 1] : undefined);
  const alertOnly = args.includes('--alert');

  try {
    const report = await runHealthCheck(supplierArg);

    if (alertOnly) {
      // Just output alerts
      if (report.alerts.length === 0) {
        console.log('No alerts');
      } else {
        for (const alert of report.alerts) {
          console.log(`[${alert.severity.toUpperCase()}] ${alert.supplier}: ${alert.message}`);
        }
      }
    } else {
      printReport(report);

      // Save report
      const fs = await import('fs');
      const filename = `sync-health-${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(filename, JSON.stringify(report, null, 2));
      console.log(`\nReport saved to: ${filename}`);
    }

    // Exit with error if critical status
    if (report.overallStatus === 'critical') {
      process.exit(1);
    }

  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  }
}

main();
