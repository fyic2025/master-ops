# Complete Table Inventory - Supabase Expert

> Definitive catalog of all tables, their schemas, relationships, and operational metadata.

---

## Inventory Overview

| Category | Tables | Status |
|----------|--------|--------|
| BOO - Buy Organics Online | 32 | Active |
| Teelixir | 18 | Active |
| Elevate Wholesale | 8 | Active |
| Red Hill Fresh | 16 | Pending Deploy |
| Google Ads / Merchant | 14 | Active |
| SEO Team | 18 | Active |
| Financials / Xero | 12 | Active |
| Dashboard / Monitoring | 12 | Active |
| Shared Infrastructure | 16 | Active |
| Agent Infrastructure | 9 | Prepared |
| Shipping Platform | 6 | Prepared |
| Unleashed-Shopify Sync | 4 | Active |

**Total Tables:** 158+ (from local SQL files)
**Supabase Instance:** `usibnysqelovfuctmkqw.supabase.co`

> **Note:** This inventory reflects tables defined in local SQL migration files.
> The live Supabase database may contain additional tables (possibly 200-500+)
> from other repositories (e.g., Teelixir Leads) or tables created directly
> in the Supabase dashboard. Update this inventory once full database access
> is available to query `pg_tables` directly.

### Complete Table Index (Alphabetical)

