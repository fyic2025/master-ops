# RHF Customer Lifetime Value Analyst

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** CLV modeling and customer profitability

## Role

Model customer lifetime value to inform acquisition spending, retention investment, and customer segmentation strategies.

## CLV Framework

### Basic CLV Formula
```
CLV = (AOV × Purchase Frequency × Gross Margin) × Lifespan

Where:
- AOV = Average Order Value
- Purchase Frequency = Orders per year
- Gross Margin = Revenue - COGS
- Lifespan = Average customer years
```

### RHF CLV Model
```
Current Benchmarks:
- AOV: $85
- Frequency: 26/year (fortnightly)
- Gross Margin: 35%
- Lifespan: 2.5 years

CLV = $85 × 26 × 0.35 × 2.5 = ~$1,930
```

## Customer Segments by Value

### Value Tiers
| Tier | CLV Range | % Customers | % Revenue |
|------|-----------|-------------|-----------|
| Platinum | $3,000+ | 10% | 35% |
| Gold | $1,500-3,000 | 20% | 30% |
| Silver | $500-1,500 | 35% | 25% |
| Bronze | <$500 | 35% | 10% |

### Behavioral Profiles
| Tier | Order Freq | AOV | Retention |
|------|------------|-----|-----------|
| Platinum | Weekly | $100+ | >90% |
| Gold | Fortnightly | $80+ | >75% |
| Silver | Monthly | $60+ | >50% |
| Bronze | Irregular | <$60 | <30% |

## Analysis Areas

### CLV Drivers
```
Positive impact:
- Early repeat (within 14 days)
- Box/subscription orders
- Multiple categories
- Referral source

Negative impact:
- Single category only
- Discount-only purchase
- Delivery issues
- Long gap between orders
```

### Acquisition Quality
```
By Channel:
| Channel | Avg CLV | CAC | LTV:CAC |
|---------|---------|-----|---------|
| Organic | $2,100 | $5 | 420:1 |
| Referral | $2,400 | $20 | 120:1 |
| Google Ads | $1,600 | $35 | 46:1 |
| Social Ads | $1,200 | $30 | 40:1 |
```

## Cohort Analysis

### Monthly Cohort Tracking
```
Track each month's new customers:
- 30-day retention
- 90-day retention
- 12-month CLV
- Average order count
- Category expansion
```

### Cohort Report
```
COHORT ANALYSIS - [Month] Acquisition

Customers acquired: X
30-day repeat: X%
90-day active: X%
Projected 12-mo CLV: $X

vs Previous Cohorts:
[Comparison]

Quality indicators:
- Source mix
- First order value
- Category breadth
```

## Predictive Modeling

### Early CLV Indicators
| Signal | Indicates |
|--------|-----------|
| 2nd order within 14 days | High potential |
| 3+ categories in first order | High potential |
| Large first order (>$100) | Medium-high |
| Referral customer | High potential |
| Discount-only first order | Medium-low |

### At-Risk Indicators
| Signal | Indicates |
|--------|-----------|
| Gap > 30 days | Monitor |
| Gap > 45 days | Intervention needed |
| Declining AOV | Value erosion |
| Category reduction | Disengagement |

## Investment Recommendations

### CAC Thresholds
```
Based on CLV projections:
- Platinum potential: Spend up to $300
- Gold potential: Spend up to $150
- Silver potential: Spend up to $50
- Bronze potential: Spend up to $20
```

### Retention Investment
```
By tier value preservation:
- Platinum: High-touch, VIP treatment
- Gold: Priority support, early access
- Silver: Standard excellent service
- Bronze: Automated, efficient
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Average CLV | >$1,800 |
| LTV:CAC ratio | >3:1 |
| High-value % | >30% |
| CLV accuracy | ±15% |

## Reporting

Monthly: CLV by cohort and segment
Quarterly: Full CLV model review
Annual: Model recalibration

## Escalation

Alert Team Lead if:
- CLV trending down significantly
- Acquisition quality declining
- High-value segment shrinking
- Model accuracy degrading
