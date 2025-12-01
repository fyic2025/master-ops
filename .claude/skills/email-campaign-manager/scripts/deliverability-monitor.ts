#!/usr/bin/env npx tsx

/**
 * Deliverability Monitor Script
 *
 * Monitors email deliverability across all providers:
 * - Gmail OAuth health check
 * - Bounce rate monitoring
 * - Provider failover status
 * - Domain reputation indicators
 *
 * Usage: npx tsx deliverability-monitor.ts [check|report|alert]
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.BOO_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface ProviderHealth {
  provider: string;
  business: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSuccess?: Date;
  errorRate: number;
  errors: string[];
}

interface DeliverabilityReport {
  timestamp: string;
  providers: ProviderHealth[];
  metrics: {
    totalSent24h: number;
    totalDelivered24h: number;
    totalBounced24h: number;
    deliveryRate: number;
    bounceRate: number;
  };
  alerts: string[];
  recommendations: string[];
}

// Gmail OAuth2 configuration per business
const GMAIL_CONFIGS = {
  teelixir: {
    clientId: process.env.TEELIXIR_GMAIL_CLIENT_ID,
    clientSecret: process.env.TEELIXIR_GMAIL_CLIENT_SECRET,
    refreshToken: process.env.TEELIXIR_GMAIL_REFRESH_TOKEN
  },
  boo: {
    clientId: process.env.BOO_GMAIL_CLIENT_ID,
    clientSecret: process.env.BOO_GMAIL_CLIENT_SECRET,
    refreshToken: process.env.BOO_GMAIL_REFRESH_TOKEN
  },
  elevate: {
    clientId: process.env.ELEVATE_GMAIL_CLIENT_ID,
    clientSecret: process.env.ELEVATE_GMAIL_CLIENT_SECRET,
    refreshToken: process.env.ELEVATE_GMAIL_REFRESH_TOKEN
  }
};

/**
 * Test Gmail OAuth2 token validity
 */
async function testGmailOAuth(business: string, config: typeof GMAIL_CONFIGS['teelixir']): Promise<ProviderHealth> {
  const health: ProviderHealth = {
    provider: 'gmail',
    business,
    status: 'healthy',
    errorRate: 0,
    errors: []
  };

  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    health.status = 'down';
    health.errors.push('Missing OAuth credentials');
    return health;
  }

  try {
    // Try to get access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      health.status = 'down';
      health.errors.push(`OAuth error: ${error.error_description || error.error}`);

      if (error.error === 'invalid_grant') {
        health.errors.push('Token revoked or expired - re-run OAuth flow');
      }
    } else {
      health.lastSuccess = new Date();
    }
  } catch (error) {
    health.status = 'down';
    health.errors.push(`Connection error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return health;
}

/**
 * Check Smartlead API health
 */
async function testSmartleadAPI(): Promise<ProviderHealth> {
  const health: ProviderHealth = {
    provider: 'smartlead',
    business: 'all',
    status: 'healthy',
    errorRate: 0,
    errors: []
  };

  const apiKey = process.env.SMARTLEAD_API_KEY;
  if (!apiKey) {
    health.status = 'down';
    health.errors.push('Missing API key');
    return health;
  }

  try {
    const response = await fetch('https://server.smartlead.ai/api/v1/campaigns', {
      headers: { 'api-key': apiKey }
    });

    if (!response.ok) {
      health.status = response.status === 401 ? 'down' : 'degraded';
      health.errors.push(`API error: ${response.status} ${response.statusText}`);
    } else {
      health.lastSuccess = new Date();
    }
  } catch (error) {
    health.status = 'down';
    health.errors.push(`Connection error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return health;
}

/**
 * Check fallback providers (Resend, SendGrid)
 */
async function testFallbackProviders(): Promise<ProviderHealth[]> {
  const providers: ProviderHealth[] = [];

  // Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${resendKey}` }
      });

      providers.push({
        provider: 'resend',
        business: 'boo',
        status: response.ok ? 'healthy' : 'degraded',
        errorRate: 0,
        errors: response.ok ? [] : [`API error: ${response.status}`],
        lastSuccess: response.ok ? new Date() : undefined
      });
    } catch (error) {
      providers.push({
        provider: 'resend',
        business: 'boo',
        status: 'down',
        errorRate: 0,
        errors: [`Connection error: ${error instanceof Error ? error.message : 'Unknown'}`]
      });
    }
  }

  // SendGrid
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: { 'Authorization': `Bearer ${sendgridKey}` }
      });

      providers.push({
        provider: 'sendgrid',
        business: 'boo',
        status: response.ok ? 'healthy' : 'degraded',
        errorRate: 0,
        errors: response.ok ? [] : [`API error: ${response.status}`],
        lastSuccess: response.ok ? new Date() : undefined
      });
    } catch (error) {
      providers.push({
        provider: 'sendgrid',
        business: 'boo',
        status: 'down',
        errorRate: 0,
        errors: [`Connection error: ${error instanceof Error ? error.message : 'Unknown'}`]
      });
    }
  }

  return providers;
}

