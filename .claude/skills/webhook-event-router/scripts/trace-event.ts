#!/usr/bin/env npx tsx

/**
 * Event Tracer
 *
 * Trace events across systems using correlation ID or other identifiers.
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

interface TraceEvent {
  timestamp: string;
  source_db: string;
  source_table: string;
  source: string;
  status: string;
  message: string;
  duration_ms?: number;
  details?: Record<string, unknown>;
}

interface EventTrace {
  correlationId?: string;
  searchCriteria: string;
  events: TraceEvent[];
  timeline: string[];
  summary: {
    total_events: number;
    first_event: string;
    last_event: string;
    duration_total_ms: number;
    statuses: Record<string, number>;
  };
}

async function searchIntegrationLogs(
  correlationId?: string,
  email?: string,
  hours: number = 24
): Promise<TraceEvent[]> {
  let query = masterSupabase
    .from('integration_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  if (correlationId) {
    query = query.eq('correlation_id', correlationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error querying integration_logs:', error.message);
    return [];
  }

  // If searching by email, filter in memory
  let results = data || [];
  if (email && !correlationId) {
    results = results.filter(r =>
      JSON.stringify(r.details_json || {}).toLowerCase().includes(email.toLowerCase())
    );
  }

  return results.map(r => ({
    timestamp: r.created_at,
    source_db: 'master',
    source_table: 'integration_logs',
    source: r.source,
    status: r.status,
    message: r.message,
    duration_ms: r.duration_ms,
    details: r.details_json
  }));
}

async function searchWorkflowLogs(
  correlationId?: string,
  hours: number = 24
): Promise<TraceEvent[]> {
  let query = masterSupabase
    .from('workflow_execution_logs')
    .select('*')
    .gte('started_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order('started_at', { ascending: true });

  if (correlationId) {
    query = query.eq('correlation_id', correlationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error querying workflow_execution_logs:', error.message);
    return [];
  }

  return (data || []).map(r => ({
    timestamp: r.started_at,
    source_db: 'master',
    source_table: 'workflow_execution_logs',
    source: `n8n:${r.workflow_name}`,
    status: r.status,
    message: `Workflow ${r.workflow_name} - ${r.mode}`,
    duration_ms: r.duration_ms,
    details: {
      execution_id: r.execution_id,
      nodes_executed: r.nodes_executed,
      nodes_failed: r.nodes_failed,
      error: r.error_details_json
    }
  }));
}

async function searchCheckoutErrors(
  correlationId?: string,
  email?: string,
  hours: number = 24
): Promise<TraceEvent[]> {
  let query = booSupabase
    .from('checkout_error_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  if (correlationId) {
    query = query.eq('correlation_id', correlationId);
  }

  if (email) {
    query = query.eq('customer_email', email);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error querying checkout_error_logs:', error.message);
    return [];
  }

  return (data || []).map(r => ({
    timestamp: r.created_at,
    source_db: 'boo',
    source_table: 'checkout_error_logs',
    source: 'bigcommerce:checkout',
    status: r.resolved ? 'resolved' : 'error',
    message: `${r.error_type}: ${r.error_message}`,
    details: {
      cart_id: r.cart_id,
      checkout_id: r.checkout_id,
      customer_email: r.customer_email,
      cart_value: r.cart_value,
      products: r.products
    }
  }));
}

async function searchApiMetrics(
  hours: number = 24
): Promise<TraceEvent[]> {
  const { data, error } = await masterSupabase
    .from('api_metrics')
    .select('*')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .eq('success', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error querying api_metrics:', error.message);
    return [];
  }

  return (data || []).map(r => ({
    timestamp: r.created_at,
    source_db: 'master',
    source_table: 'api_metrics',
    source: `api:${r.service}`,
    status: 'error',
    message: `${r.method} ${r.endpoint} - ${r.status_code}: ${r.error_message}`,
    duration_ms: r.duration_ms,
    details: {
      service: r.service,
      endpoint: r.endpoint,
      status_code: r.status_code,
      error_category: r.error_category
    }
  }));
}

async function traceEvents(
  correlationId?: string,
  email?: string,
  hours: number = 24
): Promise<EventTrace> {
  const searchCriteria = correlationId
    ? `Correlation ID: ${correlationId}`
    : email
    ? `Email: ${email}`
    : 'All events';

  console.log(`\nSearching for events: ${searchCriteria}`);
  console.log(`Time range: Last ${hours} hours`);
  console.log('='.repeat(60));

  // Search all log tables
  const allEvents: TraceEvent[] = [];

  console.log('Searching integration_logs...');
  allEvents.push(...await searchIntegrationLogs(correlationId, email, hours));

  console.log('Searching workflow_execution_logs...');
  allEvents.push(...await searchWorkflowLogs(correlationId, hours));

  console.log('Searching checkout_error_logs...');
  allEvents.push(...await searchCheckoutErrors(correlationId, email, hours));

  if (!correlationId && !email) {
    console.log('Searching api_metrics (errors only)...');
    allEvents.push(...await searchApiMetrics(hours));
  }

  // Sort chronologically
  allEvents.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Generate timeline
  const timeline = allEvents.map(e => {
    const time = new Date(e.timestamp).toLocaleTimeString();
    const statusEmoji = e.status === 'success' ? '✅' :
                        e.status === 'error' ? '❌' :
                        e.status === 'resolved' ? '✔️' : '⏳';
    return `${time} ${statusEmoji} [${e.source}] ${e.message.substring(0, 60)}`;
  });

  // Calculate summary
  const statuses: Record<string, number> = {};
  let totalDuration = 0;
  for (const e of allEvents) {
    statuses[e.status] = (statuses[e.status] || 0) + 1;
    totalDuration += e.duration_ms || 0;
  }

  return {
    correlationId,
    searchCriteria,
    events: allEvents,
    timeline,
    summary: {
      total_events: allEvents.length,
      first_event: allEvents.length > 0 ? allEvents[0].timestamp : 'N/A',
      last_event: allEvents.length > 0 ? allEvents[allEvents.length - 1].timestamp : 'N/A',
      duration_total_ms: totalDuration,
      statuses
    }
  };
}

function printTrace(trace: EventTrace): void {
  console.log('\n' + '='.repeat(60));
  console.log('EVENT TRACE');
  console.log('='.repeat(60));

  console.log(`\nSearch Criteria: ${trace.searchCriteria}`);
  console.log(`Total Events: ${trace.summary.total_events}`);

  if (trace.summary.total_events === 0) {
    console.log('\n⚠️ No events found matching criteria');
    return;
  }

  console.log(`First Event: ${new Date(trace.summary.first_event).toLocaleString()}`);
  console.log(`Last Event: ${new Date(trace.summary.last_event).toLocaleString()}`);
  console.log(`Total Duration: ${trace.summary.duration_total_ms}ms`);

  console.log('\nStatus Breakdown:');
  for (const [status, count] of Object.entries(trace.summary.statuses)) {
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
    console.log(`   ${emoji} ${status}: ${count}`);
  }

  console.log('\n📜 TIMELINE');
  console.log('-'.repeat(60));
  for (const line of trace.timeline) {
    console.log(line);
  }

  // Show errors in detail
  const errors = trace.events.filter(e => e.status === 'error');
  if (errors.length > 0) {
    console.log('\n❌ ERROR DETAILS');
    console.log('-'.repeat(60));
    for (const e of errors) {
      console.log(`\n[${new Date(e.timestamp).toLocaleString()}] ${e.source}`);
      console.log(`   Message: ${e.message}`);
      if (e.details) {
        console.log(`   Details: ${JSON.stringify(e.details, null, 2).substring(0, 200)}`);
      }
    }
  }

  // Data flow visualization
  console.log('\n📊 DATA FLOW');
  console.log('-'.repeat(60));
  const sources = [...new Set(trace.events.map(e => e.source))];
  const tables = [...new Set(trace.events.map(e => e.source_table))];
  console.log(`Sources involved: ${sources.join(' → ')}`);
  console.log(`Tables touched: ${tables.join(', ')}`);
}

async function main() {
  const args = process.argv.slice(2);
  const correlationId = args.find(a => a.startsWith('--id='))?.split('=')[1];
  const email = args.find(a => a.startsWith('--email='))?.split('=')[1];
  const hours = parseInt(args.find(a => a.startsWith('--hours='))?.split('=')[1] || '24');
  const verbose = args.includes('--verbose');

  console.log('Webhook Event Router - Event Tracer');
  console.log('====================================');

  if (!correlationId && !email) {
    console.log('\nUsage:');
    console.log('  --id=<correlation_id>  Trace by correlation ID');
    console.log('  --email=<email>        Trace by customer email');
    console.log('  --hours=<n>            Search last N hours (default: 24)');
    console.log('  --verbose              Show full event details');
    console.log('\nExample:');
    console.log('  npx tsx trace-event.ts --id=form-1701405600000-abc123');
    console.log('  npx tsx trace-event.ts --email=customer@example.com --hours=48');

    // Show recent correlation IDs as examples
    console.log('\nRecent correlation IDs:');
    const { data: recent } = await masterSupabase
      .from('integration_logs')
      .select('correlation_id, source, created_at')
      .not('correlation_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    for (const r of recent || []) {
      console.log(`   ${r.correlation_id} (${r.source}, ${new Date(r.created_at).toLocaleString()})`);
    }
    return;
  }

  const trace = await traceEvents(correlationId, email, hours);
  printTrace(trace);

  if (verbose && trace.events.length > 0) {
    console.log('\n📋 FULL EVENT DATA');
    console.log('-'.repeat(60));
    for (const e of trace.events) {
      console.log(JSON.stringify(e, null, 2));
      console.log('-'.repeat(40));
    }
  }
}

main().catch(console.error);
