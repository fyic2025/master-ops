#!/usr/bin/env npx tsx

/**
 * Sync Job Status Script
 *
 * Synchronizes job statuses from multiple sources:
 * - BOO automation_logs
 * - n8n workflow executions
 * - Edge function logs
 *
 * Updates dashboard_job_status table with latest run times and statuses.
 *
 * Usage:
 *   npx tsx sync-job-status.ts              # Full sync
 *   npx tsx sync-job-status.ts --source boo  # Only BOO logs
 *   npx tsx sync-job-status.ts --refresh     # Just refresh statuses
 */

import { createClient } from '@supabase/supabase-js';

// Master Supabase (dashboard hub)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// BOO Supabase (for automation logs)
const booSupabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface JobStatus {
  job_name: string;
  job_type: string;
  business: string;
  last_run: string | null;
  last_success: string | null;
  last_error: string | null;
  status: 'healthy' | 'stale' | 'failed' | 'unknown';
}

interface SyncReport {
  timestamp: Date;
  sources: {
    boo: { synced: number; errors: number };
    n8n: { synced: number; errors: number };
  };
  jobsUpdated: number;
  staleJobs: string[];
  failedJobs: string[];
}

// Job name mappings from various sources
const JOB_MAPPINGS: Record<string, { name: string; business: string; type: string }> = {
  // BOO automation_logs mappings
  'supplier-stock-sync': { name: 'boo-stock-sync', business: 'boo', type: 'cron' },
  'gmc-sync': { name: 'boo-gmc-sync', business: 'boo', type: 'cron' },
  'gsc-sync': { name: 'boo-gsc-sync', business: 'boo', type: 'cron' },
  'BC → Supabase Product Sync (Script)': { name: 'boo-bc-product-sync', business: 'boo', type: 'n8n' },
  'Product-Supplier Linking': { name: 'boo-product-linking', business: 'boo', type: 'cron' },
  'checkout-error-collector': { name: 'boo-checkout-collector', business: 'boo', type: 'edge_function' },
  'livechat-sync': { name: 'boo-livechat-sync', business: 'boo', type: 'n8n' },

  // Teelixir jobs
  'anniversary-email': { name: 'tlx-anniversary-email', business: 'teelixir', type: 'cron' },
  'winback-email': { name: 'tlx-winback-email', business: 'teelixir', type: 'cron' },
  'klaviyo-sync': { name: 'tlx-klaviyo-sync', business: 'teelixir', type: 'cron' },
  'shopify-order-sync': { name: 'tlx-order-sync', business: 'teelixir', type: 'n8n' },

  // Elevate jobs
  'trial-processor': { name: 'elevate-trial-processor', business: 'elevate', type: 'n8n' },
  'prospecting-processor': { name: 'elevate-prospecting', business: 'elevate', type: 'n8n' },
  'hubspot-sync': { name: 'elevate-hubspot-sync', business: 'elevate', type: 'n8n' }
};

/**
 * Sync from BOO automation_logs
 */
async function syncFromBooLogs(): Promise<{ synced: number; errors: number }> {
  console.log('Syncing from BOO automation_logs...');

  const { data: logs, error } = await booSupabase
    .from('automation_logs')
    .select('*')
    .gte('started_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching BOO logs:', error.message);
    return { synced: 0, errors: 1 };
  }

  // Group by workflow name, take most recent
  const latestByWorkflow = new Map<string, typeof logs[0]>();
  for (const log of logs || []) {
    const existing = latestByWorkflow.get(log.workflow_name);
    if (!existing || new Date(log.started_at) > new Date(existing.started_at)) {
      latestByWorkflow.set(log.workflow_name, log);
    }
  }

  let synced = 0;
  let errors = 0;

  for (const [workflowName, log] of latestByWorkflow) {
    const mapping = JOB_MAPPINGS[workflowName] || {
      name: workflowName.toLowerCase().replace(/\s+/g, '-'),
      business: 'boo',
      type: 'unknown'
    };

    try {
      const status = log.status === 'completed' ? 'healthy' :
                     log.status === 'failed' ? 'failed' : 'unknown';

      await supabase.from('dashboard_job_status').upsert({
        job_name: mapping.name,
        job_type: mapping.type,
        business: mapping.business,
        last_run: log.completed_at || log.started_at,
        last_success: log.status === 'completed' ? log.completed_at : null,
        last_error: log.status === 'failed' ? (log.error_message || 'Unknown error') : null,
        status,
        metadata: { source: 'boo_automation_logs', original_name: workflowName },
        updated_at: new Date().toISOString()
      }, { onConflict: 'job_name' });

      synced++;
    } catch (err) {
      console.error(`Failed to sync ${workflowName}:`, err);
      errors++;
    }
  }

  console.log(`  Synced ${synced} jobs, ${errors} errors`);
  return { synced, errors };
}

/**
 * Sync from n8n workflow executions
 */
