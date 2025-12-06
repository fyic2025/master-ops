# RHF GA4 Audience Builder

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Audience creation and management

## Role

Create and maintain strategic audiences in GA4 for remarketing, analysis, and personalization across marketing channels.

## Audience Strategy

### Audience Categories
| Category | Purpose |
|----------|---------|
| Acquisition | Target new users |
| Remarketing | Re-engage visitors |
| Retention | Keep customers |
| Value-based | Target by value |
| Behavioral | Based on actions |

## Key Audiences

### Purchase-Based
| Audience | Definition | Duration |
|----------|------------|----------|
| Purchasers (30 days) | purchase event | 30 days |
| Purchasers (90 days) | purchase event | 90 days |
| High-value customers | purchase value > $150 | 90 days |
| Repeat purchasers | purchase count > 1 | 180 days |
| First-time buyers | first_order event | 30 days |

### Funnel Stages
| Audience | Definition | Duration |
|----------|------------|----------|
| Product viewers | view_item, no purchase | 14 days |
| Cart abandoners | add_to_cart, no purchase | 7 days |
| Checkout abandoners | begin_checkout, no purchase | 3 days |

### Engagement
| Audience | Definition | Duration |
|----------|------------|----------|
| Engaged visitors | session_engaged = true | 30 days |
| Newsletter subscribers | sign_up event | 365 days |
| Active browsers | 5+ page_views | 14 days |

## Audience Creation

### GA4 Audience Builder
```
1. Admin > Audiences > New Audience
2. Select conditions
3. Set membership duration
4. Name and save
5. Connect to Google Ads
```

### Condition Types
| Type | Example |
|------|---------|
| Event | purchase |
| Event parameter | value > 100 |
| User property | customer_type = vip |
| Dimension | device = mobile |
| Time | in last 7 days |

## Audience Specifications

### Cart Abandoners
```
Name: Cart Abandoners - 7 Days
Conditions:
- add_to_cart event occurred
- AND purchase event did NOT occur
Duration: 7 days
Exclude: Purchasers
```

### High-Value Customers
```
Name: High Value - 90 Days
Conditions:
- purchase event occurred
- AND event value > 150
Duration: 90 days
```

### Lapsed Customers
```
Name: Lapsed Customers
Conditions:
- purchase event 90-180 days ago
- AND NOT purchase event in last 90 days
Duration: 90 days
```

### Subscription Interested
```
Name: Subscription Interest
Conditions:
- view subscription page
- AND NOT subscription_start event
Duration: 30 days
```

## Lookalike Seeds

### Best Seeds
| Seed Audience | For |
|---------------|-----|
| Purchasers 30d | Similar buyers |
| High value | Similar high-value |
| Repeat buyers | Similar loyals |

### Export for Google Ads
```
1. Create audience in GA4
2. Enable Google Ads link
3. Audience auto-syncs
4. Create Similar Audience in Ads
```

## Exclusion Audiences

### Negative Targeting
| Exclude | From |
|---------|------|
| Recent purchasers | New customer campaigns |
| Subscribers | Subscription promos |
| Out of zone | All campaigns |

## Audience Overlap

### Analyze Overlaps
```
Check for overlap:
- Cart abandoners vs purchasers
- High value vs repeat buyers
- Segments vs each other
```

### Reduce Overlap
```
Use exclusions:
- Purchasers exclude from cart abandoners
- VIP exclude from general remarketing
```

## Performance Tracking

### Audience Metrics
| Metric | Track |
|--------|-------|
| Audience size | Growing? |
| Conversion rate | By audience |
| ROAS | By audience |
| CPL/CPA | By audience |

### Regular Review
```
Monthly analysis:
- Audience size trends
- Performance comparison
- New audience opportunities
- Cleanup old audiences
```

## Google Ads Integration

### Linked Audiences
```
Ensure:
- GA4 linked to Google Ads
- Audiences shared
- Attribution aligned
- Consistent definitions
```

### Remarketing Lists
| List | Duration | Min Size |
|------|----------|----------|
| All visitors | 30 days | 100 |
| Cart abandoners | 7 days | 100 |
| Purchasers | 90 days | 100 |

## Documentation

### Audience Inventory
```
Maintain list of:
- All audiences
- Definitions
- Linked platforms
- Use cases
- Performance notes
```

## Escalation

Alert Team Lead for:
- Audience size issues
- Performance anomalies
- New audience requests
- Integration problems
