#!/usr/bin/env node
/**
 * Apply Distributor Groups Migration
 *
 * Creates the tlx_distributor_groups table and maps existing accounts
 *
 * Usage: node teelixir/scripts/apply-distributor-groups.js
 */

const { createClient } = require('@supabase/supabase-js');
const creds = require('../../creds.js');

async function applyMigration() {
  console.log('=== Applying Distributor Groups Migration ===\n');

  await creds.load('global');

  const supabase = createClient(
    process.env.MASTER_SUPABASE_URL,
    process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY
  );

  // Step 1: Create distributor groups table
  console.log('1. Creating tlx_distributor_groups table...');
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS tlx_distributor_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_code TEXT UNIQUE NOT NULL,
        group_name TEXT NOT NULL,
        parent_group_id UUID REFERENCES tlx_distributor_groups(id),
        region TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (createError) {
    // Table might already exist or we need raw SQL
    console.log('   Note: May need to run via Supabase SQL Editor');
  }

  // Step 2: Add columns to tlx_distributors (if not exists)
  console.log('2. Adding columns to tlx_distributors...');

  // Check if columns exist first
  const { data: cols } = await supabase
    .from('tlx_distributors')
    .select('*')
    .limit(1);

  const hasIsDistributor = cols && cols[0] && 'is_distributor' in cols[0];
  const hasGroupId = cols && cols[0] && 'distributor_group_id' in cols[0];

  if (hasIsDistributor && hasGroupId) {
    console.log('   Columns already exist');
  } else {
    console.log('   Need to add columns via SQL Editor');
  }

  // Step 3: Seed distributor groups
  console.log('3. Seeding distributor groups...');

  const groups = [
    { group_code: 'OBORNE_VIC', group_name: 'Oborne Health (VIC)', region: 'VIC' },
    { group_code: 'OBORNE_NSW', group_name: 'Oborne Health (NSW)', region: 'NSW' },
    { group_code: 'OBORNE_QLD', group_name: 'Oborne Health (QLD)', region: 'QLD' },
    { group_code: 'OBORNE_SA', group_name: 'Oborne Health (SA)', region: 'SA' },
    { group_code: 'OBORNE_WA', group_name: 'Oborne Health (WA)', region: 'WA' },
    { group_code: 'VITALUS', group_name: 'Vitalus Group', region: 'National' },
    { group_code: 'WAIVA_CLARK', group_name: 'Waiva Clark Distributing', region: 'National' },
    { group_code: 'MUSCLE_WORX', group_name: 'Muscle Worx Group', region: 'National' },
    { group_code: 'PERTH_HEALTH', group_name: 'Perth Health', region: 'WA' },
    { group_code: 'KIKAI', group_name: 'kikai Distributions', region: 'National' },
    { group_code: 'HAPPY_GREEN', group_name: 'Happy Green Distribution', region: 'National' },
    { group_code: 'AHD', group_name: 'Australian Health Distributors', region: 'National' },
    { group_code: 'COLES', group_name: 'Coles CFC', region: 'National' },
    { group_code: 'SALTCO', group_name: 'Saltco', region: 'National' },
  ];

  const { error: seedError } = await supabase
    .from('tlx_distributor_groups')
    .upsert(groups, { onConflict: 'group_code' });

  if (seedError) {
    console.log('   Error seeding groups:', seedError.message);
    console.log('   Table may not exist yet - run SQL migration first');
    return;
  }
  console.log('   Seeded', groups.length, 'groups');

  // Step 4: Get group IDs
  const { data: groupData } = await supabase
    .from('tlx_distributor_groups')
    .select('id, group_code');

  const groupMap = {};
  groupData.forEach(g => { groupMap[g.group_code] = g.id; });

  // Step 5: Map distributors to groups
  console.log('4. Mapping distributor accounts to groups...');

  const mappings = [
    { codes: ['Clifford Hallam - Melb', 'Clifford Hallam Health'], group: 'OBORNE_VIC' },
    { codes: ['CH2-NSW', 'CH2-BER'], group: 'OBORNE_NSW' },
    { codes: ['Clifford Hallam - Bris', 'CH2- Lyt-QLD'], group: 'OBORNE_QLD' },
    { codes: ['Clifford Hallam - Edinburgh', 'CH2-ADE'], group: 'OBORNE_SA' },
    { codes: ['Clifford Hallam - Perth'], group: 'OBORNE_WA' },
    { codes: ['VITALUS', 'GLOB-BY-NAT', 'COMP-HEAL'], group: 'VITALUS' },
    { codes: ['WAIVA-CLARK'], group: 'WAIVA_CLARK' },
    { codes: ['PER-HEALTH'], group: 'PERTH_HEALTH' },
    { codes: ['KIKAI'], group: 'KIKAI' },
    { codes: ['HAP-GREEN'], group: 'HAPPY_GREEN' },
    { codes: ['AHD'], group: 'AHD' },
    { codes: ['Coles-CDC'], group: 'COLES' },
    { codes: ['SALTO-CO'], group: 'SALTCO' },
  ];

  let totalMapped = 0;
  for (const mapping of mappings) {
    const { error, count } = await supabase
      .from('tlx_distributors')
      .update({
        is_distributor: true,
        distributor_group_id: groupMap[mapping.group]
      })
      .in('customer_code', mapping.codes);

    if (!error) {
      console.log(`   ${mapping.group}: mapped ${mapping.codes.length} account(s)`);
      totalMapped += mapping.codes.length;
    }
  }

  // Handle Muscle Worx with ILIKE pattern
  const { data: muscleWorx } = await supabase
    .from('tlx_distributors')
    .select('id, customer_code')
    .or('customer_code.ilike.MUSC-WORX%,customer_code.ilike.SUP-%');

  if (muscleWorx && muscleWorx.length > 0) {
    const ids = muscleWorx.map(m => m.id);
    await supabase
      .from('tlx_distributors')
      .update({ is_distributor: true, distributor_group_id: groupMap['MUSCLE_WORX'] })
      .in('id', ids);
    console.log(`   MUSCLE_WORX: mapped ${muscleWorx.length} account(s)`);
    totalMapped += muscleWorx.length;
  }

  console.log(`\n   Total accounts mapped: ${totalMapped}`);

  // Step 6: Show summary
  console.log('\n5. Distributor Group Summary:\n');

  const { data: summary } = await supabase
    .from('tlx_distributors')
    .select(`
      distributor_group_id,
      customer_code,
      customer_name,
      total_orders,
      total_revenue,
      tlx_distributor_groups!inner(group_name, region)
    `)
    .eq('is_distributor', true)
    .order('total_revenue', { ascending: false });

  // Group by distributor group
  const grouped = {};
  summary?.forEach(d => {
    const groupName = d.tlx_distributor_groups?.group_name || 'Unknown';
    if (!grouped[groupName]) {
      grouped[groupName] = {
        region: d.tlx_distributor_groups?.region,
        accounts: [],
        totalOrders: 0,
        totalRevenue: 0
      };
    }
    grouped[groupName].accounts.push(d.customer_code);
    grouped[groupName].totalOrders += d.total_orders || 0;
    grouped[groupName].totalRevenue += d.total_revenue || 0;
  });

  console.log('Group                         Region   Accounts  Orders    Revenue');
  console.log('─'.repeat(70));

  Object.entries(grouped)
    .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
    .forEach(([name, data]) => {
      const namePad = name.substring(0, 28).padEnd(28);
      const region = (data.region || '').padEnd(8);
      const accounts = data.accounts.length.toString().padStart(8);
      const orders = data.totalOrders.toString().padStart(7);
      const revenue = ('$' + Math.round(data.totalRevenue).toLocaleString()).padStart(11);
      console.log(`${namePad}  ${region}  ${accounts}  ${orders}  ${revenue}`);
    });

  console.log('\n=== Migration Complete ===');
}

applyMigration().catch(console.error);
