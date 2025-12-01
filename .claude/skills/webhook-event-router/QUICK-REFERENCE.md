# Webhook Event Router - Quick Reference

## Quick Commands

```bash
# Health check all webhooks
npx tsx .claude/skills/webhook-event-router/scripts/webhook-health-check.ts

# Health check with alerts
npx tsx .claude/skills/webhook-event-router/scripts/webhook-health-check.ts --alert

# Trace by correlation ID
npx tsx .claude/skills/webhook-event-router/scripts/trace-event.ts --id="form-1701405600000-abc"

# Trace by customer email
npx tsx .claude/skills/webhook-event-router/scripts/trace-event.ts --email="customer@example.com"

# Replay failed events (dry run)
npx tsx .claude/skills/webhook-event-router/scripts/replay-events.ts --hours=24 --dry-run

# Replay failed events (live)
npx tsx .claude/skills/webhook-event-router/scripts/replay-events.ts --hours=24

# Event summary (last 24h)
npx tsx .claude/skills/webhook-event-router/scripts/event-summary.ts

# Event summary (date range)
npx tsx .claude/skills/webhook-event-router/scripts/event-summary.ts --from=2025-11-25 --to=2025-12-01
```

## Shopify Webhook Management

```bash
# Register webhooks
npx tsx scripts/register-shopify-webhooks.ts

# List current webhooks
npx tsx scripts/register-shopify-webhooks.ts --list

# Delete webhooks
npx tsx scripts/register-shopify-webhooks.ts --delete
```

## Key SQL Queries

```sql
-- Recent integration events
SELECT source, status, COUNT(*)
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, status;

-- Failed events for replay
SELECT * FROM integration_logs
WHERE status = 'error'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Trace by correlation ID
SELECT * FROM integration_logs
WHERE correlation_id = 'your-correlation-id'
ORDER BY created_at;

-- Workflow failures
SELECT workflow_name, status, error_details_json
FROM workflow_execution_logs
WHERE status = 'error'
  AND started_at > NOW() - INTERVAL '24 hours';

-- Unresolved checkout errors
SELECT error_type, COUNT(*)
FROM checkout_error_logs
WHERE resolved = FALSE
GROUP BY error_type;
```

## Webhook Endpoints

| Endpoint | Business | Location |
|----------|----------|----------|
| checkout-error-collector | BOO | Supabase Edge Function |
| form-intake | Elevate | Supabase Edge Function |
| hubspot-to-shopify-sync | Elevate | Supabase Edge Function |
| shopify-to-unleashed-sync | Elevate | Supabase Edge Function |
| shopify-customer-sync | Teelixir | n8n workflow |
| shopify-order-sync | Teelixir | n8n workflow |

## Correlation ID Prefixes

| Prefix | Source |
|--------|--------|
| `err-` | Checkout errors |
| `form-` | Google Forms |
| `hubspot-shopify-` | HubSpot sync |
| `shopify-unleashed-` | Order sync |
| `wf-` | n8n workflows |

## Alert Thresholds

| Condition | Severity |
|-----------|----------|
| No webhooks 4h | Warning |
| >10 failed/hour | Warning |
| Endpoint down | Critical |
| >50% failure rate | Critical |

## Key Tables

| Table | Database | Purpose |
|-------|----------|---------|
| integration_logs | Master | Universal event log |
| workflow_execution_logs | Master | n8n executions |
| api_metrics | Master | API call tracking |
| checkout_error_logs | BOO | Checkout errors |
| integration_sync_log | Elevate | Sync operations |
| customer_activity_log | Elevate | Customer events |
