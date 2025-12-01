---
name: stock-alert-predictor
description: Real-time stock monitoring and predictive alerts for Buy Organics Online. Monitors 4 suppliers (Oborne, UHP, Kadac, Unleashed) with 11K+ products, predicts stock-outs before they happen, fixes zero-stock visibility issues, and alerts on critical inventory situations. Use for stock monitoring, inventory alerts, supplier sync issues, or checkout error prevention.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Stock Alert Predictor Skill

Comprehensive stock monitoring and prediction system for Buy Organics Online.

## When to Activate This Skill

Activate this skill when the user mentions:
- "stock alert" or "low stock"
- "stock-out" or "out of stock"
- "inventory warning"
- "supplier sync" or "sync failed"
- "zero stock visible" or "checkout error"
- "predict stock" or "stock forecast"
- "reorder alert" or "reorder point"
- "BOO stock" or "BigCommerce inventory"
- "supplier stock check"

## Business Context

### Buy Organics Online (BOO)
- **Platform**: BigCommerce
- **Total Products**: ~11,357 SKUs
- **Suppliers**: 4 integrated suppliers
- **Sync Frequency**: 8am & 8pm AEST (twice daily)
- **Critical Issue**: Zero-stock products still visible causing checkout errors

### Suppliers Integrated

| Supplier | Products | Connection | Stock Data |
|----------|----------|------------|------------|
| Oborne/CH2 | ~8,570 | FTP (ftp3.ch2.net.au) | Exact quantities |
| UHP | ~4,501 | HTTPS download | Binary (TRUE/FALSE) |
| Kadac | ~950 | CSV API | Exact quantities |
| Unleashed | ~430 | REST API | Exact quantities |

## Core Capabilities

### 1. Stock Level Monitoring
- Real-time stock level checks across all suppliers
- Low stock alerts (configurable thresholds)
- Zero stock detection with visibility check
- Stock history tracking (90-day retention)

### 2. Stock-Out Prediction
- Sales velocity calculation per product
- Days-until-stockout prediction
- Reorder point recommendations
- Seasonal trend analysis

### 3. Zero-Stock Visibility Fix
- Detect products with 0 stock still visible on storefront
- Auto-disable in BigCommerce
- Alert on new zero-stock issues
- Prevent checkout errors before they happen

### 4. Supplier Sync Health
- Monitor sync job execution
- Alert on sync failures
- Track sync duration and success rates
- Identify data quality issues

### 5. Automated Alerts
- Email alerts for critical situations
- Slack notifications (optional)
- Dashboard metrics updates
- Daily stock health summary

## Database Schema

### Existing Tables (BOO Supabase)