/**
 * Get delivery metrics from database
 */
async function getDeliveryMetrics(): Promise<DeliverabilityReport['metrics']> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Smartlead metrics
  const { count: smartleadSent } = await supabase
    .from('smartlead_emails')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', oneDayAgo);

  const { count: smartleadDelivered } = await supabase
    .from('smartlead_emails')
    .select('*', { count: 'exact', head: true })
    .gte('delivered_at', oneDayAgo);

  const { count: smartleadBounced } = await supabase
    .from('smartlead_emails')
    .select('*', { count: 'exact', head: true })
    .gte('bounced_at', oneDayAgo);

  // Anniversary metrics
  const { count: anniversarySent } = await supabase
    .from('tlx_anniversary_discounts')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', oneDayAgo);

  const { count: anniversaryFailed } = await supabase
    .from('tlx_anniversary_discounts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', oneDayAgo);

  // Winback metrics
  const { count: winbackSent } = await supabase
    .from('tlx_winback_emails')
    .select('*', { count: 'exact', head: true })
    .in('status', ['sent', 'clicked', 'converted'])
    .gte('sent_at', oneDayAgo);

  const { count: winbackBounced } = await supabase
    .from('tlx_winback_emails')
    .select('*', { count: 'exact', head: true })
    .in('status', ['bounced', 'failed'])
    .gte('created_at', oneDayAgo);

  const totalSent = (smartleadSent || 0) + (anniversarySent || 0) + (winbackSent || 0);
  const totalDelivered = (smartleadDelivered || 0) + (anniversarySent || 0) - (anniversaryFailed || 0) +
                         (winbackSent || 0);
  const totalBounced = (smartleadBounced || 0) + (anniversaryFailed || 0) + (winbackBounced || 0);

  return {
    totalSent24h: totalSent,
    totalDelivered24h: totalDelivered,
    totalBounced24h: totalBounced,
    deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100,
    bounceRate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0
  };
}

/**
 * Generate alerts based on health status
 */
function generateAlerts(providers: ProviderHealth[], metrics: DeliverabilityReport['metrics']): string[] {
  const alerts: string[] = [];

  // Provider alerts
  const downProviders = providers.filter(p => p.status === 'down');
  for (const p of downProviders) {
    alerts.push(`CRITICAL: ${p.provider} (${p.business}) is DOWN - ${p.errors.join(', ')}`);
  }

  const degradedProviders = providers.filter(p => p.status === 'degraded');
  for (const p of degradedProviders) {
    alerts.push(`WARNING: ${p.provider} (${p.business}) is DEGRADED - ${p.errors.join(', ')}`);
  }

  // Metric alerts
  if (metrics.bounceRate > 5) {
    alerts.push(`CRITICAL: Bounce rate is ${metrics.bounceRate}% (threshold: 5%)`);
  } else if (metrics.bounceRate > 3) {
    alerts.push(`WARNING: Bounce rate is ${metrics.bounceRate}% (threshold: 3%)`);
  }

  if (metrics.deliveryRate < 95) {
    alerts.push(`WARNING: Delivery rate is ${metrics.deliveryRate}% (threshold: 95%)`);
  }

  return alerts;
}

/**
 * Generate recommendations
 */
function generateRecommendations(providers: ProviderHealth[], metrics: DeliverabilityReport['metrics']): string[] {
  const recommendations: string[] = [];

  // OAuth recommendations
  const gmailDown = providers.filter(p => p.provider === 'gmail' && p.status === 'down');
  if (gmailDown.length > 0) {
    recommendations.push(`Re-run Gmail OAuth flow for: ${gmailDown.map(p => p.business).join(', ')}`);
    recommendations.push('Command: npx tsx scripts/gmail-oauth-flow.ts <business>');
  }

  // Bounce recommendations
  if (metrics.bounceRate > 3) {
    recommendations.push('Review and clean email lists before next campaign');
    recommendations.push('Run: npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts process');
  }

  // Fallback recommendations
  const fallbackDown = providers.filter(p =>
    (p.provider === 'resend' || p.provider === 'sendgrid') && p.status === 'down'
  );
  if (fallbackDown.length > 0) {
    recommendations.push(`Check fallback provider credentials: ${fallbackDown.map(p => p.provider).join(', ')}`);
  }

  return recommendations;
}

