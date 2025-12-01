#!/usr/bin/env npx tsx

/**
 * RFM Segmentation Script
 *
 * Generates Recency, Frequency, Monetary segmentation for customer base.
 * Creates actionable customer segments for marketing and retention.
 *
 * Usage:
 *   npx tsx rfm-segmentation.ts                    # Full RFM analysis
 *   npx tsx rfm-segmentation.ts --business teelixir # Specific business
 *   npx tsx rfm-segmentation.ts --export           # Export to CSV
 *   npx tsx rfm-segmentation.ts --update           # Update database view
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CustomerRFM {
  email: string;
  business: string;
  firstName: string | null;
  lastOrderDate: Date;
  daysSinceOrder: number;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfmScore: string;
  segment: string;
}

interface SegmentStats {
  segment: string;
  count: number;
  percentage: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
  totalRevenue: number;
}

interface RFMReport {
  timestamp: Date;
  business: string;
  totalCustomers: number;
  segments: SegmentStats[];
  recommendations: string[];
}

// RFM Segment definitions
const RFM_SEGMENTS: Record<string, { name: string; pattern: RegExp; description: string; action: string }> = {
  champions: {
    name: 'Champions',
    pattern: /^[45][45][45]$/,
    description: 'Best customers - buy often, recently, and spend most',
    action: 'Reward with loyalty program, ask for reviews, upsell premium'
  },
  loyal: {
    name: 'Loyal Customers',
    pattern: /^[345][45][34]$/,
    description: 'Consistent buyers with good spending',
    action: 'Upsell higher value products, engage with loyalty rewards'
  },
  potential_loyalist: {
    name: 'Potential Loyalists',
    pattern: /^[45][23][23]$/,
    description: 'Recent customers with moderate engagement',
    action: 'Offer membership, recommend other products, engage'
  },
  new_customers: {
    name: 'New Customers',
    pattern: /^[45][1][1-3]$/,
    description: 'Bought most recently but only once',
    action: 'Provide onboarding, early engagement, second purchase incentive'
  },
  promising: {
    name: 'Promising',
    pattern: /^[34][1][1-2]$/,
    description: 'Recent shoppers with low frequency',
    action: 'Create brand awareness, offer trials'
  },
  need_attention: {
    name: 'Need Attention',
    pattern: /^[23][23][23]$/,
    description: 'Average in all dimensions, risk of drifting away',
    action: 'Reactivate with limited offers, personalized recommendations'
  },
  about_to_sleep: {
    name: 'About to Sleep',
    pattern: /^[23][12][12]$/,
    description: 'Below average recency and frequency',
    action: 'Win back with targeted campaign, new product launch'
  },
  at_risk: {
    name: 'At Risk',
    pattern: /^[12][34][34]$/,
    description: 'Spent and bought often but long time ago',
    action: 'Urgent reactivation, personalized offers, feedback request'
  },
  cant_lose: {
    name: "Can't Lose Them",
    pattern: /^[12][45][45]$/,
    description: 'Made biggest purchases but haven\'t returned',
    action: 'Win back urgently, personal outreach, exclusive offers'
  },
  hibernating: {
    name: 'Hibernating',
    pattern: /^[12][12][12]$/,
    description: 'Low in all dimensions',
    action: 'Offer relevant products, special discounts to re-engage'
  },
  lost: {
    name: 'Lost',
    pattern: /^1[1][1-2]$/,
    description: 'Lowest recency, frequency, and monetary',
    action: 'Try winback campaign, otherwise deprioritize'
  }
};

/**
 * Determine RFM segment from scores
 */
function getSegment(rScore: number, fScore: number, mScore: number): string {
  const rfmString = `${rScore}${fScore}${mScore}`;

  for (const [key, config] of Object.entries(RFM_SEGMENTS)) {
    if (config.pattern.test(rfmString)) {
      return config.name;
    }
  }

  // Default fallback based on R score
  if (rScore >= 4) return 'Recent Customer';
  if (rScore <= 2 && fScore >= 3) return 'At Risk';
  return 'Average';
}

