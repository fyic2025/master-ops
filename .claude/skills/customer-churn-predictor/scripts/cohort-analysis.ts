#!/usr/bin/env npx tsx

/**
 * Cohort Analysis Script
 *
 * Analyzes customer retention by acquisition cohort.
 * Tracks cohort performance over time for churn pattern identification.
 *
 * Usage:
 *   npx tsx cohort-analysis.ts                     # Monthly cohorts
 *   npx tsx cohort-analysis.ts --period weekly     # Weekly cohorts
 *   npx tsx cohort-analysis.ts --cohort 2024-06    # Specific cohort
 *   npx tsx cohort-analysis.ts --business teelixir # Specific business
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CohortCustomer {
  email: string;
  firstOrderDate: Date;
  cohort: string;
  orders: Array<{ date: Date; amount: number }>;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: Date;
}

interface CohortMetrics {
  cohort: string;
  customers: number;
  revenue: number;
  avgOrderValue: number;
  avgOrdersPerCustomer: number;
  retentionRates: Record<string, number>; // period -> retention %
  churned: number;
  churnRate: number;
  ltv: number;
}

interface CohortReport {
  timestamp: Date;
  business: string;
  period: 'monthly' | 'weekly';
  cohorts: CohortMetrics[];
  overallRetention: Record<string, number>;
  insights: string[];
}

/**
 * Get cohort label from date
 */
