# Supabase Expert - Quick Reference Guide

Quick commands and examples for maintaining the master-ops Supabase database.

## Quick Health Check

```bash
# Run comprehensive health check
npx tsx .claude/skills/supabase-expert/scripts/health-check.ts

# View last health check results
cat logs/supabase-health-check.json | jq '.overall_status'
```

## Performance Audit

```bash
# Run performance audit
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts

# View generated migration file
cat infra/supabase/migrations/performance-optimization.sql
```

## Cleanup & Maintenance

```bash
# Dry run (see what would be cleaned)
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts --dry-run

# Actually perform cleanup
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts
```

## Common Monitoring Queries

### Check Integration Health

```sql
-- Last 24 hours integration health by source
SELECT * FROM integration_health_summary;

-- Recent errors (last 100)
SELECT * FROM recent_errors LIMIT 10;

-- Stale integrations (>24h inactive)
SELECT * FROM stale_integrations;
```

### Business-Specific Stats

```typescript
// Get stats for a specific business
const stats = await supabase.rpc('get_business_stats', {
  p_business_slug: 'teelixir',
  p_hours: 24
})

console.log(stats)
// {
//   total_ops: 150,
//   success_ops: 145,
//   failed_ops: 5,
//   success_rate: 96.67,
//   avg_duration_ms: 234,
//   active_integrations: 3,
//   error_sources: ['hubspot']
// }
```

### Workflow Performance

```sql
-- Workflow performance summary (last 7 days)
SELECT * FROM workflow_performance_summary;

-- Recent workflow failures
SELECT * FROM recent_workflow_failures LIMIT 10;
```

### Task Status

```sql
-- Tasks needing attention (failed or needs_fix)
SELECT * FROM tasks_needing_attention;

-- Get tasks ready for retry
SELECT * FROM get_tasks_for_retry(3); -- max 3 retries
```

## Common Maintenance Tasks

### 1. Add Missing Indexes

```sql
-- Integration logs indexes
CREATE INDEX idx_integration_logs_source ON integration_logs(source);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at DESC);
CREATE INDEX idx_integration_logs_business_id ON integration_logs(business_id);
CREATE INDEX idx_integration_logs_source_created ON integration_logs(source, created_at DESC);

-- Workflow logs indexes
CREATE INDEX idx_workflow_logs_status ON workflow_execution_logs(status);
CREATE INDEX idx_workflow_logs_business_id ON workflow_execution_logs(business_id);

-- API metrics indexes
CREATE INDEX idx_api_metrics_service ON api_metrics(service);

-- Tasks indexes
CREATE INDEX idx_tasks_status ON tasks(status);

-- JSONB indexes (GIN)
CREATE INDEX idx_integration_logs_details_gin ON integration_logs USING GIN (details_json);
CREATE INDEX idx_tasks_plan_gin ON tasks USING GIN (plan_json);
```

### 2. Run Cleanup

```sql
-- Cleanup old logs (using built-in function)
SELECT cleanup_old_logs(
  integration_logs_days := 30,
  workflow_logs_days := 90,
  api_metrics_days := 30
);

-- Returns: { int_deleted: 1523, wf_deleted: 89, api_deleted: 4521 }
```

### 3. Vacuum Tables

```sql
-- Vacuum high-write tables
VACUUM ANALYZE integration_logs;
VACUUM ANALYZE workflow_execution_logs;
VACUUM ANALYZE api_metrics;
VACUUM ANALYZE tasks;
VACUUM ANALYZE task_logs;
```

### 4. Enable RLS Policies

```bash
# Review RLS policy template
cat .claude/skills/supabase-expert/templates/rls-policies.sql

# Apply policies (test in staging first!)
# Copy relevant policies and run in Supabase SQL editor
```

## Troubleshooting Common Issues

### High Error Rate

```typescript
// Check error rate for specific source
const errorRate = await supabase.rpc('get_error_rate', {
  p_source: 'hubspot',
  p_hours: 24
})

console.log(errorRate)
// {
//   total_logs: 500,
//   error_count: 75,
//   error_rate: 15.0
// }

// Get recent errors for that source
const { data: errors } = await supabase
  .from('recent_errors')
  .select('*')
  .eq('source', 'hubspot')
  .limit(10)

console.log(errors)
```

### Stale Tasks Investigation

```sql
-- Find stale tasks (pending/in_progress >7 days)
SELECT
  id,
  title,
  status,
  created_at,
  retry_count,
  AGE(NOW(), created_at) as age
FROM tasks
WHERE status IN ('pending', 'in_progress')
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at;

-- View task history
SELECT * FROM tasks_with_latest_log WHERE id = 'task-id-here';
```

### Workflow Failures

