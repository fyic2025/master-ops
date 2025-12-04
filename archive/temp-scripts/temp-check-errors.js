require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseUrl = process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co';
  const supabaseKey = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseKey) {
    console.log('No Supabase key found in env');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get latest sync log with errors
  const { data, error } = await supabase
    .from('tlx_sync_log')
    .select('*')
    .eq('sync_type', 'orders')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.log('Query error:', error.message);
    return;
  }

  for (const log of data) {
    console.log('\n=== Sync Log ===');
    console.log('Started:', log.created_at);
    console.log('Completed:', log.completed_at);
    console.log('Processed:', log.items_processed);
    console.log('Succeeded:', log.items_succeeded);
    console.log('Failed:', log.items_failed);
    console.log('Error message:', log.error_message);
    if (log.error_details) {
      console.log('Error details:', JSON.stringify(log.error_details, null, 2));
    }
  }
}

main();
