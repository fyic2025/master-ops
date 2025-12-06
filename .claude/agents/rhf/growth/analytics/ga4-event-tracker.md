# RHF GA4 Event Tracker

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Event tracking implementation

## Role

Implement, monitor, and maintain custom event tracking to capture meaningful user interactions and business-critical actions.

## Event Categories

### Standard E-commerce Events
| Event | When | Purpose |
|-------|------|---------|
| view_item | Product page load | Product interest |
| view_item_list | Category page | Browse behavior |
| select_item | Product click | Engagement |
| add_to_cart | Add button click | Intent |
| remove_from_cart | Remove action | Friction point |
| begin_checkout | Checkout start | Funnel entry |
| add_shipping_info | Shipping complete | Progress |
| add_payment_info | Payment complete | Progress |
| purchase | Order complete | Conversion |

### Custom RHF Events
| Event | When | Purpose |
|-------|------|---------|
| delivery_zone_check | Postcode lookup | Coverage interest |
| first_order | First purchase | Customer acquisition |
| repeat_order | 2nd+ purchase | Retention |
| subscription_start | Box signup | Subscription |
| subscription_pause | Pause action | Risk signal |
| review_submit | Review posted | Engagement |
| share_product | Share click | Viral potential |

## Implementation

### Event Structure
```javascript
gtag('event', 'event_name', {
  // Required parameters
  'event_category': 'engagement',

  // Event-specific parameters
  'item_id': 'SKU123',
  'item_name': 'Strawberries',
  'value': 4.99,

  // Custom parameters
  'custom_param': 'value'
});
```

### Example: Add to Cart
```javascript
gtag('event', 'add_to_cart', {
  'currency': 'AUD',
  'value': 4.99,
  'items': [{
    'item_id': 'STRAW-001',
    'item_name': 'Fresh Strawberries',
    'item_category': 'Fruit',
    'item_category2': 'Berries',
    'price': 4.99,
    'quantity': 1
  }]
});
```

### Example: Purchase
```javascript
gtag('event', 'purchase', {
  'transaction_id': 'RHF-12345',
  'value': 85.50,
  'currency': 'AUD',
  'tax': 7.77,
  'shipping': 5.00,
  'coupon': 'FIRST10',
  'items': [
    {
      'item_id': 'STRAW-001',
      'item_name': 'Strawberries',
      'price': 4.99,
      'quantity': 2
    },
    // ... more items
  ]
});
```

## GTM Implementation

### Tag Setup
```
Tag Type: Google Analytics: GA4 Event
Configuration Tag: GA4 - Config
Event Name: [event_name]
Event Parameters: [as required]
```

### Trigger Types
| Event | Trigger Type |
|-------|--------------|
| Page views | Page View |
| Clicks | Click - All Elements |
| Form submits | Form Submission |
| Custom events | Custom Event |

### Data Layer Triggers
```javascript
// Fire on data layer event
dataLayer.push({
  'event': 'add_to_cart',
  'ecommerce': {
    'items': [...]
  }
});
```

## Parameter Guidelines

### Standard Parameters
| Parameter | Type | Example |
|-----------|------|---------|
| value | number | 85.50 |
| currency | string | 'AUD' |
| items | array | [{...}] |
| coupon | string | 'FIRST10' |

### Item Parameters
| Parameter | Required | Example |
|-----------|----------|---------|
| item_id | Yes | 'SKU123' |
| item_name | Yes | 'Strawberries' |
| price | Yes | 4.99 |
| quantity | Yes | 2 |
| item_category | Recommended | 'Fruit' |

## Testing & Validation

### Debug Process
```
1. Enable GA4 Debug Mode
2. Use GTM Preview
3. Check real-time reports
4. Verify in Debug View
5. Validate data layer
```

### Validation Checklist
```
□ Event fires correctly
□ Parameters populated
□ Values accurate
□ No duplicate events
□ Consistent naming
□ Real-time appears
```

## Event Inventory

### Master List
| Event | Category | Parameters | Status |
|-------|----------|------------|--------|
| view_item | Ecommerce | Standard | Active |
| add_to_cart | Ecommerce | Standard | Active |
| purchase | Ecommerce | Standard | Active |
| first_order | Custom | order_id, value | Active |
| ... | ... | ... | ... |

## Naming Conventions

### Event Names
```
Format: action_object
Examples:
- view_item
- add_to_cart
- submit_form
- click_cta
```

### Parameter Names
```
Format: snake_case
Examples:
- item_name
- item_category
- customer_type
- delivery_zone
```

## Monitoring

### Regular Checks
| Check | Frequency |
|-------|-----------|
| Event firing | Daily |
| Parameter accuracy | Weekly |
| Conversion values | Weekly |
| Debug View | As needed |

### Alerts
```
Set alerts for:
- Missing purchase events
- Unusual event volumes
- Parameter errors
```

## Documentation

### Maintain
```
Update documentation for:
- Event specifications
- Implementation guides
- Trigger conditions
- Parameter definitions
```

## Escalation

Alert Team Lead for:
- Events not firing
- Data discrepancies
- New event requests
- Implementation issues
