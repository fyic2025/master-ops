---
name: supabase-expert
description: Comprehensive Supabase database expert for monitoring, optimization, security auditing, migrations, and maintenance across all 4 businesses (Teelixir, Elevate Wholesale, Buy Organics Online, Red Hill Fresh). Handles RLS policies, performance tuning, schema management, integration health, and automated cleanup. Use for any Supabase-related tasks including health checks, troubleshooting, optimization, or structural changes.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Supabase Expert Skill

Master skill for managing and maintaining the shared Supabase database used across all 4 businesses in master-ops.

## When to Activate This Skill

Activate this skill when the user mentions:
- "check supabase health"
- "optimize database"
- "review RLS policies"
- "supabase performance"
- "database migration"
- "cleanup old logs"
- "monitor supabase"
- "fix database issues"
- "analyze table usage"
- "supabase security audit"
- "database warnings/errors"
- "rationalize tables"

## Core Capabilities

This skill combines 5 specialized sub-capabilities:

1. **Monitoring & Health** - Real-time health checks, integration status, error tracking
2. **Optimization & Performance** - Index management, query tuning, table analysis
3. **Security & RLS** - Row Level Security policies, access control, permission auditing
4. **Migrations & Schema** - Schema changes, table modifications, safe deployments
5. **Cleanup & Maintenance** - Log retention, orphaned data, automated housekeeping

## Database Overview

### Shared Supabase Instance
- **Project URL**: `https://qcvfxxsnqvdfmpbcgdni.supabase.co`
- **Businesses**: Teelixir, Elevate Wholesale, Buy Organics Online, Red Hill Fresh
- **Tables**: 15 (6 critical, 9 agent-related)
- **Views**: 21
- **Functions**: 9 stored procedures

### Critical Tables (Production Active)
1. **businesses** - Core business registry (4 businesses)
2. **integration_logs** - All integration monitoring
3. **workflow_execution_logs** - n8n workflow tracking
4. **tasks** - Task automation system
5. **task_logs** - Task audit trail
6. **api_metrics** - Performance monitoring

### Agent Tables (Prepared for Future Use)
7. **lighthouse_audits** - Web performance tracking
8. **theme_changes** - Theme modification history
9. **accessibility_audits** - WCAG compliance
10. **seo_implementation_tasks** - SEO task tracking
11. **deployment_history** - Deployment tracking
12. **agent_activity_log** - AI agent operations
13. **performance_trends** - Historical trends
14. **performance_alerts** - Performance issues
15. **performance_budgets** - Performance thresholds

## Task Execution Methodology

### Phase 1: Initial Assessment

When activated, automatically:

1. **Identify the specific request category**:
   - Monitoring/Health Check
   - Performance/Optimization
   - Security/RLS Review
   - Migration/Schema Change
   - Cleanup/Maintenance
   - General Troubleshooting

2. **Gather current state**:
   ```bash
   # Check Supabase connectivity
   npx tsx scripts/tests/test-supabase.ts

   # Review recent logs
   # (via Supabase client or direct queries)
   ```

3. **Load relevant schema files**:
   - [infra/supabase/schema-tasks.sql](infra/supabase/schema-tasks.sql) - Tasks system
   - [infra/supabase/schema-integration-logs.sql](infra/supabase/schema-integration-logs.sql) - Integration logging
   - [infra/supabase/schema-business-views.sql](infra/supabase/schema-business-views.sql) - Business management
   - [agents/database-schema.sql](agents/database-schema.sql) - Agent tables

### Phase 2: Execute Specialized Tasks

#### 1. Monitoring & Health Checks

**Automated Health Check Sequence**:

```typescript
// 1. Test connectivity
const client = createSupabaseClient()
await client.getAll('businesses', 10)

// 2. Check integration health (last 24 hours)
const { data: health } = await client
  .rpc('get_error_rate', { p_source: 'hubspot', p_hours: 24 })

// 3. Review recent errors
const { data: errors } = await client
  .from('recent_errors')
  .select('*')
  .limit(10)

// 4. Check workflow performance
const { data: workflows } = await client
  .from('workflow_performance_summary')
  .select('*')

// 5. Review business health
const businesses = ['teelixir', 'elevate-wholesale', 'buy-organics-online', 'red-hill-fresh']
for (const slug of businesses) {
  const stats = await client.rpc('get_business_stats', {
    p_business_slug: slug,
    p_hours: 24
  })
  // Analyze stats...
}
```

