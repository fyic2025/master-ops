# Implementation Guide: AI Agent Team for Shopify Optimization

**Document Version:** 1.0.0
**Last Updated:** 2024-11-20
**Target:** Teelixir & Elevate Shopify Stores

## Executive Summary

This guide provides step-by-step instructions to implement a team of 5 specialized AI agents managed through Claude Code to achieve and maintain 100/100 Lighthouse scores across Performance, Accessibility, Best Practices, and SEO.

**Estimated Implementation Time:** 4-6 weeks
**Prerequisites:** Claude Code, Supabase account, Shopify store access, Git repository

## Phase 1: Foundation Setup (Week 1)

### 1.1 Database Setup

**Objective:** Create Supabase schema for all agent logging

```bash
# Steps:
1. Log into your Supabase project
2. Navigate to SQL Editor
3. Open: /root/master-ops/agents/database-schema.sql
4. Execute the entire SQL file
5. Verify tables created:
   - lighthouse_audits
   - performance_trends
   - performance_alerts
   - theme_changes
   - accessibility_audits
   - seo_implementation_tasks
   - deployment_history
   - agent_activity_log
   - performance_budgets
```

**Verification:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%audit%' OR table_name LIKE '%deployment%';

-- Check initial performance budgets loaded
SELECT * FROM performance_budgets;
```

### 1.2 Install Required Tools

```bash
# Node.js packages (global)
npm install -g @lhci/cli           # Lighthouse CI
npm install -g @shopify/cli        # Shopify CLI
npm install -g @shopify/theme      # Shopify Theme CLI
npm install -g axe-core            # Accessibility testing
npm install -g pa11y               # Accessibility testing
npm install -g eslint              # JavaScript linting
npm install -g stylelint           # CSS linting

# Verify installations
lhci --version
shopify version
axe --version
pa11y --version
eslint --version
```

### 1.3 Shopify Authentication

```bash
# Authenticate with Shopify stores
shopify auth login

# Test access to Teelixir store
shopify theme list --store=teelixir-au

# Test access to Elevate store (if separate)
shopify theme list --store=elevate-wholesale

# Download current themes for backup
cd /root/master-ops/teelixir
shopify theme pull --live --store=teelixir-au

cd /root/master-ops/elevate-wholesale
shopify theme pull --live --store=elevate-wholesale
```

### 1.4 Git Repository Setup

```bash
# Initialize Git for theme version control
cd /root/master-ops

# Check if Git is initialized
git status

# If not initialized:
git init
git add .
git commit -m "Initial commit: AI agent team setup"

# Create branches
git branch staging
git branch production

# Tag current state
git tag -a baseline-v1.0.0 -m "Baseline before AI agent optimization"
```

## Phase 2: Agent Configuration (Week 1-2)

### 2.1 Review Agent Configurations

Each agent has a configuration file that may need customization:

**Lighthouse Audit Agent:**
```bash
# Edit: /root/master-ops/agents/lighthouse-audit/config/agent-config.json
# Customize:
- Performance targets (default: 100/100, minimum: 95/100)
- Core Web Vitals thresholds
- Alert notification settings
- Supabase connection details
```

**Theme Optimizer Agent:**
```bash
# Edit: /root/master-ops/agents/theme-optimizer/config/agent-config.json
# Customize:
- Performance budgets (JS, CSS, images, fonts)
- Optimization priorities
- Code quality standards
```

**Accessibility Agent:**
```bash
# Edit: /root/master-ops/agents/accessibility/config/agent-config.json
# Customize:
- WCAG compliance level (default: AA required, AAA target)
- Testing tools configuration
- Violation severity thresholds
```

**SEO Implementation Agent:**
```bash
# Edit: /root/master-ops/agents/seo-implementer/config/agent-config.json
# Customize:
- Schema.org templates
- Task intake process
- Validation tools
```

**Deployment Agent:**
```bash
# Edit: /root/master-ops/agents/deployment/config/agent-config.json
# Customize:
- Validation gate thresholds
- Approval workflow
- Rollback triggers
```

### 2.2 Update Supabase Connection

In each agent config, update Supabase details:

```json
{
  "logging": {
    "destination": "supabase",
    "connection": {
      "url": "https://your-project.supabase.co",
      "anon_key": "your-anon-key",
      "service_role_key": "your-service-role-key"
    }
  }
}
```

## Phase 3: Baseline Audits (Week 2)

### 3.1 Run Initial Lighthouse Audits

**Objective:** Establish current performance baseline

```bash
# Create script: /root/master-ops/scripts/baseline-audit.sh
#!/bin/bash

