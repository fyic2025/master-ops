#!/usr/bin/env npx tsx

/**
 * Event Summary
 *
 * Generate activity summary across all webhook/event systems.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const masterSupabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const booSupabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface EventSummary {
  period: {
    from: string;
    to: string;
  };
  integrations: {
    total_events: number;
    by_source: Record<string, { total: number; success: number; error: number }>;
    by_status: Record<string, number>;
    avg_duration_ms: number;
  };
  workflows: {
    total_executions: number;
    by_workflow: Record<string, { total: number; success: number; error: number }>;
    by_status: Record<string, number>;
    avg_duration_ms: number;
  };
  checkout_errors: {
    total: number;
    by_type: Record<string, number>;
    resolved: number;
    unresolved: number;
  };
  api_metrics: {
    total_calls: number;
    success_rate: number;
    by_service: Record<string, { total: number; success: number; avg_ms: number }>;
  };
  alerts: string[];
}

async function getIntegrationStats(fromDate: Date, toDate: Date): Promise<EventSummary['integrations']> {
  const { data } = await masterSupabase
    .from('integration_logs')
    .select('source, status, duration_ms')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString());

  const events = data || [];
  const bySource: Record<string, { total: number; success: number; error: number }> = {};
  const byStatus: Record<string, number> = {};
  let totalDuration = 0;

  for (const e of events) {
    // By source
    if (!bySource[e.source]) {
      bySource[e.source] = { total: 0, success: 0, error: 0 };
    }
    bySource[e.source].total++;
    if (e.status === 'success') bySource[e.source].success++;
    if (e.status === 'error') bySource[e.source].error++;

    // By status
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;

    // Duration
    totalDuration += e.duration_ms || 0;
  }

  return {
    total_events: events.length,
    by_source: bySource,
    by_status: byStatus,
    avg_duration_ms: events.length > 0 ? Math.round(totalDuration / events.length) : 0
  };
}

async function getWorkflowStats(fromDate: Date, toDate: Date): Promise<EventSummary['workflows']> {
  const { data } = await masterSupabase
    .from('workflow_execution_logs')
    .select('workflow_name, status, duration_ms')
    .gte('started_at', fromDate.toISOString())
    .lte('started_at', toDate.toISOString());

  const executions = data || [];
  const byWorkflow: Record<string, { total: number; success: number; error: number }> = {};
  const byStatus: Record<string, number> = {};
  let totalDuration = 0;

  for (const e of executions) {
    // By workflow
    const name = e.workflow_name || 'unknown';
    if (!byWorkflow[name]) {
      byWorkflow[name] = { total: 0, success: 0, error: 0 };
    }
    byWorkflow[name].total++;
    if (e.status === 'success') byWorkflow[name].success++;
    if (e.status === 'error') byWorkflow[name].error++;

    // By status
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;

    // Duration
    totalDuration += e.duration_ms || 0;
  }

  return {
    total_executions: executions.length,
    by_workflow: byWorkflow,
    by_status: byStatus,
    avg_duration_ms: executions.length > 0 ? Math.round(totalDuration / executions.length) : 0
  };
}

async function getCheckoutErrorStats(fromDate: Date, toDate: Date): Promise<EventSummary['checkout_errors']> {
  const { data } = await booSupabase
    .from('checkout_error_logs')
    .select('error_type, resolved')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString());

  const errors = data || [];
  const byType: Record<string, number> = {};
  let resolved = 0;
  let unresolved = 0;

  for (const e of errors) {
    byType[e.error_type || 'unknown'] = (byType[e.error_type || 'unknown'] || 0) + 1;
    if (e.resolved) resolved++;
    else unresolved++;
  }

  return {
    total: errors.length,
    by_type: byType,
    resolved,
    unresolved
  };
}

async function getApiMetricStats(fromDate: Date, toDate: Date): Promise<EventSummary['api_metrics']> {
  const { data } = await masterSupabase
    .from('api_metrics')
    .select('service, success, duration_ms')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString());

  const metrics = data || [];
  const byService: Record<string, { total: number; success: number; avg_ms: number; totalMs: number }> = {};
  let totalSuccess = 0;

  for (const m of metrics) {
    const service = m.service || 'unknown';
    if (!byService[service]) {
      byService[service] = { total: 0, success: 0, avg_ms: 0, totalMs: 0 };
    }
    byService[service].total++;
    byService[service].totalMs += m.duration_ms || 0;
    if (m.success) {
      byService[service].success++;
      totalSuccess++;
    }
  }

  // Calculate averages
  const result: Record<string, { total: number; success: number; avg_ms: number }> = {};
  for (const [service, stats] of Object.entries(byService)) {
    result[service] = {
      total: stats.total,
      success: stats.success,
      avg_ms: stats.total > 0 ? Math.round(stats.totalMs / stats.total) : 0
    };
  }

  return {
    total_calls: metrics.length,
    success_rate: metrics.length > 0 ? (totalSuccess / metrics.length) * 100 : 100,
    by_service: result
  };
}

function generateAlerts(summary: Partial<EventSummary>): string[] {
  const alerts: string[] = [];

  // Integration errors
  if (summary.integrations) {
    const errorRate = (summary.integrations.by_status['error'] || 0) / summary.integrations.total_events * 100;
    if (errorRate > 10) {
      alerts.push(`High integration error rate: ${errorRate.toFixed(1)}%`);
    }
  }

  // Workflow failures
  if (summary.workflows) {
    const errorRate = (summary.workflows.by_status['error'] || 0) / summary.workflows.total_executions * 100;
    if (errorRate > 10) {
      alerts.push(`High workflow failure rate: ${errorRate.toFixed(1)}%`);
    }
  }

  // Unresolved checkout errors
  if (summary.checkout_errors && summary.checkout_errors.unresolved > 20) {
    alerts.push(`${summary.checkout_errors.unresolved} unresolved checkout errors`);
  }

  // API success rate
  if (summary.api_metrics && summary.api_metrics.success_rate < 95) {
    alerts.push(`API success rate below 95%: ${summary.api_metrics.success_rate.toFixed(1)}%`);
  }

  return alerts;
}

function printSummary(summary: EventSummary): void {
  console.log('\n' + '='.repeat(70));
  console.log('EVENT ACTIVITY SUMMARY');
  console.log('='.repeat(70));
  console.log(`Period: ${new Date(summary.period.from).toLocaleDateString()} to ${new Date(summary.period.to).toLocaleDateString()}`);

  // Alerts
  if (summary.alerts.length > 0) {
    console.log('\n⚠️ ALERTS');
    for (const alert of summary.alerts) {
      console.log(`   • ${alert}`);
    }
  }

  // Integration Events
  console.log('\n📦 INTEGRATION EVENTS');
  console.log(`   Total: ${summary.integrations.total_events}`);
  console.log(`   Avg Duration: ${summary.integrations.avg_duration_ms}ms`);
  console.log('\n   By Source:');
  for (const [source, stats] of Object.entries(summary.integrations.by_source)) {
    const successRate = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(0) : '100';
    console.log(`      ${source.padEnd(15)} ${stats.total.toString().padStart(5)} events | ${successRate}% success | ${stats.error} errors`);
  }

  // Workflow Executions
  console.log('\n⚙️ WORKFLOW EXECUTIONS');
  console.log(`   Total: ${summary.workflows.total_executions}`);
  console.log(`   Avg Duration: ${summary.workflows.avg_duration_ms}ms`);
  console.log('\n   By Workflow:');
  for (const [workflow, stats] of Object.entries(summary.workflows.by_workflow)) {
    const successRate = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(0) : '100';
    console.log(`      ${workflow.substring(0, 25).padEnd(25)} ${stats.total.toString().padStart(4)} | ${successRate}% success`);
  }

  // Checkout Errors
  console.log('\n🛒 CHECKOUT ERRORS (BOO)');
  console.log(`   Total: ${summary.checkout_errors.total}`);
  console.log(`   Resolved: ${summary.checkout_errors.resolved}`);
  console.log(`   Unresolved: ${summary.checkout_errors.unresolved}`);
  if (Object.keys(summary.checkout_errors.by_type).length > 0) {
    console.log('\n   By Type:');
    for (const [type, count] of Object.entries(summary.checkout_errors.by_type)) {
      console.log(`      ${type.padEnd(20)} ${count}`);
    }
  }

  // API Metrics
  console.log('\n🔌 API METRICS');
  console.log(`   Total Calls: ${summary.api_metrics.total_calls}`);
  console.log(`   Success Rate: ${summary.api_metrics.success_rate.toFixed(1)}%`);
  if (Object.keys(summary.api_metrics.by_service).length > 0) {
    console.log('\n   By Service:');
    for (const [service, stats] of Object.entries(summary.api_metrics.by_service)) {
      const successRate = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(0) : '100';
      console.log(`      ${service.padEnd(15)} ${stats.total.toString().padStart(5)} calls | ${successRate}% | ${stats.avg_ms}ms avg`);
    }
  }

  // Overall Health
  console.log('\n' + '='.repeat(70));
  const integrationSuccess = summary.integrations.total_events > 0
    ? ((summary.integrations.by_status['success'] || 0) / summary.integrations.total_events * 100)
    : 100;
  const workflowSuccess = summary.workflows.total_executions > 0
    ? ((summary.workflows.by_status['success'] || 0) / summary.workflows.total_executions * 100)
    : 100;
  const overallHealth = (integrationSuccess + workflowSuccess + summary.api_metrics.success_rate) / 3;

  const healthEmoji = overallHealth >= 95 ? '🟢' : overallHealth >= 80 ? '🟡' : '🔴';
  console.log(`${healthEmoji} Overall Health: ${overallHealth.toFixed(1)}%`);
}

async function main() {
  const args = process.argv.slice(2);
  const fromArg = args.find(a => a.startsWith('--from='))?.split('=')[1];
  const toArg = args.find(a => a.startsWith('--to='))?.split('=')[1];
  const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '1');

  console.log('Webhook Event Router - Event Summary');
  console.log('=====================================');

  const toDate = toArg ? new Date(toArg) : new Date();
  const fromDate = fromArg ? new Date(fromArg) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`Generating summary from ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}...`);

  const summary: Partial<EventSummary> = {
    period: {
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    }
  };

  console.log('Fetching integration stats...');
  summary.integrations = await getIntegrationStats(fromDate, toDate);

  console.log('Fetching workflow stats...');
  summary.workflows = await getWorkflowStats(fromDate, toDate);

  console.log('Fetching checkout error stats...');
  summary.checkout_errors = await getCheckoutErrorStats(fromDate, toDate);

  console.log('Fetching API metrics...');
  summary.api_metrics = await getApiMetricStats(fromDate, toDate);

  // Generate alerts
  summary.alerts = generateAlerts(summary);

  printSummary(summary as EventSummary);
}

main().catch(console.error);
