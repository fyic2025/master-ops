# AI Agent Team for Shopify Website Optimization

**Version:** 1.0.0
**Purpose:** Achieve and maintain 100/100 Lighthouse scores for Teelixir & Elevate Shopify stores
**Architecture:** Specialized AI agents coordinating via Claude Code

## Overview

This directory contains the complete configuration, prompts, and documentation for a team of 5 specialized AI agents that work together to optimize Shopify themes for maximum performance, accessibility, SEO, and best practices.

## Agent Team Structure

### 1. **Lighthouse Audit Agent** (Guardian)
**Location:** [/root/master-ops/agents/lighthouse-audit](lighthouse-audit/)
**Role:** Quality gatekeeper, enforces 100/100 Lighthouse standards
**Responsibilities:**
- Run comprehensive Lighthouse audits (desktop & mobile)
- Track Core Web Vitals (LCP, FID, CLS, TTI, TBT)
- Block deployments below 95/100 threshold
- Identify optimization opportunities
- Log all audits to Supabase

**Key Metrics:**
- Performance: 100/100 (min 95)
- Accessibility: 100/100 (min 95)
- Best Practices: 100/100 (min 95)
- SEO: 100/100 (min 95)

### 2. **Theme Optimizer Agent** (Developer)
**Location:** [/root/master-ops/agents/theme-optimizer](theme-optimizer/)
**Role:** Expert Shopify developer, implements code-level optimizations
**Responsibilities:**
- Optimize Liquid templates for performance
- Implement critical CSS, lazy loading, code splitting
- Optimize images, fonts, third-party scripts
- Refactor legacy code
- Log all changes to Supabase

**Expertise:**
- Shopify Liquid (expert)
- Performance optimization
- Modern web standards
- Dawn theme architecture

### 3. **Accessibility Agent** (Compliance)
**Location:** [/root/master-ops/agents/accessibility](accessibility/)
**Role:** Ensures WCAG 2.1 compliance and accessibility excellence
**Responsibilities:**
- Run automated accessibility testing (axe-core, pa11y)
- Validate WCAG 2.1 Level AA compliance (AAA target)
- Test keyboard navigation and screen reader compatibility
- Fix accessibility violations
- Log violations and fixes

**Standards:**
- WCAG 2.1 Level AA (required)
- WCAG 2.1 Level AAA (target)
- ADA & AODA compliance

### 4. **SEO Implementation Agent** (Executor)
**Location:** [/root/master-ops/agents/seo-implementer](seo-implementer/)
**Role:** Implements technical SEO requirements from SEO team
**Responsibilities:**
- Implement structured data (JSON-LD schema)
- Optimize meta tags (title, description, OG, Twitter)
- Ensure semantic HTML structure
- Manage internal linking
- Validate SEO implementation

**Note:** This agent RECEIVES tasks from a separate SEO team. The SEO team provides strategy; this agent provides implementation.

### 5. **Deployment & Validation Agent** (Orchestrator)
**Location:** [/root/master-ops/agents/deployment](deployment/)
**Role:** Orchestrates zero-defect deployments
**Responsibilities:**
- Enforce 6 validation gates before deployment
- Coordinate between all agents
- Manage staging and production deployments
- Execute rollbacks when necessary
- Log all deployments

**Validation Gates:**
1. Code Quality ✅
2. Lighthouse Audit ✅
3. Accessibility ✅
4. SEO Validation ✅
5. Functionality ✅
6. Visual Regression ⚠️

## Agent Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Request                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │  Deployment & Validation     │
       │  Agent (Orchestrator)        │
       └──────────────┬───────────────┘
                      │
          ┌───────────┼───────────┬────────────┐
          │           │           │            │
          ▼           ▼           ▼            ▼
    ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐
    │Lighthouse│ │  Theme   │ │Access- │ │   SEO    │
    │  Audit  │ │Optimizer │ │ibility │ │Implement │
    │  Agent  │ │  Agent   │ │ Agent  │ │  Agent   │
    └─────────┘ └──────────┘ └────────┘ └──────────┘
          │           │           │            │
          │           │           │            │
          └───────────┴───────────┴────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   Supabase   │
              │  (Logging)   │
              └──────────────┘
```

## Workflow Example: Theme Optimization

### Scenario: Optimize product page for 100/100 performance

**Step 1: Initial Audit**
```
User → "Optimize product page performance"
     ↓
Lighthouse Audit Agent:
- Runs audit on product page
- Current score: 87/100
- Issues found:
  * Oversized images (LCP impact)
  * Render-blocking CSS
  * Unused JavaScript
  * Missing font-display
