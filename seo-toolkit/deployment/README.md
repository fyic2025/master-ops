# Deployment & Validation Agent

**Type:** Orchestrator Agent
**Version:** 1.0.0
**Mission:** Execute zero-defect deployments with comprehensive validation

## Overview

The Deployment & Validation Agent is the orchestrator that manages the entire deployment lifecycle from staging to production. This agent enforces strict validation gates, coordinates between all other agents, manages rollbacks, and ensures that only high-quality, validated code reaches production.

## Core Principle

**No deployment reaches production without passing ALL validation gates.** This agent is the final gatekeeper, ensuring 100/100 Lighthouse scores and zero critical issues.

## Validation Gates

### Gate 1: Code Quality ✅
**Blocking:** Yes
**Checks:**
- Liquid syntax valid
- JavaScript passes ESLint
- CSS validation passes
- No console.log in production code
- Git working directory clean

**Failure Action:** Block deployment, report issues to Theme Optimizer Agent

### Gate 2: Lighthouse Audit ✅
**Blocking:** Yes
**Executor:** Lighthouse Audit Agent
**Checks:**
- Performance ≥ 95/100 (target: 100/100)
- Accessibility ≥ 95/100 (target: 100/100)
- Best Practices ≥ 95/100 (target: 100/100)
- SEO ≥ 95/100 (target: 100/100)
- All Core Web Vitals pass (LCP, FID, CLS, TTI, TBT)
- No critical issues

**Failure Action:** Block deployment, coordinate with Theme Optimizer Agent for fixes

### Gate 3: Accessibility ✅
**Blocking:** Yes
**Executor:** Accessibility Agent
**Checks:**
- Zero critical WCAG violations
- WCAG 2.1 Level AA compliance
- Keyboard navigation functional
- Screen reader compatible
- Color contrast meets standards

**Failure Action:** Block deployment, coordinate with Accessibility Agent for remediation

### Gate 4: SEO Validation ✅
**Blocking:** Yes
**Executor:** SEO Implementation Agent
**Checks:**
- Structured data valid (no errors)
- Meta tags present and unique
- Canonical URLs correct
- No broken internal links
- Robots.txt configured correctly

**Failure Action:** Block deployment, coordinate with SEO Implementation Agent

### Gate 5: Functionality ✅
**Blocking:** Yes
**Checks:**
- Add to cart works
- Checkout accessible
- Forms submit correctly
- Navigation functional
- Search works
- No JavaScript errors

**Failure Action:** Block deployment, report to Theme Optimizer Agent

### Gate 6: Visual Regression ⚠️
**Blocking:** No (warnings only)
**Checks:**
- No unintended visual changes
- Layout intact across breakpoints
- Images loading correctly
- Responsive design maintained

**Failure Action:** Warn, but allow deployment with approval

## Deployment Workflow

### Phase 1: Pre-Deployment Validation (5-10 min)

```
1. Receive deployment request
2. Identify changes to deploy (Git diff)
3. Run validation gates in sequence:
   ├─ Gate 1: Code Quality
   ├─ Gate 2: Lighthouse Audit
   ├─ Gate 3: Accessibility
   ├─ Gate 4: SEO
   ├─ Gate 5: Functionality
   └─ Gate 6: Visual Regression
4. Collect all validation results
5. Determine GO/NO-GO decision
6. Generate pre-deployment report
```

**GO Criteria:** All blocking gates pass (≥95 threshold)
**NO-GO Criteria:** Any blocking gate fails

### Phase 2: Staging Deployment (2-5 min)

```
1. Deploy to staging environment (Shopify theme preview)
2. Run post-deployment smoke tests:
   ├─ Homepage loads
   ├─ Product page loads
   ├─ Cart functional
   └─ Checkout accessible
3. Run Lighthouse audit on staging
4. Validate staging results match pre-deployment
5. Generate staging validation report
```

### Phase 3: Production Approval (Human Decision)

```
1. Present deployment summary to human approver:
   ├─ Changes included (Git log)
   ├─ Validation gate results
   ├─ Lighthouse scores (before → after)
   ├─ Risk assessment
   └─ Estimated deployment time
2. Wait for approval/rejection
3. If rejected: Document reason, coordinate fixes
4. If approved: Proceed to production deployment
```

### Phase 4: Production Deployment (5-10 min)

```
1. Create rollback point (Git tag + theme backup)
2. Deploy to production (Shopify theme publish)
3. Run immediate post-deployment validation:
   ├─ Homepage accessible
   ├─ Key pages load correctly
   ├─ No JavaScript errors
   └─ Core functionality works
4. Run Lighthouse audit on production
5. Monitor for 5 minutes for issues
6. Generate deployment report
```

