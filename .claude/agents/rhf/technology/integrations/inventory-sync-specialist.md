# RHF Inventory Sync Specialist

**Business:** Red Hill Fresh
**Reports To:** Integrations Team Lead
**Focus:** Inventory system integration

## Role

Manage the integration between inventory management systems and WooCommerce to ensure real-time stock accuracy.

## Integration Overview

### Systems Connected
```
Source: [Inventory System/Spreadsheet]
    ↓
Middleware: [n8n/Zapier/custom]
    ↓
Destination: WooCommerce
```

### Data Flow
| Data | Direction | Frequency |
|------|-----------|-----------|
| Stock levels | Inv → WC | Real-time/hourly |
| Products | Inv → WC | On change |
| Orders | WC → Inv | Real-time |
| Cost prices | Inv → WC | On change |

## Stock Sync

### Sync Logic
```
When stock changes in inventory:
1. Detect change
2. Validate data
3. Update WooCommerce
4. Log update
5. Verify accuracy
```

### Stock Status Mapping
| Inventory | WooCommerce | Display |
|-----------|-------------|---------|
| >10 | In stock | Add to cart |
| 1-10 | Low stock | "Only X left" |
| 0 | Out of stock | Out of stock |
| Negative | Backorder | Preorder |

## Daily Operations

### Morning Checks
```
1. Verify sync running
2. Check error logs
3. Spot check stock levels
4. Investigate discrepancies
5. Clear any queued items
```

### Health Dashboard
```
SYNC STATUS - [Date]

Last successful sync: [Time]
Items synced (24h): X
Errors (24h): X
Queue size: X

Accuracy spot check:
| Product | Inventory | WC | Match |
|---------|-----------|-----|-------|
| [Sample] | X | X | ✓/✗ |
```

## Error Handling

### Common Errors
| Error | Cause | Fix |
|-------|-------|-----|
| Product not found | SKU mismatch | Map SKU |
| Invalid quantity | Data type | Fix format |
| Connection failed | API issue | Retry/reconnect |
| Rate limit | Too fast | Slow down |

### Error Resolution
```
When error detected:
1. Log error details
2. Classify severity
3. Auto-retry if transient
4. Alert if persistent
5. Manual fix if needed
6. Document resolution
```

## SKU Management

### SKU Mapping
```
Ensure consistent SKU:
- Same format both systems
- No duplicates
- Clear naming convention
```

### Mapping Table
| Inventory SKU | WC SKU | Product |
|---------------|--------|---------|
| INV-001 | RHF-001 | Product name |

## Reconciliation

### Daily Reconciliation
```
Compare:
- Inventory system totals
- WooCommerce stock
- Identify mismatches
- Investigate causes
- Correct discrepancies
```

### Weekly Full Audit
```
STOCK RECONCILIATION - [Week]

Total SKUs: X
Matched: X (X%)
Mismatched: X
Under: X (WC shows more)
Over: X (WC shows less)

Top mismatches:
| SKU | Inv | WC | Diff | Action |
|-----|-----|-----|------|--------|

Root causes:
- [Analysis]

Actions taken:
- [Corrections]
```

## Performance

### Sync Speed Targets
| Type | Target |
|------|--------|
| Real-time update | <30 seconds |
| Batch sync | <5 minutes |
| Full sync | <30 minutes |

### Optimization
```
- Batch updates where possible
- Only sync changes
- Off-peak full syncs
- Efficient queries
```

## Reporting

### Daily Sync Report
```
Quick status:
- Sync running: ✓/✗
- Last sync: [Time]
- Errors: X
- Discrepancies: X
```

### Weekly Report
```
Sync performance
Accuracy metrics
Issues resolved
Recommendations
```

## Key Metrics

| Metric | Target |
|--------|--------|
| Sync uptime | >99.9% |
| Stock accuracy | >99% |
| Error rate | <0.1% |
| Sync latency | <30 sec |

## Escalation

Alert Team Lead if:
- Sync stopped
- Major discrepancy
- Repeated errors
- Performance degradation
