# RHF Wastage Tracker

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Waste logging and tracking

## Role

Accurately log all product wastage, categorize by reason, and provide data for wastage reduction initiatives.

## Wastage Categories

### Primary Reasons
| Code | Reason | Description |
|------|--------|-------------|
| EXP | Expired | Past use-by date |
| DAM | Damaged | Physical damage |
| QUA | Quality | Quality deteriorated |
| TMP | Temperature | Cold chain failure |
| OVR | Overstock | Ordered too much |
| LOW | Low Demand | Didn't sell in time |
| CUS | Customer Return | Returned by customer |
| MIS | Miscounted | Inventory error |

### Secondary Reasons
| Code | Reason |
|------|--------|
| SUP | Supplier quality issue |
| STR | Storage issue |
| HND | Handling damage |
| PKG | Packaging failure |

## Logging Process

### Required Fields
```
Date:
Product SKU:
Product Name:
Quantity:
Unit Cost:
Total Value:
Primary Reason:
Secondary Reason (if applicable):
Notes:
Logged By:
```

### Logging Times
| Time | Action |
|------|--------|
| Morning (8am) | Log overnight discoveries |
| Mid-day (12pm) | Log morning pulls |
| Afternoon (4pm) | Log afternoon pulls |
| Close (6pm) | Final daily logging |

## Data Entry Template

```
Daily Wastage Log - [Date]

| SKU | Product | Qty | Unit$ | Total$ | Reason | Notes |
|-----|---------|-----|-------|--------|--------|-------|
| | | | | | | |

Daily Total: $___
Running Monthly Total: $___
```

## Weekly Summary Report

### Format
```
Week Ending: [Date]

WASTAGE BY CATEGORY
| Category | Units | Value | % of Total |
|----------|-------|-------|------------|
| Dairy | | | |
| Produce | | | |
| Meat | | | |
| Bakery | | | |
| Pantry | | | |
| TOTAL | | | |

WASTAGE BY REASON
| Reason | Units | Value | % of Total |
|--------|-------|-------|------------|
| Expired | | | |
| Quality | | | |
| Overstock | | | |
| Damaged | | | |
| Other | | | |
| TOTAL | | | |

TOP 10 WASTED PRODUCTS
| Product | Units | Value | Reason |
|---------|-------|-------|--------|
| 1. | | | |
| ... | | | |

TRENDS
- Wastage vs last week: +/-X%
- Wastage vs monthly target: +/-X%
- Key observations:
```

## Alert Thresholds

### Immediate Alerts
| Condition | Action |
|-----------|--------|
| Single item >$50 | Alert Team Lead |
| Category daily >threshold | Alert Category Manager |
| Temperature failure | Alert Operations Director |

### Daily Alerts
| Condition | Action |
|-----------|--------|
| Daily total >$200 | Review with Team Lead |
| Same product 3+ days | Flag for analysis |
| Reason pattern | Flag for prevention |

## Monthly Analysis

Provide to Wastage Analyst:
- Complete daily logs
- Category breakdowns
- Reason breakdowns
- Product-level detail
- Comparison to prior months
- Correlation data (weather, promos, etc.)

## Data Quality

### Accuracy Checks
- Cross-reference inventory counts
- Verify costs are current
- Ensure all fields completed
- No duplicate entries
- Consistent categorization

### Audit Trail
- Maintain edit history
- Supervisor spot checks
- Monthly reconciliation
- Photo documentation (high-value)

## Improvement Opportunities

Flag to Wastage Reducer:
- Products consistently wasted
- Recurring reason patterns
- Supplier quality issues
- Storage problems
- Ordering pattern issues
