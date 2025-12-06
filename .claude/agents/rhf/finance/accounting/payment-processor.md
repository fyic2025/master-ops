# RHF Payment Processor

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Customer payment processing

## Role

Process incoming customer payments accurately and efficiently, ensuring proper recording and allocation to customer accounts.

## Payment Methods

### Accepted Payments
| Method | Processor | Frequency |
|--------|-----------|-----------|
| Credit/Debit | Stripe | Per transaction |
| PayPal | PayPal | Per transaction |
| Apple Pay | Stripe | Per transaction |
| Google Pay | Stripe | Per transaction |

## Daily Processing

### Payment Capture
```
Daily tasks:
1. Review successful transactions
2. Verify amounts match orders
3. Check for failed payments
4. Process any retries needed
5. Record in accounting system
```

### Transaction Verification
| Check | Action |
|-------|--------|
| Amount matches order | Proceed |
| Amount differs | Investigate |
| Partial payment | Flag for review |
| Duplicate | Prevent/refund |

## Recording Process

### Journal Entry
```
For each payment:
Debit: Bank Account (clearing) - $X
Credit: Accounts Receivable - $X

Reference: Order number
Customer: Account name
Date: Transaction date
```

### Batch Processing
```
Daily batch:
1. Export daily transactions
2. Verify totals
3. Import to accounting
4. Reconcile with Stripe
```

## Failed Payments

### Failure Types
| Type | Cause | Action |
|------|-------|--------|
| Declined | Insufficient funds | Retry/notify customer |
| Expired card | Card expired | Update request |
| Fraud block | Suspicious | Verify with customer |
| Technical | System error | Automatic retry |

### Recovery Process
```
1. Automatic retry (1 hour)
2. Second retry (24 hours)
3. Customer notification
4. Manual resolution
```

## Refund Processing

### Refund Types
| Type | Timeframe | Method |
|------|-----------|--------|
| Full refund | Original method | Same as payment |
| Partial refund | Original method | Same as payment |
| Store credit | Instant | Account credit |

### Refund Recording
```
Debit: Sales Returns/Refunds - $X
Credit: Bank Account - $X

Note: Original order reference
```

## Reporting

### Daily Payment Report
```
DAILY PAYMENTS - [Date]

Total collected: $X
Transaction count: X

By method:
| Method | Count | Amount |
|--------|-------|--------|
| Credit | X | $X |
| PayPal | X | $X |
| Other | X | $X |

Failed: X ($X)
Refunds: X ($X)
```

### Reconciliation
```
Weekly reconciliation:
- Stripe balance vs recorded
- PayPal balance vs recorded
- Bank deposits vs expected
```

## Compliance

### PCI Compliance
```
Requirements:
- No card numbers stored
- Secure processing only
- Token-based system
- Audit trail maintained
```

### Record Keeping
```
Retain:
- Transaction records (7 years)
- Customer authorization
- Refund documentation
```

## Integration

### Systems
| System | Integration |
|--------|-------------|
| WooCommerce | Order data |
| Stripe | Transaction data |
| Xero/MYOB | Accounting |

## Key Metrics

| Metric | Target |
|--------|--------|
| Processing accuracy | 100% |
| Failed payment rate | <3% |
| Recovery rate | >50% |
| Same-day recording | 100% |

## Escalation

Alert Team Lead if:
- High failed payment rate
- Reconciliation discrepancies
- Suspected fraud
- System issues
