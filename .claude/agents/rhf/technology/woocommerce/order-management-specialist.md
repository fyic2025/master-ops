# RHF WooCommerce Order Management Specialist

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Order processing and workflow

## Role

Manage order lifecycle in WooCommerce, ensuring smooth order processing from placement to completion.

## Order Lifecycle

### Order Statuses
| Status | Meaning | Action |
|--------|---------|--------|
| Pending payment | Awaiting payment | Monitor |
| Processing | Paid, ready to fulfill | Send to fulfillment |
| On hold | Issue to resolve | Investigate |
| Completed | Delivered | Close |
| Cancelled | Order cancelled | Process refund |
| Refunded | Refund issued | Closed |
| Failed | Payment failed | Contact customer |

### Status Workflow
```
Customer places order
        ↓
Pending Payment (if bank transfer)
   or
Processing (if card payment)
        ↓
Picked and Packed
        ↓
Out for Delivery
        ↓
Completed
```

## Daily Order Processing

### Morning Routine
```
1. Check new orders overnight
2. Verify payment status
3. Flag any issues
4. Send orders to fulfillment
5. Update order statuses
6. Handle exceptions
```

### Order Verification
```
For each order:
□ Payment received
□ Items in stock
□ Delivery area valid
□ Delivery slot available
□ Special instructions noted
□ Customer contact valid
```

## Order Issues

### Common Issues
| Issue | Action |
|-------|--------|
| Payment failed | Auto-retry, then contact |
| Item out of stock | Substitute or partial refund |
| Wrong address | Contact customer |
| Duplicate order | Verify, cancel if duplicate |
| Fraud flags | Hold and investigate |

### Issue Resolution
```
When issue found:
1. Put order on hold
2. Investigate root cause
3. Contact customer if needed
4. Resolve or escalate
5. Update order notes
6. Continue processing
```

## Order Modifications

### Change Requests
| Request | Process |
|---------|---------|
| Add items | If before cutoff |
| Remove items | Adjust and refund |
| Change address | If not dispatched |
| Change delivery | If slots available |
| Cancel order | Full refund if not dispatched |

### Cutoff Rules
```
Order modifications accepted:
- Before [X]pm day before delivery
- After cutoff: Contact support
```

## Fulfillment Integration

### Send to Fulfillment
```
When order ready:
1. Mark as processing
2. Generate pick list
3. Send to fulfillment team
4. Track progress
5. Update on completion
```

### Fulfillment Status Updates
| Event | Order Update |
|-------|--------------|
| Picked | Order note |
| Packed | Order note |
| Dispatched | Out for delivery |
| Delivered | Complete |

## Reporting

### Daily Order Summary
```
ORDER SUMMARY - [Date]

New orders: X ($X)
Processing: X
On hold: X
Completed: X
Cancelled: X

Issues:
- [List any issues]

Notes:
- [Any observations]
```

### Weekly Analysis
```
Orders by status
Orders by payment method
Average processing time
Issue rate
```

## Automation

### Automated Actions
| Trigger | Action |
|---------|--------|
| Order placed | Confirmation email |
| Payment received | Update status |
| Out for delivery | SMS notification |
| Delivered | Feedback request |

### Order Notes
```
Log all actions:
- Status changes
- Customer contact
- Issue resolution
- Staff actions
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Same-day processing | >99% |
| Orders on hold | <2% |
| Cancel rate | <3% |
| Processing time | <4 hours |

## Escalation

Alert Team Lead if:
- Unusual order volume
- Payment gateway issue
- High hold/cancel rate
- Customer complaint pattern