**Key Views to Monitor**:
- `integration_health_summary` - 24-hour success/error rates
- `recent_errors` - Last 100 errors
- `recent_workflow_failures` - Last 50 failed workflows
- `businesses_needing_attention` - Businesses with errors
- `stale_integrations` - Inactive >24 hours
- `api_performance_summary` - API endpoint performance

**Alert Thresholds**:
- Error rate >10% in last 24 hours → Warning
- Error rate >25% in last 24 hours → Critical
- No activity in >24 hours for active integration → Stale warning
- Workflow failure rate >20% → Investigation needed

#### 2. Performance Optimization

**Analysis Steps**:

```sql
-- 1. Check table sizes and row counts
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Find missing indexes on foreign keys
SELECT
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('integration_logs', 'workflow_execution_logs', 'task_logs')
ORDER BY tablename, attname;

-- 3. Check JSONB column usage (details_json, metadata, plan_json)
SELECT
  tablename,
  attname,
  n_distinct,
  avg_width
FROM pg_stats
WHERE schemaname = 'public'
  AND attname LIKE '%json%';

-- 4. Analyze slow queries (if pg_stat_statements available)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Optimization Recommendations**:

1. **Add JSONB indexes** for frequently queried paths:
   ```sql
   -- Example: Index on integration_logs details
   CREATE INDEX idx_integration_logs_details_business
   ON integration_logs USING GIN ((details_json->'business_id'));

   -- Example: Index on task plan_json status
   CREATE INDEX idx_tasks_plan_status
   ON tasks USING GIN ((plan_json->'status'));
   ```

2. **Add composite indexes** for common queries:
   ```sql
   -- Integration logs by source and timestamp
   CREATE INDEX idx_integration_logs_source_created
   ON integration_logs(source, created_at DESC);

   -- Workflow logs by business and status
   CREATE INDEX idx_workflow_logs_business_status
   ON workflow_execution_logs(business_id, status, finished_at DESC);
   ```

3. **Implement table partitioning** for high-write tables:
   ```sql
   -- Partition integration_logs by month
   -- (Requires data migration - provide migration plan)
   ```

4. **Vacuum and analyze**:
   ```sql
   VACUUM ANALYZE integration_logs;
   VACUUM ANALYZE workflow_execution_logs;
   VACUUM ANALYZE api_metrics;
   ```

#### 3. Security & RLS Auditing

**Current State**:
- RLS **DISABLED** on all critical production tables
- All operations use service role key (bypasses RLS)
- No active policies defined

**Security Assessment Checklist**:

1. **Review current access patterns**:
   - Where is service role key used? (n8n, automation scripts)
   - Where is anon key used? (client applications)
   - Are there any direct PostgreSQL connections?

2. **Identify business-level access requirements**:
   - Should businesses only see their own data?
   - Should workflows have cross-business access?
   - Are there admin vs regular user roles?

3. **Design RLS policies** for each table:

**Example: businesses table**
```sql
-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for n8n, automation)
CREATE POLICY "service_role_all_businesses"
ON businesses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users see all businesses (read-only)
CREATE POLICY "authenticated_read_businesses"
ON businesses
FOR SELECT
TO authenticated
USING (true);

-- Restrict updates to service role only
CREATE POLICY "service_role_update_businesses"
ON businesses
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
```

**Example: integration_logs table**
```sql
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_all_logs"
ON integration_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can view logs for their business
CREATE POLICY "authenticated_read_own_business_logs"
ON integration_logs
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT id::text FROM businesses
    WHERE -- Add user-to-business relationship logic
  )
);

