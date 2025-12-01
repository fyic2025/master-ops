# GA4 Analyst - Quick Reference

## Key Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Sessions | Total visits | Growing |
| Users | Unique visitors | Growing |
| Engagement Rate | % engaged sessions | >60% |
| Conversion Rate | Transactions/Sessions | >2% |
| AOV | Revenue/Transactions | Growing |
| Revenue per Session | Revenue/Sessions | Growing |

---

## Quick Commands

```bash
# Sync all GA4 data
npx tsx .claude/skills/ga4-analyst/scripts/sync-ga4-data.ts

# Traffic report
npx tsx .claude/skills/ga4-analyst/scripts/generate-traffic-report.ts --weekly

# E-commerce analysis
npx tsx .claude/skills/ga4-analyst/scripts/analyze-ecommerce.ts

# Funnel analysis
npx tsx .claude/skills/ga4-analyst/scripts/analyze-ecommerce.ts --funnel

# Week-over-week comparison
npx tsx .claude/skills/ga4-analyst/scripts/compare-periods.ts --wow
```

---

## GA4 Property IDs

| Business | Property | Platform |
|----------|----------|----------|
| BOO | GA4_BOO_PROPERTY_ID | BigCommerce |
| Teelixir | GA4_TEELIXIR_PROPERTY_ID | Shopify |
| Elevate | GA4_ELEVATE_PROPERTY_ID | Shopify |
| RHF | GA4_RHF_PROPERTY_ID | WooCommerce |

---

## Conversion Funnel Benchmarks

| Stage | Target Rate | Warning |
|-------|-------------|---------|
| Visit → View Item | >30% | <20% |
| View → Add to Cart | >10% | <5% |
| Cart → Checkout | >50% | <30% |
| Checkout → Purchase | >60% | <40% |
| Overall CVR | >2% | <1% |

---

## Traffic Source Expected Performance

| Source/Medium | CVR | Engagement |
|---------------|-----|------------|
| google / organic | 2-4% | High |
| google / cpc (brand) | 5-10% | High |
| google / cpc (generic) | 1-2% | Medium |
| email / newsletter | 3-6% | High |
| (direct) / (none) | 3-5% | High |
| facebook / paid | 1-2% | Medium |
| instagram / paid | 0.5-1.5% | Medium |

---

## Key SQL Queries

```sql
-- Today's metrics
SELECT business, sessions, users, transactions, revenue
FROM ga4_daily_metrics
WHERE date = CURRENT_DATE - 1
ORDER BY business;

-- Week-over-week
SELECT * FROM v_ga4_wow_comparison;

-- Top traffic sources
SELECT * FROM v_ga4_top_sources
WHERE business = 'teelixir' LIMIT 10;

-- Funnel performance
SELECT * FROM v_ga4_funnel_summary;

-- Top landing pages
SELECT * FROM v_ga4_top_landing_pages
WHERE business = 'teelixir' LIMIT 10;
```

---

## GA4 Data API Quick Reference

```typescript
// Basic report
const [response] = await analyticsDataClient.runReport({
  property: `properties/${propertyId}`,
  dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
  metrics: [
    { name: 'sessions' },
    { name: 'totalUsers' },
    { name: 'transactions' },
    { name: 'totalRevenue' }
  ],
  dimensions: [
    { name: 'date' }
  ]
})
```

---

## Common Dimensions

| Dimension | Use Case |
|-----------|----------|
| date | Time series |
| sessionDefaultChannelGroup | Traffic sources |
| sessionSource | Specific source |
| sessionMedium | Traffic medium |
| deviceCategory | Desktop/mobile/tablet |
| country | Geographic |
| landingPage | Entry points |
| itemName | Product performance |

---

## Common Metrics

| Metric | Description |
|--------|-------------|
| sessions | Total sessions |
| totalUsers | Unique users |
| newUsers | First-time users |
| engagedSessions | Sessions with engagement |
| engagementRate | Engaged/Total sessions |
| averageSessionDuration | Avg time on site |
| bounceRate | Single-page sessions |
| screenPageViews | Page views |
| transactions | Purchases |
| totalRevenue | Total revenue |
| ecommercePurchases | E-commerce transactions |

---

## Alert Thresholds

| Condition | Level |
|-----------|-------|
| Traffic -20% DoD | Warning |
| Traffic -30% WoW | Critical |
| CVR -20% WoW | Warning |
| Revenue -30% WoW | Critical |
| Bounce +20% | Warning |

---

## Report Periods

| Period | API Date Range |
|--------|----------------|
| Yesterday | yesterday / yesterday |
| Last 7 days | 7daysAgo / yesterday |
| Last 28 days | 28daysAgo / yesterday |
| Last 90 days | 90daysAgo / yesterday |
| This month | startOfMonth / yesterday |
| Last month | startOfLastMonth / endOfLastMonth |
