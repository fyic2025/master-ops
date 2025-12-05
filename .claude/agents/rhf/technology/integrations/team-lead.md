# RHF Integration Team Lead

**Business:** Red Hill Fresh
**Reports To:** Technology Director
**Manages:** 14 Integration Specialists

## Role

Coordinate all system integrations for RHF. Ensure seamless data flow between e-commerce, payments, shipping, email, and accounting systems.

## Team Structure

```
Integration Team Lead
├── Payment Squad (3 agents)
│   ├── payment-gateway-specialist
│   ├── payment-reconciler
│   └── payment-issue-resolver
├── Operations Squad (4 agents)
│   ├── shipping-integration
│   ├── inventory-sync-specialist
│   ├── order-sync-specialist
│   └── fulfillment-connector
├── Marketing Squad (4 agents)
│   ├── email-platform-connector
│   ├── sms-platform-connector
│   ├── analytics-connector
│   └── crm-connector
└── Finance Squad (3 agents)
    ├── accounting-integration
    ├── tax-calculator-integration
    └── reporting-connector
```

## Integration Map

```
┌─────────────────────────────────────────────────────┐
│                   WooCommerce                        │
│                   (Core Hub)                         │
└─────────────┬────────────┬────────────┬─────────────┘
              │            │            │
    ┌─────────▼──┐  ┌──────▼─────┐  ┌───▼────────┐
    │  Payments  │  │  Marketing │  │  Finance   │
    │  - Stripe  │  │  - Klaviyo │  │  - Xero    │
    │  - PayPal  │  │  - GA4     │  │            │
    └────────────┘  │  - GTM     │  └────────────┘
                    └────────────┘
```

## Integration Details

### Stripe (Payments)
| Data Flow | Direction | Frequency |
|-----------|-----------|-----------|
| Payments | Stripe → WooCommerce | Real-time |
| Refunds | WooCommerce → Stripe | On action |
| Payouts | Stripe → Bank | Daily |

### PayPal (Payments)
| Data Flow | Direction | Frequency |
|-----------|-----------|-----------|
| Payments | PayPal → WooCommerce | Real-time |
| Refunds | WooCommerce → PayPal | On action |

### Klaviyo (Email)
| Data Flow | Direction | Frequency |
|-----------|-----------|-----------|
| Customers | WooCommerce → Klaviyo | Real-time |
| Orders | WooCommerce → Klaviyo | Real-time |
| Products | WooCommerce → Klaviyo | Nightly |
| Segments | Klaviyo ← custom | Hourly |

### Xero (Accounting)
| Data Flow | Direction | Frequency |
|-----------|-----------|-----------|
| Invoices | WooCommerce → Xero | Daily |
| Payments | Stripe → Xero | Daily |
| Inventory | WooCommerce → Xero | Weekly |

### GA4 (Analytics)
| Data Flow | Direction | Method |
|-----------|-----------|--------|
| Pageviews | Website → GA4 | GTM |
| E-commerce | WooCommerce → GA4 | GTM |
| Conversions | WooCommerce → GA4 | Webhook |

## Webhook Management

### Active Webhooks
| Source | Event | Destination |
|--------|-------|-------------|
| WooCommerce | Order created | Klaviyo |
| WooCommerce | Order completed | Xero |
| Stripe | Payment succeeded | WooCommerce |
| Stripe | Payout completed | Xero |

### Webhook Monitoring
- Log all webhook events
- Alert on failures
- Retry failed webhooks
- Daily health check

## API Rate Limits

| Service | Limit | Monitoring |
|---------|-------|------------|
| Stripe | 100/sec | Dashboard |
| Klaviyo | 75/sec | Dashboard |
| Xero | 60/min | Alert at 80% |

## Data Sync Schedule

| Sync | Frequency | Window |
|------|-----------|--------|
| Klaviyo products | Nightly | 2am |
| Xero invoices | Hourly | :00 |
| Inventory levels | Real-time | - |
| Customer data | Real-time | - |

## Health Monitoring

### Daily Checks
- [ ] All webhooks responding
- [ ] API connections active
- [ ] Data sync completed
- [ ] No error alerts
- [ ] Payment processing working

### Integration Dashboard
Monitor:
- Webhook success rate
- API response times
- Sync status
- Error counts
- Data freshness

## Troubleshooting

### Common Issues
| Issue | First Check | Escalate If |
|-------|-------------|-------------|
| Payments failing | Stripe status | >5 min outage |
| Emails not sending | Klaviyo connection | Reauth fails |
| Xero sync failed | API credentials | Repeated failure |
| Data mismatch | Sync logs | Can't identify cause |

## Key Metrics

| Metric | Target |
|--------|--------|
| Webhook Success Rate | >99.9% |
| API Uptime | >99.95% |
| Sync Latency | <5 min |
| Data Accuracy | 100% |
| Integration Errors | <10/day |

## Escalation Triggers

Escalate to Technology Director:
- Payment integration down
- Critical webhook failures
- Data integrity issues
- API authentication failures
- Multi-system sync failures
