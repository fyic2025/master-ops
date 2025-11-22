# Supabase Expert Skill

> Comprehensive database maintenance and optimization skill for the master-ops shared Supabase instance.

## Overview

This skill provides expert-level Supabase database management across all 4 businesses:
- **Teelixir**
- **Elevate Wholesale**
- **Buy Organics Online**
- **Red Hill Fresh**

## What This Skill Does

### 1. Health Monitoring
- Real-time health checks across all integrations
- Error rate tracking (HubSpot, n8n, Unleashed, etc.)
- Workflow performance monitoring
- Task status tracking
- Stale integration detection

### 2. Performance Optimization
- Table size and bloat analysis
- Missing index identification
- JSONB column optimization
- Query performance tuning
- Automated migration file generation

### 3. Security Auditing
- RLS (Row Level Security) policy review
- Access control assessment
- Service role key usage audit
- Business-level data isolation
- Foreign key constraint validation

### 4. Maintenance & Cleanup
- Automated log cleanup based on retention policies
- Orphaned record detection
- Stale task identification
- VACUUM ANALYZE recommendations
- Database maintenance scheduling

### 5. Schema Management
- Safe migration planning
- Rollback script generation
- Schema change validation
- Table relationship mapping
- Documentation generation

## Quick Start

### Activate the Skill

In Claude Code, simply mention Supabase-related tasks:

```
"Check Supabase health"
"Optimize database performance"
"Review RLS policies"
"Clean up old logs"
"Analyze table usage"
```

### Run Scripts Directly

```bash
# Health check
npx tsx .claude/skills/supabase-expert/scripts/health-check.ts

# Performance audit
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts

# Cleanup (dry run)
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts --dry-run

# Cleanup (live)
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts
```

## Files & Structure

```
.claude/skills/supabase-expert/
├── SKILL.md                      # Main skill definition
├── README.md                     # This file
├── QUICK-REFERENCE.md            # Quick commands and examples
├── scripts/
│   ├── health-check.ts           # Comprehensive health monitoring
│   ├── performance-audit.ts      # Performance analysis
│   └── cleanup-maintenance.ts    # Automated cleanup
└── templates/
    └── rls-policies.sql          # RLS policy templates
```

## Database Overview

### Tables (15 Total)

**Critical Production Tables (6):**
1. `businesses` - Core business registry
2. `integration_logs` - All integration monitoring
3. `workflow_execution_logs` - n8n workflow tracking
4. `tasks` - Task automation system
5. `task_logs` - Task audit trail
6. `api_metrics` - Performance monitoring

**Agent Tables (9):**
7. `lighthouse_audits` - Web performance
8. `theme_changes` - Theme modifications
9. `accessibility_audits` - WCAG compliance
10. `seo_implementation_tasks` - SEO tracking
11. `deployment_history` - Deployments
12. `agent_activity_log` - Agent operations
13. `performance_trends` - Historical trends
14. `performance_alerts` - Performance issues
15. `performance_budgets` - Performance thresholds

### Views (21 Total)

See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#useful-views) for complete list.

### Functions (9 Total)

Key stored procedures:
- `create_task_with_log()` - Atomic task creation
- `log_task_action()` - Task logging
- `update_task_status()` - Status updates
- `get_tasks_for_retry()` - Retry logic
- `mark_task_needs_fix()` - Error handling
- `cleanup_old_logs()` - Log retention
- `get_error_rate()` - Error monitoring
- `get_business_stats()` - Business metrics

## Common Use Cases

### Daily Health Check

```bash
npx tsx .claude/skills/supabase-expert/scripts/health-check.ts
```

**Checks:**
- Database connectivity
- Business data integrity
- Integration health (last 24h)
- Workflow performance
- Task status
- Stale integrations

**Output:** JSON report with overall status (healthy/warning/critical)

### Weekly Maintenance

```bash
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts
```

**Performs:**
- Cleanup logs >30 days (integration_logs, api_metrics)
- Cleanup workflow logs >90 days
- Identify orphaned records
- Find stale tasks
- Generate maintenance recommendations

