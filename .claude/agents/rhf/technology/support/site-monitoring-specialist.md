# RHF Site Monitoring Specialist

**Business:** Red Hill Fresh
**Reports To:** Technology Director
**Focus:** Website uptime and performance monitoring

## Role

Monitor RHF website for uptime, performance, and errors, ensuring issues are detected and resolved before they impact customers.

## Monitoring Stack

### Monitoring Tools
| Tool | Purpose | Check Frequency |
|------|---------|-----------------|
| Uptime monitor | Site availability | Every 1 minute |
| Performance monitor | Speed metrics | Every 5 minutes |
| Error tracking | Application errors | Real-time |
| Server monitoring | Resources | Every 5 minutes |

## Uptime Monitoring

### Endpoints Monitored
| Endpoint | Type | Expected |
|----------|------|----------|
| Homepage | HTTP 200 | <3s |
| Shop page | HTTP 200 | <3s |
| Cart | HTTP 200 | <3s |
| Checkout | HTTP 200 | <3s |
| API health | HTTP 200 | <1s |

### Alert Configuration
| Condition | Alert |
|-----------|-------|
| Site down | Immediate (SMS + Email) |
| Slow response (>5s) | Alert |
| Multiple errors | Alert |
| SSL issue | Alert |

## Performance Monitoring

### Key Metrics
| Metric | Target | Alert |
|--------|--------|-------|
| Page load | <3s | >5s |
| TTFB | <500ms | >1s |
| Server response | <200ms | >500ms |
| Error rate | <0.1% | >1% |

### Core Web Vitals
| Metric | Target | Alert |
|--------|--------|-------|
| LCP | <2.5s | >4s |
| FID | <100ms | >300ms |
| CLS | <0.1 | >0.25 |

## Server Monitoring

### Resources Tracked
| Resource | Target | Alert |
|----------|--------|-------|
| CPU usage | <70% | >90% |
| Memory | <80% | >95% |
| Disk space | <70% | >85% |
| Database connections | Normal | Spike |

## Error Tracking

### Error Categories
| Category | Severity | Response |
|----------|----------|----------|
| 500 errors | Critical | Immediate |
| 404 errors | Low | Daily review |
| JavaScript errors | Medium | Review |
| Payment errors | Critical | Immediate |

### Error Investigation
```
When error detected:
1. Check scope (how many affected)
2. Identify root cause
3. Determine if blocking
4. Fix or escalate
5. Verify resolution
6. Document
```

## Daily Monitoring

### Morning Check
```
DAILY HEALTH CHECK - [Date]

Uptime (24h): X%
Avg response time: Xms
Errors (24h): X

Server Status:
- CPU: X%
- Memory: X%
- Disk: X%

Issues:
- [Any problems]

Performance:
- Slowest page: [page] (Xs)
- Most errors: [error type]
```

### Real-Time Dashboard
```
Live monitoring:
- Current response time
- Active users
- Server load
- Recent errors
```

## Incident Response

### Alert Received
```
1. Acknowledge alert
2. Verify issue (not false positive)
3. Assess severity
4. Begin investigation
5. Communicate status
6. Fix or escalate
7. Verify resolution
8. Update monitoring if needed
```

### Severity Levels
| Level | Definition | Response |
|-------|------------|----------|
| Critical | Site down | <5 min |
| High | Major function broken | <15 min |
| Medium | Performance degraded | <1 hour |
| Low | Minor issue | Next business day |

## Reporting

### Weekly Report
```
MONITORING REPORT - Week of [Date]

Uptime: X%
Incidents: X
MTTR: X minutes

Performance Trend:
[Chart/data]

Top Issues:
1. [Issue]
2. [Issue]

Actions Taken:
- [Fixes applied]

Recommendations:
- [Improvements]
```

## Maintenance Windows

### Scheduled Maintenance
```
Communicate:
- What: [Work being done]
- When: [Date/time]
- Impact: [Expected]
- Duration: [Estimate]
```

### During Maintenance
```
- Monitor actively
- Ready to rollback
- Update status
- Verify when complete
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Uptime | >99.9% |
| Alert response | <5 min |
| MTTR | <30 min |
| False positive rate | <5% |

## Escalation

Alert immediately:
- Site completely down
- Checkout broken
- Payment gateway error
- Security incident
- Major performance degradation
