---
name: dashboard-automation
description: Automated dashboard metrics, reporting, and alert management for ops.growthcohq.com. Handles metric population, scheduled reports, alert generation, n8n sync, and email distribution across all 5 businesses. Use for dashboard data issues, report generation, alert configuration, or metric automation.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Dashboard Automation Skill

Automated metrics, reporting, and monitoring for the centralized ops dashboard.

## When to Activate This Skill

Activate this skill when the user mentions:
- "dashboard metrics"
- "generate report"
- "daily summary"
- "update dashboard"
- "dashboard alerts"
- "sync dashboard"
- "health check dashboard"
- "ops dashboard"
- "metric automation"
- "report email"

## Dashboard Overview

### URL & Platform
- **URL**: https://ops.growthcohq.com
- **Tech Stack**: Next.js 14, React 18, Tailwind CSS, Supabase
- **Businesses**: Teelixir, BOO, Elevate, RHF, Infrastructure

### Key Features
- Job Monitoring (40+ tracked jobs)
- Integration Health Checks
- API Usage Tracking
- Business Metrics
- Alerts Management
- Multi-business Analytics

## Core Capabilities

### 1. Metric Population
- Daily revenue/order metrics
- Job status synchronization
- Health check updates
- API usage aggregation

### 2. Report Generation
- Daily operations summary
- Weekly business reports
- Monthly executive reports
- Custom date-range reports

### 3. Alert Management
- Automated alert generation
- Threshold monitoring
- Alert acknowledgment/resolution
- Notification routing

### 4. N8N Workflow Sync
- Sync workflow execution status
- Map n8n outcomes to job status
- Error aggregation

### 5. Email Distribution
- Scheduled report emails
- Alert notifications
- Custom report distribution

## Database Schema

### Dashboard Tables (Master Supabase)

```sql
-- Job status tracking
CREATE TABLE dashboard_job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL,  -- 'cron', 'n8n', 'edge_function', 'webhook'
  business TEXT NOT NULL,
  description TEXT,
  expected_frequency TEXT,  -- 'every_2h', 'every_6h', 'daily', 'weekly'
  last_run TIMESTAMPTZ,
  last_success TIMESTAMPTZ,
  last_error TEXT,
  status TEXT DEFAULT 'unknown',  -- 'healthy', 'stale', 'failed', 'unknown'
  enabled BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard alerts
CREATE TABLE dashboard_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  alert_type TEXT NOT NULL,  -- 'warning', 'error', 'info', 'success'
  title TEXT NOT NULL,
  message TEXT,
  source TEXT,  -- 'job_monitor', 'health_check', 'metric', 'manual'
  action_url TEXT,
  severity TEXT DEFAULT 'info',  -- 'low', 'medium', 'high', 'critical'
  is_read BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business metrics (daily aggregates)
CREATE TABLE dashboard_business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  metric_date DATE NOT NULL,
  orders_count INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2),
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  refunds DECIMAL(10,2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business, metric_date)
);

-- Integration health checks
CREATE TABLE dashboard_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  integration TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'healthy', 'degraded', 'down'
  response_time_ms INTEGER,
  last_check TIMESTAMPTZ DEFAULT NOW(),
  last_success TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  UNIQUE(business, integration)
);

-- Report history
CREATE TABLE dashboard_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,  -- 'daily_summary', 'weekly', 'monthly', 'custom'
  report_date DATE NOT NULL,
  business TEXT,  -- NULL for cross-business reports
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT,
  report_data JSONB NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_recipients TEXT[]
);
```

### Key Views

```sql
-- Today's metrics snapshot
CREATE VIEW v_dashboard_today AS
SELECT
  business,
  orders_count,
  revenue,
  avg_order_value,
  new_customers
FROM dashboard_business_metrics
WHERE metric_date = CURRENT_DATE;

-- Recent alerts (unread)
CREATE VIEW v_dashboard_alerts_recent AS
SELECT *
FROM dashboard_alerts
WHERE is_read = false
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY
  CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
  created_at DESC;

-- Job health summary
CREATE VIEW v_job_health_summary AS
SELECT
  status,
  COUNT(*) as count,
  ARRAY_AGG(job_name) as jobs
FROM dashboard_job_status
WHERE enabled = true
GROUP BY status;

-- Unhealthy jobs
CREATE VIEW v_unhealthy_jobs AS
SELECT *
FROM dashboard_job_status
WHERE status IN ('stale', 'failed', 'unknown')
  AND enabled = true
ORDER BY
  CASE status WHEN 'failed' THEN 1 WHEN 'stale' THEN 2 ELSE 3 END;
```