- Logs audit to Supabase
- Reports to Theme Optimizer Agent
```

**Step 2: Implementation**
```
Theme Optimizer Agent:
- Analyzes failing audits
- Prioritizes fixes by impact
- Implements optimizations:
  ✓ Responsive images with srcset
  ✓ Lazy loading below fold
  ✓ Critical CSS extraction
  ✓ JavaScript code splitting
  ✓ Font-display: swap
- Tests locally
- Commits with detailed message
- Logs changes to Supabase
- Requests re-audit
```

**Step 3: Validation**
```
Lighthouse Audit Agent:
- Re-runs audit on optimized page
- New score: 98/100
- LCP improved: 3.2s → 2.1s
- CLS improved: 0.15 → 0.05
- Logs audit with before/after
- Approves for deployment
```

**Step 4: Deployment**
```
Deployment & Validation Agent:
- Runs all 6 validation gates
- All gates pass (≥95/100)
- Deploys to staging
- Validates staging
- Requests human approval for production
- Deploys to production
- Monitors for 5 minutes
- Logs deployment to Supabase
- Deployment successful ✅
```

## Database Schema

**Location:** [/root/master-ops/agents/database-schema.sql](database-schema.sql)

### Tables

1. **lighthouse_audits** - All Lighthouse audit results
2. **performance_trends** - Aggregated performance trends
3. **performance_alerts** - Critical performance issues
4. **theme_changes** - All theme modifications
5. **accessibility_audits** - Accessibility validation results
6. **seo_implementation_tasks** - SEO tasks and implementation
7. **deployment_history** - All deployments
8. **agent_activity_log** - General agent activities
9. **performance_budgets** - Performance budget tracking

### Views

- `latest_lighthouse_scores` - Most recent scores per brand/environment
- `active_performance_alerts` - Open alerts requiring attention
- `recent_deployments` - Last 50 deployments
- `agent_performance_summary` - Agent activity statistics

## Setup Instructions

### 1. Database Setup

```bash
# Connect to your Supabase project
# Run the schema file
psql -h <your-supabase-host> -U postgres -d postgres -f agents/database-schema.sql
```

### 2. Install Tools

```bash
# Lighthouse CI
npm install -g @lhci/cli

# Shopify CLI
npm install -g @shopify/cli @shopify/theme

# Accessibility testing
npm install -g axe-core pa11y

# Code quality tools
npm install -g eslint stylelint
```

### 3. Configure Agents

Each agent has a `config/agent-config.json` file. Update with your specific settings:
- Supabase connection details
- Shopify store URLs
- Performance thresholds
- Alert configurations

### 4. Setup Shopify CLI Authentication

```bash
# Authenticate with Shopify
shopify auth login

# Verify access to stores
shopify theme list --store=teelixir-au
shopify theme list --store=elevate-wholesale
```

## Usage

### Running Audits

```bash
# Run Lighthouse audit (via agent)
npm run ops lighthouse:audit -- --brand=teelixir --env=production --url=/

# Run accessibility audit
npm run ops accessibility:audit -- --brand=teelixir --url=/products/chaga
```

### Deploying Changes

```bash
# Deploy to staging (automatic)
npm run ops deploy -- --brand=teelixir --env=staging

# Deploy to production (requires approval)
npm run ops deploy -- --brand=teelixir --env=production
```

### Monitoring

```bash
# View recent deployments
npm run ops deployments -- --brand=teelixir --limit=10

# View performance alerts
npm run ops alerts -- --brand=teelixir --severity=critical

