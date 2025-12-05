import { supabase } from '../../infra/supabase/client';

async function checkRemaining() {
  console.log('Investigating remaining businesses...\n');

  const { count: pendingCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .eq('hubspot_sync_status', 'pending');

  const { count: syncedCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .eq('hubspot_sync_status', 'synced');

  const { count: errorCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .eq('hubspot_sync_status', 'error');

  const { count: nullCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .is('hubspot_sync_status', null);

  console.log('Status breakdown:');
  console.log('  pending:', pendingCount);
  console.log('  synced:', syncedCount);
  console.log('  error:', errorCount);
  console.log('  null:', nullCount);
  console.log('  Total:', (pendingCount || 0) + (syncedCount || 0) + (errorCount || 0) + (nullCount || 0));

  // Sample pending businesses
  if (pendingCount && pendingCount > 0) {
    const { data: pending } = await supabase
      .from('businesses')
      .select('hubspot_sync_status, hubspot_sync_error, lead_id, name')
      .eq('hubspot_sync_status', 'pending')
      .limit(10);

    console.log('\nSample pending businesses:');
    pending?.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.lead_id} - ${b.name}`);
      if (b.hubspot_sync_error) {
        console.log(`     Error: ${b.hubspot_sync_error.substring(0, 100)}`);
      }
    });
  }
}

checkRemaining()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
