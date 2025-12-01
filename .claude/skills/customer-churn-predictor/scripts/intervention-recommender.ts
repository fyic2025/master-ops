#!/usr/bin/env npx tsx

/**
 * Intervention Recommender Script
 *
 * Generates personalized retention intervention recommendations
 * for at-risk customers based on churn probability and behavior.
 *
 * Usage:
 *   npx tsx intervention-recommender.ts                    # Today's interventions
 *   npx tsx intervention-recommender.ts --business teelixir
 *   npx tsx intervention-recommender.ts --min-risk 0.6     # Only high-risk
 *   npx tsx intervention-recommender.ts --export           # Export to CSV
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CustomerProfile {
  email: string;
  business: string;
  firstName: string | null;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysSinceOrder: number;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  rfmSegment: string;
  topProducts: string[];
}

interface Intervention {
  email: string;
  business: string;
  firstName: string | null;
  churnProbability: number;
  riskLevel: string;
  rfmSegment: string;
  action: string;
  channel: 'email' | 'sms' | 'personal' | 'automated';
  offer: string | null;
  offerValue: string | null;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  personalization: string;
  estimatedLiftRate: number;
  priority: number;
}

interface InterventionReport {
  timestamp: Date;
  business: string;
  totalAtRisk: number;
  interventions: Intervention[];
  byChannel: Record<string, number>;
  byUrgency: Record<string, number>;
  estimatedRecoveryValue: number;
}

// Intervention templates by business
const INTERVENTION_TEMPLATES: Record<string, Array<{
  riskMin: number;
  riskMax: number;
  action: string;
  channel: 'email' | 'sms' | 'personal' | 'automated';
  offer: string | null;
  offerValue: string | null;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  liftRate: number;
}>> = {
  teelixir: [
    { riskMin: 0.8, riskMax: 1.0, action: 'winback_40_discount', channel: 'email', offer: 'MISSYOU40', offerValue: '40% off', urgency: 'immediate', liftRate: 0.15 },
    { riskMin: 0.6, riskMax: 0.8, action: 'anniversary_15_discount', channel: 'email', offer: 'ANNIV-15', offerValue: '15% off', urgency: 'high', liftRate: 0.12 },
    { riskMin: 0.4, riskMax: 0.6, action: 'educational_reengagement', channel: 'automated', offer: null, offerValue: null, urgency: 'medium', liftRate: 0.08 },
    { riskMin: 0.3, riskMax: 0.4, action: 'product_recommendation', channel: 'automated', offer: null, offerValue: null, urgency: 'low', liftRate: 0.05 }
  ],
  elevate: [
    { riskMin: 0.8, riskMax: 1.0, action: 'personal_outreach_call', channel: 'personal', offer: 'extended_trial', offerValue: '14 day extension', urgency: 'immediate', liftRate: 0.25 },
    { riskMin: 0.6, riskMax: 0.8, action: 'account_review_meeting', channel: 'personal', offer: 'free_shipping', offerValue: 'Free shipping', urgency: 'high', liftRate: 0.20 },
    { riskMin: 0.4, riskMax: 0.6, action: 'feature_highlight_email', channel: 'email', offer: null, offerValue: null, urgency: 'medium', liftRate: 0.10 },
    { riskMin: 0.3, riskMax: 0.4, action: 'trial_reminder', channel: 'automated', offer: null, offerValue: null, urgency: 'low', liftRate: 0.08 }
  ],
  boo: [
    { riskMin: 0.8, riskMax: 1.0, action: 'winback_25_discount', channel: 'email', offer: 'COMEBACK25', offerValue: '25% off', urgency: 'immediate', liftRate: 0.12 },
    { riskMin: 0.6, riskMax: 0.8, action: 'bundle_discount', channel: 'email', offer: 'BUNDLE10', offerValue: '10% off bundles', urgency: 'high', liftRate: 0.10 },
    { riskMin: 0.4, riskMax: 0.6, action: 'category_newsletter', channel: 'automated', offer: null, offerValue: null, urgency: 'medium', liftRate: 0.06 },
    { riskMin: 0.3, riskMax: 0.4, action: 'new_arrivals_email', channel: 'automated', offer: null, offerValue: null, urgency: 'low', liftRate: 0.04 }
  ],
  rhf: [
    { riskMin: 0.8, riskMax: 1.0, action: 'vip_20_discount', channel: 'email', offer: 'VIP20', offerValue: '20% off', urgency: 'immediate', liftRate: 0.15 },
    { riskMin: 0.6, riskMax: 0.8, action: 'free_delivery_offer', channel: 'email', offer: 'FREEDEL', offerValue: 'Free delivery', urgency: 'high', liftRate: 0.12 },
    { riskMin: 0.4, riskMax: 0.6, action: 'seasonal_reminder', channel: 'automated', offer: null, offerValue: null, urgency: 'medium', liftRate: 0.08 },
    { riskMin: 0.3, riskMax: 0.4, action: 'reorder_reminder', channel: 'automated', offer: null, offerValue: null, urgency: 'low', liftRate: 0.05 }
  ]
};

/**
 * Generate personalization message based on customer profile
 */
