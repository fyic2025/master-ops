# Supabase Expert Skill - Implementation Summary

> Comprehensive Supabase database expert for master-ops

## ✅ What Was Created

### 1. Main Skill Definition
**File:** [SKILL.md](./SKILL.md)

A comprehensive skill that covers:
- Health monitoring and alerting
- Performance optimization
- Security auditing (RLS policies)
- Schema migrations
- Automated cleanup and maintenance

**Activation triggers:**
- "check supabase health"
- "optimize database"
- "review RLS policies"
- "supabase performance"
- "database migration"
- "cleanup old logs"
- And more...

### 2. Automated Scripts

#### [scripts/health-check.ts](./scripts/health-check.ts)
**Purpose:** Daily health monitoring across all 4 businesses

**Checks:**
- Database connectivity
- Business data integrity (4 businesses expected)
- Integration health (last 24h) - error rates by source
- Workflow performance - success/failure rates
- Task status - pending, in_progress, failed, needs_fix
- Stale integrations (>24h inactive)

**Output:**
- Console summary with emoji status indicators
- JSON report: `logs/supabase-health-check.json`
- Exit code: 0 (healthy/warning) or 1 (critical)

**Usage:**
```bash
npx tsx .claude/skills/supabase-expert/scripts/health-check.ts
```

#### [scripts/performance-audit.ts](./scripts/performance-audit.ts)
**Purpose:** Monthly performance analysis and optimization

**Analyzes:**
- Table sizes and row counts for all 15 tables
- Missing indexes on foreign keys and common query patterns
- JSONB column usage (details_json, metadata, plan_json)
- Growth trends and recommendations

**Output:**
- Performance report with recommendations
- JSON results: `logs/supabase-performance-audit.json`
- **Auto-generated migration file:** `infra/supabase/migrations/performance-optimization.sql`

**Usage:**
```bash
npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts
```

#### [scripts/cleanup-maintenance.ts](./scripts/cleanup-maintenance.ts)
**Purpose:** Weekly automated cleanup and maintenance

**Performs:**
- Cleanup old logs (configurable retention: 30/90/30 days)
- Identifies orphaned task_logs (tasks no longer exist)
- Finds stale workflow logs (>6 months)
- Reports stale tasks (pending/in_progress >7 days)
- Provides VACUUM ANALYZE recommendations

**Output:**
- Summary of deleted records
- List of orphaned/stale records
- JSON report: `logs/supabase-cleanup.json`

**Usage:**
```bash
# Dry run (preview only)
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts --dry-run

# Live execution
npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts
```

### 3. Templates

#### [templates/rls-policies.sql](./templates/rls-policies.sql)
**Purpose:** Row Level Security policy templates for all tables

**Includes:**
- RLS policies for 6 critical production tables
- Service role full access (for n8n, automation)
- Authenticated user read access
- Business-level data isolation patterns
- Verification queries
- Rollback scripts for emergencies

**Coverage:**
- businesses
- integration_logs
- workflow_execution_logs
- api_metrics
- tasks
- task_logs
- Agent tables (lighthouse_audits, etc.)

### 4. Documentation

#### [README.md](./README.md)
Main skill documentation covering:
- Overview of capabilities
- Quick start guide
- Database overview (15 tables, 21 views, 9 functions)
- Common use cases
- Integration with n8n
- Known issues and roadmap
- Best practices

#### [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
Quick commands and examples:
- Health check commands
- Performance audit
- Cleanup & maintenance
- Common monitoring queries
- Troubleshooting guides
- n8n workflow templates
- Emergency procedures

#### [../../docs/SUPABASE-EXPERT-GUIDE.md](../../docs/SUPABASE-EXPERT-GUIDE.md)
Getting started guide for all team members:
- What is the Supabase Expert skill?
- Why do we need it?
- How to use it (2 methods)
- Common workflows (daily, weekly, monthly, quarterly)
- Understanding the output
- Troubleshooting common issues
- Automation setup
- Advanced usage

## 📊 Database Coverage

### Tables Monitored (15 Total)

**Critical Production (6):**
1. businesses
2. integration_logs
3. workflow_execution_logs
4. tasks
5. task_logs
6. api_metrics

**Agent Tables (9):**
7. lighthouse_audits
8. theme_changes
9. accessibility_audits
10. seo_implementation_tasks
11. deployment_history
12. agent_activity_log
13. performance_trends
14. performance_alerts
15. performance_budgets

### Views Used (21 Total)

**Task & Workflow:**
- tasks_with_latest_log
- tasks_needing_attention
- recent_errors
- recent_workflow_failures
- workflow_performance_summary

**Integration Health:**
- integration_health_summary
- api_performance_summary
- business_integration_health

**Business Analytics:**
- business_activity
- business_error_summary
- business_performance_comparison
- business_workflow_executions
- daily_operations_summary
- weekly_business_report
- hubspot_sync_status

**Agent & Performance:**
- latest_lighthouse_scores
- active_performance_alerts
- recent_deployments
- agent_performance_summary

**Alerts:**
- businesses_needing_attention
- stale_integrations

### Functions Leveraged (9 Total)

- create_task_with_log()
- log_task_action()
- update_task_status()
- get_tasks_for_retry()
- mark_task_needs_fix()
- cleanup_old_logs() ⭐ (used by cleanup script)
- get_error_rate() ⭐ (used by health check)
- get_business_stats() ⭐ (used by health check)
- update_updated_at_column()

## 🎯 Capabilities

### 1. Health Monitoring ✅
- Real-time connectivity checks
- Integration error rate tracking (24h)
- Workflow success/failure rates
- Task status monitoring
- Stale integration detection
- Business-level health metrics

