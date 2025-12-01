const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'
);

async function checkMigration() {
  console.log('=== Checking Job Monitoring Migration Status ===\n');

  // 1. Check if table exists and count rows
  const { data: jobs, error: tableError } = await supabase
    .from('dashboard_job_status')
    .select('*');

  if (tableError) {
    console.log('TABLE STATUS: NOT FOUND or ERROR');
    console.log('Error:', tableError.message);
    console.log('\nThe migration has not been applied yet.');
    console.log('Please run the SQL in: infra/supabase/migrations/20251201_job_monitoring.sql');
    return;
  }

  console.log('TABLE STATUS: EXISTS');
  console.log('Total jobs seeded:', jobs.length);

  // 2. Show job summary by status
  const statusCounts = {};
  jobs.forEach(job => {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  });
  console.log('\nJobs by status:', JSON.stringify(statusCounts));

  // 3. Show jobs by business
  const businessCounts = {};
  jobs.forEach(job => {
    const biz = job.business || 'infrastructure';
    businessCounts[biz] = (businessCounts[biz] || 0) + 1;
  });
  console.log('Jobs by business:', JSON.stringify(businessCounts));

  // 4. Test refresh_job_statuses function
  console.log('\n=== Testing Functions ===');
  const { data: refreshResult, error: refreshError } = await supabase.rpc('refresh_job_statuses');
  if (refreshError) {
    console.log('FUNCTION refresh_job_statuses: ERROR -', refreshError.message);
  } else {
    console.log('FUNCTION refresh_job_statuses: OK');
    if (refreshResult && refreshResult.length > 0) {
      console.log('  Summary:', JSON.stringify(refreshResult[0]));
    }
  }

  // 5. Test update_job_status function
  const { error: updateError } = await supabase.rpc('update_job_status', {
    p_job_name: 'stock-sync',
    p_business: 'boo',
    p_last_run: new Date().toISOString(),
    p_success: true,
    p_error_message: null
  });
  if (updateError) {
    console.log('FUNCTION update_job_status: ERROR -', updateError.message);
  } else {
    console.log('FUNCTION update_job_status: OK');
  }

  // 6. List all jobs
  console.log('\n=== All Jobs ===');
  jobs.forEach(j => {
    const status = j.status.toUpperCase().padEnd(7);
    const biz = j.business || 'infra';
    console.log('[' + status + '] ' + j.job_name + ' (' + biz + ') - ' + j.job_type);
  });

  console.log('\n=== Migration Complete ===');
}

checkMigration().catch(console.error);