BRAND="teelixir"
STORE_URL="https://teelixir-au.myshopify.com"

# Pages to audit
PAGES=(
  "/"
  "/collections/all"
  "/products/chaga-mushroom"
  "/cart"
  "/pages/about"
  "/pages/contact"
)

for PAGE in "${PAGES[@]}"; do
  echo "Auditing: $STORE_URL$PAGE"

  # Desktop audit
  lhci autorun \
    --config=/root/master-ops/agents/lighthouse-audit/config/lighthouse-config.json \
    --url="$STORE_URL$PAGE" \
    --preset=desktop

  # Mobile audit
  lhci autorun \
    --config=/root/master-ops/agents/lighthouse-audit/config/lighthouse-config.json \
    --url="$STORE_URL$PAGE" \
    --preset=mobile
done
```

```bash
# Make executable and run
chmod +x /root/master-ops/scripts/baseline-audit.sh
./scripts/baseline-audit.sh
```

### 3.2 Document Baseline Results

Create a baseline report:

```markdown
# Baseline Performance Report - Teelixir
Date: 2024-11-20

## Lighthouse Scores (Desktop)
| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| Homepage | 87/100 | 96/100 | 92/100 | 100/100 |
| Collection | 84/100 | 94/100 | 92/100 | 98/100 |
| Product | 85/100 | 96/100 | 96/100 | 100/100 |

## Core Web Vitals
| Page | LCP | FID | CLS |
|------|-----|-----|-----|
| Homepage | 3.2s ❌ | 95ms ✅ | 0.15 ❌ |
| Product | 3.5s ❌ | 110ms ❌ | 0.18 ❌ |

## Critical Issues
1. Oversized images (LCP impact)
2. Render-blocking CSS
3. Unused JavaScript (350KB)
4. Missing font-display
5. Layout shifts from lazy-loaded content