### Monthly Performance Review

```bash
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts
```

**Analyzes:**
- Table sizes and bloat
- Missing indexes
- JSONB column usage
- Query patterns
- Growth trends

**Generates:**
- Optimization recommendations
- Migration SQL file
- Performance report

### Security Audit

Review and apply RLS policies:

```bash
cat .claude/skills/supabase-expert/templates/rls-policies.sql
```

**Reviews:**
- Current RLS status (disabled on production tables)
- Access patterns (service role vs authenticated)
- Business-level isolation
- Policy recommendations

## Integration with n8n

### Automated Health Checks

Create an n8n workflow that runs every 6 hours:

```
Cron Trigger (6h)
  → Execute Command (health-check.ts)
  → IF (status != healthy)
    → Slack Alert
```

### Weekly Cleanup

```
Cron Trigger (weekly)
  → Execute Command (cleanup-maintenance.ts)
  → Log Results
```

See [QUICK-REFERENCE.md](./QUICK-REFERENCE.md#n8n-integration) for workflow templates.

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Integration error rate (24h) | >10% | >25% |
| Workflow failure rate (24h) | >10% | >20% |
| Stale integrations | >24h | >48h |
| Failed tasks | >5 | >10 |

## Known Issues & Roadmap

### Current Issues (High Priority)

1. **RLS Disabled** - All production tables accessible without policies
   - Impact: Security risk
   - Plan: Implement policies with service role full access

2. **Weak Foreign Keys** - business_id fields are TEXT instead of UUID FK
   - Impact: Data integrity risk
   - Plan: Migration to add proper FK constraints

3. **No Automated Cleanup** - cleanup_old_logs exists but not scheduled
   - Impact: Unbounded log growth
   - Plan: Set up n8n weekly cleanup workflow

4. **Missing JSONB Indexes** - Heavy JSON columns without GIN indexes
   - Impact: Slow queries on JSON fields
   - Plan: Add GIN indexes on frequently queried paths

### Medium Priority

5. **Agent Tables Underutilized** - 9 tables prepared but limited usage
6. **No Table Partitioning** - High-write tables could benefit
7. **Orphaned Logs** - No CASCADE relationships

### Roadmap

**Phase 1: Security** (Week 1)
- Implement RLS policies
- Test with different roles
- Update automation to use appropriate keys

**Phase 2: Performance** (Week 2-3)
- Add missing indexes
- Optimize JSONB queries
- Implement cleanup automation

**Phase 3: Data Integrity** (Week 4)
- Add FK constraints
- Implement CASCADE rules
- Clean up orphaned records

**Phase 4: Monitoring** (Week 5-6)
- Set up automated health checks
- Configure alerts
- Deploy dashboards

## Best Practices

1. **Always run dry-run first** for cleanup operations
2. **Test RLS policies** in non-production before applying
3. **Create migration files** for all schema changes
4. **Monitor impact** of optimizations with before/after metrics
5. **Schedule maintenance** during low-traffic periods
6. **Keep rollback plans** ready for critical changes
7. **Document all manual queries** executed
8. **Communicate changes** to all stakeholders

## Emergency Contacts

**Database Issues:**
- Check Supabase status: https://status.supabase.com
- Dashboard: https://app.supabase.com/project/qcvfxxsnqvdfmpbcgdni

**Integration Issues:**
- n8n: https://automation.growthcohq.com
- HubSpot: Check API status
- Review integration_logs for error patterns

## Additional Resources

- [Main Skill Documentation](./SKILL.md)
- [Quick Reference](./QUICK-REFERENCE.md)
- [RLS Policy Templates](./templates/rls-policies.sql)
- [Schema Files](../../infra/supabase/)
- [Test Scripts](../../scripts/tests/)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)

## Support

For issues or questions:
1. Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for common solutions
2. Review logs in `logs/supabase-*.json`
3. Run health check to diagnose issues
4. Activate the supabase-expert skill in Claude Code

---

**Last Updated:** 2025-11-20
**Skill Version:** 1.0.0
**Database:** qcvfxxsnqvdfmpbcgdni.supabase.co