### Functions

```sql
-- Update job status based on timing
CREATE OR REPLACE FUNCTION update_job_status()
RETURNS VOID AS $$
BEGIN
  -- Mark as stale if overdue
  UPDATE dashboard_job_status
  SET status = 'stale', updated_at = NOW()
  WHERE enabled = true
    AND status = 'healthy'
    AND (
      (expected_frequency = 'every_2h' AND last_run < NOW() - INTERVAL '3 hours') OR
      (expected_frequency = 'every_6h' AND last_run < NOW() - INTERVAL '8 hours') OR
      (expected_frequency = 'daily' AND last_run < NOW() - INTERVAL '26 hours') OR
      (expected_frequency = 'weekly' AND last_run < NOW() - INTERVAL '8 days')
    );

  -- Mark as healthy if recently run
  UPDATE dashboard_job_status
  SET status = 'healthy', updated_at = NOW()
  WHERE enabled = true
    AND status IN ('stale', 'unknown')
    AND last_success > NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Refresh all job statuses
CREATE OR REPLACE FUNCTION refresh_job_statuses()
RETURNS TABLE(job_name TEXT, old_status TEXT, new_status TEXT) AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM dashboard_job_status WHERE enabled = true LOOP
    -- Return changes
    RETURN QUERY
    SELECT rec.job_name, rec.status::TEXT,
      CASE
        WHEN rec.last_error IS NOT NULL AND rec.last_run > rec.last_success THEN 'failed'
        WHEN rec.expected_frequency = 'every_2h' AND rec.last_run < NOW() - INTERVAL '3 hours' THEN 'stale'
        WHEN rec.expected_frequency = 'daily' AND rec.last_run < NOW() - INTERVAL '26 hours' THEN 'stale'
        ELSE 'healthy'
      END::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Task Execution Methodology

### Phase 1: Metric Population

#### Daily Metrics Update

```typescript
// scripts/populate-daily-metrics.ts
async function populateDailyMetrics(date: Date = new Date()): Promise<void> {
  const dateStr = date.toISOString().split('T')[0];

  for (const business of ['teelixir', 'boo', 'elevate', 'rhf']) {
    const metrics = await fetchBusinessMetrics(business, dateStr);

    await supabase.from('dashboard_business_metrics').upsert({
      business,
      metric_date: dateStr,
      orders_count: metrics.orders,
      revenue: metrics.revenue,
      avg_order_value: metrics.revenue / Math.max(metrics.orders, 1),
      new_customers: metrics.newCustomers,
      returning_customers: metrics.returningCustomers,
      refunds: metrics.refunds
    }, { onConflict: 'business,metric_date' });
  }
}

async function fetchBusinessMetrics(business: string, date: string): Promise<BusinessMetrics> {
  switch (business) {
    case 'teelixir':
      return fetchShopifyMetrics('teelixir', date);
    case 'boo':
      return fetchBigCommerceMetrics(date);
    case 'elevate':
      return fetchShopifyMetrics('elevate', date);
    case 'rhf':
      return fetchWooCommerceMetrics(date);
    default:
      return { orders: 0, revenue: 0, newCustomers: 0, returningCustomers: 0, refunds: 0 };
  }
}
```

#### Job Status Sync

```typescript
// scripts/sync-job-status.ts
async function syncJobStatuses(): Promise<void> {
  // 1. Sync from BOO automation_logs
  const { data: booLogs } = await booSupabase
    .from('automation_logs')
    .select('*')
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('started_at', { ascending: false });

  const jobMappings: Record<string, string> = {
    'supplier-stock-sync': 'stock-sync',
    'gmc-sync': 'gmc-sync',
    'gsc-sync': 'gsc-issues-sync',
    'BC → Supabase Product Sync (Script)': 'bc-product-sync'
  };

  for (const log of booLogs || []) {
    const jobName = jobMappings[log.workflow_name] || log.workflow_name;

    await supabase.from('dashboard_job_status').upsert({
      job_name: jobName,
      business: 'boo',
      last_run: log.completed_at || log.started_at,
      last_success: log.status === 'completed' ? log.completed_at : null,
      last_error: log.status === 'failed' ? log.error_message : null,
      status: log.status === 'completed' ? 'healthy' : 'failed',
      updated_at: new Date().toISOString()
    }, { onConflict: 'job_name' });
  }

  // 2. Check n8n workflow executions
  await syncN8nWorkflowStatus();

  // 3. Update job statuses based on timing
  await supabase.rpc('update_job_status');
}
```

### Phase 2: Report Generation

#### Daily Summary Report

```typescript
// scripts/generate-daily-report.ts
interface DailyReport {
  date: string;
  generatedAt: string;
  businesses: {
    [key: string]: {
      orders: number;
      revenue: number;
      vsYesterday: { orders: string; revenue: string };
      topProducts: Array<{ name: string; quantity: number }>;
    };
  };
  jobs: {
    healthy: number;
    stale: number;
    failed: number;
    details: Array<{ name: string; status: string; lastRun: string }>;
  };
  integrations: {
    healthy: number;
    degraded: number;
    down: number;
  };
  alerts: {
    critical: number;
    high: number;
    medium: number;
    unresolved: Array<{ title: string; business: string; created: string }>;
  };
  recommendations: string[];
}

