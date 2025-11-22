# Supabase Expert Skill - Getting Started Guide

> Master guide for using the Supabase Expert skill across all master-ops projects

## What is the Supabase Expert Skill?

The Supabase Expert skill is a specialized Claude Code skill that provides comprehensive database management for the shared Supabase instance used across all 4 businesses in master-ops:

- **Teelixir**
- **Elevate Wholesale**
- **Buy Organics Online**
- **Red Hill Fresh**

## Why Do We Need This?

Our Supabase database is the central hub for:
- Business data and metadata
- Integration logging (HubSpot, n8n, Unleashed, Shopify)
- Workflow execution tracking
- Task automation
- API performance metrics
- AI agent operations

Without proper maintenance, we risk:
- ❌ Performance degradation from unbounded log growth
- ❌ Security vulnerabilities from disabled RLS policies
- ❌ Data integrity issues from weak foreign key constraints
- ❌ Integration failures going unnoticed
- ❌ Orphaned data consuming resources

## How to Use It

### Method 1: Activate in Claude Code (Recommended)

Simply mention Supabase-related tasks in any Claude Code session:

**Examples:**
```
"Check Supabase health across all businesses"
"Optimize database performance"
"Review RLS security policies"
"Clean up old integration logs"
"Analyze which tables are being used"
"Find and fix database warnings"
```

Claude Code will automatically activate the `supabase-expert` skill and handle the request.

### Method 2: Run Scripts Directly

```bash
# From master-ops root directory

# Daily health check
npx tsx .claude/skills/supabase-expert/scripts/health-check.ts

# Weekly maintenance
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts --dry-run

# Monthly performance review
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts
```

## Common Workflows

### 1. Daily Health Monitoring

**Goal:** Ensure all integrations are healthy, no critical errors

**How:**
```bash
npx tsx .claude/skills/supabase-expert/scripts/health-check.ts
```

**What it checks:**
- ✅ Database connectivity
- ✅ All 4 businesses are present and synced
- ✅ Integration health (HubSpot, n8n, etc.) - last 24h
- ✅ Workflow success/failure rates
- ✅ Task status (pending, in_progress, failed)
- ✅ Stale integrations (>24h inactive)

**Output:**
- Console summary with status (🟢 healthy / ⚠️ warning / 🔴 critical)
- JSON report saved to `logs/supabase-health-check.json`
- Exit code: 0 = healthy, 1 = critical issues

**Recommended:** Run every 6 hours via n8n workflow

---

### 2. Weekly Cleanup

**Goal:** Prevent unbounded log growth, identify orphaned data

**How:**
```bash
# Preview what would be deleted
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts --dry-run

# Actually perform cleanup
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts
```

**What it does:**
- 🧹 Deletes integration_logs older than 30 days
- 🧹 Deletes workflow_execution_logs older than 90 days
- 🧹 Deletes api_metrics older than 30 days
- 🔍 Identifies orphaned task_logs (tasks no longer exist)
- 🔍 Finds stale tasks (pending/in_progress >7 days)
- 🔍 Reports on old workflow logs (>6 months)

**Output:**
- Summary of records deleted
- List of orphaned/stale records
- JSON report saved to `logs/supabase-cleanup.json`

**Recommended:** Run weekly on Sunday nights

---

### 3. Monthly Performance Review

**Goal:** Optimize query performance, manage table growth

**How:**
```bash
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts
```

**What it analyzes:**
- 📊 Table sizes and row counts
- 📊 Missing indexes on foreign keys and common queries
- 📊 JSONB column usage and indexing
- 📊 Growth trends and bloat
- 💡 Optimization recommendations

**Output:**
- Performance analysis report
- JSON results: `logs/supabase-performance-audit.json`
- **Auto-generated migration file:** `infra/supabase/migrations/performance-optimization.sql`

**What to do with results:**
1. Review the generated migration file
2. Test indexes in Supabase dashboard (SQL editor)
3. Apply recommended indexes
4. Run VACUUM ANALYZE on large tables
5. Monitor impact over next week

**Recommended:** Run on the 1st of each month

---

### 4. Security Audit (Quarterly)

**Goal:** Review and implement RLS policies, access control

**How:**
```
Ask Claude Code: "Review Supabase security and RLS policies"
```

Or manually review:
```bash
cat .claude/skills/supabase-expert/templates/rls-policies.sql
```

**What to review:**
- 🔒 RLS status on all tables (currently DISABLED)
- 🔒 Service role key usage (n8n, automation)
- 🔒 Anon key usage (client apps)
- 🔒 Business-level data isolation
- 🔒 Foreign key constraints

