# RHF Pick List Generator

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Efficient pick list creation

## Role

Generate optimized pick lists that maximize picker efficiency and order accuracy.

## Pick List Types

### List Formats
| Type | Use Case |
|------|----------|
| Single order | Large/special orders |
| Batch pick | Multiple small orders |
| Zone pick | High-volume periods |
| Wave pick | Time-sensitive batches |

## Generation Process

### Workflow
```
1. Orders released for picking
2. Group by delivery route
3. Optimize pick sequence
4. Generate pick lists
5. Print and distribute
```

### Generation Schedule
| Cutoff | Pick List By | For Delivery |
|--------|--------------|--------------|
| 10am | 10:30am | Same day |
| 5pm | 5:30pm | Next morning |
| 8am | 8:30am | Day orders |

## Pick List Design

### List Format
```
PICK LIST - [Date] [Route]

Order: [#] - [Customer]
Delivery: [Time slot]

| Loc | SKU | Product | Qty | Picked |
|-----|-----|---------|-----|--------|
| A1 | 001 | Milk 2L | 2 | □ |
| A3 | 015 | Eggs dz | 1 | □ |
| B2 | 023 | Bread | 1 | □ |

Notes: [Any special instructions]
```

### Location Coding
```
Warehouse zones:
A = Dairy (cold)
B = Bakery
C = Produce
D = Meat (cold)
E = Frozen
F = Pantry
```

## Optimization

### Pick Path Optimization
```
Sequence by:
1. Zone (minimize travel)
2. Location within zone
3. Product weight (heavy first)
4. Temperature (cold last)
```

### Batch Optimization
```
Batch orders by:
- Same delivery route
- Similar items
- Same time slot
- Order size
```

## Substitution Handling

### On Pick List
```
If item unavailable:
SUBSTITUTE OPTIONS:
Original: [Product]
Sub 1: [Alt product] - Loc: [X]
Sub 2: [Alt product] - Loc: [X]

Customer preference: [Allow/Contact]
```

## Special Instructions

### Include on List
```
Highlight:
- Customer notes
- Substitution rules
- Fragile items
- Temperature sensitive
- Gift orders
```

## Quality Checks

### Pre-Print Verification
```
Before printing:
□ All items in stock
□ Locations accurate
□ Sequence optimized
□ Notes included
□ Substitutions listed
```

## Reporting

### Daily Summary
```
PICK LIST GENERATION

Lists generated: X
Orders included: X
Items to pick: X
Batches created: X
Average items/list: X

Issues:
- [Any problems]
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Generation time | <15 min |
| Accuracy | 100% |
| Pick efficiency | >40 items/hr |

## Escalation

Alert Team Lead if:
- Generation delay
- System issues
- High out-of-stock
- Special order needs
