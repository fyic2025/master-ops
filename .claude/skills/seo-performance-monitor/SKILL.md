---
name: seo-performance-monitor
description: Track and improve organic search performance across BOO, Teelixir, and RHF. Monitors GSC data, keyword rankings, Core Web Vitals (GTMetrix), technical SEO issues, and content gaps. Integrates with existing GSC sync, GTMetrix client, and SEO agents. Use for ranking analysis, traffic drops, technical SEO issues, or content optimization priorities.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# SEO Performance Monitor Skill

Comprehensive organic search monitoring and optimization for all ecommerce businesses.

## When to Activate This Skill

Activate this skill when the user mentions:
- "SEO performance" or "organic traffic"
- "keyword rankings" or "position tracking"
- "GSC data" or "search console"
- "traffic drop" or "ranking loss"
- "Core Web Vitals" or "page speed"
- "GTMetrix" or "Lighthouse"
- "technical SEO" or "crawl errors"
- "404 issues" or "indexing problems"
- "content gaps" or "keyword opportunities"
- "SEO health check"

## Businesses Covered

| Business | Platform | GSC Property | GTMetrix |
|----------|----------|--------------|----------|
| Buy Organics Online | BigCommerce | buyorganicsonline.com.au | Active |
| Teelixir | Shopify | teelixir.com | Active |
| Red Hill Fresh | WooCommerce | redhillfresh.com.au | Planned |

---

## Integrated Infrastructure

### 1. GSC Sync Library
**Location**: `shared/libs/integrations/gsc/`

```bash
# Files
sync-gsc-data.js      # Daily page performance sync
sync-gsc-issues.js    # Issue detection sync
detect-issues.js      # Anomaly detection (>50% traffic drops)
inspect-urls.js       # URL Inspection API
backfill-daily-stats.js  # Historical import
```

**Run GSC Sync**:
```bash
# Sync daily stats
node shared/libs/integrations/gsc/sync-gsc-data.js

# Detect issues
node shared/libs/integrations/gsc/detect-issues.js

# Inspect specific URL
node shared/libs/integrations/gsc/inspect-urls.js --url "https://buyorganicsonline.com.au/product"
```

### 2. GTMetrix Client
**Location**: `shared/libs/integrations/gtmetrix/`

```bash
# Run performance test
node shared/libs/integrations/gtmetrix/run-test.js --url "https://buyorganicsonline.com.au"
```

### 3. SEO Agents
**Location**: `agents/seo-team/agents/`

| Agent | File | Purpose |
|-------|------|---------|
| GSC Data | gsc-data.js | Sync GSC to Supabase |
| Classification | classification.js | Product categorization |
| Keyword Research | keyword-research.js | Keyword discovery |
| Content Format | content-format.js | Content standardization |
| Content Generation | content-generation.js | AI content creation |
| Health Claims | health-claims.js | Compliance checking |
| Coordinator | coordinator.js | Orchestration |

### 4. Dashboard API
**Location**: `dashboard/src/app/api/seo/`

```typescript
// Endpoints
GET /api/seo/pages          // GSC page data with type classification
GET /api/seo/performance    // Performance metrics and aggregations
```

### 5. BOO GSC Fixes
**Location**: `buy-organics-online/gsc-fixes/`

```bash
import-redirects-and-notify-gsc.js  # 404 redirect handler
process-gsc-exports.js              # GSC export processor
check-gsc-products.js               # Product GSC tracking
gsc-issues-cron.js                  # Scheduled issue detection
```

---

## Database Schema

### GSC Tables (Master Supabase)

**gsc_page_daily_stats** - Daily performance snapshots
```sql
business TEXT,
url TEXT,
stat_date DATE,
impressions INTEGER,
clicks INTEGER,
avg_position DECIMAL,
ctr DECIMAL,
first_seen DATE
-- Index: (business, url, stat_date)
```

