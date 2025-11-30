#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const creds = require('../../creds.js');

async function analyze() {
  await creds.load('global');

  const supabase = createClient(
    process.env.MASTER_SUPABASE_URL,
    process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY
  );

  // Get ALL orders
  console.log('Fetching all orders...');
  let allOrders = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('tlx_distributor_orders')
      .select('order_number, distributor_id, total, order_date')
      .range(offset, offset + pageSize - 1);

    if (error || !data || data.length === 0) break;
    allOrders = allOrders.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`Found ${allOrders.length} total orders\n`);

  // Analyze order number patterns
  console.log('=== Order Number Patterns ===');
  const shopifyOrders = allOrders.filter(o => o.order_number.toLowerCase().includes('shopify'));
  const soOrders = allOrders.filter(o => o.order_number.startsWith('SO-'));

  console.log('SO-XXXXX orders:', soOrders.length);
  console.log('Shopify orders:', shopifyOrders.length);

  if (shopifyOrders.length > 0) {
    console.log('\nShopify order samples:');
    shopifyOrders.slice(0, 5).forEach(o => console.log('  ', o.order_number));
  }

  // Group by distributor
  const customerStats = {};
  allOrders.forEach(o => {
    if (!customerStats[o.distributor_id]) {
      customerStats[o.distributor_id] = {
        count: 0,
        total: 0,
        shopifyCount: 0,
        soCount: 0
      };
    }
    customerStats[o.distributor_id].count++;
    customerStats[o.distributor_id].total += o.total || 0;
    if (o.order_number.toLowerCase().includes('shopify')) {
      customerStats[o.distributor_id].shopifyCount++;
    }
    if (o.order_number.startsWith('SO-')) {
      customerStats[o.distributor_id].soCount++;
    }
  });

  // Get customer names
  const distIds = Object.keys(customerStats);
  console.log(`\nUnique customers with orders: ${distIds.length}`);

  let distributors = [];
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('tlx_distributors')
      .select('id, customer_code, customer_name')
      .in('id', distIds.slice(offset, offset + 100));

    if (error || !data || data.length === 0) break;
    distributors = distributors.concat(data);
    offset += 100;
    if (offset >= distIds.length) break;
  }

  const distMap = {};
  distributors.forEach(d => { distMap[d.id] = d; });

  // Build sorted list
  const sorted = Object.entries(customerStats)
    .map(([id, stats]) => ({
      id,
      name: distMap[id]?.customer_name || 'Unknown',
      code: distMap[id]?.customer_code || 'Unknown',
      ...stats,
      isB2C: stats.shopifyCount > 0
    }))
    .sort((a, b) => b.total - a.total);

  // Separate B2C from potential distributors
  const b2cCustomers = sorted.filter(c => c.isB2C);
  const potentialDistributors = sorted.filter(c => !c.isB2C);

  console.log('\n=== Summary ===');
  console.log('B2C customers (have Shopify orders):', b2cCustomers.length);
  console.log('Potential distributors (no Shopify):', potentialDistributors.length);
  console.log('B2C total revenue: $' + b2cCustomers.reduce((sum, c) => sum + c.total, 0).toFixed(0));
  console.log('Distributor total revenue: $' + potentialDistributors.reduce((sum, c) => sum + c.total, 0).toFixed(0));

  console.log('\n=== POTENTIAL DISTRIBUTORS (by revenue, no Shopify orders) ===');
  console.log('Rank  Code                 Name                                      Orders    Revenue');
  console.log('─'.repeat(95));

  potentialDistributors.slice(0, 50).forEach((c, i) => {
    const rank = (i + 1).toString().padStart(2);
    const code = c.code.substring(0, 18).padEnd(18);
    const name = c.name.substring(0, 40).padEnd(40);
    const orders = c.count.toString().padStart(6);
    const revenue = ('$' + c.total.toFixed(0)).padStart(10);
    console.log(`${rank}.  ${code}  ${name}  ${orders}  ${revenue}`);
  });

  // Show customers with 5+ orders as likely real distributors
  const realDistributors = potentialDistributors.filter(c => c.count >= 5);
  console.log('\n=== LIKELY REAL DISTRIBUTORS (5+ orders, no Shopify) ===');
  console.log('Count:', realDistributors.length);
  console.log('');
  realDistributors.forEach((c, i) => {
    const rank = (i + 1).toString().padStart(2);
    const code = c.code.substring(0, 18).padEnd(18);
    const name = c.name.substring(0, 45).padEnd(45);
    const orders = c.count.toString().padStart(4);
    const revenue = ('$' + c.total.toFixed(0)).padStart(10);
    console.log(`${rank}. ${code}  ${name}  Orders: ${orders}  Revenue: ${revenue}`);
  });
}

analyze().catch(console.error);
