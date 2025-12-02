# Marketing Analytics Reporter - Quick Reference

## Quick Reports

### Weekly Email Summary
```sql
SELECT
  DATE_TRUNC('week', date) AS week,
  SUM(sends) AS total_sends,
  SUM(opens) AS total_opens,
  SUM(clicks) AS total_clicks,
  SUM(conversions) AS total_conversions,
  SUM(revenue) AS total_revenue,
  ROUND(100.0 * SUM(opens) / NULLIF(SUM(sends), 0), 2) AS open_rate,
  ROUND(100.0 * SUM(clicks) / NULLIF(SUM(opens), 0), 2) AS click_rate
FROM v_marketing_summary
WHERE business_slug = 'teelixir'
  AND date >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', date)
ORDER BY week DESC;
```

### Channel Comparison
```sql
SELECT
  channel,
  SUM(sends) AS total_sends,
  SUM(conversions) AS total_conversions,
  SUM(revenue) AS total_revenue,
  ROUND(100.0 * SUM(conversions) / NULLIF(SUM(sends), 0), 4) AS conversion_rate
FROM v_marketing_summary
WHERE business_slug = 'teelixir'
  AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY channel
ORDER BY total_revenue DESC;
```

### Daily Snapshot
```sql
SELECT * FROM v_marketing_summary
WHERE business_slug = 'teelixir'
  AND date = CURRENT_DATE - 1
ORDER BY channel;
```

## Performance Benchmarks

| Metric | Good | Excellent | Industry Avg |
|--------|------|-----------|--------------|
| Open Rate | 25% | 35%+ | 18% |
| Click Rate | 5% | 8%+ | 2.5% |
| Conversion Rate | 3.5% | 5%+ | 2% |
| ROAS | 3x | 5x+ | 2.5x |
| CPA | <$30 | <$15 | $45 |

## Data Sources

| Channel | Table | Key Metrics |
|---------|-------|-------------|
| Anniversary Email | tlx_anniversary_discounts | sent, opened, clicked, converted |
| Winback Email | tlx_winback_emails | sent, opened, clicked, converted |
| Cold Outreach | smartlead_engagement | sent, opened, replied |
| Google Ads | google_ads_campaign_metrics | impressions, clicks, conversions |
| Organic Search | gsc_page_daily_stats | impressions, clicks, ctr |

## Report Templates

### Executive Summary
```markdown
# Weekly Marketing Report - Week of {{week}}

## Highlights
- Total Revenue: ${{revenue}} ({{change}}% vs last week)
- Email Open Rate: {{open_rate}}%
- Best Channel: {{top_channel}}

## Action Items
1. {{action_1}}
2. {{action_2}}
```

## CLI Commands

```bash
# Generate daily report
npx tsx scripts/report-generator.ts daily teelixir

# Generate weekly report
npx tsx scripts/report-generator.ts weekly all

# Channel comparison
npx tsx scripts/report-generator.ts compare teelixir email ads --period 30d
```

## Period Comparison

```sql
-- This week vs last week
WITH this_week AS (
  SELECT SUM(revenue) as revenue
  FROM v_marketing_summary
  WHERE date >= CURRENT_DATE - INTERVAL '7 days'
),
last_week AS (
  SELECT SUM(revenue) as revenue
  FROM v_marketing_summary
  WHERE date >= CURRENT_DATE - INTERVAL '14 days'
    AND date < CURRENT_DATE - INTERVAL '7 days'
)
SELECT
  this_week.revenue as this_week,
  last_week.revenue as last_week,
  ROUND(100.0 * (this_week.revenue - last_week.revenue) / NULLIF(last_week.revenue, 0), 2) as change_pct
FROM this_week, last_week;
```