**gsc_issue_urls** - URL issues from Inspection API
```sql
business TEXT,
url TEXT,
issue_type TEXT,  -- not_found_404, soft_404, blocked_robots, server_error, redirect_error
severity TEXT,    -- critical, high, medium, low
status TEXT,      -- active, resolved, ignored
api_verdict TEXT,
api_coverage_state TEXT,
api_indexing_state TEXT,
api_robots_state TEXT,
api_page_fetch_state TEXT,
first_detected TIMESTAMPTZ,
last_checked TIMESTAMPTZ,
resolved_at TIMESTAMPTZ,
detection_reason TEXT,
traffic_before INTEGER,
traffic_after INTEGER
```

**gsc_sync_logs** - Sync audit trail
```sql
business TEXT,
sync_date DATE,
pages_synced INTEGER,
anomalies_detected INTEGER,
urls_inspected INTEGER,
new_issues_found INTEGER,
status TEXT  -- running, completed, failed
```

### GSC Views

```sql
-- Active issues by type and severity
SELECT * FROM v_gsc_active_issues;

-- URLs with >50% traffic drops
SELECT * FROM v_gsc_traffic_anomalies;

-- Recently discovered URLs
SELECT * FROM v_gsc_new_urls;

-- Issue resolution metrics
SELECT * FROM v_gsc_resolution_rate;

-- Queue for URL Inspection API
SELECT * FROM v_gsc_inspection_queue;
```

### GSC Functions

```sql
-- Get totals for date range
SELECT * FROM get_gsc_totals('boo', '2025-11-01', '2025-11-30');

-- Get page-level stats
SELECT * FROM get_gsc_pages('boo', '2025-11-01', '2025-11-30', 100, 'clicks');

-- Classify issue type
SELECT classify_gsc_issue(verdict, coverage, fetch, robots);
```

### GTMetrix Tables (Master Supabase)

**gtmetrix_tests** - Performance test results
```sql
business TEXT,
url TEXT,
test_id TEXT,
gtmetrix_grade TEXT,
performance_score INTEGER,
structure_score INTEGER,
-- Core Web Vitals
lcp_ms INTEGER,      -- Largest Contentful Paint
tbt_ms INTEGER,      -- Total Blocking Time
cls DECIMAL,         -- Cumulative Layout Shift
-- Page metrics
fully_loaded_ms INTEGER,
page_size_bytes INTEGER,
total_requests INTEGER,
-- Resource breakdown
js_bytes INTEGER,
css_bytes INTEGER,
image_bytes INTEGER,
font_bytes INTEGER,
-- Issues
issues JSONB
```

### GTMetrix Views

```sql
-- Latest test per URL
SELECT * FROM v_gtmetrix_latest;

-- Performance trends
SELECT * FROM v_gtmetrix_trends WHERE business = 'boo';

-- Pages failing Core Web Vitals
-- (LCP > 2.5s, TBT > 200ms, CLS > 0.1)
SELECT * FROM v_gtmetrix_needs_attention;
```

### SEO Tables (BOO Supabase)

**seo_categories** - Category SEO tracking
```sql
bc_category_id INTEGER,
name TEXT,
slug TEXT,
url TEXT,
description TEXT,
meta_title TEXT,
meta_description TEXT,
primary_keyword TEXT,
search_volume INTEGER,
keyword_difficulty INTEGER,
current_position DECIMAL,
impressions_30d INTEGER,
clicks_30d INTEGER,
status TEXT,  -- active, empty, sparse, overstuffed, duplicate
content_quality_score INTEGER
```

**seo_products** - Product SEO tracking
```sql
ecommerce_product_id UUID,
bc_product_id INTEGER,
url TEXT,
primary_category_id INTEGER,
-- Classification
classification_status TEXT,
suggested_categories JSONB,
confidence DECIMAL,
-- Data Quality
has_description BOOLEAN,
description_word_count INTEGER,
has_images BOOLEAN,
image_count INTEGER,
-- SEO
primary_keyword TEXT,
impressions_30d INTEGER,
clicks_30d INTEGER,
avg_position DECIMAL,
ctr DECIMAL,
-- Content
content_status TEXT,  -- no_description, needs_format, standard_format, pending_review, approved
seo_status TEXT       -- not_optimized, needs_classification, needs_content, optimized
```

