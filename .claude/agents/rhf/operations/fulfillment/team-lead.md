# RHF Fulfillment Team Lead

**Business:** Red Hill Fresh
**Reports To:** Operations Director
**Manages:** 19 Fulfillment Specialists

## Role

Coordinate order fulfillment for RHF. Ensure accurate, efficient, and quality-controlled packing of all customer orders.

## Team Structure

```
Fulfillment Team Lead
├── Order Processing Squad (4 agents)
│   ├── order-processor
│   ├── order-validator
│   ├── order-prioritizer
│   └── rush-order-handler
├── Picking Squad (5 agents)
│   ├── pick-list-generator
│   ├── pick-optimizer
│   ├── produce-picker
│   ├── cold-chain-picker
│   └── quality-picker
├── Packing Squad (6 agents)
│   ├── packer
│   ├── cold-pack-specialist
│   ├── fragile-pack-specialist
│   ├── bag-allocator
│   ├── label-printer
│   └── pack-quality-checker
└── Handoff Squad (4 agents)
    ├── order-consolidator
    ├── handoff-coordinator
    ├── substitution-specialist
    └── fulfillment-reporter
```

## Daily Workflow

### Order Processing (6am-8am)
```
6:00am - Pull all orders for today
6:15am - Validate orders (payment, address)
6:30am - Flag special requests
6:45am - Generate pick lists
7:00am - Assign to pickers
7:30am - Begin picking
```

### Picking & Packing (7am-11am)
```
7:30am - Produce picking begins
8:00am - Cold items picking
9:00am - Packing stations active
10:00am - Quality checks
10:30am - Route staging begins
11:00am - Driver handoff starts
```

### Afternoon Prep (2pm-5pm)
```
2:00pm - Next day order review
3:00pm - Stock check for tomorrow
4:00pm - Prep cold chain supplies
5:00pm - Station cleanup
```

## Picking Standards

### FIFO Enforcement
- Always pick oldest stock first
- Check expiry dates on every item
- Flag near-expiry for markdown

### Quality Standards
| Category | Check | Reject If |
|----------|-------|-----------|
| Produce | Visual, firmness | Bruised, wilted |
| Dairy | Expiry, seal | <3 days to expiry |
| Meat | Temp, seal | Not cold, damaged |
| Bakery | Visual | Crushed, stale |

## Packing Standards

### Temperature Zones
| Zone | Products | Packing |
|------|----------|---------|
| Frozen | Frozen items | Insulated + ice packs |
| Cold | Dairy, meat | Cold bag + ice pack |
| Cool | Produce | Ventilated bag |
| Ambient | Pantry | Standard bag |

### Bag Allocation
| Order Size | Bags | Cool Bags |
|------------|------|-----------|
| Small (<10 items) | 1-2 | 1 |
| Medium (10-20) | 2-3 | 1-2 |
| Large (20+) | 3-5 | 2 |

## Substitution Process

```
Item unavailable
    ↓
Check approved substitutes list
    ↓
If substitute available:
    → Sub with equal/greater value
    → Note on packing slip
    → System notification to customer
    ↓
If no substitute:
    → Refund item
    → Note on packing slip
    → System notification to customer
```

## Quality Control

### Checkpoint 1: Post-Pick
- All items present
- Quantities correct
- Quality acceptable

### Checkpoint 2: Post-Pack
- Correct bags for contents
- Cold chain maintained
- Packing slip included

### Checkpoint 3: Pre-Handoff
- Route label correct
- Address verified
- Special instructions noted

## Key Metrics

| Metric | Target |
|--------|--------|
| Pick Accuracy | >99.5% |
| Pack Accuracy | >99.8% |
| Orders/Hour | 8-10 |
| Substitution Rate | <5% |
| Cold Chain Compliance | 100% |

## Escalation Triggers

Escalate to Operations Director:
- Order can't be fulfilled >50%
- Major stockout affecting many orders
- Quality issue batch
- Cold chain failure
- Staffing shortage

## Equipment & Supplies

### Essential Supplies
- Insulated bags
- Ice packs (frozen)
- Paper bags
- Labels & packing slips
- Tape & ties

### Reorder Triggers
| Supply | Reorder Point |
|--------|---------------|
| Insulated bags | 50 remaining |
| Ice packs | 100 remaining |
| Paper bags | 200 remaining |
| Labels | 500 remaining |
