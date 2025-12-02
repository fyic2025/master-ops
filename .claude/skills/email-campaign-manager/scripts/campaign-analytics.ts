#!/usr/bin/env npx tsx

/**
 * Campaign Analytics Script
 *
 * Generates comprehensive analytics for email campaigns:
 * - Smartlead cold outreach performance
 * - Anniversary email conversion tracking
 * - Winback campaign ROI
 * - Cross-campaign comparison
 *
 * Usage: npx tsx scripts/campaign-analytics.ts [campaign-type] [days]
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.BOO_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_SERVICE_ROLE_KEY!
);

interface SmartleadCampaignMetrics {
  campaignId: string;
  campaignName: string;
  status: string;
  totalLeads: number;
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  replied: number;
  unsubscribed: number;
  syncedToHubspot: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
}

interface AnniversaryMetrics {
  totalCodes: number;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  expired: number;
  failed: number;
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  revenuePerEmail: number;
}

interface WinbackMetrics {
  totalSent: number;
  clicked: number;
  converted: number;
  bounced: number;
  failed: number;
  totalRevenue: number;
  conversionRate: number;
  clickToConvertRate: number;
  avgOrderValue: number;
  bestSendHour: number;
}

interface AnalyticsReport {
  generatedAt: string;
  period: { start: string; end: string };
  smartlead: SmartleadCampaignMetrics[];
  anniversary: AnniversaryMetrics;
  winback: WinbackMetrics;
  summary: {
    totalEmailsSent: number;
    totalRevenue: number;
    overallConversionRate: number;
    topPerformingCampaign: string;
    recommendations: string[];
  };
}

/**
 * Get Smartlead campaign metrics
 */
async function getSmartleadMetrics(days: number): Promise<SmartleadCampaignMetrics[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get campaigns
  const { data: campaigns } = await supabase
    .from('smartlead_campaigns')
    .select('*')
    .gte('created_at', startDate.toISOString());

  if (!campaigns || campaigns.length === 0) {
    return [];
  }

  const metrics: SmartleadCampaignMetrics[] = [];

  for (const campaign of campaigns) {
    // Get lead stats
    const { data: leads } = await supabase
      .from('smartlead_leads')
      .select('status, hubspot_synced_at')
      .eq('campaign_id', campaign.campaign_id);

    // Get email stats
    const { data: emails } = await supabase
      .from('smartlead_emails')
      .select('sent_at, delivered_at, bounced_at')
      .eq('campaign_id', campaign.campaign_id);

    // Get engagement stats
    const { data: engagement } = await supabase
      .from('smartlead_engagement')
      .select('event_type')
      .eq('campaign_id', campaign.campaign_id);

    const totalLeads = leads?.length || 0;
    const sent = emails?.filter(e => e.sent_at).length || 0;
    const delivered = emails?.filter(e => e.delivered_at).length || 0;
    const bounced = emails?.filter(e => e.bounced_at).length || 0;
    const opened = engagement?.filter(e => e.event_type === 'EMAIL_OPEN').length || 0;
    const clicked = engagement?.filter(e => e.event_type === 'EMAIL_LINK_CLICK').length || 0;
    const replied = leads?.filter(l => l.status === 'replied').length || 0;
    const unsubscribed = engagement?.filter(e => e.event_type === 'LEAD_UNSUBSCRIBED').length || 0;
    const syncedToHubspot = leads?.filter(l => l.hubspot_synced_at).length || 0;

    metrics.push({
      campaignId: campaign.campaign_id,
      campaignName: campaign.campaign_name,
      status: campaign.status,
      totalLeads,
      sent,
      delivered,
      bounced,
      opened,
      clicked,
      replied,
      unsubscribed,
      syncedToHubspot,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0
    });
  }

  return metrics;
}

/**
 * Get Anniversary campaign metrics
 */
