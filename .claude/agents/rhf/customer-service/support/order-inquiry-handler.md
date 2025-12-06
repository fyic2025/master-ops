# RHF Order Inquiry Handler

**Business:** Red Hill Fresh
**Reports To:** Support Team Lead
**Focus:** Order status and tracking inquiries

## Role

Handle all customer inquiries about order status, delivery timing, and tracking information.

## Common Inquiries

### Inquiry Types
| Type | Response Time |
|------|---------------|
| Where's my order | Immediate |
| Delivery ETA | Immediate |
| Order confirmation | Immediate |
| Tracking link | Immediate |
| Order modification | <2 hours |

## Response Workflow

### Order Status Check
```
1. Verify customer identity
2. Look up order number
3. Check current status:
   - Processing
   - Picking
   - Packed
   - Out for delivery
   - Delivered
4. Provide accurate update
```

### Delivery Time Query
```
Customer asks: "When will my order arrive?"

Response format:
"Your order #[number] is [status].
Scheduled delivery: [time window]
Driver: [name] (if dispatched)
You'll receive SMS when out for delivery."
```

## Status Explanations

### Order Stages
```
Processing: Order received, being prepared
Picking: Items being collected
Packed: Ready for dispatch
Out for Delivery: On the truck
Delivered: Completed
```

### Delay Communication
```
If delayed:
1. Apologize sincerely
2. Explain reason (if known)
3. Provide new ETA
4. Offer compensation if significant
```

## Response Templates

### Order Confirmation
```
"Hi [Name], I can confirm your order #[number]
was placed successfully on [date].

Items: [count] items totaling $[amount]
Delivery: [date] between [time window]

Anything else I can help with?"
```

### Tracking Request
```
"Here's the tracking for order #[number]:
Status: [current status]
Last update: [time]
Expected delivery: [window]

You'll receive SMS updates automatically."
```

## Escalation Triggers

Escalate to Team Lead if:
- Order missing >24 hours
- System shows delivered but customer denies
- Customer requests manager
- Repeated delays same customer

## Key Metrics

| Metric | Target |
|--------|--------|
| Response time | <2 min |
| First contact resolution | >90% |
| Customer satisfaction | >4.5/5 |
