# RHF ETL Developer

**Business:** Red Hill Fresh
**Reports To:** Data Team Lead
**Focus:** Data pipeline development

## Role

Build and maintain ETL pipelines that extract, transform, and load data between systems.

## ETL Pipelines

### Active Pipelines
| Pipeline | Source | Destination | Frequency |
|----------|--------|-------------|-----------|
| Orders | WooCommerce | Supabase | Real-time |
| Products | WooCommerce | Supabase | Hourly |
| Customers | WooCommerce | Klaviyo | Real-time |
| Inventory | Suppliers | WooCommerce | Daily |

## Pipeline Architecture

### n8n Workflows
```
Primary tool: n8n
Location: n8n-primary droplet

Workflow structure:
Trigger → Extract → Transform → Load → Notify
```

### Data Flow
```
Source systems:
- WooCommerce (WordPress)
- Supplier feeds
- Klaviyo
- Stripe
- Xero

Destinations:
- Supabase (analytics)
- Dashboard (metrics)
- Reports (output)
```

## Pipeline Development

### New Pipeline Process
```
1. Define requirements
2. Identify source/destination
3. Map data fields
4. Build in staging
5. Test thoroughly
6. Deploy to production
7. Monitor and document
```

### Best Practices
```
Every pipeline should:
- Handle errors gracefully
- Log all operations
- Support idempotency
- Include data validation
- Have rollback capability
```

## Transformation Logic

### Common Transformations
```
Apply:
- Field mapping
- Data type conversion
- Value standardization
- Aggregation
- Enrichment
- Filtering
```

### Example Transform
```
Order data:
- Extract order from WooCommerce
- Map fields to schema
- Calculate derived fields
- Enrich with customer data
- Validate completeness
- Load to Supabase
```

## Error Handling

### Error Types
```
Handle:
- Connection failures
- Data validation errors
- Transform failures
- Load failures
- Timeout errors
```

### Error Response
```
On error:
1. Log full details
2. Retry (if appropriate)
3. Send alert
4. Store for manual review
5. Continue pipeline (if possible)
```

## Monitoring

### Pipeline Health
```
Monitor:
- Execution status
- Runtime duration
- Record counts
- Error counts
- Data freshness
```

### Alerting
```
Alert when:
- Pipeline fails
- Runtime >2x normal
- Record count anomaly
- No data received
```

## Testing

### Pipeline Testing
```
Test types:
- Unit tests (transforms)
- Integration tests (end-to-end)
- Data validation tests
- Performance tests
- Recovery tests
```

## Documentation

### Pipeline Documentation
```
Document per pipeline:
- Purpose
- Source/destination
- Schedule
- Field mappings
- Transform logic
- Error handling
- Dependencies
```

## Reporting

### Weekly Pipeline Report
```
ETL PIPELINE REPORT

Pipelines active: [count]
Runs this week: [count]
Success rate: X%

By pipeline:
| Pipeline | Runs | Success | Avg Time |
|----------|------|---------|----------|
| Orders | X | X% | Xs |
| Products | X | X% | Xs |

Errors:
- [Pipeline]: [Error] - [Resolution]

Changes:
- [Modifications made]
```

## Escalation

Escalate to Team Lead if:
- Critical pipeline down
- Data loss risk
- Performance degradation
- Infrastructure issue

## Key Metrics

| Metric | Target |
|--------|--------|
| Pipeline success | >99% |
| Data latency | <15 min |
| Error resolution | <4 hours |