```sql
-- Get detailed workflow failure info
SELECT
  workflow_name,
  execution_id,
  status,
  error_message,
  started_at,
  finished_at,
  duration_ms,
  nodes_executed,
  nodes_failed
FROM workflow_execution_logs
WHERE status IN ('error', 'failed')
ORDER BY finished_at DESC
LIMIT 20;
```

### Database Bloat Check

```sql
-- Check for dead rows (indicates need for VACUUM)
SELECT
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as bloat_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 100
ORDER BY bloat_pct DESC NULLS LAST;
```

## Alert Thresholds

Configure monitoring alerts with these thresholds:

| Metric | Warning | Critical |
|--------|---------|----------|
| Integration error rate (24h) | >10% | >25% |
| Workflow failure rate (24h) | >10% | >20% |
| Stale integrations | >24h | >48h |
| Failed tasks | >5 | >10 |
| Database connection failures | Any | Any |

## Scheduled Maintenance

### Daily (Automated)
- Run health check script
- Check integration health
- Monitor error rates
- Alert on stale integrations

### Weekly (Automated)
- Run cleanup script
- Review stale tasks
- Analyze table growth

### Monthly (Manual Review)
- Performance audit
- Review and update indexes
- Security audit (RLS policies)
- Review retention policies

### Quarterly (Strategic Review)
- Table rationalization
- Integration dependency mapping
- Capacity planning
- Schema optimization

## n8n Integration

### Health Check Workflow

```json
{
  "name": "Supabase Health Check",
  "nodes": [
    {
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 6 }]
        }
      }
    },
    {
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "cd /root/master-ops && npx tsx .claude/skills/supabase-expert/scripts/health-check.ts"
      }
    },
    {
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.overall_status }}",
              "operation": "notEqual",
              "value2": "healthy"
            }
          ]
        }
      }
    },
    {
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts",
        "text": "⚠️ Supabase health check warning: {{ $json.overall_status }}"
      }
    }
  ]
}
```

### Weekly Cleanup Workflow

```json
{
  "name": "Supabase Weekly Cleanup",
  "nodes": [
    {
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "rule": {
          "interval": [{ "field": "weeks", "weeksInterval": 1 }]
        }
      }
    },
    {
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "cd /root/master-ops && npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts"
      }
    }
  ]
}
```

## Useful Views

All available views for monitoring:

### Task & Workflow Views
- `tasks_with_latest_log` - Tasks with most recent log entry
- `tasks_needing_attention` - Failed/needs_fix tasks
- `recent_errors` - Last 100 error logs
- `recent_workflow_failures` - Last 50 failed workflows
- `workflow_performance_summary` - 7-day workflow stats

### Integration Health Views
- `integration_health_summary` - 24h success/error rates
- `api_performance_summary` - API endpoint performance
- `business_integration_health` - Health per business

### Business Analytics Views
- `business_activity` - 7-day activity by business
- `business_error_summary` - 24h errors by business
- `business_performance_comparison` - Cross-business metrics
- `business_workflow_executions` - Workflow stats per business
- `daily_operations_summary` - Daily ops per business
- `weekly_business_report` - 12-week trends
- `hubspot_sync_status` - HubSpot sync per business

### Agent & Performance Views
- `latest_lighthouse_scores` - Recent Lighthouse scores
- `active_performance_alerts` - Open alerts
- `recent_deployments` - Last 50 deployments
- `agent_performance_summary` - 30-day agent activity

### Alert Views
- `businesses_needing_attention` - Businesses with errors
- `stale_integrations` - Inactive >24h

## Emergency Procedures

### Database Connection Lost

```bash
# 1. Check environment variables
cat .env | grep SUPABASE

# 2. Test connectivity
npx tsx scripts/tests/test-supabase.ts

# 3. Check Supabase status
curl https://status.supabase.com

# 4. Verify project is online
# Visit: https://app.supabase.com/project/qcvfxxsnqvdfmpbcgdni
```

### High Error Rate

```bash
# 1. Identify source
npx tsx .claude/skills/supabase-expert/scripts/health-check.ts

# 2. Review recent errors
# (via Supabase dashboard or SQL query)

# 3. Pause affected workflows in n8n
# 4. Fix underlying issue
# 5. Resume workflows
```

### Performance Degradation

```bash
# 1. Run performance audit
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts

# 2. Check table sizes and bloat
# 3. Review slow queries
# 4. Add missing indexes
# 5. VACUUM ANALYZE large tables
```

## Resources

- [Supabase Dashboard](https://app.supabase.com/project/qcvfxxsnqvdfmpbcgdni)
- [Schema Files](../../infra/supabase/)
- [Test Scripts](../../scripts/tests/)
- [Main Documentation](../../README.md)
- [Supabase Docs](https://supabase.com/docs)
