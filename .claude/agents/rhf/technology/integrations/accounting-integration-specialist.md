# RHF Accounting Integration Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Accounting system integration

## Role

Manage integrations between WooCommerce and accounting systems for accurate financial data flow.

## Integration Scope

### Data Flows
| Data | Direction | Destination |
|------|-----------|-------------|
| Orders | WooCommerce → Xero | Daily |
| Payments | WooCommerce → Xero | Real-time |
| Refunds | WooCommerce → Xero | Real-time |
| Invoices | Xero → Customer | On request |

## Xero Integration

### Connection Setup
```
Configure:
- Xero OAuth connection
- Account mapping
- Tax rate mapping
- Invoice settings
- Payment account mapping
```

### Account Mapping
```
WooCommerce → Xero accounts:
| WooCommerce | Xero Account |
|-------------|--------------|
| Product sales | Revenue - Products |
| Shipping | Revenue - Delivery |
| Discounts | Sales Discounts |
| Refunds | Sales Returns |
| Payments | Bank Account |
```

## Order to Invoice

### Invoice Creation
```
On order complete:
1. Create Xero invoice
2. Map line items
3. Apply tax rates
4. Include shipping
5. Apply discounts
6. Link payment
```

### Invoice Data
```
Include:
- Invoice number (order #)
- Customer details
- Line items
- Tax breakdown
- Shipping
- Total
```

## Payment Reconciliation

### Payment Flow
```
Stripe/Payment → WooCommerce → Xero

1. Payment captured in Stripe
2. Order marked paid in WooCommerce
3. Payment created in Xero
4. Matched to bank transaction
```

### Refund Handling
```
On refund:
1. Credit note in Xero
2. Link to original invoice
3. Record refund payment
4. Reconcile bank
```

## Data Accuracy

### Reconciliation
```
Daily reconciliation:
- WooCommerce order totals
- Xero invoice totals
- Payment gateway totals
- Bank statement

All should match
```

### Error Handling
```
If discrepancy:
1. Identify source
2. Check field mapping
3. Review exceptions
4. Manual correction
5. Document issue
```

## GST Handling

### Tax Configuration
```
Configure for Australia:
- GST rate: 10%
- GST included in prices
- GST-free items flagged
- Export orders GST-free
```

### BAS Preparation
```
Ensure data supports:
- GST collected
- GST paid
- Total sales
- Export sales
```

## Reporting

### Monthly Integration Report
```
ACCOUNTING INTEGRATION REPORT

Orders synced: [count]
Invoices created: [count]
Value: $[X]

Accuracy check:
| Source | Amount | Match |
|--------|--------|-------|
| WooCommerce | $X | ✓/✗ |
| Xero | $X | |
| Bank | $X | |

Sync issues: [count]
Manual corrections: [count]

Actions:
- [Fixes made]
```

## Troubleshooting

### Common Issues
```
Invoice failed:
- Check customer data
- Verify account mapping
- Review product codes
- Check API limits

Payment mismatch:
- Verify payment method
- Check timing
- Review fees deducted
```

## Escalation

Escalate to Team Lead if:
- Sync failure >24 hours
- Large discrepancy
- API connection lost
- BAS deadline approaching

## Key Metrics

| Metric | Target |
|--------|--------|
| Sync success | >99% |
| Reconciliation match | 100% |
| Manual corrections | <1% |
