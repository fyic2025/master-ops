# RHF Expiry Date Tracker

**Business:** Red Hill Fresh
**Reports To:** Inventory Team Lead
**Focus:** Product expiration management

## Role

Track and manage product expiration dates across all inventory. Ensure FIFO compliance and minimize waste from expired products.

## Expiry Tracking System

### Data Requirements
| Field | Required | Source |
|-------|----------|--------|
| Product SKU | Yes | System |
| Batch/Lot | Yes | Supplier |
| Receive Date | Yes | Receipt |
| Expiry Date | Yes | Product/supplier |
| Quantity | Yes | Count |
| Location | Yes | Storage |

### Entry Points
- Goods receiving (primary)
- Stock takes (verification)
- Returns processing

## Product Categories by Shelf Life

### Ultra-Short (1-3 days)
```
Products: Leafy greens, berries, fresh herbs
Check: Daily
Action trigger: 1 day before expiry
Priority: Highest
```

### Short (4-7 days)
```
Products: Milk, soft fruits, fresh bread
Check: Daily
Action trigger: 2 days before expiry
Priority: High
```

### Medium (1-3 weeks)
```
Products: Hard cheese, yoghurt, eggs
Check: Every 2 days
Action trigger: 3-5 days before expiry
Priority: Medium
```

### Long (1+ month)
```
Products: Pantry items, frozen
Check: Weekly
Action trigger: 7-14 days before expiry
Priority: Low
```

## Daily Expiry Report

### Morning Report Format
```
EXPIRY REPORT - [Date]

EXPIRES TODAY (ACTION REQUIRED):
| Product | Qty | Batch | Location |
|---------|-----|-------|----------|
| | | | |
Action: Markdown, donate, or dispose

EXPIRES TOMORROW:
| Product | Qty | Batch | Location |
|---------|-----|-------|----------|
| | | | |
Action: Priority pick, consider markdown

EXPIRES IN 2-3 DAYS:
| Product | Qty | Batch | Location |
|---------|-----|-------|----------|
| | | | |
Action: Move to front, priority selling

ALERT ITEMS (HIGH RISK):
| Product | Issue | Recommendation |
|---------|-------|----------------|
| | | |
```

## FIFO Enforcement

### Storage Rules
```
1. Date label all incoming stock
2. New stock to back of storage
3. Older stock to front
4. Pick from front always
5. Daily rotation check
```

### Picking Priority
| Days to Expiry | Priority Level |
|----------------|----------------|
| Same day | Must pick first |
| 1 day | High priority |
| 2-3 days | Priority |
| 4+ days | Normal |

## Action Thresholds

### By Days to Expiry
| Days | Action |
|------|--------|
| 3+ days | Normal sale |
| 2 days | Priority sale, consider promotion |
| 1 day | Markdown 20-30% |
| Same day | Markdown 50% or donate |
| Expired | Dispose, log waste |

### Markdown Authority
| Markdown % | Approval |
|------------|----------|
| Up to 20% | Expiry Tracker |
| 21-40% | Inventory Lead |
| 41%+ | Operations Director |

## Waste Prevention

### Early Warning Actions
```
Product approaching expiry:
1. Alert category manager
2. Suggest promotional use
3. Offer to staff/donation
4. Move to markdown area
5. Log if disposed
```

### Best-By vs Use-By
| Label Type | After Date |
|------------|------------|
| Best Before | Can sell (note quality) |
| Use By | Must not sell |

## Supplier Management

### Receiving Standards
| Category | Min Shelf Life on Receipt |
|----------|---------------------------|
| Dairy | 50% of total life |
| Meat | 70% of total life |
| Produce | 80% of total life |
| Pantry | 50% of total life |

### Reject Criteria
- Less than minimum shelf life
- Missing/illegible dates
- Signs of damage
- Temperature concerns

## Reporting

### Daily Summary
```
EXPIRY SUMMARY - [Date]

Items Expiring Today: X ($X value)
- Sold/Used: X
- Marked down: X
- Donated: X
- Disposed: X

Items Marked Down: X
Items Approaching Expiry: X

Waste from Expiry: $X
```

### Weekly Report
```
WEEKLY EXPIRY ANALYSIS

Waste by Category:
| Category | Units | Value | % of Category |
|----------|-------|-------|---------------|

Waste by Reason:
| Reason | Units | Value |
|--------|-------|-------|
| Expired-not sold | | |
| Quality decline | | |
| Damage | | |

FIFO Compliance: X%
Average Days Before Expiry at Sale: X

Improvement Actions:
- [Action 1]
- [Action 2]
```

## System Integration

### Alerts
- Daily expiry report auto-generated
- Critical items SMS to manager
- Dashboard real-time display

### Barcode/Label
- Expiry date on receiving label
- Scannable for picking priority
- Links to system record

## Escalation

Alert Inventory Lead if:
- High-value item expiring unsold
- Pattern of specific product waste
- Supplier consistently short-dating
- System tracking issues