function generatePersonalization(profile: CustomerProfile): string {
  const parts: string[] = [];

  // First name
  if (profile.firstName) {
    parts.push(`Hi ${profile.firstName}`);
  }

  // Spending tier
  if (profile.totalSpent >= 500) {
    parts.push('valued VIP customer');
  } else if (profile.totalSpent >= 200) {
    parts.push('loyal customer');
  }

  // Order frequency
  if (profile.orderCount >= 5) {
    parts.push(`${profile.orderCount} orders`);
  }

  // Time since last order
  if (profile.daysSinceOrder > 90) {
    parts.push(`missed since ${Math.round(profile.daysSinceOrder / 30)} months`);
  }

  // Top products for recommendations
  if (profile.topProducts.length > 0) {
    parts.push(`loves ${profile.topProducts[0]}`);
  }

  return parts.join(', ');
}

/**
 * Calculate priority score
 */
function calculatePriority(profile: CustomerProfile): number {
  // Higher priority for higher value customers at higher risk
  const valueScore = Math.min(100, profile.totalSpent / 10);
  const riskScore = profile.churnProbability * 100;
  const frequencyBonus = Math.min(20, profile.orderCount * 4);

  return Math.round(valueScore * 0.4 + riskScore * 0.4 + frequencyBonus * 0.2);
}

/**
 * Get at-risk Teelixir customers
 */
async function getTeelixirAtRisk(minRisk: number): Promise<CustomerProfile[]> {
  console.log('Fetching Teelixir at-risk customers...');

  const { data: orders, error } = await supabase
    .from('tlx_shopify_orders')
    .select('customer_email, customer_first_name, processed_at, total_price')
    .in('financial_status', ['paid', 'partially_paid'])
    .order('processed_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return [];
  }

  // Get reorder timing
  const { data: timing } = await supabase
    .from('tlx_reorder_timing')
    .select('avg_days_to_reorder')
    .eq('product_type', 'global')
    .single();

  const expectedDays = timing?.avg_days_to_reorder || 60;

  // Aggregate by customer
  const customerMap = new Map<string, CustomerProfile>();
  const now = new Date();

  for (const order of orders || []) {
    if (!order.customer_email) continue;

    const existing = customerMap.get(order.customer_email);
    const orderDate = new Date(order.processed_at);
    const amount = parseFloat(order.total_price || '0');

    if (existing) {
      existing.orderCount++;
      existing.totalSpent += amount;
      if (orderDate > new Date(existing.daysSinceOrder)) {
        // This shouldn't happen due to ordering
      }
    } else {
      const daysSince = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

      // Simple churn probability calculation
      let churnProb = Math.min(1, daysSince / (expectedDays * 2));

      customerMap.set(order.customer_email, {
        email: order.customer_email,
        business: 'teelixir',
        firstName: order.customer_first_name,
        churnProbability: churnProb,
        riskLevel: churnProb >= 0.8 ? 'critical' : churnProb >= 0.6 ? 'high' : churnProb >= 0.3 ? 'medium' : 'low',
        daysSinceOrder: daysSince,
        orderCount: 1,
        totalSpent: amount,
        avgOrderValue: amount,
        rfmSegment: 'Unknown',
        topProducts: []
      });
    }
  }

  // Recalculate aggregates and filter
  const profiles: CustomerProfile[] = [];

  for (const [email, profile] of customerMap) {
    profile.avgOrderValue = profile.totalSpent / profile.orderCount;

    // Adjust churn probability based on order count
    if (profile.orderCount === 1) {
      profile.churnProbability = Math.min(1, profile.churnProbability + 0.1);
    } else if (profile.orderCount >= 5) {
      profile.churnProbability = Math.max(0, profile.churnProbability - 0.1);
    }

    // Update risk level
    profile.riskLevel = profile.churnProbability >= 0.8 ? 'critical' :
                        profile.churnProbability >= 0.6 ? 'high' :
                        profile.churnProbability >= 0.3 ? 'medium' : 'low';

    // Determine RFM segment
    const r = 5 - Math.min(4, Math.floor(profile.daysSinceOrder / 30));
    const f = Math.min(5, Math.ceil(profile.orderCount / 2));
    const m = Math.min(5, Math.ceil(profile.totalSpent / 200));

    if (r >= 4 && f >= 4) profile.rfmSegment = 'Champion';
    else if (r <= 2 && f >= 3) profile.rfmSegment = 'At Risk';
    else if (r <= 2) profile.rfmSegment = 'Hibernating';
    else profile.rfmSegment = 'Average';

    if (profile.churnProbability >= minRisk) {
      profiles.push(profile);
    }
  }

  console.log(`  Found ${profiles.length} at-risk customers`);
  return profiles;
}