async function getAnniversaryMetrics(days: number): Promise<AnniversaryMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('tlx_anniversary_discounts')
    .select('*')
    .gte('created_at', startDate.toISOString());

  if (!data || data.length === 0) {
    return {
      totalCodes: 0, sent: 0, opened: 0, clicked: 0, converted: 0,
      expired: 0, failed: 0, totalRevenue: 0, avgOrderValue: 0,
      conversionRate: 0, revenuePerEmail: 0
    };
  }

  const sent = data.filter(d => d.status === 'sent' || d.status === 'opened' || d.status === 'clicked' || d.status === 'converted').length;
  const opened = data.filter(d => d.opened_at).length;
  const clicked = data.filter(d => d.clicked_at).length;
  const converted = data.filter(d => d.status === 'converted').length;
  const expired = data.filter(d => d.status === 'expired').length;
  const failed = data.filter(d => d.status === 'failed').length;
  const totalRevenue = data
    .filter(d => d.converted_order_total)
    .reduce((sum, d) => sum + parseFloat(d.converted_order_total), 0);

  return {
    totalCodes: data.length,
    sent,
    opened,
    clicked,
    converted,
    expired,
    failed,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgOrderValue: converted > 0 ? Math.round((totalRevenue / converted) * 100) / 100 : 0,
    conversionRate: sent > 0 ? Math.round((converted / sent) * 100) : 0,
    revenuePerEmail: sent > 0 ? Math.round((totalRevenue / sent) * 100) / 100 : 0
  };
}

/**
 * Get Winback campaign metrics
 */
async function getWinbackMetrics(days: number): Promise<WinbackMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('tlx_winback_emails')
    .select('*')
    .gte('created_at', startDate.toISOString());

  if (!data || data.length === 0) {
    return {
      totalSent: 0, clicked: 0, converted: 0, bounced: 0, failed: 0,
      totalRevenue: 0, conversionRate: 0, clickToConvertRate: 0,
      avgOrderValue: 0, bestSendHour: 10
    };
  }

  const totalSent = data.filter(d => d.status === 'sent' || d.status === 'clicked' || d.status === 'converted').length;
  const clicked = data.filter(d => d.clicked_at).length;
  const converted = data.filter(d => d.status === 'converted').length;
  const bounced = data.filter(d => d.status === 'bounced').length;
  const failed = data.filter(d => d.status === 'failed').length;
  const totalRevenue = data
    .filter(d => d.order_total)
    .reduce((sum, d) => sum + parseFloat(d.order_total), 0);

  // Find best send hour
  const hourConversions: Record<number, { sent: number; converted: number }> = {};
  for (const email of data) {
    const hour = email.send_hour_melbourne || 10;
    if (!hourConversions[hour]) {
      hourConversions[hour] = { sent: 0, converted: 0 };
    }
    hourConversions[hour].sent++;
    if (email.status === 'converted') {
      hourConversions[hour].converted++;
    }
  }

  let bestHour = 10;
  let bestRate = 0;
  for (const [hour, stats] of Object.entries(hourConversions)) {
    const rate = stats.sent > 5 ? stats.converted / stats.sent : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestHour = parseInt(hour);
    }
  }

  return {
    totalSent,
    clicked,
    converted,
    bounced,
    failed,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    conversionRate: totalSent > 0 ? Math.round((converted / totalSent) * 100) : 0,
    clickToConvertRate: clicked > 0 ? Math.round((converted / clicked) * 100) : 0,
    avgOrderValue: converted > 0 ? Math.round((totalRevenue / converted) * 100) / 100 : 0,
    bestSendHour: bestHour
  };
}

/**
 * Generate full analytics report
 */
async function generateReport(days: number): Promise<AnalyticsReport> {
  console.log(`\nGenerating analytics report for last ${days} days...\n`);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [smartlead, anniversary, winback] = await Promise.all([
    getSmartleadMetrics(days),
    getAnniversaryMetrics(days),
    getWinbackMetrics(days)
  ]);

  // Calculate summary
  const totalSmartleadSent = smartlead.reduce((sum, c) => sum + c.sent, 0);
  const totalSmartleadReplies = smartlead.reduce((sum, c) => sum + c.replied, 0);
  const totalEmailsSent = totalSmartleadSent + anniversary.sent + winback.totalSent;
  const totalRevenue = anniversary.totalRevenue + winback.totalRevenue;
  const totalConversions = anniversary.converted + winback.converted + totalSmartleadReplies;

  // Find top performing campaign
  let topCampaign = 'N/A';
  if (smartlead.length > 0) {
    const best = smartlead.reduce((a, b) => a.replyRate > b.replyRate ? a : b);
    topCampaign = `${best.campaignName} (${best.replyRate}% reply rate)`;
  }

  // Generate recommendations
  const recommendations: string[] = [];

  // Smartlead recommendations
  const highBounce = smartlead.filter(c => c.bounceRate > 5);
  if (highBounce.length > 0) {
    recommendations.push(`${highBounce.length} campaigns have >5% bounce rate - clean lists`);
  }

  const lowOpen = smartlead.filter(c => c.openRate < 20 && c.sent > 100);
  if (lowOpen.length > 0) {
    recommendations.push(`${lowOpen.length} campaigns have <20% open rate - improve subject lines`);
  }

  // Anniversary recommendations
  if (anniversary.conversionRate < 5 && anniversary.sent > 50) {
    recommendations.push('Anniversary conversion rate below 5% - review offer and timing');
  }

  // Winback recommendations
  if (winback.conversionRate > 10) {
    recommendations.push(`Winback performing well (${winback.conversionRate}% conv) - consider increasing volume`);
  }
  if (winback.bestSendHour !== 10) {
    recommendations.push(`Best winback send time: ${winback.bestSendHour}:00 Melbourne time`);
  }

  return {
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    },
    smartlead,
    anniversary,
    winback,
    summary: {
      totalEmailsSent,
      totalRevenue,
      overallConversionRate: totalEmailsSent > 0
        ? Math.round((totalConversions / totalEmailsSent) * 100)
        : 0,
      topPerformingCampaign: topCampaign,
      recommendations
    }
  };
}

