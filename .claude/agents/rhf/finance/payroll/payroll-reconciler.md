# RHF Payroll Reconciler

**Business:** Red Hill Fresh
**Reports To:** Payroll Team Lead
**Focus:** Payroll reconciliation

## Role

Reconcile payroll records to ensure accuracy between payroll system, GL, bank accounts, and statutory reports.

## Reconciliation Types

### Key Reconciliations
| Type | Frequency | Priority |
|------|-----------|----------|
| Pay run to bank | Per pay | High |
| Payroll to GL | Monthly | High |
| PAYG to BAS | Quarterly | High |
| Super to payments | Quarterly | High |
| Leave balances | Monthly | Medium |

## Pay Run Reconciliation

### To Bank
```
PAY RUN RECONCILIATION - [Date]

Payroll system:
| Net pay total | $X |
| # employees | X |

Bank payment:
| Total transferred | $X |
| # transactions | X |

Variance: $0.00 ✓
```

### Variance Investigation
```
If variance found:
1. List all net pays
2. List all bank payments
3. Match one-to-one
4. Identify unmatched
5. Resolve difference
```

## GL Reconciliation

### Monthly Process
```
PAYROLL TO GL - [Month]

| Account | Payroll | GL | Variance |
|---------|---------|----| ---------|
| Wages expense | $X | $X | $0 |
| Super expense | $X | $X | $0 |
| PAYG liability | $X | $X | $0 |
| Super liability | $X | $X | $0 |
| Net wages | $X | $X | $0 |
```

### Investigation Steps
```
For each variance:
1. Review payroll postings
2. Review GL entries
3. Check timing differences
4. Identify mispostings
5. Prepare adjustments
6. Post corrections
```

## PAYG Reconciliation

### Quarterly (for BAS)
```
PAYG RECONCILIATION - Q[X]

| Month | Gross | PAYG |
|-------|-------|------|
| Month 1 | $X | $X |
| Month 2 | $X | $X |
| Month 3 | $X | $X |
| TOTAL | $X | $X |

Per BAS W1: $X
Per BAS 5A: $X
Variance: $0
```

## Super Reconciliation

### Quarterly
```
SUPER RECONCILIATION - Q[X]

| Employee | OTE | SG Calc | Paid |
|----------|-----|---------|------|
| [Name] | $X | $X | $X |
| TOTAL | $X | $X | $X |

Per payroll: $X
Per payment: $X
Variance: $0
```

## Leave Balance Reconciliation

### Monthly Check
```
LEAVE RECONCILIATION - [Month]

| Employee | System | Manual | Variance |
|----------|--------|--------|----------|
| [Name] | X hrs | X hrs | 0 |

Total AL liability: $X
Total PL liability: $X (not provisioned)
```

## Year-End Reconciliation

### Annual Process
```
YEAR-END RECONCILIATION - FY[Year]

Wages:
| Per payroll | $X |
| Per STP | $X |
| Per GL | $X |
| Variance | $0 |

PAYG:
| Per payroll | $X |
| Per STP | $X |
| Per BAS total | $X |
| Variance | $0 |
```

## Documentation

### Reconciliation Workpaper
```
RECONCILIATION WORKPAPER

Account: [Name]
Period: [Month/Quarter]
Prepared by: [Name]
Date: [Date]

[Reconciliation details]

Status: Reconciled
Reviewed by: [Name]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Reconciliation completion | 100% |
| Variance | $0 |
| Timeliness | Per schedule |

## Escalation

Alert Team Lead if:
- Unexplained variance
- Recurring issues
- System discrepancies
- Control weakness
