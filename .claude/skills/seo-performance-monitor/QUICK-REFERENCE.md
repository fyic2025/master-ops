# SEO Performance Monitor - Quick Reference

## Quick Commands

```bash
# Full SEO health check (all businesses)
npx tsx .claude/skills/seo-performance-monitor/scripts/seo-health-check.ts

# Single business
npx tsx .claude/skills/seo-performance-monitor/scripts/seo-health-check.ts --business boo

# Check ranking changes (30 days)
npx tsx .claude/skills/seo-performance-monitor/scripts/ranking-tracker.ts --business boo --days 30

# Track specific keywords
npx tsx .claude/skills/seo-performance-monitor/scripts/ranking-tracker.ts --keywords "organic food,supplements"

# Core Web Vitals check
npx tsx .claude/skills/seo-performance-monitor/scripts/cwv-monitor.ts

# Failing pages only
npx tsx .claude/skills/seo-performance-monitor/scripts/cwv-monitor.ts --failing

# Content opportunities
npx tsx .claude/skills/seo-performance-monitor/scripts/content-opportunities.ts --business boo
```

## Existing GSC Scripts

```bash
# Sync daily GSC data
node shared/libs/integrations/gsc/sync-gsc-data.js

# Detect traffic anomalies
node shared/libs/integrations/gsc/detect-issues.js

# Inspect specific URL
node shared/libs/integrations/gsc/inspect-urls.js --url "https://buyorganicsonline.com.au/product"

# Backfill historical data
node shared/libs/integrations/gsc/backfill-daily-stats.js
```

## GTMetrix Testing

```bash
# Run performance test
node shared/libs/integrations/gtmetrix/run-test.js --url "https://buyorganicsonline.com.au"
```

## Key SQL Queries

```sql
-- Traffic summary last 7 days
SELECT * FROM get_gsc_totals('boo', CURRENT_DATE - 7, CURRENT_DATE);

-- Top pages by clicks
SELECT * FROM get_gsc_pages('boo', CURRENT_DATE - 30, CURRENT_DATE, 50, 'clicks');

-- Active technical issues
SELECT * FROM v_gsc_active_issues WHERE business = 'boo';

-- Traffic anomalies (>50% drop)
SELECT * FROM v_gsc_traffic_anomalies WHERE business = 'boo';

-- Failing Core Web Vitals
SELECT * FROM v_gtmetrix_needs_attention;

-- Content gaps (BOO)
SELECT * FROM seo_products
WHERE impressions_30d > 100
  AND content_status IN ('no_description', 'needs_format')
ORDER BY impressions_30d DESC;
```

## CWV Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | 2.5-4s | >4s |
| TBT | ≤200ms | 200-600ms | >600ms |
| CLS | ≤0.1 | 0.1-0.25 | >0.25 |

## Alert Triggers

- Traffic drop >50%: Critical
- Traffic drop >30%: Warning
- Position drop >10: Critical
- New 404s >50/day: Critical
- CWV failing >50% pages: Warning

## Key Tables

| Table | Database | Purpose |
|-------|----------|---------|
| gsc_page_daily_stats | Master | Daily GSC metrics |
| gsc_issue_urls | Master | Technical issues |
| gtmetrix_tests | Master | Performance tests |
| seo_products | BOO | Product SEO status |
| seo_categories | BOO | Category SEO status |
| seo_keywords | BOO | Keyword research |
