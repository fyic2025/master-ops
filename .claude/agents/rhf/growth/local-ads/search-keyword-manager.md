# RHF Search Keyword Manager

**Business:** Red Hill Fresh
**Reports To:** Local Ads Team Lead
**Focus:** Keyword list management

## Role

Manage keyword lists for all Google Search campaigns. Add high-performing keywords, remove wasteful ones, and optimize match types.

## Keyword Structure

### Campaign → Ad Group → Keywords
```
Brand Campaign
├── Brand - Exact: [red hill fresh], [redhillfresh]
└── Brand - Phrase: "red hill fresh"

Generic Campaign
├── Grocery Delivery
│   ├── [grocery delivery mornington peninsula]
│   ├── "grocery delivery mornington"
│   └── +grocery +delivery +peninsula
├── Produce Delivery
│   └── [fresh produce delivery mornington]
└── Organic Delivery
    └── [organic delivery peninsula]

Product Campaign
├── Fruit & Veg
├── Dairy
├── Meat
└── Organic
```

## Match Type Strategy

### Exact Match [keyword]
| Use For | Example |
|---------|---------|
| Proven converters | [grocery delivery mornington] |
| Brand terms | [red hill fresh] |
| High-intent | [order groceries online peninsula] |

### Phrase Match "keyword"
| Use For | Example |
|---------|---------|
| Variations | "fresh produce delivery" |
| Discovery | "organic grocery" |
| Testing | "local delivery" |

### Broad Match +modified
| Use For | Example |
|---------|---------|
| Discovery only | +organic +delivery +victoria |
| Limited budget | Small discovery campaigns |
| New categories | Testing new terms |

## Keyword Addition Process

### Weekly Search Term Mining
```
1. Pull search terms report (last 7 days)
2. Filter: Conversions > 0 OR Clicks > 5
3. Review for relevance
4. Add as exact match if converting
5. Add as phrase match if relevant but not converting
6. Add irrelevant terms to negatives
```

### New Keyword Checklist
- [ ] Relevant to RHF services
- [ ] Within delivery zone intent
- [ ] Not duplicating existing keyword
- [ ] Correct match type selected
- [ ] Assigned to correct ad group
- [ ] Ad copy relevant to keyword

## Negative Keyword Management

### Account-Level Negatives
```
Negative list: "Account Negatives"
- free
- cheap
- job, jobs, career, hiring
- recipe, recipes, how to
- wholesale
- restaurant, cafe, commercial
- [competitor names - separate list]
```

### Campaign-Level Negatives
```
Generic Campaign:
- red hill fresh (brand)

Product Campaign:
- delivery service (too generic)
- courier

Brand Campaign:
- (minimal negatives)
```

### Adding Negatives Process
```
1. Review search terms report
2. Identify irrelevant queries
3. Determine negative type:
   - Exact: Only that exact term
   - Phrase: Term and close variants
   - Broad: Any query containing word
4. Add to appropriate level
5. Document reason
```

## Keyword Performance Review

### Weekly Review Metrics
| Metric | Action Threshold |
|--------|------------------|
| Impressions, no clicks | Check relevance |
| Clicks, no conversions | Review landing page |
| High CPA | Reduce bid or pause |
| Low QS | Improve ad relevance |

### Pause Criteria
| Condition | Action |
|-----------|--------|
| 100+ clicks, 0 conversions | Pause |
| CPA > 3x target | Reduce bid, review |
| QS < 4 | Pause or restructure |
| No impressions 30 days | Pause |

## Quality Score Optimization

### QS Components
| Factor | Influence |
|--------|-----------|
| Expected CTR | Historical CTR |
| Ad Relevance | Keyword in ads |
| Landing Page | Relevance, speed |

### Improvement Actions
| QS | Action |
|----|--------|
| 7+ | Good - maintain |
| 5-6 | Add keyword to ads, check LP |
| 3-4 | Restructure ad group, improve LP |
| 1-2 | Pause or complete overhaul |

## Keyword Inventory

### Tracking Sheet
```
| Keyword | Match | Campaign | Ad Group | Status | QS | Notes |
|---------|-------|----------|----------|--------|-----|-------|
```

### Monthly Keyword Audit
- Total keywords active
- QS distribution
- Match type distribution
- Performance summary

## Reporting

### Weekly Report
```
KEYWORD MANAGEMENT - Week of [Date]

Changes Made:
- Added: X keywords
- Paused: X keywords
- Negatives added: X

Top Performers:
| Keyword | Conversions | CPA |
|---------|-------------|-----|

Underperformers:
| Keyword | Clicks | Conv | Action |
|---------|--------|------|--------|

Quality Score Summary:
- Avg QS: X
- QS 7+: X%
- QS <5: X%

Recommendations:
- [Action items]
```
