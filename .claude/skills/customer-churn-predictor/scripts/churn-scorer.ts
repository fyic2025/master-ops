#!/usr/bin/env npx tsx

/**
 * Churn Scorer Script
 *
 * Calculates churn risk probability for customers across all businesses.
 * Uses RFM analysis, reorder timing, and engagement signals.
 *
 * Usage:
 *   npx tsx churn-scorer.ts                          # Score all customers
 *   npx tsx churn-scorer.ts --business teelixir      # Score specific business
 *   npx tsx churn-scorer.ts --email user@example.com # Score specific customer
 *   npx tsx churn-scorer.ts --min-risk 0.6           # Only show high-risk
 *   npx tsx churn-scorer.ts --update                 # Update scores in database
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const booSupabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface CustomerData {
  email: string;
  business: string;
  lastOrderDate: Date | null;
  daysSinceOrder: number;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  expectedReorderDays: number;
  uniqueProducts: number;
  recentOrderRate: number;
  previousOrderRate: number;
  recentAOV: number;
  historicalAOV: number;
  daysSinceEmailEngagement: number;
}

interface ChurnScore {
  email: string;
  business: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rfmSegment: string;
  rScore: number;
  fScore: number;
  mScore: number;
  daysSinceOrder: number;
  expectedReorderDays: number;
  overdueRatio: number;
  recommendedAction: string;
  recommendedOffer: string | null;
}

interface ChurnReport {
  timestamp: Date;
  business: string | 'all';
  totalCustomers: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topAtRisk: ChurnScore[];
  averageChurnProbability: number;
}

// Intervention rules by business
const INTERVENTION_RULES: Record<string, Array<{ riskMin: number; action: string; offer: string | null }>> = {
  teelixir: [
    { riskMin: 0.8, action: 'winback_40_discount', offer: 'MISSYOU40' },
    { riskMin: 0.6, action: 'anniversary_15_discount', offer: 'ANNIV-15' },
    { riskMin: 0.4, action: 'educational_content', offer: null },
    { riskMin: 0, action: 'standard_newsletter', offer: null }
  ],
  elevate: [
    { riskMin: 0.8, action: 'personal_outreach', offer: 'extended_trial' },
    { riskMin: 0.6, action: 'feature_highlight', offer: 'free_shipping' },
    { riskMin: 0.4, action: 'trial_reminder', offer: null },
    { riskMin: 0, action: 'regular_updates', offer: null }
  ],
  boo: [
    { riskMin: 0.8, action: 'winback_25_discount', offer: 'COMEBACK25' },
    { riskMin: 0.6, action: 'related_products_email', offer: 'BUNDLE10' },
    { riskMin: 0.4, action: 'category_newsletter', offer: null },
    { riskMin: 0, action: 'standard_newsletter', offer: null }
  ],
  rhf: [
    { riskMin: 0.8, action: 'vip_offer', offer: 'VIP20' },
    { riskMin: 0.6, action: 'delivery_reminder', offer: 'FREEDEL' },
    { riskMin: 0.4, action: 'seasonal_promo', offer: null },
    { riskMin: 0, action: 'standard_newsletter', offer: null }
  ]
};

/**
 * Calculate churn probability from customer data
 */
function calculateChurnProbability(customer: CustomerData): number {
  const weights = {
    recencyRisk: 0.25,
    overdueRatio: 0.20,
    frequencyDecline: 0.15,
    emailDisengagement: 0.15,
    aovDecline: 0.10,
    lowDiversity: 0.10,
    lowFrequency: 0.05
  };

  // Recency risk (0-1): Higher when more days since last order
  const expectedDays = customer.expectedReorderDays || 60;
  const recencyRisk = Math.min(1, customer.daysSinceOrder / (expectedDays * 2));

  // Overdue ratio: How overdue vs expected
  const overdueRatio = customer.daysSinceOrder > expectedDays
    ? Math.min(1, (customer.daysSinceOrder - expectedDays) / expectedDays)
    : 0;

  // Frequency decline (comparing recent to historical)
  const frequencyDecline = customer.previousOrderRate > 0 && customer.recentOrderRate < customer.previousOrderRate
    ? Math.min(1, (customer.previousOrderRate - customer.recentOrderRate) / customer.previousOrderRate)
    : 0;

  // Email disengagement
  const emailDisengagement = customer.daysSinceEmailEngagement > 30
    ? Math.min(1, customer.daysSinceEmailEngagement / 90)
    : 0;

  // AOV decline
  const aovDecline = customer.historicalAOV > 0 && customer.recentAOV < customer.historicalAOV * 0.7
    ? 0.5
    : 0;

  // Low product diversity (single product buyers more likely to churn)
  const lowDiversity = customer.uniqueProducts <= 1 ? 0.4 : (customer.uniqueProducts <= 2 ? 0.2 : 0);

  // Very low frequency (only 1 order)
  const lowFrequency = customer.orderCount === 1 ? 0.3 : 0;

  const probability = (
    recencyRisk * weights.recencyRisk +
    overdueRatio * weights.overdueRatio +
    frequencyDecline * weights.frequencyDecline +
    emailDisengagement * weights.emailDisengagement +
    aovDecline * weights.aovDecline +
    lowDiversity * weights.lowDiversity +
    lowFrequency * weights.lowFrequency
  );

  return Math.min(1, Math.max(0, probability));
}

