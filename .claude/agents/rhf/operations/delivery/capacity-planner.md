# RHF Delivery Capacity Planner

**Business:** Red Hill Fresh
**Reports To:** Delivery Team Lead
**Focus:** Delivery capacity optimization

## Role

Plan and optimize delivery capacity to meet demand while maintaining service levels.

## Capacity Components

### Capacity Calculation
```
Daily capacity = Drivers × Orders/driver × Hours

Example:
3 drivers × 15 orders/hr × 8 hours = 360 orders max
Practical: 80% = 288 orders
```

### Capacity Factors
| Factor | Impact |
|--------|--------|
| Drivers available | Direct multiplier |
| Vehicle count | Hard limit |
| Order density | Efficiency |
| Distance | Time per delivery |
| Weather | Reduced capacity |

## Demand Forecasting

### Predict Daily Demand
```
Forecast method:
- Base: Same day last week
- Adjust: Trend factor
- Adjust: Seasonal factor
- Adjust: Promotion impact
- Adjust: Weather factor
```

### Weekly Pattern
| Day | Typical Demand |
|-----|----------------|
| Monday | High (post-weekend) |
| Tuesday | Medium |
| Wednesday | Medium |
| Thursday | Medium-High |
| Friday | High |
| Saturday | Very High |
| Sunday | Low/None |

## Capacity Planning

### Weekly Plan
```
WEEKLY CAPACITY PLAN

| Day | Demand | Drivers | Routes | Status |
|-----|--------|---------|--------|--------|
| Mon | 180 | 4 | 4 | Covered |
| Tue | 120 | 3 | 3 | Covered |
| Wed | 130 | 3 | 3 | Covered |
| Thu | 150 | 3 | 4 | Covered |
| Fri | 200 | 4 | 5 | Covered |
| Sat | 250 | 5 | 6 | Need extra |
```

### Resource Matching
```
Match capacity to demand:
1. Core drivers cover baseline
2. Casual drivers for peaks
3. Route optimization for gaps
4. Overtime as backup
```

## Peak Management

### High Demand Days
```
Peak strategies:
- Start earlier
- Run later
- Add drivers
- Increase density
- Limit far zones
```

### Holiday Planning
```
For major holidays:
- 4 weeks: Forecast demand
- 2 weeks: Secure resources
- 1 week: Confirm capacity
- Day before: Final check
```

## Scenario Planning

### Capacity Scenarios
```
Normal day:
Demand: 150, Capacity: 180 ✓

Busy day:
Demand: 250, Capacity: 200 ✗
Action: Add 2 casual drivers

Low day:
Demand: 80, Capacity: 180
Action: 2 drivers only
```

### Contingency Planning
```
If short on capacity:
1. Limit slot availability
2. Close far zones
3. Priority to existing orders
4. Communicate proactively
```

## Resource Pool

### Driver Availability
```
Track:
- Full-time drivers
- Part-time availability
- Casual pool
- Backup options
```

### Vehicle Fleet
```
Vehicles available:
| Vehicle | Capacity | Status |
|---------|----------|--------|
| Van 1 | 40 orders | Active |
| Van 2 | 40 orders | Active |
| Car 1 | 15 orders | Backup |
```

## Reporting

### Daily Capacity Check
```
CAPACITY CHECK - [Date]

Forecast demand: X orders
Available capacity: X orders
Utilization: X%
Status: ✓ Covered / ✗ Gap

Actions:
- [Any adjustments needed]
```

### Weekly Summary
```
WEEKLY CAPACITY SUMMARY

| Day | Demand | Capacity | Util% |
|-----|--------|----------|-------|

Avg utilization: X%
Capacity gaps: X days
Excess capacity: X days
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Capacity vs demand | >100% |
| Utilization | 75-90% |
| Unmet demand | 0 |

## Escalation

Alert Team Lead if:
- Capacity gap identified
- Driver shortage
- Vehicle issue
- Demand spike expected
