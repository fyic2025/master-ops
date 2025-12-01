#!/usr/bin/env node
/**
 * KLAVIYO ENGAGEMENT ANALYSIS
 *
 * Analyzes email campaign data over the past 12 months to identify
 * correlations between send volume and unengagement rates.
 *
 * Usage:
 *   node scripts/klaviyo-engagement-analysis.js [business]
 *   node scripts/klaviyo-engagement-analysis.js teelixir
 */

const https = require('https');
const creds = require('../creds');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const KLAVIYO_API_BASE = 'a.klaviyo.com';
const API_REVISION = '2024-10-15';

const BUSINESSES = {
  teelixir: { name: 'Teelixir', credKey: 'klaviyo_api_key' }
};

// ═══════════════════════════════════════════════════════════════════════════
// KLAVIYO API CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class KlaviyoClient {
  constructor(apiKey, businessName) {
    this.apiKey = apiKey;
    this.businessName = businessName;
  }

  async request(method, endpoint, params = {}, body = null) {
    return new Promise((resolve, reject) => {
      let path = `/api${endpoint}`;

      // Add query params for GET requests
      if (method === 'GET' && Object.keys(params).length > 0) {
        const queryString = Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        path += `?${queryString}`;
      }

      const postData = body ? JSON.stringify(body) : '';

      const options = {
        hostname: KLAVIYO_API_BASE,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'revision': API_REVISION,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 429) {
            // Rate limited - wait and retry
            setTimeout(() => {
              this.request(method, endpoint, params, body).then(resolve).catch(reject);
            }, 2000);
            return;
          }
          if (res.statusCode >= 400) {
            reject(new Error(`Klaviyo API Error (${res.statusCode}): ${data}`));
          } else {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(postData);
      req.end();
    });
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Get all campaigns
  async getCampaigns() {
    const allCampaigns = [];
    let nextCursor = null;

    const elevenMonthsAgo = new Date();
    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);

    do {
      const params = {
        'filter': `and(equals(messages.channel,'email'),greater-or-equal(created_at,${elevenMonthsAgo.toISOString()}))`,
        'sort': '-created_at'
      };

      if (nextCursor) {
        params['page[cursor]'] = nextCursor;
      }

      const response = await this.request('GET', '/campaigns', params);

      if (response.data) {
        allCampaigns.push(...response.data);
      }

      nextCursor = response.links?.next ?
        new URL(response.links.next).searchParams.get('page[cursor]') : null;

      await this.sleep(100);
    } while (nextCursor);

    return allCampaigns;
  }

  // Get metrics list
  async getMetrics() {
    const allMetrics = [];
    let nextCursor = null;

    do {
      const params = {};
      if (nextCursor) {
        params['page[cursor]'] = nextCursor;
      }

      const response = await this.request('GET', '/metrics', params);

      if (response.data) {
        allMetrics.push(...response.data);
      }

      nextCursor = response.links?.next ?
        new URL(response.links.next).searchParams.get('page[cursor]') : null;

      await this.sleep(100);
    } while (nextCursor);

    return allMetrics;
  }

  // Query metric aggregates with proper date bounds
  async queryMetricAggregates(metricId, startDate, endDate) {
    const body = {
      data: {
        type: 'metric-aggregate',
        attributes: {
          metric_id: metricId,
          measurements: ['count'],
          interval: 'month',
          filter: [
            `greater-or-equal(datetime,${startDate.toISOString()})`,
            `less-than(datetime,${endDate.toISOString()})`
          ]
        }
      }
    };

    return this.request('POST', '/metric-aggregates', {}, body);
  }

  // Get campaign values/stats for a specific campaign using reporting query
  async getCampaignValues(campaignId) {
    try {
      // Use the campaign reporting endpoint
      const body = {
        data: {
          type: 'campaign-values-report',
          attributes: {
            statistics: ['opens', 'unique_opens', 'clicks', 'unique_clicks', 'recipients', 'bounces', 'unsubscribes', 'spam_complaints'],
            timeframe: {
              key: 'last_365_days'
            },
            conversion_metric_id: null
          },
          relationships: {
            campaigns: {
              data: [{ type: 'campaign', id: campaignId }]
            }
          }
        }
      };

      const response = await this.request('POST', '/campaign-values-reports', {}, body);

      if (response.data?.attributes?.results?.[0]) {
        return { statistics: response.data.attributes.results[0] };
      }
      return null;
    } catch (e) {
      // Silently fail - some campaigns may not have stats
      return null;
    }
  }

  // Get flows
  async getFlows() {
    const allFlows = [];
    let nextCursor = null;

    do {
      const params = {};
      if (nextCursor) {
        params['page[cursor]'] = nextCursor;
      }

      const response = await this.request('GET', '/flows', params);

      if (response.data) {
        allFlows.push(...response.data);
      }

      nextCursor = response.links?.next ?
        new URL(response.links.next).searchParams.get('page[cursor]') : null;

      await this.sleep(100);
    } while (nextCursor);

    return allFlows;
  }

  // Get monthly email metrics
  async getMonthlyEmailMetrics() {
    const endDate = new Date();
    const startDate = new Date();
    // Set to exactly 11 months ago to stay under 1 year limit
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const metricNames = [
      'Received Email',
      'Opened Email',
      'Clicked Email',
      'Bounced Email',
      'Marked Email as Spam',
      'Unsubscribed from List'
    ];

    const metricKeys = {
      'Received Email': 'received',
      'Opened Email': 'opened',
      'Clicked Email': 'clicked',
      'Bounced Email': 'bounced',
      'Marked Email as Spam': 'spam',
      'Unsubscribed from List': 'unsubscribed'
    };

    // Get all metrics to find IDs
    console.log(`  Fetching metric definitions...`);
    const allMetrics = await this.getMetrics();

    const metricMap = {};
    for (const m of allMetrics) {
      metricMap[m.attributes.name] = m.id;
    }

    console.log(`  Found ${Object.keys(metricMap).length} metrics`);

    const results = {};

    for (const metricName of metricNames) {
      const metricId = metricMap[metricName];
      if (!metricId) {
        console.log(`  Metric "${metricName}" not found, skipping...`);
        continue;
      }

      console.log(`  Querying ${metricName}...`);

      try {
        const response = await this.queryMetricAggregates(metricId, startDate, endDate);

        // Debug: log full response for first metric
        if (metricName === 'Received Email') {
          console.log(`    Full response: ${JSON.stringify(response.data?.attributes, null, 2).substring(0, 1000)}`);
        }

        // Klaviyo returns: { dates: [...], data: [{ dimensions: [], measurements: { count: [...] }}] }
        const attrs = response.data?.attributes;
        if (attrs?.dates && attrs?.data?.[0]?.measurements?.count) {
          const dates = attrs.dates;
          const counts = attrs.data[0].measurements.count;

          const formatted = dates.map((date, idx) => ({
            dimensions: [date],
            measurements: { count: counts[idx] || 0 }
          }));
          results[metricKeys[metricName]] = formatted;
          console.log(`    Got ${dates.length} data points`);
        } else {
          console.log(`    Unexpected response structure`);
        }

        await this.sleep(200); // Rate limiting
      } catch (e) {
        console.log(`  Error querying ${metricName}: ${e.message}`);
      }
    }

    return results;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function calculateCorrelation(xArray, yArray) {
  if (xArray.length !== yArray.length || xArray.length < 2) return 0;

  const n = xArray.length;
  const sumX = xArray.reduce((a, b) => a + b, 0);
  const sumY = yArray.reduce((a, b) => a + b, 0);
  const sumXY = xArray.reduce((total, x, i) => total + x * yArray[i], 0);
  const sumX2 = xArray.reduce((total, x) => total + x * x, 0);
  const sumY2 = yArray.reduce((total, y) => total + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatPercent(num) {
  return (num * 100).toFixed(2) + '%';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeBusinessKlaviyo(businessKey) {
  const business = BUSINESSES[businessKey];
  if (!business) {
    console.error(`Unknown business: ${businessKey}`);
    return null;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(` KLAVIYO ANALYSIS: ${business.name.toUpperCase()}`);
  console.log('═'.repeat(70));

  // Get API key from vault
  console.log(`\nFetching API credentials...`);
  const apiKey = await creds.get(businessKey, business.credKey);

  if (!apiKey) {
    console.error(`  ERROR: No Klaviyo API key found for ${businessKey}`);
    return null;
  }
  console.log(`  ✓ API key retrieved`);

  const client = new KlaviyoClient(apiKey, business.name);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. GET MONTHLY EMAIL METRICS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' MONTHLY EMAIL METRICS (Past 12 Months)');
  console.log('─'.repeat(50));

  const monthlyMetrics = await client.getMonthlyEmailMetrics();

  // ─────────────────────────────────────────────────────────────────────────
  // 2. GET CAMPAIGNS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' CAMPAIGN ANALYSIS');
  console.log('─'.repeat(50));

  console.log(`\nFetching campaigns from past 12 months...`);
  const campaigns = await client.getCampaigns();
  console.log(`  Found ${campaigns.length} campaigns`);

  // Group campaigns by month
  const campaignsByMonth = {};
  for (const campaign of campaigns) {
    const date = new Date(campaign.attributes.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!campaignsByMonth[monthKey]) {
      campaignsByMonth[monthKey] = [];
    }
    campaignsByMonth[monthKey].push(campaign);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. GET FLOWS (Automated Sequences)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\nFetching automated flows...`);
  const flows = await client.getFlows();
  console.log(`  Found ${flows.length} flows`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. BUILD MONTHLY ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' MONTHLY BREAKDOWN');
  console.log('─'.repeat(50));

  // Build monthly data from metrics
  const monthlyData = [];

  // Get the months from the received metric (most reliable)
  const receivedData = monthlyMetrics.received || [];

  if (receivedData.length > 0) {
    for (let i = 0; i < receivedData.length; i++) {
      const entry = receivedData[i];
      const date = entry.dimensions ? entry.dimensions[0] : null;

      if (!date) continue;

      const received = entry.measurements?.count || 0;

      // Find matching entries in other metrics by date
      const findByDate = (data) => {
        if (!data) return 0;
        const match = data.find(d => d.dimensions?.[0] === date);
        return match?.measurements?.count || 0;
      };

      const opened = findByDate(monthlyMetrics.opened);
      const clicked = findByDate(monthlyMetrics.clicked);
      const bounced = findByDate(monthlyMetrics.bounced);
      const unsubscribed = findByDate(monthlyMetrics.unsubscribed);
      const spam = findByDate(monthlyMetrics.spam);

      const monthKey = date.substring(0, 7);
      const campaignCount = campaignsByMonth[monthKey]?.length || 0;

      monthlyData.push({
        month: monthKey,
        date: date,
        campaigns: campaignCount,
        sent: received,
        opened,
        clicked,
        bounced,
        unsubscribed,
        spam,
        openRate: received > 0 ? opened / received : 0,
        clickRate: received > 0 ? clicked / received : 0,
        bounceRate: received > 0 ? bounced / received : 0,
        unsubRate: received > 0 ? unsubscribed / received : 0,
        spamRate: received > 0 ? spam / received : 0,
        unengagementRate: received > 0 ? (bounced + unsubscribed + spam) / received : 0
      });
    }
  }

  // Sort by month
  monthlyData.sort((a, b) => a.month.localeCompare(b.month));

  // Print monthly data
  console.log(`\n  Month      | Campaigns | Sent     | Opens    | Clicks   | Bounces  | Unsubs   | Spam`);
  console.log(`  ${'─'.repeat(95)}`);

  for (const m of monthlyData) {
    console.log(`  ${m.month}  | ${String(m.campaigns).padStart(9)} | ${formatNumber(m.sent).padStart(8)} | ${formatNumber(m.opened).padStart(8)} | ${formatNumber(m.clicked).padStart(8)} | ${formatNumber(m.bounced).padStart(8)} | ${formatNumber(m.unsubscribed).padStart(8)} | ${formatNumber(m.spam).padStart(5)}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. RATE ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' ENGAGEMENT RATES BY MONTH');
  console.log('─'.repeat(50));

  console.log(`\n  Month      | Open Rate | Click Rate | Bounce Rate | Unsub Rate | Spam Rate | UNENGAGEMENT`);
  console.log(`  ${'─'.repeat(95)}`);

  for (const m of monthlyData) {
    const unengageStr = formatPercent(m.unengagementRate);
    const highlight = m.unengagementRate > 0.02 ? ' ⚠️' : '';
    console.log(`  ${m.month}  | ${formatPercent(m.openRate).padStart(9)} | ${formatPercent(m.clickRate).padStart(10)} | ${formatPercent(m.bounceRate).padStart(11)} | ${formatPercent(m.unsubRate).padStart(10)} | ${formatPercent(m.spamRate).padStart(9)} | ${unengageStr.padStart(12)}${highlight}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. CORRELATION ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' CORRELATION ANALYSIS');
  console.log('─'.repeat(50));

  if (monthlyData.length >= 3) {
    const sendVolumes = monthlyData.map(m => m.sent);
    const unengagementRates = monthlyData.map(m => m.unengagementRate);
    const bounceRates = monthlyData.map(m => m.bounceRate);
    const unsubRates = monthlyData.map(m => m.unsubRate);
    const spamRates = monthlyData.map(m => m.spamRate);
    const campaignCounts = monthlyData.map(m => m.campaigns);

    const correlations = {
      'Send Volume → Unengagement Rate': calculateCorrelation(sendVolumes, unengagementRates),
      'Send Volume → Bounce Rate': calculateCorrelation(sendVolumes, bounceRates),
      'Send Volume → Unsubscribe Rate': calculateCorrelation(sendVolumes, unsubRates),
      'Send Volume → Spam Rate': calculateCorrelation(sendVolumes, spamRates),
      'Campaign Count → Unengagement Rate': calculateCorrelation(campaignCounts, unengagementRates),
      'Campaign Count → Unsubscribe Rate': calculateCorrelation(campaignCounts, unsubRates)
    };

    console.log(`\n  Metric Pair                                 | Correlation | Interpretation`);
    console.log(`  ${'─'.repeat(85)}`);

    for (const [pair, corr] of Object.entries(correlations)) {
      let interpretation = '';
      if (corr > 0.7) interpretation = 'STRONG POSITIVE - High risk!';
      else if (corr > 0.4) interpretation = 'Moderate positive';
      else if (corr > 0.2) interpretation = 'Weak positive';
      else if (corr > -0.2) interpretation = 'No correlation';
      else if (corr > -0.4) interpretation = 'Weak negative';
      else if (corr > -0.7) interpretation = 'Moderate negative';
      else interpretation = 'Strong negative';

      const highlight = corr > 0.4 ? ' ⚠️' : '';
      console.log(`  ${pair.padEnd(45)} | ${corr.toFixed(3).padStart(11)} | ${interpretation}${highlight}`);
    }
  } else {
    console.log(`\n  Insufficient data points for correlation analysis (need at least 3 months)`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. HIGH VOLUME PERIODS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' HIGH VOLUME PERIODS ANALYSIS');
  console.log('─'.repeat(50));

  if (monthlyData.length > 0) {
    const avgSent = monthlyData.reduce((sum, m) => sum + m.sent, 0) / monthlyData.length;
    const highVolumeMonths = monthlyData.filter(m => m.sent > avgSent * 1.25);
    const normalMonths = monthlyData.filter(m => m.sent <= avgSent * 1.25);

    console.log(`\n  Average monthly send volume: ${formatNumber(avgSent)}`);
    console.log(`  High volume threshold (>125% avg): ${formatNumber(avgSent * 1.25)}`);
    console.log(`  High volume months: ${highVolumeMonths.length}`);
    console.log(`  Normal volume months: ${normalMonths.length}`);

    if (highVolumeMonths.length > 0 && normalMonths.length > 0) {
      const highVolAvgUnengagement = highVolumeMonths.reduce((sum, m) => sum + m.unengagementRate, 0) / highVolumeMonths.length;
      const normalAvgUnengagement = normalMonths.reduce((sum, m) => sum + m.unengagementRate, 0) / normalMonths.length;

      console.log(`\n  COMPARISON:`);
      console.log(`  ${'─'.repeat(50)}`);
      console.log(`  High volume months avg unengagement: ${formatPercent(highVolAvgUnengagement)}`);
      console.log(`  Normal volume months avg unengagement: ${formatPercent(normalAvgUnengagement)}`);

      const diff = highVolAvgUnengagement - normalAvgUnengagement;
      const percentIncrease = normalAvgUnengagement > 0 ? (diff / normalAvgUnengagement) * 100 : 0;

      if (diff > 0) {
        console.log(`\n  ⚠️  HIGH VOLUME PERIODS SHOW ${percentIncrease.toFixed(1)}% HIGHER UNENGAGEMENT`);
        console.log(`      This suggests email blasting IS correlated with increased unengagement.`);
      } else {
        console.log(`\n  ✓  High volume periods do not show significantly higher unengagement`);
      }

      // List the high volume months
      console.log(`\n  High Volume Months:`);
      for (const m of highVolumeMonths) {
        console.log(`    ${m.month}: ${formatNumber(m.sent)} sent, ${formatPercent(m.unengagementRate)} unengagement`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. ORIGINAL VS REMINDER CAMPAIGN ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' ORIGINAL VS REMINDER CAMPAIGN ANALYSIS');
  console.log('─'.repeat(50));

  // Categorize campaigns as original or reminder
  const originals = [];
  const reminders = [];

  for (const campaign of campaigns) {
    const name = (campaign.attributes.name || '').toLowerCase();
    const isReminder = name.includes('reminder') ||
                       name.includes('clone') ||
                       name.includes('day 2') ||
                       name.includes('day 3') ||
                       name.includes('day 4') ||
                       name.includes('email 2') ||
                       name.includes('email 3');

    if (isReminder) {
      reminders.push(campaign);
    } else {
      originals.push(campaign);
    }
  }

  console.log(`\n  Original campaigns: ${originals.length}`);
  console.log(`  Follow-up/Reminder campaigns: ${reminders.length}`);
  console.log(`  Reminder ratio: ${((reminders.length / originals.length) * 100).toFixed(1)}%`);

  // Analyze reminder patterns by grouping original + follow-ups
  console.log(`\n  REMINDER PATTERN ANALYSIS:`);

  // Find campaigns and their reminders by matching names
  const campaignGroups = [];
  const processedIds = new Set();

  for (const orig of originals) {
    const origName = (orig.attributes.name || '').toLowerCase();
    const baseName = origName.replace(/[-_\s]+(day|email)?\s*\d*\s*$/i, '').trim();

    // Find reminders that match this original
    const matchingReminders = reminders.filter(r => {
      const rName = (r.attributes.name || '').toLowerCase();
      return rName.includes(baseName.substring(0, 15)) ||
             rName.includes(origName.substring(0, 15));
    });

    if (matchingReminders.length > 0) {
      campaignGroups.push({
        original: orig.attributes.name,
        originalDate: orig.attributes.created_at,
        reminderCount: matchingReminders.length,
        reminders: matchingReminders.map(r => ({
          name: r.attributes.name,
          date: r.attributes.created_at
        }))
      });
    }
  }

  // Show campaigns with most reminders
  const sortedGroups = campaignGroups.sort((a, b) => b.reminderCount - a.reminderCount);

  console.log(`  ${'─'.repeat(70)}`);
  console.log(`  Campaigns with Most Follow-ups:`);
  console.log(`  ${'─'.repeat(70)}`);

  for (const group of sortedGroups.slice(0, 10)) {
    console.log(`  ${group.original.substring(0, 50).padEnd(50)} | ${group.reminderCount} reminder(s)`);
    for (const r of group.reminders.slice(0, 2)) {
      console.log(`    └─ ${r.name.substring(0, 55)}`);
    }
  }

  // Analyze months with high reminder ratios
  console.log(`\n  MONTHLY REMINDER RATIOS:`);
  console.log(`  ${'─'.repeat(60)}`);

  const remindersByMonth = {};

  for (const campaign of campaigns) {
    const date = new Date(campaign.attributes.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const name = (campaign.attributes.name || '').toLowerCase();
    const isReminder = name.includes('reminder') ||
                       name.includes('clone') ||
                       name.includes('day 2') ||
                       name.includes('day 3') ||
                       name.includes('email 2') ||
                       name.includes('email 3');

    if (!remindersByMonth[monthKey]) {
      remindersByMonth[monthKey] = { total: 0, reminders: 0 };
    }
    remindersByMonth[monthKey].total++;
    if (isReminder) remindersByMonth[monthKey].reminders++;
  }

  console.log(`  Month      | Total Campaigns | Reminders | Reminder %`);
  console.log(`  ${'─'.repeat(55)}`);

  const sortedMonths = Object.entries(remindersByMonth).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [month, data] of sortedMonths) {
    const ratio = data.total > 0 ? (data.reminders / data.total * 100) : 0;
    const warn = ratio > 50 ? ' ⚠️' : '';
    console.log(`  ${month}  | ${String(data.total).padStart(15)} | ${String(data.reminders).padStart(9)} | ${ratio.toFixed(1).padStart(9)}%${warn}`);
  }

  // Correlation with monthly metrics
  console.log(`\n  CORRELATION: Reminder Ratio vs Unengagement`);

  const monthsWithBoth = sortedMonths.filter(([month]) => {
    const mData = monthlyData.find(m => m.month === month);
    return mData && mData.sent > 100;
  });

  if (monthsWithBoth.length >= 3) {
    const reminderRatios = monthsWithBoth.map(([month, data]) => data.reminders / data.total);
    const unengagementRates = monthsWithBoth.map(([month]) => {
      const mData = monthlyData.find(m => m.month === month);
      return mData?.unengagementRate || 0;
    });
    const spamRates = monthsWithBoth.map(([month]) => {
      const mData = monthlyData.find(m => m.month === month);
      return mData?.spamRate || 0;
    });
    const unsubRates = monthsWithBoth.map(([month]) => {
      const mData = monthlyData.find(m => m.month === month);
      return mData?.unsubRate || 0;
    });

    const corrReminderUnengage = calculateCorrelation(reminderRatios, unengagementRates);
    const corrReminderSpam = calculateCorrelation(reminderRatios, spamRates);
    const corrReminderUnsub = calculateCorrelation(reminderRatios, unsubRates);

    console.log(`  ${'─'.repeat(55)}`);
    console.log(`  Reminder Ratio → Unengagement Rate: ${corrReminderUnengage.toFixed(3)}`);
    console.log(`  Reminder Ratio → Spam Rate:         ${corrReminderSpam.toFixed(3)}`);
    console.log(`  Reminder Ratio → Unsub Rate:        ${corrReminderUnsub.toFixed(3)}`);

    if (corrReminderUnsub > 0.3) {
      console.log(`\n  ⚠️  Months with higher reminder ratios show MORE unsubscribes`);
    }
    if (corrReminderSpam > 0.3) {
      console.log(`  ⚠️  Months with higher reminder ratios show MORE spam complaints`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. CAMPAIGN CLUSTERING ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' CAMPAIGN CLUSTERING ANALYSIS');
  console.log('─'.repeat(50));

  // Look for periods with multiple campaigns in short succession
  const sortedCampaigns = campaigns.sort((a, b) =>
    new Date(a.attributes.created_at) - new Date(b.attributes.created_at)
  );

  const clusterPeriods = [];
  let currentCluster = [];

  for (let i = 0; i < sortedCampaigns.length; i++) {
    const campaign = sortedCampaigns[i];
    const campaignDate = new Date(campaign.attributes.created_at);

    if (currentCluster.length === 0) {
      currentCluster.push(campaign);
    } else {
      const lastDate = new Date(currentCluster[currentCluster.length - 1].attributes.created_at);
      const daysDiff = (campaignDate - lastDate) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 3) { // Within 3 days = same cluster
        currentCluster.push(campaign);
      } else {
        if (currentCluster.length >= 3) {
          clusterPeriods.push([...currentCluster]);
        }
        currentCluster = [campaign];
      }
    }
  }

  if (currentCluster.length >= 3) {
    clusterPeriods.push(currentCluster);
  }

  console.log(`\n  Found ${clusterPeriods.length} periods with 3+ campaigns within 3 days ("blast periods")`);

  if (clusterPeriods.length > 0) {
    console.log(`\n  Blast Periods:`);
    for (const cluster of clusterPeriods) {
      const startDate = new Date(cluster[0].attributes.created_at).toISOString().split('T')[0];
      const endDate = new Date(cluster[cluster.length - 1].attributes.created_at).toISOString().split('T')[0];
      console.log(`    ${startDate} to ${endDate}: ${cluster.length} campaigns`);

      for (const c of cluster.slice(0, 5)) {
        console.log(`      - ${c.attributes.name || 'Unnamed'}`);
      }
      if (cluster.length > 5) {
        console.log(`      ... and ${cluster.length - 5} more`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. FLOWS ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(' AUTOMATED FLOWS (Contributing to Volume)');
  console.log('─'.repeat(50));

  console.log(`\n  Active Flows:`);
  for (const flow of flows) {
    const status = flow.attributes.status || 'unknown';
    const name = flow.attributes.name || 'Unnamed';
    const statusIcon = status === 'live' ? '🟢' : status === 'draft' ? '⚪' : '🔴';
    console.log(`    ${statusIcon} ${name} (${status})`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 10. SUMMARY & RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log(` SUMMARY & RECOMMENDATIONS`);
  console.log('═'.repeat(70));

  // Calculate overall stats
  const totalSent = monthlyData.reduce((sum, m) => sum + m.sent, 0);
  const totalUnsubs = monthlyData.reduce((sum, m) => sum + m.unsubscribed, 0);
  const totalBounces = monthlyData.reduce((sum, m) => sum + m.bounced, 0);
  const totalSpam = monthlyData.reduce((sum, m) => sum + m.spam, 0);
  const avgUnengagement = monthlyData.reduce((sum, m) => sum + m.unengagementRate, 0) / (monthlyData.length || 1);

  console.log(`\n  12-Month Totals:`);
  console.log(`    Total emails sent: ${formatNumber(totalSent)}`);
  console.log(`    Total unsubscribes: ${formatNumber(totalUnsubs)}`);
  console.log(`    Total bounces: ${formatNumber(totalBounces)}`);
  console.log(`    Total spam complaints: ${formatNumber(totalSpam)}`);
  console.log(`    Average unengagement rate: ${formatPercent(avgUnengagement)}`);

  return {
    business: businessKey,
    businessName: business.name,
    monthlyData,
    campaigns,
    flows,
    clusterPeriods,
    totals: { totalSent, totalUnsubs, totalBounces, totalSpam, avgUnengagement }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const [,, businessArg = 'teelixir'] = process.argv;

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  KLAVIYO EMAIL ENGAGEMENT ANALYSIS                                   ║');
  console.log('║  Analyzing correlation between send volume and unengagement rates    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  try {
    await analyzeBusinessKlaviyo(businessArg);
  } catch (e) {
    console.error(`\nError analyzing ${businessArg}: ${e.message}`);
    console.error(e.stack);
  }

  console.log('\n\nAnalysis complete.\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