## Optimization Priority
1. Image optimization (Critical)
2. Critical CSS extraction (Critical)
3. JavaScript code splitting (High)
4. Font optimization (High)
5. Layout shift prevention (High)
```

## Phase 4: Initial Optimizations (Week 3-4)

### 4.1 Priority 1: Image Optimization

**Implemented by:** Theme Optimizer Agent

**Actions:**
1. Convert all images to WebP with fallbacks
2. Implement responsive images (srcset)
3. Add lazy loading to below-fold images
4. Specify width/height to prevent CLS
5. Optimize image sizes

**Example Implementation:**
```liquid
{%- # Before -%}
<img src="{{ product.featured_image | img_url: 'large' }}" alt="{{ product.title }}">

{%- # After -%}
<img
  src="{{ product.featured_image | image_url: width: 800 }}"
  srcset="
    {{ product.featured_image | image_url: width: 400 }} 400w,
    {{ product.featured_image | image_url: width: 800 }} 800w,
    {{ product.featured_image | image_url: width: 1200 }} 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="{{ product.title | escape }}"
  loading="lazy"
  width="{{ product.featured_image.width }}"
  height="{{ product.featured_image.height }}"
>
```

**Validation:**
- Run Lighthouse audit
- Check LCP improvement
- Verify CLS reduction
- Log changes to Supabase

### 4.2 Priority 2: Critical CSS

**Implemented by:** Theme Optimizer Agent

**Actions:**
1. Extract critical above-fold CSS
2. Inline critical CSS in `<head>`
3. Defer non-critical CSS
4. Remove unused CSS

**Example Implementation:**
```html
{%- # In theme.liquid <head> -%}
<style>
  /* Critical CSS only (under 14KB) */
  body { margin: 0; font-family: system-ui, sans-serif; }
  .header { /* critical header styles */ }
  .hero { /* above-fold hero styles */ }
</style>

{%- # Defer non-critical CSS -%}
<link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="{{ 'theme.css' | asset_url }}"></noscript>
```

**Validation:**
- FCP should improve by 500-800ms
- Render-blocking resources eliminated
- Lighthouse Performance +5-10 points

### 4.3 Priority 3: JavaScript Optimization

**Implemented by:** Theme Optimizer Agent

**Actions:**
1. Defer non-critical JavaScript
2. Implement code splitting
3. Remove unused JavaScript
4. Minify and compress

**Example Implementation:**
```liquid
{%- # Defer non-critical scripts -%}
<script src="{{ 'theme.js' | asset_url }}" defer></script>

{%- # Lazy load features -%}
<script type="module">
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        import('{{ 'reviews.js' | asset_url }}')
          .then(module => module.init());
        observer.disconnect();
      }
    });
  });

  const reviewsSection = document.querySelector('.reviews-section');
  if (reviewsSection) observer.observe(reviewsSection);
</script>
```

**Validation:**
- TTI improvement
- TBT reduction
- JavaScript bundle size reduction

## Phase 5: Accessibility Compliance (Week 4-5)

### 5.1 Run Accessibility Audits

**Implemented by:** Accessibility Agent

```bash
# Run axe-core
npx @axe-core/cli https://teelixir-au.myshopify.com --save accessibility-report.json

# Run pa11y
npx pa11y https://teelixir-au.myshopify.com --reporter json > pa11y-report.json

# Analyze results
cat accessibility-report.json | jq '.violations | length'
```

### 5.2 Fix Critical Violations

Common fixes:

**1. Missing Alt Text:**
```liquid
{%- # Fix all images -%}
<img src="{{ product.image | image_url }}" alt="{{ product.title | escape }}">
```

**2. Low Color Contrast:**
```css
/* Ensure 4.5:1 contrast minimum */
.button {
  color: #FFFFFF; /* White */
  background: #0066CC; /* Blue with 4.6:1 contrast */
}
```

**3. Missing Form Labels:**
```html
<label for="email">Email Address</label>
<input type="email" id="email" name="email">
```

**4. Keyboard Navigation:**
```css
/* Visible focus indicators */
*:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}
```

## Phase 6: SEO Implementation (Week 5)

### 6.1 Implement Structured Data

**Implemented by:** SEO Implementation Agent

**Product Schema (JSON-LD):**
```liquid
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {{ product.title | json }},
  "image": {{ product.featured_image | image_url: width: 1200 | json }},
  "description": {{ product.description | strip_html | json }},
  "sku": {{ product.selected_or_first_available_variant.sku | json }},
  "brand": {
    "@type": "Brand",
    "name": {{ shop.name | json }}
  },
  "offers": {
    "@type": "Offer",
    "url": {{ request.url | json }},
    "priceCurrency": {{ cart.currency.iso_code | json }},
    "price": {{ product.selected_or_first_available_variant.price | divided_by: 100.0 | json }},
    "availability": "{% if product.available %}https://schema.org/InStock{% else %}https://schema.org/OutOfStock{% endif %}"
  }
}
</script>
```

**Validation:**
```bash
# Test with Google Rich Results Test
# https://search.google.com/test/rich-results

