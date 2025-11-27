# BOO Website Optimisation - Action Items

**Created:** 2025-11-27
**Store:** Buy Organics Online (buyorganicsonline.com.au)
**Platform:** BigCommerce

---

## Getting Started

Before running audits, complete setup:

```bash
# 1. Navigate to the optimization team directory
cd /home/user/master-ops/buy-organics-online/optimisation-team

# 2. Install dependencies
npm install

# 3. Configure environment (copy and edit)
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Run database migrations (in Supabase SQL Editor)
# Copy contents of migrations/001_optimisation_schema.sql

# 5. Run initial audit
npm run audit
```

---

## Priority Action Items

### Phase 1: Critical Issues (Do First)

| # | Task | Impact | Status |
|---|------|--------|--------|
| 1.1 | **Eliminate render-blocking resources** - Defer non-critical JS/CSS | FCP -500ms to -1s | [ ] |
| 1.2 | **Optimize LCP element** - Preload hero image, use responsive images | LCP -1-2s | [ ] |
| 1.3 | **Add preconnect hints** - BigCommerce CDN, Google Fonts, analytics | LCP -100-300ms | [ ] |
| 1.4 | **Reduce third-party script impact** - Audit apps, defer chat widgets | TBT -200-500ms | [ ] |

### Phase 2: High-Impact Optimizations

| # | Task | Impact | Status |
|---|------|--------|--------|
| 2.1 | **Implement responsive images** - Use srcset with BigCommerce image sizing | Page weight -40% | [ ] |
| 2.2 | **Add lazy loading** - All below-fold images with loading="lazy" | Initial load -50% | [ ] |
| 2.3 | **Add image dimensions** - Width/height attributes to prevent CLS | CLS -0.05 to -0.15 | [ ] |
| 2.4 | **Defer JavaScript loading** - Add defer/async to non-critical scripts | TTI -500ms | [ ] |
| 2.5 | **Optimize font loading** - font-display: swap, preload critical fonts | FCP -100-300ms | [ ] |

### Phase 3: Medium-Priority Improvements

| # | Task | Impact | Status |
|---|------|--------|--------|
| 3.1 | **Audit BigCommerce apps** - Remove unused, defer non-essential | TBT varies | [ ] |
| 3.2 | **Review third-party scripts** - Analytics, chat, reviews | Bundle size | [ ] |
| 3.3 | **Optimize CSS delivery** - Inline critical CSS, defer rest | FCP -200ms | [ ] |
| 3.4 | **Implement code splitting** - Load page-specific JS only | TTI -300ms | [ ] |

### Phase 4: Polish & Monitoring

| # | Task | Impact | Status |
|---|------|--------|--------|
| 4.1 | **Setup automated monitoring** - Daily audits via cron | Ongoing | [ ] |
| 4.2 | **Configure alerts** - Notify on score drops > 5 points | Prevention | [ ] |
| 4.3 | **Establish baseline** - Record current metrics for comparison | Tracking | [ ] |
| 4.4 | **Create performance budget** - Set resource size limits | Prevention | [ ] |

---

## Specific BigCommerce Fixes

### 1. Image Optimization

**Current Issue:** Images likely not optimized for different viewports

**Fix in Stencil templates:**
```handlebars
<!-- Before -->
<img src="{{getImage product.main_image 'original'}}">

<!-- After -->
<img
  src="{{getImage product.main_image '500w'}}"
  srcset="
    {{getImage product.main_image '100w'}} 100w,
    {{getImage product.main_image '200w'}} 200w,
    {{getImage product.main_image '500w'}} 500w,
    {{getImage product.main_image '1000w'}} 1000w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  width="500"
  height="500"
  loading="lazy"
  alt="{{product.name}}"
>
```

### 2. Script Loading

**Current Issue:** Scripts likely blocking rendering

**Fix in base.html:**
```html
<!-- Move to end of body, add defer -->
<script defer src="{{cdn 'theme.bundle.js'}}"></script>

<!-- Async for analytics -->
<script async src="https://www.googletagmanager.com/gtag/js"></script>
```

### 3. Resource Hints

**Add to head section:**
```html
<link rel="preconnect" href="https://cdn11.bigcommerce.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="dns-prefetch" href="https://www.google-analytics.com">
```

### 4. Font Loading

**Fix in CSS:**
```css
@font-face {
  font-family: 'YourFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;  /* Critical for performance */
}
```

### 5. Chat Widget Deferral

**Defer until user interaction:**
```javascript
let chatLoaded = false;
function loadChat() {
  if (chatLoaded) return;
  chatLoaded = true;
  // Load your chat script here
}

window.addEventListener('scroll', loadChat, { once: true, passive: true });
document.addEventListener('click', loadChat, { once: true });
setTimeout(loadChat, 5000);  // Fallback
```

---

## Quick Commands

```bash
# Run audit on homepage
npm run audit -- --url=https://www.buyorganicsonline.com.au/

# Run audit on multiple pages
npm run audit

# Compare with last week
npm run compare -- --period=week

# Run full optimization workflow
npm run optimize

# Generate report
npm run report
```

---

## Target Metrics

| Metric | Current | Target | Good |
|--------|---------|--------|------|
| Performance Score | ? | 100 | ≥95 |
| Accessibility Score | ? | 100 | ≥95 |
| Best Practices Score | ? | 100 | ≥95 |
| SEO Score | ? | 100 | ≥95 |
| LCP | ? | ≤2.5s | ≤2.5s |
| FID/INP | ? | ≤100ms | ≤100ms |
| CLS | ? | ≤0.1 | ≤0.1 |
| TBT | ? | ≤200ms | ≤200ms |

---

## Next Steps

1. **Tomorrow Morning:**
   - [ ] Pull this branch
   - [ ] Run `npm install` in optimisation-team directory
   - [ ] Run initial audit: `npm run audit`
   - [ ] Review baseline scores and failing audits
   - [ ] Update metrics in this document

2. **This Week:**
   - [ ] Complete Phase 1 critical fixes
   - [ ] Start Phase 2 high-impact optimizations
   - [ ] Setup automated daily monitoring

3. **Ongoing:**
   - [ ] Weekly performance reviews
   - [ ] Monthly trend analysis
   - [ ] Continuous optimization based on data

---

## Files Reference

| File | Purpose |
|------|---------|
| `agents/lighthouse-audit.js` | Run Lighthouse audits |
| `agents/performance-monitor.js` | Compare performance periods |
| `agents/auto-fixer.js` | Generate fix recommendations |
| `agents/coordinator.js` | Orchestrate all agents |
| `config/pages.json` | Pages to audit |
| `config/thresholds.json` | Performance thresholds |
| `migrations/001_optimisation_schema.sql` | Database schema |

---

*This document serves as the action plan for BOO website optimization. Update the status checkboxes as tasks are completed.*
