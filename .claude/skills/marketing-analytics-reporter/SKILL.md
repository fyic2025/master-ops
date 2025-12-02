---
name: marketing-analytics-reporter
description: Comprehensive marketing performance reporting across all channels. Aggregates data from email campaigns, Google Ads, SEO, and social media. Generates daily/weekly/monthly reports with insights and recommendations.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Marketing Analytics Reporter Skill

Generate comprehensive marketing performance reports across all channels and businesses.

## When to Activate This Skill

Activate this skill when the user mentions:
- "marketing report" or "performance report"
- "campaign analytics" or "email analytics"
- "weekly report" or "monthly report"
- "marketing metrics" or "KPIs"
- "channel performance"
- "ROI report" or "revenue attribution"

## Core Capabilities

### 1. Multi-Channel Aggregation
- Email campaigns (Klaviyo, Gmail, Smartlead)
- Google Ads performance
- Organic search (GSC)
- Social media metrics

### 2. Report Generation
- Daily snapshots
- Weekly summaries
- Monthly comprehensive reports
- Custom date ranges

### 3. Performance Analysis
- Channel comparison
- Period-over-period changes
- Trend identification
- Anomaly detection

### 4. Insights & Recommendations
- Data-driven insights
- Optimization suggestions
- Action items

## Data Sources

| Channel | Source | Tables |
|---------|--------|--------|
| Email Anniversary | Supabase | tlx_anniversary_discounts |
| Email Winback | Supabase | tlx_winback_emails |
| Cold Outreach | Supabase | smartlead_engagement |
| Google Ads | Supabase | google_ads_campaign_metrics |
| Organic Search | Supabase | gsc_page_daily_stats |

## Database Views

### v_marketing_summary
```sql
SELECT channel, business_slug, date, sends, opens, clicks, conversions, revenue
FROM v_marketing_summary
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### Weekly Report Query
```sql
SELECT
  business_slug,
  DATE_TRUNC('week', date) AS week,
  channel,
  SUM(sends) AS total_sends,
  SUM(opens) AS total_opens,
  SUM(clicks) AS total_clicks,
  SUM(conversions) AS total_conversions,
  SUM(revenue) AS total_revenue,
  ROUND(100.0 * SUM(opens) / NULLIF(SUM(sends), 0), 2) AS open_rate,
  ROUND(100.0 * SUM(clicks) / NULLIF(SUM(opens), 0), 2) AS click_rate,
  ROUND(100.0 * SUM(conversions) / NULLIF(SUM(clicks), 0), 2) AS conversion_rate
FROM v_marketing_summary
WHERE date >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY business_slug, DATE_TRUNC('week', date), channel
ORDER BY week DESC, channel;
```

## Report Templates

### Daily Snapshot
```markdown
# Daily Marketing Snapshot - {{date}}

## Email Performance
| Campaign | Sent | Opens | Clicks | Conversions |
|----------|------|-------|--------|-------------|
| {{rows}} |

## Key Metrics
- Open Rate: {{open_rate}}% ({{change}} vs yesterday)
- Click Rate: {{click_rate}}%
- Conversions: {{conversions}} (${{revenue}})

## Alerts
{{alerts}}
```

### Weekly Summary
```markdown
# Weekly Marketing Report - Week of {{week_start}}

## Executive Summary
{{summary}}

## Channel Performance
### Email
- Total Sent: {{email_sent}}
- Open Rate: {{open_rate}}% (industry avg: 18%)
- Click Rate: {{click_rate}}% (industry avg: 2.5%)
- Revenue: ${{email_revenue}}

### Paid Ads
- Spend: ${{ad_spend}}
- ROAS: {{roas}}x
- Conversions: {{ad_conversions}}

### Organic Search
- Impressions: {{impressions}}
- Clicks: {{clicks}}
- Avg Position: {{position}}

## Top Performing
{{top_performers}}

## Recommendations
{{recommendations}}
```

## API Reference

### Generate Report
```typescript
async function generateReport(params: {
  businessSlug: BusinessSlug | 'all';
  reportType: 'daily' | 'weekly' | 'monthly';
  dateRange?: { start: Date; end: Date };
  channels?: string[];
}): Promise<MarketingReport>
```

### Get Channel Breakdown
```typescript
async function getChannelBreakdown(params: {
  businessSlug: BusinessSlug;
  dateRange: { start: Date; end: Date };
}): Promise<ChannelMetrics[]>
```

### Compare Periods
```typescript
async function comparePeriods(params: {
  businessSlug: BusinessSlug;
  current: { start: Date; end: Date };
  previous: { start: Date; end: Date };
}): Promise<PeriodComparison>
```

### Get Top Performers
```typescript
async function getTopPerformers(params: {
  businessSlug: BusinessSlug;
  metric: 'revenue' | 'conversions' | 'engagement';
  contentType: 'emails' | 'ads' | 'pages';
  limit: number;
}): Promise<TopContent[]>
```

## Metrics Definitions

| Metric | Formula | Good | Excellent |
|--------|---------|------|-----------|
| Open Rate | Opens / Sent * 100 | 25% | 35%+ |
| Click Rate | Clicks / Opens * 100 | 5% | 8%+ |
| Conversion Rate | Conversions / Clicks * 100 | 3.5% | 5%+ |
| ROAS | Revenue / Ad Spend | 3x | 5x+ |
| CPA | Ad Spend / Conversions | <$30 | <$15 |

## Integration Points

- **dashboard-automation**: Provides data for dashboard widgets
- **conversion-optimizer**: Supplies performance data for optimization
- **email-campaign-manager**: Email campaign metrics source

## Report Distribution

Reports can be:
1. Generated on-demand via CLI
2. Scheduled via n8n workflows
3. Embedded in dashboard
4. Sent via email alerts

## Quick Commands

```bash
# Generate daily report
npx tsx scripts/report-generator.ts daily teelixir

# Generate weekly report
npx tsx scripts/report-generator.ts weekly all

# Channel comparison
npx tsx scripts/report-generator.ts compare teelixir email ads --period 30d
```
