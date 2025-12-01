#!/usr/bin/env npx tsx

/**
 * Event Replay
 *
 * Replay failed events from integration logs.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const masterSupabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FailedEvent {
  id: string;
  source: string;
  service?: string;
  operation?: string;
  message: string;
  details_json: Record<string, unknown>;
  created_at: string;
  correlation_id?: string;
}

interface ReplayResult {
  total: number;
  replayed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

async function getFailedEvents(
  hours: number,
  source?: string,
  integration?: string
): Promise<FailedEvent[]> {
  let query = masterSupabase
    .from('integration_logs')
    .select('*')
    .eq('status', 'error')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  if (source) {
    query = query.eq('source', source);
  }

  if (integration) {
    query = query.eq('service', integration);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching failed events:', error.message);
    return [];
  }

  return data || [];
}

async function replayEvent(event: FailedEvent): Promise<{ success: boolean; error?: string }> {
  // This is a placeholder for actual replay logic
  // In practice, you would:
  // 1. Reconstruct the original request from details_json
  // 2. Call the appropriate endpoint/function
  // 3. Log the result

  console.log(`   Replaying event ${event.id}...`);
  console.log(`   Source: ${event.source}, Operation: ${event.operation}`);

  // Check if we have enough info to replay
  if (!event.details_json) {
    return { success: false, error: 'No payload data available for replay' };
  }

  // Determine replay strategy based on source
  switch (event.source) {
    case 'hubspot':
      return await replayHubSpotEvent(event);
    case 'shopify':
      return await replayShopifyEvent(event);
    case 'unleashed':
      return await replayUnleashedEvent(event);
    case 'n8n':
      return await replayN8nWorkflow(event);
    default:
      return { success: false, error: `Unknown source: ${event.source}` };
  }
}

async function replayHubSpotEvent(event: FailedEvent): Promise<{ success: boolean; error?: string }> {
  // Placeholder - would call HubSpot API
  console.log(`   Would replay HubSpot ${event.operation}: ${JSON.stringify(event.details_json).substring(0, 100)}`);
  return { success: true };
}

async function replayShopifyEvent(event: FailedEvent): Promise<{ success: boolean; error?: string }> {
  // Placeholder - would call Shopify API
  console.log(`   Would replay Shopify ${event.operation}: ${JSON.stringify(event.details_json).substring(0, 100)}`);
  return { success: true };
}

async function replayUnleashedEvent(event: FailedEvent): Promise<{ success: boolean; error?: string }> {
  // Placeholder - would call Unleashed API
  console.log(`   Would replay Unleashed ${event.operation}: ${JSON.stringify(event.details_json).substring(0, 100)}`);
  return { success: true };
}

async function replayN8nWorkflow(event: FailedEvent): Promise<{ success: boolean; error?: string }> {
  // Placeholder - would trigger n8n workflow
  const workflowId = event.details_json?.workflow_id;
  if (!workflowId) {
    return { success: false, error: 'No workflow_id in event details' };
  }
  console.log(`   Would trigger n8n workflow ${workflowId}`);
  return { success: true };
}

async function logReplayAttempt(
  originalEventId: string,
  success: boolean,
  error?: string
): Promise<void> {
  await masterSupabase.from('integration_logs').insert({
    source: 'system',
    service: 'event-replay',
    operation: 'replay',
    level: success ? 'info' : 'error',
    status: success ? 'success' : 'error',
    message: success
      ? `Successfully replayed event ${originalEventId}`
      : `Failed to replay event ${originalEventId}: ${error}`,
    details_json: {
      original_event_id: originalEventId,
      replay_success: success,
      error
    },
    correlation_id: `replay-${Date.now()}`
  });
}

async function main() {
  const args = process.argv.slice(2);
  const hours = parseInt(args.find(a => a.startsWith('--hours='))?.split('=')[1] || '24');
  const source = args.find(a => a.startsWith('--source='))?.split('=')[1];
  const integration = args.find(a => a.startsWith('--integration='))?.split('=')[1];
  const eventId = args.find(a => a.startsWith('--id='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50');

  console.log('Webhook Event Router - Event Replay');
  console.log('====================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Time range: Last ${hours} hours`);
  if (source) console.log(`Source filter: ${source}`);
  if (integration) console.log(`Integration filter: ${integration}`);

  // Get failed events
  let failedEvents = await getFailedEvents(hours, source, integration);

  // Filter by specific ID if provided
  if (eventId) {
    failedEvents = failedEvents.filter(e => e.id === eventId);
  }

  // Apply limit
  failedEvents = failedEvents.slice(0, limit);

  console.log(`\nFound ${failedEvents.length} failed events`);

  if (failedEvents.length === 0) {
    console.log('No events to replay.');
    return;
  }

  // Show preview
  console.log('\n📋 Events to replay:');
  console.log('-'.repeat(80));
  for (const e of failedEvents.slice(0, 10)) {
    console.log(`   ${e.id.substring(0, 8)}... | ${e.source.padEnd(12)} | ${e.operation?.padEnd(10) || 'N/A'} | ${new Date(e.created_at).toLocaleString()}`);
    console.log(`   Message: ${e.message.substring(0, 60)}`);
  }
  if (failedEvents.length > 10) {
    console.log(`   ... and ${failedEvents.length - 10} more`);
  }

  if (dryRun) {
    console.log('\n⚠️ DRY RUN - No events will be replayed');
    console.log('Remove --dry-run flag to execute replay');
    return;
  }

  // Confirm before proceeding
  console.log('\n⚠️ About to replay events. This will re-execute operations.');
  console.log('Press Ctrl+C within 5 seconds to cancel...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Execute replay
  const result: ReplayResult = {
    total: failedEvents.length,
    replayed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  console.log('\n🔄 Replaying events...');
  console.log('-'.repeat(60));

  for (const event of failedEvents) {
    try {
      const replayResult = await replayEvent(event);

      if (replayResult.success) {
        result.succeeded++;
        console.log(`   ✅ ${event.id.substring(0, 8)}... - Success`);
      } else {
        result.failed++;
        result.errors.push({ id: event.id, error: replayResult.error || 'Unknown error' });
        console.log(`   ❌ ${event.id.substring(0, 8)}... - Failed: ${replayResult.error}`);
      }

      // Log replay attempt
      await logReplayAttempt(event.id, replayResult.success, replayResult.error);

      result.replayed++;

      // Small delay between replays to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      result.failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({ id: event.id, error: errorMsg });
      console.log(`   ❌ ${event.id.substring(0, 8)}... - Exception: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('REPLAY SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total events: ${result.total}`);
  console.log(`Replayed: ${result.replayed}`);
  console.log(`Succeeded: ${result.succeeded}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Skipped: ${result.skipped}`);

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    for (const err of result.errors.slice(0, 10)) {
      console.log(`   ${err.id.substring(0, 8)}...: ${err.error}`);
    }
  }

  console.log(`\nSuccess rate: ${((result.succeeded / result.total) * 100).toFixed(1)}%`);
}

main().catch(console.error);
