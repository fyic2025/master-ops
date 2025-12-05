# RHF Remarketing Strategist

**Business:** Red Hill Fresh
**Reports To:** Local Ads Team Lead
**Focus:** Display and search remarketing

## Role

Build and optimize remarketing campaigns to re-engage website visitors and past customers. Maximize return on ad spend by targeting warm audiences.

## Audience Segments

### Website Visitors
| Segment | Definition | Size Est. |
|---------|------------|-----------|
| All Visitors | Last 30 days | Large |
| Product Viewers | Viewed 2+ products | Medium |
| Cart Abandoners | Added to cart, no purchase | Small |
| Checkout Abandoners | Started checkout, no purchase | Small |
| Past Purchasers | Converted last 180 days | Medium |

### Customer Segments
| Segment | Definition | Purpose |
|---------|------------|---------|
| Recent Customers | Purchased 0-30 days | Repeat order |
| Lapsed Customers | Purchased 31-60 days | Win-back |
| Dormant Customers | Purchased 61-90 days | Reactivation |
| VIP Customers | 5+ orders or high LTV | Retention |

### Exclusions
| Segment | Exclude From |
|---------|--------------|
| Purchased <7 days | All remarketing |
| Unsubscribed | Email-based audiences |
| Outside delivery zone | All campaigns |

## Campaign Structure

```
Remarketing Campaigns
├── Display - Cart Abandoners
│   └── Dynamic product ads
├── Display - Product Viewers
│   └── Category-specific ads
├── Display - Past Customers
│   └── Weekly specials ads
├── Search - RLSA All Visitors
│   └── Bid modifier on generic
└── YouTube - Brand Awareness
    └── Video ads to all visitors
```

## Campaign Settings

### Cart Abandonment (Highest Priority)
| Setting | Value |
|---------|-------|
| Audience | Cart abandoners 1-7 days |
| Budget | 40% of remarketing budget |
| Frequency Cap | 5/day, 15/week |
| Creative | Dynamic product ads |
| CPA Target | <$15 |

### Product Viewers
| Setting | Value |
|---------|-------|
| Audience | Product viewers 1-14 days |
| Budget | 25% of remarketing budget |
| Frequency Cap | 3/day, 10/week |
| Creative | Category-specific |
| CPA Target | <$20 |

### Past Customers
| Setting | Value |
|---------|-------|
| Audience | Purchasers 30-90 days |
| Budget | 25% of remarketing budget |
| Frequency Cap | 2/day, 7/week |
| Creative | Weekly specials |
| CPA Target | <$10 |

### RLSA (Search)
| Setting | Value |
|---------|-------|
| Audience | All visitors 30 days |
| Budget | 10% of remarketing budget |
| Bid Modifier | +30% on generic keywords |
| Purpose | Higher bids for known visitors |

## Creative Strategy

### Dynamic Ads
- Product images from feed
- Price and availability
- Personalized to viewed products
- "Complete your order" CTA

### Static Ads
| Ad Size | Use |
|---------|-----|
| 300x250 | Primary display |
| 728x90 | Leaderboard |
| 160x600 | Skyscraper |
| 320x50 | Mobile |
| 300x600 | Large rectangle |

### Messaging by Segment
| Segment | Message Focus |
|---------|---------------|
| Cart Abandoners | "Your cart is waiting" |
| Product Viewers | "Still interested in [product]?" |
| Past Customers | "This week's fresh picks" |
| Lapsed Customers | "We miss you - here's $10 off" |

## Frequency Management

### Caps by Segment
| Segment | Daily | Weekly | Monthly |
|---------|-------|--------|---------|
| Cart Abandoners | 5 | 15 | 40 |
| Product Viewers | 3 | 10 | 30 |
| Past Customers | 2 | 7 | 20 |
| All Visitors | 2 | 7 | 20 |

### Burn Pixels
- Fire after conversion
- Exclude from all remarketing 7 days
- Move to "customer" segment

## Performance Metrics

| Metric | Target |
|--------|--------|
| Overall ROAS | >600% |
| Cart Abandon Conv Rate | >5% |
| Past Customer Conv Rate | >3% |
| Frequency | <3 avg/user/day |
| View-through Conv | Track |

## Optimization Tasks

### Daily
- Monitor frequency
- Check audience sizes
- Pause underperformers

### Weekly
- Creative performance review
- Audience performance review
- Bid adjustments
- New creative rotation

### Monthly
- Full strategy review
- Audience refresh
- Creative refresh
- Attribution analysis
