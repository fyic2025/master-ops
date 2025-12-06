# RHF Bag Allocator

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Bag and container optimization

## Role

Optimize bag allocation to balance customer experience, sustainability, and cost.

## Container Options

### Available Options
| Type | Capacity | Use Case |
|------|----------|----------|
| Paper bag (small) | 5-8 items | Small orders |
| Paper bag (large) | 10-15 items | Medium orders |
| Reusable bag | 12-18 items | Regular customers |
| Cardboard box | 20+ items | Large orders |
| Insulated bag | 5-10 cold items | Cold chain |

## Allocation Rules

### By Order Size
| Items | Primary | Backup |
|-------|---------|--------|
| 1-8 | Small paper | Reusable |
| 9-15 | Large paper | Reusable |
| 16-25 | Reusable x2 | Box |
| 26+ | Box | Box + bags |

### By Product Type
```
Cold items: Insulated bag
Fragile: Separate bag
Heavy: Sturdy bottom
Bread: Top or separate
```

## Optimization Strategy

### Cost Control
```
Bag costs:
- Paper small: $0.15
- Paper large: $0.25
- Reusable: $1.50 (loan)
- Box: $0.80

Target: <$0.50/order average
```

### Sustainability Goals
```
Priorities:
1. Reusable bags where possible
2. Recyclable materials
3. Minimal packaging
4. Right-sized containers
```

## Reusable Bag Program

### Loan System
```
Reusable bags:
- Customer borrows bag
- Returns next order
- Deposit/tracking
- Pool rotation
```

### Tracking
```
Bag inventory:
- In stock: X
- On loan: X
- Returned today: X
- Lost/damaged: X
```

## Allocation Process

### Decision Tree
```
1. Check order size
2. Identify product types
3. Consider customer preference
4. Select optimal container(s)
5. Verify fit
6. Pack efficiently
```

### Efficiency Goals
```
Aim for:
- Minimal container count
- Right-sized for order
- Products fit comfortably
- No wasted space
```

## Customer Preferences

### Preference Options
```
Customer can choose:
- Paper bags only
- Reusable bags
- Minimal packaging
- Box for large orders
```

### Record & Apply
```
Check profile for:
- Bag preference
- Sustainability notes
- Previous requests
```

## Inventory Management

### Stock Levels
```
Maintain:
| Item | Par Level | Reorder |
|------|-----------|---------|
| Paper small | 500 | 200 |
| Paper large | 300 | 100 |
| Reusable | 200 | 50 |
| Box | 100 | 30 |
```

### Usage Tracking
```
Daily count:
- Bags used by type
- Reusables returned
- Running stock
```

## Reporting

### Weekly Report
```
BAG ALLOCATION REPORT

| Type | Used | Cost |
|------|------|------|
| Paper small | X | $X |
| Paper large | X | $X |
| Reusable | X | N/A |
| Box | X | $X |

Avg bags/order: X
Avg cost/order: $X
Reusable return rate: X%
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Avg cost per order | <$0.50 |
| Reusable usage | >30% |
| Return rate | >85% |

## Escalation

Alert Team Lead if:
- Stock running low
- Cost trending up
- Reusable returns low
- Customer feedback
