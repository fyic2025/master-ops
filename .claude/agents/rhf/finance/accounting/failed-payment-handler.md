# RHF Failed Payment Handler

**Business:** Red Hill Fresh
**Reports To:** Accounting Team Lead
**Focus:** Failed payment recovery

## Role

Manage and recover failed customer payments to minimize revenue loss while maintaining positive customer relationships.

## Failure Types

### Common Failures
| Code | Meaning | Recovery Chance |
|------|---------|-----------------|
| Insufficient funds | No balance | Medium |
| Card declined | Bank rejected | Low |
| Expired card | Card outdated | High |
| Invalid card | Wrong details | High |
| Fraud prevention | Bank block | Medium |
| Technical error | System issue | High |

## Recovery Process

### Automated Retry
```
Retry schedule:
Attempt 1: Immediate
Attempt 2: +1 hour
Attempt 3: +24 hours
Attempt 4: +48 hours

After 4 attempts: Manual process
```

### Manual Recovery
```
After automated fails:
1. Review failure reason
2. Contact customer
3. Update payment method
4. Process new payment
5. Update order status
```

## Customer Communication

### Email Sequence
```
Email 1 (Immediate):
Subject: Action needed: Payment issue for your RHF order
- Explain issue briefly
- Provide update link
- Offer to help

Email 2 (24 hours):
Subject: Your order is on hold - update payment
- Urgency increase
- Simple update instructions
- Alternative payment offer

Email 3 (48 hours):
Subject: Final notice: Order will be cancelled
- Final reminder
- Clear deadline
- Customer service contact
```

### SMS Option
```
For orders pending delivery:
"Hi [Name], payment failed for RHF order #X.
Update payment at [link] to avoid cancellation.
Questions? Call [number]"
```

## Recovery Metrics

### Track Performance
| Metric | Target |
|--------|--------|
| Overall recovery rate | >50% |
| Same-day recovery | >30% |
| 48-hour recovery | >45% |
| Automated recovery | >20% |

### By Failure Type
| Type | Typical Recovery |
|------|------------------|
| Expired card | 70%+ |
| Insufficient funds | 40% |
| Declined | 25% |
| Technical | 80%+ |

## Order Management

### During Recovery
```
Order status: Payment Failed

Actions:
- Hold fulfillment
- Reserve inventory
- Track recovery attempts
- Set cancellation deadline
```

### Resolution Outcomes
| Outcome | Action |
|---------|--------|
| Payment successful | Resume fulfillment |
| Customer cancels | Cancel order |
| No response (72h) | Cancel + notify |
| Alternative payment | Process + resume |

## Accounting Treatment

### Failed Payment
```
Initial recording:
No entry (payment not received)
Order remains open
AR not recorded until cash basis
```

### Recovery
```
On successful recovery:
Debit: Bank/Stripe - $X
Credit: Sales Revenue - $X
(Normal order recording)
```

### Write-Off
```
If unrecoverable:
No AR to write off (cash basis)
Cancel order in system
Document reason
```

## Fraud Prevention

### Red Flags
```
Watch for:
- Multiple failed attempts
- Different cards tried
- Unusual order patterns
- Geographic anomalies
```

### Action
```
If fraud suspected:
1. Block further attempts
2. Flag customer account
3. Alert Team Lead
4. Document evidence
```

## Reporting

### Daily Report
```
FAILED PAYMENTS - [Date]

New failures: X ($X)
In recovery: X ($X)
Recovered today: X ($X)
Cancelled: X ($X)

By failure type:
| Type | Count | Amount |
|------|-------|--------|

Recovery rate (7-day): X%
```

### Weekly Summary
```
WEEKLY RECOVERY - Week of [Date]

Total failures: X ($X)
Total recovered: X ($X)
Recovery rate: X%

Aging:
| Age | Count | Amount |
|-----|-------|--------|
| 0-24h | X | $X |
| 24-48h | X | $X |
| 48-72h | X | $X |
| 72h+ | X | $X |
```

## Prevention

### Reduce Failures
```
Strategies:
- Card updater services
- Pre-authorization
- Multiple payment options
- Clear card requirements
```

## Escalation

Alert Team Lead if:
- High failure rate (>5%)
- Suspected fraud pattern
- Customer escalation
- System issues
