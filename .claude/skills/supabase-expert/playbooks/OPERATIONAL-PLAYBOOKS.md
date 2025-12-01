# Operational Playbooks - Supabase Expert

> Daily, weekly, monthly procedures for each business.

---

## DAILY OPERATIONS

### Morning Health Check (All Businesses) - 9:00 AM AEST

```bash
# 1. Check overall database health
curl -s "https://usibnysqelovfuctmkqw.supabase.co/rest/v1/rpc/get_health_summary" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# 2. Check for overnight errors
curl -s "https://usibnysqelovfuctmkqw.supabase.co/rest/v1/integration_logs?status=eq.error&created_at=gte.$(date -d 'yesterday' +%Y-%m-%d)" \
  -H "apikey: $SUPABASE_SERVICE_KEY"

# 3. Check sync staleness
# Any sync older than expected frequency = investigate
```

**Expected Results:**
- All syncs completed in last 24 hours
- Error rate < 5%
- No critical alerts

**If Issues Found:**
1. Check Decision Trees for diagnosis
2. Check Historical Issues for known problems
3. Escalate if new issue

---

## BOO - BUY ORGANICS ONLINE

### Daily (Automated - Verify Running)

| Time | Operation | Table(s) Affected | Expected |
|------|-----------|-------------------|----------|
| Every 2h | Oborne supplier sync | supplier_products | ~1,823 rows updated |
| Every 2h | UHP supplier sync | supplier_products | ~1,102 rows updated |
| Every 2h | Kadac supplier sync | supplier_products | ~945 rows updated |
| Every 2h :45 | GlobalNature sync | supplier_products | Variable |
| 03:00 UTC | BC product sync | bc_products | 11,357 rows verified |
| Continuous | Checkout error capture | checkout_errors | Variable |
| Continuous | LiveChat messages | livechat_messages | Variable |

**Verification Query:**
```sql
SELECT
  supplier_name,
  COUNT(*) as products,
  MAX(last_synced_at) as last_sync,
  NOW() - MAX(last_synced_at) as staleness
FROM supplier_products
GROUP BY supplier_name
ORDER BY staleness DESC;
```

**Alert If:**
- Any supplier staleness > 4 hours
- Sync error count > 10 in 24 hours
- Zero-stock visible products > 2,500

### Weekly (Friday 5 PM AEST)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Product link audit | Verify supplier mappings | Run link-products-to-suppliers.ts |
| GSC issues review | Check indexing problems | Review gsc_issues table |
| Performance check | Verify query speeds | Run EXPLAIN on common queries |

### Monthly (Last Friday)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Archive old logs | Prevent table bloat | DELETE from integration_logs WHERE created_at < NOW() - INTERVAL '90 days' |
| GMC feed audit | Check disapprovals | Review google_merchant_products.item_issues |
| Supplier data quality | Check for stale products | Review products not updated in 30 days |

---

## TEELIXIR

### Daily (Automated - Verify Running)

| Time | Operation | Table(s) Affected | Expected |
|------|-----------|-------------------|----------|
| 06:00 AEST | Product sync | tlx_products | ~100 rows |
| 07:00 AEST | Distributor sync | tlx_distributors, tlx_distributor_orders | 1,000+ distributors |
| 09:00-19:00 | Winback emails | tlx_winback_emails | Up to 20/day |
| Daily | Conversion check | tlx_winback_emails | Check for MISSYOU40 usage |

**Verification Query:**
```sql
-- Check winback status
SELECT
  DATE(sent_at) as date,
  COUNT(*) as emails_sent,
  COUNT(*) FILTER (WHERE converted = true) as conversions
FROM tlx_winback_emails
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```

**Alert If:**
- Winback emails sent = 0 during business hours (enabled)
- Distributor sync staleness > 24 hours
- OOS mentions > 50 in single day (supply issue)

### Weekly (Monday 9 AM AEST)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Klaviyo unengaged sync | Refresh winback pool | Run sync-klaviyo-unengaged.ts |
| Distributor health review | Check at-risk accounts | Query v_tlx_distributor_overview |
| OOS pattern analysis | Identify supply issues | Query tlx_oos_notes by product |

**Weekly Query:**
```sql
-- At-risk distributors (no orders 30+ days)
SELECT
  name,
  last_order_date,
  total_orders,
  total_revenue
FROM tlx_distributors
WHERE last_order_date < NOW() - INTERVAL '30 days'
  AND total_orders > 5
ORDER BY total_revenue DESC
LIMIT 20;
```

### Monthly (First Monday)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Distributor group review | Verify groupings correct | Review tlx_distributor_groups |
| Product performance | Identify top/bottom products | Query by product group |
| Winback campaign ROI | Calculate conversion value | Aggregate winback conversions |

---

## ELEVATE WHOLESALE

### Daily (Automated - Verify Running)

| Time | Operation | Table(s) Affected | Expected |
|------|-----------|-------------------|----------|
| 06:00 AEST | Daily processor | prospecting_queue | N contacts selected |
| 07:00 AEST | Login detector | prospecting_queue | Check customer logins |
| Hourly | Email sender | prospecting_emails | Queue processing |
| 02:00 AEST | Trial expiration | trial_customers | Expire old trials |