**seo_keywords** - Keyword research database
```sql
keyword TEXT,
search_volume INTEGER,
keyword_difficulty INTEGER,
cpc DECIMAL,
competition DECIMAL,
intent TEXT,  -- informational, transactional, navigational, commercial
opportunity_score INTEGER,
priority TEXT
```

---

## Core Capabilities

### 1. Traffic Monitoring & Anomaly Detection

**Automatic Detection**:
- >50% traffic drop triggers anomaly alert
- Daily comparison vs 7-day average
- URL-level granularity

```typescript
// scripts/check-traffic-anomalies.ts
async function checkTrafficAnomalies(business: string): Promise<TrafficAnomaly[]> {
  const { data: anomalies } = await supabase
    .from('v_gsc_traffic_anomalies')
    .select('*')
    .eq('business', business)
    .order('traffic_drop_percent', { ascending: true });

  return anomalies || [];
}
```

### 2. Keyword Ranking Tracking

**Track positions across all pages**:
```sql
-- Position changes over 30 days
SELECT
  url,
  keyword,
  avg_position AS current_position,
  LAG(avg_position, 30) OVER (PARTITION BY url ORDER BY stat_date) AS position_30d_ago,
  avg_position - LAG(avg_position, 30) OVER (PARTITION BY url ORDER BY stat_date) AS position_change
FROM gsc_page_daily_stats
WHERE business = 'boo'
  AND stat_date >= CURRENT_DATE - 30;
```

### 3. Core Web Vitals Monitoring

**GTMetrix Integration**:
```typescript
// scripts/check-core-web-vitals.ts
async function checkCoreWebVitals(business: string): Promise<CWVReport> {
  const { data: failing } = await supabase
    .from('v_gtmetrix_needs_attention')
    .select('*')
    .eq('business', business);

  const { data: summary } = await supabase
    .rpc('get_gtmetrix_summary', { p_business: business });

  return {
    passingCount: summary.passing,
    failingCount: failing?.length || 0,
    failingPages: failing || [],
    avgLCP: summary.avg_lcp_ms,
    avgTBT: summary.avg_tbt_ms,
    avgCLS: summary.avg_cls
  };
}
```

**Thresholds**:
| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | 2.5-4s | >4s |
| TBT | ≤200ms | 200-600ms | >600ms |
| CLS | ≤0.1 | 0.1-0.25 | >0.25 |

### 4. Technical SEO Issue Detection

**Issue Types Tracked**:
- `not_found_404` - Missing pages
- `soft_404` - Returns 200 but looks like error
- `blocked_robots` - Blocked by robots.txt
- `server_error` - 5xx responses
- `redirect_error` - Broken redirects
- `duplicate_content` - Duplicate pages
- `mobile_usability` - Mobile issues

```typescript
// scripts/check-technical-issues.ts
async function getTechnicalIssues(business: string): Promise<TechnicalIssueReport> {
  const { data: issues } = await supabase
    .from('gsc_issue_urls')
    .select('*')
    .eq('business', business)
    .eq('status', 'active')
    .order('severity');

  const grouped = groupBy(issues, 'issue_type');

  return {
    total: issues?.length || 0,
    byType: {
      not_found_404: grouped.not_found_404?.length || 0,
      soft_404: grouped.soft_404?.length || 0,
      blocked_robots: grouped.blocked_robots?.length || 0,
      server_error: grouped.server_error?.length || 0,
      redirect_error: grouped.redirect_error?.length || 0
    },
    critical: issues?.filter(i => i.severity === 'critical') || [],
    high: issues?.filter(i => i.severity === 'high') || []
  };
}
```

### 5. Content Gap Analysis

**Identify optimization opportunities**:
```sql
-- Products with traffic but no optimized content
SELECT
  p.bc_product_id,
  p.name,
  sp.impressions_30d,
  sp.clicks_30d,
  sp.content_status,
  sp.seo_status
FROM ecommerce_products p
JOIN seo_products sp ON p.id = sp.ecommerce_product_id
WHERE sp.impressions_30d > 100
  AND sp.content_status IN ('no_description', 'needs_format')
ORDER BY sp.impressions_30d DESC
LIMIT 50;
```

### 6. Competitor Keyword Gaps

