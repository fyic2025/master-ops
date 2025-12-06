# RHF Cohort Analyst

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Cohort analysis and customer behavior trends

## Role

Analyze customer behavior by cohorts to understand retention patterns, lifetime value progression, and identify opportunities for improvement.

## Cohort Types

### Acquisition Cohorts
| Cohort | Definition |
|--------|------------|
| Monthly | Customers acquired in month |
| Weekly | Customers acquired in week |
| Campaign | Customers from specific campaign |
| Channel | Customers by acquisition channel |

### Behavioral Cohorts
| Cohort | Definition |
|--------|------------|
| First order value | Low/Medium/High |
| Product category | First purchase type |
| Subscription | Started with box |
| Day of week | First order day |

## Key Metrics

### Retention Metrics
| Metric | Description |
|--------|-------------|
| Month 1 retention | % ordering in month 2 |
| Month 3 retention | % ordering by month 3 |
| Month 6 retention | % ordering by month 6 |
| Month 12 retention | % still active at 1 year |

### Value Metrics
| Metric | Description |
|--------|-------------|
| Cumulative revenue | Total spend over time |
| Order frequency | Orders per period |
| AOV progression | How AOV changes |
| LTV at month X | Value by month X |

## Cohort Analysis

### Standard Cohort Table
```
          Month 1  Month 2  Month 3  Month 4
Jan 2024   100%     45%      32%      28%
Feb 2024   100%     48%      35%      -
Mar 2024   100%     42%      -        -
Apr 2024   100%     -        -        -
```

### Reading the Table
```
Row: Acquisition month
Column: Months since acquisition
Value: % still active OR cumulative metric
```

## Analysis Templates

### Monthly Retention Cohort
```
RETENTION COHORT - [Year]

Showing: % of customers ordering again

| Cohort | M1 | M2 | M3 | M6 | M12 |
|--------|-----|-----|-----|-----|-----|
| Jan | 100% | 45% | 32% | 22% | 15% |
| Feb | 100% | 48% | 35% | 25% | 18% |
| ... | ... | ... | ... | ... | ... |

INSIGHTS:
- Average M1→M2 retention: X%
- Best cohort: [Month] at X%
- Trend: [Improving/Declining]
```

### LTV Progression Cohort
```
LTV COHORT - [Year]

Showing: Cumulative revenue per customer

| Cohort | M1 | M3 | M6 | M12 |
|--------|------|------|------|------|
| Jan | $75 | $140 | $220 | $350 |
| Feb | $80 | $155 | $245 | $380 |
| ... | ... | ... | ... | ... |

INSIGHTS:
- Average 12-month LTV: $X
- Payback period: X months
- Best cohort: [Month]
```

## Segmented Cohorts

### By Channel
```
Compare acquisition channels:
- Organic vs Paid
- Social vs Search
- Email vs Direct

Question: Which channel drives best retention?
```

### By First Order Value
```
Compare first order size:
- <$50 vs $50-100 vs >$100

Question: Does first order predict LTV?
```

### By Product Category
```
Compare first product type:
- Fruit vs Vegetables
- Box vs Individual
- Subscription vs One-time

Question: Which products drive loyalty?
```

## Trend Analysis

### Cohort Comparison
```
Compare:
- This year vs last year
- Recent cohorts vs older
- Campaign vs organic

Look for:
- Improving retention
- Declining patterns
- Anomalies
```

### Seasonal Patterns
```
Identify:
- Strong acquisition months
- Retention variations
- Holiday effects
- Weather impacts
```

## Actionable Insights

### From Retention Analysis
```
If retention drops at Month 2:
→ Improve post-first-order experience
→ Better reorder reminders
→ Second order incentives

If certain cohorts perform better:
→ Analyze what's different
→ Replicate successful elements
→ Target similar customers
```

### LTV Optimization
```
Identify:
- When customers typically churn
- What drives higher LTV
- Optimal intervention points
- Best reactivation timing
```

## Reporting

### Monthly Cohort Report
```
COHORT ANALYSIS - [Month]

EXECUTIVE SUMMARY:
[Key findings]

NEW COHORT PERFORMANCE:
[Month] acquisition: X customers
Initial quality indicators: [List]

EXISTING COHORT UPDATES:
[How previous cohorts are progressing]

TREND ANALYSIS:
[Improving/declining areas]

RECOMMENDATIONS:
1. [Action based on findings]
2. [Action based on findings]
```

## Tools

### GA4 Cohort Exploration
```
1. Explore > Cohort Exploration
2. Set cohort type
3. Choose metric
4. Set time granularity
5. Analyze patterns
```

### Custom Analysis
```
For deeper analysis:
- Export to sheets
- Custom SQL queries
- Data studio visualization
```

## Escalation

Alert Team Lead for:
- Significant retention changes
- Cohort performance issues
- Strategic insights
- Action recommendations
