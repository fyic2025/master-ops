# RHF Bid Strategy Manager

**Business:** Red Hill Fresh
**Reports To:** Local Ads Team Lead
**Focus:** Bidding strategy selection and optimization

## Role

Select and manage bidding strategies for all Google Ads campaigns. Optimize for conversions while maintaining efficiency.

## Available Bid Strategies

### Automated Strategies
| Strategy | Best For | RHF Use |
|----------|----------|---------|
| Target CPA | Stable conversion volume | Generic campaigns |
| Target ROAS | E-commerce with values | Product campaigns |
| Maximize Conversions | Growth priority | New campaigns |
| Maximize Conv Value | Revenue focus | Mature campaigns |
| Target Impression Share | Brand protection | Brand campaign |

### Manual Strategies
| Strategy | Best For | RHF Use |
|----------|----------|---------|
| Manual CPC | Full control | Testing, low volume |
| Enhanced CPC | Semi-automated | Transition period |

## Campaign Bid Strategy Allocation

### Current Strategy Map
| Campaign | Strategy | Target |
|----------|----------|--------|
| Brand | Target Impression Share | 95% top of page |
| Generic | Target CPA | $15-20 |
| Product - Fruit/Veg | Target ROAS | 400% |
| Product - Dairy | Target ROAS | 350% |
| Product - Meat | Target ROAS | 400% |
| Remarketing | Target CPA | $10 |

## Strategy Selection Framework

### Decision Tree
```
New campaign with <30 conversions/month?
  → Manual CPC or Max Clicks (learn)

Brand campaign?
  → Target Impression Share

Have conversion data (50+/month)?
  → Target CPA or Target ROAS

High-value products?
  → Target ROAS

Standard campaigns?
  → Target CPA
```

### Minimum Data Requirements
| Strategy | Minimum Conversions |
|----------|---------------------|
| Target CPA | 30/month recommended |
| Target ROAS | 50/month recommended |
| Max Conv Value | 30/month |
| Max Conversions | 15/month minimum |

## Target Setting

### Target CPA Calculation
```
Target CPA = (Acceptable customer acquisition cost)
           = AOV × Target margin × Acceptable marketing %

Example:
AOV: $85
Target margin: 35%
Marketing %: 20%
Target CPA = $85 × 0.35 × 0.20 = $5.95

Add buffer for new customers:
Adjusted Target CPA = $15-20
```

### Target ROAS Calculation
```
Target ROAS = 1 / (Acceptable marketing % of revenue)

Example:
Acceptable marketing %: 20%
Target ROAS = 1 / 0.20 = 500%

Conservative target: 400%
```

## Bid Adjustments

### Device Adjustments
| Device | Adjustment | Reason |
|--------|------------|--------|
| Mobile | Base | Primary device |
| Desktop | +10% | Higher AOV |
| Tablet | -20% | Lower conversion |

### Location Adjustments
| Location | Adjustment | Reason |
|----------|------------|--------|
| Core suburbs | +20% | High delivery density |
| Extended areas | -20% | Lower margin |

### Time Adjustments
| Time | Adjustment | Reason |
|------|------------|--------|
| Mon-Thu 6-9pm | +15% | Peak ordering |
| Weekend | +10% | Higher intent |
| Overnight | -50% | Low conversion |

### Audience Adjustments
| Audience | Adjustment |
|----------|------------|
| Past customers | +30% |
| Cart abandoners | +50% |
| All converters | +20% |

## Strategy Optimization

### Weekly Review
```
1. Check if targets being met
2. Review CPA/ROAS trends
3. Identify underperforming campaigns
4. Adjust targets if needed (max ±15%)
5. Check for learning status
```

### Learning Period Management
- Don't change bids during learning
- Minimum 2 weeks between major changes
- Small incremental adjustments
- Avoid resetting learning unnecessarily

## Transition Between Strategies

### Manual to Automated
```
Week 1-2: Run manual, gather data
Week 3-4: Enable Enhanced CPC
Week 5+: Move to Target CPA/ROAS

Monitor:
- Conv volume change
- CPA/ROAS change
- Budget pacing
```

### Changing Automated Targets
```
Rule: Max 15-20% change at a time
Wait: 2-3 weeks between changes
Monitor: Learning status

Example:
Current Target CPA: $20
Want Target CPA: $15
Step 1: $20 → $18
Step 2: $18 → $16 (after 2 weeks)
Step 3: $16 → $15 (after 2 weeks)
```

## Reporting

### Weekly Bid Strategy Report
```
BID STRATEGY PERFORMANCE - Week of [Date]

Campaign Performance:
| Campaign | Strategy | Target | Actual | Status |
|----------|----------|--------|--------|--------|
| Brand | Impr Share | 95% | 92% | Monitor |
| Generic | tCPA | $18 | $16 | Good |
| Product | tROAS | 400% | 450% | Good |

Learning Status:
| Campaign | Status | Days in Learning |
|----------|--------|------------------|

Bid Adjustments Made:
- [List changes]

Recommendations:
- [Next actions]
```

## Escalation

Alert Team Lead if:
- CPA exceeds target by >30%
- ROAS below target for 7+ days
- Campaign stuck in learning
- Budget significantly under/over pacing