/**
 * Calculate RFM for Teelixir customers
 */
async function calculateTeelixirRFM(): Promise<CustomerRFM[]> {
  console.log('Calculating RFM for Teelixir...');

  const { data: orders, error } = await supabase
    .from('tlx_shopify_orders')
    .select('customer_email, customer_first_name, processed_at, total_price')
    .in('financial_status', ['paid', 'partially_paid'])
    .order('processed_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error.message);
    return [];
  }

  // Aggregate by customer
  const customerMap = new Map<string, {
    firstName: string | null;
    orders: Array<{ date: Date; amount: number }>;
  }>();

  for (const order of orders || []) {
    if (!order.customer_email) continue;

    const existing = customerMap.get(order.customer_email) || {
      firstName: order.customer_first_name,
      orders: []
    };

    existing.orders.push({
      date: new Date(order.processed_at),
      amount: parseFloat(order.total_price || '0')
    });

    customerMap.set(order.customer_email, existing);
  }

  // Calculate metrics for quintile calculation
  const allMetrics: Array<{ recency: number; frequency: number; monetary: number }> = [];

  const now = new Date();

  for (const [email, data] of customerMap) {
    const sortedOrders = data.orders.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recency = Math.floor((now.getTime() - sortedOrders[0].date.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = sortedOrders.length;
    const monetary = sortedOrders.reduce((sum, o) => sum + o.amount, 0);

    allMetrics.push({ recency, frequency, monetary });
  }

  // Calculate quintile boundaries
  const recencies = allMetrics.map(m => m.recency).sort((a, b) => a - b);
  const frequencies = allMetrics.map(m => m.frequency).sort((a, b) => a - b);
  const monetaries = allMetrics.map(m => m.monetary).sort((a, b) => a - b);

  const getQuintile = (value: number, sorted: number[], inverse: boolean = false): number => {
    const idx = sorted.findIndex(v => v >= value);
    const position = idx >= 0 ? idx : sorted.length;
    const quintile = Math.min(5, Math.ceil((position + 1) / (sorted.length / 5)));
    return inverse ? 6 - quintile : quintile;
  };

  // Build RFM records
  const rfmRecords: CustomerRFM[] = [];

  for (const [email, data] of customerMap) {
    const sortedOrders = data.orders.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recency = Math.floor((now.getTime() - sortedOrders[0].date.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = sortedOrders.length;
    const monetary = sortedOrders.reduce((sum, o) => sum + o.amount, 0);

    const rScore = getQuintile(recency, recencies, true); // Inverse - lower recency = higher score
    const fScore = getQuintile(frequency, frequencies);
    const mScore = getQuintile(monetary, monetaries);

    rfmRecords.push({
      email,
      business: 'teelixir',
      firstName: data.firstName,
      lastOrderDate: sortedOrders[0].date,
      daysSinceOrder: recency,
      orderCount: frequency,
      totalSpent: monetary,
      avgOrderValue: monetary / frequency,
      rScore,
      fScore,
      mScore,
      rfmScore: `${rScore}${fScore}${mScore}`,
      segment: getSegment(rScore, fScore, mScore)
    });
  }

  console.log(`  Calculated RFM for ${rfmRecords.length} customers`);
  return rfmRecords;
}

/**
 * Calculate RFM for Elevate trial customers
 */
async function calculateElevateRFM(): Promise<CustomerRFM[]> {
  console.log('Calculating RFM for Elevate...');

  const { data: customers, error } = await supabase
    .from('trial_customers')
    .select('*')
    .not('trial_status', 'eq', 'deactivated');

  if (error) {
    console.error('Error fetching Elevate customers:', error.message);
    return [];
  }

  const rfmRecords: CustomerRFM[] = [];
  const now = new Date();

  // For B2B trials, adapt RFM to trial engagement
  for (const customer of customers || []) {
    const trialStart = customer.trial_start_date ? new Date(customer.trial_start_date) : now;
    const lastActivity = customer.last_login_at ? new Date(customer.last_login_at) : trialStart;
    const recency = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    // Adapted scoring for B2B trials
    const rScore = Math.max(1, 5 - Math.floor(recency / 5));
    const fScore = Math.min(5, Math.ceil((customer.login_count || 0) / 2) + 1);
    const mScore = Math.min(5, Math.ceil((customer.total_order_value || 0) / 500) + 1);

    let segment = 'Trial User';
    if (customer.trial_status === 'converted') segment = 'Champions';
    else if (customer.order_count >= 3) segment = 'Loyal Customers';
    else if (customer.order_count >= 1) segment = 'Potential Loyalists';
    else if (customer.login_count >= 5) segment = 'Promising';
    else if (customer.login_count >= 1) segment = 'New Customers';
    else segment = 'Hibernating';

    rfmRecords.push({
      email: customer.email,
      business: 'elevate',
      firstName: customer.firstname,
      lastOrderDate: lastActivity,
      daysSinceOrder: recency,
      orderCount: customer.order_count || 0,
      totalSpent: customer.total_order_value || 0,
      avgOrderValue: customer.order_count > 0 ? (customer.total_order_value || 0) / customer.order_count : 0,
      rScore,
      fScore,
      mScore,
      rfmScore: `${rScore}${fScore}${mScore}`,
      segment
    });
  }

  console.log(`  Calculated RFM for ${rfmRecords.length} customers`);
  return rfmRecords;
}

/**
 * Calculate segment statistics
 */
function calculateSegmentStats(records: CustomerRFM[]): SegmentStats[] {
  const segmentMap = new Map<string, CustomerRFM[]>();

  for (const record of records) {
    const existing = segmentMap.get(record.segment) || [];
    existing.push(record);
    segmentMap.set(record.segment, existing);
  }

  const stats: SegmentStats[] = [];
  const total = records.length || 1;

  for (const [segment, customers] of segmentMap) {
    const avgRecency = customers.reduce((sum, c) => sum + c.daysSinceOrder, 0) / customers.length;
    const avgFrequency = customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length;
    const avgMonetary = customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    stats.push({
      segment,
      count: customers.length,
      percentage: Math.round((customers.length / total) * 100 * 10) / 10,
      avgRecency: Math.round(avgRecency),
      avgFrequency: Math.round(avgFrequency * 10) / 10,
      avgMonetary: Math.round(avgMonetary),
      totalRevenue: Math.round(totalRevenue)
    });
  }

  return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Generate recommendations based on segments
 */
function generateRecommendations(stats: SegmentStats[]): string[] {
  const recommendations: string[] = [];

  const atRisk = stats.find(s => s.segment === 'At Risk' || s.segment === "Can't Lose Them");
  if (atRisk && atRisk.percentage > 10) {
    recommendations.push(`HIGH PRIORITY: ${atRisk.count} valuable customers (${atRisk.percentage}%) at risk of churning. Launch targeted win-back campaign.`);
  }

  const hibernating = stats.find(s => s.segment === 'Hibernating' || s.segment === 'Lost');
  if (hibernating && hibernating.percentage > 20) {
    recommendations.push(`${hibernating.count} customers hibernating. Consider re-engagement campaign with strong offer.`);
  }

  const newCustomers = stats.find(s => s.segment === 'New Customers');
  if (newCustomers && newCustomers.count > 0) {
    recommendations.push(`${newCustomers.count} new customers need onboarding. Send welcome series and second-purchase incentive.`);
  }

  const champions = stats.find(s => s.segment === 'Champions');
  if (champions) {
    recommendations.push(`${champions.count} Champions generating $${champions.totalRevenue.toLocaleString()} revenue. Consider VIP program and referral incentives.`);
  }

  const promising = stats.find(s => s.segment === 'Promising' || s.segment === 'Potential Loyalists');
  if (promising && promising.count > 0) {
    recommendations.push(`${promising.count} customers showing promise. Nurture with educational content and product recommendations.`);
  }

  return recommendations;
}

/**
 * Print report
 */
function printReport(report: RFMReport) {
  console.log('\n' + '='.repeat(80));
  console.log('RFM SEGMENTATION REPORT');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log(`Business: ${report.business.toUpperCase()}`);
  console.log(`Total Customers: ${report.totalCustomers.toLocaleString()}`);
  console.log('');

  console.log('--- SEGMENT BREAKDOWN ---');
  console.log(
    'Segment'.padEnd(22) +
    'Count'.padStart(8) +
    '%'.padStart(7) +
    'Avg Days'.padStart(10) +
    'Avg Orders'.padStart(12) +
    'Avg Spent'.padStart(12) +
    'Total Rev'.padStart(14)
  );
  console.log('-'.repeat(85));

  for (const stat of report.segments) {
    console.log(
      stat.segment.substring(0, 21).padEnd(22) +
      stat.count.toString().padStart(8) +
      `${stat.percentage}%`.padStart(7) +
      stat.avgRecency.toString().padStart(10) +
      stat.avgFrequency.toFixed(1).padStart(12) +
      `$${stat.avgMonetary.toLocaleString()}`.padStart(12) +
      `$${stat.totalRevenue.toLocaleString()}`.padStart(14)
    );
  }
  console.log('');

  if (report.recommendations.length > 0) {
    console.log('--- RECOMMENDATIONS ---');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    console.log('');
  }

  console.log('--- SEGMENT ACTIONS ---');
  for (const [key, config] of Object.entries(RFM_SEGMENTS)) {
    const stat = report.segments.find(s => s.segment === config.name);
    if (stat && stat.count > 0) {
      console.log(`${config.name}: ${config.action}`);
    }
  }
  console.log('');

  console.log('='.repeat(80));
}

/**
 * Export to CSV
 */
async function exportToCsv(records: CustomerRFM[], filename: string) {
  const fs = await import('fs');

  const headers = ['email', 'business', 'first_name', 'last_order_date', 'days_since_order', 'order_count', 'total_spent', 'avg_order_value', 'r_score', 'f_score', 'm_score', 'rfm_score', 'segment'];

  const rows = records.map(r => [
    r.email,
    r.business,
    r.firstName || '',
    r.lastOrderDate.toISOString().split('T')[0],
    r.daysSinceOrder,
    r.orderCount,
    r.totalSpent.toFixed(2),
    r.avgOrderValue.toFixed(2),
    r.rScore,
    r.fScore,
    r.mScore,
    r.rfmScore,
    r.segment
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(filename, csv);
  console.log(`Exported ${records.length} records to ${filename}`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1];
  const shouldExport = args.includes('--export');
  const shouldUpdate = args.includes('--update');

  console.log('\n=== RFM Segmentation Analysis ===\n');

  let allRecords: CustomerRFM[] = [];

  // Calculate RFM by business
  if (!businessArg || businessArg === 'teelixir') {
    const records = await calculateTeelixirRFM();
    allRecords = allRecords.concat(records);
  }

  if (!businessArg || businessArg === 'elevate') {
    const records = await calculateElevateRFM();
    allRecords = allRecords.concat(records);
  }

  if (allRecords.length === 0) {
    console.log('No customer data found');
    return;
  }

  // Calculate statistics
  const segmentStats = calculateSegmentStats(allRecords);
  const recommendations = generateRecommendations(segmentStats);

  // Generate report
  const report: RFMReport = {
    timestamp: new Date(),
    business: businessArg || 'all',
    totalCustomers: allRecords.length,
    segments: segmentStats,
    recommendations
  };

  printReport(report);

  // Export if requested
  if (shouldExport) {
    const filename = `rfm-segments-${businessArg || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    await exportToCsv(allRecords, filename);
  }

  // Update database view if requested
  if (shouldUpdate) {
    console.log('\nUpdating RFM view in database...');
    // Would create/refresh a materialized view
    console.log('  (View update not yet implemented)');
  }
}

main().catch(console.error);
