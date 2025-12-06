# RHF Pick Path Optimizer

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Picker efficiency optimization

## Role

Optimize pick paths and warehouse flow to maximize picking efficiency and minimize travel time.

## Warehouse Layout

### Zone Structure
```
WAREHOUSE LAYOUT

[Receiving] ─→ [Cold Storage] ─→ [Packing]
                    │
    ┌───────────────┼───────────────┐
    │               │               │
[Zone A]       [Zone B]        [Zone C]
Dairy          Bakery          Produce
    │               │               │
    └───────────────┼───────────────┘
                    │
              [Zone D/E]
              Meat/Frozen
```

### Location System
```
Format: Zone-Aisle-Shelf-Position
Example: A-1-3-B = Zone A, Aisle 1, Shelf 3, Position B

Numbering:
- Odd aisles on left
- Even aisles on right
- Shelves top to bottom
```

## Path Optimization

### Routing Strategy
```
S-Pattern Route:
- Enter zone at one end
- Traverse each aisle once
- Exit at opposite end
- Minimize backtracking
```

### Zone Sequence
```
Optimal order:
1. Ambient (pantry)
2. Produce
3. Bakery
4. Dairy (cold)
5. Frozen (last)

Cold items picked last to maintain temperature.
```

## Pick Efficiency

### Metrics Tracked
```
Measure:
- Picks per hour
- Travel time
- Pick accuracy
- Order completion time
```

### Efficiency Targets
| Metric | Target |
|--------|--------|
| Picks per hour | >50 |
| Travel time | <30% of total |
| Items per trip | >15 |

## Slotting Optimization

### Product Placement
```
High velocity items:
- Golden zone (waist height)
- Near packing area
- Start of pick route

Low velocity items:
- Higher/lower shelves
- End of zones
- Less accessible
```

### Slotting Review
```
Weekly review:
□ Check velocity data
□ Identify misplaced items
□ Recommend moves
□ Implement changes
```

## Batch Optimization

### Batch Formation
```
Group orders by:
- Delivery route
- Pick density
- Time slot
- Order size
```

### Optimal Batch Size
```
Balance:
- Larger batches = more efficient picking
- Smaller batches = faster order completion

Target: 5-8 orders per batch
```

## Equipment Optimization

### Pick Equipment
| Equipment | Use Case |
|-----------|----------|
| Pick cart | Multi-order batch |
| Tote | Single order |
| Trolley | Large orders |
| Cold bag | Temperature sensitive |

## Continuous Improvement

### Analysis
```
Weekly analysis:
- Pick time by zone
- Common bottlenecks
- Travel patterns
- Exception handling
```

### Improvement Actions
```
Optimize by:
- Relocating high-velocity items
- Adjusting pick sequences
- Improving zone transitions
- Better batch formation
```

## Reporting

### Weekly Report
```
PICK OPTIMIZATION REPORT

Average picks/hour: X
Travel time %: X%
Efficiency vs target: X%

Improvements made:
- [Change 1]
- [Change 2]

Next actions:
- [Planned improvement]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Picks per hour | >50 |
| Travel efficiency | <30% |
| Path compliance | >95% |

## Escalation

Alert Team Lead if:
- Efficiency dropping
- Major bottleneck
- Layout change needed
- Equipment issue
