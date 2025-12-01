# Business Data Map - Supabase Expert

> Complete mapping of which businesses use which tables, their data patterns, and operational context.

---

## Overview

**Supabase Instance:** `usibnysqelovfuctmkqw.supabase.co`
**Total Businesses:** 4 active + 2 infrastructure
**Total Tables:** 50+ across all schemas
**Vault Credentials:** 76 stored

---

## 1. BUY ORGANICS ONLINE (BOO)

### Business Profile
- **Platform:** BigCommerce
- **Domain:** buyorganicsonline.com.au
- **Store Hash:** `hhhi`
- **Products:** 11,357
- **Orders:** ~157,000 historical
- **Suppliers:** 4 (Oborne, UHP, Kadac, GlobalNature)

### Tables Owned
| Table | Purpose | Row Estimate | Sync Frequency |
|-------|---------|--------------|----------------|
| `supplier_products` | All supplier inventory | 3,800+ | Every 2 hours |
| `bc_products` | BigCommerce catalog | 11,357 | Daily |
| `bc_orders` | Order history | 157,000+ | Hourly |
| `product_supplier_links` | Product↔Supplier mapping | 5,000+ | On demand |
| `checkout_errors` | Checkout failure tracking | Growing | Real-time |
| `livechat_conversations` | Customer support | Growing | Real-time |
| `livechat_messages` | Chat messages | Growing | Real-time |
| `livechat_ai_suggestions` | AI reply suggestions | Growing | Real-time |
| `google_merchant_products` | GMC feed status | 11,357 | Daily |
| `gsc_page_performance` | Search Console data | Growing | Daily |
| `gsc_issues` | GSC indexing issues | Variable | Daily |

### Data Patterns
- **Peak Activity:** 9am-5pm AEST weekdays
- **Order Volume:** ~50-100 orders/day
- **Supplier Sync:** Every 2 hours, 4 suppliers
- **Stock Updates:** 3,800 products checked per sync
- **Known Issues:** 2,310 products with zero stock visible (causes checkout errors)

### Vault Credentials (29)
```
boo/bc_store_hash, boo/bc_access_token, boo/bc_client_id, boo/bc_client_secret
boo/oborne_ftp_host, boo/oborne_ftp_user, boo/oborne_ftp_password
boo/uhp_email, boo/uhp_password
boo/kadac_uid
boo/google_ads_customer_id, boo/google_ads_refresh_token
boo/google_merchant_id, boo/google_merchant_refresh_token
boo/xero_client_id, boo/xero_client_secret, boo/xero_refresh_token, boo/xero_tenant_id
boo/klaviyo_api_key
boo/livechat_account_id, boo/livechat_pat, boo/livechat_entity_id
boo/supabase_url, boo/supabase_service_role_key
```

---

## 2. TEELIXIR

### Business Profile
- **Platform:** Shopify (B2C) + Unleashed (B2B/Inventory)
- **Domain:** teelixir.com
- **Shopify Store:** teelixir-au.myshopify.com
- **Products:** 100+ SKUs
- **Distributors:** 13 major groups, 1,000+ accounts
- **Focus:** Medicinal mushroom products

### Tables Owned
| Table | Purpose | Row Estimate | Sync Frequency |
|-------|---------|--------------|----------------|
| `tlx_products` | Product catalog | 100+ | Daily |
| `tlx_product_groups` | Variant groupings | 50+ | Daily |
| `tlx_distributors` | B2B customer base | 1,000+ | Daily |
| `tlx_distributor_orders` | Sales orders | 10,000+ | Hourly |
| `tlx_order_line_items` | Order details | 50,000+ | Hourly |
| `tlx_oos_notes` | Out-of-stock mentions | Variable | On order sync |
| `tlx_distributor_groups` | 13 major groups | 13 | Static |
| `tlx_sync_log` | Sync audit trail | Growing | Every sync |
| `tlx_klaviyo_unengaged` | Winback targets | Variable | Weekly |
| `tlx_winback_emails` | Campaign tracking | Growing | On send |
| `tlx_automation_config` | Automation settings | 5-10 | On change |

