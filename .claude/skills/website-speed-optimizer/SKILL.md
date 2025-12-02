---
name: website-speed-optimizer
description: Core Web Vitals monitoring, Lighthouse auditing, and performance optimization across all 4 e-commerce stores. Tracks LCP, FID, CLS, INP, and provides optimization recommendations. Use for page speed and performance issues.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Website Speed Optimizer Skill

Core Web Vitals monitoring, Lighthouse auditing, and performance optimization across all 4 e-commerce stores.

## Businesses Covered

| Business | Platform | URL | Priority |
|----------|----------|-----|----------|
| Buy Organics Online | BigCommerce | buyorganicsonline.com.au | High (highest traffic) |
| Teelixir | Shopify | teelixir.com | High |
| Elevate Wholesale | Shopify | elevatewholesale.com.au | Medium |
| Red Hill Fresh | WooCommerce | redhillfresh.com.au | Medium |

---

## When to Activate This Skill

Activate when the user mentions:
- "page speed" or "site speed"
- "core web vitals" or "CWV"
- "lighthouse audit"
- "LCP", "FID", "CLS", "INP", "TTFB"
- "slow loading" or "performance issues"
- "PageSpeed Insights"
- "mobile performance"
- "image optimization"
- "render blocking"
- "website optimization"

---

## Core Capabilities

### 1. Core Web Vitals Monitoring
Track Google's key performance metrics across all stores:
- **LCP** (Largest Contentful Paint) - Loading performance
- **INP** (Interaction to Next Paint) - Interactivity (replaced FID)
- **CLS** (Cumulative Layout Shift) - Visual stability
- **TTFB** (Time to First Byte) - Server response
- **FCP** (First Contentful Paint) - Initial render

### 2. Lighthouse Auditing
Automated performance audits with scoring:
- Performance score (0-100)
- Accessibility score
- Best Practices score
- SEO score
- PWA readiness

### 3. PageSpeed Insights Integration
Real-world Chrome User Experience (CrUX) data:
- Field data (real users)
- Lab data (simulated)
- Origin-level metrics
- URL-level metrics

### 4. Optimization Recommendations
Actionable fixes prioritized by impact:
- Image optimization (WebP, lazy loading, sizing)
- JavaScript optimization (defer, async, code splitting)
- CSS optimization (critical CSS, unused removal)
- Server optimization (caching, compression, CDN)
- Third-party script management

### 5. Historical Tracking
Performance trends over time:
- Daily/weekly/monthly comparisons
- Regression detection
- Improvement tracking
- Alert on degradation

---

## Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | 2.5s - 4.0s | >4.0s |
| INP | ≤200ms | 200ms - 500ms | >500ms |
| CLS | ≤0.1 | 0.1 - 0.25 | >0.25 |
| TTFB | ≤800ms | 800ms - 1800ms | >1800ms |
| FCP | ≤1.8s | 1.8s - 3.0s | >3.0s |

**Target**: All metrics in "Good" range for 75th percentile of page loads.

---

## Database Schema

### Performance Tables (Master Supabase)