```sql
-- Main product table (11,357 products)
TABLE ecommerce_products (
  id UUID PRIMARY KEY,
  bc_product_id INTEGER UNIQUE,
  sku TEXT UNIQUE,
  name TEXT,
  availability TEXT,  -- 'available', 'disabled', 'preorder'
  inventory_level INTEGER,
  price DECIMAL,
  primary_supplier TEXT,
  supplier_sku TEXT,
  manual_stock_override BOOLEAN DEFAULT false,
  manual_stock_value INTEGER,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ
);

-- Supplier product feeds
TABLE supplier_products (
  id UUID PRIMARY KEY,
  supplier_name TEXT,  -- 'oborne', 'uhp', 'kadac', 'unleashed'
  supplier_sku TEXT,
  barcode TEXT,
  product_name TEXT,
  brand TEXT,
  stock_level INTEGER,
  availability TEXT,
  rrp DECIMAL,
  wholesale_price DECIMAL,
  metadata JSONB,
  synced_at TIMESTAMPTZ,
  UNIQUE(supplier_name, supplier_sku)
);

-- Product-supplier linking
TABLE product_supplier_links (
  id UUID PRIMARY KEY,
  ecommerce_product_id UUID REFERENCES ecommerce_products(id),
  supplier_product_id UUID REFERENCES supplier_products(id),
  supplier_name TEXT,
  notes JSONB,  -- {stock_level, availability, in_stock, last_sync}
  is_active BOOLEAN DEFAULT true
);

-- Stock history (auto-deletes after 90 days)
TABLE stock_history (
  id UUID PRIMARY KEY,
  bc_product_id INTEGER,
  old_stock INTEGER,
  new_stock INTEGER,
  stock_change INTEGER,
  change_reason TEXT,
  sync_log_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync audit trail
TABLE sync_logs (
  id UUID PRIMARY KEY,
  sync_type TEXT,
  supplier_name TEXT,
  status TEXT,  -- 'running', 'completed', 'failed', 'partial'
  records_processed INTEGER,
  records_created INTEGER,
  records_updated INTEGER,
  records_failed INTEGER,
  error_message TEXT,
  error_details JSONB,
  summary JSONB,
  triggered_by TEXT,  -- 'cron', 'manual', 'api', 'webhook'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### New Tables for Stock Alerts

```sql
-- Stock alert thresholds (to be created)
CREATE TABLE IF NOT EXISTS stock_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bc_product_id INTEGER REFERENCES ecommerce_products(bc_product_id),
  sku TEXT,
  product_name TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  critical_stock_threshold INTEGER DEFAULT 3,
  reorder_point INTEGER DEFAULT 20,
  reorder_quantity INTEGER,
  avg_daily_sales DECIMAL(10,2),
  days_until_stockout INTEGER,
  last_calculated_at TIMESTAMPTZ,
  is_monitored BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock alerts history
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bc_product_id INTEGER,
  sku TEXT,
  product_name TEXT,
  alert_type TEXT,  -- 'low_stock', 'critical_stock', 'zero_stock', 'stockout_prediction', 'sync_failure'
  severity TEXT,  -- 'info', 'warning', 'critical'
  current_stock INTEGER,
  threshold INTEGER,
  predicted_stockout_date DATE,
  message TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales velocity tracking (for prediction)
CREATE TABLE IF NOT EXISTS sales_velocity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bc_product_id INTEGER,
  sku TEXT,
  period_start DATE,
  period_end DATE,
  units_sold INTEGER,
  avg_daily_sales DECIMAL(10,2),
  trend_direction TEXT,  -- 'increasing', 'stable', 'decreasing'
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zero-stock visibility tracking
CREATE TABLE IF NOT EXISTS zero_stock_visibility_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bc_product_id INTEGER,
  sku TEXT,
  product_name TEXT,
  availability_before TEXT,
  availability_after TEXT,
  action_taken TEXT,  -- 'disabled', 'alerted', 'ignored'
  reason TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  fixed_at TIMESTAMPTZ
);
```

### Key Views

```sql
-- Low stock products
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT
  ep.bc_product_id,
  ep.sku,
  ep.name,
  ep.inventory_level,
  ep.availability,
  ep.primary_supplier,
  sat.low_stock_threshold,
  sat.critical_stock_threshold,
  sat.days_until_stockout,
  CASE
    WHEN ep.inventory_level = 0 THEN 'zero_stock'
    WHEN ep.inventory_level <= sat.critical_stock_threshold THEN 'critical'
    WHEN ep.inventory_level <= sat.low_stock_threshold THEN 'low'
    ELSE 'ok'
  END as stock_status
FROM ecommerce_products ep
LEFT JOIN stock_alert_thresholds sat ON ep.bc_product_id = sat.bc_product_id
WHERE ep.is_active = true
  AND ep.inventory_level <= COALESCE(sat.low_stock_threshold, 10);

-- Zero stock but still visible
CREATE OR REPLACE VIEW v_zero_stock_visible AS
SELECT
  bc_product_id,
  sku,
  name,
  inventory_level,
  availability,
  primary_supplier,
  synced_at