**Verification Query:**
```sql
-- Prospecting funnel status
SELECT
  status,
  COUNT(*) as count
FROM prospecting_queue
GROUP BY status
ORDER BY
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'sent' THEN 2
    WHEN 'active' THEN 3
    WHEN 'expired' THEN 4
  END;
```

**Alert If:**
- Trial expirations not running (check cron)
- Prospecting queue stuck (no movement in 48h)
- Email send failures > 5 in day

### Weekly (Tuesday 10 AM AEST)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Conversion review | Track trial → customer | Query trial_customers.converted |
| Email performance | Check open/click rates | Review prospecting_emails |
| Shopify account audit | Verify B2B accounts created | Cross-check with Shopify |

### Monthly (Second Monday)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Category performance | Which categories convert best | Aggregate by lead_category |
| Email sequence optimization | A/B results | Compare email variants |
| Archive completed trials | Clean up old data | Archive trials > 90 days old |

---

## RED HILL FRESH

### Daily (When Deployed)

| Time | Operation | Table(s) Affected | Expected |
|------|-----------|-------------------|----------|
| 05:00 AEST | Product sync | wc_products | TBD |
| Every hour | Order sync | wc_orders | TBD |
| Daily | Customer sync | wc_customers | TBD |

**Note:** RHF is pre-deployment. These operations will be activated once:
1. WooCommerce credentials configured
2. Schema deployed
3. Initial sync completed

### Weekly (When Deployed)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Delivery zone review | Check zone performance | Query wc_orders by zone |
| Stock level check | Identify low stock | Query wc_products.stock_level |
| Order fulfillment audit | Check delivery success | Review order status |

---

## SHARED INFRASTRUCTURE

### Daily

| Time | Operation | Scope | Action |
|------|-----------|-------|--------|
| 00:00 UTC | Log rotation check | All tables | Verify logs not growing unbounded |
| 06:00 UTC | n8n workflow check | All workflows | Verify all active workflows ran |
| 12:00 UTC | API quota check | All services | Check api_metrics for rate limits |

### Weekly (Sunday 02:00 AEST)

| Operation | Tables | Action |
|-----------|--------|--------|
| Log cleanup | integration_logs | Delete > 30 days |
| Workflow log cleanup | workflow_execution_logs | Delete > 90 days |
| API metrics cleanup | api_metrics | Delete > 30 days |

**Cleanup Script:**
```sql
-- Weekly cleanup (run Sunday 2 AM)
BEGIN;

DELETE FROM integration_logs
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM workflow_execution_logs
WHERE started_at < NOW() - INTERVAL '90 days';

DELETE FROM api_metrics
WHERE recorded_at < NOW() - INTERVAL '30 days';

COMMIT;

-- Reclaim space
VACUUM ANALYZE integration_logs;
VACUUM ANALYZE workflow_execution_logs;
VACUUM ANALYZE api_metrics;
```

### Monthly (First Sunday)

| Operation | Purpose | Action |
|-----------|---------|--------|
| Performance audit | Check query speeds | Run performance-audit.ts |
| Index review | Verify indexes used | Check pg_stat_user_indexes |
| Table size review | Monitor growth | Check pg_total_relation_size |
| Credential rotation | Security hygiene | Review vault last_updated |

---

## INCIDENT RESPONSE

### Severity Levels

| Level | Response Time | Examples | Escalation |
|-------|---------------|----------|------------|
| P1 CRITICAL | Immediate | Data loss, total outage | Immediate notification |
| P2 HIGH | < 1 hour | Sync failure, checkout blocking | Alert within 30 min |
| P3 MEDIUM | < 4 hours | Performance degradation | Alert within 2 hours |
| P4 LOW | < 24 hours | Warnings, cosmetic | Daily summary |

### Incident Workflow

```
1. DETECT
   - Automated monitoring alerts
   - User report
   - Health check failure

2. ASSESS
   - Identify scope (one business vs all)
   - Identify impact (users affected)
   - Assign severity level

3. DIAGNOSE
   - Check Decision Trees
   - Check Historical Issues
   - Check recent changes

4. RESOLVE
   - Apply fix
   - Verify resolution
   - Monitor for recurrence

5. DOCUMENT
   - Add to Historical Issues if new
   - Update playbook if needed
   - Notify stakeholders
```

---

## MAINTENANCE WINDOWS

### Preferred Windows (Low Traffic)

| Region | Window | UTC |
|--------|--------|-----|
| Australia | Sun 2-6 AM AEST | Sat 16:00-20:00 UTC |
| Alternative | Tue 2-6 AM AEST | Mon 16:00-20:00 UTC |

### Pre-Maintenance Checklist

- [ ] Notify stakeholders 24h in advance
- [ ] Backup critical tables
- [ ] Prepare rollback plan
- [ ] Test changes in isolation
- [ ] Schedule monitoring during window

### Post-Maintenance Checklist

- [ ] Verify all syncs running
- [ ] Check for errors in logs
- [ ] Confirm data integrity
- [ ] Update documentation
- [ ] Notify stakeholders of completion

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
