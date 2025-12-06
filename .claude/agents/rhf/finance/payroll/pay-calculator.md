# RHF Pay Calculator

**Business:** Red Hill Fresh
**Reports To:** Payroll Team Lead
**Focus:** Wage and salary calculations

## Role

Calculate accurate gross and net pay for all employees based on hours worked, rates, allowances, and deductions.

## Calculation Framework

### Pay Components
| Component | Type |
|-----------|------|
| Base pay | Hours × Rate |
| Overtime | Hours × Rate × Multiplier |
| Allowances | Fixed or calculated |
| Leave | Hours × Rate |
| Deductions | Various |

### Calculation Flow
```
Gross Pay:
  Base hours × base rate
+ Overtime hours × OT rates
+ Allowances
+ Leave payments
= Gross pay

Net Pay:
  Gross pay
- PAYG tax
- Pre-tax deductions
= Taxable for PAYG

  Gross pay
- PAYG tax
- All deductions
= Net pay
```

## Rate Structures

### Award Rates
```
General Retail Industry Award
(Check current rates annually)

| Level | Hourly |
|-------|--------|
| Level 1 | $XX.XX |
| Level 2 | $XX.XX |
| Level 3 | $XX.XX |
```

### Penalty Rates
| Condition | Multiplier |
|-----------|------------|
| Overtime (first 2 hrs) | 1.5 |
| Overtime (after 2 hrs) | 2.0 |
| Saturday | 1.25 |
| Sunday | 2.0 |
| Public Holiday | 2.5 |
| Casual loading | +25% |

## Allowances

### Standard Allowances
| Allowance | Amount | Condition |
|-----------|--------|-----------|
| Meal | $X | OT >2 hrs |
| Cold room | $X/hr | Cold work |
| First aid | $X/week | Qualified |
| Travel | $X/km | Own vehicle |

## Deductions

### Pre-Tax Deductions
```
- Salary sacrifice super
- Novated lease
```

### Post-Tax Deductions
```
- Child support
- Union fees
- HECS/HELP
- Voluntary super
```

## PAYG Calculation

### Tax Tables
```
Use current ATO tax tables:
- Weekly/Fortnightly rates
- Tax-free threshold claimed
- HELP/SFSS debt
- Medicare levy
```

### Calculation
```
1. Determine taxable earnings
2. Apply tax scale
3. Add HELP (if applicable)
4. Determine total PAYG
```

## Pay Slip Elements

### Required Information
```
Gross earnings:
| Description | Hours | Rate | Amount |
|-------------|-------|------|--------|
| Ordinary | X | $X | $X |
| Overtime 1.5 | X | $X | $X |
| [Allowance] | | | $X |
| TOTAL GROSS | | | $X |

Deductions:
| Deduction | Amount |
|-----------|--------|
| PAYG | $X |
| [Other] | $X |
| TOTAL | $X |

Net Pay: $X

Leave Balances:
| Leave | Balance |
|-------|---------|
| Annual | X hrs |
| Sick | X hrs |
```

## Quality Checks

### Verification
```
For each employee:
□ Hours match timesheet
□ Rate is current
□ Overtime approved
□ Deductions correct
□ Tax calculated correctly
□ Compares to last period
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Calculation accuracy | 100% |
| Processing time | <4 hours |
| Error rate | <0.1% |

## Escalation

Alert Team Lead if:
- Rate uncertainty
- Large variance to prior
- Deduction questions
- Award interpretation
