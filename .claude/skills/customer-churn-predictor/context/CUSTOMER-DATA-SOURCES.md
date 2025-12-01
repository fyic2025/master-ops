# Customer Data Sources

All customer data tables and sources for churn prediction.

## Teelixir (Master Supabase)

### tlx_shopify_orders
Primary order history - 30,661 orders, 3-year history.

| Column | Type | Description |
|--------|------|-------------|
| shopify_order_id | text | Unique order ID |
| customer_email | text | Customer email |
| customer_first_name | text | First name |
| processed_at | timestamptz | Order date |
| total_price | decimal | Order total |
| financial_status | text | paid, refunded, etc |
| customer_order_sequence | int | 1st, 2nd, 3rd order |
| is_first_order | boolean | First purchase flag |
| days_since_previous_order | int | Gap between orders |

### tlx_reorder_timing
Product reorder patterns for prediction.

| Column | Type | Description |
|--------|------|-------------|
| product_type | text | Product category |
| product_size_grams | int | Product size |
| avg_days_to_reorder | decimal | Average reorder days |
| email_send_day | int | Days before to send email |
| confidence | text | high/medium/low |

### tlx_klaviyo_unengaged
Customers in Klaviyo unengaged segment.

| Column | Type | Description |
|--------|------|-------------|
| email | text | Customer email |
| first_name | text | First name |
| last_order_date | date | Last purchase |
| total_orders | int | Order count |
| synced_at | timestamptz | Last sync |

### tlx_winback_emails
Winback campaign tracking.

| Column | Type | Description |
|--------|------|-------------|
| email | text | Customer email |
| sent_at | timestamptz | Email sent time |
| clicked_at | timestamptz | Link clicked |
| converted_at | timestamptz | Order placed |
| status | text | sent/clicked/converted |

---

## Elevate Wholesale (Master Supabase)

### trial_customers
B2B trial accounts.

| Column | Type | Description |
|--------|------|-------------|
| email | text | Customer email |
| firstname | text | First name |
| business_name | text | Company name |
| trial_status | text | pending/active/converted/expired |
| trial_start_date | date | Trial start |
| trial_end_date | date | Trial expiry |
| login_count | int | Site logins |
| order_count | int | Orders placed |
| total_order_value | decimal | Total spent |
| last_login_at | timestamptz | Last activity |

### customer_activity_log
All customer events.

| Column | Type | Description |
|--------|------|-------------|
| customer_id | uuid | Customer FK |
| event_type | text | login/order/email/etc |
| event_description | text | Event details |
| created_at | timestamptz | Event time |

---

## BOO (BOO Supabase)

### ecommerce_products
Product catalog with customer purchase data.

| Column | Type | Description |
|--------|------|-------------|
| bc_product_id | int | BigCommerce ID |
| name | text | Product name |
| primary_supplier | text | Supplier name |
| inventory_level | int | Stock level |

### bc_orders
BigCommerce order history.

| Column | Type | Description |
|--------|------|-------------|
| bc_order_id | int | Order ID |
| customer_email | text | Customer email |
| total | decimal | Order total |
| status | text | Order status |
| created_at | timestamptz | Order date |

---

## RHF (Master Supabase)

### wc_customers
WooCommerce customer profiles.

| Column | Type | Description |
|--------|------|-------------|
| wc_customer_id | int | WC customer ID |
| email | text | Customer email |
| first_name | text | First name |
| is_paying_customer | boolean | Has ordered |
| meta_data | jsonb | Custom fields |

### wc_orders
WooCommerce order history.

| Column | Type | Description |
|--------|------|-------------|
| wc_order_id | int | Order ID |
| customer_id | int | Customer FK |
| total | decimal | Order total |
| status | text | Order status |
| date_created | timestamptz | Order date |

---

## Environment Variables

```env
# Master Supabase (Teelixir, Elevate, RHF)
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# BOO Supabase
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Klaviyo (engagement data)
TEELIXIR_KLAVIYO_API_KEY=pk_xxx
```

---

## Key Queries

### Customer Last Order (Teelixir)
```sql
SELECT customer_email, MAX(processed_at) AS last_order
FROM tlx_shopify_orders
WHERE financial_status = 'paid'
GROUP BY customer_email;
```

### Trial Engagement (Elevate)
```sql
SELECT email, trial_status, login_count, order_count,
  EXTRACT(DAYS FROM now() - trial_start_date) AS days_in_trial
FROM trial_customers
WHERE trial_status NOT IN ('deactivated', 'converted');
```

### At-Risk Customers
```sql
SELECT email, days_since_order, order_count, total_spent
FROM v_customer_churn_risk
WHERE churn_probability >= 0.6
ORDER BY churn_probability DESC;
```
