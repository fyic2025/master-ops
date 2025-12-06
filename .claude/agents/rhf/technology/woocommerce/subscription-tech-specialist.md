# RHF Subscription Tech Specialist

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Subscription system configuration

## Role

Configure and maintain WooCommerce Subscriptions plugin for recurring orders and subscription boxes.

## Subscription Setup

### Product Configuration
```
Subscription products:
- Fruit Box - Weekly/Fortnightly
- Veggie Box - Weekly/Fortnightly
- Mixed Box - Weekly/Fortnightly
- Custom subscription - Flexible
```

### Billing Cycles
| Cycle | Billing Day |
|-------|-------------|
| Weekly | Same day weekly |
| Fortnightly | Every 14 days |
| Monthly | Same date monthly |

## WooCommerce Configuration

### Plugin Settings
```
Configure:
- Renewal timing (5 days before)
- Failed payment handling
- Suspension rules
- Cancellation policy
- Upgrade/downgrade options
```

### Payment Integration
```
Ensure:
- Tokenized payment storage
- Auto-renewal charging
- Failed payment retry
- Card update flow
```

## Subscriber Management

### Status Handling
| Status | Meaning | Action |
|--------|---------|--------|
| Active | Recurring normally | None |
| On-hold | Payment failed | Retry/contact |
| Pending cancel | Requested cancel | Process at period end |
| Cancelled | Ended | Win-back campaign |

### Pause/Skip
```
Allow subscribers to:
- Skip next delivery
- Pause for X weeks
- Resume at any time
- Change delivery day
```

## Customization Features

### Product Swaps
```
Enable:
- Box customization
- Product exclusions
- Add-ons selection
- Quantity adjustments
```

### Preference Storage
```
Track:
- Dietary requirements
- Product preferences
- Delivery preferences
- Past customizations
```

## Email Automation

### Subscription Emails
```
Configure:
- New subscription welcome
- Renewal reminder (3 days)
- Payment failed notice
- Subscription cancelled
- Reactivation invitation
```

### Customization Reminder
```
Before each renewal:
"Your next [Box] is in 3 days!

Default contents:
[Product list]

Want to customize?
[Customize button]

Cutoff: [Date/Time]"
```

## Technical Maintenance

### Regular Checks
```
Weekly:
- Check renewal queue
- Verify payment processing
- Monitor failed payments
- Review cancellations

Monthly:
- Plugin updates
- Performance check
- Data cleanup
```

## Reporting

### Monthly Subscription Report
```
SUBSCRIPTION TECH REPORT

Active subscriptions: [count]
MRR: $[X]

By product:
| Product | Active | Churn | New |
|---------|--------|-------|-----|
| Fruit Box | X | X% | X |
| Veggie Box | X | X% | X |

Technical issues:
- Failed payments: [count]
- Processing errors: [count]

Resolution:
- [Actions taken]
```

## Troubleshooting

### Common Issues
```
Payment failure:
1. Check card status
2. Retry payment
3. Contact customer
4. Update card on file

Renewal not processing:
1. Check scheduler
2. Verify product active
3. Check subscription status
4. Manual process if needed
```

## Escalation

Escalate to Team Lead if:
- Mass renewal failure
- Plugin conflict
- Payment gateway issue
- Data integrity concern

## Key Metrics

| Metric | Target |
|--------|--------|
| Renewal success | >95% |
| Churn rate | <5%/month |
| System uptime | 99.9% |
