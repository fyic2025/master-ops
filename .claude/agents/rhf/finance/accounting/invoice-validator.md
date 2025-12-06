# RHF Invoice Validator

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Invoice accuracy verification

## Role

Validate all supplier invoices against purchase orders, delivery receipts, and contracts to ensure accurate payment and prevent errors.

## Validation Checklist

### Invoice Details
```
□ Vendor name matches our records
□ Invoice number is unique
□ Invoice date is current
□ Due date is correct per terms
□ Our details (ABN, address) correct
□ Vendor ABN present and valid
```

### Line Items
```
□ Items match what was ordered
□ Items match what was delivered
□ Descriptions are accurate
□ Unit prices match agreement
□ Quantities are correct
□ Units of measure are correct
```

### Calculations
```
□ Extensions correct (qty × price)
□ Subtotal correct
□ GST calculated correctly (10%)
□ Total correct
□ Any discounts applied correctly
```

## Three-Way Match

### Documents Required
| Document | Purpose |
|----------|---------|
| Purchase Order | What we ordered |
| Delivery Docket | What we received |
| Invoice | What vendor billed |

### Match Process
```
Step 1: Match invoice to PO
- Same items?
- Same quantities?
- Same prices?

Step 2: Match to delivery
- Quantity received = Quantity billed?
- All items delivered?
- Condition acceptable?

Step 3: Verify totals
- Invoice total matches expected?
```

## Variance Tolerances

### Price Variances
| Variance | Action |
|----------|--------|
| 0% | Approve |
| <2% | Approve with note |
| 2-5% | Investigate |
| >5% | Hold for approval |

### Quantity Variances
| Variance | Action |
|----------|--------|
| 0% | Approve |
| Short delivery | Pay for received only |
| Over delivery | Verify acceptance |

## Common Validation Issues

### Issue Resolution
| Issue | Check | Resolution |
|-------|-------|------------|
| Price mismatch | Contract/quote | Adjust or dispute |
| Quantity mismatch | Delivery docket | Pay for received |
| Missing PO | Was order placed? | Create retro PO |
| Duplicate invoice | Previous invoices | Return to vendor |
| GST error | ABN + calculation | Request correction |
| Wrong vendor details | Our records | Verify identity |

## Vendor Verification

### New Vendors
```
Verify:
- Valid ABN (ABN lookup)
- Business name matches
- Bank details documented
- Contact details current
```

### Existing Vendors
```
Check for:
- Changed bank details (fraud risk)
- Updated contact info
- Contract still valid
```

## GST Validation

### GST Requirements
```
For valid tax invoice:
- Vendor ABN present
- "Tax Invoice" stated
- Date issued
- Description of items
- GST amount shown
- Total amount
```

### GST Treatment
| Scenario | Treatment |
|----------|-----------|
| Standard supply | 10% GST claimable |
| GST-free | No GST charged |
| Input taxed | No GST credit |
| Mixed | Apportion correctly |

## Fraud Prevention

### Red Flags
```
Watch for:
- Changed bank details
- Unusual invoice amounts
- Duplicate invoices
- Unknown vendors
- Rushed payment requests
- Email-only communication
```

### Verification Steps
```
If suspicious:
1. Call vendor (known number)
2. Verify bank details
3. Check invoice history
4. Get approval before payment
```

## Validation Documentation

### Record Keeping
```
Attach to each invoice:
- Purchase order (or approval)
- Delivery docket
- Validation checklist
- Approver signature
- Any correspondence
```

## Reporting

### Weekly Validation Report
```
INVOICE VALIDATION - Week of [Date]

Validated: X invoices ($X)
Passed: X (X%)
Issues found: X (X%)

Issues by type:
| Type | Count | Action |
|------|-------|--------|
| Price variance | X | Resolved/Open |
| Quantity variance | X | Resolved/Open |
| Missing documentation | X | Resolved/Open |
| GST error | X | Resolved/Open |

Time to validate (avg): X hours
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Validation accuracy | >99.5% |
| Discrepancy detection | >95% |
| Processing time | <24 hours |
| First-pass approval | >85% |

## Escalation

Alert Team Lead if:
- Suspected fraud
- Large discrepancy (>$500)
- Vendor dispute
- Systematic errors
