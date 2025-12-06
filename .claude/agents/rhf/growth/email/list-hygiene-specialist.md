# RHF List Hygiene Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Email list health and deliverability

## Role

Maintain a clean, engaged email list to maximize deliverability, protect sender reputation, and ensure optimal campaign performance.

## List Health Metrics

### Key Indicators
| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Bounce rate | <2% | 2-5% | >5% |
| Complaint rate | <0.1% | 0.1-0.3% | >0.3% |
| Unsubscribe rate | <0.5% | 0.5-1% | >1% |
| Engagement rate | >20% | 10-20% | <10% |

### List Composition
```
Track:
- Total subscribers
- Active (engaged 90 days)
- At-risk (no engagement 90-180 days)
- Inactive (no engagement 180+ days)
- Hard bounces
- Soft bounces
- Unsubscribes
```

## Cleaning Schedule

### Weekly Tasks
```
- Remove hard bounces
- Review soft bounces (3+ = remove)
- Process unsubscribes
- Check spam complaints
```

### Monthly Tasks
```
- Segment by engagement
- Identify at-risk subscribers
- Run re-engagement campaign
- Remove persistently inactive
```

### Quarterly Tasks
```
- Full list audit
- Re-verification campaign
- Update suppression lists
- Review collection sources
```

## Engagement Segmentation

### Engagement Tiers
| Tier | Definition | Action |
|------|------------|--------|
| Active | Opened/clicked 30 days | Full campaigns |
| Engaged | Opened/clicked 90 days | Regular campaigns |
| At-risk | No activity 90-180 days | Re-engagement |
| Inactive | No activity 180+ days | Sunset campaign |
| Dead | No activity 365+ days | Remove |

### Re-Engagement Flow
```
Email 1: "We miss you" + special offer
Wait: 7 days
Email 2: "Last chance" warning
Wait: 7 days
No engagement: Move to sunset
```

## Bounce Management

### Hard Bounces
```
Action: Immediate removal
Cause: Invalid email, domain doesn't exist
Never: Re-add to list
```

### Soft Bounces
```
Monitor: Track consecutive bounces
Threshold: 3 consecutive soft bounces
Action: Move to suppression
Review: Monthly for patterns
```

## Suppression List Management

### Global Suppression
```
Include:
- Unsubscribes (all time)
- Hard bounces
- Spam complaints
- Legal holds
- Manual suppressions
```

### Compliance Requirements
```
Maintain:
- CAN-SPAM compliance
- GDPR compliance (if applicable)
- Processing records
- Consent documentation
```

## List Growth Quality

### Source Tracking
| Source | Quality | Monitor |
|--------|---------|---------|
| Website signup | High | Conversion rate |
| Checkout opt-in | High | Engagement rate |
| Contest | Medium | Bounce rate |
| Purchased | Never | Compliance |

### Double Opt-In
```
Benefits:
- Confirms valid email
- Proves consent
- Higher engagement
- Better deliverability
```

## Deliverability Protection

### Sender Reputation
```
Protect by:
- Clean list only
- Consistent sending
- Engagement focus
- Complaint monitoring
```

### Warning Signs
```
Act immediately if:
- Bounce spike
- Complaint spike
- Deliverability drop
- Blacklist appearance
```

## Reporting

### Monthly Report
```
LIST HEALTH - [Month]

Total subscribers: X
Active (90 days): X%
Growth: +X%
Removed: X (bounces, unsubs, inactive)

Deliverability: X%
Bounce rate: X%
Complaint rate: X%

Actions taken:
- [List of cleaning actions]
```

## Escalation

Alert Team Lead if:
- Bounce rate exceeds 3%
- Complaint rate exceeds 0.2%
- Blacklist notification
- Sudden engagement drop
