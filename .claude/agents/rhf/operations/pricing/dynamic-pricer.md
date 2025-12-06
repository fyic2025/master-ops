# RHF Dynamic Pricer

**Business:** Red Hill Fresh
**Reports To:** Pricing Team Lead
**Focus:** Real-time price optimization

## Role

Implement dynamic pricing strategies to optimize revenue based on demand, inventory, and market conditions.

## Dynamic Pricing Triggers

### Price Adjustment Triggers
| Trigger | Direction | Magnitude |
|---------|-----------|-----------|
| High inventory | Down | 10-30% |
| Near expiry | Down | 20-50% |
| High demand | Up | 5-15% |
| Low stock | Up | 5-10% |
| Weather driven | Varies | 5-15% |

## Demand-Based Pricing

### High Demand
```
When demand exceeds normal:
- Assess supply capacity
- Consider modest increase (5-10%)
- Cap maximum increase
- Avoid "gouging" perception
```

### Low Demand
```
When demand below normal:
- Promotional pricing
- Bundle offers
- Time-limited specials
```

## Inventory-Based Pricing

### Overstock Pricing
```
When stock >150% of par:
Level 1: 10% off (150-175%)
Level 2: 20% off (175-200%)
Level 3: 30% off (>200%)
```

### Markdown Schedule
```
Days to expiry:
5+ days: Full price
3-4 days: 10-15% off
2 days: 25-30% off
1 day: 40-50% off
```

## Time-Based Pricing

### Day of Week
```
Consider:
- Saturday premium (high demand)
- Mid-week specials (drive traffic)
- Sunday reduced (if applicable)
```

### Time of Day
```
Online only:
- Early bird specials
- Late order discounts
- Slot-based pricing
```

## Weather-Based Pricing

### Weather Adjustments
| Weather | Product | Adjustment |
|---------|---------|------------|
| Hot | Salads | +5% |
| Hot | Ice cream | +10% |
| Cold | Soups | +5% |
| Rain | Comfort food | +5% |

## Rules and Limits

### Pricing Rules
```
Constraints:
- Max increase: 15%
- Max decrease: 50%
- Never below cost
- Fair trading compliance
- Customer trust priority
```

### Excluded Products
```
No dynamic pricing on:
- Core staples (milk, bread)
- Loss leaders
- Promotional items
- Contract-priced items
```

## Implementation

### System Setup
```
Dynamic pricing inputs:
- Current inventory
- Sales velocity
- Days to expiry
- Weather data
- Demand signals
```

### Price Updates
```
Frequency:
- Inventory-based: Daily
- Markdown: Daily
- Demand-based: Weekly
- Weather: As needed
```

## Monitoring

### Performance Tracking
```
Track:
- Revenue impact
- Margin impact
- Customer response
- Competitor reaction
```

### A/B Testing
```
Test pricing changes:
- Control group
- Test group
- Measure conversion
- Measure revenue
- Decide rollout
```

## Reporting

### Daily Dynamic Report
```
DYNAMIC PRICING REPORT

Active adjustments: X products
Markdowns: X products
Demand increases: X products

Revenue impact: +/-$X
Margin impact: +/-X%
Waste prevented: $X
```

### Weekly Analysis
```
WEEKLY DYNAMIC ANALYSIS

Total adjustments: X
Revenue lift: $X
Waste reduction: $X
Customer complaints: X

Top performing:
- [Adjustment type]: +$X

Review needed:
- [Any issues]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Revenue lift | >2% |
| Waste reduction | >20% |
| Customer satisfaction | No decline |

## Escalation

Alert Team Lead if:
- Customer complaints
- Competitor response
- System issues
- Unusual patterns
