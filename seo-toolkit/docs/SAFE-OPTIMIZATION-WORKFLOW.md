# Safe Optimization Workflow for Teelixir Store

## Overview
This guide ensures you can safely optimize your Shopify store without risking the live production site.

---

## Phase 1: Setup Version Control & Backup (CRITICAL - Do First!)

### Step 1: Download Current Live Theme
```bash
# Authenticate with Shopify
shopify auth login

# Download the current live theme
cd /root/master-ops/teelixir
shopify theme pull --store=teelixir-au.myshopify.com

# This creates a complete backup of your live theme
```

### Step 2: Initialize Git Repository
```bash
cd /root/master-ops/teelixir

# Initialize git
git init

# Create .gitignore
cat > .gitignore <<EOF
# Shopify
config/settings_data.json
.shopify

# Node
node_modules/
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
EOF

# Make initial commit (BACKUP)
git add .
git commit -m "Initial commit - Live theme backup before optimization

Baseline Lighthouse Scores:
- Desktop Performance: 70/100
- Mobile Performance: 32/100
- Accessibility: 89/100
- Best Practices: 56/100
- SEO: 86/100

This is the safe fallback point."

# Tag this as production baseline
git tag -a v1.0-baseline -m "Production baseline before optimization"
```

### Step 3: Create Development Branch
```bash
# Create optimization branch
git checkout -b optimize/mobile-performance

# Now you can safely make changes without affecting the backup
```

---

## Phase 2: Safe Testing Strategy

### Option A: Shopify Development Theme (Recommended)

1. **Create a duplicate theme in Shopify:**
   ```bash
   # Push current code as a NEW unpublished theme
   shopify theme push --unpublished --store=teelixir-au.myshopify.com
   ```

2. **This creates a development copy that you can:**
   - Preview safely (gets a unique preview URL)
   - Test changes without affecting live site
   - Share with team for review
   - Discard if something goes wrong

3. **Preview your changes:**
   ```bash
   # Get preview URL
   shopify theme share --store=teelixir-au.myshopify.com
   ```

### Option B: Local Development with Theme Kit

1. **Setup local development server:**
   ```bash
   shopify theme dev --store=teelixir-au.myshopify.com
   ```

2. **This gives you:**
   - Live preview at http://127.0.0.1:9292
   - Hot reload when you save files
   - Zero risk to production

---

## Phase 3: Make Changes Safely

### Priority 1: Image Optimization (Lowest Risk, Highest Impact)

**What to change:** Image files only
**Risk Level:** 🟢 Very Low
**Impact:** +20-30 points mobile performance

```bash
# Install image optimization tools
npm install -g @squoosh/cli

# Optimize all images
find assets/images -type f \( -name "*.jpg" -o -name "*.png" \) \
  -exec squoosh-cli --webp auto --resize '{"width":1920}' {} \;

# Test in development theme first
shopify theme push --unpublished
```

**Commit your work:**
```bash
git add assets/
git commit -m "Optimize images: Convert to WebP, resize to max 1920px

Expected impact: +20-30 points mobile performance
Risk: Low - only changing asset files"
```

### Priority 2: Lazy Loading Images (Low Risk)

**What to change:** Template files to add lazy loading
**Risk Level:** 🟡 Low
**Impact:** +10-15 points performance

Edit `snippets/image.liquid` or similar:
```liquid
{%- assign loading = loading | default: 'lazy' -%}
<img
  src="{{ image | image_url: width: width }}"
  loading="{{ loading }}"
  decoding="async"
  ...
>
```

**Test thoroughly in dev theme before deploying!**

### Priority 3: Defer Non-Critical JavaScript (Medium Risk)

**What to change:** `theme.liquid` script tags
**Risk Level:** 🟠 Medium
**Impact:** +15-20 points performance

```liquid
{%- comment -%} Defer non-critical scripts {%- endcomment -%}
<script src="{{ 'theme.js' | asset_url }}" defer></script>
<script src="{{ 'product.js' | asset_url }}" defer></script>
```

**Test ALL functionality after this change!**

### Priority 4: Critical CSS (Higher Risk)

**What to change:** CSS loading strategy
**Risk Level:** 🔴 Medium-High
**Impact:** +10-15 points performance

**Recommended:** Use a tool to extract critical CSS automatically rather than manual changes.

---

## Phase 4: Testing Checklist

### Before Every Deployment:

```bash
# 1. Run Lighthouse on dev theme
npm run lighthouse:audit -- \
  --url=https://YOUR-DEV-THEME-URL.myshopify.com/ \
  --brand=teelixir \
  --env=staging

# 2. Manual testing checklist:
```

- [ ] Homepage loads correctly
- [ ] Product pages display properly
- [ ] Add to cart works
- [ ] Checkout flow works (CRITICAL!)
- [ ] Mobile menu functions
- [ ] Images display correctly
- [ ] Search works
- [ ] Collection filtering works

### Automated Testing:
```bash
# Run all critical page audits
npm run lighthouse:multi -- --brand=teelixir
```

---

## Phase 5: Deployment Strategy

