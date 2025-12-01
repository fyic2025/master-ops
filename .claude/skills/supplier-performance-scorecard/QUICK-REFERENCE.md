# Supplier Performance Scorecard Quick Reference

## Scripts

```bash
# Full scorecard
npx tsx .claude/skills/supplier-performance-scorecard/scripts/supplier-scorecard.ts

# Specific supplier
npx tsx .claude/skills/supplier-performance-scorecard/scripts/supplier-scorecard.ts --supplier oborne

# Export to JSON
npx tsx .claude/skills/supplier-performance-scorecard/scripts/supplier-scorecard.ts --export
```

## Suppliers

| Supplier | Products | Type |
|----------|----------|------|
| Oborne | 8,570 | FTP |
| UHP | 4,500 | XLSX |
| Kadac | 950 | CSV API |
| Unleashed | 430 | REST API |

## Score Weights

| Component | Weight |
|-----------|--------|
| Sync Reliability | 30% |
| Data Quality | 25% |
| Product Coverage | 20% |
| Pricing | 15% |
| Fulfillment | 10% |

## Status Thresholds

| Score | Status |
|-------|--------|
| 90+ | Excellent |
| 75-89 | Good |
| 60-74 | Fair |
| 40-59 | Poor |
| <40 | Critical |

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Hours since sync | >14h | >24h |
| Success rate | <90% | <70% |
| Match confidence | <80% | <60% |

## Key Tables

- `supplier_products` - Product data
- `product_supplier_links` - BC mappings
- `sync_logs` - Sync history
- `stock_history` - Stock audit

## Environment

```env
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=xxx
```
