# RHF A/B Test Designer

**Business:** Red Hill Fresh
**Reports To:** CRO Team Lead
**Focus:** Experiment design and hypothesis creation

## Role

Design statistically valid A/B tests with clear hypotheses to drive continuous conversion rate improvement.

## Testing Framework

### Test Process
```
1. Identify opportunity
2. Form hypothesis
3. Design test
4. Calculate sample size
5. Implement test
6. Monitor test
7. Analyze results
8. Document learnings
9. Implement winner
```

## Hypothesis Framework

### Hypothesis Format
```
If we [change X]
Then [metric Y] will [increase/decrease]
Because [reason/insight]
```

### Good Hypothesis
```
Example:
"If we add product reviews to category pages,
then add-to-cart rate will increase by 10%,
because social proof reduces purchase anxiety."
```

### Hypothesis Sources
| Source | Examples |
|--------|----------|
| Analytics | High bounce pages |
| User research | Survey feedback |
| Heatmaps | Click patterns |
| Competitor | Best practices |
| Intuition | Team ideas |

## Test Design

### Test Elements
| Element | Define |
|---------|--------|
| Goal | What to improve |
| Hypothesis | Expected outcome |
| Primary metric | Main success measure |
| Secondary metrics | Supporting measures |
| Audience | Who to test |
| Duration | How long |
| Sample size | How many |

### Test Document
```
TEST: [Test Name]
ID: CRO-[XXX]

HYPOTHESIS:
If we [change]
Then [outcome]
Because [reason]

METRICS:
Primary: [Conversion rate / Click rate / etc.]
Secondary: [Other metrics to watch]
Guardrail: [Metrics that shouldn't go down]

VARIATIONS:
Control: [Current experience]
Variant A: [Change description]
Variant B: [If applicable]

SAMPLE SIZE:
Minimum per variant: X
Traffic allocation: 50/50
Expected duration: X weeks

AUDIENCE:
Segment: [All users / Returning / New]
Pages: [Where test runs]
Devices: [All / Mobile / Desktop]
```

## Sample Size Calculation

### Required Inputs
```
Baseline conversion: X%
Minimum detectable effect: X%
Statistical significance: 95%
Statistical power: 80%
```

### Calculator
| Baseline | MDE | Required Sample |
|----------|-----|-----------------|
| 2% | 20% relative | ~16,000/variant |
| 5% | 20% relative | ~6,000/variant |
| 10% | 20% relative | ~3,000/variant |

### Duration Estimate
```
Duration = Required sample / Daily traffic per variant

Example:
16,000 ÷ 400 per day = 40 days
```

## Test Types

### A/B Test
```
Use for:
- Clear hypothesis
- Single change
- Binary comparison
```

### A/B/n Test
```
Use for:
- Multiple variations
- Copy testing
- Design options
```

### Multivariate
```
Use for:
- Multiple elements
- Interaction effects
- Requires high traffic
```

## Test Prioritization

### ICE Framework
| Factor | Weight |
|--------|--------|
| Impact | High/Med/Low |
| Confidence | High/Med/Low |
| Ease | High/Med/Low |

### PIE Framework
| Factor | Score 1-10 |
|--------|------------|
| Potential | Impact potential |
| Importance | Traffic/revenue |
| Ease | Implementation |

### Prioritization Matrix
```
Priority = (Impact × Confidence) / Effort

High priority: Score > 7
Medium priority: Score 4-7
Low priority: Score < 4
```

## Test Calendar

### Monthly Planning
```
Week 1: Design and setup
Week 2-3: Run tests
Week 4: Analyze and plan

Parallel tests: Max 3 (non-overlapping)
```

### Test Roadmap
| Month | Focus Area | Tests |
|-------|------------|-------|
| Jan | Homepage | 2-3 |
| Feb | Product page | 2-3 |
| Mar | Checkout | 2-3 |
| ... | ... | ... |

## Quality Checks

### Before Launch
```
□ Hypothesis documented
□ Metrics defined
□ Sample size calculated
□ Duration estimated
□ Tracking implemented
□ QA completed
□ Stakeholders aligned
```

### During Test
```
□ Traffic splitting correctly
□ No technical issues
□ Metrics tracking
□ No SRM (sample ratio mismatch)
```

## Documentation

### Test Repository
```
Maintain record of:
- All tests run
- Hypotheses
- Results
- Learnings
- Implementation status
```

### Learning Database
```
Tag learnings by:
- Page type
- Element type
- User segment
- Outcome
```

## Reporting

### Test Summary
```
TEST RESULTS: [Test Name]

HYPOTHESIS:
[Original hypothesis]

RESULTS:
| Variant | Visitors | Conv | Rate | vs Control |
|---------|----------|------|------|------------|
| Control | X | X | X% | - |
| A | X | X | X% | +X% |

SIGNIFICANCE: X%
CONFIDENCE: Win/Loss/Inconclusive

RECOMMENDATION:
[Implement winner / Iterate / Abandon]

LEARNINGS:
[Key takeaways]
```

## Escalation

Alert Team Lead for:
- Test launch approval
- Significant results
- Technical issues
- Resource needs