# View Lighthouse trends
npm run ops lighthouse:trends -- --brand=teelixir --days=30
```

## Performance Targets

| Metric | Target | Minimum for Deployment |
|--------|--------|------------------------|
| Lighthouse Performance | 100/100 | 95/100 |
| Lighthouse Accessibility | 100/100 | 95/100 |
| Lighthouse Best Practices | 100/100 | 95/100 |
| Lighthouse SEO | 100/100 | 95/100 |
| LCP | ≤ 2.5s | Required |
| FID | ≤ 100ms | Required |
| CLS | ≤ 0.1 | Required |
| TTI | ≤ 3.5s | Required |
| TBT (desktop) | ≤ 200ms | Required |
| TBT (mobile) | ≤ 600ms | Required |

## Best Practices

### For Agents

1. **Always log activities** to Supabase for transparency
2. **Measure before and after** every optimization
3. **Document changes** with detailed commit messages
4. **Validate thoroughly** before deployment
5. **Coordinate with other agents** when changes overlap
6. **Prioritize by impact** - fix critical issues first
7. **Never compromise functionality** for performance

### For Humans

1. **Review deployment reports** before approving production
2. **Monitor dashboards** regularly for alerts
3. **Trust the validation gates** - don't bypass them
4. **Provide clear requirements** to SEO Implementation Agent
5. **Document learnings** for continuous improvement

## Monitoring & Alerts

### Real-Time Monitoring
- Performance regressions (> 5 point drop)
- Core Web Vitals failures
- Critical accessibility violations
- Deployment failures

### Daily Reports
- Yesterday's Lighthouse scores
- Active alerts summary
- Deployments executed
- Agent activity summary

### Weekly Reports
- Performance trends (7-day)
- Optimization opportunities
- Competitive benchmarking
- Agent performance metrics

### Monthly Reports
- Comprehensive performance review
- All 4 Lighthouse categories trends
- ROI analysis of optimizations
- Strategic recommendations

## Rollback Procedures

### Automatic Rollback Triggers
- Production score drops below 90/100
- Critical accessibility violation
- JavaScript errors affecting functionality
- Core Web Vital failure

### Manual Rollback
```bash
# Rollback to previous deployment
npm run ops rollback -- --brand=teelixir --deployment-id=<uuid>

# Rollback to specific Git commit
npm run ops rollback -- --brand=teelixir --commit=<hash>
```

**Target Rollback Time:** 5 minutes

## Troubleshooting

### Agent Not Responding
1. Check agent activity log in Supabase
2. Review recent error logs
3. Verify Supabase connection
4. Check tool dependencies installed

### Deployment Blocked
1. Review validation gate failures
2. Check Lighthouse audit details
3. Coordinate fix with appropriate agent
4. Re-run validation after fix

### Performance Regression
1. Identify recent changes (Git log)
2. Run Lighthouse audit to confirm
3. Review change impact in theme_changes table
4. Rollback or fix forward

## Directory Structure

```
agents/
├── lighthouse-audit/         # Lighthouse Audit Agent
│   ├── config/
│   │   ├── agent-config.json
│   │   └── lighthouse-config.json
│   ├── prompts/
│   │   ├── system-prompt.md
│   │   └── audit-workflow.md
│   └── README.md
├── theme-optimizer/          # Theme Optimizer Agent
│   ├── config/
│   │   └── agent-config.json
│   ├── prompts/
│   │   └── system-prompt.md
│   └── README.md
├── accessibility/            # Accessibility Agent
│   ├── config/
│   │   └── agent-config.json
│   └── README.md
├── seo-implementer/          # SEO Implementation Agent
│   ├── config/
│   │   └── agent-config.json
│   └── README.md
├── deployment/               # Deployment & Validation Agent
│   ├── config/
│   │   └── agent-config.json
│   └── README.md
├── database-schema.sql       # Supabase schema for all logging
└── README.md                 # This file
```

## Success Metrics

### Primary KPIs
- **100/100 Lighthouse scores** across all categories
- **Zero critical accessibility violations**
- **100% deployment validation pass rate**
- **Zero production rollbacks**

### Secondary KPIs
- **< 2.5s LCP** for all pages
- **< 0.1 CLS** for all pages
- **< 10 min deployment time**
- **100% change logging compliance**

## Future Enhancements

- [ ] Automated theme download and backup system
- [ ] Real User Monitoring (RUM) integration
- [ ] A/B testing framework for optimizations
- [ ] Visual regression testing automation
- [ ] Performance budget enforcement in CI/CD
- [ ] Competitive benchmarking automation
- [ ] AI-powered optimization suggestions
- [ ] Multi-language/region optimization

## Resources

### Shopify Development
- [Shopify Theme Development](https://shopify.dev/docs/themes)
- [Liquid Documentation](https://shopify.dev/docs/api/liquid)
- [Dawn Theme](https://github.com/Shopify/dawn)

### Performance
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core](https://github.com/dequelabs/axe-core)
- [WebAIM](https://webaim.org/)

### SEO
- [Schema.org](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)
- [Shopify SEO](https://shopify.dev/docs/themes/seo)

## Support

For questions or issues:
1. Review agent-specific README in each agent directory
2. Check Supabase logs for agent activities
3. Review Git commit history
4. Consult validation reports in Supabase
5. Escalate to human team for complex issues

## Contributing

When extending this agent team:
1. Follow existing agent configuration patterns
2. Update database schema if new logging needed
3. Document all agent behaviors in prompts
4. Add integration tests where applicable
5. Update this README with new capabilities

---

**Built with Claude Code** | **Version 1.0.0** | **Last Updated: 2024-11-20**
