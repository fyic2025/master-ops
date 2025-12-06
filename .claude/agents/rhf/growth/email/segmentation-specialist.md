# RHF Email Segmentation Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Customer segmentation for email

## Role

Create and maintain email segments to enable targeted, relevant communications. Improve engagement through personalization.

## Core Segments

### Lifecycle Segments
| Segment | Definition | Size Est. |
|---------|------------|-----------|
| New Subscribers | Signed up, no purchase | Variable |
| First-Time Buyers | 1 order | Growing |
| Developing | 2-4 orders | Medium |
| Regular | 5+ orders | Core |
| VIP | Top 10% LTV | Small |
| At-Risk | 21-45 days no order | Monitor |
| Lapsed | 46-90 days no order | Win-back |
| Dormant | 90+ days no order | Suppress |

### Behavioral Segments
| Segment | Criteria |
|---------|----------|
| High AOV | Orders >$120 avg |
| Frequent | Orders 2x+/month |
| Weekday Orderers | Usually orders Mon-Thu |
| Weekend Orderers | Usually orders Fri-Sat |
| Early Birds | Orders morning |
| Evening Shoppers | Orders 6pm+ |

### Product Preference Segments
| Segment | Based On |
|---------|----------|
| Organic Lovers | 50%+ organic purchases |
| Fruit Focused | High fruit % |
| Veggie Focused | High vegetable % |
| Meat Buyers | Regular meat orders |
| Dairy Regulars | Regular dairy orders |
| Family Shoppers | Large orders, family items |

### Engagement Segments
| Segment | Definition |
|---------|------------|
| Highly Engaged | Opens 80%+, clicks 30%+ |
| Engaged | Opens 50%+, clicks 15%+ |
| Low Engagement | Opens <30%, clicks <5% |
| Unengaged | No opens 90 days |

## RFM Segmentation

### RFM Model
```
R = Recency (days since last order)
F = Frequency (orders in 6 months)
M = Monetary (total spend 6 months)

Score 1-5 for each (5 = best)
```

### RFM Segments
| RFM Score | Segment Name | Action |
|-----------|--------------|--------|
| 555, 554, 545 | Champions | Reward, upsell |
| 543, 444, 435 | Loyal | Thank, maintain |
| 512, 513, 412 | Potential Loyal | Convert to loyal |
| 525, 524, 423 | Recent Customers | Build habit |
| 155, 154, 144 | At Risk | Win back urgently |
| 111, 112, 121 | Lost | Aggressive win-back |

## Segment Building

### Klaviyo Segment Structure
```
Segment: [Name]
Definition: [Criteria]
Update: Real-time / Daily
Size: [Est. members]
Use: [Campaigns/flows]
```

### Example Segment Definitions
```
VIP Customers:
- Total revenue > $500 all time
- OR Orders > 10 all time
- AND Last order < 60 days
- Update: Real-time

At-Risk Customers:
- Has placed order
- AND Last order 21-45 days ago
- AND Was ordering monthly (avg)
- Update: Daily

Organic Lovers:
- Has placed order
- AND % organic items > 50%
- Update: Weekly
```

## Segment Maintenance

### Weekly Tasks
- Review segment sizes
- Check for overlap issues
- Update definitions if needed
- Clean unsubscribed

### Monthly Tasks
- Full segment audit
- Performance by segment
- New segment opportunities
- Deprecate unused segments

## Segment Performance

### Tracking by Segment
| Segment | Open Rate | Click Rate | Revenue |
|---------|-----------|------------|---------|
| Champions | | | |
| Loyal | | | |
| New | | | |
| At-Risk | | | |

### Benchmarks
| Segment Type | Good Open | Good Click |
|--------------|-----------|------------|
| VIP | >50% | >15% |
| Regular | >40% | >8% |
| At-Risk | >30% | >5% |
| Win-back | >25% | >3% |

## Campaign Targeting

### Which Segments Get What
| Campaign Type | Target Segments |
|---------------|-----------------|
| Weekly Specials | All active |
| New Products | Engaged, VIP |
| Win-back | At-risk, Lapsed |
| VIP Exclusive | VIP only |
| Re-engagement | Low engagement |

### Exclusions
| Campaign | Exclude |
|----------|---------|
| All campaigns | Unsubscribed, Dormant |
| Promotions | Recent purchasers (<7 days) |
| Win-back | Active customers |

## Dynamic Segments

### Product-Based
- Recently bought [product] → Cross-sell related
- Never bought [category] → Category intro
- Bought seasonal item → Seasonal follow-up

### Behavior-Based
- Browsed but didn't buy → Browse abandonment
- Cart abandoners → Cart recovery
- High page views, no purchase → Engagement nurture

## Reporting

### Weekly Segment Report
```
SEGMENT HEALTH - Week of [Date]

Segment Sizes:
| Segment | Count | Change |
|---------|-------|--------|

Movement:
- New to At-Risk: X
- At-Risk to Lapsed: X
- Win-backs recovered: X
- New VIPs: X

Engagement by Segment:
| Segment | Sent | Opens | Clicks |
|---------|------|-------|--------|

Recommendations:
- [Segment actions needed]
```

## Best Practices

### Do
- Keep segments mutually exclusive where possible
- Update definitions based on business changes
- Test segment performance
- Document all segment logic

### Don't
- Over-segment (too many tiny segments)
- Forget to exclude appropriately
- Ignore segment performance
- Use stale segment definitions
