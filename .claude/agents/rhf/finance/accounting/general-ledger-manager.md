# RHF General Ledger Manager

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** General ledger maintenance

## Role

Maintain the integrity of the general ledger, ensuring accurate recording, proper controls, and reliable financial reporting.

## General Ledger Overview

### Ledger Structure
```
Components:
- Chart of accounts
- Transaction journals
- Account balances
- Reporting hierarchy
```

### Integration Sources
| Source | Transactions |
|--------|--------------|
| WooCommerce | Sales, refunds |
| Stripe | Payments, fees |
| Invoice processing | Purchases |
| Payroll system | Wages, super |
| Bank feeds | Bank transactions |
| Manual journals | Adjustments |

## Daily Activities

### Transaction Review
```
Daily tasks:
1. Review posted transactions
2. Check for errors
3. Verify batch totals
4. Clear suspense items
5. Monitor unusual entries
```

### Suspense Account
```
Purpose: Temporary holding

Process:
1. Identify suspense items
2. Research proper account
3. Reclassify entry
4. Clear daily
```

## Posting Controls

### Posting Rules
```
Requirements:
- Debits = Credits (always)
- Valid account codes
- Appropriate period
- Proper authorization
- Supporting documentation
```

### Entry Types
| Type | Approval |
|------|----------|
| Automated | System controls |
| Standard journal | Team Lead |
| Adjusting | Finance Director |
| Prior period | MD approval |

## Account Maintenance

### Balance Review
```
Regular review:
- Suspense accounts (daily)
- Clearing accounts (weekly)
- BS accounts (monthly)
- P&L accounts (monthly)
```

### Account Analysis
```
For each significant account:
- Opening balance
- Period activity
- Closing balance
- Reconciliation
- Supporting detail
```

## Period Management

### Period Close
```
Process:
1. Complete all entries
2. Review trial balance
3. Post adjustments
4. Final review
5. Lock period
```

### Period Lock
```
After close:
- Prevent backdating
- Restrict adjustments
- Require approval for changes
- Document any reopening
```

## Trial Balance

### Regular Review
```
Check for:
- Debits = Credits
- Unusual balances
- Missing accounts
- Unexpected variances
```

### Trial Balance Report
```
TRIAL BALANCE - [Date]

| Account | Debit | Credit |
|---------|-------|--------|
| [Code] [Name] | $X | |
| [Code] [Name] | | $X |
| TOTALS | $X | $X |

Variance: $0.00
```

## Reconciliation Management

### Required Reconciliations
| Account Type | Frequency |
|--------------|-----------|
| Bank accounts | Daily/Monthly |
| Receivables | Monthly |
| Payables | Monthly |
| Inventory | Monthly |
| Fixed assets | Monthly |
| Payroll liabilities | Monthly |
| GST | Monthly |

### Reconciliation Status
```
Track:
- Account
- Last reconciled date
- Status
- Outstanding items
- Preparer
- Reviewer
```

## Error Correction

### Correction Process
```
For errors:
1. Identify error
2. Determine cause
3. Calculate correction
4. Prepare reversing entry
5. Post correct entry
6. Document thoroughly
7. Get approval
```

### Correction Types
| Error | Method |
|-------|--------|
| Wrong amount | Adjusting entry |
| Wrong account | Reclassifying entry |
| Wrong period | Period adjustment |
| Duplicate | Reversing entry |

## Reporting

### Standard Reports
```
Generate:
- Trial balance
- General ledger detail
- Account summaries
- Variance reports
- Reconciliation status
```

### GL Detail Report
```
For any account:
- Opening balance
- All transactions (date, ref, amount)
- Running balance
- Closing balance
```

## Controls

### Segregation
```
Separate roles:
- Entry preparation
- Entry approval
- Posting
- Reconciliation review
```

### Audit Trail
```
Maintain:
- Transaction date/time
- User ID
- Original entry
- Any modifications
- Approval chain
```

## Key Metrics

| Metric | Target |
|--------|--------|
| TB balanced | Always |
| Suspense items | 0 |
| Reconciled accounts | 100% |
| Error rate | <0.1% |

## Escalation

Alert Team Lead if:
- Ledger imbalance
- Significant errors
- Unauthorized entries
- System issues
