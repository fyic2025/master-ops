# Google Search Console Expert Skill

Search performance monitoring, indexing management, and SEO insights for all 4 e-commerce stores.

## Businesses Covered

| Business | Property | Platform | Verification |
|----------|----------|----------|--------------|
| Buy Organics Online | buyorganicsonline.com.au | BigCommerce | DNS TXT |
| Teelixir | teelixir.com | Shopify | DNS TXT |
| Elevate Wholesale | elevatewholesale.com.au | Shopify | DNS TXT |
| Red Hill Fresh | redhillfresh.com.au | WooCommerce | DNS TXT |

---

## When to Activate This Skill

Activate when the user mentions:
- "search console" or "GSC"
- "search performance"
- "indexing issues" or "not indexed"
- "crawl errors" or "crawl budget"
- "keywords" or "search queries"
- "impressions" or "clicks"
- "CTR" or "click-through rate"
- "position" or "ranking"
- "coverage report"
- "sitemap" issues
- "mobile usability"
- "manual actions"

---

## Core Capabilities

### 1. Search Performance Analysis
Track organic search metrics:
- **Clicks** - Total clicks from search results
- **Impressions** - Times pages appeared in search
- **CTR** - Click-through rate (clicks/impressions)
- **Position** - Average ranking position

### 2. Index Coverage Monitoring
Track what Google has indexed:
- Valid pages (indexed)
- Valid with warnings
- Excluded pages (and why)
- Error pages (crawl/index failures)

### 3. URL Inspection
Deep-dive into individual URLs:
- Indexing status
- Last crawl date
- Canonical URL
- Mobile usability
- Rich results eligibility

### 4. Keyword Analysis
Understand search visibility:
- Top performing queries
- Emerging queries (trending)
- Query gaps (impressions but few clicks)
- Position tracking over time

### 5. Sitemap Management
Monitor sitemap health:
- Submission status
- Discovered vs indexed URLs
- Error detection
- Last read date

### 6. Core Web Vitals (from GSC)
Real-world CWV data:
- Mobile vs desktop status
- URL groups by status
- Historical trends
- Page Experience signals

---

## Database Schema

### GSC Tables (Master Supabase)

```sql
-- Search performance data (daily)
CREATE TABLE gsc_search_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,
  query TEXT,
  page TEXT,
  country TEXT,
  device TEXT,  -- 'MOBILE', 'DESKTOP', 'TABLET'

  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(5,4),  -- 0.0000 to 1.0000
  position DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date, query, page, country, device)
);

CREATE INDEX idx_gsc_perf_business_date ON gsc_search_performance(business, date);
CREATE INDEX idx_gsc_perf_query ON gsc_search_performance(query);
CREATE INDEX idx_gsc_perf_page ON gsc_search_performance(page);

-- Index coverage status
CREATE TABLE gsc_index_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  sync_date DATE NOT NULL,

  -- Counts by status
  valid_count INTEGER DEFAULT 0,
  valid_with_warnings_count INTEGER DEFAULT 0,
  excluded_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Breakdown by reason
  coverage_details JSONB,  -- {reason: count} breakdown

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, sync_date)
);

-- URL-level coverage issues
CREATE TABLE gsc_url_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  url TEXT NOT NULL,
  issue_type TEXT NOT NULL,  -- 'error', 'warning', 'excluded'
  issue_reason TEXT NOT NULL,
  first_detected DATE,
  last_detected DATE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, url, issue_reason)
);

-- Sitemap status
CREATE TABLE gsc_sitemaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  sitemap_url TEXT NOT NULL,
  sitemap_type TEXT,  -- 'sitemap', 'sitemapIndex'

  submitted_count INTEGER,
  indexed_count INTEGER,
  last_submitted TIMESTAMPTZ,
  last_downloaded TIMESTAMPTZ,
  warnings INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, sitemap_url)
);

-- Keyword tracking (high-value queries)
CREATE TABLE gsc_tracked_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  query TEXT NOT NULL,
  target_page TEXT,
  target_position INTEGER DEFAULT 10,
  is_branded BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium',  -- 'high', 'medium', 'low'
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, query)
);

-- Keyword position history
CREATE TABLE gsc_keyword_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_keyword_id UUID REFERENCES gsc_tracked_keywords(id),
  date DATE NOT NULL,
  position DECIMAL(5,2),
  clicks INTEGER,
  impressions INTEGER,
  ctr DECIMAL(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tracked_keyword_id, date)
);

-- Core Web Vitals from GSC
CREATE TABLE gsc_cwv_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  sync_date DATE NOT NULL,
  device TEXT NOT NULL,  -- 'MOBILE', 'DESKTOP'

  -- Page counts by status
  good_count INTEGER DEFAULT 0,
  needs_improvement_count INTEGER DEFAULT 0,
  poor_count INTEGER DEFAULT 0,

  -- Specific metric breakdowns
  lcp_good INTEGER DEFAULT 0,
  lcp_needs_improvement INTEGER DEFAULT 0,
  lcp_poor INTEGER DEFAULT 0,

  inp_good INTEGER DEFAULT 0,
  inp_needs_improvement INTEGER DEFAULT 0,
  inp_poor INTEGER DEFAULT 0,

  cls_good INTEGER DEFAULT 0,
  cls_needs_improvement INTEGER DEFAULT 0,
  cls_poor INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, sync_date, device)
);
```

