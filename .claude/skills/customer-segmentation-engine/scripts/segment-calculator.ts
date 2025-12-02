/**
 * Customer Segmentation Engine
 *
 * RFM scoring and customer segmentation for targeted marketing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

type BusinessSlug = 'teelixir' | 'boo' | 'elevate' | 'rhf';

interface RFMScore {
  email: string;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_score: string;
  segment_name: string;
  last_order_date: Date;
  order_count: number;
  total_spent: number;
}

interface SegmentSummary {
  segment_name: string;
  customer_count: number;
  avg_ltv: number;
  avg_orders: number;
  total_revenue: number;
}

// RFM Segment definitions
const SEGMENT_DEFINITIONS: Record<string, { minR: number; maxR: number; minF: number; maxF: number; minM: number; maxM: number }> = {
  'Champion': { minR: 5, maxR: 5, minF: 5, maxF: 5, minM: 5, maxM: 5 },
  'Loyal Customer': { minR: 4, maxR: 5, minF: 4, maxF: 5, minM: 4, maxM: 5 },
  'Potential Loyalist': { minR: 4, maxR: 5, minF: 1, maxF: 3, minM: 1, maxM: 3 },
  'Recent Customer': { minR: 4, maxR: 5, minF: 1, maxF: 1, minM: 1, maxM: 3 },
  'Promising': { minR: 3, maxR: 4, minF: 1, maxF: 2, minM: 1, maxM: 2 },
  'Need Attention': { minR: 2, maxR: 3, minF: 3, maxF: 4, minM: 3, maxM: 4 },
  'About to Sleep': { minR: 2, maxR: 3, minF: 2, maxF: 3, minM: 2, maxM: 3 },
  'At Risk': { minR: 1, maxR: 2, minF: 3, maxF: 5, minM: 3, maxM: 5 },
  'Hibernating': { minR: 1, maxR: 2, minF: 1, maxF: 2, minM: 1, maxM: 3 },
  'Lost': { minR: 1, maxR: 1, minF: 1, maxF: 2, minM: 1, maxM: 2 }
};

// Recommended actions per segment
const SEGMENT_ACTIONS: Record<string, { campaign: string; offer: string; priority: 'high' | 'medium' | 'low' }> = {
  'Champion': { campaign: 'VIP early access', offer: 'Exclusive new products', priority: 'high' },
  'Loyal Customer': { campaign: 'Loyalty rewards', offer: 'Free shipping, points multiplier', priority: 'high' },
  'Potential Loyalist': { campaign: 'Nurture series', offer: '10% off next order', priority: 'high' },
  'Recent Customer': { campaign: 'Welcome series', offer: 'Welcome discount', priority: 'medium' },
  'Promising': { campaign: 'Engagement series', offer: 'Product recommendations', priority: 'medium' },
  'Need Attention': { campaign: 'Re-engagement', offer: '15% discount', priority: 'high' },
  'About to Sleep': { campaign: 'Win-back light', offer: '20% discount', priority: 'medium' },
  'At Risk': { campaign: 'Urgent win-back', offer: '25% + free shipping', priority: 'high' },
  'Hibernating': { campaign: 'Re-activation', offer: '30% + free gift', priority: 'medium' },
  'Lost': { campaign: 'Last chance', offer: '40% final offer', priority: 'low' }
};

export class CustomerSegmentationClient {
  private supabase: SupabaseClient;
  private static instance: CustomerSegmentationClient;

  private constructor() {
    const supabaseUrl = process.env.MASTER_SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
    const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseKey) {
      throw new Error('MASTER_SUPABASE_SERVICE_ROLE_KEY is required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): CustomerSegmentationClient {
    if (!CustomerSegmentationClient.instance) {
      CustomerSegmentationClient.instance = new CustomerSegmentationClient();
    }
    return CustomerSegmentationClient.instance;
  }

  /**
   * Calculate recency score (1-5)
   */
  calculateRecencyScore(daysSinceLastOrder: number): number {
    if (daysSinceLastOrder <= 30) return 5;
    if (daysSinceLastOrder <= 60) return 4;
    if (daysSinceLastOrder <= 90) return 3;
    if (daysSinceLastOrder <= 180) return 2;
    return 1;
  }

  /**
   * Calculate frequency score (1-5)
   */
  calculateFrequencyScore(orderCount: number): number {
    if (orderCount >= 10) return 5;
    if (orderCount >= 5) return 4;
    if (orderCount >= 3) return 3;
    if (orderCount >= 2) return 2;
    return 1;
  }

  /**
   * Calculate monetary score (1-5)
   */
  calculateMonetaryScore(totalSpent: number): number {
    if (totalSpent >= 500) return 5;
    if (totalSpent >= 250) return 4;
    if (totalSpent >= 100) return 3;
    if (totalSpent >= 50) return 2;
    return 1;
  }

  /**
   * Determine segment from RFM scores
   */
  determineSegment(r: number, f: number, m: number): string {
    for (const [segment, def] of Object.entries(SEGMENT_DEFINITIONS)) {
      if (
        r >= def.minR && r <= def.maxR &&
        f >= def.minF && f <= def.maxF &&
        m >= def.minM && m <= def.maxM
      ) {
        return segment;
      }
    }

    // Fallback based on overall score
    const avgScore = (r + f + m) / 3;
    if (avgScore >= 4) return 'Loyal Customer';
    if (avgScore >= 3) return 'Need Attention';
    if (avgScore >= 2) return 'About to Sleep';
    return 'Hibernating';
  }

  /**
   * Get segment summary for a business
   */
  async getSegmentSummary(businessSlug: BusinessSlug): Promise<SegmentSummary[]> {
    const { data, error } = await this.supabase
      .from('customer_rfm_scores')
      .select('segment_name, total_spent, order_count')
      .eq('business_slug', businessSlug);

    if (error || !data) {
      console.error('Error fetching segments:', error);
      return [];
    }

    // Aggregate by segment
    const segmentMap = new Map<string, { count: number; totalLtv: number; totalOrders: number; totalRevenue: number }>();

    for (const customer of data) {
      const existing = segmentMap.get(customer.segment_name) || { count: 0, totalLtv: 0, totalOrders: 0, totalRevenue: 0 };
      existing.count++;
      existing.totalLtv += customer.total_spent || 0;
      existing.totalOrders += customer.order_count || 0;
      existing.totalRevenue += customer.total_spent || 0;
      segmentMap.set(customer.segment_name, existing);
    }

    return Array.from(segmentMap.entries()).map(([segment_name, data]) => ({
      segment_name,
      customer_count: data.count,
      avg_ltv: Math.round(data.totalLtv / data.count * 100) / 100,
      avg_orders: Math.round(data.totalOrders / data.count * 100) / 100,
      total_revenue: Math.round(data.totalRevenue * 100) / 100
    })).sort((a, b) => b.avg_ltv - a.avg_ltv);
  }

  /**
   * Get customers by segment
   */
  async getCustomersBySegment(
    businessSlug: BusinessSlug,
    segmentName: string,
    limit: number = 100
  ): Promise<RFMScore[]> {
    const { data, error } = await this.supabase
      .from('customer_rfm_scores')
      .select('*')
      .eq('business_slug', businessSlug)
      .eq('segment_name', segmentName)
      .order('total_spent', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get segment action recommendations
   */
  getSegmentAction(segmentName: string): typeof SEGMENT_ACTIONS[string] | null {
    return SEGMENT_ACTIONS[segmentName] || null;
  }

  /**
   * Get all segment definitions
   */
  getSegmentDefinitions() {
    return SEGMENT_DEFINITIONS;
  }

  /**
   * Get at-risk customers
   */
  async getAtRiskCustomers(
    businessSlug: BusinessSlug,
    daysSinceLastOrder: number = 60
  ): Promise<RFMScore[]> {
    const { data, error } = await this.supabase
      .from('customer_rfm_scores')
      .select('*')
      .eq('business_slug', businessSlug)
      .in('segment_name', ['At Risk', 'About to Sleep', 'Hibernating'])
      .lt('last_order_date', new Date(Date.now() - daysSinceLastOrder * 24 * 60 * 60 * 1000).toISOString())
      .order('total_spent', { ascending: false });

    if (error) {
      console.error('Error fetching at-risk customers:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get champions for VIP campaigns
   */
  async getChampions(businessSlug: BusinessSlug, limit: number = 100): Promise<RFMScore[]> {
    return this.getCustomersBySegment(businessSlug, 'Champion', limit);
  }
}

// Export singleton getter
export const getSegmentationClient = () => CustomerSegmentationClient.getInstance();

// CLI usage
if (require.main === module) {
  const client = getSegmentationClient();

  async function main() {
    const [command, businessSlug, ...args] = process.argv.slice(2);

    switch (command) {
      case 'summary':
        console.log(`\nSegment Summary for ${businessSlug}\n`);
        const summary = await client.getSegmentSummary(businessSlug as BusinessSlug);
        console.table(summary);
        break;

      case 'segment':
        const segmentName = args[0];
        if (!segmentName) {
          console.error('Usage: segment-calculator.ts segment <businessSlug> <segmentName>');
          process.exit(1);
        }
        const customers = await client.getCustomersBySegment(businessSlug as BusinessSlug, segmentName);
        console.log(`\n${segmentName} customers for ${businessSlug}: ${customers.length}\n`);
        console.table(customers.slice(0, 10));
        break;

      case 'at-risk':
        const atRisk = await client.getAtRiskCustomers(businessSlug as BusinessSlug);
        console.log(`\nAt-risk customers for ${businessSlug}: ${atRisk.length}\n`);
        console.table(atRisk.slice(0, 10));
        break;

      case 'champions':
        const champions = await client.getChampions(businessSlug as BusinessSlug);
        console.log(`\nChampions for ${businessSlug}: ${champions.length}\n`);
        console.table(champions.slice(0, 10));
        break;

      case 'actions':
        console.log('\nSegment Action Recommendations:\n');
        for (const [segment, action] of Object.entries(SEGMENT_ACTIONS)) {
          console.log(`${segment}:`);
          console.log(`  Campaign: ${action.campaign}`);
          console.log(`  Offer: ${action.offer}`);
          console.log(`  Priority: ${action.priority}\n`);
        }
        break;

      default:
        console.log(`
Customer Segmentation Engine

Usage:
  npx tsx segment-calculator.ts <command> <businessSlug> [args...]

Commands:
  summary <businessSlug>              Get segment summary
  segment <businessSlug> <segmentName>  Get customers in segment
  at-risk <businessSlug>              Get at-risk customers
  champions <businessSlug>            Get champion customers
  actions                             Show action recommendations
        `);
    }
  }

  main().catch(console.error);
}
