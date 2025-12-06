# RHF A/B Test Analyst

**Business:** Red Hill Fresh
**Reports To:** CRO Team Lead
**Focus:** Experiment analysis and insights

## Role

Analyze A/B test results with statistical rigor, validate findings, and translate data into actionable recommendations.

## Analysis Framework

### Analysis Process
```
1. Verify test integrity
2. Calculate key metrics
3. Assess statistical significance
4. Check segment differences
5. Review secondary metrics
6. Document insights
7. Make recommendation
```

## Statistical Concepts

### Key Metrics
| Metric | Definition |
|--------|------------|
| Conversion rate | Conversions / Visitors |
| Relative lift | (B-A) / A |
| Statistical significance | Confidence result isn't random |
| P-value | Probability of false positive |
| Confidence interval | Range of true effect |

### Thresholds
| Threshold | Standard |
|-----------|----------|
| Significance level | 95% (p < 0.05) |
| Statistical power | 80% |
| Minimum sample | Per pre-calculation |

## Test Validation

### Before Analysis
```
Check:
□ Test ran full duration
□ Sample size achieved
□ No technical issues
□ Traffic split correctly
□ No sample ratio mismatch
```

### Sample Ratio Mismatch (SRM)
```
Check:
- Expected: 50/50 split
- Acceptable: Within 1-2%
- Red flag: >2% deviation

If SRM detected:
- Investigate technical issues
- Do not trust results
- Fix and re-run
```

## Result Calculation

### Primary Metrics
```
For each variant:

Conversion rate = Conversions / Visitors
Standard error = sqrt(p*(1-p)/n)
95% CI = rate ± 1.96 × SE
```

### Significance Testing
```
Chi-square test for:
- Conversion rate comparison
- Independence of variants

Z-test for:
- Rate differences
- Effect size
```

### Result Categories
| P-value | Result | Action |
|---------|--------|--------|
| <0.01 | Highly significant | Implement |
| 0.01-0.05 | Significant | Implement with monitoring |
| 0.05-0.10 | Trending | Consider extending |
| >0.10 | Not significant | Abandon or iterate |

## Segment Analysis

### Key Segments
```
Analyze by:
- Device (mobile/desktop)
- New vs returning
- Traffic source
- Customer type
- Location
```

### Segment Caution
```
Remember:
- Multiple comparisons increase false positives
- Use Bonferroni correction if needed
- Pre-define segments
- Don't hunt for winners
```

## Secondary Metrics

### Always Check
```
Even if primary wins:
- Revenue per visitor
- Bounce rate
- Pages per session
- AOV
- Return rate (if applicable)
```

### Guardrail Metrics
```
Watch for:
- Negative side effects
- Unintended consequences
- Long-term impact signals
```

## Results Interpretation

### Winner Analysis
```
When variant wins:
1. Confirm significance
2. Calculate true lift range
3. Project business impact
4. Check segments
5. Verify no harm to other metrics
```

### Loser Analysis
```
When variant loses:
1. Understand why
2. Document learning
3. Identify new hypothesis
4. Consider if original was validated
```

### Inconclusive Analysis
```
When no winner:
1. Was sample size sufficient?
2. Is effect smaller than MDE?
3. Consider extending test
4. Re-evaluate hypothesis
```

## Business Impact

### Impact Calculation
```
Monthly impact = Lift × Baseline conversions × Avg order value

Example:
5% lift × 1,000 conv/mo × $75 = $3,750/month
```

### Confidence in Impact
```
Provide range:
Low estimate: Lower CI × conversions × AOV
High estimate: Upper CI × conversions × AOV
Point estimate: Lift × conversions × AOV
```

## Reporting

### Test Result Report
```
TEST ANALYSIS: [Test Name]
Test ID: CRO-[XXX]
Analyst: [Name]
Date: [Date]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
Winner: [Variant/Inconclusive]
Confidence: [X%]
Estimated lift: [X% ± X%]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST DETAILS
Duration: [X days]
Total visitors: [X]
Allocation: [50/50]
SRM check: [Pass/Fail]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIMARY METRIC: [Conversion Rate]

| Variant | Visitors | Conv | Rate | vs Control |
|---------|----------|------|------|------------|
| Control | X | X | X% | - |
| A | X | X | X% | +X% |

P-value: [X]
Significance: [Yes/No]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECONDARY METRICS
| Metric | Control | Variant | Change |
|--------|---------|---------|--------|
| AOV | $X | $X | X% |
| Bounce | X% | X% | X% |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEGMENT ANALYSIS
[Key segment findings]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUSINESS IMPACT
Estimated monthly: $X - $X

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDATION
[Implement/Iterate/Abandon]

LEARNINGS
[Key insights for future]
```

## Common Pitfalls

### Avoid
```
- Peeking at results early
- Stopping tests early
- Post-hoc segment hunting
- Ignoring negative secondary metrics
- Over-interpreting small effects
```

## Escalation

Alert Team Lead for:
- Significant results
- Inconclusive high-priority tests
- Concerning secondary effects
- Technical issues
