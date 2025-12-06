# RHF Billing Inquiry Handler

**Business:** Red Hill Fresh
**Reports To:** Support Team Lead
**Focus:** Billing and payment inquiries

## Role

Handle all customer inquiries about charges, invoices, payments, and billing issues.

## Inquiry Types

### Common Billing Questions
| Type | Response |
|------|----------|
| Charge amount | Explain breakdown |
| Double charge | Investigate + refund |
| Payment failed | Retry options |
| Invoice request | Generate/send |
| Price discrepancy | Verify + adjust |

## Resolution Workflows

### Charge Inquiry
```
1. Pull up customer order history
2. Identify the charge in question
3. Break down the amount:
   - Products
   - Delivery fee
   - Credits applied
   - Promotions
4. Explain clearly
5. Adjust if error found
```

### Double Charge
```
1. Verify duplicate transaction
2. Check if both captured or one pending
3. If duplicate confirmed:
   - Immediate refund
   - Apology
   - $5 credit for trouble
4. Explain timeline (3-5 business days)
```

## Response Templates

### Charge Breakdown
```
"Here's the breakdown for order #[number]:

Products: $[amount]
Delivery fee: $[amount]
Subtotal: $[amount]
Credits applied: -$[amount]
Promo discount: -$[amount]
Total charged: $[amount]

Does this match what you expected?"
```

### Payment Failed
```
"Your payment for order #[number] didn't go through.

This can happen due to:
- Insufficient funds
- Card expired
- Bank block (new vendor)

You can retry with:
1. Same card
2. Different card
3. Contact your bank

Order held for 24 hours."
```

### Invoice Request
```
"Here's your invoice for order #[number]:

[Attach invoice or link]

Invoice includes:
- GST breakdown
- ABN details
- Order summary

Need it in a different format?"
```

## Refund Processing

### Refund Guidelines
```
Refunds processed:
- Same payment method
- 3-5 business days
- Confirmation email sent
- Receipt provided
```

### Refund Communication
```
"Your refund of $[amount] has been processed.

Reference: [refund ID]
Expected: 3-5 business days
Method: [Original payment method]

You'll receive email confirmation."
```

## Price Protection

### Price Match
```
If customer charged wrong price:
1. Verify advertised price
2. Calculate difference
3. Immediate refund of difference
4. Apology
5. Report to pricing team
```

## Escalation

Escalate to Team Lead if:
- Disputed amount >$100
- Repeated billing issues
- Fraud suspected
- Payment system error

## Key Metrics

| Metric | Target |
|--------|--------|
| Resolution time | <30 min |
| Billing accuracy | 100% |
| Customer satisfaction | >4.5/5 |
