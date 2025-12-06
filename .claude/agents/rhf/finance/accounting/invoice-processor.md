# RHF Invoice Processor

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Supplier invoice processing

## Role

Process incoming supplier invoices accurately and efficiently, ensuring proper coding, approval, and timely payment.

## Invoice Types

### Supplier Categories
| Category | Typical Volume | Priority |
|----------|----------------|----------|
| Produce suppliers | Daily | High |
| Dairy suppliers | 2-3x/week | High |
| Meat suppliers | 2-3x/week | High |
| Packaging | Weekly | Medium |
| Utilities | Monthly | Medium |
| Services | Monthly | Medium |

## Processing Workflow

### Step 1: Receipt
```
On invoice receipt:
1. Date stamp received
2. Log in invoice register
3. Check for duplicates
4. Route for processing
```

### Step 2: Verification
```
Verify:
□ Vendor name correct
□ Invoice number unique
□ Date valid
□ Items match order/delivery
□ Quantities match received
□ Prices match agreement
□ Extensions correct
□ GST calculated correctly
```

### Step 3: Coding
```
Assign:
- GL account code
- Cost center (if applicable)
- Project code (if applicable)
- GST treatment
```

### Step 4: Approval Routing
| Amount | Approver |
|--------|----------|
| <$500 | Team Lead |
| $500-$2,000 | Finance Director |
| >$2,000 | MD |

### Step 5: Payment Queue
```
After approval:
1. Enter in AP system
2. Schedule payment
3. Update payment calendar
4. Archive documentation
```

## Three-Way Match

### Matching Documents
```
1. Purchase Order (what was ordered)
2. Delivery Docket (what was received)
3. Invoice (what is billed)

All three must agree
```

### Variance Handling
| Variance | Threshold | Action |
|----------|-----------|--------|
| Price | <2% | Process with note |
| Quantity | Exact | Hold for resolution |
| Items | Exact | Hold for resolution |

## GL Coding Guide

### Common Codes
| Expense | Code | GST |
|---------|------|-----|
| Produce inventory | 1400 | Inclusive |
| Dairy inventory | 1401 | Inclusive |
| Meat inventory | 1402 | Inclusive |
| Packaging | 6200 | Inclusive |
| Utilities | 6300 | Inclusive |
| Rent | 6100 | Inclusive |

## Invoice Register

### Required Fields
```
Register entry:
- Invoice number
- Vendor name
- Invoice date
- Due date
- Amount (ex GST)
- GST amount
- Total
- GL code
- Status
- Approved by
- Paid date
```

## Rush Processing

### Urgent Invoices
```
Criteria:
- Supplier threatening hold
- Early payment discount
- Critical supplier

Process:
1. Flag as urgent
2. Fast-track approval
3. Schedule immediate payment
4. Document reason
```

## Discrepancy Resolution

### Common Issues
| Issue | Resolution |
|-------|------------|
| Quantity mismatch | Verify with delivery team |
| Price mismatch | Check contract/agreement |
| Duplicate invoice | Return to vendor |
| Missing PO | Obtain retrospective |
| GST error | Request corrected invoice |

### Resolution Timeline
```
Target resolution:
- Simple issues: 24 hours
- Complex issues: 72 hours
- Vendor disputes: 1 week
```

## Reporting

### Daily Processing Report
```
INVOICE PROCESSING - [Date]

Received today: X ($X)
Processed: X ($X)
Pending approval: X ($X)
On hold: X ($X)

Aging of unprocessed:
| Age | Count | Amount |
|-----|-------|--------|
| 0-3 days | X | $X |
| 3-7 days | X | $X |
| 7+ days | X | $X |
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Processing time | <48 hours |
| Accuracy rate | >99% |
| On-time processing | >95% |
| Discrepancy rate | <5% |

## Escalation

Alert Team Lead if:
- Processing backlog building
- Major discrepancy identified
- Supplier issue escalation
- Unusual invoice pattern