```sql
-- Lighthouse audit results
CREATE TABLE lighthouse_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  url TEXT NOT NULL,
  page_type TEXT,  -- 'homepage', 'product', 'collection', 'cart', 'checkout'
  device TEXT NOT NULL,  -- 'mobile', 'desktop'

  -- Scores (0-100)
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  seo_score INTEGER,

  -- Core Web Vitals (milliseconds/decimal)
  lcp_ms INTEGER,
  inp_ms INTEGER,
  cls DECIMAL(5,3),
  ttfb_ms INTEGER,
  fcp_ms INTEGER,

  -- Additional metrics
  total_blocking_time_ms INTEGER,
  speed_index_ms INTEGER,
  time_to_interactive_ms INTEGER,

  -- Opportunities
  opportunities JSONB,  -- Array of optimization suggestions
  diagnostics JSONB,    -- Detailed diagnostic info

  -- Source
  source TEXT,  -- 'lighthouse_cli', 'pagespeed_api', 'crux'
  is_field_data BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_lighthouse_business ON lighthouse_audits(business);
CREATE INDEX idx_lighthouse_url ON lighthouse_audits(url);
CREATE INDEX idx_lighthouse_created ON lighthouse_audits(created_at DESC);
CREATE INDEX idx_lighthouse_device ON lighthouse_audits(device);

-- Performance budgets per business/page
CREATE TABLE performance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  page_type TEXT NOT NULL,  -- 'homepage', 'product', 'collection', 'all'
  device TEXT NOT NULL,

  -- Target scores
  min_performance_score INTEGER DEFAULT 70,
  min_accessibility_score INTEGER DEFAULT 90,

  -- CWV targets
  max_lcp_ms INTEGER DEFAULT 2500,
  max_inp_ms INTEGER DEFAULT 200,
  max_cls DECIMAL(5,3) DEFAULT 0.1,
  max_ttfb_ms INTEGER DEFAULT 800,

  -- Alerting
  alert_on_breach BOOLEAN DEFAULT true,
  alert_email TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, page_type, device)
);

-- Performance alerts
CREATE TABLE performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  url TEXT,
  alert_type TEXT NOT NULL,  -- 'score_drop', 'cwv_breach', 'regression'
  severity TEXT NOT NULL,  -- 'warning', 'critical'

  metric TEXT,  -- 'lcp', 'cls', 'performance_score', etc.
  current_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  previous_value DECIMAL(10,2),

  message TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance trends (daily aggregates)
CREATE TABLE performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  page_type TEXT NOT NULL,
  device TEXT NOT NULL,
  trend_date DATE NOT NULL,

  -- Average scores
  avg_performance_score DECIMAL(5,2),
  avg_lcp_ms INTEGER,
  avg_inp_ms INTEGER,
  avg_cls DECIMAL(5,3),
  avg_ttfb_ms INTEGER,

  -- Sample count
  audit_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, page_type, device, trend_date)
);
```

### Key Views

```sql
-- Latest audit per business/device
CREATE OR REPLACE VIEW v_latest_audits AS
SELECT DISTINCT ON (business, device, page_type)
  *
FROM lighthouse_audits
ORDER BY business, device, page_type, created_at DESC;

-- CWV status summary
CREATE OR REPLACE VIEW v_cwv_status AS
SELECT
  business,
  device,
  COUNT(*) as audit_count,
  ROUND(AVG(performance_score), 1) as avg_performance,
  ROUND(AVG(lcp_ms), 0) as avg_lcp_ms,
  ROUND(AVG(inp_ms), 0) as avg_inp_ms,
  ROUND(AVG(cls)::numeric, 3) as avg_cls,
  ROUND(AVG(ttfb_ms), 0) as avg_ttfb_ms,
  -- Pass rates (meeting "Good" thresholds)
  ROUND(100.0 * COUNT(CASE WHEN lcp_ms <= 2500 THEN 1 END) / COUNT(*), 1) as lcp_pass_rate,
  ROUND(100.0 * COUNT(CASE WHEN inp_ms <= 200 THEN 1 END) / COUNT(*), 1) as inp_pass_rate,
  ROUND(100.0 * COUNT(CASE WHEN cls <= 0.1 THEN 1 END) / COUNT(*), 1) as cls_pass_rate
FROM lighthouse_audits
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY business, device;

-- Budget breaches
CREATE OR REPLACE VIEW v_budget_breaches AS
SELECT
  la.business,
  la.url,
  la.device,
  la.page_type,
  pb.min_performance_score as budget_score,
  la.performance_score as actual_score,
  pb.max_lcp_ms as budget_lcp,
  la.lcp_ms as actual_lcp,
  pb.max_cls as budget_cls,
  la.cls as actual_cls,
  CASE
    WHEN la.performance_score < pb.min_performance_score THEN 'score_breach'
    WHEN la.lcp_ms > pb.max_lcp_ms THEN 'lcp_breach'
    WHEN la.cls > pb.max_cls THEN 'cls_breach'
    ELSE 'ok'
  END as breach_type
FROM lighthouse_audits la
JOIN performance_budgets pb ON la.business = pb.business
  AND (pb.page_type = 'all' OR la.page_type = pb.page_type)
  AND la.device = pb.device
WHERE la.created_at > NOW() - INTERVAL '24 hours'
  AND (
    la.performance_score < pb.min_performance_score
    OR la.lcp_ms > pb.max_lcp_ms
    OR la.cls > pb.max_cls
    OR la.inp_ms > pb.max_inp_ms
  );

-- Week-over-week trends
CREATE OR REPLACE VIEW v_performance_wow AS
SELECT
  t1.business,
  t1.device,
  t1.avg_performance_score as current_score,
  t2.avg_performance_score as previous_score,
  t1.avg_performance_score - t2.avg_performance_score as score_change,
  t1.avg_lcp_ms as current_lcp,
  t2.avg_lcp_ms as previous_lcp,
  t2.avg_lcp_ms - t1.avg_lcp_ms as lcp_improvement_ms
FROM performance_trends t1
JOIN performance_trends t2 ON t1.business = t2.business
  AND t1.device = t2.device
  AND t1.page_type = t2.page_type
  AND t2.trend_date = t1.trend_date - INTERVAL '7 days'
WHERE t1.trend_date = CURRENT_DATE - 1;
```

