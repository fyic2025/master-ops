# RHF Email Integration Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Email platform integrations

## Role

Manage email system integrations ensuring reliable transactional email delivery and marketing platform connectivity.

## Email Systems

### Transactional Email
```
Provider: [Postmark/SendGrid/etc]
Purpose: Order confirmations, delivery updates
Sending domain: orders@redhillfresh.com.au
```

### Marketing Email
```
Provider: Klaviyo
Purpose: Campaigns, flows, newsletters
Sending domain: news@redhillfresh.com.au
```

## WooCommerce to Klaviyo

### Data Sync
```
Customer data synced:
- Email
- Name
- Phone
- Address
- Order history
- Lifetime value
- Tags/segments

Sync frequency: Real-time webhooks
```

### Event Tracking
| Event | Klaviyo Action |
|-------|----------------|
| Order placed | Trigger flows |
| Order shipped | Update status |
| Checkout started | Abandoned cart |
| Product viewed | Browse tracking |
| Account created | Welcome flow |

### Integration Health
```
Daily check:
□ Events flowing
□ Customer sync working
□ No errors in logs
□ Metrics accurate
```

## Transactional Email

### Email Types
| Email | Trigger | Template |
|-------|---------|----------|
| Order confirmation | Order placed | WooCommerce |
| Payment received | Payment complete | WooCommerce |
| Order shipped | Status change | WooCommerce |
| Delivery reminder | 1 day before | Custom |
| Delivered | Delivery confirmed | Custom |

### Deliverability

**DNS Configuration**
```
Required records:
- SPF: v=spf1 include:...
- DKIM: Signed with domain key
- DMARC: Policy configured
```

**Monitoring**
| Metric | Target | Alert |
|--------|--------|-------|
| Delivery rate | >99% | <98% |
| Bounce rate | <1% | >2% |
| Spam rate | <0.1% | >0.3% |

## Integration Setup

### Klaviyo Integration
```
Connection method: Plugin/API
API Key: [Stored securely]
Events tracked: [List]
Custom properties: [List]
```

### Transactional Setup
```
SMTP settings:
- Host: [Provider host]
- Port: 587/465
- Auth: API key
- TLS: Required
```

## Troubleshooting

### Common Issues
| Issue | Check | Fix |
|-------|-------|-----|
| Emails not sending | SMTP settings | Verify credentials |
| Not syncing to Klaviyo | Plugin status | Reconnect |
| Wrong data | Mapping | Review field mapping |
| Delayed | Queue | Check server load |

### Debug Process
```
1. Check email logs
2. Verify API connectivity
3. Test send
4. Check spam folders
5. Review DNS
6. Contact provider if needed
```

## Data Quality

### Customer Data
```
Ensure:
- Email validation
- No duplicates
- Proper formatting
- Opt-in status correct
- Suppression lists honored
```

### List Hygiene
```
Regular cleanup:
- Remove bounces
- Update suppressions
- Sync unsubscribes
- Validate emails
```

## Monitoring

### Daily Checks
```
INTEGRATION STATUS - [Date]

Klaviyo:
- Connection: ✓
- Last sync: [Time]
- Events (24h): X
- Errors: X

Transactional:
- Status: ✓
- Sent (24h): X
- Delivered: X%
- Bounced: X
```

### Alerts
```
Alert if:
- Delivery rate drops
- Sync stops
- Error spike
- Authentication fails
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Email delivery rate | >99% |
| Klaviyo sync | Real-time |
| Integration uptime | 100% |
| Error rate | <0.1% |

## Reporting

Weekly integration report:
- Sync status
- Email performance
- Issues encountered
- Actions taken

## Escalation

Alert Team Lead if:
- Integration down
- Deliverability issue
- Data sync problem
- Authentication failure
