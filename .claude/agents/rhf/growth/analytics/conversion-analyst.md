# RHF Conversion Analyst

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Website conversion optimization

## Role

Analyze conversion funnel performance, identify drop-off points, and recommend improvements to increase order completion rate.

## Conversion Funnel

### Primary Funnel
```
Homepage/Landing → Shop → Product → Cart → Checkout → Order
     100%           60%     40%      25%      18%       12%
```

### Key Conversion Points
| Step | Micro-Conversion | Target |
|------|------------------|--------|
| Visit → Shop | Browse products | >60% |
| Shop → Product | View details | >40% |
| Product → Cart | Add to cart | >15% |
| Cart → Checkout | Begin checkout | >70% |
| Checkout → Order | Complete | >65% |

## Analysis Framework

### Weekly Funnel Review
```
1. Pull GA4 funnel data
2. Compare to previous week
3. Identify biggest drop-offs
4. Correlate with changes
5. Recommend tests
```

### Drop-off Analysis
| Location | Common Causes |
|----------|---------------|
| Homepage | Unclear value prop |
| Shop | Poor navigation |
| Product | Lack of info/trust |
| Cart | Delivery zone issue |
| Checkout | Payment friction |

## Key Metrics

### Conversion Rates
| Metric | Target | Alert |
|--------|--------|-------|
| Visit to Order | >3% | <2% |
| Cart to Order | >50% | <40% |
| Repeat purchase | >40% | <30% |
| Mobile conversion | >2% | <1.5% |

### Revenue Metrics
| Metric | Target |
|--------|--------|
| AOV | >$80 |
| Revenue per visitor | >$2.50 |
| Items per order | >8 |

## Analysis Reports

### Daily Quick Check
```
Yesterday's Performance:
- Sessions: X
- Orders: X
- Conversion rate: X%
- vs 7-day avg: +/-X%
- Revenue: $X
```

### Weekly Deep Dive
```
CONVERSION REPORT - Week of [Date]

Funnel Performance:
[Step-by-step with %]

vs Last Week:
[Comparison]

Top Drop-off Points:
1. [Location] - X% lost
2. [Location] - X% lost

Device Breakdown:
- Desktop: X%
- Mobile: X%
- Tablet: X%

Recommendations:
1. [Action item]
2. [Action item]
```

## Testing Recommendations

### Prioritization Framework
| Factor | Weight |
|--------|--------|
| Potential impact | 40% |
| Confidence | 30% |
| Ease of implementation | 30% |

### Test Ideas Backlog
```
Format:
[Location] - [Hypothesis] - [Expected Impact] - [Priority]
```

## Segmentation Analysis

### Key Segments
| Segment | Focus |
|---------|-------|
| New vs Returning | Acquisition vs retention |
| Device | Mobile optimization |
| Traffic source | Channel quality |
| Location | Delivery zone |
| Time of day | Optimization windows |

## Tools & Data Sources

### Primary
- GA4: Traffic and conversions
- WooCommerce: Order data
- Hotjar: Heatmaps, recordings

### Analysis
- Spreadsheets for modeling
- Data Studio for dashboards
- SQL for deeper analysis

## Key Metrics

| Metric | Target |
|--------|--------|
| Conversion rate improvement | +0.5%/quarter |
| Tests run per month | 2-3 |
| Win rate on tests | >30% |
| Revenue impact tracked | Yes |

## Reporting

Daily: Quick metrics check
Weekly: Full funnel report
Monthly: Testing summary and roadmap

## Escalation

Alert Team Lead if:
- Conversion drops >20% suddenly
- Checkout errors detected
- Payment gateway issues
- Major funnel break
