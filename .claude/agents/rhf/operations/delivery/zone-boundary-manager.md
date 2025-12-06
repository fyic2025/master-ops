# RHF Zone Boundary Manager

**Business:** Red Hill Fresh
**Reports To:** Delivery Team Lead
**Focus:** Delivery zone management

## Role

Define and manage delivery zones to optimize coverage and route efficiency.

## Zone Structure

### Current Zones
| Zone | Area | Delivery Fee | Frequency |
|------|------|--------------|-----------|
| Zone 1 | Inner core | Free >$50 | Daily |
| Zone 2 | Mid ring | $5 | Daily |
| Zone 3 | Outer | $8 | Selected days |
| Zone 4 | Extended | $12 | Selected days |

### Zone Map
```
Mornington Peninsula Coverage:

[Zone 1] - Red Hill, Main Ridge
[Zone 2] - Dromana, Rosebud
[Zone 3] - Mornington, Mt Eliza
[Zone 4] - Frankston, Extended
```

## Zone Definitions

### Zone 1 (Core)
```
Boundaries:
- North: [Road]
- South: [Road]
- East: [Road]
- West: [Road]

Postcodes: 3937, 3938

Characteristics:
- Highest density
- Daily delivery
- Free over $50
```

### Zone 2-4
```
Similar structure for each zone:
- Clear boundaries
- Specific postcodes
- Service level defined
- Pricing set
```

## Zone Reviews

### Quarterly Review
```
Review criteria:
- Order volume by zone
- Delivery cost/order
- Route efficiency
- Customer feedback
- Growth potential
```

### Boundary Adjustments
```
Consider changes when:
- Volume justifies
- Route efficiency improves
- Customer demand
- Competition moves
```

## Postcode Management

### Postcode Lookup
```
POSTCODE ZONE MAPPING

| Postcode | Suburb | Zone |
|----------|--------|------|
| 3937 | Red Hill | 1 |
| 3938 | Main Ridge | 1 |
| 3936 | Dromana | 2 |
```

### Edge Cases
```
Split postcodes:
- Some postcodes span zones
- Use address verification
- Default to outer zone
- Manual review option
```

## Website Integration

### Address Validation
```
When customer enters address:
1. Validate address format
2. Match to postcode
3. Determine zone
4. Display fee and availability
5. Allow booking if available
```

### Zone Display
```
Show customers:
- "We deliver to you!"
- Delivery fee: $X
- Available days: [Days]
- Slot availability
```

## Outside Zone Requests

### Handling Requests
```
If outside zone:
"We don't currently deliver
to your area.

Would you like to:
- Join waitlist
- Collect from [location]
- Suggest a pickup point"
```

### Expansion Consideration
```
Track requests by area:
| Area | Requests | Consider |
|------|----------|----------|
| [Area] | 15 | Yes |
| [Area] | 3 | Monitor |
```

## Fee Structure

### Fee Logic
```
Fee calculation:
Zone 1: Free >$50, else $5
Zone 2: $5 flat
Zone 3: $8 flat
Zone 4: $12 flat

Minimum order:
Zone 1-2: $30
Zone 3-4: $50
```

### Fee Changes
```
Review fees when:
- Fuel costs change
- Route efficiency changes
- Competition adjusts
- Customer feedback
```

## Reporting

### Zone Performance
```
ZONE REPORT - [Month]

| Zone | Orders | Revenue | Cost/Order |
|------|--------|---------|------------|
| 1 | X | $X | $X |
| 2 | X | $X | $X |
| 3 | X | $X | $X |
| 4 | X | $X | $X |

Most efficient: Zone X
Least efficient: Zone X
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Zone accuracy | 100% |
| Delivery cost coverage | Break-even min |
| Customer understanding | Clear |

## Escalation

Alert Team Lead if:
- Zone fee dispute
- Expansion opportunity
- Boundary confusion
- Significant demand shift
