# Supplier Performance Scorecard Skill

Tracks and scores supplier performance for BOO (Buy Organics Online) across 4 suppliers.

## Suppliers Tracked

| Supplier | Products | Connection | Stock Data |
|----------|----------|------------|------------|
| Oborne/CH2 | ~8,570 | FTP | Exact quantities |
| UHP | ~4,500 | HTTPS/XLSX | Binary (TRUE/FALSE) |
| Kadac | ~950 | CSV API | Categorical |
| Unleashed | ~430 | REST API | Exact quantities |

---

## Scorecard Metrics (0-100)

### 1. Sync Reliability (30%)
- Sync success rate (last 30 days)
- Hours since last successful sync
- Records failed ratio
- Sync frequency compliance (8am/8pm AEST)

### 2. Data Quality (25%)
- Match confidence average
- Missing required fields %
- Stock discrepancy variance
- Barcode accuracy rate

### 3. Product Coverage (20%)
- % products matched to BigCommerce
- Primary supplier allocation rate
- Active products count
- Discontinued product tracking

### 4. Pricing Consistency (15%)
- Price variance coefficient
- Margin compliance with rules
- RRP accuracy vs advertised
- Cost price stability

### 5. Fulfillment Support (10%)
- In-stock rate for linked products
- Zero-stock duration average
- Stock alert response time

---

## Database Tables (BOO Supabase)

### supplier_products
Universal supplier product data.

```sql
supplier_name TEXT      -- oborne, uhp, kadac, unleashed
supplier_sku TEXT
barcode TEXT
product_name TEXT
brand TEXT
cost_price DECIMAL
rrp DECIMAL
wholesale_price DECIMAL
stock_level INTEGER
availability TEXT
moq INTEGER            -- minimum order quantity
last_synced_at TIMESTAMPTZ
metadata JSONB
```

### product_supplier_links
Links BigCommerce products to suppliers.

```sql
ecommerce_product_id UUID
supplier_product_id UUID
supplier_name TEXT
match_type TEXT        -- sku_direct, barcode, manual
match_confidence DECIMAL(3,2)
is_active BOOLEAN
priority INTEGER       -- 1 = primary supplier
```

### sync_logs
Sync execution history.

```sql
sync_type TEXT         -- supplier_feed, inventory_sync
supplier_name TEXT
status TEXT            -- running, completed, failed, partial
records_processed INTEGER
records_created INTEGER
records_updated INTEGER
records_failed INTEGER
error_message TEXT
duration_seconds INTEGER
created_at TIMESTAMPTZ
```

### stock_history
90-day stock change audit.

```sql
bc_product_id UUID
supplier_name TEXT
old_stock INTEGER
new_stock INTEGER
stock_change INTEGER
change_reason TEXT
created_at TIMESTAMPTZ
```

---

## Scripts

### supplier-scorecard.ts
Calculate performance scores for all suppliers.

```bash
# Full scorecard
npx tsx .claude/skills/supplier-performance-scorecard/scripts/supplier-scorecard.ts

# Specific supplier
npx tsx .claude/skills/supplier-performance-scorecard/scripts/supplier-scorecard.ts --supplier oborne

# Export to CSV
npx tsx .claude/skills/supplier-performance-scorecard/scripts/supplier-scorecard.ts --export
```

### sync-health-monitor.ts
Monitor sync job health and alert on failures.

```bash
# Check all suppliers
npx tsx .claude/skills/supplier-performance-scorecard/scripts/sync-health-monitor.ts

# Alert mode (exit 1 on critical)
npx tsx .claude/skills/supplier-performance-scorecard/scripts/sync-health-monitor.ts --alert
```

### stock-accuracy-audit.ts
Audit stock level accuracy between supplier feeds and BigCommerce.

```bash
# Full audit
npx tsx .claude/skills/supplier-performance-scorecard/scripts/stock-accuracy-audit.ts

# Specific supplier
npx tsx .claude/skills/supplier-performance-scorecard/scripts/stock-accuracy-audit.ts --supplier kadac
```