/**
 * Determine risk level from probability
 */
function getRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
  if (probability >= 0.8) return 'critical';
  if (probability >= 0.6) return 'high';
  if (probability >= 0.3) return 'medium';
  return 'low';
}

/**
 * Calculate RFM segment name
 */
function getRfmSegment(r: number, f: number, m: number): string {
  if (r >= 4 && f >= 4 && m >= 4) return 'Champion';
  if (r >= 4 && f >= 4) return 'Loyal Customer';
  if (r >= 4 && f >= 2) return 'Recent Customer';
  if (r >= 3 && f >= 3) return 'Promising';
  if (r <= 2 && f >= 4) return 'At Risk';
  if (r <= 2 && f >= 2 && m >= 3) return 'Need Attention';
  if (r <= 2 && f <= 2) return 'Hibernating';
  if (r <= 1) return 'Lost';
  return 'Average';
}

/**
 * Get intervention recommendation
 */
function getIntervention(business: string, probability: number): { action: string; offer: string | null } {
  const rules = INTERVENTION_RULES[business] || INTERVENTION_RULES['boo'];
  for (const rule of rules) {
    if (probability >= rule.riskMin) {
      return { action: rule.action, offer: rule.offer };
    }
  }
  return { action: 'standard_newsletter', offer: null };
}

/**
 * Score Teelixir customers
 */
async function scoreTeelixirCustomers(filterEmail?: string): Promise<ChurnScore[]> {
  console.log('Scoring Teelixir customers...');

  // Get customer order data
  let query = supabase
    .from('tlx_shopify_orders')
    .select('customer_email, processed_at, total_price, customer_order_sequence')
    .in('financial_status', ['paid', 'partially_paid'])
    .order('processed_at', { ascending: false });

  if (filterEmail) {
    query = query.eq('customer_email', filterEmail);
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error('Error fetching Teelixir orders:', error.message);
    return [];
  }

  // Get line items for product diversity
  const { data: lineItems } = await supabase
    .from('tlx_shopify_line_items')
    .select('order_id, shopify_product_id');

  // Get global reorder timing
  const { data: timing } = await supabase
    .from('tlx_reorder_timing')
    .select('avg_days_to_reorder')
    .eq('product_type', 'global')
    .single();

  const expectedReorderDays = timing?.avg_days_to_reorder || 60;

  // Group orders by customer
  const customerMap = new Map<string, typeof orders>();
  for (const order of orders || []) {
    if (!order.customer_email) continue;
    const existing = customerMap.get(order.customer_email) || [];
    existing.push(order);
    customerMap.set(order.customer_email, existing);
  }

  const scores: ChurnScore[] = [];
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  for (const [email, customerOrders] of customerMap) {
    const sortedOrders = customerOrders.sort(
      (a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
    );

    const lastOrder = new Date(sortedOrders[0].processed_at);
    const daysSinceOrder = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));

    const totalSpent = sortedOrders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
    const orderCount = sortedOrders.length;
    const avgOrderValue = totalSpent / orderCount;

    // Recent vs historical metrics
    const recentOrders = sortedOrders.filter(o => new Date(o.processed_at) >= ninetyDaysAgo);
    const previousOrders = sortedOrders.filter(
      o => new Date(o.processed_at) < ninetyDaysAgo && new Date(o.processed_at) >= oneEightyDaysAgo
    );

    const recentOrderRate = recentOrders.length;
    const previousOrderRate = previousOrders.length;

    const recentAOV = recentOrders.length > 0
      ? recentOrders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0) / recentOrders.length
      : avgOrderValue;

    // Product diversity (simplified - would need to join with line items)
    const uniqueProducts = Math.min(orderCount * 2, 10); // Estimate

    const customerData: CustomerData = {
      email,
      business: 'teelixir',
      lastOrderDate: lastOrder,
      daysSinceOrder,
      orderCount,
      totalSpent,
      avgOrderValue,
      expectedReorderDays,
      uniqueProducts,
      recentOrderRate,
      previousOrderRate,
      recentAOV,
      historicalAOV: avgOrderValue,
      daysSinceEmailEngagement: 30 // Would need Klaviyo integration for real data
    };

    const churnProbability = calculateChurnProbability(customerData);
    const riskLevel = getRiskLevel(churnProbability);

    // Calculate RFM scores (quintiles based on data)
    const allCustomers = Array.from(customerMap.values());
    const rScore = 5 - Math.min(4, Math.floor(daysSinceOrder / 30));
    const fScore = Math.min(5, Math.ceil(orderCount / 2));
    const mScore = Math.min(5, Math.ceil(totalSpent / 200));

    const intervention = getIntervention('teelixir', churnProbability);

    scores.push({
      email,
      business: 'teelixir',
      churnProbability: Math.round(churnProbability * 100) / 100,
      riskLevel,
      rfmSegment: getRfmSegment(rScore, fScore, mScore),
      rScore,
      fScore,
      mScore,
      daysSinceOrder,
      expectedReorderDays,
      overdueRatio: Math.max(0, (daysSinceOrder - expectedReorderDays) / expectedReorderDays),
      recommendedAction: intervention.action,
      recommendedOffer: intervention.offer
    });
  }

  console.log(`  Scored ${scores.length} Teelixir customers`);
  return scores;
}

