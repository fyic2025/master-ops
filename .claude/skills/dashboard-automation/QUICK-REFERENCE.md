# Dashboard Automation Quick Reference

Fast lookup for common dashboard operations.

---

## Script Commands

### Job Status Sync

```bash
# Full sync from all sources
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts

# Sync only from BOO automation_logs
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts --source boo

# Sync only from n8n
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts --source n8n

# Just refresh status calculations (no source sync)
npx tsx .claude/skills/dashboard-automation/scripts/sync-job-status.ts --refresh
```

### Metrics Population

```bash
# Populate today's metrics
npx tsx .claude/skills/dashboard-automation/scripts/populate-metrics.ts

# Populate specific date
npx tsx .claude/skills/dashboard-automation/scripts/populate-metrics.ts --date 2024-12-01

# Backfill last N days
npx tsx .claude/skills/dashboard-automation/scripts/populate-metrics.ts --backfill 7
```

### Daily Report

```bash
# Generate report (output to console)
npx tsx .claude/skills/dashboard-automation/scripts/generate-daily-report.ts

# Generate and send via email
npx tsx .claude/skills/dashboard-automation/scripts/generate-daily-report.ts --send

# Generate for specific date
npx tsx .claude/skills/dashboard-automation/scripts/generate-daily-report.ts --date 2024-12-01
```

---

## SQL Quick Queries

### Job Status

```sql
-- All unhealthy jobs
SELECT job_name, business, status, last_run, last_error
FROM dashboard_job_status
WHERE status IN ('stale', 'failed')
ORDER BY status DESC, last_run DESC;

-- Jobs by business
SELECT job_name, status, last_run
FROM dashboard_job_status
WHERE business = 'boo' AND enabled = true
ORDER BY job_name;

-- Overdue jobs
SELECT job_name, expected_frequency,
  ROUND(EXTRACT(EPOCH FROM (now() - last_run)) / 3600, 1) AS hours_ago
FROM dashboard_job_status
WHERE status = 'stale'
ORDER BY hours_ago DESC;
```

### Metrics

```sql
-- Today's metrics all businesses
SELECT business, orders_count, revenue, avg_order_value
FROM dashboard_business_metrics
WHERE metric_date = CURRENT_DATE
ORDER BY revenue DESC;

-- Revenue last 7 days
SELECT metric_date, SUM(revenue) AS total_revenue
FROM dashboard_business_metrics
WHERE metric_date >= CURRENT_DATE - 7
GROUP BY metric_date
ORDER BY metric_date;

-- Business comparison
SELECT business,
  SUM(revenue) AS total_revenue,
  SUM(orders_count) AS total_orders,
  ROUND(AVG(avg_order_value), 2) AS avg_aov
FROM dashboard_business_metrics
WHERE metric_date >= CURRENT_DATE - 30
GROUP BY business
ORDER BY total_revenue DESC;
```

### Alerts

```sql
-- Active critical alerts
SELECT title, message, created_at
FROM dashboard_alerts
WHERE status = 'active' AND severity = 'critical'
ORDER BY created_at DESC;

-- Acknowledge all for a job
UPDATE dashboard_alerts
SET status = 'acknowledged', acknowledged_at = now()
WHERE source = 'job-name' AND status = 'active';

-- Clear old resolved
DELETE FROM dashboard_alerts
WHERE status = 'resolved' AND resolved_at < now() - interval '7 days';
```

### Health Checks

```sql
-- All integration statuses
SELECT integration_name, status, last_check, consecutive_failures
FROM dashboard_health_checks
ORDER BY status DESC, last_check DESC;

-- Reset integration status
UPDATE dashboard_health_checks
SET status = 'healthy', consecutive_failures = 0, last_error = NULL
WHERE integration_name = 'integration-name';
```

---

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Master Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Master Supabase service key |
| `BOO_SUPABASE_URL` | BOO Supabase URL |
| `BOO_SUPABASE_SERVICE_ROLE_KEY` | BOO Supabase service key |

### E-Commerce APIs

