# RHF Order Validator

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Order verification and fraud prevention

## Role

Validate orders for accuracy, completeness, and legitimacy before releasing to fulfillment.

## Validation Checks

### Standard Validation
```
Every order checked for:
□ Customer account valid
□ Contact details complete
□ Delivery address verified
□ Zone coverage confirmed
□ Order value reasonable
□ Payment processed
```

### Address Validation
```
Verify:
- Address format correct
- Postcode matches suburb
- Within delivery zone
- Deliverable location
- Special instructions clear
```

## Fraud Detection

### Red Flags
| Indicator | Risk Level |
|-----------|------------|
| New customer, large order | Medium |
| Multiple failed payments | High |
| Rush delivery, premium items | Medium |
| Address mismatch | High |
| Unusual quantity | Medium |

### Fraud Response
```
If suspicious:
1. Flag order for review
2. Verify payment
3. Contact customer
4. Confirm identity
5. Clear or cancel
```

## Payment Verification

### Payment Status
```
Check payment:
□ Transaction approved
□ Funds captured
□ No chargebacks pending
□ Card matches customer
```

### Payment Issues
| Issue | Action |
|-------|--------|
| Declined | Contact customer |
| Pending | Hold until cleared |
| Partial | Contact customer |

## Order Accuracy

### Item Verification
```
Verify each item:
□ Product code valid
□ Price correct
□ Quantity reasonable
□ In stock
□ Compatible items
```

### Price Validation
```
Check for:
- Price overrides
- Discount codes valid
- Total calculated correctly
- Delivery fee correct
```

## Special Order Validation

### High-Value Orders
```
Orders over $X:
- Additional verification
- Confirm with customer
- Manager approval
- Document confirmation
```

### Unusual Orders
```
Flag for review:
- Bulk quantities
- First-time large order
- Rush same-day
- Unusual combinations
```

## Validation Queue

### Processing Order
```
Priority:
1. Same-day orders
2. Orders with issues
3. Standard orders
4. Future orders
```

### SLA
| Order Type | Validation Time |
|------------|-----------------|
| Same-day | <15 minutes |
| Standard | <30 minutes |
| Flagged | <1 hour |

## Reporting

### Daily Report
```
ORDER VALIDATION REPORT

Orders validated: X
Passed first time: X%
Issues found: X
Fraud flags: X
Orders held: X

Common issues:
- [Issue 1]: X occurrences
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Validation accuracy | >99% |
| First-pass rate | >95% |
| Fraud catch rate | >99% |

## Escalation

Alert Team Lead if:
- Confirmed fraud attempt
- Unusual pattern detected
- High-value order issue
- System validation failure