```
accessibility_audits       | Agent Infrastructure
account_mappings          | Financials
accounts                  | Financials
agent_activity_log        | Agent Infrastructure
api_metrics               | Shared Infrastructure
api_usage_daily           | Shared Infrastructure
audit_trail               | Financials
automation_logs           | Teelixir
bc_orders                 | BOO
bc_products               | BOO
bigcommerce_api_metrics   | BOO
brand_application_products| Elevate
brand_applications        | Elevate
businesses                | Shared Infrastructure
carrier_configurations    | Shipping Platform
checkout_deployments      | BOO
checkout_error_logs       | BOO
checkout_monitoring_events| BOO
checkout_test_results     | BOO
consolidated_reports      | Financials
customer_activity_log     | Elevate
dashboard_alerts          | Dashboard
dashboard_business_metrics| Dashboard
dashboard_health_checks   | Dashboard
dashboard_job_status      | Dashboard
deployment_history        | Agent Infrastructure
ecommerce_products        | BOO
email_queue               | Elevate
enriched_products         | SEO Team
financial_snapshots       | Financials
google_ads_accounts       | Google Ads
google_ads_agent_tasks    | Google Ads
google_ads_alerts         | Google Ads
google_ads_campaign_metrics| Google Ads
google_ads_change_log     | Google Ads
google_ads_keyword_metrics| Google Ads
google_ads_opportunities  | Google Ads
google_ads_search_terms   | Google Ads
google_ads_sync_log       | Google Ads
google_merchant_account_snapshots| Google Merchant
google_merchant_issue_history| Google Merchant
google_merchant_products  | Google Merchant
gsc_issue_urls            | BOO
gsc_page_daily_stats      | BOO
gsc_sync_logs             | BOO
gtmetrix_tests            | BOO
hubspot_sync_log          | Shared Infrastructure
integration_logs          | Shared Infrastructure
integration_sync_log      | Elevate
intercompany_eliminations | Financials
intercompany_transactions | Financials
journal_lines             | Financials
kadac_products            | BOO (legacy)
kik_products              | BOO (legacy)
klaviyo_profiles          | Teelixir
lighthouse_audits         | Agent Infrastructure
livechat_ai_suggestions   | BOO
livechat_conversations    | BOO
livechat_messages         | BOO
monthly_pnl_snapshots     | Financials
oborne_products           | BOO (legacy)
performance_alerts        | Agent Infrastructure
performance_budgets       | Agent Infrastructure
performance_trends        | Agent Infrastructure
pricing_rules             | BOO
product_matching_rules    | BOO
product_supplier_links    | BOO
products                  | Shared
prospecting_emails        | Elevate
prospecting_queue         | Elevate
prospecting_run_log       | Elevate
rhf_sync_logs             | RHF
schema_version            | Shared Infrastructure
secure_credentials        | Shared Infrastructure
seo_agent_logs            | SEO Team
seo_brands                | SEO Team
seo_categories            | SEO Team
seo_category_suggestions  | SEO Team
seo_competitor_keywords   | SEO Team
seo_content_queue         | SEO Team
seo_gsc_keywords          | SEO Team
seo_gsc_pages             | SEO Team
seo_health_claims         | SEO Team
seo_implementation_tasks  | SEO Team
seo_internal_links        | SEO Team
seo_keyword_cluster_members| SEO Team
seo_keyword_clusters      | SEO Team
seo_keyword_history       | SEO Team
seo_keywords              | SEO Team
seo_product_relationships | SEO Team
seo_products              | SEO Team
seo_products_staging      | SEO Team
seo_pubmed_research       | SEO Team
shared_expense_rules      | Financials
shipping_manifests        | Shipping Platform
shipping_order_items      | Shipping Platform
shipping_orders           | Shipping Platform
shipping_tracking_events  | Shipping Platform
shipping_zone_snapshots   | BOO
smartlead_campaigns       | Teelixir
smartlead_emails          | Teelixir
smartlead_engagement      | Teelixir
smartlead_leads           | Teelixir
smartlead_sync_log        | Teelixir
stock_history             | BOO
supplier_priority_changes | BOO
supplier_products         | BOO
sync_google_ads_metrics   | Dashboard
sync_gtmetrix_metrics     | Dashboard
sync_history              | Financials
sync_integration_logs     | Dashboard
sync_livechat_metrics     | Dashboard
sync_logs                 | Shared Infrastructure
sync_supplier_status      | Dashboard
system_config             | Elevate
task_logs                 | Shared Infrastructure
tasks                     | Shared Infrastructure
theme_changes             | Agent Infrastructure
tlx_automation_config     | Teelixir
tlx_distributor_emails    | Teelixir
tlx_distributor_groups    | Teelixir
tlx_distributor_orders    | Teelixir
tlx_distributor_product_map| Teelixir
tlx_distributors          | Teelixir
tlx_gmail_connections     | Teelixir
tlx_klaviyo_unengaged     | Teelixir
tlx_oos_notes             | Teelixir
tlx_order_line_items      | Teelixir
tlx_po_emails             | Teelixir
tlx_product_groups        | Teelixir
tlx_products              | Teelixir
tlx_sync_log              | Teelixir
tlx_winback_emails        | Teelixir
trial_customers           | Elevate
uhp_products              | BOO (legacy)
unleashed_shopify_bundle_mappings| Unleashed-Shopify
unleashed_shopify_sku_mappings| Unleashed-Shopify
unleashed_shopify_sync_log| Unleashed-Shopify
unleashed_shopify_synced_orders| Unleashed-Shopify
wc_categories             | RHF
wc_coupons                | RHF
wc_customers              | RHF
wc_order_line_items       | RHF
wc_order_notes            | RHF
wc_orders                 | RHF
wc_payment_gateways       | RHF
wc_product_attribute_terms| RHF
wc_product_attributes     | RHF
wc_product_variations     | RHF
wc_products               | RHF
wc_shipping_zone_locations| RHF
wc_shipping_zone_methods  | RHF
wc_shipping_zones         | RHF
wc_tags                   | RHF
wc_tax_rates              | RHF
workflow_execution_logs   | Shared Infrastructure
xero_organizations        | Financials
xero_tokens               | Financials
```

---

## 1. BOO - BUY ORGANICS ONLINE

### supplier_products
**Purpose:** Central supplier inventory from all 4 suppliers
**Status:** ✅ Active | **Rows:** ~3,800 | **Sync:** Every 2 hours

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| supplier_name | text | NO | 'Oborne', 'UHP', 'Kadac', 'GlobalNature' |
| supplier_sku | text | NO | Supplier's product code |
| product_name | text | YES | Product title |
| stock_level | integer | YES | Available quantity |
| price | numeric | YES | Cost price from supplier |
| rrp | numeric | YES | Recommended retail price |
| barcode | text | YES | EAN/UPC |
| category | text | YES | Supplier category |
| last_synced_at | timestamptz | NO | Last sync timestamp |
| created_at | timestamptz | NO | Record creation |
| updated_at | timestamptz | NO | Last update |

