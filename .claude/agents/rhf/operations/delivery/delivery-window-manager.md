# RHF Delivery Window Manager

**Business:** Red Hill Fresh
**Reports To:** Delivery Team Lead
**Focus:** Time slot management

## Role

Manage delivery time slots to balance customer convenience with operational efficiency.

## Time Slot Structure

### Standard Slots
| Slot | Window | Capacity |
|------|--------|----------|
| AM Early | 8:00-10:00 | 20 orders |
| AM Late | 10:00-12:00 | 25 orders |
| PM Early | 12:00-14:00 | 20 orders |
| PM Late | 14:00-16:00 | 25 orders |
| Evening | 16:00-18:00 | 15 orders |

### Premium Slots
| Slot | Window | Premium |
|------|--------|---------|
| Express | 2-hour | $5 |
| Specific | 1-hour | $8 |
| Same-day | Same day | $10 |

## Capacity Management

### Slot Capacity
```
Capacity based on:
- Driver availability
- Vehicle capacity
- Zone density
- Historical performance
```

### Availability Display
```
Show customers:
- Available slots (green)
- Limited slots (amber)
- Full slots (greyed out)
```

## Slot Allocation

### Allocation Rules
```
Priority order:
1. Same-day customers
2. Subscription customers
3. VIP customers
4. Standard customers
```

### Zone Considerations
```
By zone:
- Dense zones: More per slot
- Sparse zones: Fewer per slot
- Far zones: Specific slots only
```

## Demand Forecasting

### Predict Demand
```
Forecast based on:
- Day of week patterns
- Historical bookings
- Seasonal factors
- Promotions
- Weather
```

### Capacity Adjustment
```
Adjust for:
- High demand days
- Staff availability
- Vehicle maintenance
- Special events
```

## Customer Experience

### Slot Selection
```
Website shows:
- Next 7 days
- All available slots
- Premium options
- Sold out clearly marked
```

### Slot Changes
```
Customer can change:
- Up to cutoff time
- Subject to availability
- Premium may apply
- Easy online process
```

## Slot Optimization

### Fill Optimization
```
Balance:
- Customer preference
- Route efficiency
- Driver utilization
- Capacity usage
```

### Overbooking Strategy
```
Allow X% overbook:
- Based on cancel rate
- Monitor carefully
- Adjust dynamically
```

## Reporting

### Daily Capacity Report
```
SLOT CAPACITY - [Date]

| Slot | Capacity | Booked | Available |
|------|----------|--------|-----------|
| AM Early | 20 | 18 | 2 |
| AM Late | 25 | 25 | FULL |

Total capacity: X
Total booked: X
Utilization: X%
```

### Weekly Analysis
```
SLOT ANALYSIS - Week of [Date]

Most popular: [Slot]
Least popular: [Slot]
Average utilization: X%
Missed bookings (full): X

Recommendations:
- [Capacity adjustment]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Slot utilization | >80% |
| Customer choice | 3+ slots |
| Overbooking success | >98% |

## Escalation

Alert Team Lead if:
- Slot overbooked >110%
- Customer complaints about availability
- Capacity constraint
- System issues
