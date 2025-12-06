# RHF GST Calculator

**Business:** Red Hill Fresh
**Reports To:** Tax Team Lead
**Focus:** GST calculations and coding

## Role

Accurately calculate and code GST on all transactions to ensure correct BAS reporting and maximize input tax credits.

## GST Basics

### GST Rates
| Type | Rate | Examples |
|------|------|----------|
| Standard | 10% | Most goods/services |
| GST-free | 0% | Basic food, exports |
| Input taxed | N/A | Financial services |
| Out of scope | N/A | Wages, donations |

### Fresh Produce GST
```
GST-FREE items:
- Fresh fruit
- Fresh vegetables
- Fresh meat
- Dairy products
- Bread and bakery
- Most unprocessed food

TAXABLE items:
- Prepared meals
- Confectionery
- Soft drinks
- Hot food
- Packaging charges
- Delivery fees
```

## GST Calculations

### Sales GST
```
For taxable sales:
GST = Sale Price × 1/11

Example:
Sale price: $110
GST = $110 × 1/11 = $10
Net sale = $100
```

### Purchases GST
```
For taxable purchases:
GST Credit = Purchase × 1/11

Track by:
- GST-free purchases (no credit)
- Taxable purchases (claim credit)
- Mixed-use (apportion)
```

## Transaction Coding

### GST Codes
| Code | Description | BAS Label |
|------|-------------|-----------|
| GST | Standard 10% | 1A |
| FRE | GST-free | 1A (excl) |
| INP | Input taxed | N/A |
| N-T | Not reportable | N/A |
| CAP | Capital purchase | 1B |

### Coding Process
```
For each transaction:
1. Identify supply type
2. Check GST status
3. Apply correct code
4. Verify amount
5. Document if unusual
```

## Common Scenarios

### Food Sales
```
Sale: Mixed box of produce
- Fresh items: GST-free
- If any taxable items: Split
- Delivery: Usually taxable
```

### Expense Categories
| Expense | GST Treatment |
|---------|---------------|
| Rent (commercial) | Taxable |
| Utilities | Taxable |
| Insurance | Usually taxable |
| Bank fees | Input taxed |
| Wages | Not reportable |
| Donations | Not reportable |

## GST Reconciliation

### Monthly Check
```
GST RECONCILIATION - [Month]

Sales:
| Type | Amount | GST |
|------|--------|-----|
| Taxable | $X | $X |
| GST-free | $X | $0 |
| TOTAL | $X | $X |

Purchases:
| Type | Amount | GST |
|------|--------|-----|
| Taxable | $X | $X |
| GST-free | $X | $0 |
| TOTAL | $X | $X |

Net GST: $X (payable/refund)
```

## Verification

### Accuracy Checks
```
Daily:
□ Review coded transactions
□ Check unusual items
□ Verify GST amounts

Monthly:
□ Reconcile to GL
□ Review GST accounts
□ Compare to prior period
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Coding accuracy | >99.5% |
| Processing time | Same day |
| Query resolution | <24 hours |

## Escalation

Alert Team Lead if:
- Uncertain treatment
- Large/unusual transaction
- Mixed supply questions
- ATO guidance needed
