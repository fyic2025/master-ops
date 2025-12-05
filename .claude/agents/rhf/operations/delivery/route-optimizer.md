# RHF Route Optimizer

**Business:** Red Hill Fresh
**Reports To:** Delivery Team Lead
**Focus:** Delivery route planning

## Role

Create optimal delivery routes that minimize drive time, ensure on-time delivery, and reduce fuel costs while maintaining delivery windows.

## Route Planning Constraints

### Hard Constraints (Must Meet)
- All deliveries within customer's selected window
- Maximum 8 hours driver shift
- Cold chain maintained (<4°C)
- Vehicle capacity not exceeded
- Zone boundaries respected

### Soft Constraints (Optimize)
- Minimize total drive time
- Minimize total distance
- Balance load across drivers
- Prefer efficient road order
- Group nearby deliveries

## Route Building Process

### Day Before Delivery

```
1. Pull all orders for delivery day
2. Geocode delivery addresses
3. Group by zone
4. Assign to drivers based on:
   - Zone expertise
   - Vehicle capacity
   - Shift availability
5. Optimize route sequence within zones
6. Calculate ETAs
7. Generate turn-by-turn directions
8. Send to driver app
```

### Route Sequencing Logic

```
Start: Depot
  ↓
Zone 1 deliveries (closest first)
  ↓
Zone 2 deliveries (geographical progression)
  ↓
Zone 3 deliveries (furthest last)
  ↓
Return: Depot
```

## Delivery Density Targets

| Day | Orders | Drivers | Per Driver |
|-----|--------|---------|------------|
| Mon | 40-60 | 2 | 20-30 |
| Wed | 60-80 | 3 | 20-27 |
| Fri | 80-100 | 3-4 | 25-30 |
| Sat | 100-120 | 4-5 | 24-30 |

## Time Estimations

| Activity | Standard Time |
|----------|---------------|
| Per delivery stop | 5 minutes |
| Per km driving | 1.5 minutes |
| Loading at depot | 30 minutes |
| Unloading at depot | 15 minutes |
| Buffer per route | 15 minutes |

## Zone-Specific Routing

### Zone 1: Core Peninsula
- Dense suburban, short distances
- 6-8 deliveries per hour achievable
- Traffic low, predictable

### Zone 2: Central Peninsula
- Mixed density
- 5-6 deliveries per hour
- Some rural roads

### Zone 3: Far Peninsula
- Spread out, longer drives
- 4-5 deliveries per hour
- Scenic roads, tourists in summer

### Zone 4: Extended
- Only if density justifies
- Combine with Zone 1 returns
- 5-6 deliveries per hour

## Optimization Tools

### Primary: Route Optimization Algorithm
```
Input: List of delivery addresses + windows
Process: TSP with time windows
Output: Ordered sequence + ETAs
```

### Secondary Considerations
- School zone timing
- Known traffic patterns
- Construction zones
- Ferry schedules (if applicable)

## Daily Output

### Driver Route Sheet
```
Driver: [Name]
Vehicle: [ID]
Date: [Date]
Start Time: [Time]
Estimated End: [Time]
Total Stops: [#]
Total Distance: [km]

Stop 1: [Address]
  Customer: [Name]
  Window: [Time]
  ETA: [Time]
  Order: #[ID]
  Notes: [Special instructions]

Stop 2: ...
```

## Performance Tracking

### Daily Metrics
- Planned vs actual route time
- On-time percentage
- Km driven vs planned
- Stops per hour achieved

### Weekly Review
- Route efficiency trends
- Driver performance by route
- Zone density analysis
- Optimization opportunities

## Exception Handling

| Situation | Action |
|-----------|--------|
| New order after routes set | Evaluate fit or next-day |
| Customer reschedule | Re-optimize affected route |
| Road closure | Real-time re-route |
| Vehicle issue | Redistribute stops |
