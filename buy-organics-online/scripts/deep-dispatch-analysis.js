/**
 * Deep Order Dispatch Analysis for Buy Organics Online
 *
 * Analyzes 20,000 orders to find product-level correlations with slow dispatch
 * Identifies specific products/SKUs that consistently cause delays
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
    return null;
  }
}

function curlPost(url, headers, data) {
  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');
  const jsonData = JSON.stringify(data).replace(/'/g, "'\\''");
  const cmd = `curl -s -X POST "${url}" ${headerArgs} -d '${jsonData}'`;
  try {
    const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    return result ? JSON.parse(result) : null;
  } catch (e) {
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
    if (dayOfWeek !== 0 && dayOfWeek !== 6) days++;
    current.setDate(current.getDate() + 1);
  }
  return days;
}

async function runDeepAnalysis() {
  console.log('========================================');
  console.log('DEEP ORDER DISPATCH ANALYSIS');
  console.log('Buy Organics Online - 20,000 Orders');
  console.log('========================================\n');
  console.log(`Started: ${new Date().toISOString()}\n`);

  // ============================================
  // STEP 1: Fetch 20,000 orders
  // ============================================
  console.log('=== STEP 1: Fetching 20,000 Orders ===\n');

  const allOrders = [];
  const targetCount = 20000;
  let page = 1;

  while (allOrders.length < targetCount) {
    process.stdout.write(`\rFetching page ${page}... (${allOrders.length}/${targetCount})`);

    const orders = fetchBCOrders(page, 250);
    if (!orders || orders.length === 0) break;

    allOrders.push(...orders);
    if (orders.length < 250) break;
    page++;
    execSync('sleep 0.25');
  }

  console.log(`\n\nTotal orders fetched: ${allOrders.length}\n`);

  // ============================================
  // STEP 2: Categorize orders
  // ============================================
  console.log('=== STEP 2: Processing Orders ===\n');

  const slowOrders = [];
  const fastOrders = [];
  const allProcessed = [];

  for (const order of allOrders) {
    const hasShipDate = order.date_shipped &&
                        order.date_shipped !== '' &&
                        !order.date_shipped.startsWith('0000');

    const daysToDispatch = hasShipDate
      ? calculateBusinessDays(order.date_created, order.date_shipped)
      : null;

    const processed = {
      order_id: order.id,
      order_date: order.date_created,
      shipped_date: hasShipDate ? order.date_shipped : null,
      days_to_dispatch: daysToDispatch,
      status: order.status,
      total: parseFloat(order.total_inc_tax) || 0,
      items_total: parseInt(order.items_total) || 0,
      billing_state: order.billing_address?.state || null
    };

    allProcessed.push(processed);

    if (daysToDispatch !== null && daysToDispatch >= 0) {
      if (daysToDispatch > 3) {
        slowOrders.push(processed);
      } else if (daysToDispatch <= 1) {
        fastOrders.push(processed);
      }
    }
  }

  console.log(`Slow orders (>3 days): ${slowOrders.length}`);
  console.log(`Fast orders (<=1 day): ${fastOrders.length}\n`);

  // ============================================
  // STEP 3: Fetch products for ALL slow orders
  // ============================================
  console.log('=== STEP 3: Fetching Products for Slow Orders ===\n');
  console.log(`This will take a while - fetching products for ${slowOrders.length} orders...\n`);

  const productStats = {};  // Track each product's appearance in slow vs fast orders
  const skuStats = {};      // Track by SKU
  const slowOrderProducts = [];  // All products from slow orders

  let fetchedCount = 0;
  for (const order of slowOrders) {
    fetchedCount++;
    if (fetchedCount % 100 === 0) {
      process.stdout.write(`\rFetching slow order products: ${fetchedCount}/${slowOrders.length}`);
    }

    const products = fetchBCOrderProducts(order.order_id);
    if (products && products.length > 0) {
      for (const product of products) {
        const productKey = `${product.product_id}|${product.name}`;
        const sku = product.sku || 'NO_SKU';

        // Track by product
        if (!productStats[productKey]) {
          productStats[productKey] = {
            product_id: product.product_id,
            name: product.name,
            sku: sku,
            slow_orders: 0,
            fast_orders: 0,
            total_slow_days: 0,
            slow_order_ids: [],
            quantities: []
          };
        }
        productStats[productKey].slow_orders++;
        productStats[productKey].total_slow_days += order.days_to_dispatch || 0;
        productStats[productKey].slow_order_ids.push(order.order_id);
        productStats[productKey].quantities.push(product.quantity);

        // Track by SKU
        if (!skuStats[sku]) {
          skuStats[sku] = {
            sku: sku,
            product_names: new Set(),
            slow_orders: 0,
            fast_orders: 0,
            total_slow_days: 0
          };
        }
        skuStats[sku].slow_orders++;
        skuStats[sku].total_slow_days += order.days_to_dispatch || 0;
        skuStats[sku].product_names.add(product.name);

        // Store for detailed analysis
        slowOrderProducts.push({
          order_id: order.order_id,
          days_to_dispatch: order.days_to_dispatch,
          product_id: product.product_id,
          product_name: product.name,
          sku: sku,
          quantity: product.quantity,
          price: product.base_price
        });
      }
    }

    execSync('sleep 0.12'); // Rate limiting
  }

  console.log(`\n\nFetched products for ${fetchedCount} slow orders`);
  console.log(`Total product entries in slow orders: ${slowOrderProducts.length}\n`);

  // ============================================
  // STEP 4: Fetch products for fast orders (sample)
  // ============================================
  console.log('=== STEP 4: Fetching Products for Fast Orders (comparison) ===\n');

  const fastSample = fastOrders.slice(0, 1000); // Sample 1000 fast orders
  fetchedCount = 0;

  for (const order of fastSample) {
    fetchedCount++;
    if (fetchedCount % 100 === 0) {
      process.stdout.write(`\rFetching fast order products: ${fetchedCount}/${fastSample.length}`);
    }

    const products = fetchBCOrderProducts(order.order_id);
    if (products && products.length > 0) {
      for (const product of products) {
        const productKey = `${product.product_id}|${product.name}`;
        const sku = product.sku || 'NO_SKU';

        if (productStats[productKey]) {
          productStats[productKey].fast_orders++;
        }

        if (skuStats[sku]) {
          skuStats[sku].fast_orders++;
        }
      }
    }

    execSync('sleep 0.12');
  }

  console.log(`\n\nCompleted comparison analysis\n`);

  // ============================================
  // STEP 5: Analyze and rank problem products
  // ============================================
  console.log('=== STEP 5: Analyzing Problem Products ===\n');

  // Calculate slow rate for each product
  const productAnalysis = Object.values(productStats)
    .filter(p => p.slow_orders >= 3) // At least 3 slow orders
    .map(p => {
      const totalOrders = p.slow_orders + p.fast_orders;
      const slowRate = totalOrders > 0 ? (p.slow_orders / totalOrders * 100) : 100;
      const avgSlowDays = p.slow_orders > 0 ? (p.total_slow_days / p.slow_orders) : 0;

      return {
        product_id: p.product_id,
        name: p.name,
        sku: p.sku,
        slow_orders: p.slow_orders,
        fast_orders: p.fast_orders,
        total_orders: totalOrders,
        slow_rate: slowRate,
        avg_dispatch_days: avgSlowDays,
        impact_score: slowRate * p.slow_orders / 100, // Higher = more problematic
        sample_order_ids: p.slow_order_ids.slice(0, 5)
      };
    })
    .sort((a, b) => b.impact_score - a.impact_score);

  // SKU analysis
  const skuAnalysis = Object.values(skuStats)
    .filter(s => s.slow_orders >= 3)
    .map(s => {
      const totalOrders = s.slow_orders + s.fast_orders;
      const slowRate = totalOrders > 0 ? (s.slow_orders / totalOrders * 100) : 100;

      return {
        sku: s.sku,
        product_names: Array.from(s.product_names).slice(0, 3),
        slow_orders: s.slow_orders,
        fast_orders: s.fast_orders,
        total_orders: totalOrders,
        slow_rate: slowRate,
        avg_dispatch_days: s.slow_orders > 0 ? (s.total_slow_days / s.slow_orders) : 0
      };
    })
    .sort((a, b) => b.slow_rate - a.slow_rate || b.slow_orders - a.slow_orders);

  // ============================================
  // OUTPUT RESULTS
  // ============================================
  console.log('========================================');
  console.log('ANALYSIS RESULTS');
  console.log('========================================\n');

  // Top problem products
  console.log('=== TOP 30 PROBLEM PRODUCTS (Highest Impact) ===\n');
  console.log('Product Name                                    | SKU          | Slow | Fast | Slow% | Avg Days');
  console.log('-'.repeat(100));

  const top30Products = productAnalysis.slice(0, 30);
  for (const p of top30Products) {
    const name = p.name.substring(0, 45).padEnd(45);
    const sku = (p.sku || 'N/A').substring(0, 12).padEnd(12);
    console.log(`${name} | ${sku} | ${String(p.slow_orders).padStart(4)} | ${String(p.fast_orders).padStart(4)} | ${p.slow_rate.toFixed(1).padStart(5)}% | ${p.avg_dispatch_days.toFixed(1)}`);
  }

  // Products with 100% slow rate and significant volume
  console.log('\n=== PRODUCTS WITH 100% SLOW DISPATCH (5+ orders) ===\n');

  const alwaysSlowProducts = productAnalysis
    .filter(p => p.slow_rate >= 99 && p.slow_orders >= 5)
    .slice(0, 20);

  for (const p of alwaysSlowProducts) {
    console.log(`- ${p.name.substring(0, 60)}`);
    console.log(`  SKU: ${p.sku} | ${p.slow_orders} slow orders | Avg: ${p.avg_dispatch_days.toFixed(1)} days`);
  }

  // SKU patterns
  console.log('\n=== TOP 20 PROBLEM SKUs ===\n');
  console.log('SKU          | Slow | Fast | Slow% | Product Example');
  console.log('-'.repeat(80));

  const top20SKUs = skuAnalysis.slice(0, 20);
  for (const s of top20SKUs) {
    const sku = s.sku.substring(0, 12).padEnd(12);
    const example = (s.product_names[0] || 'Unknown').substring(0, 40);
    console.log(`${sku} | ${String(s.slow_orders).padStart(4)} | ${String(s.fast_orders).padStart(4)} | ${s.slow_rate.toFixed(1).padStart(5)}% | ${example}`);
  }

  // ============================================
  // STEP 6: Store in Supabase
  // ============================================
  console.log('\n=== STEP 6: Storing Results in Supabase ===\n');

  // Prepare data for Supabase
  const analysisData = {
    generated_at: new Date().toISOString(),
    orders_analyzed: allOrders.length,
    slow_orders_count: slowOrders.length,
    fast_orders_count: fastOrders.length,
    top_problem_products: top30Products,
    always_slow_products: alwaysSlowProducts,
    problem_skus: top20SKUs,
    summary: {
      total_unique_products_in_slow_orders: Object.keys(productStats).length,
      products_with_100pct_slow: alwaysSlowProducts.length,
      avg_dispatch_slow_orders: slowOrders.reduce((a, b) => a + (b.days_to_dispatch || 0), 0) / slowOrders.length
    }
  };

  // Save to JSON file
  fs.writeFileSync(
    '/home/user/master-ops/buy-organics-online/dispatch-deep-analysis.json',
    JSON.stringify(analysisData, null, 2)
  );
  console.log('Saved to dispatch-deep-analysis.json');

  // Store in Supabase automation_logs
  const supabaseResult = curlPost(
    `${SUPABASE_URL}/rest/v1/automation_logs`,
    {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    {
      workflow_name: 'Deep Order Dispatch Analysis - Problem Products',
      workflow_type: 'analysis',
      status: 'success',
      records_processed: allOrders.length,
      records_updated: slowOrders.length,
      error_details: analysisData,
      completed_at: new Date().toISOString()
    }
  );
  console.log('Stored analysis summary in Supabase automation_logs');

  // Create a separate table entry for problem products (for easier querying)
  // Store top problem products as individual records
  console.log('\nStoring problem products list...');

  const problemProductsForDB = top30Products.map(p => ({
    analysis_date: new Date().toISOString().split('T')[0],
    product_id: p.product_id,
    product_name: p.name,
    sku: p.sku,
    slow_order_count: p.slow_orders,
    fast_order_count: p.fast_orders,
    slow_rate_percent: Math.round(p.slow_rate * 10) / 10,
    avg_dispatch_days: Math.round(p.avg_dispatch_days * 10) / 10,
    impact_score: Math.round(p.impact_score * 100) / 100,
    sample_order_ids: p.sample_order_ids,
    needs_review: p.slow_rate > 80
  }));

  // Save problem products to a separate JSON for import
  fs.writeFileSync(
    '/home/user/master-ops/buy-organics-online/problem-products-for-supabase.json',
    JSON.stringify(problemProductsForDB, null, 2)
  );
  console.log('Saved problem products list for Supabase import');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('EXECUTIVE SUMMARY');
  console.log('========================================\n');

  console.log(`Orders Analyzed: ${allOrders.length}`);
  console.log(`Slow Orders (>3 days): ${slowOrders.length} (${(slowOrders.length/allOrders.length*100).toFixed(1)}%)`);
  console.log(`Unique Products in Slow Orders: ${Object.keys(productStats).length}`);
  console.log(`Products with 100% Slow Rate: ${alwaysSlowProducts.length}`);
  console.log(`\nAverage dispatch for slow orders: ${(slowOrders.reduce((a, b) => a + (b.days_to_dispatch || 0), 0) / slowOrders.length).toFixed(2)} days`);

  console.log('\n--- TOP 5 PRODUCTS TO INVESTIGATE ---\n');
  for (let i = 0; i < Math.min(5, alwaysSlowProducts.length); i++) {
    const p = alwaysSlowProducts[i];
    console.log(`${i+1}. ${p.name}`);
    console.log(`   SKU: ${p.sku} | ${p.slow_orders} orders always slow | Avg ${p.avg_dispatch_days.toFixed(1)} days\n`);
  }

  console.log('\n========================================');
  console.log('Analysis Complete!');
  console.log(`Finished: ${new Date().toISOString()}`);
  console.log('========================================');

  return analysisData;
}

// Run
runDeepAnalysis().catch(console.error);
