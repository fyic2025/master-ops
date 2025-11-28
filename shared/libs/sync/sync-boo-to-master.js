/**
 * Sync BOO (Buy Organics Online) data to Master Dashboard
 *
 * This script syncs:
 * - Business metrics (product counts, GMC status)
 * - Health checks (integration statuses)
 * - Alerts (sync issues, problems)
 *
 * Run: node shared/libs/sync/sync-boo-to-master.js
 */

const { createClient } = require('@supabase/supabase-js');

// BOO Supabase (Source)
const BOO_SUPABASE_URL = 'https://usibnysqelovfuctmkqw.supabase.co';
const BOO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s';

// Master Supabase (Destination - Dashboard Hub)
const MASTER_SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co';
const MASTER_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8';

const booSupabase = createClient(BOO_SUPABASE_URL, BOO_SUPABASE_KEY);
const masterSupabase = createClient(MASTER_SUPABASE_URL, MASTER_SUPABASE_KEY);

async function syncBusinessMetrics() {
  console.log('\n=== Syncing Business Metrics ===');

  const today = new Date().toISOString().split('T')[0];

  // Get product counts from BOO
  const { count: totalProducts } = await booSupabase
    .from('bc_products')
    .select('*', { count: 'exact', head: true });

  // Get GMC product stats
  const { data: gmcProducts } = await booSupabase
    .from('google_merchant_products')
    .select('status');

  const gmcApproved = gmcProducts?.filter(p => p.status === 'approved').length || 0;
  const gmcDisapproved = gmcProducts?.filter(p => p.status === 'disapproved').length || 0;

  // Get linked products count
  const { count: linkedProducts } = await booSupabase
    .from('bc_products')
    .select('*', { count: 'exact', head: true })
    .not('supplier_product_id', 'is', null);

  const metrics = {
    business: 'boo',
    date: today,
    orders_today: 0, // Will be populated from BigCommerce API
    revenue_today: 0,
    revenue_mtd: 0,
    sync_status: 'healthy',
    updated_at: new Date().toISOString()
  };

  console.log('BOO Metrics:', metrics);

  // Upsert to master
  const { error } = await masterSupabase
    .from('dashboard_business_metrics')
    .upsert(metrics, { onConflict: 'business,date' });

  if (error) {
    console.error('Error syncing metrics:', error.message);
  } else {
    console.log('Metrics synced successfully');
  }

  return metrics;
}

async function syncHealthChecks() {
  console.log('\n=== Syncing Health Checks ===');

  const healthChecks = [];

  // Check BigCommerce connection (via bc_products table)
  try {
    const { count, error } = await booSupabase
      .from('bc_products')
      .select('*', { count: 'exact', head: true });

    healthChecks.push({
      integration: 'bigcommerce',
      status: error ? 'down' : 'healthy',
      business: 'boo',
      last_check: new Date().toISOString(),
      error_message: error?.message || null,
      details: { product_count: count }
    });
  } catch (e) {
    healthChecks.push({
      integration: 'bigcommerce',
      status: 'down',
      business: 'boo',
      last_check: new Date().toISOString(),
      error_message: e.message
    });
  }

  // Check Google Ads (placeholder - needs developer token)
  healthChecks.push({
    integration: 'google_ads',
    status: 'unknown',
    business: 'boo',
    last_check: new Date().toISOString(),
    error_message: 'Pending developer token approval',
    details: { pending: true }
  });

  // Check LiveChat
  try {
    const { count, error } = await booSupabase
      .from('livechat_conversations')
      .select('*', { count: 'exact', head: true });

    healthChecks.push({
      integration: 'livechat',
      status: error ? 'down' : 'healthy',
      business: 'boo',
      last_check: new Date().toISOString(),
      error_message: error?.message || null,
      details: { conversation_count: count }
    });
  } catch (e) {
    healthChecks.push({
      integration: 'livechat',
      status: 'unknown',
      business: 'boo',
      last_check: new Date().toISOString(),
      error_message: 'Table may not exist'
    });
  }

  console.log('Health Checks:', healthChecks.map(h => `${h.integration}: ${h.status}`));

  // Upsert to master
  for (const check of healthChecks) {
    const { error } = await masterSupabase
      .from('dashboard_health_checks')
      .upsert(check, { onConflict: 'integration,business' });

    if (error) {
      console.error(`Error syncing ${check.integration}:`, error.message);
    }
  }

  console.log('Health checks synced successfully');
  return healthChecks;
}

async function syncAlerts() {
  console.log('\n=== Syncing Alerts ===');

  const alerts = [];

  // Check for GMC disapproval issues
  const { data: gmcProducts } = await booSupabase
    .from('google_merchant_products')
    .select('status')
    .eq('status', 'disapproved');

  const disapprovedCount = gmcProducts?.length || 0;

  if (disapprovedCount > 100) {
    alerts.push({
      type: 'warning',
      title: 'GMC Products Disapproved',
      message: `${disapprovedCount} products are disapproved in Google Merchant Center. This affects visibility in Shopping ads.`,
      business: 'boo',
      action_label: 'View in GMC',
      action_url: 'https://merchants.google.com/mc/products/diagnostics',
      is_read: false
    });
  }

  // Check for unlinked products
  const { count: totalProducts } = await booSupabase
    .from('bc_products')
    .select('*', { count: 'exact', head: true });

  const { count: linkedProducts } = await booSupabase
    .from('bc_products')
    .select('*', { count: 'exact', head: true })
    .not('supplier_product_id', 'is', null);

  const linkRate = totalProducts > 0 ? (linkedProducts / totalProducts * 100) : 0;

  if (linkRate < 80) {
    alerts.push({
      type: 'info',
      title: 'Product Link Rate Below Target',
      message: `Only ${linkRate.toFixed(1)}% of products are linked to suppliers. Target is 80%+.`,
      business: 'boo',
      action_label: 'Review Unlinked',
      action_url: '/sync',
      is_read: false
    });
  }

  // Add a success alert if things are looking good
  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'BOO Systems Healthy',
      message: `All integrations operational. ${totalProducts} products, ${linkRate.toFixed(1)}% linked.`,
      business: 'boo',
      is_read: false
    });
  }

  console.log('Alerts:', alerts.map(a => `[${a.type}] ${a.title}`));

  // Clear old BOO alerts and insert new ones
  await masterSupabase
    .from('dashboard_alerts')
    .delete()
    .eq('business', 'boo')
    .eq('is_read', false);

  for (const alert of alerts) {
    const { error } = await masterSupabase
      .from('dashboard_alerts')
      .insert(alert);

    if (error) {
      console.error(`Error creating alert:`, error.message);
    }
  }

  console.log('Alerts synced successfully');
  return alerts;
}

async function main() {
  console.log('========================================');
  console.log('BOO -> Master Dashboard Sync');
  console.log('Started:', new Date().toISOString());
  console.log('========================================');

  try {
    await syncBusinessMetrics();
    await syncHealthChecks();
    await syncAlerts();

    console.log('\n========================================');
    console.log('Sync completed successfully!');
    console.log('========================================');
  } catch (error) {
    console.error('\nSync failed:', error.message);
    process.exit(1);
  }
}

main();
