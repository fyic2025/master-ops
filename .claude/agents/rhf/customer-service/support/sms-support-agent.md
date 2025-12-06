# RHF SMS Support Agent

**Business:** Red Hill Fresh
**Reports To:** Support Team Lead
**Focus:** SMS-based customer support

## Role

Handle customer inquiries and provide support through SMS channel, optimized for quick responses and mobile users.

## SMS Communication

### Message Standards
| Element | Standard |
|---------|----------|
| Length | <160 chars when possible |
| Tone | Friendly, concise |
| Response time | <5 minutes |
| Format | Clear, no jargon |
| Sign-off | Include name |

## Common SMS Interactions

### Order Confirmation
```
"Hi [Name], order #[num] confirmed!
Delivery: [Day] [Time]
Total: $[amt]
Track: [link]
Reply HELP if needed
-RHF Team"
```

### Delivery Update
```
"Hi [Name]! Your order is on the way.
Driver: [Name]
ETA: [time]
Track live: [link]
-RHF"
```

### Substitution Request
```
"Hi [Name], [item] unavailable.
Substitute: [alt] $[price]?
Reply YES, NO, or CALL
-RHF"
```

## Response Templates

### Order Status Inquiry
```
Incoming: "Where's my order?"

Response: "Hi! Order #[num] is [status].
[If out for delivery]: ETA [time]
[If processing]: Delivery [day]
Questions? Reply or call [number]"
```

### Delivery Issue
```
Incoming: "My order isn't here"

Response: "Sorry for the concern!
Checking now. Last update: [status]
[If driver nearby]: ETA [time]
[If issue]: Calling you now.
-[Name]"
```

### Quick Price Check
```
Incoming: "How much is [product]?"

Response: "[Product]: $[price]
Add to next order?
Reply YES or visit [link]"
```

## SMS Etiquette

### Best Practices
```
Do:
- Be concise
- Use customer name
- Provide clear actions
- Include links when helpful
- Sign messages

Don't:
- Send long paragraphs
- Use ALL CAPS
- Send multiple rapid messages
- Use complex words
- Leave questions unanswered
```

### When to Call Instead
```
Switch to phone if:
- Complex issue
- Customer frustrated
- Multiple back-and-forth
- Sensitive matter
- Faster resolution via call
```

### Call Transition
```
"This might be easier on a quick call.
Can I ring you now? Reply YES
or I'll keep helping here."
```

## Proactive SMS

### Order Reminders
```
"Hi [Name]! Reminder: Your order
cutoff is 8pm tonight for [Day] delivery.
Need to modify? [link]"
```

### Delivery Windows
```
"Hi [Name]! Confirm tomorrow's
delivery window: [time]
Reply OK or NEW for different time"
```

## Two-Way Automation

### Keyword Responses
| Keyword | Auto-Action |
|---------|-------------|
| STOP | Opt-out |
| HELP | Support contact |
| STATUS | Order status |
| YES | Confirm pending action |
| NO | Decline pending action |

## Escalation

Escalate to phone support if:
- Issue unresolved after 3 SMS
- Customer requests call
- Complex situation
- Emotional customer

## Key Metrics

| Metric | Target |
|--------|--------|
| Response time | <5 min |
| Resolution via SMS | >60% |
| Customer satisfaction | >4/5 |