### Key Views

```sql
-- Daily performance summary
CREATE OR REPLACE VIEW v_gsc_daily_summary AS
SELECT
  business,
  date,
  SUM(clicks) as total_clicks,
  SUM(impressions) as total_impressions,
  CASE WHEN SUM(impressions) > 0
    THEN SUM(clicks)::decimal / SUM(impressions)
    ELSE 0
  END as avg_ctr,
  AVG(position) as avg_position
FROM gsc_search_performance
GROUP BY business, date
ORDER BY business, date DESC;

-- Top queries by business (last 28 days)
CREATE OR REPLACE VIEW v_gsc_top_queries AS
SELECT
  business,
  query,
  SUM(clicks) as clicks,
  SUM(impressions) as impressions,
  ROUND(SUM(clicks)::decimal / NULLIF(SUM(impressions), 0) * 100, 2) as ctr_pct,
  ROUND(AVG(position), 1) as avg_position
FROM gsc_search_performance
WHERE date >= CURRENT_DATE - 28
GROUP BY business, query
HAVING SUM(impressions) >= 10
ORDER BY business, clicks DESC;

-- Query opportunities (high impressions, low CTR)
CREATE OR REPLACE VIEW v_gsc_query_opportunities AS
SELECT
  business,
  query,
  SUM(impressions) as impressions,
  SUM(clicks) as clicks,
  ROUND(SUM(clicks)::decimal / NULLIF(SUM(impressions), 0) * 100, 2) as ctr_pct,
  ROUND(AVG(position), 1) as avg_position
FROM gsc_search_performance
WHERE date >= CURRENT_DATE - 28
GROUP BY business, query
HAVING SUM(impressions) >= 100
  AND SUM(clicks)::decimal / NULLIF(SUM(impressions), 0) < 0.02
  AND AVG(position) <= 20
ORDER BY impressions DESC;

-- Index coverage summary
CREATE OR REPLACE VIEW v_gsc_coverage_summary AS
SELECT
  business,
  sync_date,
  valid_count,
  valid_with_warnings_count,
  excluded_count,
  error_count,
  valid_count + valid_with_warnings_count + excluded_count + error_count as total_urls,
  ROUND(100.0 * valid_count / NULLIF(valid_count + error_count, 0), 1) as index_rate
FROM gsc_index_coverage
WHERE sync_date = (SELECT MAX(sync_date) FROM gsc_index_coverage gc2 WHERE gc2.business = gsc_index_coverage.business);

-- Unresolved URL issues
CREATE OR REPLACE VIEW v_gsc_active_issues AS
SELECT
  business,
  issue_type,
  issue_reason,
  COUNT(*) as url_count,
  MIN(first_detected) as earliest_detection,
  MAX(last_detected) as latest_detection
FROM gsc_url_issues
WHERE is_resolved = false
GROUP BY business, issue_type, issue_reason
ORDER BY business, url_count DESC;

-- Tracked keyword performance
CREATE OR REPLACE VIEW v_gsc_keyword_performance AS
SELECT
  tk.business,
  tk.query,
  tk.target_position,
  tk.priority,
  kh.date,
  kh.position,
  kh.clicks,
  kh.impressions,
  CASE
    WHEN kh.position <= tk.target_position THEN 'on_target'
    WHEN kh.position <= tk.target_position + 5 THEN 'close'
    ELSE 'needs_work'
  END as status
FROM gsc_tracked_keywords tk
LEFT JOIN gsc_keyword_history kh ON tk.id = kh.tracked_keyword_id
  AND kh.date = CURRENT_DATE - 1
ORDER BY tk.business, tk.priority DESC, tk.query;

-- Week-over-week performance
CREATE OR REPLACE VIEW v_gsc_wow_performance AS
WITH this_week AS (
  SELECT business, SUM(clicks) as clicks, SUM(impressions) as impressions
  FROM gsc_search_performance
  WHERE date >= CURRENT_DATE - 7
  GROUP BY business
),
last_week AS (
  SELECT business, SUM(clicks) as clicks, SUM(impressions) as impressions
  FROM gsc_search_performance
  WHERE date >= CURRENT_DATE - 14 AND date < CURRENT_DATE - 7
  GROUP BY business
)
SELECT
  tw.business,
  tw.clicks as this_week_clicks,
  lw.clicks as last_week_clicks,
  ROUND(100.0 * (tw.clicks - lw.clicks) / NULLIF(lw.clicks, 0), 1) as clicks_change_pct,
  tw.impressions as this_week_impressions,
  lw.impressions as last_week_impressions,
  ROUND(100.0 * (tw.impressions - lw.impressions) / NULLIF(lw.impressions, 0), 1) as impressions_change_pct
FROM this_week tw
LEFT JOIN last_week lw ON tw.business = lw.business;
```

