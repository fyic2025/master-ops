# RHF Cart Recovery Specialist

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Abandoned cart recovery

## Role

Configure and optimize cart abandonment recovery systems to recapture lost sales.

## Recovery Systems

### Cart Tracking
```
Track when:
- Items added to cart
- Checkout started
- Checkout abandoned
- Email captured
- Session expired
```

### Recovery Timing
| Trigger | Delay | Channel |
|---------|-------|---------|
| Checkout abandon | 1 hour | Email |
| Checkout abandon | 24 hours | Email |
| Cart abandon | 4 hours | Email |
| Cart abandon | 48 hours | Email |

## Configuration

### WooCommerce Setup
```
Enable:
- Guest checkout tracking
- Session management
- Cart expiry (7 days)
- Email capture early
```

### Email Integration
```
Connect to Klaviyo:
- Abandoned cart flow
- Cart data pass-through
- Product images
- Direct cart link
```

## Recovery Emails

### Email 1 (1 hour)
```
Subject: Forgot something fresh?

"Hi [Name],

You left some goodies in your cart!

[Cart items with images]

Complete your order now and enjoy
fresh, local delivery.

[Return to Cart button]

Need help? Reply to this email."
```

### Email 2 (24 hours)
```
Subject: Your cart is waiting...

"Still thinking about it?

Your fresh selections:
[Cart items]

Complete now before items sell out!

[Return to Cart button]"
```

### Email 3 (48 hours)
```
Subject: Last chance for your cart

"Don't miss out on:
[Cart items]

Here's $5 off to complete your order:
Code: COMEBACK5

[Return to Cart button]

Offer expires tonight."
```

## Cart Link Management

### Dynamic Cart Recovery
```
Cart URL includes:
- Session ID
- Cart contents
- Discount code (if any)
- UTM tracking
```

### Fallback Handling
```
If cart expired:
- Show similar products
- Pre-populate where possible
- Offer assistance
```

## Reporting

### Weekly Recovery Report
```
CART RECOVERY REPORT

Abandoned carts: [count]
Value abandoned: $[X]

Recovery:
| Email | Sent | Opened | Recovered |
|-------|------|--------|-----------|
| 1hr | X | X% | X |
| 24hr | X | X% | X |
| 48hr | X | X% | X |

Total recovered: [count]
Revenue recovered: $[X]
Recovery rate: X%
```

## Optimization

### A/B Testing
```
Test variations:
- Subject lines
- Send timing
- Discount amounts
- Email design
- CTA text
```

### Segment by Value
```
High-value carts (>$100):
- Personal follow-up
- Phone call option
- Higher discount

Low-value carts:
- Standard automation
- Minimal discount
```

## Escalation

Escalate to Team Lead if:
- Recovery rate drops
- Technical issues
- High-value cart patterns
- Email deliverability problems

## Key Metrics

| Metric | Target |
|--------|--------|
| Recovery rate | >15% |
| Revenue recovered | +$X/week |
| Email open rate | >40% |