**Indexes:**
- `idx_supplier_products_supplier` ON (supplier_name)
- `idx_supplier_products_sku` ON (supplier_name, supplier_sku) UNIQUE
- `idx_supplier_products_barcode` ON (barcode)

**RLS:** Enabled | **Service Role:** Full access

---

### bc_products
**Purpose:** BigCommerce product catalog mirror
**Status:** ✅ Active | **Rows:** 11,357 | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | BigCommerce product ID |
| sku | text | NO | Product SKU |
| name | text | NO | Product name |
| description | text | YES | HTML description |
| price | numeric | NO | Selling price |
| cost_price | numeric | YES | Cost from supplier |
| stock_level | integer | NO | Current inventory |
| is_visible | boolean | NO | Visible on storefront |
| categories | jsonb | YES | Category IDs array |
| brand_id | integer | YES | Brand reference |
| weight | numeric | YES | Shipping weight |
| created_at | timestamptz | NO | BC created date |
| updated_at | timestamptz | NO | BC updated date |
| last_synced_at | timestamptz | NO | Supabase sync time |

**Indexes:**
- PRIMARY KEY (id)
- `idx_bc_products_sku` ON (sku) UNIQUE
- `idx_bc_products_stock` ON (stock_level)
- `idx_bc_products_visible` ON (is_visible)

---

### bc_orders
**Purpose:** BigCommerce order history
**Status:** ✅ Active | **Rows:** 157,000+ | **Sync:** Hourly

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | integer | NO | BigCommerce order ID |
| customer_id | integer | YES | Customer reference |
| status_id | integer | NO | Order status |
| date_created | timestamptz | NO | Order date |
| total_inc_tax | numeric | NO | Order total |
| items_total | integer | NO | Line item count |
| payment_method | text | YES | Payment type |
| shipping_method | text | YES | Shipping carrier |
| customer_email | text | YES | Customer email |
| customer_name | text | YES | Customer name |
| shipping_address | jsonb | YES | Delivery address |
| last_synced_at | timestamptz | NO | Sync timestamp |

**Indexes:**
- PRIMARY KEY (id)
- `idx_bc_orders_customer` ON (customer_id)
- `idx_bc_orders_date` ON (date_created)
- `idx_bc_orders_status` ON (status_id)

---

### product_supplier_links
**Purpose:** Maps BigCommerce products to supplier products
**Status:** ✅ Active | **Rows:** ~5,000 | **Sync:** On demand

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| bc_product_id | integer | NO | FK to bc_products |
| supplier_product_id | uuid | NO | FK to supplier_products |
| is_primary | boolean | NO | Primary supplier flag |
| margin_percent | numeric | YES | Calculated margin |
| created_at | timestamptz | NO | Link created |
| updated_at | timestamptz | NO | Link updated |

**Indexes:**
- `idx_psl_bc` ON (bc_product_id)
- `idx_psl_supplier` ON (supplier_product_id)
- UNIQUE (bc_product_id, supplier_product_id)

---

### checkout_errors
**Purpose:** Track checkout failures for analysis
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Real-time

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| session_id | text | YES | Browser session |
| error_type | text | NO | Error category |
| error_message | text | NO | Full error text |
| cart_contents | jsonb | YES | Cart at time of error |
| customer_id | integer | YES | Customer if logged in |
| ip_address | text | YES | Client IP |
| user_agent | text | YES | Browser info |
| created_at | timestamptz | NO | Error timestamp |

---

### livechat_conversations
**Purpose:** LiveChat conversation tracking
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Real-time

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | text | NO | LiveChat conversation ID |
| visitor_name | text | YES | Customer name |
| visitor_email | text | YES | Customer email |
| started_at | timestamptz | NO | Conversation start |
| ended_at | timestamptz | YES | Conversation end |
| status | text | NO | 'active', 'closed' |
| rating | integer | YES | 1-5 rating |
| tags | text[] | YES | Applied tags |
| agent_id | text | YES | Assigned agent |
| summary | text | YES | AI-generated summary |

