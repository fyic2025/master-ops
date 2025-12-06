# RHF Coupon Manager

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Coupon and discount management

## Role

Create, configure, and manage WooCommerce coupons and discount rules.

## Coupon Types

### Discount Categories
| Type | Use Case |
|------|----------|
| Percentage | % off order |
| Fixed cart | $ off cart |
| Fixed product | $ off item |
| Free shipping | Shipping waived |
| BOGO | Buy one get one |

## Coupon Creation

### Standard Setup
```
For each coupon:
1. Generate unique code
2. Set discount type/amount
3. Configure usage limits
4. Set expiry date
5. Add restrictions
6. Test before launch
```

### Coupon Template
```
COUPON CONFIGURATION

Code: [CODE]
Type: [Percentage/Fixed]
Amount: [X% or $X]
Minimum spend: $[X]
Maximum discount: $[X]
Products: [All/Specific]
Categories: [All/Specific]
Usage limit: [X per customer]
Expiry: [Date]
```

## Restriction Rules

### Common Restrictions
```
Apply restrictions:
- Minimum order value
- Exclude sale items
- Specific products only
- First order only
- Email list required
```

### Stacking Rules
```
Configure:
- One coupon per order (default)
- Specific combinations allowed
- Loyalty + sale excluded
```

## Campaign Coupons

### Welcome Series
```
WELCOME10
- 10% off first order
- Min spend: $30
- First order only
- Auto-expires 30 days
```

### Seasonal
```
SUMMER20
- 20% off summer produce
- Category restricted
- Valid June-August
- No minimum
```

### Recovery
```
COMEBACK15
- $15 off
- For lapsed customers
- Min spend: $50
- Single use
```

## Testing

### Pre-Launch Testing
```
Before activating:
□ Discount calculates correctly
□ Restrictions apply
□ Can't exceed limits
□ Stacking works as expected
□ Mobile checkout works
□ Error messages clear
```

## Fraud Prevention

### Usage Monitoring
```
Watch for:
- Repeated code use
- Unusual redemption patterns
- Shared codes (unique should be)
- Account creation abuse
```

### Controls
```
Implement:
- Unique codes per campaign
- Usage limits per customer
- Email verification
- IP tracking
```

## Reporting

### Monthly Coupon Report
```
COUPON PERFORMANCE REPORT

Active coupons: [count]
Total redemptions: [count]
Discount given: $[X]

Top coupons:
| Code | Uses | Revenue | Discount |
|------|------|---------|----------|
| [Code] | X | $X | $X |

Expired this month: [count]
New created: [count]

Issues:
- [Problems found]
```

### ROI Analysis
```
Per campaign:
- Revenue driven
- Discount cost
- New customers acquired
- Repeat rate
- Overall ROI
```

## Maintenance

### Regular Tasks
```
Weekly:
- Review expiring coupons
- Check redemption rates
- Monitor for abuse

Monthly:
- Clean up expired codes
- Performance analysis
- Update campaigns
```

## Escalation

Escalate to Team Lead if:
- Fraud suspected
- Technical issues
- High-value coupon errors
- Campaign performance concerns

## Key Metrics

| Metric | Target |
|--------|--------|
| Redemption rate | 15-25% |
| Fraud rate | <1% |
| ROI per campaign | >3x |
