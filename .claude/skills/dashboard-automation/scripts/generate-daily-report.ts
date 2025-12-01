#!/usr/bin/env npx tsx

/**
 * Generate Daily Report Script
 *
 * Generates a comprehensive daily operations report including:
 * - Business performance metrics
 * - Job health status
 * - Integration health
 * - Active alerts
 * - Recommendations
 *
 * Usage:
 *   npx tsx generate-daily-report.ts              # Generate for today
 *   npx tsx generate-daily-report.ts --email      # Generate and send email
 *   npx tsx generate-daily-report.ts --date 2024-12-01
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DailyReport {
  date: string;
  generatedAt: string;
  businesses: {
    [key: string]: {
      orders: number;
      revenue: number;
      avgOrderValue: number;
      vsYesterday: { orders: string; revenue: string };
      vsLastWeek: { orders: string; revenue: string };
    };
  };
  totals: {
    orders: number;
    revenue: number;
    vsYesterday: string;
  };
  jobs: {
    total: number;
    healthy: number;
    stale: number;
    failed: number;
    unknown: number;
    unhealthyDetails: Array<{ name: string; status: string; lastRun: string; business: string }>;
  };
  integrations: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
    issues: Array<{ business: string; integration: string; status: string; error?: string }>;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recent: Array<{ title: string; business: string; severity: string; created: string }>;
  };
  recommendations: string[];
}

/**
 * Calculate percentage change
 */