---

## Scripts

### run-lighthouse-audit.ts
Run Lighthouse audit for a specific URL or business.

```bash
# Audit single URL
npx tsx .claude/skills/website-speed-optimizer/scripts/run-lighthouse-audit.ts --url https://teelixir.com

# Audit all key pages for a business
npx tsx .claude/skills/website-speed-optimizer/scripts/run-lighthouse-audit.ts --business teelixir

# Audit all businesses
npx tsx .claude/skills/website-speed-optimizer/scripts/run-lighthouse-audit.ts --all

# Mobile only
npx tsx .claude/skills/website-speed-optimizer/scripts/run-lighthouse-audit.ts --business boo --device mobile
```

### fetch-pagespeed-insights.ts
Fetch real-world CrUX data from PageSpeed Insights API.

```bash
# Get PSI data for URL
npx tsx .claude/skills/website-speed-optimizer/scripts/fetch-pagespeed-insights.ts --url https://buyorganicsonline.com.au

# Get origin-level data
npx tsx .claude/skills/website-speed-optimizer/scripts/fetch-pagespeed-insights.ts --origin https://teelixir.com
```

### check-cwv-status.ts
Check Core Web Vitals status across all businesses.

```bash
# Quick status check
npx tsx .claude/skills/website-speed-optimizer/scripts/check-cwv-status.ts

# Detailed report
npx tsx .claude/skills/website-speed-optimizer/scripts/check-cwv-status.ts --detailed

# Export to CSV
npx tsx .claude/skills/website-speed-optimizer/scripts/check-cwv-status.ts --export
```

### generate-optimization-report.ts
Generate detailed optimization recommendations.

```bash
# Full report for business
npx tsx .claude/skills/website-speed-optimizer/scripts/generate-optimization-report.ts --business teelixir

# Focus on specific metric
npx tsx .claude/skills/website-speed-optimizer/scripts/generate-optimization-report.ts --business boo --metric lcp
```

### monitor-performance-budgets.ts
Check performance against budgets and alert on breaches.

```bash
# Check all budgets
npx tsx .claude/skills/website-speed-optimizer/scripts/monitor-performance-budgets.ts

# Alert mode (exit 1 on breach)
npx tsx .claude/skills/website-speed-optimizer/scripts/monitor-performance-budgets.ts --alert
```

---

## Key Pages to Monitor

