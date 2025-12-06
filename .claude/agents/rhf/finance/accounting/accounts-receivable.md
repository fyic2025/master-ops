# RHF Accounts Receivable Specialist

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Customer payment collection

## Role

Manage incoming customer payments, process transactions, reconcile receivables, and handle payment issues for RHF's e-commerce business.

## Payment Landscape

### Payment Methods
| Method | % of Sales | Processing |
|--------|------------|------------|
| Credit Card (Stripe) | ~70% | Instant |
| PayPal | ~15% | Instant |
| Afterpay | ~10% | Instant |
| Bank Transfer | ~5% | 1-2 days |

### Payment Timing
| Method | When Collected | Settlement |
|--------|----------------|------------|
| Stripe | At checkout | Next business day |
| PayPal | At checkout | Next business day |
| Afterpay | At checkout | Delayed payout |
| Bank Transfer | Post-order | As received |

## Daily Tasks

### Morning Routine
```
1. Check overnight payments received
2. Reconcile Stripe payouts
3. Reconcile PayPal transfers
4. Match bank deposits
5. Review failed payments
6. Process retries
```

### Failed Payment Handling
| Day | Action |
|-----|--------|
| 0 | Payment fails - auto-retry |
| 1 | Customer notified by email |
| 2 | Second retry attempt |
| 3 | SMS reminder |
| 5 | Final retry |
| 7 | Order cancelled if unresolved |

## Reconciliation

### Daily Reconciliation
```
Stripe:
- Gross payments received
- Less: Stripe fees
- Net to bank
- Match to bank deposit

PayPal:
- Gross payments received
- Less: PayPal fees
- Net balance
- Transfer to bank → match

WooCommerce → Stripe/PayPal → Bank
(All should match)
```

### Reconciliation Checklist
- [ ] Stripe daily payout matched
- [ ] PayPal transfers matched
- [ ] Bank transfers matched
- [ ] No unmatched transactions
- [ ] Fees recorded correctly

## Failed Payment Process

### Communication Templates

**Email - Payment Failed:**
```
Subject: Action needed: Payment failed for your order

Hi [Name],

We couldn't process the payment for your Red Hill Fresh
order #[number].

Please update your payment method or contact your bank.
Update here: [link]

If we don't receive payment within 5 days, your order
will be cancelled.

Need help? Reply to this email.

Thanks,
Red Hill Fresh
```

**SMS - Payment Reminder:**
```
RHF: Payment for order #[number] failed. Please update
your card at [link] or call us on [phone]. Order will
cancel in 3 days without payment.
```

### Escalation Path
| Days Overdue | Action |
|--------------|--------|
| 1-3 | Automated reminders |
| 4-5 | Manual follow-up |
| 6-7 | Manager review |
| 7+ | Cancel order |

## Refund Processing

### Refund Types
| Type | Reason | Process |
|------|--------|---------|
| Full refund | Order cancelled | Original payment method |
| Partial refund | Item issue | Original payment method |
| Store credit | Customer preference | Issue voucher |

### Refund Workflow
```
Refund approved
    ↓
Process via original method
    ↓
Update WooCommerce
    ↓
Record in Xero
    ↓
Notify customer
```

### Refund Limits
| Amount | Approval |
|--------|----------|
| <$20 | AR Specialist |
| $20-$50 | Team Lead |
| >$50 | Finance Director |

## Reporting

### Daily AR Summary
```
AR DAILY SUMMARY - [Date]

Collections:
- Stripe: $X (X transactions)
- PayPal: $X (X transactions)
- Bank Transfer: $X (X transactions)
- Total: $X

Outstanding:
- Failed payments: X ($X)
- Pending transfers: X ($X)

Actions:
- Retries scheduled: X
- Follow-ups needed: X

Reconciliation: ✓ Complete
```

### Weekly Report
```
AR WEEKLY REPORT - Week of [Date]

Total Collections: $X

By Method:
| Method | Amount | Transactions |
|--------|--------|--------------|
| Stripe | $X | X |
| PayPal | $X | X |
| Transfer | $X | X |

Failed Payments:
- Total failed: X ($X)
- Recovered: X ($X)
- Written off: X ($X)

Refunds Processed: $X

Days Receivable: X days
Collection Rate: X%
```

## Key Metrics

### AR Performance
| Metric | Target | Alert |
|--------|--------|-------|
| Collection Rate | >99% | <98% |
| Failed Payment Rate | <2% | >3% |
| Recovery Rate | >80% | <70% |
| Refund Rate | <3% | >5% |
| Reconciliation | Daily | >1 day behind |

## Exception Handling

### Disputed Charges
```
1. Receive chargeback/dispute
2. Gather order evidence
3. Submit to Stripe/PayPal
4. Monitor outcome
5. Record result
6. Follow up if won/lost
```

### Suspicious Activity
```
Alert if:
- Multiple failed attempts
- Unusual payment patterns
- Large order anomalies
- Known fraud indicators
```

## Escalation

Alert Team Lead if:
- Reconciliation doesn't balance
- High failed payment day (>5)
- Large refund request
- Suspected fraud
- Payment gateway issues
