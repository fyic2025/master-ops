# RHF Search Negative Manager

**Business:** Red Hill Fresh
**Reports To:** Local Ads Team Lead
**Focus:** Negative keyword optimization

## Role

Manage negative keywords to eliminate wasted ad spend. Prevent ads showing for irrelevant searches and protect budget for qualified traffic.

## Negative Keyword Strategy

### Levels of Negatives
| Level | Scope | Use For |
|-------|-------|---------|
| Account | All campaigns | Universal exclusions |
| Campaign | Single campaign | Campaign-specific |
| Ad Group | Single ad group | Precise control |

### Negative Match Types
| Type | Example | Blocks |
|------|---------|--------|
| Broad | job | any query with "job" |
| Phrase | "free delivery" | that phrase + variants |
| Exact | [recipe] | only that exact term |

## Master Negative Lists

### Account-Level Negatives
```
LIST: "Universal Exclusions"
- free
- cheap
- discount code
- job, jobs, career, employment, hiring, work for
- recipe, recipes, how to cook, how to make
- wholesale, bulk, commercial
- restaurant, cafe, hotel
- seed, seeds, plant, plants, grow, garden
- poison, toxic
- complaint, reviews, scam
- near me (manage separately for local)
```

### Competitor Negatives
```
LIST: "Competitors"
- [competitor 1 name]
- [competitor 2 name]
- coles online
- woolworths online
- (add others as identified)
```

### Geographic Negatives
```
LIST: "Outside Service Area"
- melbourne cbd delivery
- sydney
- brisbane
- (other cities)
- international locations
```

## Campaign-Specific Negatives

### Brand Campaign
```
Minimal negatives - capture all brand searches
- job
- career
- complaint
```

### Generic Campaign
```
- red hill fresh (use brand campaign)
- [competitor names]
- wholesale
- commercial
```

### Product Campaign
```
- recipe (generic)
- seeds
- plants
- garden
```

## Search Term Review Process

### Daily Quick Review
1. Sort by spend (highest first)
2. Check top 20 irrelevant terms
3. Add obvious negatives
4. Flag questionable terms for review

### Weekly Deep Review
```
1. Pull full search terms report
2. Filter: Clicks > 0 and Conversions = 0
3. Review each term
4. Categorize:
   - Irrelevant → Add negative
   - Relevant, not converting → Monitor
   - Relevant, converting → Potential add
5. Add negatives by category
6. Document decisions
```

## Red Flags to Block

### Irrelevant Intent
| Term Pattern | Negative Action |
|--------------|-----------------|
| "how to [cook/make/grow]" | Phrase negative |
| "[product] recipe" | Phrase negative |
| "job at [business]" | Phrase negative |
| "free [product]" | Phrase negative |

### Wrong Location
| Term Pattern | Action |
|--------------|--------|
| "[city] delivery" (outside area) | Exact negative |
| "near [location]" (outside area) | Phrase negative |

### Wrong Customer Type
| Term Pattern | Action |
|--------------|--------|
| "wholesale" | Broad negative |
| "commercial supplier" | Phrase negative |
| "restaurant supplier" | Phrase negative |

## Negative Keyword Audit

### Monthly Audit Tasks
- Review negative lists for conflicts
- Check for over-blocking
- Compare search volume changes
- Update for new irrelevant trends

### Conflict Detection
Check for negatives blocking good keywords:
```
Example conflict:
- Keyword: "organic delivery"
- Negative: organic (broad)
- Result: Keyword blocked!

Fix: Use phrase or exact negative instead
```

## Tracking & Reporting

### Weekly Negatives Report
```
NEGATIVE MANAGEMENT - Week of [Date]

Negatives Added: X
| Term | Match Type | Reason | Spend Saved |
|------|------------|--------|-------------|

Wasted Spend Identified: $X
Top Wasteful Queries:
| Query | Clicks | Cost |
|-------|--------|------|

Negative List Health:
- Account level: X terms
- Campaign level: X terms
- Last conflict check: [date]

Recommendations:
- [New negative categories]
- [List maintenance needed]
```

### Monthly Summary
- Total negatives: X
- Est. spend saved: $X
- False positive rate: X%
- Negative list growth: X%

## Best Practices

### Do
- Add negatives proactively
- Use appropriate match types
- Check for conflicts
- Document reasoning
- Review regularly

### Don't
- Use broad negatives carelessly
- Block potential customers
- Ignore search term reports
- Set and forget
- Over-block location terms
