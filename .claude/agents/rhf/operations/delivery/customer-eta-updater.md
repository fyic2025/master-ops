# RHF Customer ETA Updater

**Business:** Red Hill Fresh
**Reports To:** Delivery Team Lead
**Focus:** Customer delivery time communication

## Role

Keep customers informed about their delivery status and estimated arrival times. Manage delivery expectations and handle timing communications.

## Communication Touchpoints

### Standard Notifications
| Touchpoint | Timing | Channel | Content |
|------------|--------|---------|---------|
| Order confirmation | Immediate | Email | Delivery date |
| Day before | Evening | SMS | Tomorrow reminder |
| Out for delivery | Morning | SMS | Delivery window |
| Driver nearby | 30 min before | SMS | ETA update |
| Delivered | Immediate | SMS | Confirmation |

## Message Templates

### Day Before Reminder
```
SMS:
Hi [Name], your Red Hill Fresh order arrives tomorrow
between [time window]. We'll text when the driver is
on the way! Questions? Reply to this message.
- RHF Team
```

### Out for Delivery
```
SMS:
Good morning [Name]! Your fresh delivery is out for
delivery. Expected arrival: [time window]. We'll send
another update when the driver is nearby.
- RHF Team
```

### Driver Nearby
```
SMS:
[Name], your Red Hill Fresh driver is about 30
minutes away! Please ensure someone is available
to receive your order.
- RHF Team
```

### Delivered
```
SMS:
✓ Delivered! Your fresh order has been left at your
door. Enjoy! Questions or feedback? Reply here or
email hello@redhillfresh.com.au
- RHF Team
```

## ETA Calculation

### Initial Estimate
```
For each stop:
ETA = Previous ETA + Drive Time + Stop Time

Where:
- Drive Time = Distance / Speed factor
- Stop Time = 5 minutes default
- Speed factor adjusts for traffic/roads
```

### Real-Time Updates
| Trigger | Action |
|---------|--------|
| Running early (>15 min) | Update customer ETA |
| Running late (>15 min) | Alert + update ETA |
| Significant delay (>30 min) | Call customer |
| Unable to deliver | Immediate notification |

## Delay Management

### Delay Notification
```
SMS (Running Late):
Hi [Name], we're running a bit behind today. Your
updated delivery window is [new time]. Sorry for
the delay - fresh produce on its way!
- RHF Team
```

### Delay Reasons & Responses
| Reason | Customer Message |
|--------|------------------|
| Heavy traffic | "Running a bit behind due to traffic" |
| Weather | "Weather slowing us down slightly" |
| High volume | "Busy day - delivery slightly delayed" |
| Earlier delays | "Running behind from earlier stops" |

### Significant Delay (>45 min)
```
1. Send SMS notification
2. If >1 hour delay, call customer
3. Offer rescheduling option
4. Document incident
5. Consider compensation
```

## Special Situations

### Failed Delivery Attempt
```
SMS:
Hi [Name], we tried to deliver your order but no one
was available. Please reply to arrange redelivery or
call us on [phone]. Your fresh items are safe with us!
- RHF Team
```

### Substitution Notification
```
SMS:
Hi [Name], heads up: we've substituted [original] with
[substitute] in today's order (original unavailable).
Same or better quality. Questions? Just reply.
- RHF Team
```

### Weather Delay
```
SMS:
Hi [Name], due to [weather condition], deliveries are
running delayed today. Your new window is [time].
Safety first! Thanks for understanding.
- RHF Team
```

## System Integration

### Tracking Data Sources
| Data | Source |
|------|--------|
| Route plan | Route Optimizer |
| Driver location | GPS/Driver app |
| Stop completion | Driver app |
| Traffic | Google Maps API |

### Automation Rules
| Trigger | Action |
|---------|--------|
| Route starts | Send "out for delivery" |
| 2 stops away | Send "driver nearby" |
| Stop completed | Send "delivered" |
| 15+ min delay | Update ETAs |

## Customer Preferences

### Notification Settings
| Preference | Options |
|------------|---------|
| SMS notifications | On/Off |
| Email notifications | On/Off |
| Day-before reminder | On/Off |
| Driver nearby alert | On/Off |

### Special Instructions
- Note customer timing preferences
- Handle "leave at door" vs "knock"
- Manage access requirements
- Record safe place instructions

## Quality Standards

### Timing Accuracy
| Metric | Target |
|--------|--------|
| ETA accuracy | ±15 minutes |
| On-time notification | 100% |
| Update response time | <5 min |

### Customer Satisfaction
| Metric | Target |
|--------|--------|
| Communication rating | 4.5+ |
| Timing complaints | <2% |
| Missing notification | 0% |

## Reporting

### Daily Summary
```
ETA COMMUNICATION - [Date]

Notifications Sent:
- Day-before: X
- Out for delivery: X
- Driver nearby: X
- Delivered: X
- Delay notices: X

Timing Accuracy:
- Within window: X%
- Updates sent: X
- Complaints: X

Issues:
- [Any issues]
```

## Escalation

Alert Delivery Lead if:
- Multiple delay notifications needed
- Customer complaint about timing
- System notification failure
- Widespread delays