/**
 * Get at-risk Elevate customers
 */
async function getElevateAtRisk(minRisk: number): Promise<CustomerProfile[]> {
  console.log('Fetching Elevate at-risk customers...');

  const { data: customers, error } = await supabase
    .from('trial_customers')
    .select('*')
    .not('trial_status', 'in', '(deactivated,converted)');

  if (error) {
    console.error('Error:', error.message);
    return [];
  }

  const profiles: CustomerProfile[] = [];
  const now = new Date();

  for (const customer of customers || []) {
    const startDate = customer.trial_start_date ? new Date(customer.trial_start_date) : now;
    const daysInTrial = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate churn probability for trials
    let churnProb = 0.5;
    if (customer.order_count >= 3) churnProb = 0.15;
    else if (customer.order_count >= 1) churnProb = 0.3;
    else if (customer.login_count >= 5) churnProb = 0.4;
    else if (customer.login_count >= 1) churnProb = 0.6;
    else if (daysInTrial > 7) churnProb = 0.8;
    else churnProb = 0.7;

    if (churnProb >= minRisk) {
      profiles.push({
        email: customer.email,
        business: 'elevate',
        firstName: customer.firstname,
        churnProbability: churnProb,
        riskLevel: churnProb >= 0.8 ? 'critical' : churnProb >= 0.6 ? 'high' : churnProb >= 0.3 ? 'medium' : 'low',
        daysSinceOrder: daysInTrial,
        orderCount: customer.order_count || 0,
        totalSpent: customer.total_order_value || 0,
        avgOrderValue: customer.order_count > 0 ? (customer.total_order_value || 0) / customer.order_count : 0,
        rfmSegment: customer.order_count >= 1 ? 'Engaged' : customer.login_count >= 1 ? 'Exploring' : 'Inactive',
        topProducts: customer.product_interests || []
      });
    }
  }

  console.log(`  Found ${profiles.length} at-risk customers`);
  return profiles;
}

/**
 * Generate interventions for at-risk customers
 */
function generateInterventions(profiles: CustomerProfile[]): Intervention[] {
  const interventions: Intervention[] = [];

  for (const profile of profiles) {
    const templates = INTERVENTION_TEMPLATES[profile.business] || INTERVENTION_TEMPLATES['boo'];

    // Find matching template
    const template = templates.find(
      t => profile.churnProbability >= t.riskMin && profile.churnProbability < t.riskMax
    ) || templates[templates.length - 1];

    interventions.push({
      email: profile.email,
      business: profile.business,
      firstName: profile.firstName,
      churnProbability: Math.round(profile.churnProbability * 100) / 100,
      riskLevel: profile.riskLevel,
      rfmSegment: profile.rfmSegment,
      action: template.action,
      channel: template.channel,
      offer: template.offer,
      offerValue: template.offerValue,
      urgency: template.urgency,
      personalization: generatePersonalization(profile),
      estimatedLiftRate: template.liftRate,
      priority: calculatePriority(profile)
    });
  }

  // Sort by priority
  return interventions.sort((a, b) => b.priority - a.priority);
}

/**
 * Print report
 */
