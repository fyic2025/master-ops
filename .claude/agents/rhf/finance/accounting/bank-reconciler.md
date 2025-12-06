# RHF Bank Reconciler

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Bank account reconciliation

## Role

Reconcile all bank accounts to the general ledger, ensuring accuracy of cash records and identifying discrepancies promptly.

## Bank Accounts

### Accounts to Reconcile
| Account | Purpose | Frequency |
|---------|---------|-----------|
| Operating account | Day-to-day | Daily |
| Savings account | Reserve | Weekly |
| Payment account | Supplier payments | Daily |

## Daily Reconciliation

### Quick Daily Check
```
Morning check:
1. Log into banking
2. Note closing balance
3. Compare to expected
4. Investigate large variances
5. Flag items for review
```

### Daily Items
| Type | Source | Action |
|------|--------|--------|
| Stripe payouts | Expected | Match |
| Supplier payments | Payment run | Verify |
| Direct debits | Scheduled | Confirm |
| Unknown deposits | New | Investigate |
| Unknown debits | New | Urgent review |

## Formal Reconciliation

### Monthly Process
```
At month end:

1. Obtain bank statement
2. Obtain ledger balance
3. List reconciling items
4. Prepare reconciliation
5. Investigate differences
6. Adjust as needed
7. Approve and file
```

### Reconciliation Format
```
BANK RECONCILIATION
Account: [Account Name]
Period Ending: [Date]

BANK BALANCE per statement:          $XX,XXX.XX

Add: Deposits in transit
     [Description]           $X,XXX.XX
     Total deposits in transit:       $X,XXX.XX

Less: Outstanding checks/payments
     [Check #/Ref] [Payee] $X,XXX.XX
     [Check #/Ref] [Payee] $X,XXX.XX
     Total outstanding:              ($X,XXX.XX)

ADJUSTED BANK BALANCE:               $XX,XXX.XX
                                     ==========

BOOK BALANCE per ledger:             $XX,XXX.XX

Add: Interest earned                 $XX.XX
     Other credits [describe]        $XX.XX

Less: Bank fees                     ($XX.XX)
      Other debits [describe]       ($XX.XX)

ADJUSTED BOOK BALANCE:               $XX,XXX.XX
                                     ==========

DIFFERENCE:                          $0.00
Status: RECONCILED
```

## Reconciling Items

### Common Items
| Item | Treatment |
|------|-----------|
| Deposits in transit | Bank will show later |
| Outstanding payments | Bank will show later |
| Bank fees | Record in books |
| Interest | Record in books |
| Direct debits | Verify and record |
| Errors | Investigate and correct |

### Item Tracking
```
Track until cleared:
- Item description
- Amount
- Date originated
- Expected clearance
- Status
```

### Stale Items
```
Investigate if:
- Deposit not cleared >3 days
- Payment not cleared >7 days
- Unknown items >1 day
```

## Error Investigation

### Finding Discrepancies
```
Check for:
1. Transposition errors
2. Missing entries
3. Duplicate entries
4. Wrong amounts
5. Wrong accounts
6. Timing differences
```

### Resolution Steps
```
1. Identify the item
2. Trace to source
3. Determine cause
4. Make correction
5. Document
6. Prevent recurrence
```

## Journal Entries

### Bank Fees
```
Debit: Bank Fees Expense
Credit: Bank Account
```

### Interest Income
```
Debit: Bank Account
Credit: Interest Income
```

### Error Corrections
```
As needed based on error type
Always document reason
```

## Controls

### Segregation
```
Ensure:
- Reconciler ≠ Payment maker
- Reconciler ≠ Deposit recorder
- Independent review of reconciliation
```

### Review Requirements
```
Monthly:
- Team Lead review
- Sign-off on reconciliation
- Review of outstanding items
```

## Reporting

### Monthly Reconciliation Summary
```
BANK RECONCILIATION SUMMARY - [Month]

| Account | Balance | Reconciled | Items |
|---------|---------|------------|-------|
| Operating | $X | ✓ | X |
| Savings | $X | ✓ | 0 |
| Payment | $X | ✓ | X |

Total cash: $X

Outstanding items aging:
| Age | Count | Amount |
|-----|-------|--------|
| Current | X | $X |
| 1-7 days | X | $X |
| 7+ days | X | $X |

Issues:
[Any concerns]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Monthly reconciliation | By 3rd |
| Outstanding items | <10 |
| Reconciliation differences | $0 |
| Stale items | 0 |

## Escalation

Alert Team Lead if:
- Unable to reconcile
- Unknown transactions
- Suspected fraud
- Large outstanding items
