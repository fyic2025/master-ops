# Stock Alert Troubleshooting Playbook

Quick reference for diagnosing and fixing stock-related issues.

## Decision Tree

```
Stock issue detected?
├── Zero-stock visible → Run fix-zero-stock.ts
│
├── Sync not running?
│   ├── Check cron job status
│   ├── Run manual sync
│   └── Check supplier feed accessibility
│
├── High bounce rate?
│   ├── Check v_zero_stock_visible
│   ├── Fix visibility issues
│   └── Review checkout_error_logs
│
└── Stock predictions wrong?
    ├── Check sales velocity calculation
    ├── Review stock_history data
    └── Verify sync is running regularly
```

---

## Issue: Zero-Stock Products Visible on Store

**Symptoms:**
- Customers getting checkout errors
- "Shopping cart has been updated" messages
- Products with 0 stock showing as purchasable

**Diagnosis:**
```sql
-- Count zero-stock visible products
SELECT COUNT(*) FROM ecommerce_products
WHERE inventory_level = 0
  AND availability = 'available'
  AND is_active = true;
```

**Fix:**
```bash
# Preview changes
npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts --dry-run

# Apply fixes
npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts
```

**Prevention:**
- Ensure update-bc-availability.js runs after each sync
- Monitor zero_stock_visibility_log for recurring issues

---

## Issue: Supplier Sync Not Running

**Symptoms:**
- Stock data is stale (>14 hours old)
- Sync health check shows critical status
- No recent entries in sync_logs

**Diagnosis:**
```bash
# Check sync health
npx tsx .claude/skills/stock-alert-predictor/scripts/sync-health-check.ts

# Check last sync time
```

```sql
SELECT supplier_name, MAX(completed_at) as last_sync
FROM sync_logs
WHERE status = 'completed'
GROUP BY supplier_name;
```

**Fix:**
```bash
# Run manual sync
node buy-organics-online/sync-all-suppliers.js

# If specific supplier failing, run individual loader
node buy-organics-online/load-oborne-products.js
```

**Check Cron Status:**
```bash
# Start cron scheduler (needs to stay running)
node buy-organics-online/stock-sync-cron.js

# Or run one-time sync
node buy-organics-online/stock-sync-cron.js --now
```

---

## Issue: Oborne FTP Connection Failed

**Symptoms:**
- Oborne sync failing
- FTP connection timeout errors
- ECONNREFUSED errors

**Diagnosis:**
```bash
# Test FTP connectivity (manual)
# Check if ftp3.ch2.net.au is reachable
ping ftp3.ch2.net.au
```

**Fix:**
1. Check credentials in load-oborne-products.js
2. Verify network connectivity
3. Check if FTP server is up
4. Contact CH2 support if persistent

---

## Issue: UHP Download Failed

**Symptoms:**
- UHP sync failing
- HTTPS/SSL errors
- 404 or timeout errors

**Diagnosis:**
```bash
# Test URL accessibility
curl -I "https://www.uhp.com.au/media/wysiwyg/uhp_products_export.xlsx"
```

**Fix:**
1. Check if URL changed
2. Verify SSL certificate is valid
3. Try accessing in browser
4. Contact UHP if file moved

---

## Issue: Kadac API Error

**Symptoms:**
- Kadac sync failing
- 401/403 errors
- Empty response

**Diagnosis:**
```bash
# Test API
curl "https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv" | head
```

**Fix:**
1. Verify UID is still valid
2. Check for rate limiting
3. Contact Kadac if UID expired

---

## Issue: Stock Predictions Inaccurate

**Symptoms:**
- Products stocking out faster than predicted
- Predictions showing very long timeframes
- No predictions appearing

**Diagnosis:**
```sql
-- Check stock history data
SELECT COUNT(*) FROM stock_history
WHERE created_at > NOW() - INTERVAL '30 days';

-- Check if sales are being tracked
SELECT bc_product_id, SUM(ABS(stock_change)) as total_sold
FROM stock_history
WHERE stock_change < 0
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY bc_product_id
ORDER BY total_sold DESC
LIMIT 20;
```

**Fix:**
1. Ensure stock_history is being populated during syncs
2. Run prediction script to recalculate velocities
3. Verify sync is running twice daily

```bash
npx tsx .claude/skills/stock-alert-predictor/scripts/predict-stockouts.ts
```

---

## Issue: High Zero-Stock Rate from Supplier

**Symptoms:**
- Single supplier showing >50% zero stock
- Recent sync completed but many products at 0

**Diagnosis:**
```sql
-- Check zero-stock by supplier
SELECT
  primary_supplier,
  COUNT(*) as total,
  COUNT(CASE WHEN inventory_level = 0 THEN 1 END) as zero_stock,
  ROUND(COUNT(CASE WHEN inventory_level = 0 THEN 1 END)::numeric / COUNT(*) * 100, 1) as zero_pct
FROM ecommerce_products
WHERE is_active = true
GROUP BY primary_supplier
ORDER BY zero_pct DESC;
```

**Investigation:**
1. Check supplier feed directly
2. Review sync_logs for that supplier
3. Look for data format changes
4. Contact supplier about stock issues

---

## Issue: BigCommerce API Rate Limit

**Symptoms:**
- update-bc-availability.js failing
- 429 Too Many Requests errors
- Partial updates

**Diagnosis:**
Check for 429 errors in recent logs.

**Fix:**
```javascript
// Increase delay between API calls
// In update-bc-availability.js, change:
await sleep(250);  // Current
await sleep(500);  // Increase if needed
```

Also reduce batch size if processing too many at once.

---

## Issue: Mismatched Product Counts

**Symptoms:**
- Supplier shows different product count than expected
- Products missing from sync
- New products not appearing in BC

**Diagnosis:**
```sql
-- Check product counts
SELECT supplier_name, COUNT(*) FROM supplier_products GROUP BY supplier_name;

-- Check unmatched products
SELECT COUNT(*) FROM supplier_products sp
LEFT JOIN product_supplier_links psl ON sp.id = psl.supplier_product_id
WHERE psl.id IS NULL;
```

**Fix:**
1. Review product matching logic
2. Check for SKU/barcode changes
3. Run product reconciliation

---

## Emergency Procedures

### Mass Checkout Failures
1. Immediately run: `npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts`
2. Check checkout_error_logs for patterns
3. Notify support team
4. Monitor for 30 minutes

### Supplier Feed Completely Down
1. Document last good sync time
2. Enable manual_stock_override for critical products
3. Contact supplier
4. Update customers if extended outage

### Database Connection Issues
1. Check BOO_SUPABASE_URL and key
2. Verify Supabase is online
3. Test connection manually
4. Check for service incidents

---

## Quick Reference Commands

```bash
# Full stock check
npx tsx .claude/skills/stock-alert-predictor/scripts/stock-monitor.ts

# Fix zero-stock visibility
npx tsx .claude/skills/stock-alert-predictor/scripts/fix-zero-stock.ts

# Check sync health
npx tsx .claude/skills/stock-alert-predictor/scripts/sync-health-check.ts

# Predict stock-outs
npx tsx .claude/skills/stock-alert-predictor/scripts/predict-stockouts.ts

# Manual full sync
node buy-organics-online/sync-all-suppliers.js

# Diagnose checkout issues
node buy-organics-online/diagnose-checkout-issues.js
```