### Gradual Rollout (Safest)

1. **Deploy to unpublished theme first:**
   ```bash
   git checkout optimize/mobile-performance
   shopify theme push --unpublished --store=teelixir-au.myshopify.com
   ```

2. **Share preview link with team:**
   ```bash
   shopify theme share
   ```

3. **Run final audit:**
   ```bash
   npm run baseline -- teelixir
   ```

4. **If scores improved, publish to live:**
   ```bash
   # In Shopify Admin:
   # Online Store → Themes → [Your Dev Theme] → Publish
   ```

5. **Immediate post-deployment check:**
   ```bash
   # Run audit on live site within 5 minutes
   npm run lighthouse:audit -- \
     --url=https://teelixir-au.myshopify.com/ \
     --brand=teelixir \
     --env=production
   ```

6. **Monitor for 1 hour:**
   - Check error logs
   - Monitor conversion rate
   - Watch Core Web Vitals in real-time

### Emergency Rollback Plan

**If anything goes wrong:**

```bash
# Option 1: Revert in Shopify Admin
# Online Store → Themes → [Previous Theme] → Publish

# Option 2: Use git to restore
git checkout v1.0-baseline
shopify theme push --store=teelixir-au.myshopify.com

# This restores exact backup from before optimization
```

---

## Phase 6: GitHub Integration (Optional but Recommended)

### Setup GitHub Repository

```bash
# Create new repo on GitHub, then:
cd /root/master-ops/teelixir

git remote add origin https://github.com/YOUR-ORG/teelixir-theme.git
git push -u origin main

# Push all branches
git push --all origin
git push --tags
```

### Enable GitHub Actions for CI/CD

Create `.github/workflows/lighthouse-ci.yml`:
```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        run: |
          npm install -g lighthouse
          lighthouse https://YOUR-DEV-THEME.myshopify.com \
            --output=json --quiet
```

---

## Recommended Order of Operations

### Week 1: Setup & Image Optimization
1. ✅ Download theme backup
2. ✅ Initialize git
3. ✅ Create development theme
4. 🎯 Optimize images (WebP, responsive)
5. 🎯 Add lazy loading
6. Test & measure impact

**Expected Improvement:** Mobile 32 → 50-60/100

### Week 2: JavaScript Optimization
1. 🎯 Defer non-critical JavaScript
2. 🎯 Remove unused JavaScript
3. 🎯 Code splitting
4. Test checkout thoroughly

**Expected Improvement:** Mobile 50-60 → 70-75/100

### Week 3: CSS & Rendering
1. 🎯 Extract critical CSS
2. 🎯 Defer non-critical CSS
3. 🎯 Reduce layout shifts
4. Test all pages

**Expected Improvement:** Mobile 70-75 → 85-90/100

### Week 4: Best Practices & Security
1. 🎯 Add security headers
2. 🎯 Fix deprecated APIs
3. 🎯 HTTPS/HTTP2 configuration
4. Test security

**Expected Improvement:** Best Practices 56 → 90+/100

### Week 5: Accessibility
1. 🎯 ARIA labels
2. 🎯 Color contrast fixes
3. 🎯 Alt text audit
4. 🎯 Keyboard navigation

**Expected Improvement:** Accessibility 89 → 95+/100

### Week 6: Final Polish & SEO
1. 🎯 Structured data
2. 🎯 Meta tags
3. 🎯 Final optimizations
4. Full re-audit

**Expected Final Scores:** All categories 95+/100

---

## Risk Mitigation Checklist

### Before Making ANY Change:
- [ ] Current theme backed up in git
- [ ] Testing in development theme only
- [ ] Have rollback plan ready
- [ ] Know how to unpublish if needed

### Before Publishing to Live:
- [ ] Lighthouse scores improved
- [ ] Manual testing completed
- [ ] Team reviewed changes
- [ ] Backup of current live theme
- [ ] Rollback plan ready
- [ ] Monitoring setup for post-deployment

### After Publishing:
- [ ] Run immediate Lighthouse audit
- [ ] Monitor for 1 hour minimum
- [ ] Check conversion metrics
- [ ] Verify no JavaScript errors in console
- [ ] Test checkout on real device

---

## Emergency Contacts & Resources

**Shopify Support:** If theme breaks
**Git Backup:** All commits tagged for easy rollback
**Supabase Logs:** All audits logged with before/after scores

**Rollback Command:**
```bash
# Instant rollback to baseline
git checkout v1.0-baseline
shopify theme push --store=teelixir-au.myshopify.com
```

---

## Success Metrics

Track these in Supabase after each optimization:

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Mobile Performance | 32 | 95 | - |
| Desktop Performance | 70 | 95 | - |
| Best Practices | 56 | 95 | - |
| Accessibility | 89 | 95 | - |
| SEO | 86 | 95 | - |
| Mobile LCP | 9.99s | <2.5s | - |
| Conversion Rate | - | Maintain or improve | - |

**Critical Rule:** Never sacrifice conversion rate for performance scores!

---

**This workflow ensures you can optimize safely while maintaining the ability to rollback instantly if anything goes wrong.**