---

### livechat_messages
**Purpose:** Individual chat messages
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Real-time

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | text | NO | Message ID |
| conversation_id | text | NO | FK to conversations |
| author_type | text | NO | 'customer', 'agent' |
| text | text | NO | Message content |
| created_at | timestamptz | NO | Message time |

---

### livechat_ai_suggestions
**Purpose:** AI-generated reply suggestions
**Status:** ✅ Active | **Rows:** Growing | **Sync:** On demand

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| conversation_id | text | NO | FK to conversations |
| message_id | text | YES | Triggering message |
| suggestion | text | NO | AI suggestion |
| confidence | numeric | YES | 0-1 confidence |
| was_used | boolean | NO | Agent used it |
| created_at | timestamptz | NO | Generation time |

---

### google_merchant_products
**Purpose:** Google Merchant Center feed status
**Status:** ✅ Active | **Rows:** 11,357 | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | text | NO | GMC product ID |
| bc_product_id | integer | NO | FK to bc_products |
| title | text | NO | Feed title |
| status | text | NO | 'approved', 'disapproved' |
| item_issues | jsonb | YES | Disapproval reasons |
| clicks | integer | YES | 7-day clicks |
| impressions | integer | YES | 7-day impressions |
| last_synced_at | timestamptz | NO | Sync time |

---

### gsc_page_performance
**Purpose:** Google Search Console page data
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| page_url | text | NO | Page URL |
| date | date | NO | Data date |
| clicks | integer | NO | Search clicks |
| impressions | integer | NO | Search impressions |
| ctr | numeric | YES | Click-through rate |
| position | numeric | YES | Average position |

---

### gsc_issues
**Purpose:** GSC indexing issues
**Status:** ✅ Active | **Rows:** Variable | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| issue_type | text | NO | Issue category |
| affected_urls | text[] | YES | URLs with issue |
| severity | text | NO | 'error', 'warning' |
| first_detected | timestamptz | NO | When found |
| last_checked | timestamptz | NO | Last verification |
| is_resolved | boolean | NO | Resolution status |

---

## 2. TEELIXIR

### tlx_products
**Purpose:** Teelixir product catalog
**Status:** ✅ Active | **Rows:** ~100 | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| shopify_id | text | NO | Shopify product ID |
| unleashed_code | text | YES | Unleashed SKU |
| name | text | NO | Product name |
| product_group | text | YES | Group for rollup |
| price | numeric | NO | Retail price |
| wholesale_price | numeric | YES | B2B price |
| stock_level | integer | YES | Current stock |
| is_active | boolean | NO | Active status |
| last_synced_at | timestamptz | NO | Sync time |

---

### tlx_product_groups
**Purpose:** Group variants for reporting
**Status:** ✅ Active | **Rows:** ~50 | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| group_name | text | NO | Display name |
| category | text | YES | Product category |
| products_count | integer | YES | Variant count |

---

### tlx_distributors
**Purpose:** B2B distributor accounts
**Status:** ✅ Active | **Rows:** 1,000+ | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| unleashed_id | text | NO | Unleashed customer ID |
| name | text | NO | Company name |
| contact_email | text | YES | Primary email |
| group_id | uuid | YES | FK to distributor_groups |
| state | text | YES | AU state |
| total_orders | integer | YES | Order count |
| total_revenue | numeric | YES | Lifetime revenue |
| last_order_date | date | YES | Most recent order |
| account_status | text | YES | 'active', 'inactive' |
| last_synced_at | timestamptz | NO | Sync time |

---

### tlx_distributor_orders
**Purpose:** B2B sales orders from Unleashed
**Status:** ✅ Active | **Rows:** 10,000+ | **Sync:** Hourly

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| unleashed_id | text | NO | Unleashed order ID |
| distributor_id | uuid | NO | FK to distributors |
| order_date | date | NO | Order date |
| total | numeric | NO | Order total |
| status | text | NO | Order status |
| has_oos_notes | boolean | YES | Contains OOS mention |
| created_at | timestamptz | NO | Record created |

---