---

## Score Calculation

```typescript
interface SupplierScore {
  supplier: string;
  overallScore: number;  // 0-100

  // Component scores
  syncReliability: number;
  dataQuality: number;
  productCoverage: number;
  pricingConsistency: number;
  fulfillmentSupport: number;

  // Raw metrics
  metrics: {
    syncSuccessRate: number;
    hoursSinceSync: number;
    failedRecordsRate: number;
    avgMatchConfidence: number;
    missingFieldsRate: number;
    stockDiscrepancy: number;
    matchedProductsRate: number;
    primarySupplierRate: number;
    activeProductCount: number;
    priceVariance: number;
    inStockRate: number;
  };

  // Status
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  alerts: string[];
  recommendations: string[];
}
```

### Scoring Formula

```typescript
function calculateOverallScore(s: SupplierScore): number {
  return (
    s.syncReliability * 0.30 +
    s.dataQuality * 0.25 +
    s.productCoverage * 0.20 +
    s.pricingConsistency * 0.15 +
    s.fulfillmentSupport * 0.10
  );
}

function getStatus(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}
```

---

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Sync success rate | <90% | <70% |
| Hours since sync | >14h | >24h |
| Failed records rate | >5% | >15% |
| Match confidence avg | <0.8 | <0.6 |
| Stock discrepancy | >20% | >40% |
| In-stock rate | <80% | <60% |

---

## Environment Variables

```env
# BOO Supabase
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# BigCommerce (for cross-reference)
BOO_BC_STORE_HASH=hhhi
BOO_BC_ACCESS_TOKEN=xxx
```

---

## SQL Queries

### Sync Performance by Supplier
```sql
SELECT
  supplier_name,
  COUNT(*) AS total_syncs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successful,
  ROUND(AVG(duration_seconds), 1) AS avg_duration,
  SUM(records_failed) AS total_failed
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY supplier_name
ORDER BY supplier_name;
```

### Stock Accuracy
```sql
SELECT
  psl.supplier_name,
  COUNT(*) AS linked_products,
  AVG(ABS(sp.stock_level - bc.inventory_level)) AS avg_discrepancy,
  SUM(CASE WHEN sp.stock_level = 0 AND bc.inventory_level > 0 THEN 1 ELSE 0 END) AS oversold_risk
FROM product_supplier_links psl
JOIN supplier_products sp ON psl.supplier_product_id = sp.id
JOIN bc_products bc ON psl.ecommerce_product_id = bc.id
WHERE psl.is_active = TRUE
GROUP BY psl.supplier_name;
```

### Match Quality
```sql
SELECT
  supplier_name,
  COUNT(*) AS total_links,
  AVG(match_confidence) AS avg_confidence,
  SUM(CASE WHEN match_confidence >= 0.95 THEN 1 ELSE 0 END) AS high_confidence,
  SUM(CASE WHEN priority = 1 THEN 1 ELSE 0 END) AS primary_supplier
FROM product_supplier_links
WHERE is_active = TRUE
GROUP BY supplier_name;
```

---

## Dashboard Integration

The scorecard feeds into the ops dashboard:
- Widget showing supplier health grid
- Trend charts for each metric
- Alert feed for critical issues
- One-click actions for common fixes

---

## Supplier-Specific Notes

### Oborne (CH2)
- Best data quality (exact stock counts)
- FTP connection can timeout - monitor sync times
- Watch for "obsolete=true" products

### UHP
- Binary stock (TRUE/FALSE mapped to 100/0)
- Higher stock discrepancy due to estimation
- XLSX format - watch for file format changes

### Kadac
- Categorical stock (In Stock/Low Stock/Out of Stock)
- CSV API - check UID validity monthly
- Carton-only products need special handling

### Unleashed
- Real-time API with exact quantities
- Rate limits apply - monitor API calls
- Best for priority-1 assignments
