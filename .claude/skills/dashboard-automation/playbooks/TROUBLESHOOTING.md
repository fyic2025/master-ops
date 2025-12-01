# Dashboard Troubleshooting Playbook

Common issues and solutions for the ops dashboard.

---

## Job Monitoring Issues

### Job Shows "Stale" But Actually Ran

**Symptoms**:
- Dashboard shows job as stale/yellow
- Checking logs shows job completed successfully

**Causes**:
1. Job mapping not in JOB_MAPPINGS
2. Workflow name changed in source
3. Sync script not running

**Solutions**:

```bash
# Check if job exists in automation_logs
# In BOO Supabase
SELECT * FROM automation_logs
WHERE workflow_name ILIKE '%job-name%'
ORDER BY started_at DESC LIMIT 5;

# Add missing mapping to sync-job-status.ts
const JOB_MAPPINGS = {
  'actual-workflow-name': { name: 'dashboard-job-name', business: 'boo', type: 'cron' }
};

# Force manual sync
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts
```

---

### Job Shows "Failed" Incorrectly

**Symptoms**:
- Job marked as failed
- Actual job ran successfully

**Causes**:
1. Partial failure recorded
2. Error in downstream step
3. Stale error message

**Solutions**:

```sql
-- Check job's actual status in dashboard
SELECT job_name, status, last_run, last_success, last_error, updated_at
FROM dashboard_job_status
WHERE job_name = 'problematic-job';

-- If last_success is more recent than last_error, reset status
UPDATE dashboard_job_status
SET status = 'healthy', last_error = NULL, updated_at = now()
WHERE job_name = 'problematic-job'
  AND last_success > COALESCE(last_run - interval '1 hour', '1970-01-01');
```

---

### Multiple Jobs Stale Simultaneously

**Symptoms**:
- Several jobs across businesses show stale
- Dashboard looks "red"

**Causes**:
1. Sync script not running
2. Source database connection issue
3. n8n server down

**Solutions**:

```bash
# Check sync script health
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts --refresh

# Check BOO Supabase connectivity
curl -s "https://$BOO_SUPABASE_URL/rest/v1/automation_logs?limit=1" \
  -H "apikey: $BOO_SUPABASE_SERVICE_ROLE_KEY"

# Check n8n connectivity (if using)
curl -s "$N8N_BASE_URL/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

---

## Metrics Issues

### Zero Revenue Showing

**Symptoms**:
- Revenue shows $0 for a business
- Orders show 0

**Causes**:
1. API credentials expired/invalid
2. Date timezone mismatch
3. Order status filtering

**Solutions**:

```bash
# Test API connectivity
# For BigCommerce (BOO)
curl -s "https://api.bigcommerce.com/stores/$BC_STORE_HASH/v2/orders?limit=1" \
  -H "X-Auth-Token: $BC_ACCESS_TOKEN"

# For Shopify (Teelixir/Elevate)
curl -s "https://$TEELIXIR_SHOPIFY_DOMAIN/admin/api/2024-01/orders.json?limit=1" \
  -H "X-Shopify-Access-Token: $TEELIXIR_SHOPIFY_ACCESS_TOKEN"

# Re-populate metrics for specific date
npx tsx .claude/skills/dashboard-automation/scripts/populate-metrics.ts --date 2024-12-01
```

---

### Metrics Don't Match Platform

**Symptoms**:
- Dashboard revenue differs from Shopify/BC admin
- Order count doesn't match

**Causes**:
1. Order status filtering (only counting paid/completed)
2. Timezone differences
3. Refunds included/excluded differently

**Solutions**:

```sql
-- Check what's stored for the date
SELECT * FROM dashboard_business_metrics
WHERE business = 'teelixir' AND metric_date = '2024-12-01';

-- Compare with expected (check metadata for source info)
SELECT metadata FROM dashboard_business_metrics
WHERE business = 'teelixir' AND metric_date = '2024-12-01';
```

The populate-metrics script filters orders:
- Shopify: `financial_status = 'paid' OR 'partially_paid'`
- BigCommerce: `status_id IN (2, 10, 11)` (Shipped, Completed, Awaiting Pickup)
- WooCommerce: `status IN ('completed', 'processing')`

---

### Missing Historical Data

**Symptoms**:
- Gaps in metrics charts
- No data for past dates

**Solutions**:

```bash
# Backfill last 7 days
npx tsx .claude/skills/dashboard-automation/scripts/populate-metrics.ts --backfill 7

