---
title: Master-Ops Operations Runbook
description: Troubleshooting guide and operational procedures
last_updated: 2025-11-20
---

# Master-Ops Operations Runbook

Quick reference for common issues, debugging procedures, and operational tasks.

---

## 🚨 Emergency Response

### System-Wide Outage

**Symptoms**: Multiple services failing, high error rates

**Immediate Actions**:
```bash
# 1. Check system health
ops health-check --verbose

# 2. View recent errors
ops logs --errors-only -n 50

# 3. Check specific services
ops test-integration supabase
ops test-integration hubspot
ops test-integration n8n
```

**Resolution Steps**:
1. Identify failing service from health check
2. Check service status pages (Supabase, HubSpot, n8n)
3. Verify API credentials in `.env`
4. Check for rate limiting issues
5. Review recent deployments or changes
6. Escalate if infrastructure issue

**Prevention**:
- Set up automated health checks (every 5 min)
- Configure alerts for critical services
- Maintain backup credentials

---

### High Error Rate

**Symptoms**: Error rate > 10% for a service

**Detection**:
```bash
# Check error rates
ops stats

# View errors by source
ops logs --source=hubspot --errors-only
```

**Common Causes & Solutions**:

1. **Rate Limiting**
   ```bash
   # Check for rate limit errors
   ops logs | grep "rate limit"

   # Solution: Automatic via connectors, but check limits
   # HubSpot: 100 req/10sec
   # Unleashed: 300 req/5min
   ```

2. **Invalid Credentials**
   ```bash
   # Test authentication
   ops test-integration hubspot

   # Update credentials in .env if needed
   # Restart affected services
   ```

3. **API Changes**
   ```bash
   # Check recent errors for clues
   ops logs --errors-only -n 20

   # Review API documentation for breaking changes
   # Update connector if needed
   ```

4. **Data Validation Errors**
   ```bash
   # Check validation errors
   ops db:query integration_logs --filter=level=error | grep validation

   # Review and fix data format
   ```

---

## 🔍 Debugging Procedures

### Debugging Failed Integration

**Step 1: Identify the Issue**
```bash
# Get recent errors for service
ops logs --source=<service> --errors-only -n 20

# Check integration health
ops test-integration <service>
```

**Step 2: Check Logs in Supabase**
```sql
-- Get detailed error information
SELECT
  created_at,
  operation,
  message,
  details_json
FROM integration_logs
WHERE source = '<service>'
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**Step 3: Reproduce Locally**
```bash
# Run example script
npm run example:hubspot  # or relevant service

# Check if issue reproduces
# Review error details
```

**Step 4: Fix and Verify**
```bash
# Apply fix
# Test integration
ops test-integration <service>

# Monitor for 15 minutes
ops logs --source=<service> --tail
```

---

### Debugging Failed Workflow

**Symptoms**: n8n workflow not executing or failing

**Step 1: Check Workflow Status**
```bash
# View workflow performance
ops workflows

# Check for failures
ops workflows --failures
```

**Step 2: Check Execution Logs**
```sql
-- Get workflow execution details
SELECT
  execution_id,
  status,
  error_message,
  error_details_json,
  nodes_executed,
  nodes_failed,
  started_at,
  finished_at
FROM workflow_execution_logs
WHERE workflow_id = '<workflow-id>'
ORDER BY started_at DESC
LIMIT 10;
```

**Step 3: Check n8n UI**
1. Open n8n: http://your-n8n-url
2. Go to Executions
3. Find failed execution
4. Review error details
5. Check node configuration

**Step 4: Common Issues**

- **Workflow not triggering**: Check trigger configuration, cron expression
- **Credential errors**: Verify credentials in n8n settings
- **Timeout errors**: Increase timeout in node settings
- **Data mapping errors**: Check JSON path expressions

---

### Debugging Slow Performance

**Symptoms**: High response times, operations taking too long

**Step 1: Check Performance Metrics**
```bash
# View statistics
ops stats

# Check specific service
ops logs --source=<service> -n 100 | grep "duration"
```

**Step 2: Identify Bottleneck**
```sql
-- Find slow operations
SELECT
  source,
  operation,
  COUNT(*) as count,
  ROUND(AVG(duration_ms), 0) as avg_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) as p95_ms,
  MAX(duration_ms) as max_ms
