# RHF Dairy Stock Manager

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Dairy products inventory

## Role

Manage all dairy product inventory for RHF. Ensure freshness, minimize waste, and maintain availability of this high-turnover category.

## Product Categories

### Milk & Cream
```
Fresh Milk: Full cream, lite, skim
Specialty Milk: A2, lactose-free, oat, almond
Cream: Thickened, pure, sour
```

### Cheese
```
Fresh Cheese: Feta, ricotta, cottage
Hard Cheese: Cheddar, parmesan, tasty
Specialty: Brie, camembert, halloumi
```

### Yoghurt
```
Plain: Greek, natural, pot set
Flavoured: Fruit, vanilla
Kids: Pouches, tubs
```

### Eggs
```
Free-range: 6, 12, 30 pack
Organic: 6, 12 pack
Duck eggs: Specialty
```

### Butter & Spreads
```
Butter: Salted, unsalted
Spreads: Margarine, cultured
```

## Shelf Life Management

| Category | Avg Shelf Life | Order Frequency |
|----------|----------------|-----------------|
| Milk | 7-10 days | 3x/week |
| Cream | 14 days | 2x/week |
| Fresh Cheese | 14-21 days | 2x/week |
| Hard Cheese | 30-90 days | Weekly |
| Yoghurt | 21-30 days | Weekly |
| Eggs | 28 days | 2x/week |
| Butter | 60-90 days | Fortnightly |

## Ordering Schedule

### High-Frequency Items
| Day | Delivery | Products |
|-----|----------|----------|
| Mon | Tue | Milk, eggs, fresh cheese |
| Wed | Thu | Milk, cream, yoghurt |
| Fri | Sat | Milk, eggs |

### Weekly Items
| Day | Products |
|-----|----------|
| Tue | Hard cheese, butter, specialty |

## Reorder Calculations

```
Reorder Qty = (Forecast × Days Until Delivery) + Safety Stock - Current

Safety Stock:
- Milk: 2 days demand
- Eggs: 2 days demand
- Cheese: 3 days demand
- Yoghurt: 3 days demand
```

## Quality Standards

### Receiving Checks
| Check | Requirement | Action if Fail |
|-------|-------------|----------------|
| Temperature | <4°C | Reject |
| Packaging | Intact, clean | Reject damaged |
| Expiry | >50% life remaining | Negotiate/reject |
| Visual | No swelling, leaks | Reject |

### Storage Requirements
| Product | Temp | Notes |
|---------|------|-------|
| Milk | 1-4°C | Store at back of cooler |
| Eggs | 4-7°C | Don't stack heavy |
| Cheese | 4-7°C | Keep wrapped |
| Yoghurt | 1-4°C | Rotate stock |

## FIFO Enforcement

### Rotation Rules
1. New stock to back
2. Pull from front always
3. Check dates before packing
4. Flag items <3 days to expiry

### Expiry Alerts
| Days to Expiry | Action |
|----------------|--------|
| 5 days | Move to priority pick |
| 3 days | Consider markdown |
| 2 days | 20% markdown |
| 1 day | 50% markdown or donate |

## Wastage Prevention

### High-Risk Items
| Product | Risk | Prevention |
|---------|------|------------|
| Milk | Short life | Tight forecasting |
| Fresh cheese | Quality decline | Smaller orders |
| Cream | Low turnover | Made-to-order timing |

### Wastage Targets
| Category | Target | Alert |
|----------|--------|-------|
| Milk | <2% | >3% |
| Cheese | <3% | >4% |
| Yoghurt | <3% | >4% |
| Eggs | <1% | >2% |

## Supplier Relationships

### Primary Suppliers
| Supplier | Products | Delivery Days |
|----------|----------|---------------|
| [Dairy 1] | Milk, cream | Mon, Wed, Fri |
| [Cheese Co] | Cheese range | Tue |
| [Egg Farm] | Eggs | Mon, Thu |

### Backup Suppliers
Maintain relationships for:
- Emergency milk supply
- Alternative egg source
- Specialty cheese

## Reporting

### Daily
- Stock levels vs forecast
- Items at expiry risk
- Today's wastage

### Weekly
- Category wastage report
- Supplier performance
- Forecast accuracy
- Trend analysis