### Data Patterns
- **Distributor Groups:** Oborne (VIC/NSW/QLD/SA/WA), Vitalus, Muscle Worx, etc.
- **Order Parsing:** Extracts OOS, discontinued, backorder mentions
- **Winback Campaign:** 40% discount (MISSYOU40), 20 emails/day limit
- **Send Window:** 9am-7pm Melbourne time only
- **B2C vs B2B:** Shopify = retail, Unleashed = wholesale

### Vault Credentials (14)
```
teelixir/shopify_store_url, teelixir/shopify_access_token
teelixir/shopify_api_key, teelixir/shopify_api_secret
teelixir/unleashed_api_id, teelixir/unleashed_api_key
teelixir/gmail_client_id, teelixir/gmail_client_secret, teelixir/gmail_refresh_token
teelixir/klaviyo_api_key
teelixir/xero_client_id, teelixir/xero_client_secret, teelixir/xero_refresh_token, teelixir/xero_tenant_id
```

---

## 3. ELEVATE WHOLESALE

### Business Profile
- **Platform:** Shopify B2B + Unleashed
- **Domain:** elevatewholesale.com.au
- **Shopify Store:** elevatewholesale.myshopify.com
- **Focus:** B2B wholesale distribution
- **Trial System:** 30-day trials with 10% discount

### Tables Owned
| Table | Purpose | Row Estimate | Sync Frequency |
|-------|---------|--------------|----------------|
| `trial_customers` | Trial account tracking | Growing | Real-time |
| `customer_activity_log` | Activity audit | Growing | Real-time |
| `email_queue` | Outbound email queue | Variable | Hourly |
| `integration_sync_log` | Sync audit | Growing | Every sync |
| `prospecting_queue` | Outreach targets | Variable | Daily |
| `prospecting_emails` | Email tracking | Growing | On send |
| `prospecting_run_log` | Batch run history | Growing | Daily |
| `system_config` | Configuration | 10-20 | On change |

### Data Patterns
- **Trial Duration:** 30 days default
- **Trial Discount:** 10% (configurable)
- **Prospecting:** Daily batch processing, 6am AEST
- **Login Detection:** Daily check at 7am AEST
- **Email Categories:** beauty, fitness (configurable)

### Vault Credentials (11)
```
elevate/shopify_store_url, elevate/shopify_access_token
elevate/unleashed_api_id, elevate/unleashed_api_key
elevate/klaviyo_api_key
elevate/xero_client_id, elevate/xero_client_secret, elevate/xero_refresh_token, elevate/xero_tenant_id
elevate/supabase_url, elevate/supabase_service_role_key, elevate/supabase_anon_key
```

---

## 4. RED HILL FRESH (RHF)

### Business Profile
- **Platform:** WooCommerce
- **Domain:** redhillfresh.com.au
- **Focus:** Local produce delivery
- **Delivery Days:** Thursday-Friday only
- **Status:** Pre-deployment (schemas ready, credentials pending)

### Tables Owned (When Deployed)
| Table | Purpose | Row Estimate | Sync Frequency |
|-------|---------|--------------|----------------|
| `wc_products` | WooCommerce products | TBD | Daily |
| `wc_product_variations` | Product variants | TBD | Daily |
| `wc_orders` | Order history | TBD | Hourly |
| `wc_order_line_items` | Order details | TBD | Hourly |
| `wc_customers` | Customer base | TBD | Daily |
| `wc_categories` | Product categories | TBD | Weekly |
| `wc_shipping_zones` | Delivery zones | TBD | On change |
| `wc_coupons` | Discount codes | TBD | On change |
| `rhf_sync_logs` | Sync audit | TBD | Every sync |

### Data Patterns
- **Delivery Windows:** Thu-Fri only
- **Zone-Based:** Different zones have different delivery rules
- **Seasonal:** Produce availability varies
- **Local Focus:** Mornington Peninsula area

