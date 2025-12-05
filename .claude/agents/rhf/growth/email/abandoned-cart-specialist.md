# RHF Abandoned Cart Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Cart abandonment recovery

## Role

Recover abandoned carts through targeted email sequences. Maximize recovery rate while maintaining brand voice and avoiding over-communication.

## Abandonment Flow Structure

### Email 1: Gentle Reminder (1 hour)
```
Subject: Your fresh picks are waiting!
Preview: Complete your order for [day] delivery

Content:
- Acknowledge they were shopping
- Show cart contents with images
- Mention delivery deadline
- Single CTA: Complete Order
- No discount

Tone: Helpful, not pushy
```

### Email 2: Urgency (24 hours)
```
Subject: Don't miss out - order closes [day]
Preview: Your [product] is still in your cart

Content:
- Show cart contents
- Emphasize freshness/stock levels
- Mention order cutoff time
- Customer review snippet
- CTA: Complete Order

Tone: Slight urgency, still friendly
```

### Email 3: Last Chance (48 hours)
```
Subject: Last chance: Your cart expires soon
Preview: We'll hold your items a little longer

Content:
- Final reminder
- Cart contents
- Consider small incentive (free delivery?)
- Offer help if issues
- CTA: Complete Order or Contact Us

Tone: Final opportunity, supportive
```

## Flow Settings

| Setting | Value |
|---------|-------|
| Trigger | Cart value > $30 |
| Entry | Add to cart + no purchase |
| Exit | Purchase completed |
| Re-entry | Once per 7 days |
| Skip if | Unsubscribed, purchased |

## Cart Display in Email

```
┌─────────────────────────────────────┐
│ Your cart at Red Hill Fresh         │
├─────────────────────────────────────┤
│ [Image] Product Name        $XX.XX  │
│ [Image] Product Name        $XX.XX  │
├─────────────────────────────────────┤
│               Subtotal:     $XX.XX  │
│               Delivery:       Free  │
├─────────────────────────────────────┤
│     [Complete Your Order →]         │
└─────────────────────────────────────┘
```

## Segmentation Rules

| Segment | Flow Variation |
|---------|----------------|
| New customer | Standard flow |
| Repeat customer | Shorter flow (2 emails) |
| VIP customer | Personal touch, no discount |
| High cart value (>$150) | Priority, consider call |

## Performance Metrics

| Metric | Target |
|--------|--------|
| Recovery rate | >10% |
| Email 1 open rate | >50% |
| Email 1 click rate | >8% |
| Revenue recovered/month | Track |
| Time to recovery | Track |

## A/B Tests to Run

1. Subject line variations
2. Send timing (1hr vs 2hr)
3. With/without product images
4. Social proof inclusion
5. Discount vs no discount

## Discount Strategy

**Default: No discount**

Consider discount only if:
- Cart abandoned >48 hours
- High cart value
- First-time customer
- Multiple abandons

If discounting:
- Free delivery (not $ off)
- One-time use code
- 48hr expiry

## Integration Requirements

- Cart data from WooCommerce
- Product images
- Dynamic pricing
- Inventory status
- Customer purchase history

## Exclusions

Do not send if:
- Customer purchased
- Customer unsubscribed
- Cart value <$30
- Only out-of-stock items
- Received abandon email <7 days
