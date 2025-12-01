---
name: webhook-event-router
description: Central hub for all incoming webhooks and event processing across all businesses and platforms. Monitors Shopify, BigCommerce, WooCommerce, Smartlead, Klaviyo, HubSpot webhooks. Provides unified logging, failed event replay, health monitoring, and cross-business correlation. Use for webhook debugging, event replay, delivery monitoring, or troubleshooting integration failures.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Webhook Event Router Skill

Central command for all webhook and event processing across the master-ops ecosystem.

## When to Activate This Skill

Activate this skill when the user mentions:
- "webhook failed" or "webhook not firing"
- "event not received"
- "replay webhook" or "retry event"
- "check webhook health"
- "webhook logs" or "event logs"
- "integration sync failed"
- "shopify webhook" or "bigcommerce webhook"
- "n8n webhook" or "workflow not triggering"
- "missed events" or "lost webhooks"
- "correlation ID" or "trace event"

## Webhook Infrastructure Overview

### Platforms Sending Webhooks

| Platform | Business | Webhook Topics | Receiver |
|----------|----------|----------------|----------|
| Shopify | Teelixir | orders/*, customers/* | n8n workflows |
| Shopify | Elevate | orders/*, customers/* | Supabase Edge Functions |
| BigCommerce | BOO | checkout errors, orders | Supabase Edge Functions |
| HubSpot | Elevate | contact updates | Supabase Edge Functions |
| Smartlead | Teelixir | email events | n8n workflows |
| Klaviyo | Teelixir | engagement events | Direct sync |
| Google Forms | Elevate | form submissions | Supabase Edge Functions |

### Webhook Receivers

#### 1. Supabase Edge Functions
**Location**: Business-specific Supabase projects

| Function | Business | Purpose | Endpoint |
|----------|----------|---------|----------|
| checkout-error-collector | BOO | Checkout error tracking | POST /checkout-error-collector |
| form-intake | Elevate | Google Form to HubSpot | POST /form-intake |
| hubspot-to-shopify-sync | Elevate | Trial account creation | POST /hubspot-to-shopify-sync |
| shopify-to-unleashed-sync | Elevate | Order to Unleashed | POST /shopify-to-unleashed-sync |

#### 2. n8n Webhook Workflows
**Base URL**: `https://automation.growthcohq.com`

| Workflow | Path | Purpose |
|----------|------|---------|
| shopify-customer-sync | /webhook/shopify-customer-sync | Shopify → HubSpot customers |
| shopify-order-sync | /webhook/shopify-order-sync | Shopify → HubSpot orders |
| checkout-error-email | /webhook/checkout-error-email | Email notifications |
| smartlead-hubspot-sync | /webhook/smartlead-sync | Smartlead → HubSpot |

---

## Database Schema

### Primary Logging Tables

#### integration_logs (Master Supabase)
Universal log for all integration events.

```sql
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,        -- hubspot, unleashed, shopify, n8n, system
  service TEXT,                -- specific service (shopify-orders, unleashed-inventory)
  operation TEXT,              -- create, update, delete, sync, webhook
  level TEXT DEFAULT 'info',   -- debug, info, warn, error
  status TEXT DEFAULT 'info',  -- info, success, warning, error
  message TEXT NOT NULL,
  details_json JSONB,          -- structured payload
  duration_ms INTEGER,
  user_id TEXT,
  business_id TEXT,
  workflow_id TEXT,
  integration_id TEXT,
  correlation_id TEXT,         -- for tracing across services
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_logs_source ON integration_logs(source);
CREATE INDEX idx_integration_logs_status ON integration_logs(status);
CREATE INDEX idx_integration_logs_correlation ON integration_logs(correlation_id);
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at DESC);
```

#### workflow_execution_logs (Master Supabase)
n8n workflow execution tracking.

```sql
CREATE TABLE workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT,
  workflow_name TEXT NOT NULL,
  execution_id TEXT,
  status TEXT NOT NULL,        -- running, success, error, waiting, cancelled
  mode TEXT,                   -- manual, trigger, webhook, cli, retry
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000
  ) STORED,
  data_json JSONB,
  error_details_json JSONB,
  nodes_executed INTEGER,
  nodes_failed INTEGER,
  business_id TEXT,
  triggered_by TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### checkout_error_logs (BOO Supabase)
BigCommerce checkout error events.

```sql
CREATE TABLE checkout_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT,             -- add_to_cart, shipping_address, payment, validation
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,
  cart_id TEXT,
  checkout_id TEXT,
  order_id TEXT,
  customer_id TEXT,
  customer_email TEXT,
  shipping_address JSONB,
  products JSONB,
  cart_value NUMERIC,
  user_agent TEXT,
  ip_address TEXT,
  session_id TEXT,
  referrer TEXT,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  correlation_id TEXT,
  metadata JSONB
);
```

#### integration_sync_log (Elevate Supabase)
Detailed sync operation tracking.

```sql
CREATE TABLE integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES trial_customers(id),
  integration TEXT NOT NULL,   -- hubspot, shopify, unleashed, gmail
  operation TEXT NOT NULL,     -- create, update, delete, sync
  endpoint TEXT,
  http_method TEXT,
  request_payload JSONB,
  response_payload JSONB,
  response_status_code INTEGER,
  status TEXT NOT NULL,        -- pending, success, failed, retrying
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  function_name TEXT,
  correlation_id TEXT
);
```

#### customer_activity_log (Elevate Supabase)
Customer-centric event tracking.

```sql
CREATE TABLE customer_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES trial_customers(id),
  event_type TEXT NOT NULL,    -- account_created, login, order_placed, email_sent
  event_description TEXT,
  event_data JSONB,
  source TEXT,                 -- shopify_webhook, hubspot_webhook, manual
  ip_address INET,
  user_agent TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Core Capabilities

### 1. Webhook Health Monitoring

Monitor all webhook endpoints and delivery status.

```typescript
// scripts/webhook-health-check.ts
interface WebhookHealth {
  endpoint: string;
  business: string;
  last_received: Date;
  success_rate_24h: number;
  avg_response_time_ms: number;
  errors_24h: number;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
}

async function checkWebhookHealth(): Promise<WebhookHealth[]> {
  const endpoints = [
    { endpoint: 'checkout-error-collector', business: 'boo', table: 'checkout_error_logs' },
    { endpoint: 'form-intake', business: 'elevate', table: 'integration_sync_log' },
    { endpoint: 'shopify-customer-sync', business: 'teelixir', table: 'workflow_execution_logs' },
    { endpoint: 'shopify-order-sync', business: 'teelixir', table: 'workflow_execution_logs' }
  ];

  const results: WebhookHealth[] = [];

  for (const ep of endpoints) {
    // Query relevant table for last 24h
    const stats = await getEndpointStats(ep);
    results.push({
      endpoint: ep.endpoint,
      business: ep.business,
      last_received: stats.lastReceived,
      success_rate_24h: stats.successRate,
      avg_response_time_ms: stats.avgResponseTime,
      errors_24h: stats.errorCount,
      status: calculateStatus(stats)
    });
  }

  return results;
}
```

### 2. Event Replay

Replay failed or missed events.

```typescript
// scripts/replay-events.ts
interface ReplayOptions {
  source: string;
  from_date: Date;
  to_date?: Date;
  status_filter?: string[];
  dry_run?: boolean;
}

async function replayFailedEvents(options: ReplayOptions): Promise<ReplayResult> {
  // Get failed events from logs
  const { data: failedEvents } = await supabase
    .from('integration_sync_log')
    .select('*')
    .eq('status', 'failed')
    .gte('created_at', options.from_date.toISOString())
    .order('created_at', { ascending: true });

  const results = {
    total: failedEvents?.length || 0,
    replayed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0
  };

  for (const event of failedEvents || []) {
    if (options.dry_run) {
      console.log(`Would replay: ${event.id} - ${event.integration}/${event.operation}`);
      results.skipped++;
      continue;
    }

    try {
      // Re-invoke the original function with stored payload
      await replayEvent(event);
      results.succeeded++;
    } catch (error) {
      results.failed++;
    }
    results.replayed++;
  }

  return results;
}
```

### 3. Correlation Tracing

Trace events across systems using correlation IDs.

```typescript
// scripts/trace-event.ts
async function traceCorrelation(correlationId: string): Promise<EventTrace> {
  const trace: EventTrace = {
    correlationId,
    events: []
  };

  // Check all log tables
  const tables = [
    { db: 'master', table: 'integration_logs' },
    { db: 'master', table: 'workflow_execution_logs' },
    { db: 'boo', table: 'checkout_error_logs' },
    { db: 'elevate', table: 'integration_sync_log' },
    { db: 'elevate', table: 'customer_activity_log' }
  ];

  for (const t of tables) {
    const client = t.db === 'master' ? masterSupabase :
                   t.db === 'boo' ? booSupabase : elevateSupabase;

    const { data } = await client
      .from(t.table)
      .select('*')
      .eq('correlation_id', correlationId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      trace.events.push(...data.map(e => ({
        ...e,
        source_table: t.table,
        source_db: t.db
      })));
    }
  }

  // Sort all events chronologically
  trace.events.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return trace;
}
```

### 4. Webhook Registration Management

Manage Shopify webhook registrations.

```bash
# Register webhooks
npx tsx scripts/register-shopify-webhooks.ts

# List current webhooks
npx tsx scripts/register-shopify-webhooks.ts --list

# Delete webhooks
npx tsx scripts/register-shopify-webhooks.ts --delete

# Dry run
npx tsx scripts/register-shopify-webhooks.ts --dry-run
```

### 5. Alert Routing

Route events to appropriate notification channels.

```typescript
// Existing: .claude/skills/supabase-expert/scripts/alert-router.ts

const routingRules = {
  info: ['slack'],
  warning: ['slack', 'email'],
  critical: ['slack', 'email', 'pagerduty']
};

// Channels
const channels = {
  slack: process.env.SLACK_WEBHOOK_URL,
  email: 'jayson@fyic.com.au',
  pagerduty: process.env.PAGERDUTY_API_KEY
};
```

---

## Scripts

### webhook-health-check.ts
Monitor all webhook endpoints.

```bash
# Check all endpoints
npx tsx .claude/skills/webhook-event-router/scripts/webhook-health-check.ts

# Specific business
npx tsx .claude/skills/webhook-event-router/scripts/webhook-health-check.ts --business elevate

# Alert on unhealthy
npx tsx .claude/skills/webhook-event-router/scripts/webhook-health-check.ts --alert
```

### trace-event.ts
Trace events by correlation ID.

```bash
# Trace specific correlation ID
npx tsx .claude/skills/webhook-event-router/scripts/trace-event.ts --id "form-1701405600000-abc123"

# Trace by customer email
npx tsx .claude/skills/webhook-event-router/scripts/trace-event.ts --email "customer@example.com"
```

### replay-events.ts
Replay failed events.

```bash
# Replay failed events from last 24h
npx tsx .claude/skills/webhook-event-router/scripts/replay-events.ts --hours 24

# Dry run
npx tsx .claude/skills/webhook-event-router/scripts/replay-events.ts --hours 24 --dry-run

# Specific integration
npx tsx .claude/skills/webhook-event-router/scripts/replay-events.ts --integration hubspot --hours 48
```

### event-summary.ts
Generate event activity summary.

```bash
# Daily summary
npx tsx .claude/skills/webhook-event-router/scripts/event-summary.ts

# Specific date range
npx tsx .claude/skills/webhook-event-router/scripts/event-summary.ts --from 2025-11-25 --to 2025-12-01
```

---

## Existing Infrastructure

### Supabase Edge Functions

**BOO - Checkout Error Collector**
```
Location: buy-organics-online/supabase/functions/checkout-error-collector/index.ts
Endpoint: POST /checkout-error-collector
Features:
- HMAC webhook secret validation
- Multiple email providers (n8n, Gmail, Resend, SendGrid)
- Correlation ID tracking
```

**Elevate - Form Intake**
```
Location: elevate-wholesale/supabase/functions/form-intake/index.ts
Endpoint: POST /form-intake
Features:
- Google Form → HubSpot contact/company
- Trial workflow enrollment
- Comprehensive activity logging
```

**Elevate - HubSpot to Shopify Sync**
```
Location: elevate-wholesale/supabase/functions/hubspot-to-shopify-sync/index.ts
Triggers: HubSpot contact lifecycle updates
Features:
- Shopify B2B company creation (GraphQL)
- Discount code generation
- Integration sync logging
```

**Elevate - Shopify to Unleashed Sync**
```
Location: elevate-wholesale/supabase/functions/shopify-to-unleashed-sync/index.ts
Triggers: Shopify orders/create webhook
Features:
- HMAC verification
- Bundle expansion
- Unleashed sales order creation
```

### n8n Workflow Templates

**Location**: `infra/n8n-workflows/templates/`

| Template | File | Purpose |
|----------|------|---------|
| Shopify Customer Sync | shopify-customer-sync.json | Shopify → HubSpot |
| Shopify Order Sync | shopify-order-sync.json | Order tracking |
| Checkout Error Email | checkout-error-email-sender.json | Alert emails |
| Error Monitoring | error-monitoring-workflow.json | 15-min error checks |
| Daily Summary | daily-summary-workflow.json | Business reports |

### Webhook Registration

**Location**: `scripts/register-shopify-webhooks.ts`

**Registered Webhooks**:
- `customers/create` → shopify-customer-sync
- `customers/update` → shopify-customer-sync
- `orders/create` → shopify-order-sync
- `orders/updated` → shopify-order-sync

---

## Correlation ID Format

All webhooks use correlation IDs for tracing:

| Prefix | Source | Format |
|--------|--------|--------|
| `err-` | Checkout errors | `err-{timestamp}-{random}` |
| `form-` | Google Forms | `form-{timestamp}-{random}` |
| `hubspot-shopify-` | HubSpot sync | `hubspot-shopify-{timestamp}-{random}` |
| `shopify-unleashed-` | Order sync | `shopify-unleashed-{orderId}-{timestamp}` |
| `wf-` | n8n workflows | `wf-{workflowId}-{executionId}` |

---

## Environment Variables

```bash
# Master Supabase
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# BOO Supabase
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=

# Elevate Supabase
ELEVATE_SUPABASE_URL=
ELEVATE_SUPABASE_SERVICE_ROLE_KEY=

# n8n
N8N_BASE_URL=https://automation.growthcohq.com
N8N_API_KEY=

# Shopify (for webhook registration)
TEELIXIR_SHOPIFY_DOMAIN=teelixir.myshopify.com
TEELIXIR_SHOPIFY_ACCESS_TOKEN=

# Alerting
SLACK_WEBHOOK_URL=
```

---

## SQL Queries

### Recent Webhook Activity

```sql
-- Integration logs last 24h
SELECT
  source,
  status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, status
ORDER BY count DESC;
```

### Failed Events

```sql
-- Failed sync operations
SELECT *
FROM integration_sync_log
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;
```

### Workflow Executions

```sql
-- Recent workflow failures
SELECT
  workflow_name,
  status,
  error_details_json->>'message' as error,
  started_at,
  duration_ms
FROM workflow_execution_logs
WHERE status = 'error'
  AND started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;
```

### Checkout Errors

```sql
-- Unresolved checkout errors
SELECT
  error_type,
  COUNT(*) as count,
  MAX(occurred_at) as latest
FROM checkout_error_logs
WHERE resolved = FALSE
  AND occurred_at > NOW() - INTERVAL '7 days'
GROUP BY error_type
ORDER BY count DESC;
```

---

## Alert Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| No webhooks in 4 hours | Warning | Slack alert |
| >10 failed events/hour | Warning | Slack + email |
| Endpoint down | Critical | All channels |
| >50% failure rate | Critical | All channels |
| Checkout errors >20/day | Warning | Email alert |

---

## Troubleshooting Playbook

### Webhook Not Triggering

1. **Check source platform**
   - Verify webhook is registered
   - Check payload format
   - Confirm endpoint URL is correct

2. **Check receiver**
   - n8n: Is workflow active? Check execution history
   - Edge Function: Check Supabase function logs
   - Verify authentication (HMAC secret, API keys)

3. **Check logs**
   ```sql
   SELECT * FROM integration_logs
   WHERE source = 'shopify'
     AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

### Failed Event Replay

1. **Identify failed events**
   ```sql
   SELECT * FROM integration_sync_log
   WHERE status = 'failed'
     AND retry_count < 3
   ORDER BY created_at DESC;
   ```

2. **Check error details**
   - Request/response payloads
   - HTTP status codes
   - Error messages

3. **Fix root cause before replay**
   - Credential issues?
   - Rate limiting?
   - Data validation?

4. **Replay with retry**
   ```bash
   npx tsx .claude/skills/webhook-event-router/scripts/replay-events.ts --id <event_id>
   ```

### Missing Correlation ID

If events can't be traced:
1. Check if correlation ID was generated
2. Verify it's passed through all services
3. Search by timestamp + customer email instead

---

## Integration with Other Skills

### dashboard-automation
- Webhook health feeds into dashboard
- Alert generation for failures

### integration-tester
- Use for testing webhook endpoints
- Validate authentication

### supabase-expert
- Log table management
- Query optimization

### email-campaign-manager
- Smartlead webhooks
- Klaviyo event handling

---

## Success Criteria

A successful webhook management session should:
- Achieve >95% webhook delivery success rate
- Detect failures within 15 minutes
- Enable replay of any failed event
- Provide complete event tracing via correlation ID
- Maintain clear audit trail for compliance
- Alert on critical issues immediately
