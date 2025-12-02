#!/usr/bin/env npx tsx
/**
 * Marketing Analytics Report Generator
 *
 * Generates comprehensive marketing performance reports across all channels.
 * Aggregates data from email, ads, SEO, and social media.
 *
 * Usage:
 *   npx tsx generate-report.ts --business teelixir --period weekly
 *   npx tsx generate-report.ts --business boo --period monthly
 *   npx tsx generate-report.ts --all --period daily
 */

import { createClient } from '@supabase/supabase-js';

interface ChannelMetrics {
  channel: string;
  sessions: number;
  conversions: number;
  revenue: number;
  cost: number;
  roas: number;
  conversionRate: number;
}

interface EmailMetrics {
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
  openRate: number;
  clickRate: number;
}

interface SEOMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  topKeywords: { keyword: string; clicks: number; position: number }[];
}

interface MarketingReport {
  business: string;
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalConversions: number;
    overallRoas: number;
    revenueChange: number;
  };
  channels: ChannelMetrics[];
  email: EmailMetrics;
  seo: SEOMetrics;
  recommendations: string[];
}

// Initialize Supabase
function getSupabaseClient() {
  const url = process.env.MASTER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MASTER_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key);
}

// Get date range for period
function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'daily':
      start.setDate(start.getDate() - 1);
      break;
    case 'weekly':
      start.setDate(start.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarterly':
      start.setMonth(start.getMonth() - 3);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }

  return { start, end };
}