---

## Scripts

### sync-gsc-data.ts
Sync search performance data from GSC API.

```bash
# Sync all businesses (last 7 days)
npx tsx .claude/skills/gsc-expert/scripts/sync-gsc-data.ts

# Sync specific business
npx tsx .claude/skills/gsc-expert/scripts/sync-gsc-data.ts --business teelixir

# Sync specific date range
npx tsx .claude/skills/gsc-expert/scripts/sync-gsc-data.ts --start 2024-11-01 --end 2024-11-30

# Full sync (last 16 months)
npx tsx .claude/skills/gsc-expert/scripts/sync-gsc-data.ts --full
```

### check-index-coverage.ts
Check indexing status across all properties.

```bash
# Quick coverage check
npx tsx .claude/skills/gsc-expert/scripts/check-index-coverage.ts

# Detailed breakdown
npx tsx .claude/skills/gsc-expert/scripts/check-index-coverage.ts --detailed

# Check specific business
npx tsx .claude/skills/gsc-expert/scripts/check-index-coverage.ts --business boo
```

### analyze-keywords.ts
Analyze keyword performance and opportunities.

```bash
# Top keywords report
npx tsx .claude/skills/gsc-expert/scripts/analyze-keywords.ts --top 50

# Find opportunities (high impressions, low CTR)
npx tsx .claude/skills/gsc-expert/scripts/analyze-keywords.ts --opportunities

# Track specific keywords
npx tsx .claude/skills/gsc-expert/scripts/analyze-keywords.ts --track "mushroom powder,medicinal mushrooms"
```

### inspect-url.ts
Inspect specific URL in GSC.

```bash
# Inspect URL
npx tsx .claude/skills/gsc-expert/scripts/inspect-url.ts --url https://teelixir.com/products/lions-mane

# Request indexing
npx tsx .claude/skills/gsc-expert/scripts/inspect-url.ts --url https://teelixir.com/products/lions-mane --request-index
```

### generate-seo-report.ts
Generate comprehensive SEO report.

```bash
# Weekly report
npx tsx .claude/skills/gsc-expert/scripts/generate-seo-report.ts --weekly

# Monthly report
npx tsx .claude/skills/gsc-expert/scripts/generate-seo-report.ts --monthly

# Business-specific
npx tsx .claude/skills/gsc-expert/scripts/generate-seo-report.ts --business teelixir --detailed
```

---

## GSC API Integration

### Authentication
Uses Google OAuth 2.0 with service account or user credentials.

```typescript
import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
})

const searchconsole = google.searchconsole({ version: 'v1', auth })
```

### Key API Endpoints

**Search Analytics (Performance)**
```typescript
// Query search performance
const response = await searchconsole.searchanalytics.query({
  siteUrl: 'sc-domain:teelixir.com',
  requestBody: {
    startDate: '2024-11-01',
    endDate: '2024-11-28',
    dimensions: ['query', 'page', 'device', 'country'],
    rowLimit: 25000,
    startRow: 0
  }
})
```

**URL Inspection**
```typescript
// Inspect URL
const response = await searchconsole.urlInspection.index.inspect({
  requestBody: {
    inspectionUrl: 'https://teelixir.com/products/lions-mane',
    siteUrl: 'sc-domain:teelixir.com'
  }
})
```

