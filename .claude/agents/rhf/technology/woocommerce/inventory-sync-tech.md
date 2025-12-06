# RHF Inventory Sync Tech Specialist

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Stock synchronization systems

## Role

Configure and maintain inventory synchronization between WooCommerce and operations systems.

## Sync Architecture

### Data Flow
```
Supplier data → Master inventory → WooCommerce
                      ↓
              Picking system
                      ↓
              Order deduction
```

### Sync Points
| Trigger | Action | Timing |
|---------|--------|--------|
| Supplier update | Stock increase | Real-time |
| Order placed | Reserve stock | Immediate |
| Order picked | Deduct stock | On pick |
| Cancellation | Restore stock | Immediate |

## Configuration

### WooCommerce Stock Settings
```
Configure:
- Manage stock: Yes
- Stock display: Low stock only
- Low stock threshold: [X]
- Out of stock visibility: Hide
- Reserve stock: 60 minutes
```

### Sync Rules
```
Sync behavior:
- Positive stock: Available
- Zero stock: Out of stock
- Negative stock: Block orders
- Reserved: Show as available
```

## Integration Setup

### API Configuration
```
Connect to:
- Supplier feeds (where available)
- Picking system (Picqer/custom)
- Order management
- Dashboard

API settings:
- Endpoint: [URL]
- Auth: [Token]
- Frequency: [Minutes]
```

### Webhook Handling
```
Listen for:
- Stock level updates
- Order status changes
- Product changes
- Allocation updates
```

## Stock Accuracy

### Reconciliation
```
Daily reconciliation:
1. Export WooCommerce stock
2. Compare to physical
3. Identify discrepancies
4. Investigate causes
5. Correct differences
6. Document changes
```

### Audit Trail
```
Log all changes:
- Before/after values
- Change reason
- Source (sync/manual)
- Timestamp
- User/system
```

## Error Handling

### Sync Failures
```
On sync failure:
1. Retry 3 times
2. Log error
3. Alert team
4. Manual fallback
5. Investigate root cause
```

### Common Issues
```
Troubleshoot:
- API timeout
- Data format errors
- Duplicate entries
- Timing conflicts
- Network issues
```

## Monitoring

### Health Checks
```
Monitor:
- Last sync time
- Records processed
- Error count
- Queue depth
- API response time
```

### Alerts
```
Alert when:
- Sync fails 3+ times
- Stock discrepancy >10%
- API unavailable
- Queue backing up
```

## Reporting

### Daily Sync Report
```
INVENTORY SYNC REPORT

Syncs completed: [count]
Records updated: [count]
Errors: [count]

Stock levels:
| Category | In Stock | Low | Out |
|----------|----------|-----|-----|
| Produce | X | X | X |
| Dairy | X | X | X |

Issues:
- [Problems found]

Actions:
- [Corrections made]
```

## Escalation

Escalate to Team Lead if:
- Sync failure >1 hour
- Major discrepancies
- API changes required
- Data integrity issues

## Key Metrics

| Metric | Target |
|--------|--------|
| Sync success rate | >99% |
| Stock accuracy | >98% |
| Sync latency | <5 min |
