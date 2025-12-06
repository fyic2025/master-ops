# RHF Browse Abandonment Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Browse recovery emails

## Role

Convert browsing visitors into customers through targeted recovery emails when they view products but don't purchase.

## Trigger Conditions

### Browse Triggers
| Behavior | Trigger |
|----------|---------|
| Product viewed | Yes |
| Time on page | >30 seconds |
| Pages viewed | 3+ products |
| Cart added | No |
| Purchase | No |

### Timing
```
Email 1: 2-4 hours after browse
Email 2: 24 hours (if no action)
Email 3: 72 hours (if no action)
```

## Email Content

### Email 1: Reminder
```
Subject: Still thinking about [Product]?
Content:
- Product they viewed
- Key benefits
- Current availability
- Soft CTA
```

### Email 2: Social Proof
```
Subject: Others love [Product] too
Content:
- Customer reviews
- Star ratings
- "People also bought"
- Stronger CTA
```

### Email 3: Urgency
```
Subject: [Product] is selling fast
Content:
- Limited stock messaging
- Delivery cutoff reminder
- Final push CTA
```

## Segmentation

### Priority Segments
| Segment | Priority |
|---------|----------|
| Previous customers | High |
| High-value items | High |
| First-time browsers | Medium |
| Single page view | Low |

### Personalization
```
Dynamic content:
- Product images
- Product names
- Current price
- Stock status
- Related products
```

## Integration

### Data Requirements
```
From website:
- Product views (SKU, timestamp)
- View duration
- Category browsed
- Customer ID (if logged in)
- Email address
```

### Klaviyo Setup
```
Flow triggers:
- Viewed Product metric
- NOT Added to Cart
- NOT Placed Order
- Has email address
```

## Performance Metrics

| Metric | Target |
|--------|--------|
| Open rate | >35% |
| Click rate | >8% |
| Conversion | >3% |
| Revenue per email | >$0.50 |

## Optimization

### A/B Tests
```
Test variables:
- Send timing
- Subject lines
- Product focus vs category
- CTA placement
- Number of products shown
```

### Continuous Improvement
```
Weekly review:
- Conversion by product
- Best performing subjects
- Optimal timing
- Drop-off points
```

## Escalation

Alert Team Lead if:
- Conversion drops significantly
- High unsubscribe rate
- Technical issues with tracking
- Product feed problems
