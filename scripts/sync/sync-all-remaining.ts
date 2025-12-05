/**
 * Automated sync loop - syncs all remaining businesses in batches
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { supabase } from '../../infra/supabase/client';

const execAsync = promisify(exec);

async function getRemainingCount() {
  const { count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .or('hubspot_sync_status.is.null,hubspot_sync_status.eq.error,hubspot_sync_status.eq.pending');
  return count || 0;
}

async function syncAllRemaining() {
  console.log('🚀 Starting automated sync loop...\n');

  let passNumber = 0;
  let totalSynced = 0;

  while (true) {
    const remaining = await getRemainingCount();

    if (remaining === 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🎉 ALL BUSINESSES SYNCED!');
      console.log('='.repeat(80));
      console.log(`Total synced in this session: ${totalSynced}`);
      break;
    }

    passNumber++;
    const batchSize = Math.min(250, remaining);

    console.log(`\n📦 Pass ${passNumber}: Syncing ${batchSize} businesses (${remaining} remaining)...`);

    try {
      await execAsync(`npx tsx sync-businesses-to-hubspot.ts --limit=250`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      totalSynced += batchSize;
      console.log(`✅ Pass ${passNumber} complete: ${batchSize} synced`);

      // Small delay between passes
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`❌ Pass ${passNumber} failed:`, error.message);
      console.log('Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Final verification
  const { count: synced } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .eq('hubspot_sync_status', 'synced');

  console.log(`\n✅ Total businesses in HubSpot: ${synced}`);
}

syncAllRemaining()
  .then(() => {
    console.log('\n✨ Sync loop completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Sync loop failed:', error);
    process.exit(1);
  });