FROM ecommerce_products
WHERE inventory_level = 0
  AND availability = 'available'
  AND is_active = true;

-- Sync health summary
CREATE OR REPLACE VIEW v_sync_health AS
SELECT
  supplier_name,
  DATE(started_at) as sync_date,
  COUNT(*) as sync_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  MAX(completed_at) as last_sync
FROM sync_logs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY supplier_name, DATE(started_at);

-- Stock prediction summary
CREATE OR REPLACE VIEW v_stockout_predictions AS
SELECT
  sat.bc_product_id,
  sat.sku,
  sat.product_name,
  ep.inventory_level as current_stock,
  sat.avg_daily_sales,
  sat.days_until_stockout,
  CURRENT_DATE + sat.days_until_stockout as predicted_stockout_date,
  CASE
    WHEN sat.days_until_stockout <= 3 THEN 'critical'
    WHEN sat.days_until_stockout <= 7 THEN 'warning'
    WHEN sat.days_until_stockout <= 14 THEN 'info'
    ELSE 'ok'
  END as urgency
FROM stock_alert_thresholds sat
JOIN ecommerce_products ep ON sat.bc_product_id = ep.bc_product_id
WHERE sat.days_until_stockout IS NOT NULL
  AND sat.days_until_stockout <= 14
ORDER BY sat.days_until_stockout;
```

## Task Execution Methodology

### Phase 1: Stock Monitoring

#### Real-Time Stock Check

```typescript
// scripts/stock-monitor.ts
async function checkStockLevels(): Promise<StockCheckReport> {
  const { data: lowStock } = await supabase
    .from('v_low_stock_products')
    .select('*')
    .order('inventory_level');

  const { data: zeroVisible } = await supabase
    .from('v_zero_stock_visible')
    .select('*');

  return {
    timestamp: new Date(),
    lowStockCount: lowStock?.length || 0,
    criticalStockCount: lowStock?.filter(p => p.stock_status === 'critical').length || 0,
    zeroStockVisibleCount: zeroVisible?.length || 0,
    products: {
      low: lowStock?.filter(p => p.stock_status === 'low') || [],
      critical: lowStock?.filter(p => p.stock_status === 'critical') || [],
      zeroVisible: zeroVisible || []
    }
  };
}
```

#### Fix Zero-Stock Visibility

```typescript
// scripts/fix-zero-stock.ts
async function fixZeroStockVisibility(): Promise<FixReport> {
  // 1. Get zero-stock visible products
  const { data: zeroVisible } = await supabase
    .from('v_zero_stock_visible')
    .select('*');

  if (!zeroVisible || zeroVisible.length === 0) {
    return { fixed: 0, errors: [] };
  }

  const fixed: number[] = [];
  const errors: string[] = [];

  for (const product of zeroVisible) {
    try {
      // Update BigCommerce availability
      await fetch(`https://api.bigcommerce.com/stores/${BC_STORE_HASH}/v3/catalog/products/${product.bc_product_id}`, {
        method: 'PUT',
        headers: {
          'X-Auth-Token': BC_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ availability: 'disabled' })
      });

      // Log the fix
      await supabase.from('zero_stock_visibility_log').insert({
        bc_product_id: product.bc_product_id,
        sku: product.sku,
        product_name: product.name,
        availability_before: 'available',
        availability_after: 'disabled',
        action_taken: 'disabled',
        reason: 'zero_stock_auto_fix'
      });

      // Update local record
      await supabase.from('ecommerce_products')
        .update({ availability: 'disabled' })
        .eq('bc_product_id', product.bc_product_id);

      fixed.push(product.bc_product_id);

    } catch (error) {
      errors.push(`Failed to fix ${product.sku}: ${error.message}`);
    }

    // Rate limit: 250ms between API calls
    await sleep(250);
  }

  return { fixed: fixed.length, errors };
}
```

### Phase 2: Stock-Out Prediction

#### Calculate Sales Velocity

```typescript
// scripts/calculate-velocity.ts
async function calculateSalesVelocity(days: number = 30): Promise<void> {
  // Get order data from BigCommerce or local tracking
  const { data: orders } = await supabase
    .from('bc_orders')
    .select('line_items')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  // Aggregate sales by product
  const productSales: Record<number, number> = {};
  for (const order of orders || []) {
    for (const item of order.line_items) {
      productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
    }
  }

  // Calculate daily average and update thresholds
  for (const [productId, totalSold] of Object.entries(productSales)) {
    const avgDailySales = totalSold / days;

    // Get current stock
    const { data: product } = await supabase
      .from('ecommerce_products')
      .select('inventory_level, sku, name')
      .eq('bc_product_id', productId)
      .single();

    if (!product) continue;

    // Calculate days until stockout
    const daysUntilStockout = avgDailySales > 0
      ? Math.floor(product.inventory_level / avgDailySales)
      : null;

    // Upsert threshold record
    await supabase.from('stock_alert_thresholds').upsert({
      bc_product_id: parseInt(productId),
      sku: product.sku,
      product_name: product.name,
      avg_daily_sales: avgDailySales,
      days_until_stockout: daysUntilStockout,
      reorder_point: Math.ceil(avgDailySales * 14), // 2 weeks safety stock
      last_calculated_at: new Date().toISOString()
    }, { onConflict: 'bc_product_id' });
  }
}
```

#### Predict Stock-Outs

```typescript
// scripts/predict-stockouts.ts
async function predictStockouts(): Promise<StockoutPrediction[]> {
  const { data: predictions } = await supabase
    .from('v_stockout_predictions')
    .select('*')
    .order('days_until_stockout');

  // Generate alerts for critical items
  const criticalPredictions = predictions?.filter(p => p.urgency === 'critical') || [];

  for (const pred of criticalPredictions) {
    // Check if alert already exists
    const { data: existing } = await supabase
      .from('stock_alerts')
      .select('id')
      .eq('bc_product_id', pred.bc_product_id)
      .eq('alert_type', 'stockout_prediction')
      .eq('resolved', false)
      .single();

    if (!existing) {
      await supabase.from('stock_alerts').insert({
        bc_product_id: pred.bc_product_id,
        sku: pred.sku,
        product_name: pred.product_name,
        alert_type: 'stockout_prediction',
        severity: 'critical',
        current_stock: pred.current_stock,
        predicted_stockout_date: pred.predicted_stockout_date,
        message: `Product will be out of stock in ${pred.days_until_stockout} days (${pred.avg_daily_sales} units/day)`
      });
    }
  }

  return predictions || [];
}
```

### Phase 3: Supplier Sync Health

#### Monitor Sync Jobs

```typescript
// scripts/check-sync-health.ts
async function checkSyncHealth(): Promise<SyncHealthReport> {
  const { data: health } = await supabase
    .from('v_sync_health')
    .select('*')
    .order('sync_date', { ascending: false });

  const report: SyncHealthReport = {
    timestamp: new Date(),
    suppliers: {},
    alerts: []
  };

  const expectedSuppliers = ['oborne', 'uhp', 'kadac', 'unleashed'];

  for (const supplier of expectedSuppliers) {
    const supplierData = health?.find(h => h.supplier_name === supplier);

    if (!supplierData) {
      report.alerts.push({
        type: 'sync_missing',
        supplier,
        message: `No sync data found for ${supplier} in last 7 days`
      });
      continue;
    }

    const lastSyncAge = Date.now() - new Date(supplierData.last_sync).getTime();
    const hoursSinceSync = lastSyncAge / (1000 * 60 * 60);

    report.suppliers[supplier] = {
      lastSync: supplierData.last_sync,
      successRate: supplierData.successful / supplierData.sync_count * 100,
      avgDuration: supplierData.avg_duration_seconds,
      hoursSinceSync
    };

    // Alert if sync is overdue (>14 hours since 8am/8pm schedule)
    if (hoursSinceSync > 14) {
      report.alerts.push({
        type: 'sync_overdue',
        supplier,
        severity: 'critical',
        message: `${supplier} sync is ${Math.round(hoursSinceSync)} hours overdue`
      });
    }

    // Alert on high failure rate
    if (supplierData.failed > 0) {
      report.alerts.push({
        type: 'sync_failures',
        supplier,
        severity: 'warning',
        message: `${supplier} had ${supplierData.failed} failed syncs in last 7 days`
      });
    }
  }

  return report;
}
```

### Phase 4: Alert Generation

#### Generate and Send Alerts

```typescript
// scripts/generate-alerts.ts
async function generateAlerts(): Promise<void> {
  // 1. Low stock alerts
  const { data: lowStock } = await supabase
    .from('v_low_stock_products')
    .select('*')
    .in('stock_status', ['critical', 'zero_stock']);

  for (const product of lowStock || []) {
    const alertType = product.stock_status === 'zero_stock' ? 'zero_stock' : 'critical_stock';

    await createAlertIfNotExists({
      bc_product_id: product.bc_product_id,
      sku: product.sku,
      product_name: product.name,
      alert_type: alertType,
      severity: 'critical',
      current_stock: product.inventory_level,
      threshold: product.critical_stock_threshold,
      message: `${product.name} has only ${product.inventory_level} units remaining`
    });
  }

  // 2. Zero-stock visibility alerts
  const { data: zeroVisible } = await supabase
    .from('v_zero_stock_visible')
    .select('*');

  if (zeroVisible && zeroVisible.length > 0) {
    await createAlertIfNotExists({
      alert_type: 'zero_stock_visible',
      severity: 'critical',
      message: `${zeroVisible.length} products have zero stock but are still visible on store`
    });
  }

  // 3. Send email summary
  const { data: unresolvedAlerts } = await supabase
    .from('stock_alerts')
    .select('*')
    .eq('resolved', false)
    .eq('acknowledged', false);

  if (unresolvedAlerts && unresolvedAlerts.length > 0) {
    await sendAlertEmail(unresolvedAlerts);
  }
}

