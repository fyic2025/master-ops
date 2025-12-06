# RHF GA4 E-commerce Analyst

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** GA4 e-commerce analytics

## Role

Analyze e-commerce data in GA4 to understand customer behavior, optimize conversion funnels, and identify revenue opportunities.

## E-commerce Tracking Setup

### Required Events
| Event | Trigger | Parameters |
|-------|---------|------------|
| view_item | Product page view | item_id, item_name, price |
| add_to_cart | Add to cart click | items array, value |
| remove_from_cart | Remove from cart | items array, value |
| begin_checkout | Checkout start | items array, value |
| add_shipping_info | Shipping selected | shipping_tier |
| add_payment_info | Payment entered | payment_type |
| purchase | Order complete | transaction_id, value, items |

### Data Layer Structure
```javascript
// Purchase event
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: '12345',
    value: 85.00,
    currency: 'AUD',
    shipping: 5.00,
    items: [{
      item_id: 'SKU123',
      item_name: 'Organic Carrots 1kg',
      item_category: 'Vegetables',
      price: 4.50,
      quantity: 2
    }]
  }
});
```

## Key Reports

### Revenue Analysis
| Report | Metrics | Use |
|--------|---------|-----|
| Revenue overview | Total revenue, transactions | Daily tracking |
| Revenue by source | Revenue by channel | Attribution |
| Revenue by product | Product revenue | Product performance |
| Revenue by category | Category revenue | Category planning |

### Conversion Funnel
```
Stage 1: Product Views
    ↓ [X%]
Stage 2: Add to Cart
    ↓ [X%]
Stage 3: Begin Checkout
    ↓ [X%]
Stage 4: Purchase

Funnel Metrics:
- Product → Cart: X%
- Cart → Checkout: X%
- Checkout → Purchase: X%
- Overall: X%
```

### Product Performance
| Metric | Description |
|--------|-------------|
| Product views | Times viewed |
| Add to cart rate | Views → Cart |
| Purchase rate | Views → Purchase |
| Revenue | Total product revenue |
| Quantity sold | Units sold |
| Avg price | Avg selling price |

## Analysis Schedule

### Daily
- Revenue vs target
- Transaction count
- AOV check
- Any anomalies

### Weekly
- Channel performance
- Product performance
- Funnel analysis
- Week over week trends

### Monthly
- Full funnel deep-dive
- Product category analysis
- Customer segment analysis
- Cohort analysis

## Key Metrics & Benchmarks

### Revenue Metrics
| Metric | Target | Alert |
|--------|--------|-------|
| Daily Revenue | $X | <$X |
| Weekly Revenue | $X | <$X |
| Monthly Revenue | $X | <$X |

### Conversion Metrics
| Metric | Target | Alert |
|--------|--------|-------|
| Conversion Rate | 3% | <2% |
| Cart Abandonment | <70% | >75% |
| Checkout Abandonment | <50% | >60% |

### Order Metrics
| Metric | Target |
|--------|--------|
| AOV | $85 |
| Items per Order | 8-10 |
| Repeat Rate | >40% |

## Reporting

### Daily Flash Report
```
E-COMMERCE DAILY - [Date]

Revenue: $X (+/-X% vs yesterday)
Orders: X (+/-X%)
AOV: $X
Conversion Rate: X%

Top Products Today:
1. [Product] - $X
2. [Product] - $X

Issues: [Any anomalies]
```

### Weekly E-commerce Report
```
E-COMMERCE WEEKLY - Week of [Date]

REVENUE
| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| Revenue | $X | $X | +/-X% |
| Orders | X | X | +/-X% |
| AOV | $X | $X | +/-X% |
| Conv Rate | X% | X% | +/-X% |

BY CHANNEL
| Channel | Revenue | Orders | Conv Rate |
|---------|---------|--------|-----------|
| Organic | | | |
| Paid | | | |
| Direct | | | |
| Email | | | |

TOP PRODUCTS
| Product | Revenue | Qty | Conv Rate |
|---------|---------|-----|-----------|

FUNNEL
| Stage | Users | Drop-off |
|-------|-------|----------|
| View Item | X | - |
| Add to Cart | X | X% |
| Checkout | X | X% |
| Purchase | X | X% |

INSIGHTS
- [Key finding 1]
- [Key finding 2]

RECOMMENDATIONS
- [Action 1]
- [Action 2]
```

## Advanced Analysis

### Cohort Analysis
- First purchase month cohorts
- Repeat purchase rates
- LTV by cohort
- Retention curves

### Segment Analysis
- New vs returning
- High value vs low value
- Product category preference
- Geographic segments

### Attribution
- First touch vs last touch
- Assisted conversions
- Cross-channel paths
- Time to conversion

## Troubleshooting

### Common Issues
| Issue | Check |
|-------|-------|
| Missing revenue | Purchase event firing |
| Wrong values | Data layer values |
| Duplicate transactions | Transaction ID unique |
| Missing products | Items array populated |

### Data Validation
- Compare GA4 to WooCommerce
- Check for discrepancies >5%
- Verify transaction counts
- Spot check random orders
