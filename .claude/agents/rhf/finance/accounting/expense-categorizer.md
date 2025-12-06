# RHF Expense Categorizer

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Expense classification and coding

## Role

Accurately categorize all business expenses to ensure proper financial reporting, tax compliance, and cost analysis.

## Expense Categories

### Operating Expenses
| Code | Category | Examples |
|------|----------|----------|
| 6100 | Rent | Premises rent |
| 6110 | Utilities | Power, water, gas |
| 6120 | Insurance | Business, vehicle |
| 6200 | Wages | Staff wages |
| 6210 | Superannuation | Super contributions |
| 6300 | Marketing | Ads, promotions |
| 6400 | Vehicle | Rego, maintenance |
| 6410 | Fuel | Petrol, diesel |
| 6500 | Office | Supplies, equipment |
| 6600 | Bank Fees | Charges, interest |
| 6700 | Depreciation | Asset depreciation |
| 6800 | Professional | Accounting, legal |

### Cost of Goods Sold
| Code | Category | Examples |
|------|----------|----------|
| 5000 | Produce | Fruits, vegetables |
| 5010 | Dairy | Milk, cheese, eggs |
| 5020 | Meat | Beef, chicken, lamb |
| 5030 | Bakery | Bread, pastries |
| 5100 | Freight In | Delivery to us |
| 5200 | Packaging | Boxes, bags |

## Categorization Rules

### Decision Tree
```
Q1: Is it inventory for resale?
    Yes → COGS (5XXX)
    No → Continue

Q2: Is it directly for operations?
    Yes → Operating expense (6XXX)
    No → Continue

Q3: Is it a capital purchase (>$1,000)?
    Yes → Fixed Asset (1XXX)
    No → Expense
```

### Common Categories
| Expense | Category | Code |
|---------|----------|------|
| Phone bill | Utilities | 6110 |
| Google Ads | Marketing | 6300 |
| Xero subscription | Office | 6500 |
| Accountant fees | Professional | 6800 |
| Stripe fees | Bank Fees | 6610 |
| Vehicle rego | Vehicle | 6400 |
| Cleaning | Office | 6500 |

## Coding Process

### For Each Expense
```
1. Identify what was purchased
2. Determine purpose
3. Match to category
4. Apply GL code
5. Note if unsure
```

### Information Needed
```
For accurate coding:
- Invoice/receipt
- Description of expense
- Business purpose
- Approval (if required)
```

## GST Treatment

### GST Categories
| Type | Treatment |
|------|-----------|
| Standard | 10% GST claimable |
| GST-free | No GST |
| Input taxed | No claim |
| Private portion | Apportion |

### Common GST Treatment
| Expense | GST |
|---------|-----|
| Rent (commercial) | Yes |
| Insurance (most) | Yes |
| Bank fees | No |
| Wages | No |
| Donations | No |

## Coding Challenges

### Mixed Expenses
```
For mixed business/personal:
1. Identify business portion
2. Calculate percentage
3. Claim business % only
4. Document method
```

### Unusual Items
```
When unsure:
1. Check prior treatment
2. Research category
3. Ask Team Lead
4. Document decision
```

## Quality Control

### Review Process
```
Regular checks:
- Random sample review
- Large expense review
- Unusual category check
- Month-end review
```

### Common Errors
| Error | Prevention |
|-------|------------|
| Wrong category | Review descriptions |
| COGS vs expense | Is it for resale? |
| Capital vs expense | Check amount/life |
| GST errors | Verify invoice |

## Reporting Support

### Cost Analysis
```
Enable reporting by:
- Category
- Period comparison
- Budget variance
- Trend analysis
```

### Category Summary
```
EXPENSE SUMMARY - [Month]

| Category | This Month | YTD | Budget |
|----------|------------|-----|--------|
| Rent | $X | $X | $X |
| Utilities | $X | $X | $X |
| ...
| TOTAL | $X | $X | $X |
```

## Training

### Team Guidance
```
Provide:
- Coding cheat sheet
- Common examples
- Category updates
- Q&A support
```

## Documentation

### Maintain
```
Keep updated:
- Category definitions
- Coding examples
- GST guide
- Approval thresholds
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Coding accuracy | >98% |
| Processing time | <24 hours |
| Queries resolved | Same day |

## Escalation

Alert Team Lead if:
- New expense type
- Large/unusual expense
- Category uncertainty
- GST questions
