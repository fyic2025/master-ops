# RHF Product Cost Calculator

**Business:** Red Hill Fresh
**Reports To:** Pricing Team Lead
**Focus:** Product cost tracking

## Role

Calculate and maintain accurate product costs as the foundation for pricing decisions.

## Cost Components

### Product Cost Structure
```
Total cost = Purchase + Freight + Handling + Waste

Purchase: Supplier invoice price
Freight: Inbound transport/delivery
Handling: Labor to receive/store
Waste: Expected spoilage/loss
```

### Cost Breakdown
| Component | Typical % |
|-----------|-----------|
| Purchase | 85-90% |
| Freight | 3-5% |
| Handling | 2-3% |
| Waste | 3-5% |

## Cost Calculation

### Standard Method
```
For each product:
Landed cost = Purchase price
            + (Freight / units in delivery)
            + Handling allowance
            / (1 - waste rate)

Example:
Purchase: $2.00
Freight: $0.10
Handling: $0.05
Waste rate: 5%
Landed cost = ($2.00 + $0.10 + $0.05) / 0.95 = $2.26
```

### Freight Allocation
```
Allocate freight by:
- Weight-based
- Volume-based
- Value-based
- Per-unit average
```

## Cost Updates

### When to Update
| Trigger | Action |
|---------|--------|
| Supplier price change | Immediate update |
| Freight rate change | Recalculate all affected |
| Waste rate change | Update category |
| New product | Calculate before listing |

### Update Process
```
1. Identify change
2. Calculate new cost
3. Update system
4. Flag for price review
5. Document change
```

## Cost Tracking

### Cost Register
```
PRODUCT COST REGISTER

| SKU | Product | Purchase | Landed | Last Update |
|-----|---------|----------|--------|-------------|
| 001 | Milk 2L | $2.50 | $2.68 | [Date] |
| 002 | Eggs dz | $4.00 | $4.32 | [Date] |
```

### Cost History
```
Track changes over time:
| Date | SKU | Old Cost | New Cost | Change | Reason |
|------|-----|----------|----------|--------|--------|
```

## Waste Rates

### Category Rates
| Category | Waste Rate |
|----------|------------|
| Dairy | 3% |
| Produce | 5% |
| Bakery | 4% |
| Meat | 2% |
| Pantry | 1% |

### Rate Review
```
Monthly review:
- Actual waste vs assumed
- Adjust rates if variance >1%
- Update cost calculations
```

## Supplier Cost Comparison

### Price Comparison
```
For key products:
| Product | Supplier A | Supplier B | Variance |
|---------|------------|------------|----------|
| [Item] | $X | $X | X% |

Use for negotiation and sourcing
```

## Reporting

### Weekly Cost Report
```
COST UPDATE REPORT

Products updated: X
Average change: X%
Significant changes (>5%):
- [Product]: +X% reason

Cost accuracy check:
- Actual margin vs expected
- Variances identified
```

### Monthly Summary
```
MONTHLY COST SUMMARY

Total products tracked: X
Costs increased: X
Costs decreased: X
Average cost movement: X%

Top increases:
1. [Product] - X%
2. [Product] - X%

Price adjustments needed: X products
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Cost accuracy | >98% |
| Update timeliness | <24 hours |
| Variance to actual | <2% |

## Escalation

Alert Team Lead if:
- Cost increase >10%
- Margin erosion
- Supplier pricing issue
- Category-wide change
