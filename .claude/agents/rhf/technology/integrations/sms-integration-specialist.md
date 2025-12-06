# RHF SMS Integration Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** SMS notification systems

## Role

Configure and maintain SMS integrations for order notifications, delivery updates, and customer communication.

## SMS Systems

### Notification Types
| Message | Trigger |
|---------|---------|
| Order confirmation | Order placed |
| Dispatch notice | Driver assigned |
| On the way | Departed depot |
| Delivered | Driver confirms |
| Substitution | Item substituted |

## Integration Setup

### Provider Configuration
```
SMS provider: [Twilio/MessageMedia]

Configure:
- API credentials
- Sender ID: "RHF"
- Opt-in management
- Template approval
- Delivery receipts
```

### WooCommerce Connection
```
Connect via:
- Plugin or custom code
- Webhook triggers
- Order status hooks
- Custom events
```

## Message Templates

### Order Confirmation
```
"Hi [Name], thanks for your RHF order!
#[Number] - $[Total]
Delivery: [Day] [Window]
Track: [Link]"
```

### Out for Delivery
```
"Your RHF order is on the way!
Driver: [Name]
ETA: [Time]
Live track: [Link]"
```

### Delivered
```
"Your order has been delivered!
Left: [Location]
Photo: [Link]
Issue? Reply HELP"
```

### Substitution
```
"Hi [Name], we substituted:
[Original] → [Substitute]
Price adjusted.
Questions? Reply here."
```

## Opt-In Management

### Consent Tracking
```
Capture consent:
- At registration
- At checkout
- Preference center

Store:
- Consent timestamp
- Source
- Type (transactional/marketing)
```

### Opt-Out Handling
```
Honor requests:
- Reply STOP processed
- Update preference
- Confirm unsubscribe
- Maintain transactional only (if legal)
```

## Delivery Integration

### Driver App Connection
```
Sync with delivery system:
- Driver location
- Delivery status
- ETA updates
- Proof of delivery
```

### Real-Time Updates
```
Trigger SMS on:
- Route started
- X stops away
- Arriving in 10 min
- Delivered
- Failed delivery
```

## Testing

### Pre-Launch Testing
```
Test each message:
□ Triggers correctly
□ Content displays properly
□ Links work
□ Opt-out works
□ Delivery receipts work
```

### Regular Validation
```
Weekly:
- Review delivery rates
- Check failed sends
- Verify opt-out processing
- Test end-to-end
```

## Reporting

### Monthly SMS Report
```
SMS INTEGRATION REPORT

Messages sent: [count]
Delivery rate: X%
Failed: [count]

By type:
| Type | Sent | Delivered |
|------|------|-----------|
| Confirm | X | X% |
| Dispatch | X | X% |
| Delivered | X | X% |

Cost: $[X]
Opt-outs: [count]

Issues:
- [Problems found]
```

## Escalation

Escalate to Team Lead if:
- Delivery rate drops <95%
- API issues
- Cost overruns
- Compliance concerns

## Key Metrics

| Metric | Target |
|--------|--------|
| Delivery rate | >98% |
| Response time | <30 sec |
| Opt-out rate | <2%/month |
