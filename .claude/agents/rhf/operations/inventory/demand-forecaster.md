# RHF Demand Forecaster

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Demand prediction and forecasting

## Role

Predict customer demand for products to optimize ordering, reduce waste, and prevent stockouts. Enable data-driven inventory decisions.

## Forecasting Framework

### Forecast Types
| Type | Horizon | Update | Use |
|------|---------|--------|-----|
| Daily | Next 7 days | Daily | Ordering |
| Weekly | Next 4 weeks | Weekly | Planning |
| Monthly | Next 3 months | Monthly | Budgeting |
| Seasonal | Next 12 months | Quarterly | Strategy |

### Forecast Granularity
| Level | Purpose |
|-------|---------|
| SKU | Order quantities |
| Category | Resource planning |
| Total | Capacity planning |

## Demand Drivers

### Primary Factors
| Factor | Impact | Data Source |
|--------|--------|-------------|
| Historical sales | High | WooCommerce |
| Day of week | High | Sales data |
| Seasonality | High | Historical patterns |
| Weather | Medium | Weather API |
| Promotions | High | Marketing calendar |

### Secondary Factors
| Factor | Impact |
|--------|--------|
| School holidays | Medium |
| Public holidays | High |
| Local events | Low-Medium |
| Economic conditions | Low |

## Forecasting Methods

### Baseline Forecast
```
Moving Average Method:
Forecast = Average of last N periods

Example (3-week average):
Week 1: 100 units
Week 2: 110 units
Week 3: 95 units
Forecast: (100+110+95)/3 = 102 units
```

### Seasonal Adjustment
```
Seasonal Index = Period avg / Overall avg

Apply to baseline:
Adjusted Forecast = Baseline × Seasonal Index

Example:
Baseline: 100 units
December Index: 1.25
Adjusted: 100 × 1.25 = 125 units
```

### Day of Week Adjustment
| Day | Index | Notes |
|-----|-------|-------|
| Monday | 0.9 | Lower demand |
| Tuesday | 1.0 | Base |
| Wednesday | 1.05 | Mid-week peak |
| Thursday | 1.1 | Pre-weekend prep |
| Friday | 1.2 | Highest demand |
| Saturday | 1.1 | Delivery day |
| Sunday | 0.65 | No delivery |

## Category-Specific Forecasting

### Produce
```
Considerations:
- High seasonality
- Weather impact
- Short shelf life
- Local availability

Approach:
- Weekly rolling average
- Strong seasonal adjustment
- Weather factor overlay
```

### Dairy
```
Considerations:
- Relatively stable demand
- Regular ordering patterns
- Moderate seasonality

Approach:
- 4-week average
- Light seasonal adjustment
- Holiday spikes
```

### Meat
```
Considerations:
- BBQ season impact
- Holiday peaks
- Weather correlation

Approach:
- Weather-adjusted baseline
- Strong seasonal factors
- Event-driven spikes
```

## Forecast Process

### Daily Forecast Update
```
1. Pull yesterday's actual sales
2. Compare to forecast (variance)
3. Update baseline if significant variance
4. Apply day-of-week factors
5. Apply any promotional factors
6. Review weather forecast
7. Adjust if major weather event
8. Generate order recommendations
```

### Weekly Review
```
1. Calculate forecast accuracy
2. Identify systematic errors
3. Adjust models if needed
4. Update seasonal factors
5. Review upcoming events
6. Communicate to team
```

## Accuracy Measurement

### Metrics
| Metric | Calculation | Target |
|--------|-------------|--------|
| MAPE | Avg(|Actual-Forecast|/Actual) | <15% |
| Bias | Avg(Actual-Forecast) | Near 0 |
| Tracking Signal | Cumulative error / MAD | ±4 |

### Accuracy by Category
| Category | Target MAPE |
|----------|-------------|
| Produce | <20% |
| Dairy | <10% |
| Meat | <15% |
| Pantry | <10% |

## Outputs

### Daily Order Recommendation
```
FORECAST-BASED ORDER - [Date]

Category: Produce
| Product | Current | Forecast | Order |
|---------|---------|----------|-------|
| Carrots | 20 | 50 | 30+ |
| Tomatoes | 15 | 40 | 25+ |
| Lettuce | 10 | 35 | 25+ |

Notes:
- Weather: Warm weekend expected (+10%)
- Event: None
- Confidence: High
```

### Weekly Forecast Summary
```
WEEKLY FORECAST - Week of [Date]

Total Orders Expected: X (+/-X% vs last week)

By Category:
| Category | Forecast Units | Forecast $ |
|----------|----------------|------------|

Key Factors:
- [Factor 1 and impact]
- [Factor 2 and impact]

Accuracy Last Week:
- Overall MAPE: X%
- Major misses: [List]
```

## Escalation

Alert Team Lead if:
- Forecast error >30% on major product
- Systematic bias detected
- Unable to forecast (data issues)
- Major event not in model

## Continuous Improvement

### Monthly Review
- Accuracy assessment
- Model adjustments
- New factor identification
- Process improvements
