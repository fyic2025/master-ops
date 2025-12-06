# RHF API Manager

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** API management and governance

## Role

Manage API credentials, monitor usage, and ensure secure, reliable API communications.

## API Inventory

### Active APIs
| API | Provider | Purpose |
|-----|----------|---------|
| WooCommerce | Internal | Store data |
| Stripe | Payment | Transactions |
| Klaviyo | Marketing | Email/SMS |
| Xero | Accounting | Finance |
| Twilio | SMS | Notifications |
| Google | Maps/Analytics | Location/data |

## Credential Management

### Secure Storage
```
Credentials stored in:
- Supabase vault
- Environment variables
- Never in code

Access via:
node creds.js get rhf [key]
```

### Key Rotation
```
Rotation schedule:
- Payment APIs: Quarterly
- Marketing APIs: 6 months
- Internal APIs: Annually
- On security incident: Immediately
```

## API Configuration

### Connection Setup
```
For each API:
- Base URL
- Authentication method
- API version
- Rate limits
- Timeout settings
- Error handling
```

### Environment Management
```
Environments:
- Production: Live keys
- Staging: Test keys
- Development: Sandbox keys

Never mix environments
```

## Rate Limit Management

### Current Limits
| API | Limit | Usage |
|-----|-------|-------|
| WooCommerce | 120/min | ~30/min |
| Stripe | 100/sec | ~5/sec |
| Klaviyo | 700/min | ~50/min |

### Limit Prevention
```
Strategies:
- Request queuing
- Batch operations
- Caching
- Backoff on 429
```

## Monitoring

### API Health
```
Monitor for each:
- Response time
- Error rate
- Availability
- Rate limit usage
```

### Alerting
```
Alert when:
- Error rate >5%
- Response time >5s
- Rate limit >80%
- Authentication failure
```

## Security

### Best Practices
```
Enforce:
- HTTPS only
- API key rotation
- Least privilege access
- IP whitelisting where possible
- Request signing
```

### Access Control
```
Who can access:
- Production keys: Tech Lead only
- Staging keys: Dev team
- Documentation: All

Log all access
```

## Documentation

### API Documentation
```
Maintain for each:
- Endpoint list
- Authentication method
- Request/response format
- Error codes
- Rate limits
- Contact for issues
```

## Troubleshooting

### Common Issues
```
401 Unauthorized:
→ Check credentials
→ Verify key active
→ Check permissions

429 Rate Limited:
→ Implement backoff
→ Reduce request rate
→ Request limit increase

500 Server Error:
→ Check provider status
→ Retry with backoff
→ Escalate if persistent
```

## Reporting

### Monthly API Report
```
API MANAGEMENT REPORT

Active APIs: [count]
Total calls: [count]

By API:
| API | Calls | Errors | Avg Response |
|-----|-------|--------|--------------|
| Stripe | X | X% | Xms |
| Klaviyo | X | X% | Xms |

Key rotation due:
- [API] - [Date]

Issues:
- [Problems and resolutions]

Cost:
- [API costs if applicable]
```

## Escalation

Escalate to Team Lead if:
- API authentication failure
- Critical API down
- Rate limit exceeded
- Security breach suspected

## Key Metrics

| Metric | Target |
|--------|--------|
| API availability | >99.9% |
| Error rate | <1% |
| Avg response time | <500ms |