**Action items:**
1. Review RLS policy templates
2. Test policies in Supabase dashboard
3. Enable RLS on production tables
4. Verify n8n workflows still work
5. Monitor for access issues

**Recommended:** Run quarterly (Jan, Apr, Jul, Oct)

---

## Understanding the Output

### Health Check Status Levels

**🟢 Healthy**
- All integrations working
- Error rate <10% in last 24h
- All workflows succeeding
- No stale integrations
- No failed tasks

**⚠️ Warning**
- Error rate 10-25% in last 24h
- Some workflow failures
- Stale integrations detected
- Some tasks failed/need fixing
- Non-critical issues

**🔴 Critical**
- Error rate >25% in last 24h
- Database connectivity issues
- Major integration failures
- High workflow failure rate
- System requires immediate attention

### Sample Health Check Output

```
🏥 Supabase Health Check
============================================================
Timestamp: 2025-11-20T10:30:00.000Z

1️⃣  Testing connectivity...
   ✅ Connected to Supabase

2️⃣  Checking businesses...
   📊 Total businesses: 4
   🔗 HubSpot synced: 4
   📦 Unleashed synced: 2

3️⃣  Checking integration health (last 24h)...
   📊 Total operations: 1,523
   ❌ Total errors: 47
   📈 Error rate: 3.08%

   By source:
     ✅ hubspot: 2.1% (15/714)
     ✅ n8n: 4.5% (18/400)
     ✅ system: 3.4% (14/409)

4️⃣  Checking workflow performance (last 24h)...
   📊 Total executions: 24
   ❌ Failures: 1
   📈 Failure rate: 4.17%

5️⃣  Checking tasks status...
   ⏳ Pending: 3
   🔄 In Progress: 1
   ❌ Failed: 0
   🔧 Needs Fix: 0

6️⃣  Checking for stale integrations (>24h inactive)...
   ✅ All integrations active

============================================================
📊 HEALTH CHECK SUMMARY
============================================================

Overall Status: ✅ HEALTHY

✅ All systems operational
```

## Troubleshooting Common Issues

### Issue: High Error Rate

**Symptoms:**
- Health check shows ⚠️ warning or 🔴 critical
- Error rate >10% for specific integration

**Diagnosis:**
```typescript
// Via Claude Code
"Show me recent errors for HubSpot integration"

// Or query directly
SELECT * FROM recent_errors
WHERE source = 'hubspot'
LIMIT 20;
```

**Common causes:**
- API rate limiting
- Invalid credentials
- Service downtime
- Network issues

**Solutions:**
1. Check API status pages (HubSpot, etc.)
2. Verify credentials in `.env`
3. Review error messages for patterns
4. Pause workflows if needed
5. Implement exponential backoff

---

### Issue: Stale Tasks

**Symptoms:**
- Tasks stuck in `pending` or `in_progress` for >7 days

**Diagnosis:**
```sql
SELECT * FROM tasks_needing_attention;
```

**Solutions:**
1. Review task logs for errors
2. Manually update status if stale
3. Retry failed tasks
4. Cancel abandoned tasks

**Example:**
```typescript
// Update task status
await supabase.rpc('update_task_status', {
  p_task_id: 'task-id-here',
  p_status: 'cancelled',
  p_source: 'manual',
  p_message: 'Manually cancelled - stale task'
})
```

---

### Issue: Database Performance Slow

**Symptoms:**
- Queries taking longer than usual
- n8n workflows timing out
- API responses slow

**Diagnosis:**
```bash
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts
```

**Common causes:**
- Missing indexes
- Table bloat (dead rows)
- Large JSONB columns without indexes
- Unbounded log growth

**Solutions:**
1. Add recommended indexes from audit
2. Run VACUUM ANALYZE on tables
3. Clean up old logs
4. Consider table partitioning

---

## Automation Setup

### n8n Health Check Workflow

**Frequency:** Every 6 hours

**Workflow:**
1. Cron Trigger (every 6h)
2. Execute Command: `npx tsx .claude/skills/supabase-expert/scripts/health-check.ts`
3. Parse JSON output
4. IF status != "healthy":
   - Send Slack alert
   - Log to integration_logs
5. ELSE:
   - Log success

**Create workflow:**
```bash
# Workflow template available in:
cat .claude/skills/supabase-expert/QUICK-REFERENCE.md
# (See n8n Integration section)
```

---

### n8n Weekly Cleanup Workflow

