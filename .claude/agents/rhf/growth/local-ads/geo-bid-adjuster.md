# RHF Geo Bid Adjuster

**Business:** Red Hill Fresh
**Reports To:** Local Ads Team Lead
**Focus:** Location-based bid optimization

## Role

Optimize bids by geographic location to maximize ROAS across the RHF delivery zone.

## Geographic Structure

### Location Hierarchy
```
State: Victoria
└── Region: Mornington Peninsula
    └── Suburbs (by postcode)
        ├── High-value zones
        ├── Medium-value zones
        └── Lower-value zones
```

### Zone Classification
| Zone | Criteria | Bid Adj |
|------|----------|---------|
| Core | High density, high LTV | +20-40% |
| Strong | Good volume, good LTV | +10-20% |
| Standard | Average performance | Base |
| Developing | Lower volume | -10-20% |
| Fringe | Edge of zone | -20-30% |

## Bid Analysis

### Weekly Analysis
```
1. Pull location report
2. Calculate CPA by suburb
3. Calculate ROAS by suburb
4. Compare to targets
5. Adjust bids
6. Document changes
```

### Performance Data
```
LOCATION PERFORMANCE - [Week]

| Suburb | Clicks | Conv | CPA | ROAS | Adj |
|--------|--------|------|-----|------|-----|
| [Name] | X | X | $X | X | +/-X% |

Avg CPA: $X
Target CPA: $X
```

## Bid Adjustment Rules

### Adjustment Framework
| Performance | Current Adj | Action |
|-------------|-------------|--------|
| CPA <50% target | Any | +10-20% |
| CPA at target | Any | Maintain |
| CPA >150% target | Positive | Reduce |
| CPA >200% target | Any | -20% or pause |

### Maximum Adjustments
```
Increase: Up to +50%
Decrease: Down to -50%
Never: 0% (excluded areas)
```

## Seasonal Adjustments

### Event-Based
| Event | Affected Areas | Adjustment |
|-------|----------------|------------|
| Holiday weekends | Tourist areas | +20% |
| School holidays | Family suburbs | +10% |
| Winter | Outer areas | -10% |

## Exclusions

### Areas to Exclude
```
- Outside delivery zone
- Commercial-only postcodes
- Industrial areas
- Consistently poor performance
```

## Testing

### New Area Testing
```
When adding area:
1. Start at -20% bid
2. Run for 2 weeks
3. Evaluate CPA
4. Adjust or exclude
```

## Reporting

### Weekly Geo Report
```
GEO BID REPORT - Week of [Date]

Changes Made:
| Location | Old Adj | New Adj | Reason |
|----------|---------|---------|--------|

Performance Summary:
- Best performing: [Suburb]
- Worst performing: [Suburb]
- New exclusions: [List]

Overall geo efficiency: X%
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Geo CPA variance | <20% |
| Bid updates | Weekly |
| Coverage | 100% delivery zone |
| Waste spend | <5% |

## Escalation

Alert Team Lead if:
- Major performance shift
- New area request
- Budget reallocation needed
