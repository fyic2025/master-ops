# Supabase Expert - Cheat Sheet

> Single-page quick lookup for the most common operations.

---

## Connection

```
URL:   https://usibnysqelovfuctmkqw.supabase.co
REST:  /rest/v1/
Port:  5432 (direct) | 6543 (pooler)
```

---

## Table Count: 158+ (local SQL files)

> Live DB may have 200-500+ tables from other repos (Teelixir Leads, etc.)

| Category | Count | Prefix |
|----------|-------|--------|
| BOO | 32 | `bc_*`, `supplier_*`, `checkout_*`, `livechat_*`, `gsc_*` |
| Teelixir | 18 | `tlx_*`, `smartlead_*`, `klaviyo_*` |
| Elevate | 8 | `trial_*`, `prospecting_*` |
| RHF | 16 | `wc_*`, `rhf_*` |
| Google | 14 | `google_ads_*`, `google_merchant_*` |
| SEO | 18 | `seo_*` |
| Financials | 12 | `xero_*`, `account*`, `journal_*` |
| Dashboard | 12 | `dashboard_*`, `sync_*` |
| Shared | 16 | `integration_*`, `workflow_*`, `task*`, `api_*` |
| Agents | 9 | `lighthouse_*`, `performance_*`, `theme_*` |

---

## Vault Access

```bash
node creds.js get boo bc_access_token
node creds.js get teelixir unleashed_api_key
node creds.js get global hubspot_access_token
```

---

## Health Check (One-liner)

```sql
SELECT 'supplier_products' as t, MAX(last_synced_at), NOW()-MAX(last_synced_at) as age FROM supplier_products
UNION SELECT 'tlx_distributors', MAX(last_synced_at), NOW()-MAX(last_synced_at) FROM tlx_distributors
UNION SELECT 'bc_products', MAX(last_synced_at), NOW()-MAX(last_synced_at) FROM bc_products;
```

---

## Error Check (Last 24h)

```sql
SELECT source, status, COUNT(*) FROM integration_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, status ORDER BY count DESC;
```

---

## Rate Limits

| Service | Limit | Delay |
|---------|-------|-------|
| BigCommerce | 150/30s | 200ms |
| HubSpot | 100/10s | 200ms |
| Shopify | 2/s | 500ms |
| Klaviyo | 75/s | 50ms |
| Unleashed | 200/min | 300ms |

---

## Common Errors → Fixes

| Error | Fix |
|-------|-----|
| 401 | Check vault creds |
| 429 | Add delays |
| 403 | Check API scopes |
| duplicate key | Use UPSERT |
| invalid_grant | Re-auth OAuth |
| ECONNREFUSED | Check service status |

---

## Curl Template

```bash
curl -s "https://usibnysqelovfuctmkqw.supabase.co/rest/v1/TABLE?select=*" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

---

## Business Context

| Business | Platform | Focus |
|----------|----------|-------|
| BOO | BigCommerce | 4 suppliers, 11K products |
| Teelixir | Shopify+Unleashed | Distributors, winback |
| Elevate | Shopify B2B | 30-day trials |
| RHF | WooCommerce | Local delivery |

---

## Emergency Contacts

- **DB Down** → Check status.supabase.com → Use curl not Node
- **All Syncs Fail** → Check integration_logs → Verify vault → Check n8n
- **Rate Limited** → Add delays → Check api_metrics

---

## Maintenance Schedule

| When | What |
|------|------|
| Daily | Health check, error monitoring |
| Weekly | Log cleanup (30 days), VACUUM |
| Monthly | Performance audit, index review |

---

## Key Files

```
infra/supabase/vault-setup.sql     # Credential vault
infra/supabase/schema-*.sql        # Main schemas
buy-organics-online/creds.js       # Vault loader
```

---

*Version 1.0 | 2025-12-01 | 158 tables*