FROM integration_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND duration_ms IS NOT NULL
GROUP BY source, operation
HAVING AVG(duration_ms) > 1000
ORDER BY avg_ms DESC;
```

**Step 3: Optimize**

- **Slow API calls**: Check if API endpoint is slow, optimize query parameters
- **Database queries**: Add indexes, optimize queries
- **Network issues**: Check connectivity, latency to service
- **Rate limiting backoff**: Normal when hitting limits
- **Large payloads**: Reduce data size, use pagination

---

## 📋 Common Tasks

### Restart Failed Workflow

```bash
# Method 1: Via CLI
ops db:query workflow_execution_logs --filter=status=error --limit=1

# Method 2: Via n8n UI
# 1. Open n8n
# 2. Go to Executions
# 3. Find failed execution
# 4. Click "Retry"

# Method 3: Via API
curl -X POST http://your-n8n/api/v1/executions/<id>/retry \
  -H "X-N8N-API-KEY: your-key"
```

---

### Rotate API Credentials

**HubSpot**:
```bash
# 1. Generate new token in HubSpot dashboard
# 2. Update .env
HUBSPOT_ACCESS_TOKEN=new-token

# 3. Test connection
ops test-integration hubspot

# 4. No restart needed (env loaded on each run)
```

**Unleashed**:
```bash
# 1. Get new API ID and Key from Unleashed
# 2. Update .env
UNLEASHED_API_ID=new-id
UNLEASHED_API_KEY=new-key

# 3. Test connection
ops test-integration unleashed
```

**n8n**:
```bash
# 1. Generate new API key in n8n settings
# 2. Update .env
N8N_API_KEY=new-key

# 3. Test connection
ops test-integration n8n

# 4. Update n8n workflows using API (if needed)
```

---

### Clear Old Logs

```bash
# Via SQL
psql $DATABASE_URL << SQL
SELECT cleanup_old_logs(
  30,  -- integration logs retention (days)
  90,  -- workflow logs retention (days)
  30   -- API metrics retention (days)
);
SQL

# Verify deletion
ops db:query integration_logs --limit=1
```

---

### Manual Business Sync

```bash
# Sync all businesses
npm run example:sync

# Sync specific business
npx tsx examples/02-sync-business-to-hubspot.ts --business=teelixir

# Verify sync
ops db:query businesses
ops logs --source=hubspot --operation=syncBusiness
```

---

### Check Integration Health

```bash
# Full health check
ops health-check --verbose

# Specific service
ops test-integration supabase
ops test-integration hubspot
ops test-integration n8n

# View health history
ops db:query integration_logs --filter=operation=health_check
```

---

## ⚡ Quick Fixes

### "No logs appearing in Supabase"

```bash
# Check service role key
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify schema exists
ops db:query integration_logs --limit=1

# Test manual logging
npx tsx << 'EOF'
import { logger } from './shared/libs/logger'
logger.info('Test log', { source: 'system' })
EOF

# Check logs
ops logs -n 10
```

---

### "Rate limit exceeded"

This is handled automatically by connectors, but if you see errors:

```bash
# Check rate limit status
ops logs | grep "rate limit"

# Connectors automatically:
# - Wait and retry with exponential backoff
# - Never exceed service limits
# - Log when approaching limits

# If persistent, check:
# 1. Are you running multiple instances?
# 2. Is another service using same credentials?
# 3. Contact service support to increase limits
```

---

### "Connection timeout"

```bash
# Check network connectivity
ping api.hubapi.com
ping api.unleashedsoftware.com

# Check firewall rules
# Ensure outbound HTTPS (443) allowed

# Increase timeout in connector (if needed)
# Default: 30 seconds
```

---

### "Workflow not triggering"

```bash
# Check if workflow is active
# Method 1: Via CLI
ops workflows | grep "workflow-name"

# Method 2: Via n8n UI
# Ensure toggle is ON

# Check cron expression
# Use: https://crontab.guru/ to validate

