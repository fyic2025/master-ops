# RHF Payment Reconciler

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Payment reconciliation

## Role

Reconcile all payment transactions between payment processors, bank accounts, and accounting records to ensure accuracy and identify discrepancies.

## Reconciliation Types

### Daily Reconciliation
| Comparison | Frequency |
|------------|-----------|
| Stripe vs WooCommerce | Daily |
| Bank vs Stripe | Daily |
| Accounting vs Bank | Daily |

### Monthly Reconciliation
| Comparison | Frequency |
|------------|-----------|
| Full ledger vs bank | Monthly |
| AR aging vs customer | Monthly |
| Processor statements | Monthly |

## Daily Process

### Step 1: Stripe to WooCommerce
```
1. Export Stripe daily transactions
2. Export WooCommerce payments
3. Match by order number
4. Identify discrepancies
5. Investigate and resolve
```

### Step 2: Stripe to Bank
```
1. Get Stripe payout details
2. Match to bank deposits
3. Account for timing differences
4. Verify net amounts (fees deducted)
5. Record any variances
```

### Step 3: Bank to Ledger
```
1. Compare bank transactions
2. Match to recorded entries
3. Identify unrecorded items
4. Post adjustments
5. Document differences
```

## Reconciliation Template

### Daily Reconciliation Report
```
RECONCILIATION - [Date]

STRIPE TO WOOCOMMERCE
Stripe transactions: $X (X orders)
WooCommerce payments: $X (X orders)
Difference: $X
Status: Reconciled/Investigate

Unmatched items:
| Order | Stripe | WC | Issue |
|-------|--------|-----|-------|

STRIPE TO BANK
Stripe payouts: $X
Bank deposits: $X
Timing items: $X
Net difference: $X
Status: Reconciled/Investigate

BANK TO LEDGER
Bank balance: $X
Ledger balance: $X
Reconciling items: $X
Adjusted difference: $X
Status: Reconciled/Investigate
```

## Common Discrepancies

### Types and Resolution
| Issue | Cause | Resolution |
|-------|-------|------------|
| Timing | Payout delay | Wait/note |
| Fee difference | Stripe fees | Adjust entry |
| Refund timing | Not yet processed | Track |
| Missing order | Not recorded | Investigate |
| Duplicate | Double entry | Correct |

### Investigation Process
```
For each discrepancy:
1. Identify transaction details
2. Check all systems
3. Determine root cause
4. Make correction
5. Document resolution
6. Prevent recurrence
```

## Stripe Reconciliation

### Payout Matching
```
Stripe payout contains:
- Gross payments
- Less: Refunds
- Less: Fees
- Less: Chargebacks
= Net payout

Match net to bank deposit
```

### Fee Reconciliation
```
Monthly:
- Total Stripe fees
- Verify fee rates
- Compare to expected
- Record fee expense
```

## Bank Reconciliation

### Standard Format
```
BANK RECONCILIATION - [Month End]

Bank balance per statement: $X

Add:
+ Deposits in transit: $X

Subtract:
- Outstanding checks: $X

Adjusted bank balance: $X

Book balance per ledger: $X

Add:
+ Interest earned: $X
+ Other credits: $X

Subtract:
- Bank fees: $X
- Other debits: $X

Adjusted book balance: $X

Difference: $0 (reconciled)
```

## Month-End Process

### Steps
```
1. Complete daily reconciliations
2. Reconcile processor statements
3. Prepare bank reconciliation
4. Clear reconciling items
5. Document outstanding items
6. Sign off with Team Lead
```

### Documentation
```
Maintain:
- Reconciliation worksheets
- Supporting details
- Adjustment journal entries
- Approval signatures
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Daily reconciliation | Same day |
| Unreconciled items | <5 |
| Resolution time | <48 hours |
| Month-end completion | By 3rd |

## Escalation

Alert Team Lead if:
- Large unreconciled amounts
- Suspected fraud
- System data issues
- Unable to resolve items
