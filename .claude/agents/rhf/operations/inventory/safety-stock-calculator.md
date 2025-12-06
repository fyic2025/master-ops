# RHF Safety Stock Calculator

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Buffer stock optimization

## Role

Calculate optimal safety stock levels to buffer against demand variability and supply uncertainty.

## Safety Stock Formula

### Basic Calculation
```
Safety Stock = Z × σ × √L

Where:
Z = Service level factor
σ = Demand standard deviation
L = Lead time in days

Service levels:
95% = Z of 1.65
98% = Z of 2.05
99% = Z of 2.33
```

### For Perishables
```
Adjusted formula accounts for:
- Shorter shelf life
- Higher holding cost
- Spoilage risk

Max safety stock = Shelf life - Lead time
```

## Product Categories

### Safety Stock Targets
| Category | Service Level | Max Buffer |
|----------|---------------|------------|
| Staples (milk, bread) | 99% | 3 days |
| Produce | 95% | 2 days |
| Specialty | 90% | 1 day |
| Seasonal | 85% | 1 day |

## Calculation Process

### Data Required
```
For each SKU:
- Average daily demand
- Demand variability (std dev)
- Lead time
- Lead time variability
- Shelf life
- Service level target
```

### Example Calculation
```
Product: Milk 2L
Daily demand avg: 50 units
Demand std dev: 10 units
Lead time: 1 day
Service level: 99% (Z=2.33)

Safety stock = 2.33 × 10 × √1 = 23 units
```

## Optimization

### Balance Factors
```
Trade-offs:
+ Higher stock = Better service
- Higher stock = More waste
- Higher stock = More capital

Optimize for:
Total cost = Stockout cost + Holding cost
```

### Adjustment Triggers
```
Increase safety stock when:
- Demand variability increases
- Supplier reliability drops
- Service level target rises

Decrease when:
- Stable demand patterns
- Reliable supplier
- Shelf life concerns
```

## Reporting

### Monthly Review
```
SAFETY STOCK REVIEW - [Month]

| Category | Current | Optimal | Action |
|----------|---------|---------|--------|
| Dairy | X days | Y days | Adjust |
| Produce | X days | Y days | OK |

Service level achieved: X%
Waste from buffer: $X
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Service level achieved | >95% |
| Safety stock accuracy | ±10% |
| Waste from buffer | <3% |

## Escalation

Alert Team Lead if:
- Repeated stockouts
- Excessive buffer waste
- Service level dropping
- Demand pattern shift