-- Prevent manual log insertion by regular users
-- Only service role can insert
CREATE POLICY "service_role_insert_logs"
ON integration_logs
FOR INSERT
TO service_role
WITH CHECK (true);
```

**Security Recommendations**:
1. Enable RLS on all tables (start with read-only policies)
2. Create separate service accounts for different integrations
3. Implement business-level data isolation
4. Audit service role key usage and restrict where possible
5. Add API key rotation schedule
6. Review and minimize JWT token expiration times

#### 4. Schema Migrations

**Migration Best Practices**:

1. **Always use transactions**:
   ```sql
   BEGIN;
   -- migration steps
   COMMIT; -- or ROLLBACK if issues
   ```

2. **Test on non-production first** (if available)

3. **Create rollback plan** before executing

4. **Use migration files** with timestamps:
   ```
   infra/supabase/migrations/
   ├── 20251120_001_add_business_fk_constraints.sql
   ├── 20251120_002_create_jsonb_indexes.sql
   └── 20251120_003_enable_rls_policies.sql
   ```

**Common Migration Patterns**:

**Adding Foreign Key Constraints**:
```sql
-- Fix business_id from TEXT to UUID foreign key
BEGIN;

-- 1. Add new column
ALTER TABLE integration_logs
ADD COLUMN business_uuid UUID;

-- 2. Migrate data
UPDATE integration_logs il
SET business_uuid = b.id
FROM businesses b
WHERE il.business_id = b.id::text;

-- 3. Add foreign key
ALTER TABLE integration_logs
ADD CONSTRAINT fk_integration_logs_business
FOREIGN KEY (business_uuid)
REFERENCES businesses(id)
ON DELETE CASCADE;

-- 4. Drop old column (after verification)
-- ALTER TABLE integration_logs DROP COLUMN business_id;
-- ALTER TABLE integration_logs RENAME COLUMN business_uuid TO business_id;

COMMIT;
```

**Adding Indexes**:
```sql
-- Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_name ON table_name(column);
```

**Modifying Functions**:
```sql
-- Replace function safely
CREATE OR REPLACE FUNCTION function_name(params)
RETURNS return_type
LANGUAGE plpgsql
AS $$
BEGIN
  -- new implementation
END;
$$;
```

#### 5. Cleanup & Maintenance

**Automated Cleanup Tasks**:

```typescript
// Execute cleanup function
const result = await client.rpc('cleanup_old_logs', {
  integration_logs_days: 30,
  workflow_logs_days: 90,
  api_metrics_days: 30
})

console.log('Cleanup results:', result)
// { int_deleted: 1523, wf_deleted: 89, api_deleted: 4521 }
```

**Manual Cleanup Queries**:

```sql
-- Find orphaned workflow logs (workflow_id not in n8n)
SELECT workflow_id, COUNT(*) as executions
FROM workflow_execution_logs
GROUP BY workflow_id
ORDER BY executions DESC;

