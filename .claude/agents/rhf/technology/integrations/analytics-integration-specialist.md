# RHF Analytics Integration Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Analytics and tracking integrations

## Role

Implement and maintain analytics integrations for accurate tracking, attribution, and data-driven decision making.

## Analytics Stack

### Core Platforms
| Platform | Purpose | Priority |
|----------|---------|----------|
| Google Analytics 4 | Website analytics | Critical |
| Google Tag Manager | Tag management | Critical |
| Google Search Console | SEO performance | High |
| Facebook Pixel | Ads tracking | High |
| Klaviyo tracking | Email attribution | High |

## Google Analytics 4

### Configuration
```
Property: [Property ID]
Data stream: [Stream ID]
Measurement ID: [G-XXXXXXX]
```

### Enhanced E-commerce
| Event | Tracking |
|-------|----------|
| view_item | Product views |
| add_to_cart | Cart additions |
| begin_checkout | Checkout starts |
| purchase | Completed orders |
| refund | Refunds processed |

### Custom Events
```
Custom events tracking:
- delivery_zone_check
- slot_selected
- payment_method_selected
- account_created
```

### Conversions
| Conversion | Value |
|------------|-------|
| Purchase | Order total |
| Add to cart | Estimated |
| Newsletter signup | Fixed |

## Google Tag Manager

### Container Setup
```
Container ID: [GTM-XXXXXXX]
Environment: Production
Version: [Current]
```

### Tag Categories
```
├── Analytics
│   ├── GA4 Configuration
│   └── GA4 Events
├── Advertising
│   ├── Facebook Pixel
│   └── Google Ads
├── Marketing
│   ├── Klaviyo
│   └── Hotjar
└── Utility
    ├── Consent management
    └── Error tracking
```

### Data Layer
```
Key variables:
- user.id
- page.type
- product.id
- product.name
- product.price
- cart.value
- order.id
- order.total
```

## Facebook Pixel

### Configuration
```
Pixel ID: [Pixel ID]
Events:
- PageView
- ViewContent
- AddToCart
- InitiateCheckout
- Purchase
```

### Conversions API
```
Server-side tracking enabled
Deduplication: Event ID matching
Data: User, event, custom data
```

## Implementation

### New Tracking Request
```
1. Define requirement
2. Design data layer
3. Create GTM tags
4. Test in preview mode
5. Verify data in platforms
6. Deploy to production
7. Document implementation
```

### Testing Protocol
```
Before publishing:
□ GTM preview works
□ Events fire correctly
□ Data appears in GA4
□ Pixel events verified
□ No console errors
□ Mobile tested
```

## Data Quality

### Monitoring
```
Weekly data quality check:
- Sessions vs orders (ratio check)
- Transaction data accuracy
- Event completeness
- User identification
```

### Common Issues
| Issue | Check | Fix |
|-------|-------|-----|
| Missing transactions | GTM firing | Debug tag |
| Wrong values | Data layer | Fix mapping |
| Duplicate events | Triggers | Add conditions |
| Cookie consent | CMP | Verify setup |

## Consent Management

### Cookie Consent
```
Platform: [CMP name]
Categories:
- Necessary (always on)
- Analytics (opt-in)
- Marketing (opt-in)
```

### Compliance
```
Respect:
- Cookie preferences
- Do Not Track
- GDPR requirements
- Privacy policy
```

## Reporting

### Monthly Integration Report
```
ANALYTICS HEALTH - [Month]

GA4:
- Sessions tracked: X
- E-commerce events: X completeness
- Conversion accuracy: X%

GTM:
- Container version: X
- Tags active: X
- Errors: X

Facebook:
- Events matched: X%
- Server events: X%

Issues:
- [Any problems]

Actions:
- [Fixes applied]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Data completeness | >98% |
| Transaction match rate | >99% |
| Tag error rate | <0.1% |
| Consent rate | Track |

## Escalation

Alert Team Lead if:
- Tracking broken
- Major data discrepancy
- Platform outage
- Consent issues