/**
 * Score Elevate trial customers
 */
async function scoreElevateCustomers(filterEmail?: string): Promise<ChurnScore[]> {
  console.log('Scoring Elevate customers...');

  let query = supabase
    .from('trial_customers')
    .select('*')
    .not('trial_status', 'eq', 'deactivated');

  if (filterEmail) {
    query = query.eq('email', filterEmail);
  }

  const { data: customers, error } = await query;

  if (error) {
    console.error('Error fetching Elevate customers:', error.message);
    return [];
  }

  const scores: ChurnScore[] = [];
  const now = new Date();

  for (const customer of customers || []) {
    const trialStart = customer.trial_start_date ? new Date(customer.trial_start_date) : now;
    const daysInTrial = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));

    // B2B trial-specific churn calculation
    let churnProbability = 0.5; // Base risk

    if (customer.trial_status === 'converted') {
      churnProbability = 0.1;
    } else if (customer.order_count >= 3) {
      churnProbability = 0.15;
    } else if (customer.order_count >= 1 && customer.login_count >= 5) {
      churnProbability = 0.25;
    } else if (customer.login_count >= 3) {
      churnProbability = 0.4;
    } else if (customer.login_count >= 1) {
      churnProbability = 0.6;
    } else if (daysInTrial > 7) {
      churnProbability = 0.8;
    } else {
      churnProbability = 0.7;
    }

    // Adjust for trial expiry proximity
    const trialEnd = customer.trial_end_date ? new Date(customer.trial_end_date) : null;
    if (trialEnd) {
      const daysRemaining = Math.floor((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 3 && customer.order_count === 0) {
        churnProbability = Math.min(1, churnProbability + 0.2);
      }
    }

    const riskLevel = getRiskLevel(churnProbability);
    const intervention = getIntervention('elevate', churnProbability);

    // RFM for B2B (adapted)
    const rScore = Math.max(1, 5 - Math.floor(daysInTrial / 7));
    const fScore = Math.min(5, customer.login_count || 1);
    const mScore = Math.min(5, Math.ceil((customer.total_order_value || 0) / 500) + 1);

    scores.push({
      email: customer.email,
      business: 'elevate',
      churnProbability: Math.round(churnProbability * 100) / 100,
      riskLevel,
      rfmSegment: customer.trial_status === 'converted' ? 'Converted' :
                  customer.order_count >= 3 ? 'High Intent' :
                  customer.order_count >= 1 ? 'Engaged' :
                  customer.login_count >= 3 ? 'Exploring' : 'Inactive',
      rScore,
      fScore,
      mScore,
      daysSinceOrder: daysInTrial,
      expectedReorderDays: 14, // Trial expectation
      overdueRatio: Math.max(0, (daysInTrial - 14) / 14),
      recommendedAction: intervention.action,
      recommendedOffer: intervention.offer
    });
  }

  console.log(`  Scored ${scores.length} Elevate customers`);
  return scores;
}

/**
 * Generate churn report
 */