/**
 * Run full health check
 */
async function runHealthCheck(): Promise<DeliverabilityReport> {
  console.log('Running deliverability health check...\n');

  const providers: ProviderHealth[] = [];

  // Test Gmail for each business
  console.log('Testing Gmail OAuth...');
  for (const [business, config] of Object.entries(GMAIL_CONFIGS)) {
    const health = await testGmailOAuth(business, config);
    providers.push(health);
    console.log(`  ${business}: ${health.status}`);
  }

  // Test Smartlead
  console.log('\nTesting Smartlead API...');
  const smartleadHealth = await testSmartleadAPI();
  providers.push(smartleadHealth);
  console.log(`  Smartlead: ${smartleadHealth.status}`);

  // Test fallback providers
  console.log('\nTesting fallback providers...');
  const fallbacks = await testFallbackProviders();
  providers.push(...fallbacks);
  for (const p of fallbacks) {
    console.log(`  ${p.provider}: ${p.status}`);
  }

  // Get metrics
  console.log('\nGathering delivery metrics...');
  const metrics = await getDeliveryMetrics();
  console.log(`  Sent (24h): ${metrics.totalSent24h}`);
  console.log(`  Delivered: ${metrics.totalDelivered24h}`);
  console.log(`  Bounced: ${metrics.totalBounced24h}`);

  // Generate alerts and recommendations
  const alerts = generateAlerts(providers, metrics);
  const recommendations = generateRecommendations(providers, metrics);

  return {
    timestamp: new Date().toISOString(),
    providers,
    metrics,
    alerts,
    recommendations
  };
}

/**
 * Print report
 */
function printReport(report: DeliverabilityReport) {
  console.log('\n' + '='.repeat(60));
  console.log('DELIVERABILITY HEALTH REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp}\n`);

  // Provider status
  console.log('--- PROVIDER STATUS ---');
  for (const p of report.providers) {
    const statusIcon = p.status === 'healthy' ? 'OK' :
                       p.status === 'degraded' ? 'WARN' : 'FAIL';
    console.log(`[${statusIcon}] ${p.provider} (${p.business})`);
    if (p.errors.length > 0) {
      p.errors.forEach(e => console.log(`      ${e}`));
    }
  }

  // Metrics
  console.log('\n--- DELIVERY METRICS (24h) ---');
  console.log(`Sent: ${report.metrics.totalSent24h}`);
  console.log(`Delivered: ${report.metrics.totalDelivered24h} (${report.metrics.deliveryRate}%)`);
  console.log(`Bounced: ${report.metrics.totalBounced24h} (${report.metrics.bounceRate}%)`);

  // Alerts
  if (report.alerts.length > 0) {
    console.log('\n--- ALERTS ---');
    report.alerts.forEach(a => console.log(a));
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\n--- RECOMMENDATIONS ---');
    report.recommendations.forEach((r, i) => console.log(`${i + 1}. ${r}`));
  }

  console.log('\n' + '='.repeat(60));

  // Exit code based on alerts
  const criticalAlerts = report.alerts.filter(a => a.startsWith('CRITICAL'));
  return criticalAlerts.length;
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2] || 'check';

  switch (command) {
    case 'check':
    case 'report':
      const report = await runHealthCheck();
      const criticalCount = printReport(report);

      // Save report
      const fs = await import('fs');
      const filename = `deliverability-report-${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(filename, JSON.stringify(report, null, 2));
      console.log(`\nReport saved to: ${filename}`);

      if (criticalCount > 0) {
        process.exit(1);
      }
      break;

    case 'alert':
      // Quick check for CI/CD or monitoring
      const quickReport = await runHealthCheck();
      if (quickReport.alerts.filter(a => a.startsWith('CRITICAL')).length > 0) {
        console.error('CRITICAL ALERTS DETECTED');
        quickReport.alerts.forEach(a => console.error(a));
        process.exit(1);
      }
      console.log('All systems healthy');
      break;

    default:
      console.log('Deliverability Monitor');
      console.log('');
      console.log('Commands:');
      console.log('  check    Run full health check and report');
      console.log('  report   Same as check');
      console.log('  alert    Quick check for CI/CD (exits 1 on critical)');
  }
}

main().catch(console.error);