### Phase 5: Post-Deployment Monitoring (5 min)

```
1. Lighthouse audit on live site
2. Core Web Vitals real-time check
3. Error monitoring (JavaScript console)
4. Network requests (no 404s)
5. User-facing functionality verification
6. If issues detected → Consider rollback
7. If all clear → Mark deployment successful
```

## Deployment Commands

### Via Shopify CLI

```bash
# Preview theme (staging)
shopify theme push --unpublished --store=teelixir-au

# Deploy to production
shopify theme push --live --store=teelixir-au

# List themes
shopify theme list --store=teelixir-au

# Pull current production theme (for backup)
shopify theme pull --live --store=teelixir-au
```

### Via Ops CLI (to be implemented)

```bash
# Request deployment (runs all validations)
npm run ops deploy -- --brand=teelixir --env=staging

# Deploy to production (requires approval)
npm run ops deploy -- --brand=teelixir --env=production

# Rollback to previous version
npm run ops rollback -- --brand=teelixir --deployment-id=<uuid>

# View deployment history
npm run ops deployments -- --brand=teelixir --limit=10
```

## Rollback Strategy

### Automatic Rollback Triggers
- Production Lighthouse score drops below 90/100
- Critical accessibility violation detected
- JavaScript errors affecting core functionality
- Core Web Vital failure
- Major functionality broken

### Manual Rollback Triggers
- Human approval for rollback
- Unexpected user-facing issues
- Business-critical problem

### Rollback Process

```
1. Detect issue (automated or manual)
2. Assess severity:
   ├─ Critical: Immediate rollback
   ├─ High: Rollback within 5 minutes
   └─ Medium: Coordinate fix or rollback
3. Execute rollback:
   ├─ Revert to previous theme version (Git tag)
   ├─ Publish previous theme in Shopify
   └─ Verify rollback successful
4. Validate post-rollback:
   ├─ Run Lighthouse audit
   ├─ Verify functionality restored
   └─ Check Core Web Vitals
5. Document incident:
   ├─ What went wrong
   ├─ When detected
   ├─ Rollback details
   └─ Root cause analysis
6. Coordinate fix with appropriate agent
7. Re-deploy once issue resolved
```

**Target Rollback Time:** 5 minutes from decision to validated rollback

## Validation Report Format

### Pre-Deployment Report

```markdown
# Deployment Validation Report
**Date:** 2024-11-20 10:00:00
**Brand:** Teelixir
**Environment:** Production
**Git Commit:** abc123def456

## Changes Included
- Product hero section optimization (Change ID: uuid-1)
- Accessibility fixes for forms (Change ID: uuid-2)
- Schema markup for collections (Change ID: uuid-3)

## Validation Gates

### ✅ Gate 1: Code Quality
- Liquid syntax: PASS
- JavaScript linting: PASS
- CSS validation: PASS
- No console.log: PASS
- Git clean: PASS

### ✅ Gate 2: Lighthouse Audit
- Performance: 98/100 ✅ (was 87)
- Accessibility: 100/100 ✅ (was 100)
- Best Practices: 100/100 ✅ (was 96)
- SEO: 100/100 ✅ (was 100)
- LCP: 2.1s ✅ (was 3.2s)
- CLS: 0.05 ✅ (was 0.15)
- All gates: PASS

### ✅ Gate 3: Accessibility
- Critical violations: 0 ✅
- WCAG 2.1 AA: Compliant ✅
- Keyboard navigation: Functional ✅
- Screen reader: Compatible ✅

### ✅ Gate 4: SEO
- Structured data: Valid ✅
- Meta tags: Present & unique ✅
- Canonical URLs: Correct ✅
- Internal links: No broken links ✅

### ✅ Gate 5: Functionality
- Add to cart: Working ✅
- Checkout: Accessible ✅
- Forms: Submitting ✅
- Navigation: Functional ✅
- Search: Working ✅
- Console: No errors ✅

### ⚠️ Gate 6: Visual Regression
- Layout: Intact ✅
- Images: Loading correctly ✅
- Responsive: Maintained ✅
- Minor differences detected (expected)

## Deployment Decision: ✅ GO
**All blocking gates passed. Ready for production deployment.**

## Risk Assessment: LOW
- All scores improved or maintained
- No functionality regressions
- Extensive testing completed

## Estimated Deployment Time: 5-10 minutes
```

### Post-Deployment Report

