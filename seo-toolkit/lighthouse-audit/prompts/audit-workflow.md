# Lighthouse Audit Agent - Workflow Prompts

## Prompt: Initial Baseline Audit

```
You are conducting an initial baseline audit for [Teelixir/Elevate] Shopify store.

**Task:**
1. Run comprehensive Lighthouse audits on these critical pages:
   - Homepage (/)
   - Product listing page (/collections/all)
   - Individual product page (best-seller)
   - Cart page (/cart)
   - Checkout (if accessible)
   - About page
   - Contact page

2. For each page, audit:
   - Desktop configuration
   - Mobile configuration
   - 5 runs per configuration (use median)

3. Document current state:
   - All scores (4 categories)
   - All Core Web Vitals
   - List ALL failing audits
   - Performance budget current values
   - Third-party script inventory

4. Prioritize optimization opportunities:
   - Critical (prevents 100/100)
   - High (significant impact)
   - Medium (moderate impact)
   - Low (polish/nice-to-have)

5. Create baseline report with:
   - Executive summary
   - Page-by-page breakdown
   - Critical issues requiring immediate attention
   - Optimization roadmap
   - Estimated impact of each optimization

6. Log all results to Supabase

**Output:** Comprehensive baseline audit report with prioritized action plan
```

## Prompt: Pre-Deployment Validation

```
You are validating changes before deployment to [staging/production] for [Teelixir/Elevate].

**Change Details:**
- Change ID: [uuid]
- Git commit: [hash]
- Modified files: [list]
- Description: [change description]
- Agent: [which agent made changes]

**Validation Steps:**
1. Run Lighthouse audit on affected pages
2. Compare with previous audit (Change ID: [previous-uuid])
3. Verify all 4 categories ≥ 95/100
4. Verify all Core Web Vitals meet targets
5. Check for new failing audits
6. Assess performance impact (positive/negative/neutral)

**Decision Criteria:**
- ✅ APPROVE if:
  - All scores ≥ 95/100
  - All Core Web Vitals pass
  - No new critical issues
  - Performance impact neutral or positive

- ⛔ BLOCK if:
  - ANY score < 95/100
  - ANY Core Web Vital fails
  - New critical issues introduced
  - Performance regression > 5 points

**Required Actions:**
1. Log audit results to Supabase
2. Create performance_alerts entry if blocking
3. Provide specific feedback to implementing agent
4. Update deployment gate status

**Output:**
- Validation decision (APPROVED/BLOCKED)
- Detailed comparison report
- Specific issues to address (if blocked)
- Recommendations for optimization
```

## Prompt: Performance Regression Investigation

```
A performance regression has been detected for [Teelixir/Elevate].

**Alert Details:**
- Previous score: [score]/100 ([category])
- Current score: [score]/100 ([category])
- Delta: -[X] points
- Page: [URL]
- Detected: [timestamp]

**Investigation Steps:**
1. Run new audit to confirm regression
2. Identify which specific metrics degraded
3. Review recent changes (last 7 days):
   - Theme modifications
   - New third-party scripts
   - Content changes
   - App installations

4. Pinpoint root cause:
   - New render-blocking resources?
   - Image optimization issues?
   - JavaScript bundle size increase?
   - CSS bloat?
   - Third-party script issues?
   - Layout shift problems?

5. Quantify impact:
   - Which Core Web Vitals affected?
   - User experience impact level
   - SEO implications

6. Provide remediation plan:
   - Immediate fixes (quick wins)
   - Short-term optimizations
   - Long-term improvements
   - Responsible agent for each fix

**Output:**
- Root cause analysis
- Impact assessment
- Prioritized remediation plan
- Alert log entry in Supabase
```

## Prompt: Monthly Performance Review

```
Conduct monthly performance review for [Teelixir/Elevate] - [Month Year].

**Analysis Scope:**
1. **Score Trends:**
   - All 4 Lighthouse categories over 30 days
   - Identify patterns (improvements/degradations)
   - Compare month-over-month

2. **Core Web Vitals Trends:**
   - LCP, FID, CLS, TTI, TBT trends
   - Mobile vs Desktop comparison
   - Page-by-page comparison

3. **Optimization Impact:**
   - Review all changes made this month
   - Measure impact of each optimization
   - ROI analysis (effort vs improvement)

4. **Competitive Benchmarking:**
   - Compare against top competitors
   - Industry averages
   - Identify gaps and opportunities

5. **Failure Analysis:**
   - How many deployments blocked?
   - Common issues preventing 100/100
   - Agent performance review

6. **Recommendations:**
   - Focus areas for next month
   - New optimization opportunities
   - Tools/process improvements
   - Agent training needs

**Output:**
- Executive summary (1 page)
- Detailed monthly report
- Trend visualizations
- Prioritized recommendations for next month
```

## Prompt: Competitive Benchmark Audit

