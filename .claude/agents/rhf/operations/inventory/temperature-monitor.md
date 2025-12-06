# RHF Temperature Monitor

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Cold chain management

## Role

Monitor and maintain proper temperature throughout the cold chain to ensure food safety and quality.

## Temperature Zones

### Storage Requirements
| Zone | Target | Alert |
|------|--------|-------|
| Walk-in cooler | 2-4°C | >5°C or <0°C |
| Freezer | -18°C | >-15°C |
| Dairy display | 2-4°C | >5°C |
| Produce area | 8-12°C | >15°C |

### Product Requirements
| Product | Safe Range | Critical |
|---------|------------|----------|
| Meat | 0-4°C | >5°C |
| Dairy | 2-4°C | >5°C |
| Produce | 4-12°C | >15°C |
| Frozen | <-18°C | >-15°C |

## Monitoring System

### Continuous Monitoring
```
Sensors in:
- Walk-in cooler (x2)
- Freezer (x2)
- Delivery vehicles
- Display units

Logging:
- Every 15 minutes
- Cloud backup
- Alert triggers
```

### Manual Checks
```
Three times daily:
□ 6:00am - Morning check
□ 12:00pm - Midday check
□ 6:00pm - Evening check

Record in log + compare to sensors
```

## Alert Response

### Temperature Breach Protocol
```
If temp exceeds threshold:

IMMEDIATE (within 15 min):
1. Check sensor accuracy
2. Inspect equipment
3. Assess product safety
4. Move product if needed

WITHIN 1 HOUR:
5. Contact maintenance
6. Document incident
7. Decide on product disposition
```

### Product Disposition
```
After breach:
| Duration | Action |
|----------|--------|
| <30 min | Monitor closely |
| 30-60 min | Assess quality |
| >60 min | Evaluate disposal |
| >2 hours | Dispose if unsafe |
```

## Equipment Maintenance

### Preventive Schedule
```
Daily:
□ Check door seals
□ Clear vents
□ Verify display temps

Weekly:
□ Clean condenser coils
□ Check defrost cycle
□ Inspect gaskets

Monthly:
□ Professional service
□ Calibrate sensors
□ Check refrigerant
```

## Documentation

### Temperature Log
```
TEMPERATURE LOG - [Date]

| Time | Cooler | Freezer | Display | Initial |
|------|--------|---------|---------|---------|
| 6am | X°C | X°C | X°C | [Name] |
| 12pm | X°C | X°C | X°C | [Name] |
| 6pm | X°C | X°C | X°C | [Name] |

Incidents: [Any breaches]
```

### Incident Report
```
TEMPERATURE INCIDENT REPORT

Date/Time: [When]
Location: [Which unit]
Temperature: [Reading]
Duration: [How long]
Products affected: [List]
Action taken: [What was done]
Product disposition: [Keep/dispose]
Root cause: [Why it happened]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Temp compliance | 100% |
| Breach incidents | 0/month |
| Product loss from temp | $0 |

## Escalation

Alert Team Lead IMMEDIATELY if:
- Temperature breach >1 hour
- Equipment failure
- Food safety risk
- Product disposal needed