### Buy Organics Online (BigCommerce)
| Page Type | URL Pattern | Priority |
|-----------|-------------|----------|
| Homepage | / | Critical |
| Product | /products/* | Critical |
| Collection | /categories/* | High |
| Search | /search | High |
| Cart | /cart | Critical |
| Checkout | /checkout | Critical |

### Teelixir (Shopify)
| Page Type | URL Pattern | Priority |
|-----------|-------------|----------|
| Homepage | / | Critical |
| Product | /products/* | Critical |
| Collection | /collections/* | High |
| Blog | /blogs/* | Medium |
| Cart | /cart | Critical |

### Elevate Wholesale (Shopify)
| Page Type | URL Pattern | Priority |
|-----------|-------------|----------|
| Homepage | / | Critical |
| Product | /products/* | High |
| Collection | /collections/* | High |
| Account | /account/* | Medium |

### Red Hill Fresh (WooCommerce)
| Page Type | URL Pattern | Priority |
|-----------|-------------|----------|
| Homepage | / | Critical |
| Product | /product/* | Critical |
| Shop | /shop | High |
| Cart | /cart | Critical |
| Checkout | /checkout | Critical |

---

## Common Optimization Strategies

### LCP Optimization (Target: ≤2.5s)
1. **Hero image optimization**
   - Use WebP format with JPEG fallback
   - Implement responsive srcset
   - Preload hero images: `<link rel="preload" as="image">`
   - Use appropriate sizing (avoid oversized images)

2. **Server response optimization**
   - Enable CDN (Cloudflare, Fastly)
   - Implement edge caching
   - Optimize database queries
   - Use HTTP/2 or HTTP/3

3. **Render-blocking resource removal**
   - Defer non-critical JavaScript
   - Inline critical CSS
   - Use `font-display: swap` for web fonts

### CLS Optimization (Target: ≤0.1)
1. **Image dimensions**
   - Always specify width/height attributes
   - Use aspect-ratio CSS property
   - Reserve space for lazy-loaded images

2. **Dynamic content**
   - Reserve space for ads/embeds
   - Avoid inserting content above existing content
   - Use transform animations instead of layout-affecting properties

3. **Font loading**
   - Preload critical fonts
   - Use `font-display: optional` or `swap`
   - Match fallback font metrics

### INP Optimization (Target: ≤200ms)
1. **JavaScript optimization**
   - Break up long tasks (>50ms)
   - Use `requestIdleCallback` for non-critical work
   - Implement code splitting
   - Defer third-party scripts

2. **Event handler optimization**
   - Debounce scroll/resize handlers
   - Use passive event listeners
   - Avoid forced synchronous layouts

3. **Main thread optimization**
   - Move work to Web Workers
   - Use `requestAnimationFrame` for visual updates
   - Minimize DOM size (<1500 nodes ideal)

### TTFB Optimization (Target: ≤800ms)
1. **Server-side**
   - Optimize database queries
   - Implement server-side caching
   - Use connection pooling
   - Enable compression (gzip/brotli)

2. **CDN/Edge**
   - Use CDN for static assets
   - Implement edge caching
   - Use regional origin servers

3. **Platform-specific**
   - BigCommerce: Enable Akamai CDN
   - Shopify: Use native CDN, avoid excessive apps
   - WooCommerce: Use caching plugins (WP Rocket, W3TC)

---

## Platform-Specific Considerations

### BigCommerce (BOO)
- Uses Akamai CDN by default
- Theme file optimization via Stencil CLI
- Script Manager for third-party scripts
- Image optimization via built-in CDN
- Limited control over checkout performance

### Shopify (Teelixir, Elevate)
- Uses Fastly CDN by default
- Theme optimization via Liquid
- Script loading via theme.liquid or app embeds
- Native lazy loading for images
- App impact analysis critical

### WooCommerce (RHF)
- Requires manual CDN setup
- Plugin-based optimization
- Full server control
- Database optimization important
- Caching plugin essential

---

## Environment Variables Required

```bash
# PageSpeed Insights API
PAGESPEED_API_KEY=

# Supabase (for storing results)
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Site URLs
BOO_SITE_URL=https://buyorganicsonline.com.au
TEELIXIR_SITE_URL=https://teelixir.com
ELEVATE_SITE_URL=https://elevatewholesale.com.au
RHF_SITE_URL=https://redhillfresh.com.au

# Alerting (optional)
SLACK_WEBHOOK_URL=
ALERT_EMAIL=jayson@fyic.com.au
```

---

## Automation Schedule

| Task | Frequency | Time (AEST) |
|------|-----------|-------------|
| Full Lighthouse Audit | Daily | 6:00 AM |
| PageSpeed Insights Sync | Daily | 6:30 AM |
| Budget Check | Every 6 hours | - |
| Trend Calculation | Daily | 7:00 AM |
| Performance Report | Weekly | Monday 9:00 AM |
| Alert Review | Continuous | - |

---

## Alert Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| Performance score drops >10 points | Warning | Email notification |
| Performance score <50 | Critical | Immediate alert |
| LCP >4s | Critical | Investigate immediately |
| CLS >0.25 | Critical | Check for layout issues |
| INP >500ms | Critical | JavaScript audit needed |
| Any CWV fails "Good" threshold | Warning | Review and prioritize |

---

## Integration Points

### Dashboard
- Performance widgets on ops.growthcohq.com
- CWV trend charts
- Budget breach alerts
- Business comparison view

### Google Search Console
- CWV data correlation with GSC
- Page experience signals
- Mobile usability overlap

### Existing Automations
- Daily report includes performance summary
- n8n workflow for scheduled audits
- Slack notifications for critical issues

---

## Success Criteria

A successful performance optimization session should:
- Run comprehensive audits across all critical pages
- Identify top 5 optimization opportunities per site
- Provide specific, actionable recommendations
- Track improvements over time
- Alert on performance regressions within 6 hours
- Maintain all CWV metrics in "Good" range
- Keep performance scores >70 across all businesses