```
Benchmark [Teelixir/Elevate] against competitors.

**Competitors to Audit:**
1. [Competitor 1 URL]
2. [Competitor 2 URL]
3. [Competitor 3 URL]
4. [Competitor 4 URL]

**Benchmark Criteria:**
For each competitor, audit:
- Homepage
- Product listing page
- Individual product page

Collect:
- All 4 Lighthouse scores
- Core Web Vitals
- Notable performance optimizations they use
- Third-party tools they employ
- Shopify theme (if identifiable)

**Comparative Analysis:**
1. Score comparison matrix
2. Identify areas where we lead
3. Identify areas where we lag
4. Best practices to adopt
5. Performance techniques to implement

**Strategic Recommendations:**
- Quick wins to match competitors
- Innovations to exceed competitors
- Differentiating performance features
- Technical advantages to maintain

**Output:**
- Competitive benchmark report
- Strategic recommendations
- Implementation priority list
```

## Prompt: Critical Issue Response

```
CRITICAL: Production performance issue detected!

**Alert:**
- Severity: CRITICAL
- Category: [Performance/Accessibility/SEO]
- Score: [X]/100 (below threshold)
- Page: [URL]
- Brand: [Teelixir/Elevate]
- Impact: [user-facing description]

**Immediate Actions Required:**
1. Confirm issue (re-run audit immediately)
2. Assess user impact severity
3. Identify root cause within 15 minutes
4. Determine if rollback needed
5. Alert human team if score < 90

**Emergency Protocol:**
- If score < 85: Recommend immediate rollback
- If critical Core Web Vital fails: Block all deployments
- If accessibility critical: Flag for legal/compliance review
- Document all findings in performance_alerts table

**Root Cause Analysis (Fast):**
- Recent deployments (last 24 hours)
- Third-party service outages
- CDN issues
- Server response time problems
- Asset delivery failures

**Resolution Path:**
1. Immediate mitigation steps
2. Notify Deployment Agent
3. Coordinate with Theme Optimizer Agent
4. Test fix in staging
5. Validate resolution
6. Document incident

**Output:**
- Incident report
- Root cause
- Resolution steps
- Post-mortem analysis
```

## Prompt: Third-Party Script Audit

```
Audit and optimize third-party scripts for [Teelixir/Elevate].

**Discovery:**
1. Identify ALL third-party scripts:
   - Marketing (Google Analytics, Meta Pixel, etc.)
   - Customer service (Intercom, Zendesk, etc.)
   - Apps (Klaviyo, Yotpo, Loox, etc.)
   - Social media widgets
   - Payment processors
   - Any other external resources

2. For each script, document:
   - URL and source
   - Purpose/functionality
   - Load timing (blocking/async/defer)
   - Size (KB)
   - Performance impact (TBT contribution)
   - Necessity (critical/nice-to-have/unnecessary)

**Performance Analysis:**
- Total Blocking Time contribution per script
- Main thread blocking time
- Network requests generated
- Impact on LCP, FID, CLS
- Alternatives available (lighter weight)

**Optimization Recommendations:**
1. Scripts to remove (unnecessary)
2. Scripts to defer (non-critical)
3. Scripts to lazy load (below fold)
4. Scripts to replace (lighter alternatives)
5. Scripts that need facade pattern
6. Performance budget per script category

**Implementation Plan:**
- Coordinate with Theme Optimizer Agent
- A/B test impact of removals
- Monitor conversion rate impact
- Document approved third-party list

**Output:**
- Third-party script inventory
- Performance impact analysis
- Optimization recommendations with priorities
- Approved scripts list
```

## Prompt: Accessibility Deep Dive

```
Conduct comprehensive accessibility audit for [Teelixir/Elevate] to achieve 100/100.

**Audit Scope:**
All pages, focusing on:
1. Keyboard navigation
2. Screen reader compatibility
3. Color contrast
4. Form accessibility
5. ARIA usage
6. Focus management
7. Alternative text
8. Semantic HTML

**Testing Tools:**
- Lighthouse accessibility audits
- axe-core automated testing
- Manual keyboard navigation
- Screen reader testing (NVDA/JAWS simulation)
- Color contrast analyzer

**Standards Compliance:**
- WCAG 2.1 Level AA (minimum)
- WCAG 2.1 Level AAA (target where possible)
- ADA compliance
- AODA compliance (Canada relevant)

**Issue Categories:**
1. Critical (prevents 100/100, legal risk)
2. High (significant barriers)
3. Medium (usability improvements)
4. Low (best practice enhancements)

**For Each Issue:**
- Specific location (page, element, line number)
- WCAG criterion violated
- User impact description
- Remediation code example
- Testing verification steps

**Coordinate with:**
- Accessibility Agent for implementation
- Theme Optimizer Agent for code changes
- SEO Implementation Agent for semantic HTML

**Output:**
- Accessibility audit report
- Issue-by-issue remediation guide
- Code examples and solutions
- Validation checklist
```
