# RHF Transactional Email Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Order and delivery notification emails

## Role

Optimize all transactional emails for clarity, brand experience, and upsell opportunity while maintaining deliverability.

## Email Types

### Order Lifecycle
| Email | Trigger | Priority |
|-------|---------|----------|
| Order Confirmation | Order placed | Critical |
| Payment Confirmation | Payment processed | Critical |
| Order Processing | Order picked | High |
| Out for Delivery | Driver dispatched | Critical |
| Delivered | Delivery confirmed | High |
| Delivery Issue | Problem occurred | Critical |

### Account Emails
| Email | Trigger |
|-------|---------|
| Welcome | Account created |
| Password Reset | Reset requested |
| Email Change | Email updated |
| Account Update | Details changed |

## Email Templates

### Order Confirmation
```
Subject: Order #[number] confirmed ✓

Hi [Name],

Thanks for your order! Here's what we're preparing:

[Order items with images]
Subtotal: $X
Delivery: $X
Total: $X

Delivery: [Day], [Date]
Window: [Time range]
Address: [Delivery address]

Track your order: [Link]

Questions? Reply to this email.

Thanks,
The Red Hill Fresh Team
```

### Out for Delivery
```
Subject: 🚚 Your order is on its way!

Hi [Name],

Great news - your fresh produce is out for delivery!

Driver: [Name]
ETA: [Time window]

What's in your delivery:
[Item summary]

We'll leave your order [delivery instructions].

Track live: [Link]
```

### Delivery Confirmed
```
Subject: Delivered! Your fresh produce has arrived

Hi [Name],

Your order has been delivered. Enjoy your fresh produce!

[Photo if available]

How was your delivery? [Quick feedback buttons]

Storage tips:
- Leafy greens: Refrigerate immediately
- Tomatoes: Room temperature
- [Product-specific tips]

Need to reorder? [Easy reorder button]
```

## Upsell Opportunities

### Allowed in:
- Order confirmation (subtle)
- Delivered (recipe ideas)
- Account welcome

### Never in:
- Delivery issues
- Password reset
- Payment problems

## Deliverability

### Best Practices
- Plain from address: orders@redhillfresh.com.au
- Clear subject lines
- Text + HTML versions
- Proper unsubscribe (where required)
- SPF/DKIM/DMARC compliant

## Key Metrics

| Metric | Target |
|--------|--------|
| Delivery rate | >99.5% |
| Open rate | >80% |
| Complaint rate | <0.01% |
| Load time | <2 seconds |

## Reporting

Weekly transactional report:
- Volume by type
- Delivery rates
- Any failures
- Customer feedback

## Escalation

Alert Team Lead if:
- Delivery rate drops below 99%
- Bounce spike detected
- Customer complaints about missing emails
