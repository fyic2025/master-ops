#!/usr/bin/env node
/**
 * Verify Distributor Groups Migration
 *
 * Run after applying the SQL migration to check data
 * Usage: node teelixir/scripts/verify-distributor-groups.js
 */

const { createClient } = require('@supabase/supabase-js');
const creds = require('../../creds.js');

async function verify() {
  console.log('=== Verifying Distributor Groups Migration ===\n');

  await creds.load('global');

  const supabase = createClient(
    process.env.MASTER_SUPABASE_URL,
    process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY
  );

  // Check if table exists
  console.log('1. Checking tlx_distributor_groups table...');
  const { data: groups, error: groupError } = await supabase
    .from('tlx_distributor_groups')
    .select('*')
    .order('group_name');

  if (groupError) {
    console.log('   ERROR: Table does not exist or is not accessible');
    console.log('   Run the SQL migration first in Supabase SQL Editor');
    console.log('   File: infra/supabase/migrations/20251130_teelixir_distributor_groups.sql');
    return;
  }

  console.log(`   Found ${groups.length} distributor groups`);
  groups.forEach(g => {
    console.log(`   - ${g.group_code}: ${g.group_name} (${g.region})`);
  });

  // Check columns exist on tlx_distributors
  console.log('\n2. Checking tlx_distributors columns...');
  const { data: sample } = await supabase
    .from('tlx_distributors')
    .select('customer_code, is_distributor, distributor_group_id')
    .limit(1);

  if (!sample || sample.length === 0) {
    console.log('   No distributors found');
    return;
  }

  const hasIsDistributor = 'is_distributor' in sample[0];
  const hasGroupId = 'distributor_group_id' in sample[0];
  console.log(`   is_distributor column: ${hasIsDistributor ? 'EXISTS' : 'MISSING'}`);
  console.log(`   distributor_group_id column: ${hasGroupId ? 'EXISTS' : 'MISSING'}`);

  if (!hasIsDistributor || !hasGroupId) {
    console.log('\n   Columns missing - run the ALTER TABLE statements from migration');
    return;
  }

  // Get distributor summary
  console.log('\n3. Distributor Group Summary:\n');

  const { data: summary } = await supabase
    .from('tlx_distributors')
    .select(`
      distributor_group_id,
      customer_code,
      customer_name,
      total_orders,
      total_revenue,
      tlx_distributor_groups(group_code, group_name, region)
    `)
    .eq('is_distributor', true)
    .order('total_revenue', { ascending: false });

  if (!summary || summary.length === 0) {
    console.log('   No distributors mapped yet');
    return;
  }

  // Group by parent entity
  const grouped = {};
  summary.forEach(d => {
    const groupName = d.tlx_distributor_groups?.group_name || 'Unmapped';
    const region = d.tlx_distributor_groups?.region || '';
    if (!grouped[groupName]) {
      grouped[groupName] = { region, accounts: [], totalOrders: 0, totalRevenue: 0 };
    }
    grouped[groupName].accounts.push(d.customer_code);
    grouped[groupName].totalOrders += d.total_orders || 0;
    grouped[groupName].totalRevenue += d.total_revenue || 0;
  });

  console.log('Group                         Region     Accounts  Orders      Revenue');
  console.log('─'.repeat(75));

  Object.entries(grouped)
    .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
    .forEach(([name, data]) => {
      const namePad = name.substring(0, 28).padEnd(28);
      const region = (data.region || '').padEnd(10);
      const accounts = data.accounts.length.toString().padStart(8);
      const orders = data.totalOrders.toString().padStart(7);
      const revenue = ('$' + Math.round(data.totalRevenue).toLocaleString()).padStart(12);
      console.log(`${namePad}  ${region}  ${accounts}  ${orders}  ${revenue}`);
    });

  const totalRevenue = Object.values(grouped).reduce((sum, g) => sum + g.totalRevenue, 0);
  const totalOrders = Object.values(grouped).reduce((sum, g) => sum + g.totalOrders, 0);
  const totalAccounts = Object.values(grouped).reduce((sum, g) => sum + g.accounts.length, 0);

  console.log('─'.repeat(75));
  console.log(`${'TOTAL'.padEnd(28)}  ${''.padEnd(10)}  ${totalAccounts.toString().padStart(8)}  ${totalOrders.toString().padStart(7)}  ${('$' + Math.round(totalRevenue).toLocaleString()).padStart(12)}`);

  // Show account details for Vitalus and Oborne
  console.log('\n4. Account Details by Group:\n');

  const detailGroups = ['VITALUS', 'OBORNE_VIC', 'OBORNE_NSW', 'OBORNE_QLD', 'OBORNE_SA', 'OBORNE_WA'];
  for (const groupCode of detailGroups) {
    const { data: accounts } = await supabase
      .from('tlx_distributors')
      .select(`
        customer_code,
        customer_name,
        total_orders,
        total_revenue,
        tlx_distributor_groups!inner(group_code, group_name)
      `)
      .eq('tlx_distributor_groups.group_code', groupCode);

    if (accounts && accounts.length > 0) {
      console.log(`${accounts[0].tlx_distributor_groups.group_name}:`);
      accounts.forEach(a => {
        const orders = (a.total_orders || 0).toString().padStart(4);
        const revenue = ('$' + Math.round(a.total_revenue || 0).toLocaleString()).padStart(10);
        console.log(`  - ${a.customer_code.padEnd(25)} ${orders} orders  ${revenue}`);
      });
      console.log('');
    }
  }

  console.log('=== Verification Complete ===');
}

verify().catch(console.error);