async function generateDailyReport(): Promise<DailyReport> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch today's metrics
  const { data: todayMetrics } = await supabase
    .from('dashboard_business_metrics')
    .select('*')
    .eq('metric_date', today);

  // Fetch yesterday's for comparison
  const { data: yesterdayMetrics } = await supabase
    .from('dashboard_business_metrics')
    .select('*')
    .eq('metric_date', yesterday);

  // Fetch job health
  const { data: jobs } = await supabase
    .from('v_job_health_summary')
    .select('*');

  // Fetch unhealthy jobs
  const { data: unhealthyJobs } = await supabase
    .from('v_unhealthy_jobs')
    .select('job_name, status, last_run');

  // Fetch integration health
  const { data: health } = await supabase
    .from('dashboard_health_checks')
    .select('*');

  // Fetch unresolved alerts
  const { data: alerts } = await supabase
    .from('v_dashboard_alerts_recent')
    .select('*')
    .eq('resolved', false);

  // Build report
  const report: DailyReport = {
    date: today,
    generatedAt: new Date().toISOString(),
    businesses: {},
    jobs: {
      healthy: jobs?.find(j => j.status === 'healthy')?.count || 0,
      stale: jobs?.find(j => j.status === 'stale')?.count || 0,
      failed: jobs?.find(j => j.status === 'failed')?.count || 0,
      details: unhealthyJobs?.map(j => ({
        name: j.job_name,
        status: j.status,
        lastRun: j.last_run
      })) || []
    },
    integrations: {
      healthy: health?.filter(h => h.status === 'healthy').length || 0,
      degraded: health?.filter(h => h.status === 'degraded').length || 0,
      down: health?.filter(h => h.status === 'down').length || 0
    },
    alerts: {
      critical: alerts?.filter(a => a.severity === 'critical').length || 0,
      high: alerts?.filter(a => a.severity === 'high').length || 0,
      medium: alerts?.filter(a => a.severity === 'medium').length || 0,
      unresolved: alerts?.slice(0, 10).map(a => ({
        title: a.title,
        business: a.business,
        created: a.created_at
      })) || []
    },
    recommendations: []
  };

  // Calculate business comparisons
  for (const biz of ['teelixir', 'boo', 'elevate', 'rhf']) {
    const todayData = todayMetrics?.find(m => m.business === biz);
    const yesterdayData = yesterdayMetrics?.find(m => m.business === biz);

    report.businesses[biz] = {
      orders: todayData?.orders_count || 0,
      revenue: todayData?.revenue || 0,
      vsYesterday: {
        orders: calculateChange(todayData?.orders_count, yesterdayData?.orders_count),
        revenue: calculateChange(todayData?.revenue, yesterdayData?.revenue)
      },
      topProducts: []
    };
  }

  // Generate recommendations
  if (report.jobs.failed > 0) {
    report.recommendations.push(`${report.jobs.failed} jobs failed - investigate immediately`);
  }
  if (report.jobs.stale > 5) {
    report.recommendations.push(`${report.jobs.stale} jobs are stale - check cron/n8n schedules`);
  }
  if (report.integrations.down > 0) {
    report.recommendations.push(`${report.integrations.down} integrations are down`);
  }

  // Store report
  await supabase.from('dashboard_reports').insert({
    report_type: 'daily_summary',
    report_date: today,
    report_data: report
  });

  return report;
}