/**
 * Print report to console
 */
function printReport(report: AnalyticsReport) {
  console.log('='.repeat(70));
  console.log('EMAIL CAMPAIGN ANALYTICS REPORT');
  console.log('='.repeat(70));
  console.log(`Period: ${report.period.start} to ${report.period.end}`);
  console.log(`Generated: ${report.generatedAt}\n`);

  // Summary
  console.log('--- SUMMARY ---');
  console.log(`Total Emails Sent: ${report.summary.totalEmailsSent.toLocaleString()}`);
  console.log(`Total Revenue: $${report.summary.totalRevenue.toLocaleString()}`);
  console.log(`Overall Conversion: ${report.summary.overallConversionRate}%`);
  console.log(`Top Campaign: ${report.summary.topPerformingCampaign}\n`);

  // Smartlead campaigns
  if (report.smartlead.length > 0) {
    console.log('--- SMARTLEAD CAMPAIGNS ---');
    console.log('Campaign'.padEnd(30) + 'Sent'.padStart(8) + 'Open%'.padStart(8) +
                'Reply%'.padStart(8) + 'Bounce%'.padStart(8));
    console.log('-'.repeat(62));
    for (const c of report.smartlead) {
      console.log(
        c.campaignName.substring(0, 28).padEnd(30) +
        c.sent.toString().padStart(8) +
        `${c.openRate}%`.padStart(8) +
        `${c.replyRate}%`.padStart(8) +
        `${c.bounceRate}%`.padStart(8)
      );
    }
    console.log('');
  }

  // Anniversary
  console.log('--- ANNIVERSARY EMAILS (Teelixir) ---');
  console.log(`Sent: ${report.anniversary.sent}`);
  console.log(`Opened: ${report.anniversary.opened} (${report.anniversary.sent > 0 ? Math.round((report.anniversary.opened / report.anniversary.sent) * 100) : 0}%)`);
  console.log(`Clicked: ${report.anniversary.clicked} (${report.anniversary.opened > 0 ? Math.round((report.anniversary.clicked / report.anniversary.opened) * 100) : 0}%)`);
  console.log(`Converted: ${report.anniversary.converted} (${report.anniversary.conversionRate}%)`);
  console.log(`Revenue: $${report.anniversary.totalRevenue.toLocaleString()}`);
  console.log(`Revenue/Email: $${report.anniversary.revenuePerEmail}\n`);

  // Winback
  console.log('--- WINBACK EMAILS (Teelixir) ---');
  console.log(`Sent: ${report.winback.totalSent}`);
  console.log(`Clicked: ${report.winback.clicked}`);
  console.log(`Converted: ${report.winback.converted} (${report.winback.conversionRate}%)`);
  console.log(`Revenue: $${report.winback.totalRevenue.toLocaleString()}`);
  console.log(`Best Send Hour: ${report.winback.bestSendHour}:00 Melbourne\n`);

  // Recommendations
  if (report.summary.recommendations.length > 0) {
    console.log('--- RECOMMENDATIONS ---');
    report.summary.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  console.log('\n' + '='.repeat(70));
}

/**
 * Main entry point
 */
async function main() {
  const campaignType = process.argv[2] || 'all';
  const days = parseInt(process.argv[3]) || 30;

  try {
    const report = await generateReport(days);
    printReport(report);

    // Save to file
    const filename = `email-analytics-${report.period.start}-to-${report.period.end}.json`;
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${filename}`);

  } catch (error) {
    console.error('Analytics generation failed:', error);
    process.exit(1);
  }
}

main();
