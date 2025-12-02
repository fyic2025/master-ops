#!/usr/bin/env npx tsx
/**
 * Google Ads Evening Briefing Generator
 *
 * Generates a daily performance summary for all Google Ads accounts.
 * Run daily at 6 PM AEST to review yesterday's performance.
 *
 * Usage:
 *   npx tsx evening-briefing.ts                    # All businesses
 *   npx tsx evening-briefing.ts --business boo     # Single business
 *   npx tsx evening-briefing.ts --days 7           # Last 7 days
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const BUSINESSES = {
  boo: {
    name: 'Buy Organics Online',
    accountId: process.env.BOO_GOOGLE_ADS_ACCOUNT_ID,
    targetRoas: 4.0,
    dailyBudget: 150
  },
  teelixir: {
    name: 'Teelixir',
    accountId: process.env.TEELIXIR_GOOGLE_ADS_ACCOUNT_ID,
    targetRoas: 3.5,
    dailyBudget: 100
  },
  rhf: {
    name: 'Red Hill Fresh',
    accountId: process.env.RHF_GOOGLE_ADS_ACCOUNT_ID,
    targetRoas: 3.0,
    dailyBudget: 50
  }
};

interface CampaignMetrics {
  campaignName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  roas: number;
}

interface DailyBriefing {
  business: string;
  date: string;
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  overallRoas: number;
  campaigns: CampaignMetrics[];
  alerts: string[];
  recommendations: string[];
}

// Initialize Supabase client
function getSupabaseClient() {
  const url = process.env.MASTER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MASTER_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Set MASTER_SUPABASE_URL and MASTER_SUPABASE_SERVICE_KEY');
  }

  return createClient(url, key);
}

// Fetch performance data from Supabase (synced from Google Ads)
async function fetchPerformanceData(
  supabase: ReturnType<typeof createClient>,
  business: string,
  days: number = 1
): Promise<CampaignMetrics[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('google_ads_performance')
    .select('*')
    .eq('business_slug', business)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });

  if (error) {
    console.error(`Error fetching data for ${business}:`, error.message);
    return [];
  }

  // Aggregate by campaign
  const campaignMap = new Map<string, CampaignMetrics>();

  for (const row of data || []) {
    const existing = campaignMap.get(row.campaign_name) || {
      campaignName: row.campaign_name,
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
      ctr: 0,
      cpc: 0,
      roas: 0
    };

    existing.impressions += row.impressions || 0;
    existing.clicks += row.clicks || 0;
    existing.cost += row.cost_micros ? row.cost_micros / 1000000 : 0;
    existing.conversions += row.conversions || 0;
    existing.conversionValue += row.conversion_value || 0;

    campaignMap.set(row.campaign_name, existing);
  }

  // Calculate derived metrics
  return Array.from(campaignMap.values()).map(campaign => ({
    ...campaign,
    ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
    cpc: campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0,
    roas: campaign.cost > 0 ? campaign.conversionValue / campaign.cost : 0
  }));
}

// Generate alerts based on performance
function generateAlerts(
  campaigns: CampaignMetrics[],
  config: typeof BUSINESSES.boo
): string[] {
  const alerts: string[] = [];

  const totalSpend = campaigns.reduce((sum, c) => sum + c.cost, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.conversionValue, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  // ROAS alerts
  if (overallRoas < config.targetRoas * 0.8) {
    alerts.push(`ROAS ${overallRoas.toFixed(2)}x is below target ${config.targetRoas}x`);
  }

  // Budget alerts
  if (totalSpend > config.dailyBudget * 1.1) {
    alerts.push(`Overspend: $${totalSpend.toFixed(2)} vs budget $${config.dailyBudget}`);
  } else if (totalSpend < config.dailyBudget * 0.5) {
    alerts.push(`Underspend: $${totalSpend.toFixed(2)} vs budget $${config.dailyBudget}`);
  }

  // Campaign-level alerts
  for (const campaign of campaigns) {
    if (campaign.clicks > 50 && campaign.conversions === 0) {
      alerts.push(`${campaign.campaignName}: 0 conversions from ${campaign.clicks} clicks`);
    }
    if (campaign.cpc > 3.0) {
      alerts.push(`${campaign.campaignName}: High CPC $${campaign.cpc.toFixed(2)}`);
    }
  }

  return alerts;
}

// Generate recommendations
function generateRecommendations(
  campaigns: CampaignMetrics[],
  alerts: string[]
): string[] {
  const recommendations: string[] = [];

  // Find best and worst performers
  const sortedByRoas = [...campaigns].sort((a, b) => b.roas - a.roas);

  if (sortedByRoas.length > 0) {
    const best = sortedByRoas[0];
    if (best.roas > 5) {
      recommendations.push(`Consider increasing budget on "${best.campaignName}" (ROAS: ${best.roas.toFixed(2)}x)`);
    }

    const worst = sortedByRoas[sortedByRoas.length - 1];
    if (worst.roas < 1 && worst.cost > 20) {
      recommendations.push(`Review "${worst.campaignName}" - spending $${worst.cost.toFixed(2)} with ROAS ${worst.roas.toFixed(2)}x`);
    }
  }

  // CTR recommendations
  const lowCtrCampaigns = campaigns.filter(c => c.ctr < 1 && c.impressions > 1000);
  if (lowCtrCampaigns.length > 0) {
    recommendations.push(`${lowCtrCampaigns.length} campaigns have CTR < 1% - review ad copy`);
  }

  return recommendations;
}

// Format briefing output
function formatBriefing(briefing: DailyBriefing): string {
  const lines: string[] = [
    '',
    '═'.repeat(60),
    `  ${briefing.business} - Google Ads Briefing`,
    `  ${briefing.date}`,
    '═'.repeat(60),
    '',
    '📊 SUMMARY',
    '─'.repeat(40),
    `  Total Spend:       $${briefing.totalSpend.toFixed(2)}`,
    `  Total Revenue:     $${briefing.totalRevenue.toFixed(2)}`,
    `  Conversions:       ${briefing.totalConversions}`,
    `  Overall ROAS:      ${briefing.overallRoas.toFixed(2)}x`,
    ''
  ];

  if (briefing.alerts.length > 0) {
    lines.push('🚨 ALERTS');
    lines.push('─'.repeat(40));
    briefing.alerts.forEach(alert => lines.push(`  • ${alert}`));
    lines.push('');
  }

  if (briefing.campaigns.length > 0) {
    lines.push('📈 CAMPAIGN PERFORMANCE');
    lines.push('─'.repeat(40));

    for (const campaign of briefing.campaigns.slice(0, 10)) {
      lines.push(`  ${campaign.campaignName}`);
      lines.push(`    Spend: $${campaign.cost.toFixed(2)} | Revenue: $${campaign.conversionValue.toFixed(2)} | ROAS: ${campaign.roas.toFixed(2)}x`);
      lines.push(`    Clicks: ${campaign.clicks} | CTR: ${campaign.ctr.toFixed(2)}% | CPC: $${campaign.cpc.toFixed(2)}`);
      lines.push('');
    }
  }

  if (briefing.recommendations.length > 0) {
    lines.push('💡 RECOMMENDATIONS');
    lines.push('─'.repeat(40));
    briefing.recommendations.forEach(rec => lines.push(`  • ${rec}`));
    lines.push('');
  }

  return lines.join('\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const businessArg = args.find(a => a.startsWith('--business='))?.split('=')[1]
    || (args.includes('--business') ? args[args.indexOf('--business') + 1] : null);
  const daysArg = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '1');

  console.log('🌙 Google Ads Evening Briefing');
  console.log(`   Date: ${new Date().toLocaleDateString('en-AU')}`);
  console.log(`   Period: Last ${daysArg} day(s)`);

  const supabase = getSupabaseClient();
  const businessesToProcess = businessArg
    ? { [businessArg]: BUSINESSES[businessArg as keyof typeof BUSINESSES] }
    : BUSINESSES;

  for (const [slug, config] of Object.entries(businessesToProcess)) {
    if (!config) {
      console.error(`Unknown business: ${slug}`);
      continue;
    }

    try {
      const campaigns = await fetchPerformanceData(supabase, slug, daysArg);

      const totalSpend = campaigns.reduce((sum, c) => sum + c.cost, 0);
      const totalRevenue = campaigns.reduce((sum, c) => sum + c.conversionValue, 0);
      const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);

      const alerts = generateAlerts(campaigns, config);
      const recommendations = generateRecommendations(campaigns, alerts);

      const briefing: DailyBriefing = {
        business: config.name,
        date: new Date().toLocaleDateString('en-AU'),
        totalSpend,
        totalRevenue,
        totalConversions,
        overallRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        campaigns: campaigns.sort((a, b) => b.cost - a.cost),
        alerts,
        recommendations
      };

      console.log(formatBriefing(briefing));

      // Store briefing in database
      await supabase.from('google_ads_briefings').upsert({
        business_slug: slug,
        briefing_date: new Date().toISOString().split('T')[0],
        total_spend: totalSpend,
        total_revenue: totalRevenue,
        total_conversions: totalConversions,
        overall_roas: briefing.overallRoas,
        alerts: alerts,
        recommendations: recommendations,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'business_slug,briefing_date'
      });

    } catch (error) {
      console.error(`Error processing ${config.name}:`, error);
    }
  }

  console.log('\n✅ Briefing complete');
}

main().catch(console.error);
