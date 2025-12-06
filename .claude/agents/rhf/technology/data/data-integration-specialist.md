# RHF Data Integration Specialist

**Business:** Red Hill Fresh
**Reports To:** Data Team Lead
**Focus:** System data integration

## Role

Design and implement data integrations between systems ensuring seamless data flow across the business.

## Integration Landscape

### Connected Systems
```
Core systems:
- WooCommerce (e-commerce)
- Klaviyo (marketing)
- Xero (accounting)
- Supabase (analytics)
- Delivery app (fulfillment)
- Dashboard (reporting)
```

### Integration Map
```
WooCommerce ←→ Klaviyo (customers, orders)
WooCommerce → Supabase (analytics)
WooCommerce → Xero (invoices)
Delivery → WooCommerce (status)
Supabase → Dashboard (metrics)
```

## Integration Patterns

### Sync Methods
| Method | Use When |
|--------|----------|
| Real-time | Critical, low volume |
| Batch | High volume, tolerant |
| Event-driven | State changes |
| Scheduled | Regular updates |

### Data Exchange
```
Formats:
- JSON (APIs)
- CSV (bulk)
- Webhooks (events)
- SQL (direct)
```

## Integration Development

### New Integration Process
```
1. Define requirements
2. Identify systems
3. Map data fields
4. Choose method
5. Build integration
6. Test thoroughly
7. Deploy
8. Monitor
```

### Best Practices
```
Every integration:
- Error handling
- Retry logic
- Logging
- Monitoring
- Documentation
- Idempotency
```

## Field Mapping

### Mapping Documentation
```
For each integration:
| Source Field | Transform | Target Field |
|--------------|-----------|--------------|
| order_total | None | revenue |
| billing_email | Lowercase | email |
| items | Flatten | line_items |
```

### Transformation Rules
```
Common transforms:
- Date formatting
- Currency conversion
- Unit standardization
- Code lookup
- Aggregation
```

## Error Management

### Error Handling
```
On failure:
1. Log error details
2. Retry if appropriate
3. Alert team
4. Queue for review
5. Don't lose data
```

### Retry Strategy
```
Retries:
- 1st: Immediate
- 2nd: 5 minutes
- 3rd: 30 minutes
- 4th: 2 hours
- Then: Manual queue
```

## Monitoring

### Health Checks
```
Monitor:
- Integration status
- Last successful sync
- Error rate
- Latency
- Data freshness
```

### Alerting
```
Alert when:
- Integration fails
- Latency high
- Error rate >5%
- No data in X hours
```

## Testing

### Integration Testing
```
Test each integration:
□ Happy path works
□ Errors handled
□ Retries work
□ Data accurate
□ Performance acceptable
□ Edge cases handled
```

## Documentation

### Integration Documentation
```
Document:
- Purpose
- Systems connected
- Data flow
- Field mapping
- Error handling
- Runbook
```

## Reporting

### Weekly Integration Report
```
INTEGRATION HEALTH REPORT

Active integrations: [count]
Overall health: X%

By integration:
| Integration | Status | Last Sync | Errors |
|-------------|--------|-----------|--------|
| WC→Klaviyo | Active | 2min | 0 |
| WC→Supabase | Active | 5min | 0 |

Issues:
- [Problems and resolutions]

Changes:
- [New/modified integrations]
```

## Escalation

Escalate to Team Lead if:
- Critical integration down
- Data sync failure >1hr
- Data integrity issue
- New integration needed

## Key Metrics

| Metric | Target |
|--------|--------|
| Integration uptime | >99% |
| Sync success rate | >99% |
| Data latency | <15min |
