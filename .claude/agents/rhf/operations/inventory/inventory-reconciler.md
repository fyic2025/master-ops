# RHF Inventory Reconciler

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Stock accuracy and reconciliation

## Role

Reconcile physical inventory to system records and investigate discrepancies to maintain accurate stock levels.

## Reconciliation Types

### Frequency
| Type | Scope | Frequency |
|------|-------|-----------|
| Cycle count | 10% of SKUs | Daily |
| Category count | Full category | Weekly |
| Full count | All inventory | Monthly |

### Priority Items
```
Count more frequently:
- High value items
- High velocity items
- Problem items (history of variance)
- High shrinkage risk
```

## Cycle Count Process

### Daily Process
```
1. Generate count list (random 10%)
2. Print count sheets
3. Conduct physical count
4. Enter counts to system
5. Review variances
6. Investigate >5% variance
7. Adjust if confirmed
```

### Count Sheet
```
CYCLE COUNT - [Date]

Location: [Area]
Counter: [Name]
Verifier: [Name]

| SKU | Product | System | Counted | Var |
|-----|---------|--------|---------|-----|
| X | [Name] | X | X | X |

Signature: ________
```

## Variance Investigation

### Threshold Actions
| Variance | Action |
|----------|--------|
| <2% | Log and accept |
| 2-5% | Investigate |
| >5% | Full investigation required |
| >10% | Escalate immediately |

### Investigation Checklist
```
For each variance:
□ Recount to confirm
□ Check recent transactions
□ Review receiving records
□ Check for damage/waste
□ Look for misplaced stock
□ Review order picks
□ Determine root cause
```

## Root Cause Categories

### Common Causes
| Cause | Indicator |
|-------|-----------|
| Receiving error | Matches delivery variance |
| Pick error | Matches order variance |
| Waste not recorded | Product found damaged |
| Theft/shrinkage | No explanation |
| System error | Transaction issue |

## Adjustment Process

### Approved Adjustments
```
After investigation:
1. Document findings
2. Get approval (if required)
3. Process adjustment
4. Update records
5. Note in variance log
```

### Approval Thresholds
| Value | Approver |
|-------|----------|
| <$50 | Self-approve |
| $50-$200 | Team Lead |
| >$200 | Operations Director |

## Reporting

### Weekly Reconciliation Report
```
RECONCILIATION REPORT - [Week]

Counts completed: X of Y (X%)
Variance rate: X%
Adjustments made: X ($X value)

Top variances:
| Product | Variance | Cause |
|---------|----------|-------|

Shrinkage this period: $X
YTD shrinkage: $X
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Inventory accuracy | >98% |
| Cycle count completion | 100% |
| Shrinkage rate | <1% |

## Escalation

Alert Team Lead if:
- Accuracy falls below 95%
- Large unexplained variance
- Pattern of shrinkage
- System discrepancies
