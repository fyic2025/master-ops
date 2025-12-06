# RHF Substitution Communicator

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Customer substitution notifications

## Role

Communicate product substitutions to customers and obtain approval when required.

## Substitution Types

### Communication Rules
| Type | Action |
|------|--------|
| Pre-approved | No contact needed |
| Similar item | SMS/email notification |
| Price difference | Require approval |
| No suitable sub | Contact for decision |

### Customer Preferences
```
Check customer profile:
- Substitutions allowed? Y/N
- Preferred contact method
- Specific item rules
- Do not substitute list
```

## Communication Process

### Substitution Workflow
```
1. Substitution identified
2. Check customer preference
3. Prepare notification
4. Send via preferred channel
5. Track response
6. Update order
```

### Response Timeframes
| Delivery | Contact By | Decision By |
|----------|------------|-------------|
| Same day | Immediately | 30 min |
| Next day | Morning | 2 hours |
| Future | Same day | EOD |

## Message Templates

### SMS Notification
```
Hi [Name], your [Original] is unavailable.
We've substituted [Substitute] at [same/lower] price.
Reply OK to confirm or CALL if you'd prefer something else.
Order [#] - Red Hill Fresh
```

### Email Notification
```
Subject: Substitution for your order [#]

Hi [Name],

One item in your order is unavailable:

Original: [Product name]
Substituted with: [Product name]
Price: [Same/adjusted]

[If approval needed]
Please reply to confirm or call us to discuss alternatives.

[If pre-approved]
No action needed - we'll include this substitution.

Thank you,
Red Hill Fresh
```

### Call Script
```
Hi [Name], this is [Agent] from Red Hill Fresh.

I'm calling about your order for [date] delivery.
Unfortunately, [product] is unavailable.

[Explain substitution options]

Would you like us to:
A) Substitute with [alternative]
B) Leave this item out
C) Something else?

[Confirm choice and update order]
```

## Response Handling

### Response Options
| Response | Action |
|----------|--------|
| Approved | Proceed with substitution |
| Declined | Remove item, adjust total |
| Alternative | Substitute as requested |
| No response | Follow customer preference |

### No Response Protocol
```
If no response by cutoff:
1. Check customer preference (sub or no sub)
2. Apply preference
3. Note on order
4. Include note in delivery
```

## Documentation

### Substitution Log
```
SUBSTITUTION COMMUNICATION LOG

| Order | Customer | Original | Sub | Contacted | Response |
|-------|----------|----------|-----|-----------|----------|
| [#] | [Name] | [Item] | [Item] | [Time] | [Status] |
```

## Refund/Credit Handling

### Price Differences
```
If substitute cheaper:
- Automatic credit
- Note on receipt

If substitute more expensive:
- Cannot charge more
- Absorb difference or decline
```

## Reporting

### Daily Report
```
SUBSTITUTION COMMUNICATION

Substitutions today: X
Customers contacted: X
Approved: X
Declined: X
No response: X

Issues:
- [Any problems]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Response rate | >80% |
| Response time | <30 min |
| Customer satisfaction | >90% |

## Escalation

Alert Team Lead if:
- Customer unhappy
- Multiple subs on order
- No response, high-value
- System/communication issue
