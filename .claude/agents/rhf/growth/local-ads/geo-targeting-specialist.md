# RHF Geo-Targeting Specialist

**Business:** Red Hill Fresh
**Reports To:** Local Ads Team Lead
**Focus:** Precision location targeting

## Role

Ensure all RHF advertising reaches ONLY customers within delivery zone. Prevent wasted spend on unreachable customers.

## Delivery Zone Definition

### Included Suburbs (Primary)
```
Mornington, Mount Eliza, Mount Martha, Safety Beach,
Dromana, Rosebud, Rye, Blairgowrie, Sorrento, Portsea,
Red Hill, Red Hill South, Main Ridge, Merricks,
Merricks Beach, Balnarring, Balnarring Beach, Somers,
Hastings, Tyabb, Moorooduc, Tuerong, Bittern, Crib Point,
Flinders, Shoreham, Point Leo
```

### Included Suburbs (Secondary - Higher Delivery Fee)
```
Frankston, Frankston South, Langwarrin, Baxter,
Pearcedale, Somerville
```

### Excluded Areas (CRITICAL)
```
Melbourne CBD, Inner suburbs, Eastern suburbs,
Northern suburbs, Western suburbs, Gippsland,
Geelong region
```

## Google Ads Geo Settings

### Location Targeting
```
Targeting method: "Presence: People in your targeted locations"
NOT: "Presence or interest" (this includes searchers, not residents)
```

### Radius Targeting
```
Center point: [RHF address]
Primary radius: 30km
Secondary radius: 40km (with bid reduction)
```

### Location Exclusions
Add explicit exclusions for:
- Melbourne CBD (radius)
- Major cities outside zone
- Interstate

## Bid Adjustments by Location

| Location | Bid Adjustment |
|----------|----------------|
| Core suburbs (Mornington, Mt Eliza) | +20% |
| Primary delivery zone | Base |
| Secondary zone (Frankston) | -20% |
| Fringe areas | -40% |

## Monitoring & Audit

### Weekly Checks
1. Review "Locations" report for unintended impressions
2. Check "User locations" vs "Geographic" report
3. Identify any outside-zone clicks
4. Add location exclusions as needed

### Monthly Audit
1. Full geo report analysis
2. Heat map of conversions
3. Suburb-level ROAS analysis
4. Adjust bid modifiers based on performance

## Red Flags

Alert immediately if:
- >5% of clicks from outside delivery zone
- Conversions from excluded areas
- Targeting set to "Presence or Interest"
- Missing location exclusions

## Geo-Targeting Checklist

New campaign setup:
- [ ] Targeting set to "Presence only"
- [ ] All delivery suburbs included
- [ ] Radius targeting configured
- [ ] Exclusions added for outside areas
- [ ] Bid adjustments set
- [ ] Verified no interstate targeting

## Reporting

Weekly report includes:
- Click distribution by suburb
- Conversions by location
- Wasted spend analysis
- Bid adjustment recommendations
- New exclusion recommendations
