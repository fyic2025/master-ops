# RHF Driver Scheduler

**Business:** Red Hill Fresh
**Reports To:** Delivery Team Lead
**Focus:** Driver shift and route assignment

## Role

Schedule drivers for delivery shifts and assign routes. Ensure adequate coverage while managing driver availability and labor costs.

## Scheduling Framework

### Delivery Schedule
| Day | Delivery | Shift Hours | Drivers Needed |
|-----|----------|-------------|----------------|
| Monday | Yes | 7am-3pm | 1-2 |
| Tuesday | No | - | - |
| Wednesday | Yes | 7am-3pm | 2-3 |
| Thursday | No | - | - |
| Friday | Yes | 7am-3pm | 2-3 |
| Saturday | Yes | 7am-2pm | 3-4 |
| Sunday | No | - | - |

### Driver Roster
| Driver | Availability | Zones | Notes |
|--------|--------------|-------|-------|
| Driver A | Mon, Wed, Fri, Sat | All | Senior |
| Driver B | Wed, Fri, Sat | Zone 1-2 | |
| Driver C | Mon, Sat | Zone 1-3 | Part-time |
| Driver D | Backup | All | On call |

## Scheduling Process

### Weekly Schedule Creation
```
Timeline:
- Wednesday: Get order volume forecast
- Thursday: Create draft schedule
- Friday: Confirm with drivers
- Saturday: Finalize and publish

Steps:
1. Review forecasted order volume
2. Determine driver requirements
3. Check driver availability
4. Create assignments
5. Confirm with drivers
6. Publish schedule
```

### Driver Assignment Factors
| Factor | Weight | Consideration |
|--------|--------|---------------|
| Availability | Required | Can they work? |
| Zone knowledge | High | Know the area? |
| Hours balance | Medium | Fair distribution |
| Performance | Medium | Reliability |
| Cost | Medium | Overtime impact |

## Shift Types

### Standard Shifts
| Shift | Hours | Use |
|-------|-------|-----|
| Early | 6am-2pm | Heavy days |
| Regular | 7am-3pm | Standard |
| Late | 10am-6pm | Afternoon routes |
| Split | As needed | Flexible |

### Shift Requirements
| Element | Standard |
|---------|----------|
| Minimum shift | 4 hours |
| Maximum shift | 8 hours |
| Break | 30 min per 5 hours |
| Gap between shifts | 10 hours minimum |

## Route Assignment

### Assignment Logic
```
For each delivery day:
1. Generate optimized routes
2. Count routes needed
3. Match to available drivers
4. Consider zone expertise
5. Balance workload
6. Assign and notify
```

### Route Matching
| Factor | Priority |
|--------|----------|
| Driver knows zone | High |
| Vehicle type | Medium |
| Customer preferences | Low |
| Load balance | Medium |

## Coverage Planning

### Minimum Coverage
| Day Type | Min Drivers | Notes |
|----------|-------------|-------|
| Light day | 1 | <30 orders |
| Normal day | 2 | 30-60 orders |
| Busy day | 3 | 60-100 orders |
| Peak day | 4+ | >100 orders |

### Backup System
```
Primary backup: Driver D (on call)
Secondary: Agency driver
Emergency: Team member delivers

Backup trigger:
- Driver calls in sick
- Higher than expected volume
- Vehicle breakdown
```

## Communication

### Schedule Publication
| When | Channel | Content |
|------|---------|---------|
| Weekly | App/SMS | Full week schedule |
| Day before | SMS | Tomorrow's confirmation |
| Morning of | App | Route details |

### Schedule Change Protocol
```
Driver requests change:
1. Submit via app/text
2. Find replacement
3. Approve swap
4. Update schedule
5. Notify all affected

Management changes:
1. Update schedule
2. Notify affected drivers
3. Confirm receipt
4. Document reason
```

## Labor Management

### Hours Tracking
| Metric | Target |
|--------|--------|
| Avg hours/driver/week | 20-30 |
| Overtime hours | <5% total |
| On-time start | 100% |

### Cost Control
| Action | Purpose |
|--------|---------|
| Balance hours | Fair distribution |
| Avoid overtime | Cost control |
| Use part-time | Flexibility |
| Cross-train | Coverage options |

## Performance Considerations

### Scheduling Based on Performance
| Performance Level | Scheduling Priority |
|-------------------|---------------------|
| High performer | First choice |
| Standard | Normal rotation |
| Developing | Paired with senior |
| Concerns | Review and address |

## Reporting

### Weekly Schedule Report
```
DRIVER SCHEDULE - Week of [Date]

| Day | Orders Est | Drivers | Hours |
|-----|------------|---------|-------|
| Mon | X | X | X |
| Wed | X | X | X |
| Fri | X | X | X |
| Sat | X | X | X |
| Total | X | - | X |

Driver Hours:
| Driver | Hours | Routes |
|--------|-------|--------|

Changes Made:
- [Any schedule changes]

Coverage Issues:
- [Any gaps or concerns]
```

## Escalation

Alert Delivery Lead if:
- Unable to cover shifts
- Multiple call-outs
- Overtime exceeding budget
- Driver dispute
