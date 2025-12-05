# Red Hill Fresh - Xero Reconciliation Patterns

This document defines the common expense categories, account mappings, and patterns used for AI-powered bank reconciliation.

---

## Business Context

**Red Hill Fresh** is a local fresh produce delivery business on the Mornington Peninsula.
- High volume of small supplier payments
- Frequent fuel purchases for delivery vehicles
- Weekly/bi-weekly produce supplier payments
- Seasonal variations in produce costs
- Cash-intensive with regular bank deposits

---

## Chart of Accounts Structure

### Revenue Accounts (200-299)
| Code | Name | Use For |
|------|------|---------|
| 200 | Sales Revenue | All customer orders |
| 201 | Delivery Fees | Delivery charges collected |
| 210 | Refunds Given | Customer refunds |

### Cost of Goods Sold (300-399)
| Code | Name | Use For |
|------|------|---------|
| 310 | COGS - Produce | Fruits & vegetables suppliers |
| 311 | COGS - Dairy | Milk, cheese, eggs suppliers |
| 312 | COGS - Meat | Butcher, poultry suppliers |
| 313 | COGS - Bakery | Bread, pastry suppliers |
| 314 | COGS - Pantry | Shelf-stable items |
| 315 | COGS - Frozen | Frozen products |
| 319 | COGS - Other | Miscellaneous suppliers |

### Operating Expenses (400-499)
| Code | Name | Use For |
|------|------|---------|
| 420 | Vehicle - Fuel | BP, Shell, Ampol, 7-Eleven fuel |
| 421 | Vehicle - Repairs | Mechanic, servicing, tyres |
| 422 | Vehicle - Registration | Rego renewals |
| 423 | Vehicle - Insurance | Vehicle insurance |
| 430 | Packaging & Supplies | Bags, boxes, labels |
| 431 | Cold Storage | Refrigeration costs |
| 440 | Rent | Premises rental |
| 450 | Utilities - Electricity | AGL, Origin, Energy Australia |
| 451 | Utilities - Water | Water bills |
| 452 | Utilities - Gas | Gas bills |
| 460 | Telephone & Internet | Telstra, Optus, TPG |
| 470 | Bank Fees | Monthly account fees |
| 471 | Merchant Fees | Stripe, Square, PayPal fees |
| 480 | Insurance - Business | Public liability, product |
| 490 | Professional Services | Accountant, legal |
| 491 | Subscriptions | Software, memberships |

### Payroll (500-599)
| Code | Name | Use For |
|------|------|---------|
| 500 | Wages & Salaries | Employee wages |
| 510 | Superannuation | Super contributions |
| 520 | Workers Comp | WorkCover premiums |

---

## Common Supplier Patterns

### Produce Suppliers
| Supplier Pattern | Account | Contact Name |
|-----------------|---------|--------------|
| "peninsula produce" | 310 | Peninsula Produce |
| "red hill produce" | 310 | Red Hill Produce |
| "mornington" + "fruit" | 310 | Mornington Fruit Market |
| "veggie" | 310 | (Various) |
| "market" + "farm" | 310 | (Various) |

### Dairy Suppliers
| Supplier Pattern | Account | Contact Name |
|-----------------|---------|--------------|
| "dairy" | 311 | (Various) |
| "milk" | 311 | (Various) |
| "cheese" | 311 | (Various) |
| "schulz" | 311 | Schulz Organic Dairy |

### Meat Suppliers
| Supplier Pattern | Account | Contact Name |
|-----------------|---------|--------------|
| "butcher" | 312 | (Various) |
| "meat" | 312 | (Various) |
| "poultry" | 312 | (Various) |
| "chicken" | 312 | (Various) |

### Bakery Suppliers
| Supplier Pattern | Account | Contact Name |
|-----------------|---------|--------------|
| "bakery" | 313 | (Various) |
| "bread" | 313 | (Various) |
| "dough" | 313 | (Various) |

---

## Expense Pattern Rules

### Fuel (High Confidence - 95%)
```
Pattern: description contains "bp " OR "shell" OR "ampol" OR "7-eleven" OR "united" OR "caltex"
Account: 420 (Vehicle - Fuel)
Tax: GST on Expenses
```