| Variable | Platform | Business |
|----------|----------|----------|
| `BC_STORE_HASH` | BigCommerce | BOO |
| `BC_ACCESS_TOKEN` | BigCommerce | BOO |
| `TEELIXIR_SHOPIFY_DOMAIN` | Shopify | Teelixir |
| `TEELIXIR_SHOPIFY_ACCESS_TOKEN` | Shopify | Teelixir |
| `ELEVATE_SHOPIFY_DOMAIN` | Shopify | Elevate |
| `ELEVATE_SHOPIFY_ACCESS_TOKEN` | Shopify | Elevate |
| `RHF_WC_URL` | WooCommerce | RHF |
| `RHF_WC_CONSUMER_KEY` | WooCommerce | RHF |
| `RHF_WC_CONSUMER_SECRET` | WooCommerce | RHF |

### Optional

| Variable | Purpose |
|----------|---------|
| `N8N_BASE_URL` | n8n instance URL |
| `N8N_API_KEY` | n8n API key |

---

## Status Color Codes

| Status | Color | Meaning |
|--------|-------|---------|
| healthy | Green | Running normally |
| stale | Yellow | Overdue |
| failed | Red | Last run errored |
| unknown | Gray | No data |

---

## Job Frequencies

| Frequency | Expected Interval | Stale After |
|-----------|-------------------|-------------|
| every_2h | 2 hours | 3 hours |
| every_6h | 6 hours | 8 hours |
| daily | 24 hours | 26 hours |
| weekly | 7 days | 8 days |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `dashboard_job_status` | Job monitoring |
| `dashboard_business_metrics` | Daily metrics |
| `dashboard_alerts` | System alerts |
| `dashboard_health_checks` | Integration health |
| `dashboard_reports` | Report history |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | GET | Get all job statuses |
| `/api/jobs/refresh` | POST | Refresh job statuses |
| `/api/metrics` | GET | Get business metrics |
| `/api/metrics/populate` | POST | Populate metrics |
| `/api/health` | GET | Get health checks |
| `/api/alerts` | GET | Get alerts |
| `/api/alerts/:id` | PATCH | Update alert |

---

## Widget Components

| Widget | File | Purpose |
|--------|------|---------|
| JobMonitoringWidget | `components/widgets/JobMonitoringWidget.tsx` | Job status grid |
| RevenueWidget | `components/widgets/RevenueWidget.tsx` | Revenue trends |
| IntegrationHealthWidget | `components/widgets/IntegrationHealthWidget.tsx` | Integration status |
| AlertsWidget | `components/widgets/AlertsWidget.tsx` | Active alerts |
| QuickActionsWidget | `components/widgets/QuickActionsWidget.tsx` | Common actions |

---

## Common Fix Commands

```bash
# Reset stale job to healthy
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('dashboard_job_status').update({status:'healthy',last_error:null}).eq('job_name','JOB_NAME').then(console.log);
"

# Clear all active alerts
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('dashboard_alerts').update({status:'resolved',resolved_at:new Date().toISOString()}).eq('status','active').then(console.log);
"
```

---

## Cron Schedule

| Job | Time (AEST) | Command |
|-----|-------------|---------|
| Job Status Sync | Every 2h | `sync-job-status.ts` |
| Metrics Population | 6:00 AM | `populate-metrics.ts` |
| Daily Report | 7:00 AM | `generate-daily-report.ts` |
| Health Checks | Every 5m | Edge function |

---

## Dashboard URL

Production: https://ops.growthcohq.com

---

## Files Reference

```
.claude/skills/dashboard-automation/
├── SKILL.md                 # Main skill definition
├── QUICK-REFERENCE.md       # This file
├── scripts/
│   ├── sync-job-status.ts   # Sync job statuses
│   ├── populate-metrics.ts  # Populate daily metrics
│   └── generate-daily-report.ts  # Generate reports
├── context/
│   ├── DASHBOARD-ARCHITECTURE.md  # Technical architecture
│   └── JOB-REGISTRY.md      # All tracked jobs
└── playbooks/
    └── TROUBLESHOOTING.md   # Common issues/fixes
```
