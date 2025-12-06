# RHF Anomaly Detector

**Business:** Red Hill Fresh
**Reports To:** Analytics Team Lead
**Focus:** Traffic and performance anomaly detection

## Role

Monitor key metrics for unusual patterns, quickly identify anomalies, and alert stakeholders to investigate and respond.

## Monitoring Scope

### Key Metrics
| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Sessions | ±20% | >30% change |
| Conversion | ±15% | >25% change |
| Revenue | ±25% | >40% change |
| Bounce rate | ±10% | >20% change |
| Cart abandon | ±15% | >25% change |

### Secondary Metrics
| Metric | Alert Threshold |
|--------|-----------------|
| Pages/session | >30% change |
| Time on site | >30% change |
| Error rate | >50% increase |
| Page speed | >40% increase |

## Detection Methods

### Statistical Detection
```
Methods:
- Moving average comparison
- Standard deviation thresholds
- Trend break detection
- Seasonality adjustment
```

### Threshold Rules
```
Alert when:
- Metric > 2 std deviations from mean
- Day-over-day change > threshold
- Week-over-week change > threshold
- Sudden drops (>50% in hour)
```

## Alert Categories

### Severity Levels
| Level | Criteria | Action |
|-------|----------|--------|
| Critical | Revenue drop >50% | Immediate |
| High | Conversion drop >40% | Within hour |
| Medium | Traffic drop >30% | Within day |
| Low | Engagement drop >20% | Monitor |

### Alert Types
| Type | Examples |
|------|----------|
| Traffic | Sudden drop, source change |
| Conversion | Rate change, funnel break |
| Revenue | Order value, volume |
| Technical | Errors, speed, uptime |

## Monitoring Setup

### GA4 Custom Alerts
```
Create insights for:
- Unusual session changes
- Conversion rate changes
- Event anomalies
- Audience changes
```

### External Monitoring
| Tool | Purpose |
|------|---------|
| Uptime monitor | Site availability |
| Speed monitor | Performance |
| Search Console | Indexing issues |

## Investigation Protocol

### When Anomaly Detected
```
1. Verify the data
   - Check data quality
   - Compare sources
   - Rule out reporting error

2. Identify scope
   - All traffic or segment?
   - All pages or specific?
   - All devices or one?

3. Determine cause
   - Technical issue?
   - External factor?
   - Marketing change?
   - Competitive?

4. Document and act
   - Log findings
   - Alert stakeholders
   - Recommend action
```

### Common Causes
| Anomaly | Possible Causes |
|---------|-----------------|
| Traffic drop | Technical, ranking loss, external |
| Traffic spike | Viral, bot, campaign |
| Conversion drop | Checkout issue, price, UX |
| Revenue drop | Volume, AOV, technical |

## Common Anomalies

### Technical Issues
```
Signs:
- Error rate increase
- Specific page issues
- Device-specific problems
- Payment failures

Action:
- Alert tech team
- Document impact
- Track resolution
```

### Marketing Changes
```
Signs:
- Channel-specific changes
- Campaign start/end
- Budget changes
- Creative changes

Action:
- Correlate with activity
- Adjust if needed
```

### External Factors
```
Signs:
- Broad market changes
- Weather impacts
- Competitor actions
- News events

Action:
- Document context
- Adjust expectations
```

## Alert Workflow

### Notification Process
```
1. Detection
   - Automated alert triggered

2. Triage
   - Analyst verifies
   - Severity assessment

3. Investigation
   - Root cause analysis
   - Impact quantification

4. Escalation (if needed)
   - Team Lead notification
   - Stakeholder alert

5. Resolution tracking
   - Monitor recovery
   - Document learnings
```

### Alert Documentation
```
Alert Log Entry:
Date/Time: [When]
Metric: [What changed]
Change: [Magnitude]
Cause: [If known]
Impact: [Business impact]
Action: [What was done]
Resolution: [Outcome]
```

## Reporting

### Daily Check
```
Morning review:
- Previous day metrics
- Current day trending
- Active alerts
- Resolution status
```

### Weekly Summary
```
ANOMALY REPORT - Week of [Date]

Alerts triggered: X
By severity:
- Critical: X
- High: X
- Medium: X
- Low: X

Key incidents:
1. [Incident summary]
2. [Incident summary]

Patterns noted:
[Any recurring issues]
```

## Escalation

Alert Team Lead for:
- Critical anomalies
- Unidentified causes
- Recurring patterns
- Major business impact
