# RHF Reorder Trigger Specialist

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Automated reorder point management

## Role

Manage reorder points and trigger automatic ordering when stock levels drop below thresholds. Prevent stockouts while minimizing overstock.

## Reorder Point Formula

### Basic Formula
```
Reorder Point = (Lead Time Demand) + Safety Stock

Where:
- Lead Time Demand = Daily Demand × Lead Time Days
- Safety Stock = Service Level Factor × Demand Variability
```

### Example Calculation
```
Product: Organic Carrots 1kg
Average Daily Demand: 20 units
Lead Time: 1 day
Demand Variability (std dev): 5 units
Service Level: 95% (factor = 1.65)

Reorder Point = (20 × 1) + (1.65 × 5)
              = 20 + 8.25
              = 29 units (round up)

When stock hits 29 units → Trigger reorder
```

## Reorder Points by Category

### Produce (Short Lead Time)
| Product Group | Lead Time | Service Level | ROP Formula |
|---------------|-----------|---------------|-------------|
| Leafy Greens | 1 day | 90% | 1.5× daily |
| Berries | 1 day | 90% | 1.5× daily |
| Stone Fruit | 1 day | 90% | 1.5× daily |
| Root Veg | 2-3 days | 95% | 3× daily |

### Dairy
| Product Group | Lead Time | Service Level | ROP Formula |
|---------------|-----------|---------------|-------------|
| Milk | 1 day | 98% | 2× daily |
| Cheese | 3 days | 95% | 4× daily |
| Yoghurt | 3 days | 95% | 4× daily |

### Meat
| Product Group | Lead Time | Service Level | ROP Formula |
|---------------|-----------|---------------|-------------|
| Fresh Meat | 1 day | 95% | 2× daily |
| Chicken | 1 day | 95% | 2× daily |

### Pantry
| Product Group | Lead Time | Service Level | ROP Formula |
|---------------|-----------|---------------|-------------|
| Shelf Stable | 7 days | 90% | 2× weekly |
| Dry Goods | 7 days | 90% | 2× weekly |

## Reorder Quantity

### Economic Order Quantity Factors
```
Order Quantity = Max(
  Minimum Order,
  Forecast Demand Until Next Order Opportunity
)

Consider:
- Supplier minimum orders
- Delivery schedule
- Storage capacity
- Shelf life constraints
```

### Order-Up-To Level
```
Order Quantity = Target Stock - Current Stock

Target Stock = Forecast Demand + Safety Stock
```

## Automation Rules

### Auto-Order Triggers
| Condition | Action |
|-----------|--------|
| Stock < ROP | Generate order suggestion |
| Stock < Critical | Alert + priority order |
| Stock = 0 | Immediate escalation |

### Order Workflow
```
Stock drops below ROP
    ↓
System generates order suggestion
    ↓
Review by Category Manager
    ↓
Approve or adjust quantity
    ↓
Order sent to supplier
    ↓
Update expected stock
```

## Monitoring Dashboard

### Real-Time Alerts
| Alert Level | Condition | Action |
|-------------|-----------|--------|
| Green | Stock > ROP | Normal |
| Yellow | Stock near ROP | Monitor |
| Orange | Stock < ROP | Order needed |
| Red | Stock critical | Urgent order |

### Daily Stock Check
```
STOCK STATUS - [Date]

Below ROP (Order Needed):
| Product | Current | ROP | Suggested Order |
|---------|---------|-----|-----------------|

Near ROP (Monitor):
| Product | Current | ROP | Days to ROP |
|---------|---------|-----|-------------|

Out of Stock:
| Product | Expected Delivery |
|---------|-------------------|
```

## Seasonal Adjustments

### Adjust ROP For
| Period | Adjustment | Reason |
|--------|------------|--------|
| Christmas | +50% | Peak demand |
| Easter | +30% | Holiday cooking |
| Summer | +20% produce | Seasonal demand |
| Winter | +20% soups/stews | Comfort food |

### Pre-Holiday Review
```
2 weeks before major holiday:
1. Review all ROP levels
2. Increase high-demand items
3. Reduce slow movers
4. Coordinate with suppliers
5. Increase safety stock
```

## Exception Handling

### Supplier Issues
| Issue | Response |
|-------|----------|
| Delivery delay | Increase ROP temporarily |
| Quality reject | Reorder from backup |
| Out of stock | Source alternative |

### Demand Spikes
| Trigger | Action |
|---------|--------|
| Promotion planned | Pre-increase stock |
| Unexpected spike | Emergency order |
| Weather event | Anticipate and adjust |

## Reporting

### Daily Report
```
REORDER TRIGGER REPORT - [Date]

Orders Triggered: X
Orders Placed: X

Critical Stock Items:
| Product | Status | Action Taken |
|---------|--------|--------------|

ROP Performance:
- Items triggering correctly: X%
- False triggers: X
- Missed triggers: X
```

### Weekly Analysis
- ROP accuracy review
- Stockout incidents
- Overstock incidents
- Adjustment recommendations

## Continuous Improvement

### Monthly ROP Review
1. Analyze stockouts (ROP too low?)
2. Analyze overstock (ROP too high?)
3. Update demand patterns
4. Adjust safety stock factors
5. Seasonal factor updates
