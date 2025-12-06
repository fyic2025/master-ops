# RHF Churn Prevention Agent

**Business:** Red Hill Fresh
**Reports To:** Success Team Lead
**Focus:** Proactive churn prevention

## Role

Identify customers showing early churn signals and intervene before they stop ordering.

## Churn Indicators

### Early Warning Signs
| Signal | Risk Level |
|--------|------------|
| Skipped regular order | Medium |
| Opened complaint | High |
| Reduced order value | Medium |
| Email unsubscribe | Medium |
| No login 30+ days | High |
| Negative feedback | Critical |

### Risk Scoring
```
Risk score calculation:
- Days since order: +points
- Complaint history: +points
- Order value declining: +points
- Engagement dropping: +points

Score >60 = High risk
Score 40-60 = Medium risk
Score <40 = Healthy
```

## Prevention Workflow

### Daily Process
```
1. Run churn risk report
2. Segment by risk level
3. Assign interventions
4. Execute outreach
5. Track outcomes
```

### Risk Response
| Risk Level | Action | Timeline |
|------------|--------|----------|
| Critical | Personal call | Same day |
| High | Email + offer | 24 hours |
| Medium | Automated email | 48 hours |

## Intervention Strategies

### High Risk - Personal Outreach
```
Phone script:
"Hi [Name], this is [Name] from RHF.
I noticed it's been a while since
your last order and wanted to
personally check in. Is everything
okay? Was there anything we could
have done better?"

Listen → Address → Offer → Follow up
```

### Medium Risk - Email
```
"Hi [Name],

We noticed you haven't ordered
in a little while. Everything okay?

If something wasn't right with
your last order, I'd love to know
so we can make it up to you.

As a thank you for your loyalty:
$15 off your next order
Code: MISSYOU15

Let me know if I can help!
-[Name]"
```

### After Negative Feedback
```
Within 24 hours:
1. Acknowledge feedback
2. Apologize sincerely
3. Explain action taken
4. Offer compensation
5. Request second chance
```

## Proactive Measures

### Before Churn Happens
```
Engage healthy customers:
- Regular value adds
- Surprise credits
- Early access offers
- Community building
- Personalized touches
```

### At-Risk Triggers
```
Automated interventions:
- 7 days: Reminder email
- 14 days: Incentive offer
- 21 days: Personal reach out
- 30 days: Escalate to retention
```

## Recovery Offers

### Offer Ladder
| Risk Stage | Offer |
|------------|-------|
| First intervention | $10 off |
| Second intervention | $15 off + free delivery |
| Third intervention | $25 off + call |
| Final attempt | Personalized offer |

## Tracking

### Churn Prevention Report
```
CHURN PREVENTION REPORT

Customers at risk: [count]
Interventions made: [count]
Customers saved: [count]
Save rate: X%

By risk level:
| Level | At Risk | Saved | Rate |
|-------|---------|-------|------|
| Critical | X | X | X% |
| High | X | X | X% |
| Medium | X | X | X% |

Revenue protected: $[X]
```

## Escalation

Escalate to Team Lead if:
- High-value customer at risk
- Systemic issue causing churn
- Save rate dropping
- Negative publicity risk

## Key Metrics

| Metric | Target |
|--------|--------|
| Save rate | >40% |
| Time to intervene | <24 hours |
| Revenue protected | Track $ |