### Bank Fees (High Confidence - 98%)
```
Pattern: description contains "bank fee" OR "account fee" OR "monthly fee"
Account: 470 (Bank Fees)
Tax: No GST
```

### Merchant Fees (High Confidence - 95%)
```
Pattern: description contains "stripe" OR "square" OR "paypal fee" OR "merchant"
Account: 471 (Merchant Fees)
Tax: GST on Expenses
```

### Utilities - Electricity (High Confidence - 92%)
```
Pattern: description contains "agl" OR "origin energy" OR "energy australia" OR "red energy"
Account: 450 (Utilities - Electricity)
Tax: GST on Expenses
```

### Telecommunications (High Confidence - 90%)
```
Pattern: description contains "telstra" OR "optus" OR "vodafone" OR "tpg"
Account: 460 (Telephone & Internet)
Tax: GST on Expenses
```

---

## Revenue Pattern Rules

### Payment Provider Deposits (High Confidence - 90%)
```
Pattern: description contains "stripe payout" OR "stripe transfer"
Account: 200 (Sales Revenue)
Note: This is net of fees - merchant fee already deducted
```

### Square Deposits
```
Pattern: description contains "square payout" OR "squareup"
Account: 200 (Sales Revenue)
Note: This is net of fees
```

### WooCommerce/Bank Transfer
```
Pattern: description contains "woocommerce" OR reference contains "WC-"
Account: 200 (Sales Revenue)
```

---

## Seasonal Patterns

### Summer (Dec-Feb)
- Higher produce volume (stone fruits, berries)
- Increased fuel costs (more deliveries)
- Higher electricity (refrigeration)

### Winter (Jun-Aug)
- Lower produce variety
- Reduced delivery frequency
- Lower overall costs

### Christmas Period
- Peak ordering period (Dec 15-24)
- Higher meat/dairy orders
- Extended delivery hours

---

## Learning Priorities

When encountering new transactions:

1. **First match on exact description** - Most reliable
2. **Then match on supplier name patterns** - Common suppliers
3. **Then match on amount ranges** - Regular recurring costs
4. **Finally, ask for user input** - Learn new patterns

### Pattern Creation Rules

- Create pattern after 3 consistent matches
- Start confidence at 70%, increase by 5% per match
- Max confidence: 98% (always allow human override)
- Decay confidence if pattern unused for 90 days

---

## Tax Handling (Australia)

| Type | GST Treatment |
|------|---------------|
| Most expenses | GST on Expenses (claim input credit) |
| Bank fees | No GST |
| Government fees | No GST |
| Insurance | Input taxed (no GST credit) |
| Wages | No GST |
| Superannuation | No GST |

---

## Contact Management

### Auto-create Contacts
When a new supplier appears 3+ times:
- Create contact in Xero
- Use cleaned description as name
- Mark as Supplier
- Link to relevant expense account

### Common Contact Mappings
| Pattern in Description | Contact Name |
|-----------------------|--------------|
| "COLES" | Coles Supermarkets |
| "WOOLWORTHS" | Woolworths |
| "BUNNINGS" | Bunnings Warehouse |
| "OFFICEWORKS" | Officeworks |
| "AUSTRALIA POST" | Australia Post |

---

## Reconciliation Workflow

1. **Import** - Fetch unreconciled from Xero
2. **Match** - Run through pattern engine
3. **Suggest** - Show AI suggestions with confidence
4. **Review** - User approves/modifies
5. **Learn** - Update patterns from decisions
6. **Reconcile** - Push back to Xero

### High-Confidence Auto-Reconcile
For patterns with 95%+ confidence after 10+ matches:
- Auto-reconcile without user input
- Log for audit trail
- Alert if unusual amount (>2x normal)

---

## Troubleshooting Common Issues

### "Unknown" Transactions
- Check for partial matches in description
- Look at payee field
- Consider amount-based matching
- Flag for manual review

### Duplicate Patterns
- Consolidate similar patterns weekly
- Prefer description_contains over exact
- Keep most specific pattern active

### Incorrect Suggestions
- User rejection updates confidence (-10%)
- After 3 rejections, deactivate pattern
- Create new pattern from correction