function generateReport(scores: ChurnScore[], business: string | 'all'): ChurnReport {
  const riskDistribution = {
    low: scores.filter(s => s.riskLevel === 'low').length,
    medium: scores.filter(s => s.riskLevel === 'medium').length,
    high: scores.filter(s => s.riskLevel === 'high').length,
    critical: scores.filter(s => s.riskLevel === 'critical').length
  };

  const topAtRisk = scores
    .filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical')
    .sort((a, b) => b.churnProbability - a.churnProbability)
    .slice(0, 20);

  const averageChurnProbability = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.churnProbability, 0) / scores.length
    : 0;

  return {
    timestamp: new Date(),
    business,
    totalCustomers: scores.length,
    riskDistribution,
    topAtRisk,
    averageChurnProbability: Math.round(averageChurnProbability * 100) / 100
  };
}

/**
 * Print report
 */
function printReport(report: ChurnReport) {
  console.log('\n' + '='.repeat(70));
  console.log('CUSTOMER CHURN RISK REPORT');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log(`Business: ${report.business.toUpperCase()}`);
  console.log(`Total Customers: ${report.totalCustomers}`);
  console.log(`Average Churn Probability: ${(report.averageChurnProbability * 100).toFixed(1)}%`);
  console.log('');

  console.log('--- RISK DISTRIBUTION ---');
  const total = report.totalCustomers || 1;
  console.log(`  Low (0-30%):      ${report.riskDistribution.low.toString().padStart(5)} (${((report.riskDistribution.low / total) * 100).toFixed(1)}%)`);
  console.log(`  Medium (30-60%):  ${report.riskDistribution.medium.toString().padStart(5)} (${((report.riskDistribution.medium / total) * 100).toFixed(1)}%)`);
  console.log(`  High (60-80%):    ${report.riskDistribution.high.toString().padStart(5)} (${((report.riskDistribution.high / total) * 100).toFixed(1)}%)`);
  console.log(`  Critical (80%+):  ${report.riskDistribution.critical.toString().padStart(5)} (${((report.riskDistribution.critical / total) * 100).toFixed(1)}%)`);
  console.log('');

  if (report.topAtRisk.length > 0) {
    console.log('--- TOP AT-RISK CUSTOMERS ---');
    console.log(
      'Email'.padEnd(35) +
      'Risk'.padStart(6) +
      'Segment'.padStart(15) +
      'Days'.padStart(6) +
      'Action'.padStart(25)
    );
    console.log('-'.repeat(87));

    for (const customer of report.topAtRisk.slice(0, 15)) {
      const emailDisplay = customer.email.length > 33 ? customer.email.substring(0, 30) + '...' : customer.email;
      console.log(
        emailDisplay.padEnd(35) +
        `${(customer.churnProbability * 100).toFixed(0)}%`.padStart(6) +
        customer.rfmSegment.padStart(15) +
        customer.daysSinceOrder.toString().padStart(6) +
        customer.recommendedAction.padStart(25)
      );
    }
    console.log('');
  }

  console.log('='.repeat(70));
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1];
  const emailArg = args.find(a => a.startsWith('--email='))?.split('=')[1];
  const minRiskArg = args.find(a => a.startsWith('--min-risk='))?.split('=')[1];
  const shouldUpdate = args.includes('--update');

  console.log('\n=== Customer Churn Scorer ===\n');

  let allScores: ChurnScore[] = [];

  // Score customers by business
  if (!businessArg || businessArg === 'teelixir') {
    const scores = await scoreTeelixirCustomers(emailArg);
    allScores = allScores.concat(scores);
  }

  if (!businessArg || businessArg === 'elevate') {
    const scores = await scoreElevateCustomers(emailArg);
    allScores = allScores.concat(scores);
  }

  // Filter by minimum risk if specified
  if (minRiskArg) {
    const minRisk = parseFloat(minRiskArg);
    allScores = allScores.filter(s => s.churnProbability >= minRisk);
    console.log(`Filtered to ${allScores.length} customers with risk >= ${minRisk}`);
  }

  // Generate and print report
  const report = generateReport(allScores, businessArg || 'all');
  printReport(report);

  // Update database if requested
  if (shouldUpdate && allScores.length > 0) {
    console.log('\nUpdating churn scores in database...');
    // Would upsert to a customer_churn_scores table
    console.log('  (Database update not yet implemented)');
  }

  // Exit with warning if high-risk customers found
  const criticalCount = report.riskDistribution.critical + report.riskDistribution.high;
  if (criticalCount > 10) {
    console.log(`\nWARNING: ${criticalCount} customers at high/critical churn risk`);
  }
}

main().catch(console.error);
