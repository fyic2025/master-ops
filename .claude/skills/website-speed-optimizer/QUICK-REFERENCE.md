# Website Speed Optimizer - Quick Reference

## Core Web Vitals Thresholds

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| **LCP** | ≤2.5s | 2.5-4.0s | >4.0s |
| **INP** | ≤200ms | 200-500ms | >500ms |
| **CLS** | ≤0.1 | 0.1-0.25 | >0.25 |
| **TTFB** | ≤800ms | 800-1800ms | >1800ms |
| **FCP** | ≤1.8s | 1.8-3.0s | >3.0s |

---

## Quick Commands

```bash
# Run audit for all businesses
npx tsx .claude/skills/website-speed-optimizer/scripts/run-lighthouse-audit.ts --all

# Check single URL
npx tsx .claude/skills/website-speed-optimizer/scripts/run-lighthouse-audit.ts --url https://teelixir.com

# Get CWV status
npx tsx .claude/skills/website-speed-optimizer/scripts/check-cwv-status.ts

# Check budgets
npx tsx .claude/skills/website-speed-optimizer/scripts/monitor-performance-budgets.ts
```

---

## Business Sites

| Business | URL | Platform |
|----------|-----|----------|
| BOO | buyorganicsonline.com.au | BigCommerce |
| Teelixir | teelixir.com | Shopify |
| Elevate | elevatewholesale.com.au | Shopify |
| RHF | redhillfresh.com.au | WooCommerce |

---

## Quick Diagnostics

### Slow LCP?
1. Check hero image size (should be <200KB)
2. Verify image preloading
3. Check TTFB (server response)
4. Look for render-blocking resources

### High CLS?
1. Check for images without dimensions
2. Look for dynamic content injection
3. Check font loading strategy
4. Review ad/embed placeholders

### Poor INP?
1. Check for long JavaScript tasks (>50ms)
2. Review third-party scripts
3. Check event handler efficiency
4. Look for layout thrashing

### Slow TTFB?
1. Check server response time
2. Verify CDN is active
3. Review database queries
4. Check caching headers

---

## Key SQL Queries

```sql
-- Latest scores per business
SELECT business, device, performance_score, lcp_ms, cls, inp_ms
FROM v_latest_audits
ORDER BY business, device;

-- CWV pass rates
SELECT business, lcp_pass_rate, inp_pass_rate, cls_pass_rate
FROM v_cwv_status;

-- Recent budget breaches
SELECT business, url, breach_type, actual_score, budget_score
FROM v_budget_breaches;

-- Week-over-week change
SELECT business, current_score, previous_score, score_change
FROM v_performance_wow;
```

---

## PageSpeed Insights API

```bash
# Quick API call
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://teelixir.com&key=$PAGESPEED_API_KEY&strategy=mobile"
```

**Key response fields:**
- `lighthouseResult.categories.performance.score` - Performance score (0-1)
- `lighthouseResult.audits.largest-contentful-paint.numericValue` - LCP in ms
- `lighthouseResult.audits.cumulative-layout-shift.numericValue` - CLS
- `loadingExperience.metrics` - Field data (CrUX)

---

## Common Fixes by Platform

### BigCommerce
- Enable Akamai CDN in settings
- Optimize theme images via Stencil
- Use Script Manager for third-party
- Enable lazy loading in theme

### Shopify
- Minimize app installations
- Use native lazy loading
- Defer non-critical scripts in theme.liquid
- Use Shopify's image_url filter with size params

### WooCommerce
- Install caching plugin (WP Rocket)
- Configure CDN (Cloudflare)
- Optimize database with WP-Optimize
- Use WebP images with fallback

---

## Performance Budget Defaults

| Metric | Mobile | Desktop |
|--------|--------|---------|
| Performance Score | ≥70 | ≥80 |
| LCP | ≤2500ms | ≤2000ms |
| INP | ≤200ms | ≤100ms |
| CLS | ≤0.1 | ≤0.1 |
| TTFB | ≤800ms | ≤600ms |

---

## Alert Escalation

| Severity | Condition | Response |
|----------|-----------|----------|
| Info | Single metric degrades slightly | Monitor |
| Warning | Score drops 10+ points | Investigate within 24h |
| Critical | Score <50 or CWV "Poor" | Immediate action |