**Frequency:** Weekly (Sunday 2 AM)

**Workflow:**
1. Cron Trigger (weekly)
2. Execute Command: `npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts`
3. Parse JSON output
4. Send summary to Slack
5. Log results

---

## Advanced Usage

### Custom Queries via Views

All monitoring queries are available as pre-built views:

```sql
-- Integration health by source (last 24h)
SELECT * FROM integration_health_summary;

-- Business activity summary
SELECT * FROM business_activity;

-- Workflow performance
SELECT * FROM workflow_performance_summary;

-- API endpoint performance
SELECT * FROM api_performance_summary;

-- Complete list in:
-- .claude/skills/supabase-expert/QUICK-REFERENCE.md
```

### Business-Specific Stats

```typescript
// Get detailed stats for a single business
const stats = await supabase.rpc('get_business_stats', {
  p_business_slug: 'teelixir',
  p_hours: 24
})

console.log(stats)
// {
//   total_ops: 350,
//   success_ops: 340,
//   failed_ops: 10,
//   success_rate: 97.14,
//   avg_duration_ms: 145,
//   active_integrations: 3,
//   error_sources: ['hubspot']
// }
```

### Custom Retention Policies

Modify cleanup retention:

```sql
-- Default: 30/90/30 days
SELECT cleanup_old_logs(
  integration_logs_days := 30,
  workflow_logs_days := 90,
  api_metrics_days := 30
);

-- More aggressive (weekly logs only):
SELECT cleanup_old_logs(
  integration_logs_days := 7,
  workflow_logs_days := 7,
  api_metrics_days := 7
);

-- More conservative (keep 6 months):
SELECT cleanup_old_logs(
  integration_logs_days := 180,
  workflow_logs_days := 180,
  api_metrics_days := 180
);
```

## File Locations

All Supabase Expert skill files:

```
master-ops/
├── .claude/skills/supabase-expert/
│   ├── SKILL.md                    # Main skill definition
│   ├── README.md                   # Skill documentation
│   ├── QUICK-REFERENCE.md          # Quick commands
│   ├── scripts/
│   │   ├── health-check.ts         # Daily health monitoring
│   │   ├── performance-audit.ts    # Monthly performance review
│   │   └── cleanup-maintenance.ts  # Weekly cleanup
│   └── templates/
│       └── rls-policies.sql        # RLS policy templates
├── docs/
│   └── SUPABASE-EXPERT-GUIDE.md    # This guide
├── infra/supabase/
│   ├── schema-*.sql                # Database schemas
│   ├── monitoring-dashboards.sql   # Monitoring queries
│   └── migrations/                 # Generated migrations
└── logs/
    ├── supabase-health-check.json  # Health check results
    ├── supabase-performance-audit.json
    └── supabase-cleanup.json
```

## Maintenance Schedule

Recommended schedule for all teams:

| Frequency | Task | Who | When |
|-----------|------|-----|------|
| Every 6h | Health check | n8n | Automated |
| Daily | Review health status | Ops team | Morning standup |
| Weekly | Run cleanup | n8n | Sunday 2 AM |
| Monthly | Performance audit | Dev team | 1st of month |
| Quarterly | Security review | Dev team | Jan/Apr/Jul/Oct |

## Next Steps

1. **Set up automated health checks** in n8n (every 6 hours)
2. **Set up automated cleanup** in n8n (weekly)
3. **Review performance audit** and apply recommended indexes
4. **Plan RLS policy implementation** (Q1 2026)
5. **Add FK constraints** for business_id fields (Q1 2026)

## Getting Help

**For issues with the skill:**
1. Check [QUICK-REFERENCE.md](.claude/skills/supabase-expert/QUICK-REFERENCE.md)
2. Review recent health check logs
3. Activate the skill in Claude Code: "Help me debug Supabase"

**For database emergencies:**
1. Check Supabase status: https://status.supabase.com
2. Review dashboard: https://app.supabase.com/project/qcvfxxsnqvdfmpbcgdni
3. Run health check immediately
4. Contact on-call engineer

## Resources

- [Skill Documentation](.claude/skills/supabase-expert/README.md)
- [Quick Reference](.claude/skills/supabase-expert/QUICK-REFERENCE.md)
- [Schema Files](infra/supabase/)
- [Supabase Dashboard](https://app.supabase.com/project/qcvfxxsnqvdfmpbcgdni)
- [Supabase Official Docs](https://supabase.com/docs)

---

**Last Updated:** 2025-11-20
**Maintained By:** Development Team
**Skill Version:** 1.0.0