# Check n8n logs
docker logs master-ops-n8n  # if using Docker
# or
ops db:query workflow_execution_logs --filter=workflow_id=<id>
```

---

## 📊 Monitoring Procedures

### Daily Health Check

```bash
#!/bin/bash
# Add to cron: 0 9 * * * /path/to/daily-health-check.sh

# Run health check
npm run health > /tmp/health-report.txt

# Check for failures
if [ $? -ne 0 ]; then
  # Send alert
  cat /tmp/health-report.txt | mail -s "Health Check Failed" admin@example.com
fi

# Run stats
npm run stats > /tmp/stats-report.txt

# Archive
cat /tmp/health-report.txt /tmp/stats-report.txt >> /var/log/daily-health.log
```

---

### Weekly Review

```bash
# 1. Review weekly performance
ops db:query weekly_business_report

# 2. Check for trends
ops db:query workflow_performance_summary

# 3. Review error patterns
ops logs --errors-only -n 100 | sort | uniq -c

# 4. Check capacity
ops db:query integration_logs | wc -l  # Total logs
```

---

### Monthly Maintenance

```bash
# 1. Clean up old logs
SELECT cleanup_old_logs(30, 90, 30);

# 2. Vacuum database
VACUUM ANALYZE integration_logs;
VACUUM ANALYZE workflow_execution_logs;
VACUUM ANALYZE api_metrics;

# 3. Review and rotate credentials
# - Check expiration dates
# - Rotate if > 90 days old

# 4. Update dependencies
npm outdated
npm update

# 5. Review and update documentation
# - Update runbooks for new issues
# - Document new procedures
```

---

## 🔐 Security Procedures

### Suspected Credential Compromise

**Immediate Actions**:
1. Rotate affected credentials immediately
2. Review access logs for suspicious activity
3. Check for unauthorized changes
4. Enable additional security (2FA, IP whitelist)

**HubSpot**:
```bash
# 1. Revoke token in HubSpot dashboard
# 2. Generate new token
# 3. Update .env
# 4. Restart services using HubSpot
# 5. Review audit logs in HubSpot
```

**Supabase**:
```bash
# 1. Go to Supabase dashboard → Settings → API
# 2. Reset service role key
# 3. Update .env and n8n credentials
# 4. Test all connections
ops test-integration supabase
```

---

### Data Breach Response

1. **Identify Scope**: Which data was accessed?
2. **Contain**: Rotate all credentials
3. **Investigate**: Review logs for unauthorized access
4. **Notify**: Inform affected parties if required
5. **Prevent**: Implement additional security measures

---

## 📞 Escalation Procedures

### When to Escalate

- System-wide outage > 30 minutes
- Data loss or corruption
- Security breach or suspected compromise
- Service degradation affecting customers
- Critical workflow failures

### Escalation Contacts

```
Level 1 (Ops Team):
- Check runbook
- Apply quick fixes
- Monitor for 15 minutes

Level 2 (Development Team):
- Code changes needed
- Connector updates
- Custom debugging

Level 3 (Service Providers):
- HubSpot Support
- Supabase Support
- Infrastructure issues
```

---

## 📝 Change Management

### Before Making Changes

```bash
# 1. Test in development
npm run dev  # Start Docker environment
# Make changes
# Test thoroughly

# 2. Create backup
ops db:query businesses > backup-businesses.json
ops db:query integration_logs > backup-logs.json

# 3. Document changes
# Update CHANGELOG.md or relevant docs

# 4. Deploy during low-traffic period

# 5. Monitor post-deployment
ops health-check
ops logs --tail
```

---

### Rollback Procedure

```bash
# 1. Stop affected services
# docker-compose down (if using Docker)

# 2. Revert code changes
git revert <commit-hash>

# 3. Restore data if needed
# psql $DATABASE_URL < backup.sql

# 4. Restart services
# docker-compose up -d

# 5. Verify health
ops health-check
ops stats

# 6. Document incident
# Add to incident log
```

---

## 📚 Additional Resources

- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Examples**: [examples/README.md](examples/README.md)
- **Migration**: [MIGRATION-GUIDE.md](MIGRATION-GUIDE.md)
- **CLI Reference**: [tools/README.md](tools/README.md)

---

**Last Updated**: 2025-11-20
**Version**: 1.0
**Maintainer**: Operations Team