function getCohortLabel(date: Date, period: 'monthly' | 'weekly'): string {
  if (period === 'weekly') {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

/**
 * Calculate months between two dates
 */
function monthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

/**
 * Analyze Teelixir cohorts
 */
async function analyzeTeelixirCohorts(period: 'monthly' | 'weekly'): Promise<CohortCustomer[]> {
  console.log(`Analyzing Teelixir cohorts (${period})...`);

  const { data: orders, error } = await supabase
    .from('tlx_shopify_orders')
    .select('customer_email, processed_at, total_price, customer_order_sequence')
    .in('financial_status', ['paid', 'partially_paid'])
    .order('processed_at', { ascending: true });

  if (error) {
    console.error('Error fetching orders:', error.message);
    return [];
  }

  // Group by customer
  const customerMap = new Map<string, CohortCustomer>();

  for (const order of orders || []) {
    if (!order.customer_email) continue;

    const orderDate = new Date(order.processed_at);
    const amount = parseFloat(order.total_price || '0');

    const existing = customerMap.get(order.customer_email);

    if (existing) {
      existing.orders.push({ date: orderDate, amount });
      existing.totalSpent += amount;
      existing.orderCount++;
      if (orderDate > existing.lastOrderDate) {
        existing.lastOrderDate = orderDate;
      }
    } else {
      customerMap.set(order.customer_email, {
        email: order.customer_email,
        firstOrderDate: orderDate,
        cohort: getCohortLabel(orderDate, period),
        orders: [{ date: orderDate, amount }],
        totalSpent: amount,
        orderCount: 1,
        lastOrderDate: orderDate
      });
    }
  }

  console.log(`  Found ${customerMap.size} unique customers`);
  return Array.from(customerMap.values());
}

/**
 * Analyze Elevate cohorts
 */
async function analyzeElevateCohorts(period: 'monthly' | 'weekly'): Promise<CohortCustomer[]> {
  console.log(`Analyzing Elevate cohorts (${period})...`);

  const { data: customers, error } = await supabase
    .from('trial_customers')
    .select('email, trial_start_date, order_count, total_order_value, last_login_at')
    .not('trial_status', 'eq', 'deactivated');

  if (error) {
    console.error('Error fetching Elevate customers:', error.message);
    return [];
  }

  const cohortCustomers: CohortCustomer[] = [];

  for (const customer of customers || []) {
    const startDate = customer.trial_start_date ? new Date(customer.trial_start_date) : new Date();

    cohortCustomers.push({
      email: customer.email,
      firstOrderDate: startDate,
      cohort: getCohortLabel(startDate, period),
      orders: [], // Would need order details
      totalSpent: customer.total_order_value || 0,
      orderCount: customer.order_count || 0,
      lastOrderDate: customer.last_login_at ? new Date(customer.last_login_at) : startDate
    });
  }

  console.log(`  Found ${cohortCustomers.length} Elevate customers`);
  return cohortCustomers;
}

/**
 * Calculate cohort metrics
 */
function calculateCohortMetrics(
  customers: CohortCustomer[],
  retentionPeriods: number[] = [1, 2, 3, 6, 12]
): CohortMetrics[] {
  // Group by cohort
  const cohortMap = new Map<string, CohortCustomer[]>();

  for (const customer of customers) {
    const existing = cohortMap.get(customer.cohort) || [];
    existing.push(customer);
    cohortMap.set(customer.cohort, existing);
  }

  const now = new Date();
  const metrics: CohortMetrics[] = [];

  for (const [cohort, cohortCustomers] of cohortMap) {
    // Parse cohort date
    const cohortYear = parseInt(cohort.substring(0, 4));
    const cohortMonth = cohort.includes('W')
      ? Math.ceil(parseInt(cohort.split('W')[1]) / 4)
      : parseInt(cohort.substring(5, 7));
    const cohortDate = new Date(cohortYear, cohortMonth - 1, 1);

    const totalRevenue = cohortCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrders = cohortCustomers.reduce((sum, c) => sum + c.orderCount, 0);

    // Calculate retention rates
    const retentionRates: Record<string, number> = {};

    for (const months of retentionPeriods) {
      const periodEnd = new Date(cohortDate);
      periodEnd.setMonth(periodEnd.getMonth() + months);

      if (periodEnd > now) {
        // Period hasn't completed yet
        continue;
      }

      // Count customers who made a purchase in this period or later
      const retained = cohortCustomers.filter(c => {
        const monthsSinceFirst = monthsBetween(c.firstOrderDate, c.lastOrderDate);
        return monthsSinceFirst >= months || c.orderCount > 1;
      }).length;

      retentionRates[`${months}m`] = Math.round((retained / cohortCustomers.length) * 100);
    }

    // Calculate churn (customers with only 1 order and > 90 days ago)
    const churnThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const churned = cohortCustomers.filter(
      c => c.orderCount === 1 && c.lastOrderDate < churnThreshold
    ).length;

    const churnRate = Math.round((churned / cohortCustomers.length) * 100);

    // Calculate LTV
    const ltv = totalRevenue / cohortCustomers.length;

    metrics.push({
      cohort,
      customers: cohortCustomers.length,
      revenue: Math.round(totalRevenue),
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      avgOrdersPerCustomer: Math.round((totalOrders / cohortCustomers.length) * 10) / 10,
      retentionRates,
      churned,
      churnRate,
      ltv: Math.round(ltv)
    });
  }

  return metrics.sort((a, b) => b.cohort.localeCompare(a.cohort));
}

/**
 * Calculate overall retention across all cohorts
 */
function calculateOverallRetention(
  metrics: CohortMetrics[],
  periods: string[] = ['1m', '2m', '3m', '6m', '12m']
): Record<string, number> {
  const overall: Record<string, number> = {};

  for (const period of periods) {
    const cohortsWithPeriod = metrics.filter(m => m.retentionRates[period] !== undefined);
    if (cohortsWithPeriod.length > 0) {
      const weightedSum = cohortsWithPeriod.reduce(
        (sum, m) => sum + m.retentionRates[period] * m.customers,
        0
      );
      const totalCustomers = cohortsWithPeriod.reduce((sum, m) => sum + m.customers, 0);
      overall[period] = Math.round(weightedSum / totalCustomers);
    }
  }

  return overall;
}

/**
 * Generate insights from cohort analysis
 */
function generateInsights(metrics: CohortMetrics[], overall: Record<string, number>): string[] {
  const insights: string[] = [];

  // Compare recent vs older cohorts
  const recentCohorts = metrics.slice(0, 3);
  const olderCohorts = metrics.slice(3, 6);

  if (recentCohorts.length > 0 && olderCohorts.length > 0) {
    const recentAvgLTV = recentCohorts.reduce((sum, m) => sum + m.ltv, 0) / recentCohorts.length;
    const olderAvgLTV = olderCohorts.reduce((sum, m) => sum + m.ltv, 0) / olderCohorts.length;

    if (recentAvgLTV < olderAvgLTV * 0.8) {
      insights.push(`WARNING: Recent cohorts showing ${Math.round((1 - recentAvgLTV / olderAvgLTV) * 100)}% lower LTV than historical cohorts.`);
    } else if (recentAvgLTV > olderAvgLTV * 1.2) {
      insights.push(`POSITIVE: Recent cohorts showing ${Math.round((recentAvgLTV / olderAvgLTV - 1) * 100)}% higher LTV than historical.`);
    }
  }

  // Check retention trends
  if (overall['1m'] && overall['3m']) {
    const dropoff = overall['1m'] - overall['3m'];
    if (dropoff > 30) {
      insights.push(`High early churn: ${dropoff}% of customers drop off between month 1 and 3. Focus on early engagement.`);
    }
  }

  // Identify best performing cohort
  const bestCohort = metrics.reduce((best, m) => m.ltv > best.ltv ? m : best, metrics[0]);
  if (bestCohort) {
    insights.push(`Best performing cohort: ${bestCohort.cohort} with $${bestCohort.ltv} LTV and ${bestCohort.avgOrdersPerCustomer} orders/customer.`);
  }

  // Check for seasonal patterns
  const monthlyData = metrics.filter(m => !m.cohort.includes('W'));
  if (monthlyData.length >= 12) {
    const q4Cohorts = monthlyData.filter(m => ['10', '11', '12'].includes(m.cohort.substring(5, 7)));
    const otherCohorts = monthlyData.filter(m => !['10', '11', '12'].includes(m.cohort.substring(5, 7)));

    if (q4Cohorts.length > 0 && otherCohorts.length > 0) {
      const q4AvgLTV = q4Cohorts.reduce((sum, m) => sum + m.ltv, 0) / q4Cohorts.length;
      const otherAvgLTV = otherCohorts.reduce((sum, m) => sum + m.ltv, 0) / otherCohorts.length;

      if (Math.abs(q4AvgLTV - otherAvgLTV) > otherAvgLTV * 0.2) {
        const diff = q4AvgLTV > otherAvgLTV ? 'higher' : 'lower';
        insights.push(`Q4 (holiday) cohorts show ${Math.round(Math.abs(q4AvgLTV - otherAvgLTV) / otherAvgLTV * 100)}% ${diff} LTV than rest of year.`);
      }
    }
  }

  // High churn cohorts
  const highChurnCohorts = metrics.filter(m => m.churnRate > 50);
  if (highChurnCohorts.length > 0) {
    insights.push(`${highChurnCohorts.length} cohorts with >50% churn rate. Review acquisition channels for these periods.`);
  }

  return insights;
}

/**
 * Print report
 */
function printReport(report: CohortReport) {
  console.log('\n' + '='.repeat(100));
  console.log('COHORT RETENTION ANALYSIS');
  console.log('='.repeat(100));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log(`Business: ${report.business.toUpperCase()}`);
  console.log(`Period: ${report.period}`);
  console.log(`Total Cohorts: ${report.cohorts.length}`);
  console.log('');

  // Overall retention
  console.log('--- OVERALL RETENTION ---');
  const periods = Object.keys(report.overallRetention).sort();
  console.log('  ' + periods.map(p => p.padStart(6)).join(''));
  console.log('  ' + periods.map(p => `${report.overallRetention[p]}%`.padStart(6)).join(''));
  console.log('');

  // Cohort table
  console.log('--- COHORT BREAKDOWN ---');
  const retentionPeriods = ['1m', '2m', '3m', '6m', '12m'];

  console.log(
    'Cohort'.padEnd(10) +
    'Cust'.padStart(7) +
    'Revenue'.padStart(12) +
    'AOV'.padStart(8) +
    'Ord/C'.padStart(7) +
    'LTV'.padStart(8) +
    'Churn'.padStart(7) +
    retentionPeriods.map(p => p.padStart(6)).join('')
  );
  console.log('-'.repeat(100));

  for (const cohort of report.cohorts.slice(0, 24)) {
    const retentionCells = retentionPeriods.map(p =>
      cohort.retentionRates[p] !== undefined ? `${cohort.retentionRates[p]}%`.padStart(6) : '-'.padStart(6)
    ).join('');

    console.log(
      cohort.cohort.padEnd(10) +
      cohort.customers.toString().padStart(7) +
      `$${cohort.revenue.toLocaleString()}`.padStart(12) +
      `$${cohort.avgOrderValue}`.padStart(8) +
      cohort.avgOrdersPerCustomer.toFixed(1).padStart(7) +
      `$${cohort.ltv}`.padStart(8) +
      `${cohort.churnRate}%`.padStart(7) +
      retentionCells
    );
  }
  console.log('');

  // Insights
  if (report.insights.length > 0) {
    console.log('--- INSIGHTS ---');
    report.insights.forEach((insight, i) => {
      console.log(`${i + 1}. ${insight}`);
    });
    console.log('');
  }

  console.log('='.repeat(100));
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const periodArg = args.find(a => a.startsWith('--period='))?.split('=')[1] as 'monthly' | 'weekly' || 'monthly';
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1];
  const cohortArg = args.find(a => a.startsWith('--cohort='))?.split('=')[1];

  console.log('\n=== Cohort Analysis ===\n');

  let allCustomers: CohortCustomer[] = [];

  // Analyze by business
  if (!businessArg || businessArg === 'teelixir') {
    const customers = await analyzeTeelixirCohorts(periodArg);
    allCustomers = allCustomers.concat(customers);
  }

  if (!businessArg || businessArg === 'elevate') {
    const customers = await analyzeElevateCohorts(periodArg);
    allCustomers = allCustomers.concat(customers);
  }

  if (allCustomers.length === 0) {
    console.log('No customer data found');
    return;
  }

  // Filter to specific cohort if requested
  if (cohortArg) {
    allCustomers = allCustomers.filter(c => c.cohort === cohortArg);
    if (allCustomers.length === 0) {
      console.log(`No customers found in cohort ${cohortArg}`);
      return;
    }
  }

  // Calculate metrics
  const cohortMetrics = calculateCohortMetrics(allCustomers);
  const overallRetention = calculateOverallRetention(cohortMetrics);
  const insights = generateInsights(cohortMetrics, overallRetention);

  // Generate report
  const report: CohortReport = {
    timestamp: new Date(),
    business: businessArg || 'all',
    period: periodArg,
    cohorts: cohortMetrics,
    overallRetention,
    insights
  };

  printReport(report);
}

main().catch(console.error);