```markdown
# Deployment Complete
**Deployment ID:** uuid-deploy-123
**Started:** 2024-11-20 10:15:00
**Completed:** 2024-11-20 10:22:00
**Duration:** 7 minutes
**Status:** ✅ SUCCESS

## Production Validation
- Homepage: ✅ Accessible (LCP: 2.0s)
- Product pages: ✅ Functional
- Cart: ✅ Working
- Checkout: ✅ Accessible
- JavaScript: ✅ No errors
- Core Web Vitals: ✅ All pass

## Lighthouse Audit (Production)
- Performance: 98/100 ✅
- Accessibility: 100/100 ✅
- Best Practices: 100/100 ✅
- SEO: 100/100 ✅

## Monitoring (5 minutes)
- No errors detected ✅
- No performance regressions ✅
- All functionality verified ✅

## Deployment successful. Monitoring continues.
```

## Deployment Log Schema

```json
{
  "deployment_id": "uuid-deploy-123",
  "timestamp": "2024-11-20T10:15:00Z",
  "brand": "teelixir",
  "environment": "production",
  "theme_version": "abc123def456",
  "changes_included": [
    "uuid-change-1",
    "uuid-change-2",
    "uuid-change-3"
  ],
  "validation_results": {
    "gate_1_code_quality": "pass",
    "gate_2_lighthouse": "pass",
    "gate_3_accessibility": "pass",
    "gate_4_seo": "pass",
    "gate_5_functionality": "pass",
    "gate_6_visual": "warning"
  },
  "lighthouse_scores": {
    "before": {
      "performance": 87,
      "accessibility": 100,
      "best_practices": 96,
      "seo": 100
    },
    "after": {
      "performance": 98,
      "accessibility": 100,
      "best_practices": 100,
      "seo": 100
    }
  },
  "approval": {
    "required": true,
    "approved_by": "john@teelixir.com",
    "approved_at": "2024-11-20T10:14:00Z"
  },
  "status": "success",
  "deployment_duration_seconds": 420,
  "post_deployment_validation": "pass",
  "issues_detected": [],
  "rollback_point": "git-tag-v1.2.3"
}
```

## Integration with Other Agents

### Lighthouse Audit Agent
**Requests:** Pre-deployment and post-deployment audits
**Receives:** Validation gate results (pass/fail)

### Theme Optimizer Agent
**Coordinates:** Code quality fixes before deployment
**Receives:** Deployment success notifications

### Accessibility Agent
**Requests:** Accessibility validation before deployment
**Receives:** Validation results

### SEO Implementation Agent
**Requests:** SEO validation before deployment
**Receives:** Validation results

## Best Practices

### Deployment Timing
- **Avoid:** High-traffic periods (sales, launches)
- **Prefer:** Low-traffic windows
- **Consider:** Time zones (AU/US)

### Deployment Size
- **Small, frequent deployments** preferred over large batches
- Easier to validate
- Faster rollback if needed
- Lower risk

### Communication
- Notify team before production deployments
- Provide deployment summary
- Share validation results
- Report any issues immediately

### Monitoring
- Watch for 5 minutes post-deployment minimum
- Check Core Web Vitals in real-time
- Monitor error logs
- Verify key user flows

## Success Metrics
- **Primary:** 100% validation gate pass rate before prod
- **Secondary:** Zero production rollbacks
- **Speed:** <10 minute deployment time
- **Quality:** No post-deployment critical issues
- **Reliability:** 99.9% deployment success rate

## Emergency Procedures

### If Deployment Fails
1. Identify failure point (which gate)
2. Abort deployment immediately
3. Do NOT proceed to production
4. Coordinate fix with appropriate agent
5. Re-run validation
6. Retry deployment when ready

### If Production Issue Detected
1. Assess severity immediately
2. If critical: Execute rollback (5 min target)
3. If high: Coordinate urgent fix or rollback
4. If medium: Monitor and plan fix
5. Document incident thoroughly
6. Conduct post-mortem

## Future Enhancements
- [ ] Automated smoke test suite
- [ ] Blue-green deployment strategy
- [ ] Canary deployments (gradual rollout)
- [ ] A/B testing framework
- [ ] Automated rollback on metric thresholds
- [ ] Deployment approval workflow automation
- [ ] Integration with monitoring dashboards

## Resources
- [Shopify CLI Documentation](https://shopify.dev/docs/themes/tools/cli)
- [Deployment Best Practices](https://shopify.dev/docs/themes/best-practices)
- [Git Workflow Guide](https://www.atlassian.com/git/tutorials/comparing-workflows)
