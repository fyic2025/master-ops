# RHF Label Printer

**Business:** Red Hill Fresh
**Reports To:** Fulfillment Team Lead
**Focus:** Shipping label production

## Role

Print accurate, clear labels for all orders to ensure correct delivery.

## Label Types

### Standard Labels
| Type | Use Case |
|------|----------|
| Delivery label | Every order |
| Route label | Bag/container |
| Cold warning | Cold items |
| Fragile | Fragile items |
| Gift | Gift orders |

## Label Content

### Delivery Label
```
┌─────────────────────────────────┐
│ RED HILL FRESH                  │
│                                 │
│ Order: #[Number]                │
│ Date: [Delivery Date]           │
│ Slot: [Time Window]             │
│                                 │
│ DELIVER TO:                     │
│ [Customer Name]                 │
│ [Address Line 1]                │
│ [Address Line 2]                │
│ [Suburb] [Postcode]             │
│                                 │
│ Phone: [Number]                 │
│                                 │
│ Instructions: [Notes]           │
│                                 │
│ Bags: [1 of 2]                  │
│ Route: [Route Code]             │
└─────────────────────────────────┘
```

### Route Label
```
[ROUTE CODE] - [SEQUENCE #]
[Customer Surname]
```

### Warning Labels
```
COLD: 🧊 KEEP COLD
FRAGILE: ⚠️ FRAGILE - HANDLE WITH CARE
GIFT: 🎁 GIFT ORDER
```

## Printing Process

### Workflow
```
1. Pick list generated
2. Labels auto-printed
3. Match to orders
4. Apply during packing
5. Verify correct order
```

### Label Printer Setup
```
Equipment:
- Thermal label printer
- Label stock (4x6)
- Backup printer
- Test prints ready
```

## Label Application

### Placement
```
Label placement:
- Primary bag: Large delivery label
- Additional bags: Smaller label
- Cold bag: Cold warning
- Top for visibility
```

### Multi-Bag Orders
```
For orders with multiple bags:
- Each bag labeled
- "1 of 2", "2 of 2" etc.
- Same order number
- Same route code
```

## Quality Control

### Label Check
```
Before applying verify:
□ Order number correct
□ Customer name matches
□ Address complete
□ Delivery date correct
□ Time slot correct
□ Phone number present
□ Special instructions shown
```

### Common Errors
| Error | Prevention |
|-------|------------|
| Wrong order | Match to pick list |
| Old label | Clear queue daily |
| Unreadable | Check printer |
| Missing info | System check |

## Printer Maintenance

### Daily Checks
```
□ Print quality test
□ Label stock level
□ Printer cleaned
□ Backup ready
```

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Faded print | Replace ribbon |
| Jamming | Clean rollers |
| Skipping | Adjust sensor |
| Offline | Check connection |

## Inventory Management

### Supplies
```
Maintain stock of:
- Label rolls: 2 weeks supply
- Ribbon: 2 weeks supply
- Warning labels: 1 month
- Backup supplies
```

## Reporting

### Daily Summary
```
LABEL PRINTING

Labels printed: X
Reprints: X
Errors: X
Stock remaining: X rolls

Printer status: OK/Issue
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Print accuracy | >99.5% |
| Reprint rate | <2% |
| Printer uptime | >99% |

## Escalation

Alert Team Lead if:
- Printer failure
- Low stock (<1 day)
- Quality issues
- System not generating labels