# Backfill specific date
npx tsx .claude/skills/dashboard-automation/scripts/populate-metrics.ts --date 2024-11-25
```

---

## Report Generation Issues

### Daily Report Not Sent

**Symptoms**:
- No email received
- Report not in history

**Causes**:
1. Cron job didn't trigger
2. Email sending failed
3. No recipients configured

**Solutions**:

```bash
# Generate report manually
npx tsx .claude/skills/dashboard-automation/scripts/generate-daily-report.ts

# Check if report was generated (look for output)
# Send manually if needed
npx tsx .claude/skills/dashboard-automation/scripts/generate-daily-report.ts --send

# Check recipients in script configuration
```

---

### Report Contains Stale Data

**Symptoms**:
- Report shows old metrics
- Jobs status outdated in report

**Solutions**:

```bash
# Run syncs before report generation
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts && \
npx tsx .claude/skills/dashboard-automation/scripts/populate-metrics.ts && \
npx tsx .claude/skills/dashboard-automation/scripts/generate-daily-report.ts
```

---

## Health Check Issues

### Integration Shows "Down" Incorrectly

**Symptoms**:
- Integration marked as down
- Service is actually working

**Causes**:
1. Network timeout during check
2. Temporary rate limiting
3. Health check URL wrong

**Solutions**:

```sql
-- Check integration status
SELECT * FROM dashboard_health_checks
WHERE integration_name = 'shopify-teelixir';

-- Reset consecutive failures
UPDATE dashboard_health_checks
SET consecutive_failures = 0, status = 'healthy', last_error = NULL
WHERE integration_name = 'shopify-teelixir';
```

---

### All Health Checks Failing

**Symptoms**:
- Multiple integrations down
- Dashboard showing critical status

**Causes**:
1. Network issues from dashboard server
2. Supabase edge function issues
3. Auth/credential problems

**Solutions**:

```bash
# Check from local machine
curl -s "https://teelixir.myshopify.com/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: $TEELIXIR_SHOPIFY_ACCESS_TOKEN"

# Check DigitalOcean App Platform logs
doctl apps logs <app-id> --type run

# Restart app if needed
doctl apps create-deployment <app-id>
```

---

## Alert Issues

### Not Receiving Critical Alerts

**Symptoms**:
- Critical issues not notified
- Alerts exist in database but no notification

**Causes**:
1. Alert routing not configured
2. Email integration down
3. Alert already acknowledged

**Solutions**:

```sql
-- Check recent alerts
SELECT * FROM dashboard_alerts
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Check for unacknowledged critical alerts
SELECT * FROM dashboard_alerts
WHERE severity = 'critical' AND status = 'active';
```

---

### Too Many Alerts

**Symptoms**:
- Alert flood
- Same alert repeatedly

**Causes**:
1. Flapping service
2. Missing deduplication
3. Alert not auto-resolving

**Solutions**:

```sql
-- Acknowledge all similar alerts
UPDATE dashboard_alerts
SET status = 'acknowledged', acknowledged_at = now()
WHERE alert_type = 'job_failed' AND source = 'problematic-job';

-- Clean up old resolved alerts
DELETE FROM dashboard_alerts
WHERE status = 'resolved' AND resolved_at < now() - interval '7 days';
```

---

## Database Issues

### Supabase Connection Timeout

**Symptoms**:
- Dashboard loads slowly or times out
- Database queries fail

**Solutions**:

```bash
# Check Supabase status
curl -s "https://$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Check for long-running queries (in Supabase dashboard)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds';
```

---

### Missing Tables

**Symptoms**:
- Error: "relation does not exist"
- Dashboard components fail to load

**Solutions**:

```bash
# Check if tables exist
# In Master Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'dashboard_%';

# Create missing tables if needed (refer to DASHBOARD-ARCHITECTURE.md)
```

---

## Quick Fixes

| Issue | Quick Command |
|-------|---------------|
| Refresh all job statuses | `npx tsx scripts/sync-job-status.ts` |
| Populate today's metrics | `npx tsx scripts/populate-metrics.ts` |
| Generate daily report | `npx tsx scripts/generate-daily-report.ts` |
| Backfill 7 days metrics | `npx tsx scripts/populate-metrics.ts --backfill 7` |
| Reset stale job to healthy | SQL: `UPDATE dashboard_job_status SET status='healthy' WHERE job_name='xxx'` |
| Clear active alerts | SQL: `UPDATE dashboard_alerts SET status='resolved' WHERE status='active'` |

---

## Escalation

If issues persist after troubleshooting:

1. **Check DigitalOcean App Platform**:
   - App status
   - Recent deployments
   - Resource usage

2. **Check Supabase Dashboard**:
   - Database health
   - Edge function logs
   - API logs

3. **Review Recent Changes**:
   - Git history for config changes
   - Environment variable updates
   - Schema migrations