-- Find orphaned task logs (task_id doesn't exist)
SELECT tl.task_id, COUNT(*) as log_count
FROM task_logs tl
LEFT JOIN tasks t ON t.id = tl.task_id
WHERE t.id IS NULL
GROUP BY tl.task_id;

-- Check for stale tasks (pending/in_progress >7 days)
SELECT id, title, status, created_at
FROM tasks
WHERE status IN ('pending', 'in_progress')
  AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at;
```

**Maintenance Schedule Recommendations**:

1. **Daily** (automated via cron/n8n):
   - Check integration health
   - Monitor error rates
   - Alert on stale integrations

2. **Weekly** (automated):
   - Run cleanup_old_logs function
   - Analyze table growth
   - Review slow queries

3. **Monthly** (manual review):
   - Security audit (RLS policies, access logs)
   - Performance review (indexes, query plans)
   - Schema review (unused tables, redundant views)

4. **Quarterly** (strategic review):
   - Table rationalization (keep/archive/remove)
   - Integration dependency mapping
   - Capacity planning

### Phase 3: Reporting & Documentation

After completing any task, provide:

1. **Executive Summary**
   - What was done
   - Current status
   - Key findings

2. **Detailed Results**
   - Specific metrics and measurements
   - Before/after comparisons
   - Issues discovered

3. **Recommendations**
   - Immediate actions (if any)
   - Short-term improvements
   - Long-term strategic changes

4. **Next Steps**
   - What to monitor
   - When to review again
   - Who should be notified

## Reference Files

Key files to reference during tasks:

### Schema Files
- [infra/supabase/schema-tasks.sql](../../infra/supabase/schema-tasks.sql) - Tasks system (2 tables, 5 functions)
- [infra/supabase/schema-integration-logs.sql](../../infra/supabase/schema-integration-logs.sql) - Integration logging (3 tables, 2 functions)
- [infra/supabase/schema-business-views.sql](../../infra/supabase/schema-business-views.sql) - Business management (1 table, 13 views, 1 function)
- [agents/database-schema.sql](../../agents/database-schema.sql) - Agent tables (9 tables, 4 views)
- [infra/supabase/monitoring-dashboards.sql](../../infra/supabase/monitoring-dashboards.sql) - Monitoring queries

### Client Libraries
- [shared/libs/supabase/client.ts](../../shared/libs/supabase/client.ts) - Main Supabase wrapper
- [shared/libs/supabase/types.ts](../../shared/libs/supabase/types.ts) - TypeScript types
- [shared/libs/supabase/examples.ts](../../shared/libs/supabase/examples.ts) - Usage examples
- [shared/libs/supabase/README.md](../../shared/libs/supabase/README.md) - Documentation

### Test Scripts
- [scripts/tests/test-supabase.ts](../../scripts/tests/test-supabase.ts) - Integration test
- [scripts/tests/fetchTaskState.ts](../../scripts/tests/fetchTaskState.ts) - Task state testing

### Setup Documentation
- [infra/supabase/SETUP.md](../../infra/supabase/SETUP.md) - Database setup guide
- [START-HERE.md](../../START-HERE.md) - Quick start guide

## Known Issues & Warnings

Based on the comprehensive audit:

### High Priority
1. **RLS Disabled** - All production tables accessible without policies
2. **Weak Foreign Keys** - business_id fields are TEXT instead of UUID references
3. **No Automated Cleanup** - cleanup_old_logs exists but not scheduled
4. **Missing JSONB Indexes** - Heavy JSON columns without GIN indexes

### Medium Priority
5. **Agent Tables Underutilized** - 9 tables prepared but limited active usage
6. **No Table Partitioning** - High-write tables could benefit from partitioning
7. **Orphaned Logs Possible** - No CASCADE relationships between some tables

### Low Priority
8. **View Optimization** - Some views could be materialized for performance
9. **Documentation Gaps** - Limited inline comments in schema files
10. **Monitoring Dashboard** - Queries exist but not deployed to visualization tool

## Success Criteria

A successful Supabase maintenance session should:
- ✅ Identify and resolve immediate issues
- ✅ Provide clear metrics and measurements
- ✅ Document changes made
- ✅ Create rollback plans for risky changes
- ✅ Update relevant documentation
- ✅ Set up monitoring for ongoing health
- ✅ Provide actionable recommendations
- ✅ Respect business continuity (no downtime)

## Emergency Procedures

### If Database Connection Fails
1. Check environment variables in `.env`
2. Verify Supabase project is online (dashboard)
3. Test with `npx tsx scripts/tests/test-supabase.ts`
4. Check service status: https://status.supabase.com
5. Review recent schema changes for breaking changes

### If Performance Degrades
1. Check recent query patterns (pg_stat_statements)
2. Review table sizes and bloat
3. Run VACUUM ANALYZE on large tables
4. Check for missing indexes
5. Review n8n workflows for query loops

### If Data Integrity Issues
1. Stop all automated workflows immediately
2. Identify affected tables and row count
3. Check for foreign key violations
4. Review recent migrations
5. Restore from backup if necessary (contact Supabase support)

## Best Practices

1. **Always test queries on small datasets first**
2. **Use transactions for multi-step operations**
3. **Create backups before schema changes**
4. **Document all manual queries executed**
5. **Monitor impact of changes (before/after metrics)**
6. **Communicate changes to stakeholders**
7. **Keep migration files version controlled**
8. **Use feature flags for risky deployments**
9. **Schedule maintenance during low-traffic periods**
10. **Have rollback plans ready before executing**

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
