/**
 * Order Dispatch Analysis for Buy Organics Online
 *
 * This script:
 * 1. Fetches the last 10,000 orders from BigCommerce
 * 2. Stores them in Supabase with dispatch time calculations
 * 3. Analyzes common denominators on slow orders (by supplier/brand)
 * 4. Generates 12-month monthly trend on days to dispatch
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

const BC_STORE_HASH = 'hhhi';
const BC_ACCESS_TOKEN = 'd9y2srla3treynpbtmp4f3u1bomdna2';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const bcApi = axios.create({
  baseURL: `https://api.bigcommerce.com/stores/${BC_STORE_HASH}`,
  headers: {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Create table if not exists
async function createOrderDispatchTable() {
  console.log('\n=== STEP 1: Setting up Supabase table ===\n');

  // Check if table exists by trying to query it
  const { error: checkError } = await supabase
    .from('order_dispatch_analysis')
    .select('order_id')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    console.log('Table does not exist. Creating via SQL...');

    // We'll need to create the table via direct SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS order_dispatch_analysis (
        id SERIAL PRIMARY KEY,
        order_id INTEGER UNIQUE NOT NULL,
        order_date TIMESTAMP WITH TIME ZONE,
        shipped_date TIMESTAMP WITH TIME ZONE,
        days_to_dispatch NUMERIC(10,2),
        status VARCHAR(50),
        status_id INTEGER,
        customer_id INTEGER,
        total_inc_tax NUMERIC(15,2),
        total_ex_tax NUMERIC(15,2),
        items_total INTEGER,
        shipping_method VARCHAR(255),
        payment_method VARCHAR(100),
        billing_state VARCHAR(100),
        billing_postcode VARCHAR(20),
        products JSONB,
        brands TEXT[],
        skus TEXT[],
        categories TEXT[],
        is_slow_dispatch BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_order_dispatch_order_date ON order_dispatch_analysis(order_date);
      CREATE INDEX IF NOT EXISTS idx_order_dispatch_days ON order_dispatch_analysis(days_to_dispatch);
      CREATE INDEX IF NOT EXISTS idx_order_dispatch_brands ON order_dispatch_analysis USING GIN(brands);
      CREATE INDEX IF NOT EXISTS idx_order_dispatch_slow ON order_dispatch_analysis(is_slow_dispatch);
    `;

    console.log('Please run this SQL in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new');
    console.log('\n' + createTableSQL);
    console.log('\nAttempting to continue anyway (table may already exist)...');
  } else {
    console.log('Table order_dispatch_analysis exists');
  }
}

// Fetch orders from BigCommerce
async function fetchOrders(targetCount = 10000) {
  console.log('\n=== STEP 2: Fetching orders from BigCommerce ===\n');

  const allOrders = [];
  let page = 1;
  const perPage = 250; // Max per page for BigCommerce

  while (allOrders.length < targetCount) {
    console.log(`Fetching page ${page}... (${allOrders.length}/${targetCount} orders)`);

    try {
      const response = await bcApi.get('/v2/orders', {
        params: {
          limit: perPage,
          page: page,
          sort: 'date_created:desc' // Get most recent first
        }
      });

      const orders = response.data;

      if (!orders || orders.length === 0) {
        console.log('No more orders to fetch');
        break;
      }

      allOrders.push(...orders);
      console.log(`  Fetched ${orders.length} orders (Total: ${allOrders.length})`);

      if (orders.length < perPage) {
        console.log('Reached end of orders');
        break;
      }

      page++;

      // Rate limiting protection
      await new Promise(resolve => setTimeout(resolve, 250));

    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      if (error.response?.status === 429) {
        console.log('Rate limited, waiting 60 seconds...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }
      throw error;
    }
  }

  console.log(`\nTotal orders fetched: ${allOrders.length}`);
  return allOrders.slice(0, targetCount);
}

// Fetch order products
async function fetchOrderProducts(orderId) {
  try {
    const response = await bcApi.get(`/v2/orders/${orderId}/products`);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching products for order ${orderId}:`, error.message);
    return [];
  }
}

// Calculate days to dispatch
function calculateDaysToDispatch(orderDate, shippedDate) {
  if (!orderDate || !shippedDate) return null;

  const order = new Date(orderDate);
  const shipped = new Date(shippedDate);

  // Calculate business days (excluding weekends)
  let days = 0;
  let current = new Date(order);

  while (current < shipped) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      days++;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Transform and enrich order data
async function processOrders(orders) {
  console.log('\n=== STEP 3: Processing orders and fetching product details ===\n');

  const processedOrders = [];
  let count = 0;

  for (const order of orders) {
    count++;
    if (count % 100 === 0) {
      console.log(`Processing order ${count}/${orders.length}...`);
    }

    // Skip orders without shipped date for dispatch calculation
    const shippedDate = order.date_shipped && order.date_shipped !== '0000-00-00' && order.date_shipped !== ''
      ? order.date_shipped
      : null;

    const daysToDispatch = calculateDaysToDispatch(order.date_created, shippedDate);

    // Fetch products for this order
    const products = await fetchOrderProducts(order.id);

    // Extract brands and SKUs
    const brands = [...new Set(products.map(p => p.brand || 'Unknown').filter(b => b))];
    const skus = products.map(p => p.sku).filter(s => s);

    // Mark as slow if > 3 business days
    const isSlowDispatch = daysToDispatch !== null && daysToDispatch > 3;

    processedOrders.push({
      order_id: order.id,
      order_date: order.date_created,
      shipped_date: shippedDate,
      days_to_dispatch: daysToDispatch,
      status: order.status,
      status_id: order.status_id,
      customer_id: order.customer_id,
      total_inc_tax: parseFloat(order.total_inc_tax) || 0,
      total_ex_tax: parseFloat(order.total_ex_tax) || 0,
      items_total: parseInt(order.items_total) || 0,
      shipping_method: order.shipping_addresses?.[0]?.shipping_method || null,
      payment_method: order.payment_method || null,
      billing_state: order.billing_address?.state || null,
      billing_postcode: order.billing_address?.zip || null,
      products: products.map(p => ({
        id: p.product_id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        brand: p.brand,
        price: p.base_price
      })),
      brands: brands,
      skus: skus,
      is_slow_dispatch: isSlowDispatch
    });

    // Rate limiting for product fetches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return processedOrders;
}

// Store in Supabase
async function storeInSupabase(orders) {
  console.log('\n=== STEP 4: Storing orders in Supabase ===\n');

  const BATCH_SIZE = 100;
  let stored = 0;
  let errors = 0;

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(orders.length / BATCH_SIZE);

    try {
      const { error } = await supabase
        .from('order_dispatch_analysis')
        .upsert(batch, {
          onConflict: 'order_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`Batch ${batchNum} error:`, error.message);
        errors += batch.length;
      } else {
        stored += batch.length;
        console.log(`Batch ${batchNum}/${totalBatches} stored (${stored}/${orders.length})`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Batch ${batchNum} exception:`, error.message);
      errors += batch.length;
    }
  }

  console.log(`\nStorage complete: ${stored} stored, ${errors} errors`);
  return { stored, errors };
}

// Analysis: Common denominators on slow orders
async function analyzeSlowOrders() {
  console.log('\n=== STEP 5: Analyzing slow orders ===\n');

  // Get all orders with dispatch data
  const { data: allOrders, error } = await supabase
    .from('order_dispatch_analysis')
    .select('*')
    .not('days_to_dispatch', 'is', null)
    .order('days_to_dispatch', { ascending: false });

  if (error) {
    console.error('Error fetching orders for analysis:', error.message);
    return null;
  }

  console.log(`Analyzing ${allOrders.length} orders with dispatch data...\n`);

  // Overall statistics
  const dispatchTimes = allOrders.map(o => o.days_to_dispatch).filter(d => d !== null);
  const avgDispatch = dispatchTimes.reduce((a, b) => a + b, 0) / dispatchTimes.length;
  const slowOrders = allOrders.filter(o => o.is_slow_dispatch);
  const slowPercentage = (slowOrders.length / allOrders.length * 100).toFixed(1);

  console.log('=== OVERALL STATISTICS ===');
  console.log(`Total orders with dispatch data: ${allOrders.length}`);
  console.log(`Average days to dispatch: ${avgDispatch.toFixed(2)} business days`);
  console.log(`Slow orders (>3 days): ${slowOrders.length} (${slowPercentage}%)`);
  console.log(`Fastest dispatch: ${Math.min(...dispatchTimes)} days`);
  console.log(`Slowest dispatch: ${Math.max(...dispatchTimes)} days`);

  // Brand analysis
  console.log('\n=== BRAND ANALYSIS (Top 20 Slowest) ===');
  const brandStats = {};

  for (const order of allOrders) {
    const brands = order.brands || [];
    for (const brand of brands) {
      if (!brandStats[brand]) {
        brandStats[brand] = {
          totalOrders: 0,
          slowOrders: 0,
          totalDays: 0,
          orders: []
        };
      }
      brandStats[brand].totalOrders++;
      brandStats[brand].totalDays += order.days_to_dispatch || 0;
      if (order.is_slow_dispatch) {
        brandStats[brand].slowOrders++;
      }
    }
  }

  // Calculate averages and sort by average dispatch time
  const brandAnalysis = Object.entries(brandStats)
    .filter(([_, stats]) => stats.totalOrders >= 5) // Min 5 orders
    .map(([brand, stats]) => ({
      brand,
      totalOrders: stats.totalOrders,
      slowOrders: stats.slowOrders,
      avgDispatchDays: (stats.totalDays / stats.totalOrders).toFixed(2),
      slowPercentage: ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.avgDispatchDays) - parseFloat(a.avgDispatchDays))
    .slice(0, 20);

  console.log('\nBrand | Orders | Slow | Slow% | Avg Days');
  console.log('-'.repeat(60));
  for (const brand of brandAnalysis) {
    console.log(`${brand.brand.substring(0, 25).padEnd(25)} | ${String(brand.totalOrders).padStart(6)} | ${String(brand.slowOrders).padStart(4)} | ${brand.slowPercentage.padStart(5)}% | ${brand.avgDispatchDays}`);
  }

  // State analysis
  console.log('\n=== STATE ANALYSIS ===');
  const stateStats = {};

  for (const order of allOrders) {
    const state = order.billing_state || 'Unknown';
    if (!stateStats[state]) {
      stateStats[state] = { totalOrders: 0, slowOrders: 0, totalDays: 0 };
    }
    stateStats[state].totalOrders++;
    stateStats[state].totalDays += order.days_to_dispatch || 0;
    if (order.is_slow_dispatch) {
      stateStats[state].slowOrders++;
    }
  }

  const stateAnalysis = Object.entries(stateStats)
    .filter(([_, stats]) => stats.totalOrders >= 10)
    .map(([state, stats]) => ({
      state,
      totalOrders: stats.totalOrders,
      avgDispatchDays: (stats.totalDays / stats.totalOrders).toFixed(2),
      slowPercentage: ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.avgDispatchDays) - parseFloat(a.avgDispatchDays));

  console.log('\nState | Orders | Avg Days | Slow%');
  console.log('-'.repeat(45));
  for (const state of stateAnalysis) {
    console.log(`${state.state.padEnd(15)} | ${String(state.totalOrders).padStart(6)} | ${state.avgDispatchDays.padStart(8)} | ${state.slowPercentage}%`);
  }

  // Day of week analysis
  console.log('\n=== ORDER DAY ANALYSIS ===');
  const dayStats = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const order of allOrders) {
    const day = new Date(order.order_date).getDay();
    const dayName = dayNames[day];
    if (!dayStats[dayName]) {
      dayStats[dayName] = { totalOrders: 0, slowOrders: 0, totalDays: 0 };
    }
    dayStats[dayName].totalOrders++;
    dayStats[dayName].totalDays += order.days_to_dispatch || 0;
    if (order.is_slow_dispatch) {
      dayStats[dayName].slowOrders++;
    }
  }

  console.log('\nDay | Orders | Avg Days | Slow%');
  console.log('-'.repeat(45));
  for (const dayName of dayNames) {
    const stats = dayStats[dayName];
    if (stats && stats.totalOrders > 0) {
      const avg = (stats.totalDays / stats.totalOrders).toFixed(2);
      const slow = ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1);
      console.log(`${dayName.padEnd(12)} | ${String(stats.totalOrders).padStart(6)} | ${avg.padStart(8)} | ${slow}%`);
    }
  }

  return {
    brandAnalysis,
    stateAnalysis,
    overall: {
      totalOrders: allOrders.length,
      avgDispatch,
      slowOrders: slowOrders.length,
      slowPercentage
    }
  };
}

// Monthly trend analysis
async function analyzeMonthlyTrend() {
  console.log('\n=== STEP 6: 12-Month Dispatch Trend Analysis ===\n');

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: orders, error } = await supabase
    .from('order_dispatch_analysis')
    .select('order_date, days_to_dispatch, is_slow_dispatch')
    .gte('order_date', twelveMonthsAgo.toISOString())
    .not('days_to_dispatch', 'is', null);

  if (error) {
    console.error('Error fetching monthly data:', error.message);
    return null;
  }

  // Group by month
  const monthlyStats = {};

  for (const order of orders) {
    const date = new Date(order.order_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = {
        totalOrders: 0,
        totalDays: 0,
        slowOrders: 0,
        dispatchTimes: []
      };
    }

    monthlyStats[monthKey].totalOrders++;
    monthlyStats[monthKey].totalDays += order.days_to_dispatch;
    monthlyStats[monthKey].dispatchTimes.push(order.days_to_dispatch);
    if (order.is_slow_dispatch) {
      monthlyStats[monthKey].slowOrders++;
    }
  }

  // Calculate metrics and sort
  const monthlyTrend = Object.entries(monthlyStats)
    .map(([month, stats]) => {
      const sorted = stats.dispatchTimes.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];

      return {
        month,
        totalOrders: stats.totalOrders,
        avgDispatchDays: (stats.totalDays / stats.totalOrders).toFixed(2),
        medianDispatchDays: median.toFixed(2),
        p90DispatchDays: p90.toFixed(2),
        slowOrders: stats.slowOrders,
        slowPercentage: ((stats.slowOrders / stats.totalOrders) * 100).toFixed(1)
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  console.log('Month | Orders | Avg Days | Median | P90 | Slow%');
  console.log('-'.repeat(60));
  for (const month of monthlyTrend) {
    console.log(`${month.month} | ${String(month.totalOrders).padStart(6)} | ${month.avgDispatchDays.padStart(8)} | ${month.medianDispatchDays.padStart(6)} | ${month.p90DispatchDays.padStart(3)} | ${month.slowPercentage}%`);
  }

  // Calculate trend (is it improving or getting worse?)
  if (monthlyTrend.length >= 2) {
    const recent = monthlyTrend.slice(-3);
    const earlier = monthlyTrend.slice(0, 3);

    const recentAvg = recent.reduce((a, b) => a + parseFloat(b.avgDispatchDays), 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + parseFloat(b.avgDispatchDays), 0) / earlier.length;

    const trend = recentAvg < earlierAvg ? 'IMPROVING' : recentAvg > earlierAvg ? 'WORSENING' : 'STABLE';
    const change = ((recentAvg - earlierAvg) / earlierAvg * 100).toFixed(1);

    console.log(`\nTREND: ${trend} (${change > 0 ? '+' : ''}${change}% change)`);
    console.log(`Recent 3 months avg: ${recentAvg.toFixed(2)} days`);
    console.log(`Earlier 3 months avg: ${earlierAvg.toFixed(2)} days`);
  }

  return monthlyTrend;
}

// Store analysis results
async function storeAnalysisResults(brandAnalysis, monthlyTrend, overall) {
  console.log('\n=== Storing analysis results ===\n');

  const analysisReport = {
    report_type: 'order_dispatch_analysis',
    report_date: new Date().toISOString(),
    overall_stats: overall,
    brand_analysis: brandAnalysis,
    monthly_trend: monthlyTrend,
    generated_by: 'order-dispatch-analysis.js'
  };

  // Store in automation_logs or a reports table
  const { error } = await supabase
    .from('automation_logs')
    .insert({
      workflow_name: 'Order Dispatch Analysis',
      workflow_type: 'analysis',
      status: 'success',
      records_processed: overall?.totalOrders || 0,
      error_details: analysisReport,
      completed_at: new Date().toISOString()
    });

  if (error) {
    console.log('Note: Could not store analysis in automation_logs:', error.message);
  } else {
    console.log('Analysis results stored in automation_logs');
  }
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('Buy Organics Online - Order Dispatch Analysis');
  console.log('========================================');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Setup table
    await createOrderDispatchTable();

    // Step 2: Fetch orders
    const orders = await fetchOrders(10000);

    if (orders.length === 0) {
      console.log('No orders found. Exiting.');
      return;
    }

    // Step 3: Process orders (get product details)
    const processedOrders = await processOrders(orders);

    // Step 4: Store in Supabase
    await storeInSupabase(processedOrders);

    // Step 5: Analyze slow orders
    const analysis = await analyzeSlowOrders();

    // Step 6: Monthly trend
    const monthlyTrend = await analyzeMonthlyTrend();

    // Store results
    if (analysis) {
      await storeAnalysisResults(analysis.brandAnalysis, monthlyTrend, analysis.overall);
    }

    console.log('\n========================================');
    console.log('Analysis Complete!');
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log('========================================');

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