### tlx_order_line_items
**Purpose:** Order line details
**Status:** ✅ Active | **Rows:** 50,000+ | **Sync:** Hourly

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| order_id | uuid | NO | FK to orders |
| product_id | uuid | YES | FK to products |
| product_code | text | NO | SKU |
| quantity | integer | NO | Ordered qty |
| unit_price | numeric | NO | Unit price |
| line_total | numeric | NO | Line total |

---

### tlx_oos_notes
**Purpose:** Out-of-stock mentions from orders
**Status:** ✅ Active | **Rows:** Variable | **Sync:** On order sync

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| order_id | uuid | NO | FK to orders |
| product_code | text | YES | Affected product |
| note_text | text | NO | Full note text |
| note_type | text | NO | 'oos', 'discontinued', 'backorder' |
| created_at | timestamptz | NO | Detected time |

---

### tlx_distributor_groups
**Purpose:** Major distributor groupings
**Status:** ✅ Active | **Rows:** 13 | **Sync:** Static

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| group_name | text | NO | 'Oborne VIC', 'Vitalus', etc. |
| region | text | YES | Geographic region |
| distributor_count | integer | YES | Member count |

---

### tlx_klaviyo_unengaged
**Purpose:** Winback campaign target pool
**Status:** ✅ Active | **Rows:** Variable | **Sync:** Weekly

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| klaviyo_id | text | NO | Klaviyo profile ID |
| email | text | NO | Email address |
| first_name | text | YES | First name |
| last_name | text | YES | Last name |
| last_order_date | date | YES | Last purchase |
| total_orders | integer | YES | Purchase count |
| lifetime_value | numeric | YES | Total spent |
| added_at | timestamptz | NO | Added to pool |
| excluded | boolean | NO | Excluded from sends |

---

### tlx_winback_emails
**Purpose:** Winback email tracking
**Status:** ✅ Active | **Rows:** Growing | **Sync:** On send

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| profile_id | uuid | NO | FK to klaviyo_unengaged |
| email | text | NO | Recipient email |
| sent_at | timestamptz | YES | Send timestamp |
| status | text | NO | 'pending', 'sent', 'failed' |
| discount_code | text | YES | MISSYOU40 |
| converted | boolean | NO | Used discount |
| conversion_date | date | YES | When converted |
| conversion_value | numeric | YES | Order value |
| error_message | text | YES | If failed |

---

### tlx_automation_config
**Purpose:** Automation settings
**Status:** ✅ Active | **Rows:** 5-10 | **Sync:** On change

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| automation_type | text | NO | 'winback', 'distributor_sync' |
| enabled | boolean | NO | Active status |
| config | jsonb | NO | Type-specific settings |
| last_run_at | timestamptz | YES | Last execution |
| updated_at | timestamptz | NO | Config updated |

---

### tlx_sync_log
**Purpose:** Sync audit trail
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Every sync

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| sync_type | text | NO | 'products', 'orders', etc. |
| status | text | NO | 'success', 'error' |
| records_processed | integer | YES | Count processed |
| duration_ms | integer | YES | Duration |
| error_message | text | YES | If error |
| created_at | timestamptz | NO | Sync time |

---

## 3. ELEVATE WHOLESALE

### trial_customers
**Purpose:** B2B trial account tracking
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Real-time

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| email | text | NO | Business email |
| company_name | text | NO | Company name |
| contact_name | text | YES | Primary contact |
| phone | text | YES | Phone number |
| trial_start_date | date | NO | Trial start |
| trial_end_date | date | NO | Trial end |
| trial_status | text | NO | 'active', 'expired', 'converted' |
| discount_code | text | YES | Trial discount |
| shopify_customer_id | text | YES | Shopify ID |
| hubspot_contact_id | text | YES | HubSpot ID |
| source | text | YES | Lead source |
| created_at | timestamptz | NO | Record created |

---

### customer_activity_log
**Purpose:** Track customer actions
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Real-time

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| customer_id | uuid | NO | FK to trial_customers |
| activity_type | text | NO | 'login', 'order', 'browse' |
| activity_details | jsonb | YES | Type-specific data |
| created_at | timestamptz | NO | Activity time |

