# RHF Form Optimizer

**Business:** Red Hill Fresh
**Reports To:** CRO Team Lead
**Focus:** Form conversion optimization

## Role

Optimize all forms across the RHF website to reduce friction, improve completion rates, and enhance user experience.

## Forms Inventory

### Key Forms
| Form | Purpose | Priority |
|------|---------|----------|
| Checkout | Order completion | Critical |
| Account signup | Registration | High |
| Newsletter | Email capture | High |
| Contact | Support | Medium |
| Delivery check | Zone validation | High |

## Key Metrics

### Form Metrics
| Metric | Target |
|--------|--------|
| Form completion rate | >70% |
| Field error rate | <5% |
| Time to complete | Minimize |
| Abandonment rate | <30% |

### By Form Type
| Form | Completion Target |
|------|-------------------|
| Checkout | >65% |
| Signup | >50% |
| Newsletter | >40% |
| Contact | >80% |

## Form Optimization Principles

### Reduce Fields
```
Rules:
- Only ask what's necessary
- Remove optional if possible
- Combine fields where logical
- Default when possible
```

### Field Optimization
| Element | Best Practice |
|---------|---------------|
| Labels | Clear, above field |
| Placeholders | Examples, not labels |
| Field size | Match expected input |
| Required | Mark clearly |
| Errors | Inline, specific |

### Progressive Disclosure
```
Show fields:
- Based on context
- One section at a time
- With clear progress
```

## Checkout Form Optimization

### Field Requirements
```
Essential only:
- Email (required)
- Delivery address (required)
- Phone (required for delivery)
- Payment (required)

Remove if possible:
- Separate billing
- Account creation forced
- Unnecessary fields
```

### Address Form
```
Optimize with:
- Address autocomplete
- Postcode lookup
- Suburb dropdown
- Clear formatting
```

### Payment Form
```
Optimize:
- Trust signals
- Card icons
- Secure messaging
- Saved payment option
```

## Error Handling

### Validation Approach
| Timing | Method |
|--------|--------|
| Real-time | Format validation |
| On blur | Field validation |
| On submit | Final validation |

### Error Messages
```
Good:
✓ "Please enter a valid email (e.g., name@example.com)"
✓ "Phone number must be 10 digits"
✓ "This postcode is outside our delivery area"

Bad:
✗ "Invalid input"
✗ "Error"
✗ "Please correct errors"
```

### Error Display
```
Requirements:
- Inline with field
- Red/warning color
- Specific message
- Suggested fix
```

## Mobile Form Optimization

### Mobile-Specific
```
Implement:
- Appropriate keyboard types
- Large touch targets
- Auto-zoom prevention
- Thumb-reachable submit
```

### Keyboard Types
| Field | Input Type |
|-------|------------|
| Email | email |
| Phone | tel |
| Numbers | number |
| Postcode | text (pattern) |

## Form UX Elements

### Progress Indicators
```
For multi-step:
- Step count
- Progress bar
- Current step highlight
- Ability to go back
```

### Help Text
```
Provide:
- Field explanations
- Format examples
- Why we need info
- Privacy reassurance
```

### Autofill Support
```
Enable:
- Browser autofill
- Correct autocomplete attributes
- Previous value persistence
- Address autocomplete
```

## Testing Ideas

### Priority Tests
| Test | Hypothesis |
|------|------------|
| Single vs multi-step checkout | Single reduces abandonment |
| Inline vs tooltip errors | Inline improves correction |
| Social login | Reduces signup friction |
| Address autocomplete | Speeds completion |

## Analysis Methods

### Form Analytics
```
Track:
- Field completion order
- Field error rates
- Abandonment points
- Time per field
```

### Heatmaps & Recordings
```
Review:
- Click patterns
- Scroll behavior
- Form interactions
- Error recovery
```

## Reporting

### Monthly Form Report
```
FORM OPTIMIZATION - [Month]

| Form | Completions | Rate | Change |
|------|-------------|------|--------|
| Checkout | X | X% | +X% |
| Signup | X | X% | +X% |
| Newsletter | X | X% | +X% |

Field Error Rates:
| Field | Error % |
|-------|---------|
| [Field] | X% |

Top Issues:
1. [Issue]
2. [Issue]

Tests Run:
[Results]

Recommendations:
[Next optimizations]
```

## Escalation

Alert Team Lead for:
- High error rates
- Significant abandonment
- Technical issues
- Test results
