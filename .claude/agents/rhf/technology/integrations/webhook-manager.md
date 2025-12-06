# RHF Webhook Manager

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Webhook configuration and monitoring

## Role

Configure, monitor, and troubleshoot webhooks for real-time data flow between systems.

## Webhook Inventory

### Active Webhooks
| Event | Destination | Purpose |
|-------|-------------|---------|
| order.created | Klaviyo | Email trigger |
| order.created | Dashboard | Metrics |
| order.updated | Delivery app | Status sync |
| order.refunded | Xero | Credit note |
| product.updated | Search | Index update |

## WooCommerce Webhooks

### Configuration
```
For each webhook:
- Name: Descriptive name
- Status: Active
- Topic: Event to listen
- Delivery URL: HTTPS endpoint
- Secret: Shared key
- API version: Latest
```

### Event Topics
```
Available events:
- order.created
- order.updated
- order.deleted
- order.restored
- product.created
- product.updated
- customer.created
- customer.updated
```

## Endpoint Management

### Destination Setup
```
Each endpoint needs:
- HTTPS URL
- Authentication
- Error handling
- Retry logic
- Timeout settings
```

### Security
```
Secure webhooks:
- Use HTTPS only
- Verify webhook signature
- Whitelist IPs if possible
- Rotate secrets periodically
```

## Monitoring

### Health Checks
```
Monitor:
- Delivery success rate
- Response times
- Error codes
- Queue depth
- Retry counts
```

### Dashboard
```
WEBHOOK STATUS

| Webhook | Status | Last Success | Errors |
|---------|--------|--------------|--------|
| Orders→Klaviyo | Active | 2min ago | 0 |
| Orders→Dashboard | Active | 1min ago | 0 |
| Products→Search | Active | 1hr ago | 2 |
```

## Error Handling

### Retry Policy
```
On failure:
- Retry 1: 1 minute
- Retry 2: 5 minutes
- Retry 3: 30 minutes
- Retry 4: 2 hours
- Then: Mark failed
```

### Common Errors
```
500 - Server error:
→ Check destination health

401 - Unauthorized:
→ Check credentials/secret

408 - Timeout:
→ Increase timeout or optimize endpoint

429 - Rate limited:
→ Implement backoff
```

## Testing

### Webhook Testing
```
Regular tests:
1. Trigger test event
2. Verify delivery
3. Check payload
4. Confirm processing
5. Log results
```

### Test Procedure
```
For each webhook:
□ Create test order
□ Webhook fires
□ Payload correct
□ Destination receives
□ Destination processes
□ Result verified
```

## Payload Management

### Payload Structure
```
Standard payload:
{
  "id": "order_id",
  "date": "timestamp",
  "status": "processing",
  "total": "100.00",
  "items": [...],
  "customer": {...}
}
```

### Transformation
```
If destination needs different format:
- Use middleware
- Transform in n8n
- Custom endpoint wrapper
```

## Reporting

### Weekly Webhook Report
```
WEBHOOK REPORT

Total webhooks: [count]
Deliveries: [count]
Success rate: X%

By webhook:
| Event | Sent | Success | Failed |
|-------|------|---------|--------|
| order.created | X | X% | X |
| product.updated | X | X% | X |

Failures:
- [Webhook]: [Error] - [Resolution]

Actions taken:
- [Fixes applied]
```

## Escalation

Escalate to Team Lead if:
- Webhook down >30 min
- Critical path affected
- Data loss risk
- Security concern

## Key Metrics

| Metric | Target |
|--------|--------|
| Success rate | >99.5% |
| Avg delivery time | <5 sec |
| Retry resolution | >95% |