---

### prospecting_queue
**Purpose:** Outreach target queue
**Status:** ✅ Active | **Rows:** Variable | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| business_name | text | NO | Target company |
| contact_email | text | NO | Email address |
| contact_name | text | YES | Contact name |
| category | text | YES | 'beauty', 'fitness' |
| status | text | NO | 'pending', 'sent', 'responded' |
| priority_score | integer | YES | 1-100 priority |
| source | text | YES | Data source |
| created_at | timestamptz | NO | Added to queue |

---

### prospecting_emails
**Purpose:** Outreach email tracking
**Status:** ✅ Active | **Rows:** Growing | **Sync:** On send

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| prospect_id | uuid | NO | FK to prospecting_queue |
| email_type | text | NO | 'initial', 'follow_up' |
| sent_at | timestamptz | YES | Send time |
| opened | boolean | NO | Was opened |
| clicked | boolean | NO | Had clicks |
| replied | boolean | NO | Got reply |
| bounced | boolean | NO | Hard bounce |

---

### prospecting_run_log
**Purpose:** Daily batch run history
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Daily

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| run_date | date | NO | Run date |
| prospects_processed | integer | YES | Count processed |
| emails_sent | integer | YES | Emails sent |
| errors | integer | YES | Error count |
| duration_ms | integer | YES | Run duration |
| created_at | timestamptz | NO | Run start |

---

### email_queue
**Purpose:** Outbound email queue
**Status:** ✅ Active | **Rows:** Variable | **Sync:** Hourly

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| to_email | text | NO | Recipient |
| template_id | text | NO | Email template |
| template_data | jsonb | YES | Merge fields |
| status | text | NO | 'queued', 'sent', 'failed' |
| scheduled_for | timestamptz | YES | Send time |
| sent_at | timestamptz | YES | Actual send |
| error_message | text | YES | If failed |

---

### integration_sync_log
**Purpose:** Integration audit trail
**Status:** ✅ Active | **Rows:** Growing | **Sync:** Per sync

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| integration | text | NO | 'shopify', 'hubspot' |
| operation | text | NO | 'sync', 'create', 'update' |
| status | text | NO | 'success', 'error' |
| records_affected | integer | YES | Count |
| details | jsonb | YES | Operation details |
| created_at | timestamptz | NO | Operation time |

---

### system_config
**Purpose:** System configuration
**Status:** ✅ Active | **Rows:** 10-20 | **Sync:** On change

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| config_key | text | NO | Setting name |
| config_value | jsonb | NO | Setting value |
| description | text | YES | Documentation |
| updated_at | timestamptz | NO | Last change |

---

## 4. RED HILL FRESH (Pre-deployment)

### wc_products
**Purpose:** WooCommerce product catalog
**Status:** ⏳ Pending | **Schema:** Ready

| Column | Type | Description |
|--------|------|-------------|
| id | integer | WooCommerce product ID |
| sku | text | Product SKU |
| name | text | Product name |
| price | numeric | Selling price |
| stock_quantity | integer | Available stock |
| stock_status | text | 'instock', 'outofstock' |
| is_visible | boolean | Published status |
| categories | jsonb | Category IDs |
| last_synced_at | timestamptz | Sync time |

---

### wc_orders
**Purpose:** WooCommerce order history
**Status:** ⏳ Pending | **Schema:** Ready

| Column | Type | Description |
|--------|------|-------------|
| id | integer | WooCommerce order ID |
| status | text | Order status |
| date_created | timestamptz | Order date |
| total | numeric | Order total |
| customer_id | integer | Customer reference |
| delivery_date | date | Scheduled delivery |
| delivery_zone | text | Zone reference |
| items | jsonb | Line items |

---

### wc_customers
**Purpose:** WooCommerce customer base
**Status:** ⏳ Pending | **Schema:** Ready

| Column | Type | Description |
|--------|------|-------------|
| id | integer | WooCommerce customer ID |
| email | text | Customer email |
| first_name | text | First name |
| last_name | text | Last name |
| phone | text | Phone |
| address | jsonb | Address details |
| total_orders | integer | Order count |

---