**Keywords competitors rank for that we don't**:
```sql
-- High-volume keywords we don't rank for
SELECT
  k.keyword,
  k.search_volume,
  k.keyword_difficulty,
  k.intent,
  k.opportunity_score
FROM seo_keywords k
WHERE k.search_volume > 500
  AND NOT EXISTS (
    SELECT 1 FROM gsc_page_daily_stats g
    WHERE g.url LIKE '%' || k.keyword || '%'
  )
ORDER BY k.opportunity_score DESC
LIMIT 20;
```

---

## Scripts

### seo-health-check.ts
Comprehensive SEO health assessment.

```bash
# Full health check
npx tsx .claude/skills/seo-performance-monitor/scripts/seo-health-check.ts

# Specific business
npx tsx .claude/skills/seo-performance-monitor/scripts/seo-health-check.ts --business boo

# Export report
npx tsx .claude/skills/seo-performance-monitor/scripts/seo-health-check.ts --export
```

### ranking-tracker.ts
Track keyword position changes.

```bash
# Check ranking changes
npx tsx .claude/skills/seo-performance-monitor/scripts/ranking-tracker.ts --business boo --days 30

# Track specific keywords
npx tsx .claude/skills/seo-performance-monitor/scripts/ranking-tracker.ts --keywords "organic food,health supplements"
```

### cwv-monitor.ts
Core Web Vitals monitoring.

```bash
# Check all businesses
npx tsx .claude/skills/seo-performance-monitor/scripts/cwv-monitor.ts

# Run new tests for failing pages
npx tsx .claude/skills/seo-performance-monitor/scripts/cwv-monitor.ts --retest-failing
```

### content-opportunities.ts
Find content optimization opportunities.

```bash
# Get content gaps
npx tsx .claude/skills/seo-performance-monitor/scripts/content-opportunities.ts --business boo

# Priority queue
npx tsx .claude/skills/seo-performance-monitor/scripts/content-opportunities.ts --top 20
```

---

## Environment Variables

```bash
# Google OAuth2 (shared)
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_GSC_REFRESH_TOKEN=

# GTMetrix
GTMETRIX_API_KEY=

# Supabase (Master)
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# BOO Supabase (SEO tables)
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=
```

---

## Integration with Other Skills

### dashboard-automation
- SEO metrics feed into daily reports
- Traffic anomalies generate alerts

### stock-alert-predictor
- Product pages with stock issues affect SEO
- Zero-stock products should be noindexed

### customer-churn-predictor
- Landing page quality affects conversion
- CWV impacts bounce rates

---

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Traffic drop (daily) | >30% | >50% |
| Position drop | >5 positions | >10 positions |
| LCP | >2.5s | >4s |
| New 404s (daily) | >10 | >50 |
| Index coverage drop | >5% | >10% |

---

## Reporting Schedule

| Report | Frequency | Recipients |
|--------|-----------|------------|
| Traffic Summary | Daily 8am AEST | Dashboard |
| Ranking Changes | Weekly Monday | Email |
| CWV Audit | Weekly | Dashboard |
| Technical Issues | On detection | Alert |
| Content Opportunities | Monthly | Email |

---

## Success Criteria

A successful SEO monitoring session should:
- Detect traffic anomalies within 24 hours
- Track ranking changes for priority keywords
- Maintain <50 active technical issues
- Keep CWV passing for >80% of pages
- Identify top 20 content opportunities monthly
- Provide actionable recommendations

---

## Emergency Procedures

### Sudden Traffic Drop
1. Check `v_gsc_traffic_anomalies` for affected URLs
2. Run URL Inspection API on top affected pages
3. Check for recent site changes (robots.txt, sitemap)
4. Verify server is responding correctly
5. Check Google algorithm update announcements

### Mass Indexing Issues
1. Check `gsc_issue_urls` for pattern
2. Verify sitemap is accessible
3. Check robots.txt for unintended blocks
4. Submit affected URLs for re-indexing
5. Monitor coverage in GSC dashboard

### CWV Failures
1. Check `v_gtmetrix_needs_attention` for failing pages
2. Identify common issues (large images, slow JS)
3. Prioritize high-traffic pages
4. Implement fixes and retest
5. Monitor improvement over time
