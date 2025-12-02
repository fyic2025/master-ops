# BOO Website Optimisation Team

**Version:** 1.0.0
**Platform:** BigCommerce
**Store:** Buy Organics Online (buyorganicsonline.com.au)
**Goal:** Achieve and maintain 100/100 Lighthouse scores with automated monitoring and fixes

## Quick Start

```bash
# Install dependencies
cd /home/user/master-ops/buy-organics-online/optimisation-team
npm install

# Run initial audit
npm run audit

# Run comparison report (vs previous period)
npm run compare

# Run full optimization cycle
npm run optimize
```

## Overview

This optimization team provides automated performance monitoring, comparison analysis, and fixes for the Buy Organics Online BigCommerce store. It tracks Core Web Vitals, Lighthouse scores, and implements fixes to maintain 100/100 performance.

## Agent Team Structure

### 1. Lighthouse Audit Agent
**Purpose:** Run comprehensive Lighthouse audits and track scores
**Capabilities:**
- Desktop and mobile audits
- Core Web Vitals tracking (LCP, FID, CLS, INP, TTFB)
- Historical score tracking
- Automated scheduling

### 2. Performance Monitor Agent
**Purpose:** Compare current performance against previous periods
**Capabilities:**
- Daily/weekly/monthly comparisons
- Trend analysis
- Regression detection
- Alert generation

### 3. Auto-Fixer Agent
**Purpose:** Automatically fix common performance issues
**Capabilities:**
- Image optimization recommendations
- Script defer/async suggestions
- CSS optimization
- Third-party script management
- BigCommerce-specific fixes

### 4. Report Generator Agent
**Purpose:** Generate actionable performance reports
**Capabilities:**
- Executive summaries
- Technical deep-dives
- Before/after comparisons
- Priority fix recommendations

### 5. Coordinator Agent
**Purpose:** Orchestrate all agents and maintain optimization cycles
**Capabilities:**
- Schedule audits
- Trigger fixes based on thresholds
- Coordinate agent activities
- Manage alert escalation

## Directory Structure

```
optimisation-team/
├── README.md                    # This file
├── package.json                 # Dependencies and scripts
├── agents/
│   ├── lighthouse-audit.js      # Lighthouse auditing
│   ├── performance-monitor.js   # Performance comparison
│   ├── auto-fixer.js           # Automated fixes
│   ├── report-generator.js     # Report generation
│   └── coordinator.js          # Agent orchestration
├── config/
│   ├── agent-config.json       # Agent configuration
│   ├── thresholds.json         # Performance thresholds
│   ├── pages.json              # Pages to audit
│   └── schedules.json          # Audit schedules
├── scripts/
│   ├── run-audit.js            # Run single audit
│   ├── run-comparison.js       # Run comparison
│   ├── run-optimization.js     # Run full cycle
│   └── setup-cron.js           # Setup scheduled jobs
├── lib/
│   ├── supabase-client.js      # Database client
│   ├── lighthouse-runner.js    # Lighthouse wrapper
│   ├── bigcommerce-api.js      # BigCommerce API
│   └── metrics-calculator.js   # Metrics calculations
├── migrations/
│   └── 001_optimisation_schema.sql  # Database schema
├── prompts/
│   ├── audit-analysis.md       # Audit analysis prompt
│   ├── fix-recommendations.md  # Fix recommendations
│   └── report-template.md      # Report template
├── tools/
│   ├── image-analyzer.js       # Image optimization analysis
│   ├── script-analyzer.js      # JavaScript analysis
│   └── css-analyzer.js         # CSS analysis
└── reports/
    └── .gitkeep                # Generated reports stored here
```

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Performance Score | 100 | < 95 | < 85 |
| Accessibility Score | 100 | < 95 | < 85 |
| Best Practices Score | 100 | < 95 | < 85 |
| SEO Score | 100 | < 95 | < 85 |
| LCP | ≤ 2.5s | > 2.5s | > 4.0s |
| FID/INP | ≤ 100ms | > 100ms | > 300ms |
| CLS | ≤ 0.1 | > 0.1 | > 0.25 |
| TTFB | ≤ 800ms | > 800ms | > 1800ms |

## Comparison Periods

The Performance Monitor Agent compares against:
- **Previous day:** Detect immediate regressions
- **Previous week:** Weekly trend analysis
- **Previous month:** Monthly trend analysis
- **Baseline:** Compare against established baseline

## Automated Fixes

The Auto-Fixer Agent can automatically address:

### BigCommerce-Specific
- Script loading optimization
- Image lazy loading via Stencil
- Font loading optimization
- Third-party app management
- CDN configuration

### General Performance
- Resource hints (preconnect, preload)
- Critical CSS extraction recommendations
- JavaScript defer/async recommendations
- Image format recommendations (WebP/AVIF)
- Unused CSS/JS identification

## Alerting

Alerts are generated when:
- Score drops by 5+ points from previous period
- Any Core Web Vital fails threshold
- Critical accessibility violation detected
- Performance regression detected

Alert channels:
- Supabase `optimisation_alerts` table
- Console output (for immediate runs)
- Report generation

## Database Schema

All data is stored in Supabase:

| Table | Purpose |
|-------|---------|
| `boo_lighthouse_audits` | All audit results |
| `boo_performance_trends` | Aggregated trends |
| `boo_optimisation_alerts` | Generated alerts |
| `boo_fix_history` | Applied fixes |
| `boo_comparison_reports` | Period comparisons |

## Usage Examples

### Run a Quick Audit
```bash
npm run audit -- --url=https://www.buyorganicsonline.com.au/
```

### Run Mobile Audit
```bash
npm run audit -- --url=https://www.buyorganicsonline.com.au/ --device=mobile
```

### Compare Against Last Week
```bash
npm run compare -- --period=week
```

### Generate Full Report
```bash
npm run report -- --format=markdown
```

### Run Optimization Cycle
```bash
npm run optimize
```

## Scheduled Monitoring

Configure automated monitoring:

```bash
# Setup daily audits at 6am
npm run setup-cron -- --schedule=daily --time=06:00

# Setup weekly comparison reports
npm run setup-cron -- --schedule=weekly --day=monday --time=07:00
```

## Integration with Other Systems

### Supabase
All data is logged to Supabase for:
- Historical tracking
- Dashboard visualization
- Alert management
- Cross-system integration

### BigCommerce API
Used for:
- Theme file analysis
- Script inventory
- Store configuration

### Google PageSpeed Insights API
Alternative data source for:
- Field data (CrUX)
- Real user metrics
- Production validation

## Troubleshooting

### Audits Failing
1. Check network connectivity
2. Verify URL is accessible
3. Check Lighthouse CLI is installed
4. Review error logs

### Database Connection Issues
1. Verify Supabase credentials in `.env`
2. Check network access to Supabase
3. Verify table schema is applied

### Comparison Data Missing
1. Ensure sufficient historical data exists
2. Check date range parameters
3. Verify audit data quality

## Contributing

When extending this optimization team:
1. Follow existing file patterns
2. Update database schema if needed
3. Add tests for new functionality
4. Update this README

## Support

For issues:
1. Review logs in `reports/` directory
2. Check Supabase audit tables
3. Review agent activity logs
4. Escalate complex issues

---

**Built for Buy Organics Online** | **BigCommerce Platform** | **Version 1.0.0**
