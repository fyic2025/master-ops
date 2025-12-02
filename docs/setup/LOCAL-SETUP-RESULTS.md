# Local Setup Results

**Date:** 2025-12-01
**Status:** Complete

---

## Schemas - DEPLOYED

**Target:** `usibnysqelovfuctmkqw.supabase.co` (main shared instance)

| Schema | Status | Notes |
|--------|--------|-------|
| `schema-business-views.sql` | ✅ Deployed | businesses table + 4 core businesses |
| `20251201_job_monitoring.sql` | ✅ Deployed | dashboard_job_status + 22 jobs |
| `20251130_teelixir_distributor_intelligence.sql` | ✅ Deployed | 7 tables + views |
| `20251201_teelixir_automations.sql` | ✅ Deployed | 3 tables + winback config |

**Deployed via:** `DEPLOY-ALL-SCHEMAS.sql` on 2025-12-01

---

## Credentials Verified

```
node creds.js verify
4/4 tests passed
  ✓ boo/bc_access_token
  ✓ elevate/shopify_access_token
  ✓ teelixir/klaviyo_api_key
  ✓ global/n8n_api_key
```

---

## Vault Summary

| Business | Credentials | Status |
|----------|-------------|--------|
| BOO | 29 | ✅ Complete |
| Elevate | 11 | ✅ Complete |
| Teelixir | 14 | ✅ Complete |
| Red Hill Fresh | 13 | ✅ Complete (includes WooCommerce) |
| Global | 16 | ✅ Complete |

**Total:** 83 credentials available in vault

---

## Supabase Projects Clarification

There are TWO Supabase projects in use:

| Project ID | Purpose | Vault? |
|------------|---------|--------|
| `usibnysqelovfuctmkqw` | Main shared instance (operational data) | ✅ Yes |
| `qcvfxxsnqvdfmpbcgdni` | Brand connections / Dashboard | No |

**All schemas should be deployed to `usibnysqelovfuctmkqw`.**

---

## Tables After Deployment

Once `DEPLOY-ALL-SCHEMAS.sql` is run, these tables will be available:

### Core Tables
- `businesses` (4 core businesses seeded)
- `dashboard_job_status` (22 jobs seeded)

### Teelixir Distributor Intelligence
- `tlx_product_groups`
- `tlx_products`
- `tlx_distributors`
- `tlx_distributor_orders`
- `tlx_order_line_items`
- `tlx_oos_notes`
- `tlx_sync_log`

### Teelixir Automations
- `tlx_klaviyo_unengaged`
- `tlx_winback_emails`
- `tlx_automation_config`

### Views
- `v_job_health_summary`
- `v_unhealthy_jobs`
- `v_tlx_distributor_overview`
- `v_tlx_monthly_trends`
- `v_tlx_product_group_performance`
- `v_tlx_oos_summary`
- `v_tlx_distributor_product_mix`
- `tlx_winback_stats`

---

## Skills Merged

New skills pulled from remote branch:

1. **n8n-workflow-manager** - Complete workflow lifecycle management
2. **supabase-expert** (enhanced) - Cheat sheet, decision trees, self-healing procedures
3. **integration-tester** (enhanced) - Business integrations, troubleshooting guides

---

## Notes

1. **Node.js DNS**: Remote Claude sessions may experience DNS issues with Node.js. Use `curl` for API calls or run scripts locally.

---

**Setup completed by:** Claude Code
**Credentials verified:** Yes
**Schemas deployed:** ✅ Complete (2025-12-01)