**Sitemaps**
```typescript
// List sitemaps
const response = await searchconsole.sitemaps.list({
  siteUrl: 'sc-domain:teelixir.com'
})

// Submit sitemap
await searchconsole.sitemaps.submit({
  siteUrl: 'sc-domain:teelixir.com',
  feedpath: 'https://teelixir.com/sitemap.xml'
})
```

### Rate Limits
- Search Analytics: 1,200 queries per day per property
- URL Inspection: 2,000 requests per day per property
- General API: 1,200 queries per minute

---

## Key Metrics & Benchmarks

### Search Performance

| Metric | Good | Average | Poor |
|--------|------|---------|------|
| CTR (Brand) | >30% | 15-30% | <15% |
| CTR (Non-Brand) | >5% | 2-5% | <2% |
| Position (Target) | 1-3 | 4-10 | >10 |
| Impression Trend | Growing | Stable | Declining |

### Index Coverage

| Status | Target | Warning | Critical |
|--------|--------|---------|----------|
| Valid | >90% | 80-90% | <80% |
| Errors | <1% | 1-5% | >5% |
| Excluded | Reasonable | Review if >20% | Investigate |

### Page Experience

| Signal | Good | Needs Work | Poor |
|--------|------|------------|------|
| CWV Pass | >75% URLs | 50-75% | <50% |
| Mobile Usability | 100% | >95% | <95% |
| HTTPS | 100% | - | <100% |

---

## Common Issues & Solutions

### Indexing Issues

**"Discovered - currently not indexed"**
- Cause: Low-quality or thin content
- Solution: Improve content depth, add internal links

**"Crawled - currently not indexed"**
- Cause: Content not valuable enough
- Solution: Enhance content quality, build backlinks

**"Duplicate without user-selected canonical"**
- Cause: Multiple URLs with same content
- Solution: Implement proper canonicals

**"Blocked by robots.txt"**
- Cause: Robots.txt blocking important pages
- Solution: Update robots.txt rules

**"Soft 404"**
- Cause: Page returns 200 but looks empty
- Solution: Return proper 404 or add content

### Performance Issues

**Low CTR despite good position**
- Cause: Poor title/meta description
- Solution: Optimize snippets for clicks

**High impressions, no clicks**
- Cause: Position too low or irrelevant query
- Solution: Improve content relevance, check position

**Position fluctuation**
- Cause: Algorithm updates or competition
- Solution: Monitor trends, maintain content quality

---

## Environment Variables Required

```bash
# Google API (Service Account)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Or OAuth2 credentials
GSC_CLIENT_ID=
GSC_CLIENT_SECRET=
GSC_REFRESH_TOKEN=

# Site properties (sc-domain: format)
GSC_BOO_PROPERTY=sc-domain:buyorganicsonline.com.au
GSC_TEELIXIR_PROPERTY=sc-domain:teelixir.com
GSC_ELEVATE_PROPERTY=sc-domain:elevatewholesale.com.au
GSC_RHF_PROPERTY=sc-domain:redhillfresh.com.au

# Supabase
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Automation Schedule

| Task | Frequency | Time (AEST) |
|------|-----------|-------------|
| Performance Sync | Daily | 7:00 AM |
| Coverage Check | Daily | 7:30 AM |
| Sitemap Status | Weekly | Monday 8:00 AM |
| Keyword Tracking | Daily | 7:15 AM |
| SEO Report | Weekly | Monday 9:00 AM |
| Issue Detection | Daily | 8:00 AM |

---

## Alert Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| Clicks drop >20% WoW | Warning | Investigate |
| Clicks drop >50% WoW | Critical | Immediate review |
| New indexing errors >10 | Warning | Review coverage |
| Indexing errors >50 | Critical | Fix immediately |
| CWV fails increase | Warning | Run speed audit |
| Sitemap errors | Critical | Fix sitemap |
| Manual action detected | Critical | Immediate action |

---

## Integration Points

### Dashboard
- Search performance widgets
- Index coverage status
- Top query trends
- Issue alerts

### Website Speed Optimizer
- CWV data correlation
- Page Experience signals
- Performance impact on rankings

### SEO Content Writer
- Keyword targets
- Content gaps
- Query opportunities

---

## Success Criteria

A successful GSC management session should:
- Sync all performance data within 24 hours
- Track index coverage across all properties
- Identify keyword opportunities weekly
- Alert on significant traffic changes
- Monitor and resolve indexing issues
- Track CWV status from GSC perspective
- Generate actionable SEO reports
- Maintain >90% index coverage