async function syncFromN8n(): Promise<{ synced: number; errors: number }> {
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!baseUrl || !apiKey) {
    console.log('Skipping n8n sync (missing credentials)');
    return { synced: 0, errors: 0 };
  }

  console.log('Syncing from n8n executions...');

  try {
    // Get recent executions
    const response = await fetch(`${baseUrl}/api/v1/executions?limit=100`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status}`);
    }

    const data = await response.json();
    const executions = data.data || [];

    // Group by workflow
    const latestByWorkflow = new Map<string, any>();
    for (const exec of executions) {
      const existing = latestByWorkflow.get(exec.workflowId);
      if (!existing || new Date(exec.startedAt) > new Date(existing.startedAt)) {
        latestByWorkflow.set(exec.workflowId, exec);
      }
    }

    let synced = 0;
    let errors = 0;

    for (const [workflowId, exec] of latestByWorkflow) {
      try {
        // Get workflow name
        const wfResponse = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          headers: { 'X-N8N-API-KEY': apiKey }
        });

        if (!wfResponse.ok) continue;

        const workflow = await wfResponse.json();
        const jobName = `n8n-${workflow.name.toLowerCase().replace(/\s+/g, '-')}`;

        const status = exec.finished ?
          (exec.status === 'success' ? 'healthy' : 'failed') :
          'unknown';

        await supabase.from('dashboard_job_status').upsert({
          job_name: jobName,
          job_type: 'n8n',
          business: detectBusiness(workflow.name),
          description: workflow.name,
          last_run: exec.stoppedAt || exec.startedAt,
          last_success: exec.status === 'success' ? exec.stoppedAt : null,
          last_error: exec.status !== 'success' ? 'Execution failed' : null,
          status,
          metadata: { workflow_id: workflowId, n8n_status: exec.status },
          updated_at: new Date().toISOString()
        }, { onConflict: 'job_name' });

        synced++;
      } catch (err) {
        errors++;
      }
    }

    console.log(`  Synced ${synced} n8n workflows, ${errors} errors`);
    return { synced, errors };

  } catch (error) {
    console.error('n8n sync failed:', error);
    return { synced: 0, errors: 1 };
  }
}

/**
 * Detect business from workflow name
 */
function detectBusiness(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('boo') || lower.includes('bigcommerce') || lower.includes('buy organics')) return 'boo';
  if (lower.includes('teelixir') || lower.includes('tlx')) return 'teelixir';
  if (lower.includes('elevate')) return 'elevate';
  if (lower.includes('rhf') || lower.includes('red hill')) return 'rhf';
  return 'infrastructure';
}

/**
 * Refresh job statuses based on timing
 */
async function refreshJobStatuses(): Promise<{ stale: string[]; failed: string[] }> {
  console.log('Refreshing job statuses...');

  // Call database function to update statuses
  await supabase.rpc('update_job_status').catch(() => {
    // Function might not exist, do manual update
    console.log('  Falling back to manual status update');
  });

  // Get unhealthy jobs
  const { data: unhealthy } = await supabase
    .from('dashboard_job_status')
    .select('job_name, status, last_run, expected_frequency')
    .eq('enabled', true)
    .in('status', ['stale', 'failed', 'unknown']);

  const stale = unhealthy?.filter(j => j.status === 'stale').map(j => j.job_name) || [];
  const failed = unhealthy?.filter(j => j.status === 'failed').map(j => j.job_name) || [];

  // Manual stale detection based on expected_frequency
  const { data: allJobs } = await supabase
    .from('dashboard_job_status')
    .select('*')
    .eq('enabled', true);

  for (const job of allJobs || []) {
    let isStale = false;
    const lastRun = job.last_run ? new Date(job.last_run) : null;
    const hoursSince = lastRun ? (Date.now() - lastRun.getTime()) / (1000 * 60 * 60) : Infinity;

    switch (job.expected_frequency) {
      case 'every_2h':
        isStale = hoursSince > 3;
        break;
      case 'every_6h':
        isStale = hoursSince > 8;
        break;
      case 'daily':
        isStale = hoursSince > 26;
        break;
      case 'weekly':
        isStale = hoursSince > 24 * 8;
        break;
    }

    if (isStale && job.status !== 'stale' && job.status !== 'failed') {
      await supabase.from('dashboard_job_status')
        .update({ status: 'stale', updated_at: new Date().toISOString() })
        .eq('job_name', job.job_name);

      if (!stale.includes(job.job_name)) {
        stale.push(job.job_name);
      }
    }
  }

  console.log(`  Stale: ${stale.length}, Failed: ${failed.length}`);
  return { stale, failed };
}

/**
 * Print sync report
 */
function printReport(report: SyncReport) {
  console.log('\n' + '='.repeat(60));
  console.log('JOB STATUS SYNC REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log('');

  console.log('--- SYNC SOURCES ---');
  console.log(`BOO Automation Logs: ${report.sources.boo.synced} synced, ${report.sources.boo.errors} errors`);
  console.log(`n8n Workflows: ${report.sources.n8n.synced} synced, ${report.sources.n8n.errors} errors`);
  console.log(`Total Jobs Updated: ${report.jobsUpdated}`);
  console.log('');

  if (report.staleJobs.length > 0) {
    console.log('--- STALE JOBS ---');
    report.staleJobs.forEach(j => console.log(`  - ${j}`));
    console.log('');
  }

  if (report.failedJobs.length > 0) {
    console.log('--- FAILED JOBS ---');
    report.failedJobs.forEach(j => console.log(`  - ${j}`));
    console.log('');
  }

  console.log('='.repeat(60));
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1];
  const refreshOnly = args.includes('--refresh');

  console.log('\n=== Job Status Sync ===\n');

  const report: SyncReport = {
    timestamp: new Date(),
    sources: {
      boo: { synced: 0, errors: 0 },
      n8n: { synced: 0, errors: 0 }
    },
    jobsUpdated: 0,
    staleJobs: [],
    failedJobs: []
  };

  if (!refreshOnly) {
    // Sync from sources
    if (!sourceArg || sourceArg === 'boo') {
      report.sources.boo = await syncFromBooLogs();
    }
    if (!sourceArg || sourceArg === 'n8n') {
      report.sources.n8n = await syncFromN8n();
    }

    report.jobsUpdated = report.sources.boo.synced + report.sources.n8n.synced;
  }

  // Refresh statuses
  const { stale, failed } = await refreshJobStatuses();
  report.staleJobs = stale;
  report.failedJobs = failed;

  printReport(report);

  // Exit with error if critical issues
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