# Validate with Schema.org validator
# https://validator.schema.org/
```

### 6.2 Optimize Meta Tags

```liquid
{%- # Title tag -%}
<title>
  {%- if template == 'product' -%}
    {{ product.title }} | {{ shop.name }}
  {%- else -%}
    {{ page_title }} | {{ shop.name }}
  {%- endif -%}
</title>

{%- # Meta description -%}
{%- if page_description -%}
  <meta name="description" content="{{ page_description }}">
{%- endif -%}

{%- # Canonical URL -%}
<link rel="canonical" href="{{ canonical_url }}">

{%- # Open Graph -%}
<meta property="og:title" content="{{ page_title }}">
<meta property="og:url" content="{{ canonical_url }}">
<meta property="og:type" content="{% if template == 'product' %}product{% else %}website{% endif %}">
```

## Phase 7: Deployment Process (Week 6)

### 7.1 Staging Deployment

```bash
# Deploy to staging (theme preview)
cd /root/master-ops/teelixir
shopify theme push --unpublished --store=teelixir-au

# Run full validation
./scripts/validate-staging.sh
```

### 7.2 Production Deployment

**Checklist:**
- [ ] All validation gates pass (≥95/100)
- [ ] Staging fully validated
- [ ] Human approval obtained
- [ ] Rollback point created
- [ ] Team notified

```bash
# Create rollback point
git tag -a release-v1.1.0 -m "Pre-production release"
git push --tags

# Deploy to production
shopify theme push --live --store=teelixir-au

# Monitor for 5 minutes
./scripts/monitor-production.sh

# Run post-deployment validation
./scripts/validate-production.sh
```

## Phase 8: Monitoring & Maintenance (Ongoing)

### 8.1 Daily Monitoring

**Automated Tasks:**
- Daily Lighthouse audits (key pages)
- Performance alert checks
- Error log monitoring
- Core Web Vitals tracking

**Dashboard Checks:**
```sql
-- Check latest scores
SELECT * FROM latest_lighthouse_scores WHERE brand = 'teelixir';

-- Check active alerts
SELECT * FROM active_performance_alerts WHERE brand = 'teelixir';

-- Check recent deployments
SELECT * FROM recent_deployments WHERE brand = 'teelixir' LIMIT 5;
```

### 8.2 Weekly Reviews

**Metrics to Review:**
- 7-day performance trends
- Optimization opportunities
- Agent activity summary
- Deployment success rate

### 8.3 Monthly Reviews

**Comprehensive Analysis:**
- Full Lighthouse audit (all pages)
- Competitive benchmarking
- ROI of optimizations
- Strategic planning for next month

## Rollback Procedures

### Emergency Rollback

```bash
# If critical issue detected in production
./scripts/emergency-rollback.sh

# OR manually:
shopify theme list --store=teelixir-au
# Note the previous theme ID

shopify theme publish --theme-id=PREVIOUS_THEME_ID --store=teelixir-au

# Verify rollback
./scripts/validate-production.sh

# Document incident
# Log to deployment_history table with status='rolled_back'
```

## Success Criteria

### Phase Completion Checklist

**Phase 1-2 (Foundation):**
- [x] Supabase schema deployed
- [x] All tools installed
- [x] Shopify authentication working
- [x] Git repository configured
- [x] Agent configurations customized

**Phase 3 (Baseline):**
- [ ] Initial audits completed
- [ ] Baseline documented
- [ ] Priorities identified

**Phase 4 (Optimizations):**
- [ ] Image optimization complete
- [ ] Critical CSS implemented
- [ ] JavaScript optimized
- [ ] Performance ≥ 95/100

**Phase 5 (Accessibility):**
- [ ] Accessibility audits run
- [ ] Critical violations fixed
- [ ] Accessibility ≥ 95/100
- [ ] WCAG 2.1 AA compliant

**Phase 6 (SEO):**
- [ ] Structured data implemented
- [ ] Meta tags optimized
- [ ] SEO score ≥ 95/100

**Phase 7 (Deployment):**
- [ ] Staging validated
- [ ] Production deployed
- [ ] Post-deployment validated
- [ ] Monitoring active

**Phase 8 (Maintenance):**
- [ ] Daily monitoring configured
- [ ] Weekly review process established
- [ ] Monthly reporting active

### Target Metrics Achievement

**Primary Goals:**
- ✅ Performance: 100/100
- ✅ Accessibility: 100/100
- ✅ Best Practices: 100/100
- ✅ SEO: 100/100

**Secondary Goals:**
- ✅ LCP < 2.5s
- ✅ FID < 100ms
- ✅ CLS < 0.1
- ✅ Zero critical violations
- ✅ 100% change logging

## Troubleshooting

### Issue: Lighthouse scores inconsistent
**Solution:** Increase number of runs to 5, use median value

### Issue: Deployment blocked by validation gate
**Solution:** Review specific gate failure, coordinate with appropriate agent for fix

### Issue: Performance regression after deployment
**Solution:** Review recent changes, identify cause, rollback or fix forward

### Issue: Agent not logging to Supabase
**Solution:** Verify Supabase connection details, check API key permissions

## Next Steps

After successful implementation:

1. **Optimize Elevate store** using same process
2. **Implement automation** for daily audits
3. **Setup alerts** for regressions
4. **Establish reporting** cadence
5. **Train team** on agent usage
6. **Document learnings** for continuous improvement

## Support & Resources

- **Agent Documentation:** `/root/master-ops/agents/README.md`
- **Individual Agent READMEs:** In each agent directory
- **Database Schema:** `/root/master-ops/agents/database-schema.sql`
- **Supabase Dashboard:** Your Supabase project URL
- **Git Repository:** Your Git remote URL

---

**Implementation Guide Version 1.0.0** | **Last Updated: 2024-11-20**
