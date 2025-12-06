# Lighthouse Audit Agent

**Type:** Guardian Agent
**Version:** 1.0.0
**Mission:** Achieve and maintain 100/100 Lighthouse scores across all categories

## Overview

The Lighthouse Audit Agent is the quality gatekeeper for all Shopify theme changes for Teelixir and Elevate. This agent enforces strict performance, accessibility, best practices, and SEO standards by running comprehensive audits and blocking deployments that don't meet the 95/100 minimum threshold (with a target of 100/100).

## Capabilities

### Core Functions
- **Automated Auditing:** Runs Lighthouse CI audits on demand or as part of CI/CD pipeline
- **Quality Gates:** Blocks deployments below performance thresholds
- **Regression Detection:** Identifies performance degradations immediately
- **Comprehensive Logging:** All audit results stored in Supabase for trend analysis
- **Real-time Alerts:** Notifies team of critical performance issues

### Audit Scope
- **Desktop & Mobile:** Tests both configurations with appropriate throttling
- **Multiple Runs:** Executes 5 runs per audit, uses median for accuracy
- **Core Web Vitals:** Tracks LCP, FID, CLS, TTI, TBT, SI, FCP
- **4 Categories:** Performance, Accessibility, Best Practices, SEO

## Performance Targets

| Metric | Target | Minimum for Deployment |
|--------|--------|------------------------|
| Performance Score | 100/100 | 95/100 |
| Accessibility Score | 100/100 | 95/100 |
| Best Practices Score | 100/100 | 95/100 |
| SEO Score | 100/100 | 95/100 |
| LCP | ≤ 2.5s | Required |
| FID | ≤ 100ms | Required |
| CLS | ≤ 0.1 | Required |
| TTI | ≤ 3.5s | Required |
| TBT | ≤ 200ms (desktop) | Required |

## Usage

### Running an Audit

```bash
# Via ops-cli (to be implemented)
npm run ops lighthouse:audit -- --brand=teelixir --env=staging --url=/

# Direct Lighthouse CI
npx lhci autorun --config=agents/lighthouse-audit/config/lighthouse-config.json
```

### Pre-Deployment Validation

```bash
# Validate before deployment
npm run ops lighthouse:validate -- --change-id=<uuid>
```

### Monthly Performance Review

```bash
# Generate monthly report
npm run ops lighthouse:report -- --month=2024-11
```

## Integration Points

### With Other Agents

**Theme Optimizer Agent:**
- Receives failing audit details
- Implements optimization recommendations
- Re-runs audits after changes

**Accessibility Agent:**
- Provides specific accessibility violations
- Validates accessibility fixes
- Ensures WCAG compliance

**Deployment Agent:**
- Blocks/approves deployments based on scores
- Triggers post-deployment validation
- Manages rollbacks for failures

### With Supabase

**Tables Used:**
- `lighthouse_audits` - All audit results
- `performance_trends` - Historical tracking
- `performance_alerts` - Critical issue notifications
- `theme_changes` - Links audits to code changes

### With Git

- References commit hashes in audit logs
- Enables before/after comparisons
- Supports rollback decisions

## Configuration

### Lighthouse CI Config
Location: `config/lighthouse-config.json`

**Desktop Settings:**
- Throttling: 40ms RTT, 10Mbps throughput
- Screen: 1350x940, device scale 1
- CPU: No slowdown

**Mobile Settings:**
- Throttling: 150ms RTT, 1.6Mbps throughput, 4x CPU slowdown
- Screen: 375x667, device scale 2
- Emulates Moto G Power

### Agent Config
Location: `config/agent-config.json`

Defines:
- Performance targets
- Core Web Vitals thresholds
- Logging destinations
- Alert rules
- Validation gates

## Workflows

### 1. Baseline Audit Workflow
Initial audit to establish current performance state:
1. Audit all critical pages (7+ pages)
2. Both desktop and mobile
3. Document all issues
4. Prioritize optimization opportunities
5. Create roadmap

### 2. Pre-Deployment Workflow
Validates changes before going live:
1. Run audit on changed pages
2. Compare with previous audit
3. Check all thresholds
4. Approve or block deployment
5. Log decision with reasoning

### 3. Continuous Monitoring Workflow
Ongoing performance tracking:
1. Daily audits of key pages
2. Trend analysis
3. Early warning for degradations
4. Proactive optimization suggestions

