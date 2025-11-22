# Performance Monitoring

Real-time performance monitoring and analysis for the master-ops system.

## Features

- **System-Wide Analysis**: Monitor all services and integrations
- **Service-Specific Monitoring**: Deep dive into individual service performance
- **Trend Detection**: Identify performance improvements or degradations
- **Health Scoring**: Get an overall system health score (0-100)
- **Automatic Alerts**: Send Slack/email alerts when issues detected
- **Customizable Thresholds**: Set response time thresholds
- **Multiple Output Formats**: Text reports or JSON for automation

## Quick Start

### System-Wide Performance Report

```bash
# Last 24 hours (default)
npx tsx tools/performance-monitoring/monitor.ts

# Last 7 days
npx tsx tools/performance-monitoring/monitor.ts --hours 168

# With alerts enabled
npx tsx tools/performance-monitoring/monitor.ts --alert
```

### Service-Specific Monitoring

```bash
# Monitor HubSpot integration
npx tsx tools/performance-monitoring/monitor.ts --service hubspot

# Monitor with custom threshold (1 second)
npx tsx tools/performance-monitoring/monitor.ts --service hubspot --threshold 1000

# Last 48 hours
npx tsx tools/performance-monitoring/monitor.ts --service hubspot --hours 48
```

### JSON Output for Automation

```bash
# Get JSON output for programmatic use
npx tsx tools/performance-monitoring/monitor.ts --format json > report.json

# Parse with jq
npx tsx tools/performance-monitoring/monitor.ts --format json | jq '.healthScore'
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--service <name>` | Monitor specific service (hubspot, unleashed, n8n, etc.) | All services |
| `--hours <n>` | Number of hours to analyze | 24 |
| `--threshold <ms>` | Response time threshold in milliseconds | 2000 |
| `--format <type>` | Output format: `text` or `json` | text |
| `--alert` | Send Slack/email alerts if issues detected | false |

## Metrics Explained

### Operations Metrics

- **Total Operations**: Number of API calls/operations in the period
- **Success Rate**: Percentage of successful operations
- **Failed Operations**: Number of failed operations

### Performance Metrics

- **Avg Duration**: Average response time
- **P50 Duration**: Median response time (50th percentile)
- **P95 Duration**: 95th percentile response time
- **P99 Duration**: 99th percentile response time
- **Min/Max Duration**: Fastest and slowest operations

### Error Metrics

- **Error Rate**: Percentage of failed operations
- **Top Errors**: Most frequent error messages

### Trend Analysis

- **Direction**: Performance trend compared to previous period
  - 🟢 **Improving**: >10% faster than previous period
  - 🔴 **Degrading**: >10% slower than previous period
  - ➡️ **Stable**: Within ±10% of previous period
- **Percent Change**: Percentage change in average duration

### Health Score

System health score (0-100) calculated based on:

- **Error Rate**: Deducts up to 30 points
  - 0-5% errors: Minimal impact
  - 5-15% errors: Moderate impact
  - >15% errors: High impact

- **Performance**: Deducts up to 30 points
  - Within threshold: No impact
  - Above threshold: Proportional deduction
  - 2x threshold: Maximum deduction

- **Service Issues**: Deducts up to 20 points
  - Each service with issues: -10 points

Score interpretation:
- 🟢 **90-100**: Excellent
- 🟡 **70-89**: Good
- 🔴 **<70**: Needs attention

## Sample Output

```
================================================================================
PERFORMANCE MONITORING REPORT
================================================================================

Period: 2025-11-19T10:00:00.000Z - 2025-11-20T10:00:00.000Z
Health Score: 87/100 🟡

--------------------------------------------------------------------------------
OVERALL METRICS
--------------------------------------------------------------------------------
Total Operations: 1,247
Average Duration: 456ms
Error Rate: 2.31%

--------------------------------------------------------------------------------
ISSUES
--------------------------------------------------------------------------------
❌ HubSpot P95 duration above threshold: 1850ms

--------------------------------------------------------------------------------
RECOMMENDATIONS
--------------------------------------------------------------------------------
💡 Optimize slow HubSpot operations
💡 Monitor error trends for supabase service

--------------------------------------------------------------------------------
SERVICE PERFORMANCE
--------------------------------------------------------------------------------
✅ hubspot 📈
   Operations: 523 (97.5% success)
   Avg Duration: 450ms
   P95 Duration: 1850ms
   Error Rate: 2.5%
   Trend: improving (-8.2%)

✅ unleashed ➡️
   Operations: 412 (98.1% success)
   Avg Duration: 680ms
   P95 Duration: 1200ms
   Error Rate: 1.9%
   Trend: stable (+2.1%)

⚠️ n8n 📉
   Operations: 312 (94.2% success)
   Avg Duration: 1200ms
   P95 Duration: 3400ms
   Error Rate: 5.8%
   Trend: degrading (+15.3%)
   Issues: High error rate, Performance degrading

--------------------------------------------------------------------------------
SLOWEST OPERATIONS
--------------------------------------------------------------------------------
1. hubspot:contacts.batch
   Avg: 2340ms (45 calls)

2. unleashed:salesOrders.create
   Avg: 1890ms (38 calls)

3. n8n:workflows.execute
   Avg: 1650ms (52 calls)

--------------------------------------------------------------------------------
MOST FREQUENT ERRORS
--------------------------------------------------------------------------------
1. [hubspot] Rate limit exceeded (12 times)
2. [n8n] Workflow execution timeout (8 times)
3. [unleashed] Connection timeout (6 times)

================================================================================
```

