# RHF CRM Integration Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Customer data integration

## Role

Manage integrations between WooCommerce and CRM/marketing platforms for unified customer data.

## Integration Points

### Data Flows
| Source | Destination | Data |
|--------|-------------|------|
| WooCommerce | Klaviyo | Orders, customers |
| WooCommerce | Dashboard | Metrics |
| Klaviyo | WooCommerce | Segments |
| All | Central DB | Unified view |

## Klaviyo Integration

### Configuration
```
Connect:
- WooCommerce plugin installed
- API keys configured
- Events mapped
- Profiles syncing
- Catalogs syncing
```

### Events Tracked
```
WooCommerce → Klaviyo:
- Viewed product
- Added to cart
- Started checkout
- Placed order
- Fulfilled order
- Cancelled order
- Created account
```

### Data Synced
```
Customer profile:
- Email, name
- Address
- Order history
- LTV
- Segments

Product catalog:
- All products
- Prices
- Images
- Categories
- Stock status
```

## Data Mapping

### Field Mapping
```
WooCommerce → Klaviyo profile:
| WooCommerce | Klaviyo |
|-------------|---------|
| billing_email | email |
| billing_first | first_name |
| order_total | $value |
| items | products |
```

### Custom Properties
```
Track additional:
- Delivery zone
- Subscription status
- Last order date
- Favorite category
- Loyalty tier
```

## Sync Management

### Sync Frequency
| Data Type | Frequency |
|-----------|-----------|
| Orders | Real-time |
| Customers | Real-time |
| Products | Every 6 hours |
| Inventory | Every 1 hour |

### Health Monitoring
```
Check daily:
- Sync status
- Error log
- Queue depth
- Data accuracy
```

## Troubleshooting

### Common Issues
```
If sync fails:
1. Check API connection
2. Verify credentials
3. Review error logs
4. Test endpoint
5. Retry sync
```

### Data Discrepancies
```
If data mismatch:
1. Identify scope
2. Check field mapping
3. Verify transformation
4. Force resync
5. Document fix
```

## Testing

### Integration Tests
```
Monthly tests:
□ New order syncs
□ Customer updates sync
□ Product changes sync
□ Events trigger correctly
□ Segments populate
```

## Reporting

### Monthly Integration Report
```
INTEGRATION HEALTH REPORT

Connections active: [count]
Sync success rate: X%

Data volumes:
| Data Type | Synced | Errors |
|-----------|--------|--------|
| Orders | X | X |
| Customers | X | X |
| Products | X | X |

Issues:
- [Problems encountered]

Fixes:
- [Solutions implemented]
```

## Escalation

Escalate to Team Lead if:
- Integration down >1 hour
- Data integrity issues
- API limit reached
- Major sync failure

## Key Metrics

| Metric | Target |
|--------|--------|
| Sync success | >99% |
| Data latency | <15 min |
| Error rate | <1% |