async function sendAlertEmail(alerts: Alert[]): Promise<void> {
  const critical = alerts.filter(a => a.severity === 'critical');
  const warning = alerts.filter(a => a.severity === 'warning');

  const subject = critical.length > 0
    ? `[CRITICAL] ${critical.length} Stock Alerts Require Attention`
    : `[WARNING] ${warning.length} Stock Alerts`;

  const body = `
    <h2>Stock Alert Summary</h2>
    <p>Generated: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>

    ${critical.length > 0 ? `
      <h3 style="color: red;">Critical Alerts (${critical.length})</h3>
      <ul>
        ${critical.map(a => `<li><strong>${a.sku}</strong>: ${a.message}</li>`).join('')}
      </ul>
    ` : ''}

    ${warning.length > 0 ? `
      <h3 style="color: orange;">Warning Alerts (${warning.length})</h3>
      <ul>
        ${warning.map(a => `<li><strong>${a.sku}</strong>: ${a.message}</li>`).join('')}
      </ul>
    ` : ''}

    <p><a href="https://ops.growthcohq.com/stock-alerts">View All Alerts</a></p>
  `;

  // Send via shared alert system
  await sendEmail({
    to: 'sales@buyorganicsonline.com.au',
    cc: 'jayson@fyic.com.au',
    subject,
    html: body
  });
}
```

## Reference Files

### Existing Scripts
- [buy-organics-online/sync-all-suppliers.js](../../../buy-organics-online/sync-all-suppliers.js) - Master sync orchestrator
- [buy-organics-online/load-oborne-products.js](../../../buy-organics-online/load-oborne-products.js) - Oborne FTP loader
- [buy-organics-online/load-uhp-products.js](../../../buy-organics-online/load-uhp-products.js) - UHP XLSX loader
- [buy-organics-online/load-kadac-products.js](../../../buy-organics-online/load-kadac-products.js) - Kadac CSV loader
- [buy-organics-online/load-unleashed-products.js](../../../buy-organics-online/load-unleashed-products.js) - Unleashed API loader
- [buy-organics-online/update-bc-availability.js](../../../buy-organics-online/update-bc-availability.js) - BigCommerce updater
- [buy-organics-online/diagnose-checkout-issues.js](../../../buy-organics-online/diagnose-checkout-issues.js) - Zero-stock diagnostic
- [buy-organics-online/stock-sync-cron.js](../../../buy-organics-online/stock-sync-cron.js) - Cron scheduler

### Database Schema
- [buy-organics-online/supabase-schema.sql](../../../buy-organics-online/supabase-schema.sql) - Main BOO schema
- [infra/supabase/schema-bigcommerce-checkout.sql](../../../infra/supabase/schema-bigcommerce-checkout.sql) - Checkout error tracking

### Documentation
- [buy-organics-online/SYNC-README.md](../../../buy-organics-online/SYNC-README.md) - Sync system overview

## Environment Variables Required

```bash
# BOO Supabase (separate instance)
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=