### wc_shipping_zones
**Purpose:** Delivery zone configuration
**Status:** ⏳ Pending | **Schema:** Ready

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Zone ID |
| name | text | Zone name |
| postcodes | text[] | Covered postcodes |
| delivery_days | text[] | Available days |
| delivery_fee | numeric | Zone fee |

---

## 5. SHARED INFRASTRUCTURE

### secure_credentials
**Purpose:** Encrypted credential vault
**Status:** ✅ Active | **Rows:** 76

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project | text | 'boo', 'teelixir', etc. |
| credential_name | text | Key name |
| encrypted_value | text | AES-256-CBC encrypted |
| last_updated_at | timestamptz | Last rotation |

---

### integration_logs
**Purpose:** Cross-business logging
**Status:** ✅ Active | **Rows:** Growing

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| source | text | Service name |
| business_id | text | Business slug |
| action | text | Operation type |
| status | text | 'success', 'error', 'warning' |
| details_json | jsonb | Structured details |
| error_message | text | If error |
| created_at | timestamptz | Log time |

---

### workflow_execution_logs
**Purpose:** n8n workflow tracking
**Status:** ✅ Active | **Rows:** Growing

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| workflow_id | text | n8n workflow ID |
| workflow_name | text | Workflow name |
| business_id | text | Business slug |
| status | text | 'success', 'error' |
| started_at | timestamptz | Start time |
| finished_at | timestamptz | End time |
| execution_data | jsonb | Input/output data |
| error_message | text | If error |

---

### tasks
**Purpose:** Task automation queue
**Status:** ✅ Active | **Rows:** Variable

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_type | text | Task category |
| business_id | text | Target business |
| status | text | 'pending', 'running', 'complete' |
| payload | jsonb | Task data |
| scheduled_for | timestamptz | Execution time |
| completed_at | timestamptz | Completion time |
| result | jsonb | Task result |

---

### api_metrics
**Purpose:** API performance tracking
**Status:** ✅ Active | **Rows:** Growing

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| service | text | API service |
| endpoint | text | Endpoint path |
| method | text | HTTP method |
| status_code | integer | Response code |
| duration_ms | integer | Response time |
| recorded_at | timestamptz | Request time |

---

### businesses
**Purpose:** Business registry
**Status:** ⏳ Needs Deploy | **Schema:** Ready

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| slug | text | 'boo', 'teelixir', etc. |
| name | text | Display name |
| platform | text | 'bigcommerce', 'shopify' |
| domain | text | Primary domain |
| is_active | boolean | Active status |
| config | jsonb | Business config |

---

## 6. GOOGLE ADS (Shared)

### google_ads_accounts
**Purpose:** Ads account configuration
**Status:** ✅ Active

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| business_id | text | Business slug |
| customer_id | text | Google Ads ID |
| account_name | text | Display name |
| is_active | boolean | Active status |
| last_synced_at | timestamptz | Sync time |

---

### google_ads_campaign_metrics
**Purpose:** Daily campaign performance
**Status:** ✅ Active

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| account_id | uuid | FK to accounts |
| campaign_id | text | Google campaign ID |
| date | date | Metric date |
| impressions | integer | Impressions |
| clicks | integer | Clicks |
| cost | numeric | Spend |
| conversions | numeric | Conversions |
| conversion_value | numeric | Revenue |

---

### google_ads_opportunities
**Purpose:** AI optimization recommendations
**Status:** ✅ Active

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| account_id | uuid | FK to accounts |
| opportunity_type | text | Recommendation type |
| description | text | What to do |
| impact_estimate | jsonb | Expected impact |
| status | text | 'pending', 'applied', 'dismissed' |
| created_at | timestamptz | Discovery time |

---

## Quick Reference: Finding Tables

```sql
-- Find all tables for a business
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'bc_%'      -- BOO
    OR tablename LIKE 'supplier_%'
    OR tablename LIKE 'tlx_%'     -- Teelixir
    OR tablename LIKE 'trial_%'   -- Elevate
    OR tablename LIKE 'wc_%');    -- RHF

-- Find table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as data_size,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Find tables with RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
**Total Tables Documented:** 50+

