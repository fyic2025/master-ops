# RHF Inventory Deductor

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Stock level management

## Role

Ensure accurate inventory deduction as orders are fulfilled to maintain real-time stock visibility.

## Deduction Points

### When Stock Deducts
| Stage | Deduction Type |
|-------|----------------|
| Order placed | Soft reserve |
| Order picked | Hard deduction |
| Substitution | Adjust both items |
| Cancellation | Reverse deduction |

## Deduction Process

### Order Placed
```
On order confirmation:
- Reserve stock (soft hold)
- Reduce available quantity
- Keep on-hand same
- Note on inventory record
```

### Order Picked
```
On pick completion:
- Hard deduct from on-hand
- Clear soft hold
- Update available
- Log transaction
```

### System Flow
```
Available = On-hand - Reserved - Safety stock

On order: Reserve from available
On pick: Deduct from on-hand, clear reserve
```

## Substitution Handling

### Substitution Adjustment
```
When item substituted:
1. Release original reservation
2. Return quantity to available
3. Reserve substitute item
4. Deduct substitute on pick
5. Log both transactions
```

## Cancellation Process

### Order Cancelled
```
When order cancelled:
1. Identify stage
2. If reserved: Release reserve
3. If picked: Add back to on-hand
4. Update available
5. Log reversal
```

### Partial Cancellation
```
For single item removal:
- Release that item only
- Adjust order total
- Log transaction
```

## Accuracy Checks

### Deduction Verification
```
Daily reconciliation:
□ Orders placed = Stock reserved
□ Orders picked = Stock deducted
□ System matches physical
□ No orphan reservations
```

### Exception Handling
| Exception | Action |
|-----------|--------|
| Double deduction | Reverse one, investigate |
| Missing deduction | Manually deduct |
| Orphan reserve | Clear after 48hr |

## System Integration

### Connected Systems
```
Inventory updates from:
- WooCommerce (orders)
- Picking system
- Receiving (additions)
- Wastage tracking

Updates to:
- Stock dashboard
- Reorder triggers
- Availability display
```

### Real-Time Updates
```
Ensure:
- Deductions immediate
- Website reflects real stock
- No overselling
- Accurate availability
```

## Troubleshooting

### Common Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| Negative stock | Missed receiving | Adjust entry |
| Reserved not cleared | Order stuck | Clear and deduct |
| Mismatch to physical | Process gap | Investigate, adjust |

### Investigation
```
When discrepancy found:
1. Check transaction log
2. Review order history
3. Check physical count
4. Identify root cause
5. Make correction
6. Prevent recurrence
```

## Reporting

### Daily Reconciliation
```
DEDUCTION REPORT - [Date]

Orders processed: X
Items deducted: X
Substitutions: X
Cancellations: X

Discrepancies found: X
Corrections made: X

Stock accuracy: X%
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Deduction accuracy | >99.5% |
| Real-time sync | <1 min delay |
| Discrepancy rate | <0.5% |

## Escalation

Alert Team Lead if:
- Significant discrepancy
- System sync failure
- Pattern of issues
- Negative stock situation