# BigCommerce
BC_STORE_HASH=hhhi
BC_ACCESS_TOKEN=

# n8n (for workflow triggers)
N8N_BASE_URL=https://automation.growthcohq.com
N8N_API_KEY=

# Email alerts
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
EMAIL_TO=sales@buyorganicsonline.com.au
```

## Alert Thresholds

| Alert Type | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| Low Stock | ≤10 units | warning | Email notification |
| Critical Stock | ≤3 units | critical | Email + auto-reorder flag |
| Zero Stock | 0 units | critical | Check visibility, disable if needed |
| Zero Stock Visible | 0 + available | critical | Auto-disable in BC |
| Stockout Prediction | ≤3 days | critical | Urgent reorder alert |
| Stockout Prediction | ≤7 days | warning | Reorder reminder |
| Sync Overdue | >14 hours | critical | Investigate sync job |
| Sync Failed | Any failure | warning | Check supplier feed |

## Known Issues & Gaps

### Current Infrastructure Gaps
1. **UHP Binary Stock** - Only TRUE/FALSE, no actual quantities
2. **Cron Not Confirmed Running** - stock-sync-cron.js may need PM2 setup
3. **n8n Workflow Inactive** - 01-bigcommerce-product-sync.json set to inactive
4. **No Real-Time Updates** - 2x daily batch only
5. **2,310 Zero-Stock Visible** - Historic issue causing checkout errors

### This Skill Addresses
- Automated zero-stock visibility fixes
- Proactive stock-out prediction
- Supplier sync monitoring
- Alert generation and notification
- Stock health dashboard metrics

## Success Criteria

A successful stock monitoring session should:
- Identify all products below threshold levels
- Fix zero-stock visibility issues automatically
- Generate alerts for critical situations
- Predict stock-outs with reasonable accuracy
- Monitor supplier sync health
- Provide actionable recommendations
- Never allow zero-stock products to remain visible

## Emergency Procedures

### High Volume of Checkout Errors
1. Run `npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts`
2. Check `diagnose-checkout-issues.js` output
3. Review `zero_stock_visibility_log` for patterns
4. Escalate if >100 products affected

### Supplier Sync Failure
1. Check sync_logs for error details
2. Verify supplier feed is accessible
3. Test credentials (FTP, API keys)
4. Run manual sync: `node buy-organics-online/sync-all-suppliers.js`

### Mass Stock-Out
1. Identify affected supplier via sync_logs
2. Check supplier feed directly
3. Enable manual_stock_override for critical products
4. Contact supplier for feed status
