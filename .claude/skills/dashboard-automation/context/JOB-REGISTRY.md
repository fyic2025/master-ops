# Job Registry

Complete registry of all automated jobs tracked by the dashboard.

## Jobs by Business

### Buy Organics Online (BOO)

| Job Name | Type | Frequency | Description |
|----------|------|-----------|-------------|
| boo-stock-sync | cron | Every 12h | Sync supplier stock levels |
| boo-gmc-sync | cron | Daily | Google Merchant Center sync |
| boo-gsc-sync | cron | Daily | Google Search Console data |
| boo-bc-product-sync | n8n | Every 6h | BigCommerce product sync |
| boo-product-linking | cron | Daily | Link products to suppliers |
| boo-checkout-collector | edge_function | Continuous | Collect checkout errors |
| boo-livechat-sync | n8n | Every 2h | Sync LiveChat conversations |
| boo-redirect-generator | script | On-demand | Generate 404 redirects |
| boo-price-check | cron | Daily | Check RRP vs actual prices |

### Teelixir

| Job Name | Type | Frequency | Description |
|----------|------|-----------|-------------|
| tlx-anniversary-email | cron | Daily 9am | Anniversary email campaign |
| tlx-winback-email | cron | Daily 10am | Win-back email campaign |
| tlx-klaviyo-sync | cron | Daily | Sync customers to Klaviyo |
| tlx-order-sync | n8n | Every 2h | Shopify order sync |
| tlx-unengaged-pool | cron | Weekly | Refresh unengaged customer pool |
| tlx-product-sync | n8n | Daily | Product data sync |

### Elevate Wholesale

| Job Name | Type | Frequency | Description |
|----------|------|-----------|-------------|
| elevate-trial-processor | n8n | Daily | Process trial orders |
| elevate-prospecting | n8n | Daily | Process prospects |
| elevate-hubspot-sync | n8n | Every 6h | HubSpot CRM sync |
| elevate-order-sync | n8n | Every 2h | Shopify order sync |
| elevate-customer-tagger | n8n | Daily | Tag customers by behavior |

### Red Hill Fresh (RHF)

| Job Name | Type | Frequency | Description |
|----------|------|-----------|-------------|
| rhf-order-sync | n8n | Every 2h | WooCommerce order sync |
| rhf-product-sync | n8n | Daily | Product data sync |
| rhf-delivery-scheduler | script | Daily | Schedule deliveries |
| rhf-route-optimizer | script | Daily | Optimize delivery routes |

### Infrastructure

| Job Name | Type | Frequency | Description |
|----------|------|-----------|-------------|
| dashboard-job-sync | cron | Every 2h | Sync job statuses |
| dashboard-metrics | cron | Daily 6am | Populate daily metrics |
| dashboard-report | cron | Daily 7am | Generate daily report |
| health-checker | edge_function | Every 5m | Integration health checks |
| alert-processor | edge_function | Continuous | Process and route alerts |
| log-cleanup | cron | Weekly | Clean old logs |
| backup-verify | cron | Daily | Verify database backups |

---

## Job Types

### cron
Scheduled tasks running on fixed intervals.
- **Source**: Usually local scripts or server-side
- **Tracking**: automation_logs table in BOO Supabase
- **Status Detection**: Check last run time against expected frequency

### n8n
n8n workflow automations.
- **Source**: n8n API executions endpoint
- **Tracking**: n8n execution history + dashboard sync
- **Status Detection**: Query n8n API for recent executions

### edge_function
Supabase Edge Functions.
- **Source**: Supabase Edge Function logs
- **Tracking**: Invocation logs in Supabase
- **Status Detection**: Check for recent invocations and error rates

### script
Manual or on-demand scripts.
- **Source**: CLI execution
- **Tracking**: automation_logs when run
- **Status Detection**: May show as "unknown" when not recently run

---

## Status Definitions

| Status | Color | Meaning |
|--------|-------|---------|
| healthy | Green | Running as expected, no errors |
| stale | Yellow | Overdue based on expected frequency |
| failed | Red | Last run resulted in error |
| unknown | Gray | No recent data or new job |

### Stale Thresholds

| Frequency | Grace Period | Stale After |
|-----------|--------------|-------------|
| every_2h | +1 hour | 3 hours |
| every_6h | +2 hours | 8 hours |
| daily | +2 hours | 26 hours |
| weekly | +1 day | 8 days |

---

## Job Configuration Template

```sql
INSERT INTO dashboard_job_status (
  job_name,
  job_type,
  business,
  description,
  expected_frequency,
  enabled,
  metadata
) VALUES (
  'new-job-name',
  'cron',              -- 'cron', 'n8n', 'edge_function', 'script'
  'boo',               -- 'boo', 'teelixir', 'elevate', 'rhf', 'infrastructure'
  'Description of what the job does',
  'daily',             -- 'every_2h', 'every_6h', 'daily', 'weekly'
  true,
  '{"source": "script_name.js", "owner": "team"}'
);
```

---

## Monitoring Commands

### Check Job Status

```sql
-- All unhealthy jobs
SELECT job_name, business, status, last_run,
       EXTRACT(EPOCH FROM (now() - last_run)) / 3600 AS hours_since_run
FROM dashboard_job_status
WHERE status IN ('stale', 'failed')
ORDER BY status DESC, hours_since_run DESC;

-- Jobs by business
SELECT job_name, status, last_run, last_error
FROM dashboard_job_status
WHERE business = 'boo'
ORDER BY job_name;
```

### Manual Status Refresh

```bash
# Refresh all job statuses
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts

# Refresh only BOO jobs
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts --source boo

# Just recalculate stale/healthy statuses
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts --refresh
```

---

## Adding New Jobs

1. **Register in database**:
```sql
INSERT INTO dashboard_job_status (job_name, job_type, business, description, expected_frequency)
VALUES ('new-job', 'cron', 'boo', 'New job description', 'daily');
```

2. **Add to JOB_MAPPINGS** in sync-job-status.ts if syncing from automation_logs:
```typescript
const JOB_MAPPINGS = {
  // ... existing mappings
  'workflow-name-in-logs': { name: 'new-job', business: 'boo', type: 'cron' }
};
```

3. **Update this registry**

---

## Job Dependencies

Some jobs have dependencies that should be monitored:

```
boo-stock-sync
    └── boo-bc-product-sync (uses stock data)
        └── boo-product-linking (uses synced products)

tlx-order-sync
    └── tlx-klaviyo-sync (uses order data)
        └── tlx-anniversary-email (uses Klaviyo data)
        └── tlx-winback-email (uses Klaviyo data)
```

If a parent job fails, downstream jobs may also fail or produce incorrect results.

---

## Alert Thresholds

| Condition | Severity | Alert |
|-----------|----------|-------|
| Job failed | Critical | Immediate alert |
| Job stale > 2x frequency | Warning | Alert after grace period |
| 3+ consecutive failures | Critical | Escalated alert |
| Success rate < 70% (7 days) | Warning | Daily summary |
