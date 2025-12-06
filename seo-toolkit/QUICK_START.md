# Quick Start Guide - AI Agent Team

**Time to first results:** 30 minutes
**Goal:** Run your first Lighthouse audit and understand the agent system

## Prerequisites Check

Before starting, ensure you have:
- [ ] Claude Code access
- [ ] Supabase account
- [ ] Shopify store admin access (Teelixir/Elevate)
- [ ] Node.js installed (v18+)
- [ ] Git installed

## 5-Step Quick Start

### Step 1: Install Tools (5 minutes)

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Install Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Verify installations
lhci --version
shopify version

# Expected output:
# @lhci/cli@0.x.x
# @shopify/cli@3.x.x
```

### Step 2: Setup Database (5 minutes)

```bash
# 1. Log into your Supabase project at https://supabase.com
# 2. Navigate to: SQL Editor
# 3. Click "New Query"
# 4. Copy content from: /root/master-ops/agents/database-schema.sql
# 5. Click "Run"

# Verify tables created:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%audit%';

# Expected: lighthouse_audits, accessibility_audits, etc.
```

### Step 3: Authenticate Shopify (5 minutes)

```bash
# Authenticate with Shopify
shopify auth login

# When prompted, log in with your Shopify credentials

# Test access to Teelixir store
shopify theme list --store=teelixir-au

# Expected output: List of themes with IDs
```

### Step 4: Run First Lighthouse Audit (10 minutes)

```bash
# Create a test script
cat > /root/master-ops/scripts/quick-audit.sh << 'EOF'
#!/bin/bash

echo "Running Lighthouse audit on Teelixir homepage..."

# Run audit (desktop)
lhci autorun \
  --url="https://teelixir-au.myshopify.com/" \
  --collect.numberOfRuns=1

echo "Audit complete! Check the report above."
EOF

# Make executable
chmod +x /root/master-ops/scripts/quick-audit.sh

# Run it
./scripts/quick-audit.sh
```

**Review the results:**
- Performance score (target: 100/100)
- Accessibility score (target: 100/100)
- Best Practices score (target: 100/100)
- SEO score (target: 100/100)
- Core Web Vitals (LCP, CLS, etc.)

### Step 5: Review Agent Documentation (5 minutes)

```bash
# Open the main agent README
cat /root/master-ops/agents/README.md | less

# Key sections to read:
# - Agent Team Structure
# - Agent Communication Flow
# - Workflow Example
# - Performance Targets
```

---

## Understanding Your Results

### Good Score (95-100)
✅ **Great!** You're already performing well. Agents will help maintain this excellence.

### Moderate Score (80-94)
⚠️ **Opportunity!** Clear optimization path. Agents will significantly improve performance.

### Low Score (<80)
🚨 **High Impact!** Agents will transform your performance. Expect dramatic improvements.

---

## What Each Score Means

### Performance Score
**What it measures:** Page load speed, Core Web Vitals
**Why it matters:** Directly impacts user experience and conversions
**Target:** 100/100 (minimum 95 for deployment)

**Common issues:**
- Oversized images → Use responsive images with lazy loading
- Render-blocking CSS → Extract critical CSS, defer rest
- Unused JavaScript → Code splitting, tree shaking
- Slow server response → CDN, caching optimization

### Accessibility Score
**What it measures:** WCAG compliance, keyboard nav, screen readers
**Why it matters:** Legal compliance, inclusive design, SEO boost
**Target:** 100/100 (WCAG 2.1 Level AA minimum)

**Common issues:**
- Missing alt text → Add to all images
- Low color contrast → Ensure 4.5:1 ratio
- Missing form labels → Associate label with input
- Poor keyboard navigation → Ensure tab order logical

### Best Practices Score
**What it measures:** Modern web standards, security, console errors
**Why it matters:** Security, reliability, maintainability
**Target:** 100/100

**Common issues:**
- Console errors → Fix JavaScript bugs
- HTTP instead of HTTPS → Shopify handles (should be fine)
- Deprecated APIs → Update to modern equivalents
- Missing CSP → Content Security Policy headers

### SEO Score
**What it measures:** Crawlability, meta tags, structured data
**Why it matters:** Search engine visibility, click-through rate
**Target:** 100/100

**Common issues:**
- Missing meta description → Add unique descriptions
- No structured data → Implement JSON-LD schema
- Poor title tags → Optimize for keywords + brand
- Not mobile-friendly → Ensure responsive design

---

## Next Steps Based on Your Score

### If you scored 95-100 in all categories:

**Congratulations!** You're already excellent. Focus on:
1. **Maintenance:** Daily monitoring to prevent regressions
2. **Fine-tuning:** Push from 98 to 100
3. **Competitive edge:** Benchmark against competitors
4. **Scaling:** Apply same excellence to other pages

**Start with:** Deployment Agent setup for continuous monitoring

### If you scored 80-94 in any category:

**Good foundation, clear improvements needed.** Focus on:
1. **Priority fixes:** Address issues blocking 95+
2. **Low-hanging fruit:** Quick wins first (images, fonts)
3. **Systematic optimization:** Theme Optimizer Agent
4. **Validation:** Accessibility and SEO checks

**Start with:** Theme Optimizer Agent for performance

### If you scored below 80 in any category:

**High impact opportunity!** Focus on:
1. **Critical issues:** Fix blockers first
2. **Foundation:** Images, CSS, JavaScript basics
3. **Compliance:** Accessibility violations
4. **Technical SEO:** Structured data, meta tags

**Start with:** Full baseline audit + prioritized roadmap

---

## Common First Questions

### "Which agent do I use first?"

**Answer:** Start with **Lighthouse Audit Agent** to establish baseline, then **Theme Optimizer Agent** for performance fixes.

**Workflow:**
```
Lighthouse Audit → Theme Optimizer → Lighthouse Re-Audit → Repeat
```

### "How long until I see 100/100?"

**Answer:** Depends on starting point:
- **95-99 starting:** 1-2 weeks
- **85-94 starting:** 3-4 weeks
- **Below 85:** 4-6 weeks

### "Do I need to hire developers?"

**Answer:** No! The AI agents ARE the developers. You need:
- Claude Code access (you have it)
- Shopify admin access (you have it)
- Time to review and approve deployments

### "What if I break something?"

**Answer:**
1. **Prevention:** Deployment Agent validates before production
2. **Safety:** Always test in staging first
3. **Recovery:** 5-minute rollback capability
4. **Logging:** Everything tracked in Supabase

### "How do I coordinate with my SEO team?"

**Answer:**
- **SEO team:** Provides strategy, keywords, content recommendations
- **SEO Implementation Agent:** Executes technical requirements
- **Handoff:** Via task tickets (documented in agent config)

---

## Your First Week Plan

### Day 1: Setup (Today)
- [x] Install tools ✅
- [x] Setup Supabase ✅
- [x] Run first Lighthouse audit ✅
- [ ] Review scores and identify priorities

### Day 2: Baseline Documentation
- [ ] Run Lighthouse on all key pages (homepage, product, collection, cart)
- [ ] Document current scores
- [ ] Create prioritized fix list
- [ ] Read Theme Optimizer Agent documentation

### Day 3: First Optimization (Images)
- [ ] Implement responsive images on homepage
- [ ] Add lazy loading to product page
- [ ] Specify width/height to prevent CLS
- [ ] Re-run Lighthouse audit
- [ ] Measure improvement

### Day 4: Critical CSS
- [ ] Extract critical CSS for above-fold content
- [ ] Inline critical CSS in theme.liquid
- [ ] Defer non-critical CSS
- [ ] Re-run Lighthouse audit

### Day 5: JavaScript Optimization
- [ ] Defer non-critical JavaScript
- [ ] Remove unused scripts
- [ ] Implement code splitting for reviews/features
- [ ] Re-run Lighthouse audit

### Day 6: Accessibility Check
- [ ] Run accessibility audit (axe-core)
- [ ] Fix critical violations
- [ ] Test keyboard navigation
- [ ] Re-run Lighthouse audit

### Day 7: Review & Document
- [ ] Compare Day 1 vs Day 7 scores
- [ ] Document improvements
- [ ] Plan Week 2 priorities
- [ ] Set up monitoring dashboards

**Expected Week 1 improvement:** +10-20 points across categories

---

## Essential Commands Cheatsheet

```bash
# Lighthouse audit
lhci autorun --url=https://teelixir-au.myshopify.com/

