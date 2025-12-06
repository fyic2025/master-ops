# RHF Order Consolidator

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Multi-order and add-on management

## Role

Consolidate multiple orders for the same customer and manage order additions efficiently.

## Consolidation Scenarios

### When to Consolidate
| Scenario | Action |
|----------|--------|
| Same customer, same day | Merge orders |
| Add-on to existing | Combine items |
| Multiple addresses | Keep separate |
| Different time slots | Keep separate |

## Order Merging

### Merge Process
```
1. Identify duplicate customer
2. Check delivery compatibility
3. Combine items
4. Adjust packaging
5. Single delivery
6. Combined invoice
```

### Merge Criteria
```
Can merge if:
□ Same delivery address
□ Same delivery date
□ Compatible time slots
□ Not already packed
□ Not already dispatched
```

## Add-On Orders

### Add-On Handling
```
When customer adds items:
1. Check original order status
2. If not picked - add to order
3. If picked - separate pick
4. Combine at packing
5. Adjust delivery note
```

### Cutoff Times
| Original Order | Add-On Cutoff |
|----------------|---------------|
| Tomorrow | Today 5pm |
| Today | Too late |
| Future | Day before 5pm |

## System Updates

### Order Modifications
```
When consolidating:
□ Update item count
□ Adjust totals
□ Merge payments
□ Single invoice
□ Update pick list
□ Notify packing
```

### Documentation
```
Create consolidation record:
- Original orders
- Combined order number
- Items from each
- Total value
- Notes
```

## Customer Communication

### Confirmation
```
When orders merged:
"Hi [Name], we've combined your orders
[#X] and [#Y] for delivery on [date].

Total: $X
Items: X

Thank you!"
```

### Add-On Confirmation
```
"Your additional items have been
added to order [#X]:
- [Item 1]
- [Item 2]

New total: $X"
```

## Efficiency Benefits

### Cost Savings
```
Consolidation saves:
- Delivery cost (one trip)
- Packing time
- Materials
- Driver time
```

### Track Savings
```
| Month | Orders Merged | Deliveries Saved |
|-------|---------------|------------------|
| [Month] | X | X |
```

## Edge Cases

### Cannot Consolidate
```
Keep separate when:
- Different addresses
- Conflicting time slots
- One is gift order
- Different recipients
- Already dispatched
```

### Partial Merge
```
Sometimes merge:
- Same address items
- Leave gift separate
- Note relationship
```

## Reporting

### Daily Report
```
CONSOLIDATION REPORT

Orders reviewed: X
Orders merged: X
Add-ons processed: X
Deliveries saved: X

Estimated savings: $X
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Consolidation rate | >90% eligible |
| Add-on success | >95% |
| Delivery savings | Track monthly |

## Escalation

Alert Team Lead if:
- System merge issue
- Customer complaint
- Missed consolidation
- Payment discrepancy
