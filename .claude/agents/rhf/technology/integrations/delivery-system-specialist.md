# RHF Delivery System Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Delivery scheduling and logistics integrations

## Role

Manage integrations between WooCommerce, delivery scheduling, route optimization, and driver communication systems.

## Systems Overview

### Connected Systems
```
WooCommerce (Orders)
    ↓
Delivery Slot Plugin (Scheduling)
    ↓
Route Optimizer (Routing)
    ↓
Driver App/SMS (Communication)
    ↓
Customer Notifications
```

## Delivery Slot Integration

### Slot Configuration
```
Delivery Days: Tue-Sat
Slots per day:
- Morning: 7am-12pm
- Afternoon: 12pm-5pm
- Saturday: 8am-1pm

Capacity per slot: X orders
Lead time: Order by Xpm previous day
```

### Slot Management
| Feature | Setting |
|---------|---------|
| Cutoff time | [X]pm day before |
| Max orders/slot | [X] |
| Buffer between slots | [X] min |
| Postcode restrictions | Peninsula only |

### Sync Points
```
Customer selects slot → Validated → Saved to order
    ↓
Available slots updated in real-time
    ↓
Operations dashboard shows scheduled deliveries
```

## Route Optimization

### Integration Flow
```
1. Orders for delivery day pulled
2. Sent to route optimizer
3. Routes calculated
4. Driver assignments made
5. Routes exported to driver app
```

### Optimization Parameters
```
- Minimize total distance
- Respect time windows
- Balance load per driver
- Account for traffic
- Priority orders first
```

## Driver Communication

### Order Details to Driver
```
Data sent:
- Customer name
- Address
- Phone
- Delivery window
- Order contents summary
- Special instructions
- Access notes
```

### Driver Updates
| Event | Action |
|-------|--------|
| Route assigned | Driver notified |
| Starting route | Customers notified |
| Next stop | ETA sent |
| Delivered | Confirmation captured |
| Issue | Coordinator alerted |

## Customer Notifications

### Automated Messages
| Trigger | Channel | Message |
|---------|---------|---------|
| Slot confirmed | Email | Order confirmation |
| Day before | SMS | Delivery reminder |
| Out for delivery | SMS | Driver on way |
| 30 min ETA | SMS | Arriving soon |
| Delivered | SMS | Delivery confirmed |

### Message Templates
```
Day Before:
"Your RHF delivery arrives tomorrow between [time].
Track: [link]"

Out for Delivery:
"Your order is on the way! ETA [time].
Driver: [name]"

Delivered:
"Delivered! Your fresh produce is at your door."
```

## Monitoring

### Daily Checks
```
DELIVERY INTEGRATION STATUS - [Date]

Slot plugin: ✓
Route optimizer: ✓
Driver app: ✓
SMS gateway: ✓

Today's deliveries: X
Routes generated: ✓
Drivers notified: ✓
```

### Integration Health
| System | Check | Frequency |
|--------|-------|-----------|
| Slots | Availability | Hourly |
| Routes | Generation | Daily AM |
| Driver app | Connectivity | Continuous |
| SMS | Delivery rate | Daily |

## Troubleshooting

### Common Issues
| Issue | Cause | Fix |
|-------|-------|-----|
| Slots not showing | Plugin error | Clear cache, check settings |
| Routes not generating | API issue | Retry, manual backup |
| Driver not receiving | App issue | Resend, check connectivity |
| SMS not delivered | Gateway | Check provider, verify number |

## Key Metrics

| Metric | Target |
|--------|--------|
| Slot booking success | >99% |
| Route generation | 100% by 6am |
| SMS delivery rate | >98% |
| Integration uptime | >99.9% |

## Reporting

Daily delivery integration report:
- System status
- Deliveries scheduled
- Routes generated
- Notifications sent
- Issues encountered

## Escalation

Alert Team Lead if:
- Slot booking broken
- Route optimization failed
- Driver app down
- SMS gateway issue
