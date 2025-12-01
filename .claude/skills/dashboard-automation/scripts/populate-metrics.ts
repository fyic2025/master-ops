#!/usr/bin/env npx tsx

/**
 * Populate Dashboard Metrics Script
 *
 * Fetches and populates daily business metrics from all platforms.
 * Supports Shopify (Teelixir, Elevate), BigCommerce (BOO), WooCommerce (RHF).
 *
 * Usage:
 *   npx tsx populate-metrics.ts              # Today's metrics
 *   npx tsx populate-metrics.ts --date 2024-12-01  # Specific date
 *   npx tsx populate-metrics.ts --backfill 7      # Last 7 days
 */

import { createClient } from '@supabase/supabase-js';

// Master Supabase (dashboard hub)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BusinessMetrics {
  orders: number;
  revenue: number;
  newCustomers: number;
  returningCustomers: number;
  refunds: number;
  avgOrderValue: number;
}

interface MetricReport {
  timestamp: Date;
  date: string;
  businesses: Record<string, BusinessMetrics>;
  errors: string[];
}

/**
 * Fetch Shopify metrics for Teelixir or Elevate
 */
async function fetchShopifyMetrics(business: 'teelixir' | 'elevate', date: string): Promise<BusinessMetrics> {
  const domain = business === 'teelixir'
    ? process.env.TEELIXIR_SHOPIFY_DOMAIN
    : process.env.ELEVATE_SHOPIFY_DOMAIN;

  const token = business === 'teelixir'
    ? process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN
    : process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN;

  if (!domain || !token) {
    console.warn(`Missing Shopify credentials for ${business}`);
    return emptyMetrics();
  }

  try {
    // Fetch orders for the date
    const startDate = `${date}T00:00:00+10:00`;
    const endDate = `${date}T23:59:59+10:00`;

    const response = await fetch(
      `https://${domain}/admin/api/2024-01/orders.json?status=any&created_at_min=${startDate}&created_at_max=${endDate}&limit=250`,
      {
        headers: { 'X-Shopify-Access-Token': token }
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const orders = data.orders || [];

    // Calculate metrics
    const paidOrders = orders.filter((o: any) => o.financial_status === 'paid' || o.financial_status === 'partially_paid');
    const revenue = paidOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price || 0), 0);
    const refunds = orders
      .filter((o: any) => o.financial_status === 'refunded' || o.financial_status === 'partially_refunded')
      .reduce((sum: number, o: any) => sum + parseFloat(o.total_price || 0), 0);

    // Count new vs returning (simplified - based on order count)
    const customerEmails = new Set(orders.map((o: any) => o.email));
    const newCustomers = customerEmails.size; // Simplified

    return {
      orders: paidOrders.length,
      revenue,
      newCustomers,
      returningCustomers: Math.max(0, paidOrders.length - newCustomers),
      refunds,
      avgOrderValue: paidOrders.length > 0 ? revenue / paidOrders.length : 0
    };
  } catch (error) {
    console.error(`Error fetching ${business} Shopify metrics:`, error);
    return emptyMetrics();
  }
}

/**
 * Fetch BigCommerce metrics for BOO
 */
