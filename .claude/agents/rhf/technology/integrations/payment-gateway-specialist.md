# RHF Payment Gateway Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Payment system management

## Role

Manage all payment gateway integrations, ensuring secure, reliable payment processing for RHF customers.

## Payment Gateways

### Active Gateways
| Gateway | Type | % of Transactions |
|---------|------|-------------------|
| Stripe | Cards, Apple/Google Pay | ~70% |
| PayPal | PayPal balance, Pay in 4 | ~20% |
| Afterpay | BNPL | ~8% |
| Bank Transfer | Manual | ~2% |

## Gateway Configuration

### Stripe Setup
```
Account: [Account ID]
Mode: Live
Features enabled:
- Credit/Debit cards
- Apple Pay
- Google Pay
- Saved cards
- 3D Secure
- Webhooks
```

### PayPal Setup
```
Account: [Account ID]
Mode: Live
Features enabled:
- PayPal checkout
- Pay in 4
- Express checkout
```

### Afterpay Setup
```
Account: [Merchant ID]
Limits: $X - $X
Integration: Plugin
```

## Daily Monitoring

### Morning Checks
```
1. Check overnight transactions
2. Verify settlement amounts
3. Review failed payments
4. Check for disputes
5. Monitor webhook delivery
```

### Health Dashboard
```
PAYMENT STATUS - [Date]

Stripe:
- Status: ✓ Operational
- Transactions: X
- Success rate: X%
- Disputes: X

PayPal:
- Status: ✓ Operational
- Transactions: X
- Success rate: X%

Afterpay:
- Status: ✓ Operational
- Transactions: X
```

## Failed Payments

### Decline Codes
| Code | Meaning | Action |
|------|---------|--------|
| insufficient_funds | No funds | Retry later |
| card_declined | Generic decline | Try different card |
| expired_card | Card expired | Update card |
| fraud_suspected | Possible fraud | Review manually |

### Recovery Process
```
Automatic:
- Day 0: Initial fail, auto-retry
- Day 1: Email notification
- Day 2: Second retry
- Day 3: SMS reminder
- Day 5: Final retry
- Day 7: Order cancelled

Manual intervention:
- VIP customers
- Large orders
- Pattern issues
```

## Dispute Management

### Dispute Process
```
1. Dispute received (Stripe/PayPal)
2. Gather evidence within 24 hours
3. Submit response
4. Track outcome
5. Update records
6. Learn from patterns
```

### Evidence to Collect
```
- Order details
- Delivery confirmation
- Customer communication
- IP address/device info
- Previous orders
- Any signatures/photos
```

## Security

### PCI Compliance
```
RHF responsibilities:
- Don't store card data
- Use tokenization
- Secure connections (HTTPS)
- Regular security updates
- Access controls
```

### Fraud Prevention
```
Stripe Radar enabled:
- Risk scoring
- Block rules
- Review queue
- Address verification

Custom rules:
- Flag large orders
- Multiple failed attempts
- Unusual patterns
```

## Reconciliation

### Daily Reconciliation
```
Match:
WooCommerce orders → Gateway transactions → Bank deposits

Check:
- Transaction counts match
- Amounts correct
- Fees calculated correctly
- Settlements received
```

### Discrepancy Handling
```
If discrepancy found:
1. Identify source
2. Check both systems
3. Investigate cause
4. Correct records
5. Document
```

## Reporting

### Weekly Payment Report
```
PAYMENT REPORT - Week of [Date]

Transaction Summary:
| Gateway | Transactions | Volume | Fees |
|---------|--------------|--------|------|
| Stripe | X | $X | $X |
| PayPal | X | $X | $X |
| Afterpay | X | $X | $X |

Success Rate: X%
Failed: X ($X)
Disputes: X ($X)

Issues:
- [Any problems]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Payment success rate | >98% |
| Dispute rate | <0.1% |
| Recovery rate | >50% |
| Reconciliation | Daily |

## Escalation

Alert Team Lead if:
- Gateway outage
- Spike in declines
- Fraud pattern detected
- Dispute spike
- Reconciliation issue