// Fetch channel data
async function fetchChannelMetrics(
  supabase: ReturnType<typeof createClient>,
  business: string,
  startDate: string,
  endDate: string
): Promise<ChannelMetrics[]> {
  // Fetch from GA4 data
  const { data: ga4Data } = await supabase
    .from('ga4_channel_performance')
    .select('*')
    .eq('business_slug', business)
    .gte('date', startDate)
    .lte('date', endDate);

  // Fetch from Google Ads
  const { data: adsData } = await supabase
    .from('google_ads_performance')
    .select('*')
    .eq('business_slug', business)
    .gte('date', startDate)
    .lte('date', endDate);

  const channelMap = new Map<string, ChannelMetrics>();

  // Aggregate GA4 data by channel
  for (const row of ga4Data || []) {
    const channel = row.channel_grouping || 'Other';
    const existing = channelMap.get(channel) || {
      channel,
      sessions: 0,
      conversions: 0,
      revenue: 0,
      cost: 0,
      roas: 0,
      conversionRate: 0
    };

    existing.sessions += row.sessions || 0;
    existing.conversions += row.conversions || 0;
    existing.revenue += row.revenue || 0;

    channelMap.set(channel, existing);
  }

  // Add paid search costs
  const paidSearchCost = (adsData || []).reduce((sum, row) =>
    sum + (row.cost_micros ? row.cost_micros / 1000000 : 0), 0);

  const paidSearch = channelMap.get('Paid Search') || {
    channel: 'Paid Search',
    sessions: 0,
    conversions: 0,
    revenue: 0,
    cost: 0,
    roas: 0,
    conversionRate: 0
  };
  paidSearch.cost = paidSearchCost;
  channelMap.set('Paid Search', paidSearch);

  // Calculate derived metrics
  return Array.from(channelMap.values()).map(channel => ({
    ...channel,
    roas: channel.cost > 0 ? channel.revenue / channel.cost : 0,
    conversionRate: channel.sessions > 0 ? (channel.conversions / channel.sessions) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);
}

// Fetch email metrics
async function fetchEmailMetrics(
  supabase: ReturnType<typeof createClient>,
  business: string,
  startDate: string,
  endDate: string
): Promise<EmailMetrics> {
  const { data } = await supabase
    .from('email_campaign_metrics')
    .select('*')
    .eq('business_slug', business)
    .gte('sent_at', startDate)
    .lte('sent_at', endDate);

  const metrics = (data || []).reduce((acc, row) => ({
    sent: acc.sent + (row.sent || 0),
    delivered: acc.delivered + (row.delivered || 0),
    opens: acc.opens + (row.opens || 0),
    clicks: acc.clicks + (row.clicks || 0),
    conversions: acc.conversions + (row.conversions || 0),
    revenue: acc.revenue + (row.revenue || 0)
  }), { sent: 0, delivered: 0, opens: 0, clicks: 0, conversions: 0, revenue: 0 });

  return {
    ...metrics,
    openRate: metrics.delivered > 0 ? (metrics.opens / metrics.delivered) * 100 : 0,
    clickRate: metrics.opens > 0 ? (metrics.clicks / metrics.opens) * 100 : 0
  };
}

// Fetch SEO metrics
async function fetchSEOMetrics(
  supabase: ReturnType<typeof createClient>,
  business: string,
  startDate: string,
  endDate: string
): Promise<SEOMetrics> {
  const { data } = await supabase
    .from('gsc_search_performance')
    .select('*')
    .eq('business_slug', business)
    .gte('date', startDate)
    .lte('date', endDate);

  const totals = (data || []).reduce((acc, row) => ({
    impressions: acc.impressions + (row.impressions || 0),
    clicks: acc.clicks + (row.clicks || 0),
    positionSum: acc.positionSum + ((row.position || 0) * (row.impressions || 0)),
    impressionsForAvg: acc.impressionsForAvg + (row.impressions || 0)
  }), { impressions: 0, clicks: 0, positionSum: 0, impressionsForAvg: 0 });

  // Get top keywords
  const keywordMap = new Map<string, { clicks: number; position: number; count: number }>();
  for (const row of data || []) {
    if (row.query) {
      const existing = keywordMap.get(row.query) || { clicks: 0, position: 0, count: 0 };
      existing.clicks += row.clicks || 0;
      existing.position += row.position || 0;
      existing.count += 1;
      keywordMap.set(row.query, existing);
    }
  }

  const topKeywords = Array.from(keywordMap.entries())
    .map(([keyword, data]) => ({
      keyword,
      clicks: data.clicks,
      position: data.count > 0 ? data.position / data.count : 0
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    avgPosition: totals.impressionsForAvg > 0 ? totals.positionSum / totals.impressionsForAvg : 0,
    topKeywords
  };
}

// Generate recommendations
function generateRecommendations(report: MarketingReport): string[] {
  const recommendations: string[] = [];

  // Channel recommendations
  const lowRoasChannels = report.channels.filter(c => c.cost > 50 && c.roas < 2);
  if (lowRoasChannels.length > 0) {
    recommendations.push(`Review underperforming paid channels: ${lowRoasChannels.map(c => c.channel).join(', ')}`);
  }

  const highRoasChannels = report.channels.filter(c => c.roas > 5 && c.cost > 0);
  if (highRoasChannels.length > 0) {
    recommendations.push(`Consider increasing budget on high-ROAS channels: ${highRoasChannels.map(c => c.channel).join(', ')}`);
  }

  // Email recommendations
  if (report.email.openRate < 20) {
    recommendations.push('Email open rate below 20% - test subject lines and sender names');
  }
  if (report.email.clickRate < 2) {
    recommendations.push('Email click rate below 2% - review content and CTA placement');
  }

  // SEO recommendations
  if (report.seo.ctr < 2) {
    recommendations.push('Organic CTR below 2% - optimize meta titles and descriptions');
  }
  if (report.seo.avgPosition > 20) {
    recommendations.push('Average position above 20 - focus on content optimization and link building');
  }

  if (recommendations.length === 0) {
    recommendations.push('All metrics within normal ranges. Continue current strategies.');
  }

  return recommendations;
}

// Format report output
function formatReport(report: MarketingReport): string {
  const lines = [
    '',
    '═'.repeat(80),
    `  MARKETING PERFORMANCE REPORT`,
    `  ${report.business.toUpperCase()} | ${report.period.toUpperCase()}`,
    `  ${report.startDate} to ${report.endDate}`,
    '═'.repeat(80),
    '',
    '📊 EXECUTIVE SUMMARY',
    '─'.repeat(80),
    `  Total Revenue:      $${report.summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    `  Total Ad Spend:     $${report.summary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    `  Total Conversions:  ${report.summary.totalConversions.toLocaleString()}`,
    `  Overall ROAS:       ${report.summary.overallRoas.toFixed(2)}x`,
    ''
  ];

  // Channel breakdown
  lines.push('📈 CHANNEL PERFORMANCE');
  lines.push('─'.repeat(80));
  lines.push('  Channel              Sessions    Conv    Revenue       Cost      ROAS');
  lines.push('  ' + '─'.repeat(76));

  for (const channel of report.channels.slice(0, 8)) {
    const channelName = channel.channel.padEnd(20);
    const sessions = channel.sessions.toLocaleString().padStart(8);
    const conv = channel.conversions.toLocaleString().padStart(7);
    const revenue = `$${channel.revenue.toFixed(0)}`.padStart(10);
    const cost = channel.cost > 0 ? `$${channel.cost.toFixed(0)}`.padStart(10) : '-'.padStart(10);
    const roas = channel.cost > 0 ? `${channel.roas.toFixed(2)}x`.padStart(9) : '-'.padStart(9);

    lines.push(`  ${channelName}${sessions}${conv}${revenue}${cost}${roas}`);
  }
  lines.push('');

  // Email performance
  lines.push('📧 EMAIL PERFORMANCE');
  lines.push('─'.repeat(80));
  lines.push(`  Emails Sent:     ${report.email.sent.toLocaleString()}`);
  lines.push(`  Open Rate:       ${report.email.openRate.toFixed(1)}%`);
  lines.push(`  Click Rate:      ${report.email.clickRate.toFixed(1)}%`);
  lines.push(`  Conversions:     ${report.email.conversions.toLocaleString()}`);
  lines.push(`  Revenue:         $${report.email.revenue.toFixed(2)}`);
  lines.push('');

  // SEO performance
  lines.push('🔍 SEO PERFORMANCE');
  lines.push('─'.repeat(80));
  lines.push(`  Impressions:     ${report.seo.impressions.toLocaleString()}`);
  lines.push(`  Clicks:          ${report.seo.clicks.toLocaleString()}`);
  lines.push(`  CTR:             ${report.seo.ctr.toFixed(2)}%`);
  lines.push(`  Avg Position:    ${report.seo.avgPosition.toFixed(1)}`);
  lines.push('');
  lines.push('  Top Keywords:');
  for (const kw of report.seo.topKeywords.slice(0, 5)) {
    lines.push(`    - "${kw.keyword}" (${kw.clicks} clicks, pos ${kw.position.toFixed(1)})`);
  }
  lines.push('');

  // Recommendations
  lines.push('💡 RECOMMENDATIONS');
  lines.push('─'.repeat(80));
  for (const rec of report.recommendations) {
    lines.push(`  • ${rec}`);
  }
  lines.push('');

  return lines.join('\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const business = args.find(a => a.startsWith('--business='))?.split('=')[1]
    || (args.includes('--business') ? args[args.indexOf('--business') + 1] : null);
  const period = args.find(a => a.startsWith('--period='))?.split('=')[1]
    || (args.includes('--period') ? args[args.indexOf('--period') + 1] : 'weekly');
  const processAll = args.includes('--all');

  const businesses = processAll
    ? ['boo', 'teelixir', 'elevate', 'rhf']
    : (business ? [business] : []);

  if (businesses.length === 0) {
    console.log('Usage: npx tsx generate-report.ts --business <business> --period <daily|weekly|monthly>');
    console.log('       npx tsx generate-report.ts --all --period weekly');
    process.exit(1);
  }

  const supabase = getSupabaseClient();
  const { start, end } = getDateRange(period);
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  for (const biz of businesses) {
    console.log(`\n📊 Generating ${period} report for ${biz}...`);

    const channels = await fetchChannelMetrics(supabase, biz, startDate, endDate);
    const email = await fetchEmailMetrics(supabase, biz, startDate, endDate);
    const seo = await fetchSEOMetrics(supabase, biz, startDate, endDate);

    const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);
    const totalCost = channels.reduce((sum, c) => sum + c.cost, 0);
    const totalConversions = channels.reduce((sum, c) => sum + c.conversions, 0);

    const report: MarketingReport = {
      business: biz,
      period,
      startDate,
      endDate,
      summary: {
        totalRevenue,
        totalCost,
        totalConversions,
        overallRoas: totalCost > 0 ? totalRevenue / totalCost : 0,
        revenueChange: 0 // Would need previous period comparison
      },
      channels,
      email,
      seo,
      recommendations: []
    };

    report.recommendations = generateRecommendations(report);

    console.log(formatReport(report));

    // Store report in database
    await supabase.from('marketing_reports').upsert({
      business_slug: biz,
      report_period: period,
      start_date: startDate,
      end_date: endDate,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_conversions: totalConversions,
      overall_roas: report.summary.overallRoas,
      channel_data: channels,
      email_data: email,
      seo_data: seo,
      recommendations: report.recommendations,
      generated_at: new Date().toISOString()
    }, {
      onConflict: 'business_slug,report_period,start_date'
    });
  }

  console.log('\n✅ Reports generated and saved');
}

main().catch(console.error);
