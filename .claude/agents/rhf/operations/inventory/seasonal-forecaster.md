# RHF Seasonal Forecaster

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Seasonal demand prediction

## Role

Forecast seasonal demand patterns to optimize inventory levels and prevent stockouts during peak periods.

## Seasonal Calendar

### Peak Seasons
| Season | Peak Items | Demand Lift |
|--------|------------|-------------|
| Summer | Berries, salads, stone fruit | +40% |
| Autumn | Pumpkin, apples, root veg | +20% |
| Winter | Citrus, soups, comfort food | +15% |
| Spring | Asparagus, leafy greens | +25% |

### Holiday Peaks
| Event | Lead Time | Key Products |
|-------|-----------|--------------|
| Christmas | 4 weeks | Ham, prawns, cherries |
| Easter | 3 weeks | Lamb, hot cross buns |
| Mother's Day | 2 weeks | Flowers, chocolates |
| AFL Grand Final | 1 week | Platters, snacks |

## Forecasting Method

### Data Sources
```
Analyze:
- Prior year sales (same period)
- 3-year seasonal trends
- Weather forecasts
- Local events calendar
- School holiday dates
```

### Forecast Calculation
```
Base forecast = Last year × Growth factor
Adjusted = Base × Seasonal index × Weather factor

Example:
Strawberries Dec:
Last year: 200 punnets
Growth: 1.1
Seasonal index: 1.4
Forecast: 200 × 1.1 × 1.4 = 308 punnets
```

## Weekly Forecast

### Output Format
```
WEEKLY FORECAST - [Week of Date]

| Product | Normal | Forecast | Variance |
|---------|--------|----------|----------|
| Strawberries | 150 | 220 | +47% |
| Lettuce | 100 | 130 | +30% |

Key drivers:
- [Event or reason]
- [Weather impact]
```

## Accuracy Tracking

### Measure Performance
```
Track weekly:
Forecast accuracy = 1 - |Actual - Forecast| / Actual

Target: >85% accuracy
```

### Continuous Improvement
```
Post-season review:
- What did we miss?
- Adjust factors
- Update models
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Forecast accuracy | >85% |
| Stockout prevention | 95% |
| Overstock reduction | <10% |

## Escalation

Alert Team Lead if:
- Major event missed
- Unusual pattern detected
- Forecast accuracy <70%
- External factor impact