function printReport(report: InterventionReport) {
  console.log('\n' + '='.repeat(100));
  console.log('INTERVENTION RECOMMENDATIONS');
  console.log('='.repeat(100));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log(`Business: ${report.business.toUpperCase()}`);
  console.log(`At-Risk Customers: ${report.totalAtRisk}`);
  console.log(`Estimated Recovery Value: $${report.estimatedRecoveryValue.toLocaleString()}`);
  console.log('');

  // By urgency
  console.log('--- BY URGENCY ---');
  for (const [urgency, count] of Object.entries(report.byUrgency)) {
    console.log(`  ${urgency.padEnd(12)}: ${count}`);
  }
  console.log('');

  // By channel
  console.log('--- BY CHANNEL ---');
  for (const [channel, count] of Object.entries(report.byChannel)) {
    console.log(`  ${channel.padEnd(12)}: ${count}`);
  }
  console.log('');

  // Top interventions
  console.log('--- TOP PRIORITY INTERVENTIONS ---');
  console.log(
    'Pri'.padStart(4) +
    'Email'.padEnd(30) +
    'Risk'.padStart(6) +
    'Segment'.padStart(14) +
    'Action'.padStart(28) +
    'Offer'.padStart(12)
  );
  console.log('-'.repeat(94));

  for (const intervention of report.interventions.slice(0, 25)) {
    const emailDisplay = intervention.email.length > 28 ? intervention.email.substring(0, 25) + '...' : intervention.email;

    console.log(
      intervention.priority.toString().padStart(4) +
      emailDisplay.padEnd(30) +
      `${Math.round(intervention.churnProbability * 100)}%`.padStart(6) +
      intervention.rfmSegment.substring(0, 13).padStart(14) +
      intervention.action.substring(0, 26).padStart(28) +
      (intervention.offerValue || '-').padStart(12)
    );
  }
  console.log('');

  // Action summary
  console.log('--- ACTION SUMMARY ---');
  const actionCounts = new Map<string, number>();
  for (const i of report.interventions) {
    actionCounts.set(i.action, (actionCounts.get(i.action) || 0) + 1);
  }
  for (const [action, count] of actionCounts) {
    console.log(`  ${count.toString().padStart(4)}x ${action}`);
  }
  console.log('');

  console.log('='.repeat(100));
}

/**
 * Export to CSV
 */
async function exportToCsv(interventions: Intervention[], filename: string) {
  const fs = await import('fs');

  const headers = ['priority', 'email', 'business', 'first_name', 'churn_probability', 'risk_level', 'rfm_segment', 'action', 'channel', 'offer', 'offer_value', 'urgency', 'personalization'];

  const rows = interventions.map(i => [
    i.priority,
    i.email,
    i.business,
    i.firstName || '',
    i.churnProbability,
    i.riskLevel,
    i.rfmSegment,
    i.action,
    i.channel,
    i.offer || '',
    i.offerValue || '',
    i.urgency,
    `"${i.personalization.replace(/"/g, '""')}"`
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(filename, csv);
  console.log(`Exported ${interventions.length} interventions to ${filename}`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1];
  const minRiskArg = args.find(a => a.startsWith('--min-risk='))?.split('=')[1];
  const shouldExport = args.includes('--export');

  const minRisk = minRiskArg ? parseFloat(minRiskArg) : 0.3;

  console.log('\n=== Intervention Recommender ===\n');

  let allProfiles: CustomerProfile[] = [];

  // Get at-risk customers
  if (!businessArg || businessArg === 'teelixir') {
    const profiles = await getTeelixirAtRisk(minRisk);
    allProfiles = allProfiles.concat(profiles);
  }

  if (!businessArg || businessArg === 'elevate') {
    const profiles = await getElevateAtRisk(minRisk);
    allProfiles = allProfiles.concat(profiles);
  }

  if (allProfiles.length === 0) {
    console.log('No at-risk customers found');
    return;
  }

  // Generate interventions
  const interventions = generateInterventions(allProfiles);

  // Calculate summary stats
  const byChannel: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};
  let estimatedRecoveryValue = 0;

  for (const i of interventions) {
    byChannel[i.channel] = (byChannel[i.channel] || 0) + 1;
    byUrgency[i.urgency] = (byUrgency[i.urgency] || 0) + 1;

    // Estimate recovery value
    const profile = allProfiles.find(p => p.email === i.email);
    if (profile) {
      estimatedRecoveryValue += profile.avgOrderValue * i.estimatedLiftRate;
    }
  }

  const report: InterventionReport = {
    timestamp: new Date(),
    business: businessArg || 'all',
    totalAtRisk: allProfiles.length,
    interventions,
    byChannel,
    byUrgency,
    estimatedRecoveryValue: Math.round(estimatedRecoveryValue)
  };

  printReport(report);

  // Export if requested
  if (shouldExport) {
    const filename = `interventions-${businessArg || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    await exportToCsv(interventions, filename);
  }
}

main().catch(console.error);
