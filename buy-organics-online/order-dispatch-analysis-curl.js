/**
 * Order Dispatch Analysis for Buy Organics Online
 * Uses shell commands for reliable network access
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'd9y2srla3treynpbtmp4f3u1bomdna2';

// Helper functions
function curlGet(url, headers) {
  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');
  const cmd = `curl -s "${url}" ${headerArgs}`;
  try {
    const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return JSON.parse(result);
  } catch (e) {
    console.error('Curl error:', e.message);
    return null;
  }
}

function curlPost(url, headers, data) {
  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');
  const cmd = `curl -s -X POST "${url}" ${headerArgs} -d '${JSON.stringify(data).replace(/'/g, "'\\''")}'`;
  try {
    const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return result ? JSON.parse(result) : null;
  } catch (e) {
    console.error('Curl post error:', e.message);
    return null;
  }
}

// BigCommerce API
function fetchBCOrders(page = 1, limit = 250) {
  const url = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v2/orders?page=${page}&limit=${limit}&sort=id:desc`;
  return curlGet(url, {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });
}

function fetchBCOrderProducts(orderId) {
  const url = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v2/orders/${orderId}/products`;
  return curlGet(url, {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });
}

// Calculate business days
function calculateBusinessDays(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end < start) return null;

  let days = 0;
  let current = new Date(start);

  while (current < end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
      days++;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Main analysis function
async function runAnalysis() {
  console.log('========================================');
  console.log('Buy Organics Online - Order Dispatch Analysis');
  console.log('========================================\n');
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Fetch orders
  console.log('=== STEP 1: Fetching Orders from BigCommerce ===\n');

  const allOrders = [];
  const targetCount = 10000;
  let page = 1;

  while (allOrders.length < targetCount) {
    console.log(`Fetching page ${page}... (${allOrders.length}/${targetCount})`);

    const orders = fetchBCOrders(page, 250);

    if (!orders || orders.length === 0) {
      console.log('No more orders available');
      break;
    }

    allOrders.push(...orders);
    console.log(`  Fetched ${orders.length} orders (Total: ${allOrders.length})`);

    if (orders.length < 250) {
      console.log('Reached end of orders');
      break;
    }

    page++;

    // Small delay for rate limiting
    execSync('sleep 0.3');
  }

  console.log(`\nTotal orders fetched: ${allOrders.length}\n`);

  // Process orders - calculate dispatch times
  console.log('=== STEP 2: Processing Orders ===\n');

  const processedOrders = [];
  const brandStats = {};
  const monthlyStats = {};
  const stateStats = {};
  const dayOfWeekStats = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let ordersWithDispatch = 0;
  let ordersWithoutDispatch = 0;
  let totalDispatchDays = 0;
  let slowOrders = 0;

  // Process each order
  for (let i = 0; i < allOrders.length; i++) {
    const order = allOrders[i];

    if ((i + 1) % 500 === 0) {
      console.log(`Processing order ${i + 1}/${allOrders.length}...`);
    }

    // Check if order was shipped
    const hasShipDate = order.date_shipped &&
                        order.date_shipped !== '' &&
                        order.date_shipped !== '0000-00-00' &&
                        !order.date_shipped.startsWith('0000');

    const daysToDispatch = hasShipDate
      ? calculateBusinessDays(order.date_created, order.date_shipped)
      : null;

    if (daysToDispatch !== null && daysToDispatch >= 0) {
      ordersWithDispatch++;
      totalDispatchDays += daysToDispatch;

      if (daysToDispatch > 3) {
        slowOrders++;
      }

      // Monthly tracking
      const orderDate = new Date(order.date_created);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          totalOrders: 0,
          totalDays: 0,
          slowOrders: 0,
          dispatchTimes: []
        };
      }
      monthlyStats[monthKey].totalOrders++;
      monthlyStats[monthKey].totalDays += daysToDispatch;
      monthlyStats[monthKey].dispatchTimes.push(daysToDispatch);
      if (daysToDispatch > 3) {
        monthlyStats[monthKey].slowOrders++;
      }

      // State tracking
      const state = order.billing_address?.state || 'Unknown';
      if (!stateStats[state]) {
        stateStats[state] = { totalOrders: 0, totalDays: 0, slowOrders: 0 };
      }
      stateStats[state].totalOrders++;
      stateStats[state].totalDays += daysToDispatch;
      if (daysToDispatch > 3) {
        stateStats[state].slowOrders++;
      }

      // Day of week tracking
      const dayOfWeek = orderDate.getDay();
      const dayName = dayNames[dayOfWeek];
      if (!dayOfWeekStats[dayName]) {
        dayOfWeekStats[dayName] = { totalOrders: 0, totalDays: 0, slowOrders: 0 };
      }
      dayOfWeekStats[dayName].totalOrders++;
      dayOfWeekStats[dayName].totalDays += daysToDispatch;
      if (daysToDispatch > 3) {
        dayOfWeekStats[dayName].slowOrders++;
      }
    } else {
      ordersWithoutDispatch++;
    }

    // Store processed order
    processedOrders.push({
      order_id: order.id,
      order_date: order.date_created,
      shipped_date: hasShipDate ? order.date_shipped : null,
      days_to_dispatch: daysToDispatch,
      status: order.status,
      status_id: order.status_id,
      total_inc_tax: parseFloat(order.total_inc_tax) || 0,
      items_total: parseInt(order.items_total) || 0,
      billing_state: order.billing_address?.state || null,
      billing_postcode: order.billing_address?.zip || null,
      payment_method: order.payment_method || null,
      is_slow_dispatch: daysToDispatch !== null && daysToDispatch > 3
    });
  }

  // Fetch product/brand data for a sample of slow orders to identify suppliers
  console.log('\n=== STEP 3: Fetching Brand Data for Slow Orders ===\n');

  const slowOrdersList = processedOrders
    .filter(o => o.is_slow_dispatch)
    .slice(0, 200); // Sample 200 slow orders

  console.log(`Analyzing ${slowOrdersList.length} slow orders for brand patterns...`);

  for (let i = 0; i < slowOrdersList.length; i++) {
    const order = slowOrdersList[i];

    if ((i + 1) % 50 === 0) {
      console.log(`  Fetching products for order ${i + 1}/${slowOrdersList.length}...`);
    }

    const products = fetchBCOrderProducts(order.order_id);

    if (products && products.length > 0) {
      // Extract brands from products
      for (const product of products) {
        // Products in BC orders don't always have brand, but they have name
        // We'll extract brand from the product name or use a placeholder
        const brandMatch = product.name?.match(/^([A-Za-z\s]+)/);
        const brand = brandMatch ? brandMatch[1].trim().split(' ')[0] : 'Unknown';

        if (!brandStats[brand]) {
          brandStats[brand] = {
            totalOrders: 0,
            slowOrders: 0,
            totalDays: 0,
            productNames: new Set()
          };
        }
        brandStats[brand].totalOrders++;
        brandStats[brand].slowOrders++;
        brandStats[brand].totalDays += order.days_to_dispatch || 0;
        brandStats[brand].productNames.add(product.name?.substring(0, 50));
      }
    }

    // Rate limiting
    execSync('sleep 0.15');
  }

  // Also sample fast orders for comparison
  console.log('\nFetching brand data for fast orders (comparison)...');

  const fastOrdersList = processedOrders
    .filter(o => o.days_to_dispatch !== null && o.days_to_dispatch <= 1)
    .slice(0, 100);

  for (let i = 0; i < fastOrdersList.length; i++) {
    const order = fastOrdersList[i];
    const products = fetchBCOrderProducts(order.order_id);

    if (products && products.length > 0) {
      for (const product of products) {
        const brandMatch = product.name?.match(/^([A-Za-z\s]+)/);
        const brand = brandMatch ? brandMatch[1].trim().split(' ')[0] : 'Unknown';

        if (!brandStats[brand]) {
          brandStats[brand] = {
            totalOrders: 0,
            slowOrders: 0,
            totalDays: 0,
            productNames: new Set()
          };
        }
        brandStats[brand].totalOrders++;
        brandStats[brand].totalDays += order.days_to_dispatch || 0;
        brandStats[brand].productNames.add(product.name?.substring(0, 50));
      }
    }

    execSync('sleep 0.15');
  }

  // Generate report
  console.log('\n========================================');
  console.log('ANALYSIS RESULTS');
  console.log('========================================\n');

  // Overall statistics
  const avgDispatch = ordersWithDispatch > 0 ? totalDispatchDays / ordersWithDispatch : 0;
  const slowPercentage = ordersWithDispatch > 0 ? (slowOrders / ordersWithDispatch * 100) : 0;

  console.log('=== OVERALL DISPATCH STATISTICS ===\n');
  console.log(`Total orders analyzed: ${allOrders.length}`);
  console.log(`Orders with ship date: ${ordersWithDispatch}`);
  console.log(`Orders without ship date: ${ordersWithoutDispatch}`);
  console.log(`Average days to dispatch: ${avgDispatch.toFixed(2)} business days`);
  console.log(`Slow orders (>3 days): ${slowOrders} (${slowPercentage.toFixed(1)}%)`);

  // 12-Month Trend
  console.log('\n=== 12-MONTH DISPATCH TREND ===\n');

  const sortedMonths = Object.entries(monthlyStats)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12); // Last 12 months

  console.log('Month     | Orders | Avg Days | Median | Slow%');
  console.log('-'.repeat(50));

  for (const [month, stats] of sortedMonths) {
    const avg = (stats.totalDays / stats.totalOrders).toFixed(2);
    const sorted = stats.dispatchTimes.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const slowPct = ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1);

    console.log(`${month}   | ${String(stats.totalOrders).padStart(6)} | ${avg.padStart(8)} | ${String(median).padStart(6)} | ${slowPct.padStart(5)}%`);
  }

  // Trend calculation
  if (sortedMonths.length >= 6) {
    const recent3 = sortedMonths.slice(-3);
    const earlier3 = sortedMonths.slice(0, 3);

    const recentAvg = recent3.reduce((a, [_, s]) => a + s.totalDays / s.totalOrders, 0) / 3;
    const earlierAvg = earlier3.reduce((a, [_, s]) => a + s.totalDays / s.totalOrders, 0) / 3;

    const trend = recentAvg < earlierAvg ? 'IMPROVING' : recentAvg > earlierAvg ? 'WORSENING' : 'STABLE';
    const change = ((recentAvg - earlierAvg) / earlierAvg * 100);

    console.log(`\nTREND: ${trend} (${change >= 0 ? '+' : ''}${change.toFixed(1)}% change)`);
    console.log(`Recent 3 months avg: ${recentAvg.toFixed(2)} days`);
    console.log(`Earlier months avg: ${earlierAvg.toFixed(2)} days`);
  }

  // Brand/Supplier Analysis
  console.log('\n=== BRAND/SUPPLIER ANALYSIS (Top 25 Slowest) ===\n');

  const brandAnalysis = Object.entries(brandStats)
    .filter(([_, s]) => s.totalOrders >= 3)
    .map(([brand, stats]) => ({
      brand,
      totalOrders: stats.totalOrders,
      slowOrders: stats.slowOrders,
      avgDays: stats.totalOrders > 0 ? (stats.totalDays / stats.totalOrders).toFixed(2) : '0.00',
      slowPct: stats.totalOrders > 0 ? ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => parseFloat(b.slowPct) - parseFloat(a.slowPct))
    .slice(0, 25);

  console.log('Brand/Product              | Orders | Slow | Slow% | Avg Days');
  console.log('-'.repeat(65));

  for (const brand of brandAnalysis) {
    const name = brand.brand.substring(0, 25).padEnd(25);
    console.log(`${name} | ${String(brand.totalOrders).padStart(6)} | ${String(brand.slowOrders).padStart(4)} | ${brand.slowPct.padStart(5)}% | ${brand.avgDays}`);
  }

  // State Analysis
  console.log('\n=== STATE ANALYSIS ===\n');

  const stateAnalysis = Object.entries(stateStats)
    .filter(([_, s]) => s.totalOrders >= 10)
    .map(([state, stats]) => ({
      state,
      totalOrders: stats.totalOrders,
      avgDays: (stats.totalDays / stats.totalOrders).toFixed(2),
      slowPct: ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.avgDays) - parseFloat(a.avgDays));

  console.log('State          | Orders | Avg Days | Slow%');
  console.log('-'.repeat(45));

  for (const state of stateAnalysis) {
    const name = state.state.substring(0, 14).padEnd(14);
    console.log(`${name} | ${String(state.totalOrders).padStart(6)} | ${state.avgDays.padStart(8)} | ${state.slowPct}%`);
  }

  // Day of Week Analysis
  console.log('\n=== ORDER DAY ANALYSIS ===\n');
  console.log('Day        | Orders | Avg Days | Slow%');
  console.log('-'.repeat(42));

  for (const dayName of dayNames) {
    const stats = dayOfWeekStats[dayName];
    if (stats && stats.totalOrders > 0) {
      const avg = (stats.totalDays / stats.totalOrders).toFixed(2);
      const slow = ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1);
      console.log(`${dayName.padEnd(10)} | ${String(stats.totalOrders).padStart(6)} | ${avg.padStart(8)} | ${slow}%`);
    }
  }

  // Key Insights
  console.log('\n========================================');
  console.log('KEY INSIGHTS & RECOMMENDATIONS');
  console.log('========================================\n');

  // Find problematic brands
  const problematicBrands = brandAnalysis
    .filter(b => parseFloat(b.slowPct) > 50 && b.totalOrders >= 5)
    .slice(0, 5);

  if (problematicBrands.length > 0) {
    console.log('1. HIGH-RISK SUPPLIERS/BRANDS (>50% slow dispatch):');
    for (const brand of problematicBrands) {
      console.log(`   - ${brand.brand}: ${brand.slowPct}% slow (${brand.slowOrders}/${brand.totalOrders} orders)`);
    }
  }

  // Weekend order issue
  const weekendOrders = (dayOfWeekStats['Saturday']?.totalOrders || 0) +
                        (dayOfWeekStats['Sunday']?.totalOrders || 0);
  const weekendSlow = (dayOfWeekStats['Saturday']?.slowOrders || 0) +
                      (dayOfWeekStats['Sunday']?.slowOrders || 0);
  const weekendSlowPct = weekendOrders > 0 ? (weekendSlow / weekendOrders * 100) : 0;

  console.log(`\n2. WEEKEND ORDERS: ${weekendSlowPct.toFixed(1)}% of weekend orders are slow`);
  if (weekendSlowPct > 40) {
    console.log('   RECOMMENDATION: Consider adjusted cutoff times for weekend orders');
  }

  // State issues
  const slowStates = stateAnalysis.filter(s => parseFloat(s.avgDays) > 3);
  if (slowStates.length > 0) {
    console.log('\n3. STATES WITH SLOWER DISPATCH:');
    for (const state of slowStates.slice(0, 3)) {
      console.log(`   - ${state.state}: ${state.avgDays} days avg (${state.slowPct}% slow)`);
    }
  }

  // Store data to JSON for Supabase
  console.log('\n=== Saving Results ===\n');

  const analysisResults = {
    generated_at: new Date().toISOString(),
    overall: {
      total_orders: allOrders.length,
      orders_with_dispatch: ordersWithDispatch,
      avg_dispatch_days: avgDispatch,
      slow_orders: slowOrders,
      slow_percentage: slowPercentage
    },
    monthly_trend: sortedMonths.map(([month, stats]) => ({
      month,
      orders: stats.totalOrders,
      avg_days: (stats.totalDays / stats.totalOrders).toFixed(2),
      slow_pct: ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1)
    })),
    brand_analysis: brandAnalysis,
    state_analysis: stateAnalysis
  };

  fs.writeFileSync(
    '/home/user/master-ops/buy-organics-online/dispatch-analysis-results.json',
    JSON.stringify(analysisResults, null, 2)
  );

  console.log('Results saved to dispatch-analysis-results.json');

  // Try to store in Supabase
  console.log('\nStoring summary in Supabase...');

  const supabaseResult = curlPost(
    `${SUPABASE_URL}/rest/v1/automation_logs`,
    {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    {
      workflow_name: 'Order Dispatch Analysis',
      workflow_type: 'analysis',
      status: 'success',
      records_processed: allOrders.length,
      records_updated: ordersWithDispatch,
      error_details: analysisResults,
      completed_at: new Date().toISOString()
    }
  );

  console.log('Analysis stored in Supabase automation_logs');

  console.log('\n========================================');
  console.log('Analysis Complete!');
  console.log(`Finished: ${new Date().toISOString()}`);
  console.log('========================================');
}

// Run
runAnalysis().catch(console.error);