### 2. Performance Optimization ✅
- Table size and bloat analysis
- Missing index identification
- JSONB column optimization recommendations
- Auto-generated migration files
- Growth trend analysis

### 3. Security Auditing ✅
- RLS policy review (currently disabled on production tables)
- Access control assessment
- Service role vs authenticated user patterns
- Business-level data isolation
- Foreign key constraint validation

### 4. Automated Cleanup ✅
- Log retention enforcement (30/90/30 days)
- Orphaned record detection
- Stale task identification
- VACUUM ANALYZE recommendations

### 5. Schema Management ✅
- Migration file generation
- RLS policy templates
- Rollback scripts
- Safe schema change guidance

## 🚀 Recommended Implementation Schedule

### Week 1: Setup & Testing
- ✅ Skill created and documented
- ⏳ Install dependencies if needed (`@supabase/supabase-js`)
- ⏳ Test health check script
- ⏳ Test performance audit script
- ⏳ Test cleanup script with --dry-run

### Week 2: Automation
- ⏳ Create n8n workflow for health checks (every 6 hours)
- ⏳ Create n8n workflow for weekly cleanup (Sunday 2 AM)
- ⏳ Set up Slack alerts for critical issues
- ⏳ Test automated workflows

### Week 3: Performance Optimization
- ⏳ Run performance audit
- ⏳ Review generated migration file
- ⏳ Test indexes in Supabase dashboard
- ⏳ Apply recommended indexes
- ⏳ Monitor impact

### Week 4: Security Review
- ⏳ Review RLS policy templates
- ⏳ Test policies in non-production
- ⏳ Plan RLS implementation
- ⏳ Document access patterns

### Month 2+: Ongoing Maintenance
- Daily: Automated health checks
- Weekly: Automated cleanup
- Monthly: Performance review
- Quarterly: Security audit

## 🔧 Next Steps

### Immediate (This Week)
1. **Test Scripts Locally**
   ```bash
   # Install dependencies if needed
   npm install @supabase/supabase-js dotenv

   # Test health check
   npx tsx .claude/skills/supabase-expert/scripts/health-check.ts

   # Test performance audit
   npx tsx .claude/skills/supabase-expert/scripts/performance-audit.ts

   # Test cleanup (dry run)
   npx tsx .claude/skills/supabase-expert/scripts/cleanup-maintenance.ts --dry-run
   ```

2. **Review Documentation**
   - Read [SUPABASE-EXPERT-GUIDE.md](../../docs/SUPABASE-EXPERT-GUIDE.md)
   - Familiarize with [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
   - Understand alert thresholds

3. **Plan Automation**
   - Design n8n health check workflow
   - Design n8n cleanup workflow
   - Set up Slack notification channel

### Short-term (Next 2 Weeks)
4. **Implement Automation**
   - Deploy n8n health check workflow (every 6h)
   - Deploy n8n cleanup workflow (weekly)
   - Configure Slack alerts
   - Test end-to-end

5. **First Performance Review**
   - Run performance audit
   - Review recommendations
   - Apply critical indexes
   - Monitor impact

### Medium-term (Next Month)
6. **Security Implementation**
   - Review RLS policy templates
   - Test policies in dashboard
   - Plan rollout strategy
   - Document service account usage

7. **Foreign Key Constraints**
   - Plan migration for business_id TEXT → UUID FK
   - Test migration in non-production
   - Schedule deployment
   - Monitor impact

### Long-term (Next Quarter)
8. **Advanced Optimization**
   - Implement table partitioning for high-write tables
   - Set up materialized views for dashboards
   - Optimize JSONB query patterns
   - Capacity planning for growth

9. **Table Rationalization**
   - Review agent table usage
   - Decide: activate, archive, or remove unused tables
   - Document intended usage
   - Clean up if needed

## 📈 Success Metrics

Track these metrics to measure success:

### Health Metrics
- Overall health status (healthy/warning/critical)
- Integration error rate (target: <5%)
- Workflow success rate (target: >95%)
- Stale integrations (target: 0)

### Performance Metrics
- Query response times (before/after optimization)
- Table sizes and growth rate
- Index usage statistics
- VACUUM effectiveness

### Maintenance Metrics
- Log cleanup effectiveness (GB freed per week)
- Orphaned record count
- Stale task count
- Automation uptime

### Security Metrics
- RLS policy coverage (target: 100% of production tables)
- Service account audit compliance
- Foreign key constraint coverage
- Access pattern documentation

## 🎓 Training Resources

For team members using this skill:

1. **Start Here:** [SUPABASE-EXPERT-GUIDE.md](../../docs/SUPABASE-EXPERT-GUIDE.md)
2. **Quick Commands:** [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
3. **Deep Dive:** [SKILL.md](./SKILL.md)
4. **Schema Reference:** [../../infra/supabase/](../../infra/supabase/)

## 🆘 Support

**For issues with the skill:**
- Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) troubleshooting section
- Review health check logs in `logs/`
- Activate skill in Claude Code: "Help me debug Supabase"

**For database emergencies:**
- Supabase status: https://status.supabase.com
- Dashboard: https://app.supabase.com/project/qcvfxxsnqvdfmpbcgdni
- Run immediate health check
- Review emergency procedures in [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

## 📝 Version History

**v1.0.0** (2025-11-20)
- Initial implementation
- 3 automated scripts (health, performance, cleanup)
- RLS policy templates
- Comprehensive documentation
- n8n integration templates

---

**Created By:** Claude Code
**Date:** 2025-11-20
**Maintained By:** Development Team
**Database:** qcvfxxsnqvdfmpbcgdni.supabase.co
**Businesses:** Teelixir, Elevate Wholesale, Buy Organics Online, Red Hill Fresh