async function fetchBigCommerceMetrics(date: string): Promise<BusinessMetrics> {
  const storeHash = process.env.BC_STORE_HASH || process.env.BIGCOMMERCE_STORE_HASH;
  const token = process.env.BC_ACCESS_TOKEN || process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (!storeHash || !token) {
    console.warn('Missing BigCommerce credentials');
    return emptyMetrics();
  }

  try {
    // Fetch orders for the date
    const minDate = new Date(date).toISOString();
    const maxDate = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v2/orders?min_date_created=${minDate}&max_date_created=${maxDate}&limit=250`,
      {
        headers: {
          'X-Auth-Token': token,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`BigCommerce API error: ${response.status}`);
    }

    const orders = await response.json();

    // Calculate metrics
    const completedOrders = orders.filter((o: any) =>
      o.status_id === 2 || o.status_id === 10 || o.status_id === 11 // Shipped, Completed, Awaiting Pickup
    );
    const revenue = completedOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_inc_tax || 0), 0);
    const refunds = orders
      .filter((o: any) => o.status_id === 4 || o.status_id === 14) // Refunded, Declined
      .reduce((sum: number, o: any) => sum + parseFloat(o.total_inc_tax || 0), 0);

    return {
      orders: completedOrders.length,
      revenue,
      newCustomers: 0, // Would need separate customer API call
      returningCustomers: 0,
      refunds,
      avgOrderValue: completedOrders.length > 0 ? revenue / completedOrders.length : 0
    };
  } catch (error) {
    console.error('Error fetching BOO BigCommerce metrics:', error);
    return emptyMetrics();
  }
}

/**
 * Fetch WooCommerce metrics for RHF
 */
async function fetchWooCommerceMetrics(date: string): Promise<BusinessMetrics> {
  const baseUrl = process.env.RHF_WC_URL;
  const consumerKey = process.env.RHF_WC_CONSUMER_KEY;
  const consumerSecret = process.env.RHF_WC_CONSUMER_SECRET;

  if (!baseUrl || !consumerKey || !consumerSecret) {
    console.warn('Missing WooCommerce credentials for RHF');
    return emptyMetrics();
  }

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await fetch(
      `${baseUrl}/wp-json/wc/v3/orders?after=${date}T00:00:00&before=${date}T23:59:59&per_page=100`,
      {
        headers: { 'Authorization': `Basic ${auth}` }
      }
    );

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    const orders = await response.json();

    const completedOrders = orders.filter((o: any) =>
      o.status === 'completed' || o.status === 'processing'
    );
    const revenue = completedOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
    const refunds = orders
      .filter((o: any) => o.status === 'refunded')
      .reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);

    return {
      orders: completedOrders.length,
      revenue,
      newCustomers: 0,
      returningCustomers: 0,
      refunds,
      avgOrderValue: completedOrders.length > 0 ? revenue / completedOrders.length : 0
    };
  } catch (error) {
    console.error('Error fetching RHF WooCommerce metrics:', error);
    return emptyMetrics();
  }
}

/**
 * Empty metrics placeholder
 */
function emptyMetrics(): BusinessMetrics {
  return {
    orders: 0,
    revenue: 0,
    newCustomers: 0,
    returningCustomers: 0,
    refunds: 0,
    avgOrderValue: 0
  };
}

/**
 * Populate metrics for a specific date
 */
async function populateMetricsForDate(date: string): Promise<{ business: string; success: boolean; error?: string }[]> {
  const results: { business: string; success: boolean; error?: string }[] = [];

  const businesses = [
    { name: 'teelixir', fetch: () => fetchShopifyMetrics('teelixir', date) },
    { name: 'boo', fetch: () => fetchBigCommerceMetrics(date) },
    { name: 'elevate', fetch: () => fetchShopifyMetrics('elevate', date) },
    { name: 'rhf', fetch: () => fetchWooCommerceMetrics(date) }
  ];

  for (const { name, fetch } of businesses) {
    try {
      console.log(`Fetching ${name} metrics for ${date}...`);
      const metrics = await fetch();

      await supabase.from('dashboard_business_metrics').upsert({
        business: name,
        metric_date: date,
        orders_count: metrics.orders,
        revenue: metrics.revenue,
        avg_order_value: metrics.avgOrderValue,
        new_customers: metrics.newCustomers,
        returning_customers: metrics.returningCustomers,
        refunds: metrics.refunds,
        metadata: { source: 'populate-metrics-script', fetched_at: new Date().toISOString() }
      }, { onConflict: 'business,metric_date' });

      console.log(`  ${name}: ${metrics.orders} orders, $${metrics.revenue.toFixed(2)} revenue`);
      results.push({ business: name, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ${name}: FAILED - ${message}`);
      results.push({ business: name, success: false, error: message });
    }
  }

  return results;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(a => a.startsWith('--date='))?.split('=')[1] ||
                  (args.includes('--date') ? args[args.indexOf('--date') + 1] : undefined);
  const backfillArg = args.find(a => a.startsWith('--backfill='))?.split('=')[1] ||
                      (args.includes('--backfill') ? args[args.indexOf('--backfill') + 1] : undefined);

  console.log('\n=== Dashboard Metrics Population ===\n');

  if (backfillArg) {
    // Backfill multiple days
    const days = parseInt(backfillArg);
    console.log(`Backfilling last ${days} days...\n`);

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log(`\n--- ${date} ---`);
      await populateMetricsForDate(date);
    }
  } else {
    // Single day
    const date = dateArg || new Date().toISOString().split('T')[0];
    console.log(`Populating metrics for: ${date}\n`);
    const results = await populateMetricsForDate(date);

    // Summary
    console.log('\n=== Summary ===');
    const successful = results.filter(r => r.success).length;
    console.log(`Success: ${successful}/${results.length}`);

    if (results.some(r => !r.success)) {
      console.log('\nFailed:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  ${r.business}: ${r.error}`);
      });
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