### Vault Credentials (7)
```
redhillfresh/wp_url, redhillfresh/wp_password, redhillfresh/wp_app_password
redhillfresh/xero_client_id, redhillfresh/xero_client_secret
redhillfresh/xero_refresh_token, redhillfresh/xero_tenant_id
```

---

## 5. GLOBAL / SHARED

### Tables Owned
| Table | Purpose | Used By |
|-------|---------|---------|
| `secure_credentials` | Encrypted vault | All |
| `integration_logs` | Cross-business logging | All |
| `workflow_execution_logs` | n8n tracking | All |
| `tasks` | Task automation | All |
| `task_logs` | Task audit | All |
| `api_metrics` | Performance tracking | All |
| `businesses` | Business registry | All |
| `google_ads_accounts` | Ads account config | BOO, Teelixir, RHF |
| `google_ads_campaign_metrics` | Campaign data | BOO, Teelixir, RHF |
| `google_ads_keyword_metrics` | Keyword data | BOO, Teelixir, RHF |
| `google_ads_search_terms` | Search term data | BOO, Teelixir, RHF |
| `google_ads_opportunities` | AI opportunities | BOO, Teelixir, RHF |
| `google_ads_alerts` | Anomaly alerts | BOO, Teelixir, RHF |
| `hubspot_sync_log` | CRM sync tracking | All |
| `smartlead_campaigns` | Cold outreach | Teelixir |
| `smartlead_leads` | Lead tracking | Teelixir |
| `smartlead_engagement` | Email engagement | Teelixir |

### Vault Credentials (15)
```
global/n8n_url, global/n8n_api_key
global/hubspot_access_token, global/hubspot_secret
global/smartlead_api_key
global/google_ads_client_id, global/google_ads_client_secret
global/google_gsc_refresh_token
global/gmail_user, global/gmail_app_password
global/aws_access_key_id, global/aws_secret_access_key
global/do_api_token
global/master_supabase_url, global/master_supabase_service_role_key
```

---

## 6. AGENT INFRASTRUCTURE

### Tables (Prepared, Limited Use)
| Table | Purpose | Status |
|-------|---------|--------|
| `lighthouse_audits` | Performance audits | Ready |
| `theme_changes` | Theme modifications | Ready |
| `accessibility_audits` | WCAG compliance | Ready |
| `seo_implementation_tasks` | SEO work items | Ready |
| `deployment_history` | Deployment records | Ready |
| `agent_activity_log` | Agent operations | Ready |
| `performance_trends` | Historical trends | Ready |
| `performance_alerts` | Performance issues | Ready |
| `performance_budgets` | Thresholds | Ready |

---

## Quick Reference: Table → Business

| Table Prefix | Business |
|--------------|----------|
| `bc_*` | Buy Organics Online |
| `supplier_*` | Buy Organics Online |
| `livechat_*` | Buy Organics Online |
| `checkout_*` | Buy Organics Online |
| `gsc_*` | All (primarily BOO) |
| `tlx_*` | Teelixir |
| `trial_*` | Elevate Wholesale |
| `prospecting_*` | Elevate Wholesale |
| `wc_*` | Red Hill Fresh |
| `rhf_*` | Red Hill Fresh |
| `google_ads_*` | BOO, Teelixir, RHF |
| `google_merchant_*` | BOO |
| `hubspot_*` | All |
| `smartlead_*` | Teelixir |
| `integration_*` | All (shared) |
| `workflow_*` | All (shared) |
| `task*` | All (shared) |
| `api_*` | All (shared) |
| `secure_*` | All (vault) |

---

## Data Volume Estimates

| Business | Tables | Total Rows | Daily Growth |
|----------|--------|------------|--------------|
| BOO | 15+ | 200,000+ | 500-1,000 |
| Teelixir | 12+ | 70,000+ | 100-500 |
| Elevate | 8+ | 5,000+ | 50-100 |
| RHF | 10+ | TBD | TBD |
| Shared | 20+ | 50,000+ | 500-1,000 |

**Total:** ~325,000+ rows, growing 1,000-2,500/day

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
