#!/usr/bin/env npx tsx

/**
 * SEO Health Check
 *
 * Comprehensive assessment of SEO health across all businesses.
 * Integrates with GSC, GTMetrix, and SEO tables.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase clients
const masterSupabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const booSupabase = createClient(
  process.env.BOO_SUPABASE_URL!,
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface SEOHealthReport {
  business: string;
  timestamp: string;
  traffic: {
    clicks_7d: number;
    impressions_7d: number;
    avg_position: number;
    ctr: number;
    vs_previous_7d: {
      clicks_change: string;
      impressions_change: string;
    };
  };
  technicalIssues: {
    total: number;
    critical: number;
    high: number;
    byType: Record<string, number>;
  };
  coreWebVitals: {
    passing: number;
    failing: number;
    avgLCP: number;
    avgTBT: number;
    avgCLS: number;
  };
  contentHealth: {
    totalProducts: number;
    optimized: number;
    needsContent: number;
    noDescription: number;
  };
  anomalies: Array<{
    url: string;
    traffic_drop_percent: number;
    clicks_before: number;
    clicks_after: number;
  }>;
  recommendations: string[];
  overallScore: number;
}

async function getGSCTraffic(business: string): Promise<SEOHealthReport['traffic']> {
  // Current 7 days
  const { data: current } = await masterSupabase.rpc('get_gsc_totals', {
    p_business: business,
    p_from_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    p_to_date: new Date().toISOString().split('T')[0]
  });

  // Previous 7 days
  const { data: previous } = await masterSupabase.rpc('get_gsc_totals', {
    p_business: business,
    p_from_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    p_to_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const clicksChange = previous?.total_clicks > 0
    ? ((current?.total_clicks - previous?.total_clicks) / previous?.total_clicks * 100).toFixed(1) + '%'
    : 'N/A';

  const impressionsChange = previous?.total_impressions > 0
    ? ((current?.total_impressions - previous?.total_impressions) / previous?.total_impressions * 100).toFixed(1) + '%'
    : 'N/A';

  return {
    clicks_7d: current?.total_clicks || 0,
    impressions_7d: current?.total_impressions || 0,
    avg_position: current?.avg_position || 0,
    ctr: current?.avg_ctr || 0,
    vs_previous_7d: {
      clicks_change: clicksChange,
      impressions_change: impressionsChange
    }
  };
}

async function getTechnicalIssues(business: string): Promise<SEOHealthReport['technicalIssues']> {
  const { data: issues } = await masterSupabase
    .from('gsc_issue_urls')
    .select('issue_type, severity')
    .eq('business', business)
    .eq('status', 'active');

  const byType: Record<string, number> = {};
  let critical = 0;
  let high = 0;

  for (const issue of issues || []) {
    byType[issue.issue_type] = (byType[issue.issue_type] || 0) + 1;
    if (issue.severity === 'critical') critical++;
    if (issue.severity === 'high') high++;
  }

  return {
    total: issues?.length || 0,
    critical,
    high,
    byType
  };
}

async function getCoreWebVitals(business: string): Promise<SEOHealthReport['coreWebVitals']> {
  // Get latest tests
  const { data: latest } = await masterSupabase
    .from('v_gtmetrix_latest')
    .select('*')
    .eq('business', business);

  if (!latest || latest.length === 0) {
    return { passing: 0, failing: 0, avgLCP: 0, avgTBT: 0, avgCLS: 0 };
  }

  let passing = 0;
  let failing = 0;
  let totalLCP = 0;
  let totalTBT = 0;
  let totalCLS = 0;

  for (const test of latest) {
    const lcpPass = test.lcp_ms <= 2500;
    const tbtPass = test.tbt_ms <= 200;
    const clsPass = test.cls <= 0.1;

    if (lcpPass && tbtPass && clsPass) {
      passing++;
    } else {
      failing++;
    }

    totalLCP += test.lcp_ms || 0;
    totalTBT += test.tbt_ms || 0;
    totalCLS += test.cls || 0;
  }

  return {
    passing,
    failing,
    avgLCP: Math.round(totalLCP / latest.length),
    avgTBT: Math.round(totalTBT / latest.length),
    avgCLS: parseFloat((totalCLS / latest.length).toFixed(3))
  };
}

async function getContentHealth(business: string): Promise<SEOHealthReport['contentHealth']> {
  if (business !== 'boo') {
    return { totalProducts: 0, optimized: 0, needsContent: 0, noDescription: 0 };
  }

  const { data: products, count } = await booSupabase
    .from('seo_products')
    .select('seo_status, content_status', { count: 'exact' });

  const optimized = products?.filter(p => p.seo_status === 'optimized').length || 0;
  const needsContent = products?.filter(p =>
    p.content_status === 'needs_format' || p.seo_status === 'needs_content'
  ).length || 0;
  const noDescription = products?.filter(p => p.content_status === 'no_description').length || 0;

  return {
    totalProducts: count || 0,
    optimized,
    needsContent,
    noDescription
  };
}

async function getTrafficAnomalies(business: string): Promise<SEOHealthReport['anomalies']> {
  const { data: anomalies } = await masterSupabase
    .from('v_gsc_traffic_anomalies')
    .select('url, traffic_drop_percent, clicks_before, clicks_after')
    .eq('business', business)
    .order('traffic_drop_percent', { ascending: true })
    .limit(10);

  return anomalies || [];
}

function generateRecommendations(report: Partial<SEOHealthReport>): string[] {
  const recommendations: string[] = [];

  // Traffic recommendations
  if (report.traffic?.vs_previous_7d.clicks_change?.startsWith('-')) {
    const drop = parseFloat(report.traffic.vs_previous_7d.clicks_change);
    if (drop < -20) {
      recommendations.push(`Traffic dropped ${Math.abs(drop)}% - investigate top affected pages`);
    }
  }

  // Technical issues
  if (report.technicalIssues?.critical && report.technicalIssues.critical > 0) {
    recommendations.push(`${report.technicalIssues.critical} critical technical issues need immediate attention`);
  }
  if (report.technicalIssues?.byType?.not_found_404 && report.technicalIssues.byType.not_found_404 > 20) {
    recommendations.push(`${report.technicalIssues.byType.not_found_404} 404 errors - consider implementing redirects`);
  }

  // Core Web Vitals
  if (report.coreWebVitals?.failing && report.coreWebVitals.failing > report.coreWebVitals.passing) {
    recommendations.push('More pages failing CWV than passing - prioritize performance optimization');
  }
  if (report.coreWebVitals?.avgLCP && report.coreWebVitals.avgLCP > 2500) {
    recommendations.push(`Average LCP is ${report.coreWebVitals.avgLCP}ms - optimize largest contentful paint`);
  }

  // Content health
  if (report.contentHealth?.noDescription && report.contentHealth.noDescription > 100) {
    recommendations.push(`${report.contentHealth.noDescription} products have no description - high priority content gap`);
  }

  // Anomalies
  if (report.anomalies && report.anomalies.length > 5) {
    recommendations.push(`${report.anomalies.length} pages with significant traffic drops - investigate causes`);
  }

  return recommendations;
}

function calculateOverallScore(report: Partial<SEOHealthReport>): number {
  let score = 100;

  // Technical issues penalty (max -30)
  if (report.technicalIssues) {
    score -= Math.min(30, report.technicalIssues.critical * 5 + report.technicalIssues.high * 2);
  }

  // CWV penalty (max -25)
  if (report.coreWebVitals && report.coreWebVitals.passing + report.coreWebVitals.failing > 0) {
    const passRate = report.coreWebVitals.passing / (report.coreWebVitals.passing + report.coreWebVitals.failing);
    score -= Math.round((1 - passRate) * 25);
  }

  // Traffic drop penalty (max -20)
  if (report.traffic?.vs_previous_7d.clicks_change?.startsWith('-')) {
    const drop = Math.abs(parseFloat(report.traffic.vs_previous_7d.clicks_change));
    score -= Math.min(20, Math.round(drop / 5));
  }

  // Content health penalty (max -15)
  if (report.contentHealth && report.contentHealth.totalProducts > 0) {
    const optimizedRate = report.contentHealth.optimized / report.contentHealth.totalProducts;
    score -= Math.round((1 - optimizedRate) * 15);
  }

  // Anomalies penalty (max -10)
  if (report.anomalies) {
    score -= Math.min(10, report.anomalies.length);
  }

  return Math.max(0, score);
}

async function runHealthCheck(business: string): Promise<SEOHealthReport> {
  console.log(`\nRunning SEO health check for ${business.toUpperCase()}...`);
  console.log('='.repeat(50));

  const report: Partial<SEOHealthReport> = {
    business,
    timestamp: new Date().toISOString()
  };

  // Gather all metrics
  console.log('Fetching GSC traffic data...');
  report.traffic = await getGSCTraffic(business);

  console.log('Checking technical issues...');
  report.technicalIssues = await getTechnicalIssues(business);

  console.log('Analyzing Core Web Vitals...');
  report.coreWebVitals = await getCoreWebVitals(business);

  console.log('Assessing content health...');
  report.contentHealth = await getContentHealth(business);

  console.log('Detecting traffic anomalies...');
  report.anomalies = await getTrafficAnomalies(business);

  // Generate recommendations
  report.recommendations = generateRecommendations(report);

  // Calculate overall score
  report.overallScore = calculateOverallScore(report);

  return report as SEOHealthReport;
}

function printReport(report: SEOHealthReport): void {
  console.log('\n');
  console.log('='.repeat(60));
  console.log(`SEO HEALTH REPORT: ${report.business.toUpperCase()}`);
  console.log(`Generated: ${new Date(report.timestamp).toLocaleString()}`);
  console.log('='.repeat(60));

  // Overall Score
  const scoreEmoji = report.overallScore >= 80 ? '🟢' : report.overallScore >= 60 ? '🟡' : '🔴';
  console.log(`\n${scoreEmoji} Overall Score: ${report.overallScore}/100`);

  // Traffic
  console.log('\n📊 TRAFFIC (Last 7 Days)');
  console.log(`   Clicks: ${report.traffic.clicks_7d.toLocaleString()} (${report.traffic.vs_previous_7d.clicks_change} vs prev)`);
  console.log(`   Impressions: ${report.traffic.impressions_7d.toLocaleString()} (${report.traffic.vs_previous_7d.impressions_change} vs prev)`);
  console.log(`   Avg Position: ${report.traffic.avg_position.toFixed(1)}`);
  console.log(`   CTR: ${(report.traffic.ctr * 100).toFixed(2)}%`);

  // Technical Issues
  console.log('\n🔧 TECHNICAL ISSUES');
  console.log(`   Total: ${report.technicalIssues.total}`);
  console.log(`   Critical: ${report.technicalIssues.critical}`);
  console.log(`   High: ${report.technicalIssues.high}`);
  if (Object.keys(report.technicalIssues.byType).length > 0) {
    console.log('   By Type:');
    for (const [type, count] of Object.entries(report.technicalIssues.byType)) {
      console.log(`      - ${type}: ${count}`);
    }
  }

  // Core Web Vitals
  console.log('\n⚡ CORE WEB VITALS');
  console.log(`   Passing: ${report.coreWebVitals.passing}`);
  console.log(`   Failing: ${report.coreWebVitals.failing}`);
  console.log(`   Avg LCP: ${report.coreWebVitals.avgLCP}ms ${report.coreWebVitals.avgLCP <= 2500 ? '✅' : '❌'}`);
  console.log(`   Avg TBT: ${report.coreWebVitals.avgTBT}ms ${report.coreWebVitals.avgTBT <= 200 ? '✅' : '❌'}`);
  console.log(`   Avg CLS: ${report.coreWebVitals.avgCLS} ${report.coreWebVitals.avgCLS <= 0.1 ? '✅' : '❌'}`);

  // Content Health
  if (report.contentHealth.totalProducts > 0) {
    console.log('\n📝 CONTENT HEALTH');
    console.log(`   Total Products: ${report.contentHealth.totalProducts.toLocaleString()}`);
    console.log(`   Optimized: ${report.contentHealth.optimized.toLocaleString()} (${(report.contentHealth.optimized / report.contentHealth.totalProducts * 100).toFixed(1)}%)`);
    console.log(`   Needs Content: ${report.contentHealth.needsContent.toLocaleString()}`);
    console.log(`   No Description: ${report.contentHealth.noDescription.toLocaleString()}`);
  }

  // Anomalies
  if (report.anomalies.length > 0) {
    console.log('\n⚠️ TRAFFIC ANOMALIES');
    for (const anomaly of report.anomalies.slice(0, 5)) {
      console.log(`   ${anomaly.url}`);
      console.log(`      Drop: ${Math.abs(anomaly.traffic_drop_percent).toFixed(1)}% (${anomaly.clicks_before} → ${anomaly.clicks_after} clicks)`);
    }
    if (report.anomalies.length > 5) {
      console.log(`   ... and ${report.anomalies.length - 5} more`);
    }
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS');
    for (const rec of report.recommendations) {
      console.log(`   • ${rec}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1];
  const exportFlag = args.includes('--export');

  const businesses = businessArg ? [businessArg] : ['boo', 'teelixir', 'rhf'];

  console.log('SEO Performance Monitor - Health Check');
  console.log('======================================');

  const reports: SEOHealthReport[] = [];

  for (const business of businesses) {
    try {
      const report = await runHealthCheck(business);
      reports.push(report);
      printReport(report);
    } catch (error) {
      console.error(`Error checking ${business}:`, error instanceof Error ? error.message : String(error));
    }
  }

  if (exportFlag) {
    const filename = `seo-health-${new Date().toISOString().split('T')[0]}.json`;
    console.log(`\nExporting report to ${filename}...`);
    // In real implementation, would write to file
    console.log(JSON.stringify(reports, null, 2));
  }

  // Summary
  if (reports.length > 1) {
    console.log('\n📊 CROSS-BUSINESS SUMMARY');
    console.log('='.repeat(40));
    for (const report of reports) {
      const emoji = report.overallScore >= 80 ? '🟢' : report.overallScore >= 60 ? '🟡' : '🔴';
      console.log(`${emoji} ${report.business.toUpperCase().padEnd(10)} Score: ${report.overallScore}/100`);
    }
  }
}

main().catch(console.error);