function calculateChange(current: number | null, previous: number | null): string {
  if (!current || !previous || previous === 0) return 'N/A';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Generate the daily report
 */
async function generateDailyReport(date: string): Promise<DailyReport> {
  const reportDate = new Date(date);
  const yesterday = new Date(reportDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lastWeek = new Date(reportDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`Generating report for ${date}...`);

  // Fetch metrics
  const [todayMetrics, yesterdayMetrics, lastWeekMetrics] = await Promise.all([
    supabase.from('dashboard_business_metrics').select('*').eq('metric_date', date),
    supabase.from('dashboard_business_metrics').select('*').eq('metric_date', yesterday),
    supabase.from('dashboard_business_metrics').select('*').eq('metric_date', lastWeek)
  ]);

  // Fetch job health
  const { data: jobs } = await supabase
    .from('dashboard_job_status')
    .select('*')
    .eq('enabled', true);

  // Fetch integration health
  const { data: integrations } = await supabase
    .from('dashboard_health_checks')
    .select('*');

  // Fetch alerts
  const { data: alerts } = await supabase
    .from('dashboard_alerts')
    .select('*')
    .eq('resolved', false)
    .gte('created_at', new Date(reportDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // Build business metrics
  const businesses: DailyReport['businesses'] = {};
  let totalOrders = 0;
  let totalRevenue = 0;
  let totalYesterdayOrders = 0;
  let totalYesterdayRevenue = 0;

  for (const biz of ['teelixir', 'boo', 'elevate', 'rhf']) {
    const today = todayMetrics.data?.find(m => m.business === biz);
    const yest = yesterdayMetrics.data?.find(m => m.business === biz);
    const week = lastWeekMetrics.data?.find(m => m.business === biz);

    const orders = today?.orders_count || 0;
    const revenue = today?.revenue || 0;

    businesses[biz] = {
      orders,
      revenue,
      avgOrderValue: today?.avg_order_value || 0,
      vsYesterday: {
        orders: calculateChange(orders, yest?.orders_count),
        revenue: calculateChange(revenue, yest?.revenue)
      },
      vsLastWeek: {
        orders: calculateChange(orders, week?.orders_count),
        revenue: calculateChange(revenue, week?.revenue)
      }
    };

    totalOrders += orders;
    totalRevenue += revenue;
    totalYesterdayOrders += yest?.orders_count || 0;
    totalYesterdayRevenue += yest?.revenue || 0;
  }

  // Build job summary
  const jobsByStatus = (jobs || []).reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unhealthyJobs = (jobs || [])
    .filter(j => j.status !== 'healthy')
    .map(j => ({
      name: j.job_name,
      status: j.status,
      lastRun: j.last_run,
      business: j.business
    }));

  // Build integration summary
  const integrationsByStatus = (integrations || []).reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const integrationIssues = (integrations || [])
    .filter(i => i.status !== 'healthy')
    .map(i => ({
      business: i.business,
      integration: i.integration,
      status: i.status,
      error: i.error_message
    }));

  // Build alert summary
  const alertsBySeverity = (alerts || []).reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Generate recommendations
  const recommendations: string[] = [];

  if (jobsByStatus['failed'] > 0) {
    recommendations.push(`${jobsByStatus['failed']} jobs have failed - investigate immediately`);
  }
  if (jobsByStatus['stale'] > 3) {
    recommendations.push(`${jobsByStatus['stale']} jobs are stale - check cron schedules and n8n workflows`);
  }
  if (integrationsByStatus['down'] > 0) {
    recommendations.push(`${integrationsByStatus['down']} integrations are down - check API credentials and connectivity`);
  }
  if (alertsBySeverity['critical'] > 0) {
    recommendations.push(`${alertsBySeverity['critical']} critical alerts require immediate attention`);
  }

  // Business-specific recommendations
  for (const [biz, data] of Object.entries(businesses)) {
    if (data.vsYesterday.revenue.includes('-') && parseFloat(data.vsYesterday.revenue) < -20) {
      recommendations.push(`${biz.toUpperCase()}: Revenue down significantly vs yesterday (${data.vsYesterday.revenue})`);
    }
  }

  const report: DailyReport = {
    date,
    generatedAt: new Date().toISOString(),
    businesses,
    totals: {
      orders: totalOrders,
      revenue: totalRevenue,
      vsYesterday: calculateChange(totalRevenue, totalYesterdayRevenue)
    },
    jobs: {
      total: jobs?.length || 0,
      healthy: jobsByStatus['healthy'] || 0,
      stale: jobsByStatus['stale'] || 0,
      failed: jobsByStatus['failed'] || 0,
      unknown: jobsByStatus['unknown'] || 0,
      unhealthyDetails: unhealthyJobs
    },
    integrations: {
      total: integrations?.length || 0,
      healthy: integrationsByStatus['healthy'] || 0,
      degraded: integrationsByStatus['degraded'] || 0,
      down: integrationsByStatus['down'] || 0,
      issues: integrationIssues
    },
    alerts: {
      total: alerts?.length || 0,
      critical: alertsBySeverity['critical'] || 0,
      high: alertsBySeverity['high'] || 0,
      medium: alertsBySeverity['medium'] || 0,
      low: alertsBySeverity['low'] || 0,
      recent: (alerts || []).slice(0, 10).map(a => ({
        title: a.title,
        business: a.business,
        severity: a.severity,
        created: a.created_at
      }))
    },
    recommendations
  };

  // Store report
  await supabase.from('dashboard_reports').insert({
    report_type: 'daily_summary',
    report_date: date,
    report_data: report
  }).catch(() => {
    console.warn('Could not store report (table may not exist)');
  });

  return report;
}

/**
 * Print report to console
 */
function printReport(report: DailyReport) {
  console.log('\n' + '='.repeat(70));
  console.log('DAILY OPERATIONS REPORT');
  console.log('='.repeat(70));
  console.log(`Date: ${report.date}`);
  console.log(`Generated: ${new Date(report.generatedAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
  console.log('');

  // Business Performance
  console.log('--- BUSINESS PERFORMANCE ---');
  console.log('Business'.padEnd(12) + 'Orders'.padStart(8) + 'Revenue'.padStart(12) + 'vs Yesterday'.padStart(14));
  console.log('-'.repeat(46));
  for (const [biz, data] of Object.entries(report.businesses)) {
    console.log(
      biz.toUpperCase().padEnd(12) +
      data.orders.toString().padStart(8) +
      `$${data.revenue.toLocaleString()}`.padStart(12) +
      data.vsYesterday.revenue.padStart(14)
    );
  }
  console.log('-'.repeat(46));
  console.log(
    'TOTAL'.padEnd(12) +
    report.totals.orders.toString().padStart(8) +
    `$${report.totals.revenue.toLocaleString()}`.padStart(12) +
    report.totals.vsYesterday.padStart(14)
  );
  console.log('');

  // System Health
  console.log('--- SYSTEM HEALTH ---');
  console.log(`Jobs: ${report.jobs.healthy}/${report.jobs.total} healthy, ${report.jobs.stale} stale, ${report.jobs.failed} failed`);
  console.log(`Integrations: ${report.integrations.healthy}/${report.integrations.total} healthy, ${report.integrations.down} down`);
  console.log(`Alerts: ${report.alerts.total} active (${report.alerts.critical} critical, ${report.alerts.high} high)`);
  console.log('');

  // Issues
  if (report.jobs.unhealthyDetails.length > 0) {
    console.log('--- UNHEALTHY JOBS ---');
    for (const job of report.jobs.unhealthyDetails.slice(0, 10)) {
      console.log(`  [${job.status.toUpperCase()}] ${job.name} (${job.business})`);
    }
    console.log('');
  }

  if (report.integrations.issues.length > 0) {
    console.log('--- INTEGRATION ISSUES ---');
    for (const issue of report.integrations.issues) {
      console.log(`  [${issue.status.toUpperCase()}] ${issue.business}/${issue.integration}`);
    }
    console.log('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('--- RECOMMENDATIONS ---');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    console.log('');
  }

  console.log('='.repeat(70));
}

/**
 * Generate HTML email body
 */
function generateEmailHtml(report: DailyReport): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; color: #333; }
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0 0 10px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .section { padding: 20px; background: white; border: 1px solid #eee; margin-top: -1px; }
        .section:last-child { border-radius: 0 0 8px 8px; }
        .section h2 { color: #1a1a2e; margin-top: 0; font-size: 18px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .metrics-grid { display: flex; flex-wrap: wrap; gap: 15px; }
        .metric-card { flex: 1; min-width: 140px; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 28px; font-weight: bold; color: #1a1a2e; }
        .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .metric-change { font-size: 14px; margin-top: 5px; }
        .metric-change.positive { color: #28a745; }
        .metric-change.negative { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        .status-healthy { color: #28a745; }
        .status-stale { color: #ffc107; }
        .status-failed { color: #dc3545; }
        .status-down { color: #dc3545; }
        .alert-item { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert-critical { background: #fee2e2; border-left: 4px solid #dc3545; }
        .alert-high { background: #fff3cd; border-left: 4px solid #ffc107; }
        .rec-item { padding: 8px 0; border-bottom: 1px solid #eee; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .footer a { color: #1a1a2e; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Daily Operations Summary</h1>
        <p>${report.date}</p>
      </div>

      <div class="section">
        <h2>Business Performance</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${report.totals.orders}</div>
            <div class="metric-label">Total Orders</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${report.totals.revenue.toLocaleString()}</div>
            <div class="metric-label">Total Revenue</div>
            <div class="metric-change ${report.totals.vsYesterday.includes('-') ? 'negative' : 'positive'}">
              ${report.totals.vsYesterday} vs yesterday
            </div>
          </div>
        </div>
        <table>
          <tr><th>Business</th><th>Orders</th><th>Revenue</th><th>vs Yesterday</th></tr>
          ${Object.entries(report.businesses).map(([biz, data]) => `
            <tr>
              <td>${biz.toUpperCase()}</td>
              <td>${data.orders}</td>
              <td>$${data.revenue.toLocaleString()}</td>
              <td class="${data.vsYesterday.revenue.includes('-') ? 'negative' : 'positive'}">${data.vsYesterday.revenue}</td>
            </tr>
          `).join('')}
        </table>
      </div>

      <div class="section">
        <h2>System Health</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value status-healthy">${report.jobs.healthy}</div>
            <div class="metric-label">Healthy Jobs</div>
          </div>
          <div class="metric-card">
            <div class="metric-value status-stale">${report.jobs.stale}</div>
            <div class="metric-label">Stale Jobs</div>
          </div>
          <div class="metric-card">
            <div class="metric-value status-failed">${report.jobs.failed}</div>
            <div class="metric-label">Failed Jobs</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${report.integrations.healthy}/${report.integrations.total}</div>
            <div class="metric-label">Integrations OK</div>
          </div>
        </div>
      </div>

      ${report.alerts.total > 0 ? `
        <div class="section">
          <h2>Active Alerts (${report.alerts.total})</h2>
          ${report.alerts.recent.slice(0, 5).map(a => `
            <div class="alert-item alert-${a.severity}">
              <strong>${a.title}</strong> <span style="color: #666;">- ${a.business}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${report.recommendations.length > 0 ? `
        <div class="section">
          <h2>Recommendations</h2>
          ${report.recommendations.map(r => `<div class="rec-item">${r}</div>`).join('')}
        </div>
      ` : ''}

      <div class="footer">
        <p>Generated at ${new Date(report.generatedAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
        <p><a href="https://ops.growthcohq.com/home">View Full Dashboard</a></p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send report email
 */
async function sendReportEmail(report: DailyReport): Promise<void> {
  const recipients = ['jayson@fyic.com.au'];
  const html = generateEmailHtml(report);

  console.log('\nSending report email...');

  // Use shared email utility or nodemailer
  try {
    // Placeholder - would use actual email sending
    console.log(`  Would send to: ${recipients.join(', ')}`);
    console.log('  Email sending not implemented - see shared/libs/alerts/email-alerts.ts');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(a => a.startsWith('--date='))?.split('=')[1] ||
                  (args.includes('--date') ? args[args.indexOf('--date') + 1] : undefined);
  const sendEmail = args.includes('--email');

  const date = dateArg || new Date().toISOString().split('T')[0];

  try {
    const report = await generateDailyReport(date);
    printReport(report);

    // Save to file
    const fs = await import('fs');
    const filename = `daily-report-${date}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${filename}`);

    if (sendEmail) {
      await sendReportEmail(report);
    }

    // Exit with error if critical issues
    if (report.jobs.failed > 0 || report.alerts.critical > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Report generation failed:', error);
    process.exit(1);
  }
}

main();