function calculateChange(current: number | null, previous: number | null): string {
  if (!current || !previous || previous === 0) return '0%';
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}
```

### Phase 3: Alert Generation

#### Automated Alerts

```typescript
// scripts/generate-alerts.ts
async function generateAlerts(): Promise<void> {
  // 1. Job failure alerts
  const { data: failedJobs } = await supabase
    .from('dashboard_job_status')
    .select('*')
    .eq('status', 'failed')
    .eq('enabled', true);

  for (const job of failedJobs || []) {
    await createAlertIfNotExists({
      business: job.business,
      alert_type: 'error',
      title: `Job Failed: ${job.job_name}`,
      message: job.last_error || 'Unknown error',
      source: 'job_monitor',
      severity: 'high'
    });
  }

  // 2. Stale job alerts
  const { data: staleJobs } = await supabase
    .from('dashboard_job_status')
    .select('*')
    .eq('status', 'stale')
    .eq('enabled', true);

  if (staleJobs && staleJobs.length > 3) {
    await createAlertIfNotExists({
      business: 'infrastructure',
      alert_type: 'warning',
      title: `${staleJobs.length} Jobs Are Stale`,
      message: `Jobs: ${staleJobs.map(j => j.job_name).join(', ')}`,
      source: 'job_monitor',
      severity: 'medium'
    });
  }

  // 3. Integration down alerts
  const { data: downIntegrations } = await supabase
    .from('dashboard_health_checks')
    .select('*')
    .eq('status', 'down');

  for (const integration of downIntegrations || []) {
    await createAlertIfNotExists({
      business: integration.business,
      alert_type: 'error',
      title: `Integration Down: ${integration.integration}`,
      message: integration.error_message || 'Health check failed',
      source: 'health_check',
      severity: 'critical'
    });
  }

  // 4. Revenue anomaly alerts
  await checkRevenueAnomalies();
}

async function createAlertIfNotExists(alert: Partial<Alert>): Promise<void> {
  // Check if similar alert exists in last 24 hours
  const { data: existing } = await supabase
    .from('dashboard_alerts')
    .select('id')
    .eq('business', alert.business)
    .eq('title', alert.title)
    .eq('resolved', false)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .single();

  if (!existing) {
    await supabase.from('dashboard_alerts').insert(alert);
  }
}

