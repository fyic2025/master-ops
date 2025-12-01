# Stock Alert Predictor - Quick Reference

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `stock-monitor.ts` | Check stock levels across all products | `npx tsx scripts/stock-monitor.ts` |
| `fix-zero-stock.ts` | Disable zero-stock visible products in BC | `npx tsx scripts/fix-zero-stock.ts` |
| `predict-stockouts.ts` | Predict when products will stock out | `npx tsx scripts/predict-stockouts.ts` |
| `sync-health-check.ts` | Check supplier sync job health | `npx tsx scripts/sync-health-check.ts` |

---

## Quick Commands

```bash
# Full stock monitoring report
npx tsx .claude/skills/stock-alert-predictor/scripts/stock-monitor.ts

# Critical items only
npx tsx .claude/skills/stock-alert-predictor/scripts/stock-monitor.ts --critical

# Fix zero-stock visible (dry run first)
npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts --dry-run
npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts

# Predict stock-outs (14-day horizon)
npx tsx .claude/skills/stock-alert-predictor/scripts/predict-stockouts.ts --days 14

# Check sync health
npx tsx .claude/skills/stock-alert-predictor/scripts/sync-health-check.ts

# Check specific supplier
npx tsx .claude/skills/stock-alert-predictor/scripts/sync-health-check.ts --supplier oborne
```

---

## Existing BOO Scripts

```bash
# Run full supplier sync
node buy-organics-online/sync-all-suppliers.js

# Run specific loader
node buy-organics-online/load-oborne-products.js
node buy-organics-online/load-uhp-products.js
node buy-organics-online/load-kadac-products.js
node buy-organics-online/load-unleashed-products.js

# Update BC availability
node buy-organics-online/update-bc-availability.js

# Diagnose checkout issues
node buy-organics-online/diagnose-checkout-issues.js
```

---

## Database Tables

### Core Tables
- `ecommerce_products` - 11,357 BC products
- `supplier_products` - Consolidated supplier data
- `product_supplier_links` - BC to supplier mapping
- `sync_logs` - Sync audit trail
- `stock_history` - Stock changes (90-day retention)

### Alert Tables (New)
- `stock_alert_thresholds` - Per-product thresholds
- `stock_alerts` - Alert history
- `sales_velocity` - Sales rate tracking
- `zero_stock_visibility_log` - Fix audit trail

---

## Key Views

```sql
-- Low stock products
SELECT * FROM v_low_stock_products;

-- Zero stock but visible (CRITICAL)
SELECT * FROM v_zero_stock_visible;

-- Sync health summary
SELECT * FROM v_sync_health;

-- Stock-out predictions
SELECT * FROM v_stockout_predictions;
```

---

## Environment Variables

```bash
# BOO Supabase (separate instance)
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=

# BigCommerce
BC_STORE_HASH=hhhi
BC_ACCESS_TOKEN=
```

---

## Alert Thresholds

| Alert Type | Threshold | Severity |
|------------|-----------|----------|
| Low Stock | ≤10 units | warning |
| Critical Stock | ≤3 units | critical |
| Zero Stock | 0 units | critical |
| Zero Stock Visible | 0 + available | critical |
| Stockout ≤3 days | prediction | critical |
| Stockout ≤7 days | prediction | warning |
| Sync Overdue | >14 hours | critical |

---

## Supplier Summary

| Supplier | Products | Stock Data | Notes |
|----------|----------|------------|-------|
| Oborne | ~8,570 | Exact | FTP, pipe-delimited CSV |
| UHP | ~4,501 | Binary | XLSX, TRUE/FALSE only |
| Kadac | ~950 | Categorical | CSV API with UID |
| Unleashed | ~430 | Exact | REST API |

---

## Common Issues & Fixes

### Zero-Stock Products Still Visible
```bash
# Run fix script
npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts
```

### Sync Not Running
```bash
# Check if cron is scheduled
node buy-organics-online/stock-sync-cron.js

# Run manual sync
node buy-organics-online/sync-all-suppliers.js
```

### High Bounce Rate on Checkout
1. Run stock monitor to identify zero-stock visible
2. Run fix-zero-stock.ts to disable affected products
3. Verify with diagnose-checkout-issues.js

---

## Playbooks

- [Troubleshooting](playbooks/TROUBLESHOOTING.md) - Common issues and fixes

## Context Docs

- [Supplier Infrastructure](context/SUPPLIER-INFRASTRUCTURE.md) - Full supplier details