# Shopify theme list
shopify theme list --store=teelixir-au

# Download current theme
shopify theme pull --live --store=teelixir-au

# Deploy to staging (unpublished theme)
shopify theme push --unpublished --store=teelixir-au

# Deploy to production (BE CAREFUL!)
shopify theme push --live --store=teelixir-au

# Check accessibility
npx @axe-core/cli https://teelixir-au.myshopify.com/

# View Supabase data
# (Open Supabase dashboard → Table Editor)
```

---

## Getting Help

### Read Documentation
1. **Agent Team README:** `/root/master-ops/agents/README.md`
2. **Implementation Guide:** `/root/master-ops/agents/IMPLEMENTATION_GUIDE.md`
3. **Individual Agent READMEs:** In each agent directory

### Check Logs
```sql
-- In Supabase SQL Editor

-- Recent Lighthouse audits
SELECT * FROM lighthouse_audits ORDER BY timestamp DESC LIMIT 10;

-- Active alerts
SELECT * FROM active_performance_alerts;

-- Recent changes
SELECT * FROM theme_changes ORDER BY timestamp DESC LIMIT 10;
```

### Common Issues

**Issue:** "Command not found: lhci"
**Fix:** `npm install -g @lhci/cli`

**Issue:** "Authentication required for Shopify"
**Fix:** `shopify auth login`

**Issue:** "Can't connect to Supabase"
**Fix:** Check connection details in agent configs

---

## Success Checklist

After this quick start, you should have:

- [x] ✅ All tools installed and working
- [x] ✅ Supabase database schema deployed
- [x] ✅ Shopify authentication configured
- [x] ✅ First Lighthouse audit completed
- [x] ✅ Baseline scores documented
- [x] ✅ Agent documentation reviewed
- [ ] Priority optimization list created
- [ ] Week 1 plan established

---

## Ready for Full Implementation?

If quick start went well, proceed to:

**👉 [IMPLEMENTATION_GUIDE.md](/root/master-ops/agents/IMPLEMENTATION_GUIDE.md)**

This comprehensive guide covers:
- Detailed setup for all 5 agents
- Week-by-week optimization roadmap
- Monitoring and maintenance procedures
- Deployment workflows
- Troubleshooting guide

---

**Quick Start Complete!** 🎉

You've now:
✅ Run your first Lighthouse audit
✅ Understand the agent system
✅ Know your current performance baseline
✅ Ready to start optimizations

**Next milestone:** First optimization implemented and +10 point improvement! 🚀