async function checkRevenueAnomalies(): Promise<void> {
  // Compare today vs 7-day average
  const { data: recent } = await supabase
    .from('dashboard_business_metrics')
    .select('*')
    .gte('metric_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  for (const business of ['teelixir', 'boo', 'elevate']) {
    const bizMetrics = recent?.filter(m => m.business === business) || [];
    const today = bizMetrics.find(m => m.metric_date === new Date().toISOString().split('T')[0]);
    const avgRevenue = bizMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0) / Math.max(bizMetrics.length, 1);

    if (today && avgRevenue > 0) {
      const deviation = ((today.revenue - avgRevenue) / avgRevenue) * 100;

      if (deviation < -30) {
        await createAlertIfNotExists({
          business,
          alert_type: 'warning',
          title: `Revenue Down ${Math.abs(deviation).toFixed(0)}%`,
          message: `Today: $${today.revenue.toFixed(0)} vs 7-day avg: $${avgRevenue.toFixed(0)}`,
          source: 'metric',
          severity: deviation < -50 ? 'high' : 'medium'
        });
      }
    }
  }
}
```

### Phase 4: Email Distribution

#### Report Email

```typescript
// scripts/send-report-email.ts
async function sendDailyReportEmail(report: DailyReport): Promise<void> {
  const recipients = ['jayson@fyic.com.au'];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; }
        .header { background: #1a1a2e; color: white; padding: 20px; }
        .section { padding: 20px; border-bottom: 1px solid #eee; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .metric-label { color: #666; font-size: 12px; }
        .alert-critical { background: #fee; border-left: 4px solid #f00; padding: 10px; margin: 5px 0; }
        .alert-high { background: #fff3e0; border-left: 4px solid #ff9800; padding: 10px; margin: 5px 0; }
        .status-healthy { color: #4caf50; }
        .status-stale { color: #ff9800; }
        .status-failed { color: #f44336; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Daily Operations Summary</h1>
        <p>${report.date}</p>
      </div>

      <div class="section">
        <h2>Business Performance</h2>
        <table>
          <tr>
            <th>Business</th>
            <th>Orders</th>
            <th>Revenue</th>
            <th>vs Yesterday</th>
          </tr>
          ${Object.entries(report.businesses).map(([biz, data]) => `
            <tr>
              <td>${biz.toUpperCase()}</td>
              <td>${data.orders}</td>
              <td>$${data.revenue.toLocaleString()}</td>
              <td>${data.vsYesterday.revenue}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <div class="section">
        <h2>System Health</h2>
        <div class="metric">
          <div class="metric-value status-healthy">${report.jobs.healthy}</div>
          <div class="metric-label">Healthy Jobs</div>
        </div>
        <div class="metric">
          <div class="metric-value status-stale">${report.jobs.stale}</div>
          <div class="metric-label">Stale Jobs</div>
        </div>
        <div class="metric">
          <div class="metric-value status-failed">${report.jobs.failed}</div>
          <div class="metric-label">Failed Jobs</div>
        </div>
        <div class="metric">
          <div class="metric-value">${report.integrations.healthy}/${report.integrations.healthy + report.integrations.degraded + report.integrations.down}</div>
          <div class="metric-label">Integrations Healthy</div>
        </div>
      </div>

      ${report.alerts.critical + report.alerts.high > 0 ? `
        <div class="section">
          <h2>Active Alerts</h2>
          ${report.alerts.unresolved.slice(0, 5).map(a => `
            <div class="alert-${a.severity || 'high'}">
              <strong>${a.title}</strong> (${a.business})
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${report.recommendations.length > 0 ? `
        <div class="section">
          <h2>Recommendations</h2>
          <ul>
            ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="section" style="background: #f5f5f5; text-align: center;">
        <p>Generated at ${new Date(report.generatedAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
        <p><a href="https://ops.growthcohq.com/home">View Full Dashboard</a></p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: recipients,
    subject: `[Ops] Daily Summary - ${report.date}`,
    html
  });

  // Update report as sent
  await supabase.from('dashboard_reports')
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
      email_recipients: recipients
    })
    .eq('report_date', report.date)
    .eq('report_type', 'daily_summary');
}
```

## Reference Files

### Dashboard Project
- [dashboard/](../../../dashboard/) - Next.js dashboard app
- [dashboard/src/app/api/](../../../dashboard/src/app/api/) - 38 API routes
- [dashboard/src/components/](../../../dashboard/src/components/) - UI components

### N8N Workflows
- [infra/n8n-workflows/templates/daily-summary-workflow.json](../../../infra/n8n-workflows/templates/daily-summary-workflow.json)
- [infra/n8n-workflows/templates/health-check-workflow.json](../../../infra/n8n-workflows/templates/health-check-workflow.json)

### Existing Scripts
- [.claude/skills/supabase-expert/scripts/executive-report-generator.ts](../../../.claude/skills/supabase-expert/scripts/executive-report-generator.ts)
- [.claude/skills/supabase-expert/scripts/health-check.ts](../../../.claude/skills/supabase-expert/scripts/health-check.ts)

## Environment Variables Required

```bash
# Supabase (Master Hub)
NEXT_PUBLIC_SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# BOO Supabase (for automation logs)
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=

# N8N
N8N_BASE_URL=https://automation.growthcohq.com
N8N_API_KEY=

# Email
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=ops@growthcohq.com

# Platform APIs (for metric fetching)
TEELIXIR_SHOPIFY_ACCESS_TOKEN=
BIGCOMMERCE_ACCESS_TOKEN=
ELEVATE_SHOPIFY_ACCESS_TOKEN=
```

## Automation Schedule

| Task | Frequency | Time (AEST) |
|------|-----------|-------------|
| Metric Population | Daily | 6:00 AM |
| Job Status Sync | Every 15 min | - |
| Health Check | Every 5 min | - |
| Alert Generation | Every 15 min | - |
| Daily Report | Daily | 8:00 AM |
| Report Email | Daily | 8:15 AM |
| Weekly Report | Weekly | Monday 9:00 AM |

## Success Criteria

A successful dashboard automation session should:
- Keep all metrics up-to-date (< 1 hour lag)
- Detect and alert on issues within 15 minutes
- Generate accurate daily reports
- Deliver report emails on schedule
- Maintain job status accuracy > 95%
- Track all integrations across 5 businesses
- Provide actionable recommendations

## Known Gaps & Future Improvements

### Current Gaps
1. **Single-source automation logs** - Only BOO sends to central logs
2. **No real-time streaming** - All data is polled, not pushed
3. **Manual metric population** - Needs scheduled automation
4. **Missing RHF metrics** - WooCommerce not yet integrated

### Planned Improvements
1. Add cross-business logging from Teelixir, Elevate, RHF
2. Implement webhook receivers for real-time updates
3. Add Slack notification integration
4. Create customizable report templates
5. Build metric forecasting capabilities
