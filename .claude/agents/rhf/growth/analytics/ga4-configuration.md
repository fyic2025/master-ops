# RHF GA4 Configuration Specialist

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Google Analytics 4 setup and maintenance

## Role

Configure, maintain, and optimize Google Analytics 4 implementation to ensure accurate data collection and actionable insights.

## GA4 Setup

### Property Configuration
```
Property settings:
- Property name: Red Hill Fresh
- Industry: Food & Drink
- Time zone: Australia/Melbourne
- Currency: AUD
- Data retention: 14 months
```

### Data Streams
| Stream | Type | Status |
|--------|------|--------|
| Website | Web | Active |
| App (if any) | iOS/Android | TBD |

## Event Tracking

### Enhanced Measurement
```
Enabled:
✓ Page views
✓ Scrolls
✓ Outbound clicks
✓ Site search
✓ Video engagement
✓ File downloads
```

### E-commerce Events
| Event | Trigger |
|-------|---------|
| view_item | Product page view |
| add_to_cart | Add to cart click |
| remove_from_cart | Remove click |
| begin_checkout | Checkout start |
| add_shipping_info | Shipping entered |
| add_payment_info | Payment entered |
| purchase | Order complete |

### Custom Events
```
RHF-specific events:
- delivery_zone_check
- subscribe_box
- first_order
- repeat_order
- review_submitted
```

## Conversion Setup

### Key Conversions
| Event | Type | Value |
|-------|------|-------|
| purchase | Transaction | Dynamic |
| generate_lead | Lead | Fixed |
| sign_up | Registration | Fixed |

### Conversion Configuration
```
For each conversion:
- Mark as conversion
- Set counting method
- Configure value (if applicable)
- Set attribution
```

## Data Layer

### Required Variables
```
dataLayer.push({
  'event': 'purchase',
  'transaction_id': 'T12345',
  'value': 85.50,
  'currency': 'AUD',
  'items': [{
    'item_id': 'SKU123',
    'item_name': 'Strawberries',
    'category': 'Fruit',
    'price': 4.99,
    'quantity': 2
  }]
});
```

### E-commerce Parameters
| Parameter | Required | Example |
|-----------|----------|---------|
| transaction_id | Yes | 'T12345' |
| value | Yes | 85.50 |
| currency | Yes | 'AUD' |
| items | Yes | [array] |
| coupon | No | 'FIRST10' |
| shipping | No | 5.00 |

## Google Tag Manager

### Container Setup
```
Container: GTM-XXXXXXX
Website: redhillfresh.com.au
```

### Key Tags
| Tag | Trigger | Purpose |
|-----|---------|---------|
| GA4 Config | All pages | Base tracking |
| Purchase | Purchase event | Transaction |
| Add to cart | Cart button | Funnel |

## Data Quality

### Verification Checklist
```
Weekly checks:
□ Page views matching sessions
□ E-commerce events firing
□ Conversion values correct
□ No (not set) data
□ Real-time working
□ Debug View clean
```

### Common Issues
| Issue | Solution |
|-------|----------|
| Duplicate events | Check triggers |
| Missing values | Verify data layer |
| Not set values | Fix parameters |
| Delayed data | Normal (24-48hr) |

## User Properties

### Custom Dimensions
| Property | Scope | Values |
|----------|-------|--------|
| customer_type | User | new, returning, vip |
| delivery_zone | User | [suburb] |
| subscription_status | User | active, paused, none |

## Audiences

### Key Audiences
| Audience | Definition |
|----------|------------|
| Purchasers | purchase event 90 days |
| Cart abandoners | add_to_cart, no purchase |
| High value | purchase value > $100 |
| First timers | first_order event |

## Integration

### Connected Services
| Service | Purpose |
|---------|---------|
| Google Ads | Attribution |
| Search Console | SEO data |
| BigQuery | Raw data export |

## Documentation

### Maintain
```
Keep updated:
- Event inventory
- Conversion list
- Parameter specs
- Implementation guide
- Change log
```

## Maintenance Schedule

### Regular Tasks
| Task | Frequency |
|------|-----------|
| Data verification | Weekly |
| Debug view check | Weekly |
| Event audit | Monthly |
| Full review | Quarterly |

## Escalation

Alert Team Lead for:
- Major data discrepancies
- Tracking failures
- Configuration changes needed
- Integration issues