## Use Cases

### 1. Daily Health Check

Run daily to verify system health:

```bash
#!/bin/bash
# daily-health-check.sh

HEALTH_SCORE=$(npx tsx tools/performance-monitoring/monitor.ts --format json | jq '.healthScore')

if (( $(echo "$HEALTH_SCORE < 70" | bc -l) )); then
  echo "⚠️ Low health score: $HEALTH_SCORE"
  npx tsx tools/performance-monitoring/monitor.ts --alert
else
  echo "✅ System healthy: $HEALTH_SCORE"
fi
```

### 2. Pre-Deployment Baseline

Capture performance before deployments:

```bash
# Before deployment
npx tsx tools/performance-monitoring/monitor.ts --format json > pre-deploy-baseline.json

# After deployment
npx tsx tools/performance-monitoring/monitor.ts --format json > post-deploy-baseline.json

# Compare
jq '.overall.avgDuration' pre-deploy-baseline.json
jq '.overall.avgDuration' post-deploy-baseline.json
```

### 3. Continuous Monitoring

Run every hour and alert on issues:

```bash
# Add to cron: 0 * * * *
*/5 * * * * cd /path/to/master-ops && npx tsx tools/performance-monitoring/monitor.ts --hours 1 --alert >> /var/log/performance.log 2>&1
```

### 4. Service-Specific Investigation

Deep dive into problematic service:

```bash
# Identify slow service
npx tsx tools/performance-monitoring/monitor.ts

# Investigate further
npx tsx tools/performance-monitoring/monitor.ts --service hubspot --hours 72 --threshold 1000

# Check recent errors
ops logs --source=hubspot --errors-only -n 50
```

### 5. Weekly Performance Report

Generate and email weekly reports:

```bash
#!/bin/bash
# weekly-report.sh

REPORT=$(npx tsx tools/performance-monitoring/monitor.ts --hours 168)

echo "$REPORT" | mail -s "Weekly Performance Report" ops@example.com
```

## Alerting

When `--alert` is enabled, alerts are sent via Slack and email if:

- Health score < 70
- Error rate > 10%
- Average duration > threshold
- Performance degrading > 10%

Configure alerting in `.env`:

```env
# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=alerts@example.com
EMAIL_PASS=your-password
EMAIL_FROM=Master Ops <alerts@example.com>
EMAIL_TO=ops-team@example.com
```

## Integration with Dashboards

### Grafana

Query the JSON output and visualize:

```bash
# Export metrics to file for Grafana
npx tsx tools/performance-monitoring/monitor.ts --format json > /var/www/grafana/performance.json
```

### Custom Dashboards

Parse JSON programmatically:

```typescript
import { exec } from 'child_process'

const output = await exec('npx tsx tools/performance-monitoring/monitor.ts --format json')
const metrics = JSON.parse(output)

console.log(`Health Score: ${metrics.healthScore}`)
console.log(`Error Rate: ${metrics.overall.errorRate}%`)

metrics.services.forEach(service => {
  console.log(`${service.service}: ${service.performance.avgDuration}ms`)
})
```

## Troubleshooting

### No Data

If no operations are found:

```bash
# Check if logs exist
ops logs -n 10

# Verify date range
npx tsx tools/performance-monitoring/monitor.ts --hours 720  # Last 30 days
```

### Slow Performance

For large datasets:

- Reduce time range: `--hours 1`
- Monitor specific service: `--service hubspot`
- Ensure database indexes are created (see schema files)

### High Health Score Despite Issues

Health score is a composite metric. Check individual service metrics and issues list for specific problems.

## Best Practices

1. **Regular Monitoring**: Run hourly or daily
2. **Set Realistic Thresholds**: Adjust `--threshold` based on your SLAs
3. **Trend Analysis**: Compare reports over time to identify patterns
4. **Alert Tuning**: Start with higher thresholds and tune down
5. **Baseline Establishment**: Capture normal performance for comparison
6. **Integration**: Include in CI/CD pipeline for regression detection

## Related Tools

- `ops stats` - Quick performance statistics
- `ops logs` - View detailed operation logs
- `ops health-check` - Service connectivity checks
- Monitoring dashboards (see [infra/supabase/monitoring-dashboards.sql](../../infra/supabase/monitoring-dashboards.sql))

## Related Documentation

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [RUNBOOK.md](../../RUNBOOK.md) - Operations procedures
- [Monitoring Dashboards](../../infra/supabase/monitoring-dashboards.sql) - SQL queries

---

**Last Updated**: 2025-11-20
