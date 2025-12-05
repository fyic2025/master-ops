# RHF Post-Purchase Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Post-purchase email sequences

## Role

Manage all post-purchase email communications. Drive repeat orders, collect reviews, and increase customer lifetime value.

## Post-Purchase Flow Structure

### Email 1: Order Confirmation (Immediate)
```
Trigger: Order placed
Subject: Order confirmed! #[Order ID]
Preview: Your fresh delivery is on its way

Content:
- Order summary
- Delivery date/window
- What to expect
- Contact info for issues
- Thank you message
```

### Email 2: Delivery Day Reminder (Day of)
```
Trigger: Delivery day morning
Subject: Your Red Hill Fresh order arrives today!
Preview: Get ready for fresh goodness

Content:
- Delivery window reminder
- Special instructions reminder
- What's in your order
- Storage tips preview
- Contact for issues
```

### Email 3: Delivery Confirmation (Post-delivery)
```
Trigger: Order marked delivered
Subject: Delivered! Enjoy your fresh haul
Preview: Your order has arrived

Content:
- Delivery confirmed
- Quick feedback link (1-click rating)
- Storage tips for items
- Recipe suggestions
- Support contact
```

### Email 4: Review Request (Day 3)
```
Trigger: 3 days after delivery
Subject: How was your order, [Name]?
Preview: We'd love your feedback

Content:
- Ask about experience
- Link to Google review
- Product review option
- Photo sharing invitation
- Incentive for feedback (optional)
```

### Email 5: Reorder Reminder (Day 7)
```
Trigger: 7 days after delivery
Subject: Ready for your next fresh delivery?
Preview: Restock your favourites

Content:
- Easy reorder of past items
- This week's specials
- What's new
- Suggested products
- CTA: Reorder Now
```

## Flow Logic

```
Order Placed
    ↓
Email 1: Order Confirmation (Immediate)
    ↓
[Wait until delivery day]
    ↓
Email 2: Delivery Reminder (8am delivery day)
    ↓
[Wait for delivery confirmation]
    ↓
Email 3: Delivered (2 hours post-delivery)
    ↓
[Wait 3 days]
    ↓
Email 4: Review Request (Day 3)
    ↓
[Wait 4 days]
    ↓
Another order placed? → Exit
    ↓ No
Email 5: Reorder Reminder (Day 7)
```

## Personalization

### Dynamic Content
| Element | Personalization |
|---------|-----------------|
| Products | Ordered items with images |
| Delivery | Customer's delivery day/window |
| Recipes | Based on ordered items |
| Recommendations | Based on purchase history |
| Next order | Pre-filled with past items |

### Segment Variations
| Segment | Variation |
|---------|-----------|
| First-time | Extra onboarding content |
| Repeat | Loyalty appreciation |
| VIP | Exclusive content/offers |
| Subscription | Different flow entirely |

## Recipe Suggestions

### Matching Logic
| Ordered Items | Suggested Recipe |
|---------------|------------------|
| Chicken + vegetables | Roast chicken recipe |
| Beef + onions | Slow cooker beef |
| Eggs + dairy | Breakfast ideas |
| Seasonal produce | Seasonal recipe |

### Recipe Email Section
```
┌─────────────────────────────┐
│ RECIPE IDEA                 │
│ ┌─────┐                     │
│ │Photo│ [Recipe Name]       │
│ └─────┘ Using your [items]  │
│ [See Recipe →]              │
└─────────────────────────────┘
```

## Performance Metrics

| Metric | Target |
|--------|--------|
| Order Confirmation Open | >70% |
| Review Request Open | >40% |
| Review Conversion | >5% |
| Reorder Click Rate | >8% |
| Reorder Conversion | >3% |
| Days to Second Order | Track |

## A/B Tests

Priority tests:
1. Review request timing (Day 2 vs Day 3 vs Day 5)
2. Reorder email subject lines
3. Recipe inclusion vs no recipe
4. Incentive for review vs no incentive
5. Reorder CTA placement

## Integration Requirements

- Order data from WooCommerce
- Delivery status webhook
- Product images
- Recipe database
- Customer purchase history
- Review platform links
