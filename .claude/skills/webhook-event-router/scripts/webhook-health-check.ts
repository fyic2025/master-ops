#!/usr/bin/env npx tsx

/**
 * Webhook Health Check
 *
 * Monitor all webhook endpoints across businesses.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase clients
const masterSupabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const booSupabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface WebhookHealth {
  endpoint: string;
  business: string;
  type: 'edge_function' | 'n8n' | 'api';
  last_received: Date | null;
  events_24h: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_duration_ms: number;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  last_error?: string;
}

function getStatus(events24h: number, successRate: number, lastReceived: Date | null): WebhookHealth['status'] {
  const hoursSinceLastEvent = lastReceived
    ? (Date.now() - new Date(lastReceived).getTime()) / (1000 * 60 * 60)
    : Infinity;

  if (events24h === 0 && hoursSinceLastEvent > 48) return 'unknown';
  if (hoursSinceLastEvent > 24) return 'down';
  if (successRate < 50) return 'down';
  if (successRate < 90 || hoursSinceLastEvent > 12) return 'degraded';
  return 'healthy';
}

async function checkIntegrationLogs(source: string, business?: string): Promise<Partial<WebhookHealth>> {
  let query = masterSupabase
    .from('integration_logs')
    .select('status, duration_ms, created_at, message')
    .eq('source', source)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (business) {
    query = query.eq('business_id', business);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error querying integration_logs for ${source}:`, error.message);
    return { events_24h: 0, success_count: 0, error_count: 0, success_rate: 0, avg_duration_ms: 0 };
  }

  const events = data || [];
  const successCount = events.filter(e => e.status === 'success').length;
  const errorCount = events.filter(e => e.status === 'error').length;
  const lastError = events.find(e => e.status === 'error')?.message;
  const avgDuration = events.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / Math.max(events.length, 1);

  return {
    events_24h: events.length,
    success_count: successCount,
    error_count: errorCount,
    success_rate: events.length > 0 ? (successCount / events.length) * 100 : 100,
    avg_duration_ms: Math.round(avgDuration),
    last_received: events.length > 0 ? new Date(events[0].created_at) : null,
    last_error: lastError
  };
}

async function checkWorkflowExecutions(workflowName: string): Promise<Partial<WebhookHealth>> {
  const { data, error } = await masterSupabase
    .from('workflow_execution_logs')
    .select('status, duration_ms, started_at, error_details_json')
    .ilike('workflow_name', `%${workflowName}%`)
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('started_at', { ascending: false });

  if (error) {
    console.error(`Error querying workflow_execution_logs for ${workflowName}:`, error.message);
    return { events_24h: 0, success_count: 0, error_count: 0, success_rate: 0, avg_duration_ms: 0 };
  }

  const events = data || [];
  const successCount = events.filter(e => e.status === 'success').length;
  const errorCount = events.filter(e => e.status === 'error').length;
  const lastError = events.find(e => e.status === 'error')?.error_details_json?.message;
  const avgDuration = events.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / Math.max(events.length, 1);

  return {
    events_24h: events.length,
    success_count: successCount,
    error_count: errorCount,
    success_rate: events.length > 0 ? (successCount / events.length) * 100 : 100,
    avg_duration_ms: Math.round(avgDuration),
    last_received: events.length > 0 ? new Date(events[0].started_at) : null,
    last_error: lastError
  };
}

async function checkCheckoutErrors(): Promise<Partial<WebhookHealth>> {
  const { data, error } = await booSupabase
    .from('checkout_error_logs')
    .select('id, created_at, error_type, resolved')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error querying checkout_error_logs:', error.message);
    return { events_24h: 0, success_count: 0, error_count: 0, success_rate: 100, avg_duration_ms: 0 };
  }

  const events = data || [];
  // For errors, "success" means the error was logged successfully
  return {
    events_24h: events.length,
    success_count: events.length, // All logged = success
    error_count: 0,
    success_rate: 100,
    avg_duration_ms: 0,
    last_received: events.length > 0 ? new Date(events[0].created_at) : null
  };
}

async function checkSyncLogs(integration: string): Promise<Partial<WebhookHealth>> {
  // This would query Elevate's integration_sync_log if available
  // For now, check master integration_logs
  return checkIntegrationLogs(integration, 'elevate');
}

async function getAllWebhookHealth(): Promise<WebhookHealth[]> {
  const results: WebhookHealth[] = [];

  // Define all webhook endpoints to check
  const endpoints = [
    {
      endpoint: 'checkout-error-collector',
      business: 'boo',
      type: 'edge_function' as const,
      check: checkCheckoutErrors
    },
    {
      endpoint: 'shopify-customer-sync',
      business: 'teelixir',
      type: 'n8n' as const,
      check: () => checkWorkflowExecutions('customer-sync')
    },
    {
      endpoint: 'shopify-order-sync',
      business: 'teelixir',
      type: 'n8n' as const,
      check: () => checkWorkflowExecutions('order-sync')
    },
    {
      endpoint: 'hubspot-integration',
      business: 'elevate',
      type: 'edge_function' as const,
      check: () => checkIntegrationLogs('hubspot', 'elevate')
    },
    {
      endpoint: 'unleashed-sync',
      business: 'elevate',
      type: 'edge_function' as const,
      check: () => checkIntegrationLogs('unleashed', 'elevate')
    },
    {
      endpoint: 'smartlead-sync',
      business: 'teelixir',
      type: 'n8n' as const,
      check: () => checkWorkflowExecutions('smartlead')
    }
  ];

  for (const ep of endpoints) {
    const stats = await ep.check();
    const status = getStatus(stats.events_24h || 0, stats.success_rate || 100, stats.last_received || null);

    results.push({
      endpoint: ep.endpoint,
      business: ep.business,
      type: ep.type,
      last_received: stats.last_received || null,
      events_24h: stats.events_24h || 0,
      success_count: stats.success_count || 0,
      error_count: stats.error_count || 0,
      success_rate: stats.success_rate || 100,
      avg_duration_ms: stats.avg_duration_ms || 0,
      status,
      last_error: stats.last_error
    });
  }

  return results;
}

function printResults(results: WebhookHealth[]): void {
  console.log('\nWebhook Health Status');
  console.log('='.repeat(80));

  // Group by status
  const healthy = results.filter(r => r.status === 'healthy');
  const degraded = results.filter(r => r.status === 'degraded');
  const down = results.filter(r => r.status === 'down');
  const unknown = results.filter(r => r.status === 'unknown');

  // Summary
  console.log(`\n📊 Summary: ${healthy.length} healthy, ${degraded.length} degraded, ${down.length} down, ${unknown.length} unknown`);

  // Down (critical)
  if (down.length > 0) {
    console.log('\n🔴 DOWN');
    for (const r of down) {
      console.log(`   ${r.endpoint} (${r.business})`);
      console.log(`      Type: ${r.type} | Events 24h: ${r.events_24h} | Success Rate: ${r.success_rate.toFixed(1)}%`);
      if (r.last_error) console.log(`      Last Error: ${r.last_error.substring(0, 60)}`);
    }
  }

  // Degraded
  if (degraded.length > 0) {
    console.log('\n🟡 DEGRADED');
    for (const r of degraded) {
      console.log(`   ${r.endpoint} (${r.business})`);
      console.log(`      Type: ${r.type} | Events 24h: ${r.events_24h} | Success Rate: ${r.success_rate.toFixed(1)}%`);
      const lastReceivedStr = r.last_received
        ? `${Math.round((Date.now() - new Date(r.last_received).getTime()) / (1000 * 60 * 60))}h ago`
        : 'Never';
      console.log(`      Last Received: ${lastReceivedStr}`);
    }
  }

  // Healthy
  if (healthy.length > 0) {
    console.log('\n🟢 HEALTHY');
    for (const r of healthy) {
      const lastReceivedStr = r.last_received
        ? `${Math.round((Date.now() - new Date(r.last_received).getTime()) / (1000 * 60))}m ago`
        : 'N/A';
      console.log(`   ${r.endpoint.padEnd(30)} ${r.business.padEnd(10)} ${r.events_24h} events | ${r.success_rate.toFixed(0)}% | Last: ${lastReceivedStr}`);
    }
  }

  // Unknown
  if (unknown.length > 0) {
    console.log('\n⚪ UNKNOWN (no recent activity)');
    for (const r of unknown) {
      console.log(`   ${r.endpoint} (${r.business}) - No events in 48+ hours`);
    }
  }

  // Details table
  console.log('\n' + '='.repeat(80));
  console.log('Detailed Metrics');
  console.log('='.repeat(80));
  console.log('Endpoint                        Business   Events  Success  Errors  Avg ms');
  console.log('-'.repeat(80));
  for (const r of results) {
    console.log(
      `${r.endpoint.padEnd(30)} ${r.business.padEnd(10)} ${r.events_24h.toString().padStart(6)} ` +
      `${r.success_count.toString().padStart(7)} ${r.error_count.toString().padStart(7)} ` +
      `${r.avg_duration_ms.toString().padStart(7)}`
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1];
  const alertFlag = args.includes('--alert');

  console.log('Webhook Event Router - Health Check');
  console.log('====================================');
  console.log(`Time: ${new Date().toLocaleString()}`);

  let results = await getAllWebhookHealth();

  if (businessArg) {
    results = results.filter(r => r.business === businessArg);
  }

  printResults(results);

  // Alert mode
  if (alertFlag) {
    const critical = results.filter(r => r.status === 'down');
    const warnings = results.filter(r => r.status === 'degraded');

    if (critical.length > 0) {
      console.log('\n⚠️ ALERT: Critical webhook issues detected!');
      console.log(`${critical.length} endpoints are DOWN`);
      process.exit(1);
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ WARNING: Some webhooks are degraded');
      console.log(`${warnings.length} endpoints need attention`);
    }
  }

  // Overall health
  const overallHealthy = results.filter(r => r.status === 'healthy').length;
  const overallTotal = results.length;
  const overallRate = (overallHealthy / overallTotal * 100).toFixed(0);

  console.log('\n' + '='.repeat(80));
  console.log(`Overall Health: ${overallRate}% (${overallHealthy}/${overallTotal} endpoints healthy)`);

  if (overallHealthy < overallTotal) {
    console.log('\n💡 Recommendations:');
    for (const r of results.filter(r => r.status !== 'healthy')) {
      if (r.status === 'down') {
        console.log(`   • ${r.endpoint}: Check endpoint availability and authentication`);
      } else if (r.status === 'degraded') {
        console.log(`   • ${r.endpoint}: Monitor for continued degradation`);
      } else if (r.status === 'unknown') {
        console.log(`   • ${r.endpoint}: Verify webhook is registered and triggering`);
      }
    }
  }
}

main().catch(console.error);
