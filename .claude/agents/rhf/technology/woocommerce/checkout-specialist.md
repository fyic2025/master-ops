# RHF WooCommerce Checkout Specialist

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Checkout flow optimization

## Role

Maintain and optimize the checkout experience to maximize conversion and minimize cart abandonment.

## Checkout Flow

### Current Steps
```
1. Cart Review
   - Item summary
   - Quantity adjustments
   - Delivery zone check

2. Customer Details
   - Email
   - Delivery address
   - Phone number

3. Delivery Selection
   - Delivery date
   - Time slot
   - Special instructions

4. Payment
   - Payment method
   - Card details
   - Apply coupon

5. Confirmation
   - Order summary
   - Payment confirmation
   - Next steps
```

## Checkout Configuration

### Required Fields
| Field | Required | Validation |
|-------|----------|------------|
| Email | Yes | Valid format |
| First name | Yes | Text |
| Last name | Yes | Text |
| Address | Yes | Postcode check |
| Phone | Yes | Valid format |
| Delivery date | Yes | Available slots |
| Payment | Yes | Valid method |

### Optional Fields
| Field | Purpose |
|-------|---------|
| Company | If business customer |
| Delivery notes | Instructions |
| Gift message | Gift orders |

## Payment Methods

### Enabled Methods
| Method | Provider | Status |
|--------|----------|--------|
| Credit/Debit | Stripe | Active |
| PayPal | PayPal | Active |
| Afterpay | Afterpay | Active |
| Bank Transfer | Manual | Active |

### Payment Settings
```
Stripe:
- Saved cards enabled
- 3D Secure enabled
- Apple Pay enabled
- Google Pay enabled

PayPal:
- Express checkout
- Pay in 4

Afterpay:
- Limits: $X - $X
```

## Delivery Configuration

### Delivery Slots
```
Available days: Tue-Sat
Morning: 7am-12pm
Afternoon: 12pm-5pm
Saturday: 8am-1pm

Lead time: Order by [X]pm previous day
```

### Zone Restrictions
```
Postcode validation:
- Valid: Peninsula postcodes [list]
- Invalid: Outside delivery area
- Display: Clear message + email signup
```

## Cart Rules

### Minimum Order
```
Minimum: $40
Display: Clear messaging
Shortfall: Show how much more needed
```

### Shipping/Delivery Fees
| Order Value | Fee |
|-------------|-----|
| <$80 | $X |
| $80-$120 | $X |
| >$120 | Free |

## Issue Management

### Common Issues
| Issue | Resolution |
|-------|------------|
| Payment decline | Clear error message, retry |
| Slot full | Show alternatives |
| Out of zone | Email signup offer |
| Item OOS | Substitute suggestion |

### Error Messages
```
Friendly, helpful messages:
- "This card was declined. Please try another."
- "We don't deliver to this postcode yet. Sign up!"
- "This delivery slot is now full. Try [alternative]"
```

## Conversion Optimization

### Checkout Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Cart → Checkout | X% | >70% |
| Checkout start → Complete | X% | >65% |
| Overall conversion | X% | >45% |

### Optimization Areas
```
- Reduce form fields
- Add progress indicator
- Mobile optimization
- Trust signals
- Clear error handling
- Guest checkout
```

## Testing

### Regular Testing
```
Weekly checkout test:
□ Add items to cart
□ Complete checkout
□ Test each payment method
□ Verify confirmation
□ Check email received
□ Order in admin correct
```

### A/B Testing
```
Test elements:
- Button text/color
- Field arrangement
- Progress indicators
- Trust badges
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Checkout conversion | >65% |
| Payment success rate | >98% |
| Error rate | <2% |
| Mobile conversion | >50% |

## Reporting

Weekly checkout report:
- Conversion rates
- Drop-off points
- Error occurrences
- Test results

## Escalation

Alert Team Lead if:
- Checkout broken
- Payment gateway issue
- Major conversion drop
- Fraud concerns
