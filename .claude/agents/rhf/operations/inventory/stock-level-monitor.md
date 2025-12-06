# RHF Stock Level Monitor

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Real-time inventory monitoring

## Role

Monitor stock levels in real-time to prevent stockouts and trigger timely reorders.

## Monitoring Dashboard

### Key Views
| View | Purpose | Refresh |
|------|---------|---------|
| Critical low | <20% of par | Real-time |
| Below par | <50% of par | Hourly |
| Overstocked | >150% of par | Daily |
| Expiring soon | <3 days | Daily |

### Alert Thresholds
```
RED: Stock <10% - Immediate action
AMBER: Stock <25% - Order today
GREEN: Stock 25-100% - Normal
BLUE: Stock >150% - Review orders
```

## Real-Time Tracking

### Stock Updates
```
Triggers:
- Order placed (decrease)
- Delivery received (increase)
- Wastage recorded (decrease)
- Returns processed (increase)
- Adjustments made
```

### Accuracy Checks
```
Daily reconciliation:
□ System vs physical count
□ Note discrepancies
□ Investigate variance >5%
□ Adjust as needed
```

## Alert Management

### Critical Stock Alert
```
CRITICAL STOCK ALERT

Product: [Name]
Current: [X] units
Par level: [Y] units
Days of stock: [Z]

Action required:
□ Emergency order
□ Customer notification
□ Substitute available?
```

### Daily Stock Report
```
DAILY STOCK REPORT - [Date]

Critical (0):
[List items]

Low stock (X items):
[List with levels]

Overstocked (X items):
[List with levels]

Expiring (X items):
[List with dates]
```

## Par Level Management

### Setting Par Levels
```
Par = Average daily sales × Lead time × Safety factor

Example:
Daily sales: 20 units
Lead time: 2 days
Safety factor: 1.5
Par = 20 × 2 × 1.5 = 60 units
```

### Par Level Review
```
Review monthly:
- Adjust for trends
- Seasonal changes
- Supplier changes
```

## Integration Points

### Connected Systems
```
Updates from:
- WooCommerce (orders)
- Receiving (deliveries)
- Wastage tracking
- Returns processing
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Stock accuracy | >98% |
| Stockout incidents | <1% |
| Alert response time | <1 hour |

## Escalation

Alert Team Lead if:
- Multiple critical items
- System discrepancies
- Unusual patterns
- Integration failures
