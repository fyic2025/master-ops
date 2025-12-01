# GSC Expert - Quick Reference

## Key Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Clicks | Users who clicked to site | Growing |
| Impressions | Times shown in results | Growing |
| CTR | Clicks / Impressions | >3% non-brand |
| Position | Average ranking | <10 for targets |

---

## Quick Commands

```bash
# Sync all GSC data
npx tsx .claude/skills/gsc-expert/scripts/sync-gsc-data.ts

# Check index coverage
npx tsx .claude/skills/gsc-expert/scripts/check-index-coverage.ts

# Top keywords
npx tsx .claude/skills/gsc-expert/scripts/analyze-keywords.ts --top 50

# Find opportunities
npx tsx .claude/skills/gsc-expert/scripts/analyze-keywords.ts --opportunities

# Inspect URL
npx tsx .claude/skills/gsc-expert/scripts/inspect-url.ts --url https://teelixir.com/products/lions-mane
```

---

## GSC Properties

| Business | Property |
|----------|----------|
| BOO | sc-domain:buyorganicsonline.com.au |
| Teelixir | sc-domain:teelixir.com |
| Elevate | sc-domain:elevatewholesale.com.au |
| RHF | sc-domain:redhillfresh.com.au |

---

## CTR Benchmarks by Position

| Position | Expected CTR |
|----------|--------------|
| 1 | 25-35% |
| 2 | 12-18% |
| 3 | 8-12% |
| 4-5 | 5-8% |
| 6-10 | 2-5% |
| 11-20 | <2% |

---

## Index Coverage Status Types

| Status | Meaning | Action |
|--------|---------|--------|
| Valid | Indexed properly | Monitor |
| Valid with warnings | Indexed but issues | Review |
| Excluded | Not indexed (intentional) | Verify exclusion is correct |
| Error | Cannot be indexed | Fix immediately |

---

## Common Exclusion Reasons

| Reason | Typical Cause | Solution |
|--------|---------------|----------|
| Crawled - currently not indexed | Low quality | Improve content |
| Discovered - not indexed | Low priority | Add internal links |
| Duplicate, submitted URL not canonical | Wrong canonical | Fix canonical tags |
| Blocked by robots.txt | Robots config | Update robots.txt |
| Not found (404) | Deleted page | Remove links or restore |
| Soft 404 | Empty page | Add content or return 404 |

---

## Key SQL Queries

```sql
-- Today's top queries
SELECT query, clicks, impressions,
       ROUND(ctr * 100, 2) as ctr_pct,
       ROUND(position, 1) as position
FROM gsc_search_performance
WHERE business = 'teelixir' AND date = CURRENT_DATE - 1
ORDER BY clicks DESC LIMIT 20;

-- Week-over-week comparison
SELECT * FROM v_gsc_wow_performance;

-- Query opportunities (improve CTR)
SELECT * FROM v_gsc_query_opportunities
WHERE business = 'teelixir' LIMIT 20;

-- Index coverage status
SELECT * FROM v_gsc_coverage_summary;

-- Active URL issues
SELECT * FROM v_gsc_active_issues
WHERE business = 'boo';
```

---

## GSC API Quick Reference

```typescript
// Search Analytics Query
const response = await searchconsole.searchanalytics.query({
  siteUrl: 'sc-domain:teelixir.com',
  requestBody: {
    startDate: '2024-11-01',
    endDate: '2024-11-28',
    dimensions: ['query', 'page'],
    rowLimit: 1000
  }
})

// URL Inspection
const result = await searchconsole.urlInspection.index.inspect({
  requestBody: {
    inspectionUrl: 'https://teelixir.com/products/lions-mane',
    siteUrl: 'sc-domain:teelixir.com'
  }
})
```

---

## Alert Thresholds

| Condition | Level |
|-----------|-------|
| Clicks -20% WoW | Warning |
| Clicks -50% WoW | Critical |
| New errors >10 | Warning |
| Errors >50 | Critical |
| Manual action | Critical |

---

## Data Availability

- Search Analytics: Last 16 months
- URL Inspection: Real-time
- Index Coverage: Daily updated
- Sitemaps: Real-time
- CWV Data: 28-day rolling