### 4. Incident Response Workflow
Handles critical performance issues:
1. Immediate re-audit for confirmation
2. Root cause analysis
3. Determine rollback necessity
4. Coordinate remediation
5. Validate fix
6. Post-mortem documentation

## Best Practices Enforced

### Images
- ✅ WebP format with fallbacks
- ✅ Properly sized (no oversizing)
- ✅ Lazy loading
- ✅ Responsive images (srcset)
- ✅ CDN delivery

### CSS
- ✅ Critical CSS inlined
- ✅ Non-critical deferred
- ✅ Unused CSS removed
- ✅ Minified & compressed

### JavaScript
- ✅ Non-critical deferred
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minified & compressed
- ✅ No render-blocking

### Fonts
- ✅ font-display: swap
- ✅ Preloaded when critical
- ✅ Subsetted
- ✅ Variable fonts preferred

### Third-Party Scripts
- ✅ Asynchronous loading
- ✅ Facade pattern for heavy widgets
- ✅ Performance budget enforced
- ✅ Lazy loaded when possible

### Accessibility
- ✅ Semantic HTML5
- ✅ Proper ARIA
- ✅ Color contrast 4.5:1+
- ✅ Alt text on images
- ✅ Keyboard navigation
- ✅ Screen reader optimized

### SEO
- ✅ Valid structured data
- ✅ Unique meta tags
- ✅ Proper heading hierarchy
- ✅ Canonical tags
- ✅ Clean URLs
- ✅ Crawlable content

## Reporting

### Audit Report Format

```markdown
## Lighthouse Audit Report
Date: 2024-11-20 08:30:00
Brand: Teelixir
Environment: staging
Page: /products/chaga-mushroom

### Scores
- Performance: 98/100 ⚠️
- Accessibility: 100/100 ✅
- Best Practices: 100/100 ✅
- SEO: 100/100 ✅

### Core Web Vitals
- LCP: 2.3s (target: ≤2.5s) ✅
- FID: 85ms (target: ≤100ms) ✅
- CLS: 0.08 (target: ≤0.1) ✅
- TTI: 3.2s (target: ≤3.5s) ✅
- TBT: 180ms (target: ≤200ms) ✅

### Deployment Status
✅ APPROVED (scores ≥ 95/100)

### Optimization Opportunities
1. Reduce unused JavaScript (-15KB potential saving)
2. Eliminate render-blocking resources (1 CSS file)
3. Serve images in next-gen formats (2 PNG files remaining)
```

## Monitoring & Alerts

### Alert Rules

**Critical Alerts** (immediate notification):
- Any score < 90/100
- Core Web Vital failure
- Production incident

**Warning Alerts**:
- Score drops 5+ points
- Score < 95/100
- Approaching performance budget

**Info Alerts**:
- New optimization opportunity
- Competitive benchmark insights

### Dashboards

1. **Performance Overview**
   - Current scores (all pages)
   - 30-day trends
   - Core Web Vitals status

2. **Audit History**
   - All historical audits
   - Score progression
   - Change impact visualization

3. **Competitive Benchmark**
   - Compare vs competitors
   - Industry averages
   - Opportunity gaps

## Maintenance

### Regular Tasks
- **Daily:** Key page audits
- **Weekly:** Full site audit
- **Monthly:** Comprehensive review & report
- **Quarterly:** Competitive benchmarking

### Configuration Updates
- Update Lighthouse CI as new versions release
- Adjust thresholds as performance improves
- Refine alert rules based on learnings
- Update competitive benchmark list

## Troubleshooting

### Common Issues

**Issue:** Lighthouse CI fails to run
- Check Chrome installation
- Verify URL accessibility
- Review network connectivity

**Issue:** Inconsistent scores
- Increase number of runs
- Check for dynamic content
- Verify throttling settings

**Issue:** False positives
- Review audit details carefully
- Compare multiple runs
- Consider page-specific factors

## Future Enhancements

- [ ] WebPageTest integration for real-world testing
- [ ] Real User Monitoring (RUM) data integration
- [ ] Automatic optimization suggestions via AI
- [ ] Performance budget automation
- [ ] Visual regression testing integration
- [ ] Field data vs lab data comparison
- [ ] Page-specific performance profiles

## Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
- [Shopify Theme Performance](https://shopify.dev/docs/themes/best-practices/performance)

## Support

For issues or questions about the Lighthouse Audit Agent:
1. Check logs in Supabase `lighthouse_audits` table
2. Review recent changes in Git
3. Consult workflow prompts in `prompts/` directory
4. Escalate to human team if critical
