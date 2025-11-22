# Business Logic Summary - HubSpot Integration

## Data Source Classification

### Teelixir Shopify (teelixir-au.myshopify.com)
- **Type:** B2C Only (Retail consumers)
- **Sync to HubSpot:**
  - `contact_type` = "customer"
  - `wholesale_account` = false
  - `source_business` = "teelixir"
  - `shopify_customer_id` = [Shopify ID]
- **Note:** These orders also sync to Unleashed automatically

### Teelixir Unleashed
- **Type:** Mixed (B2C + B2B)
- **B2C Orders:** Synced from Shopify (duplicates)
- **B2B Orders:** Distributors and wholesale customers (non-Shopify)
- **Sync Strategy:**
  - Check if contact has `shopify_customer_id` in HubSpot
  - If YES → B2C customer (skip contact creation, only sync order)
  - If NO → B2B customer (create as distributor/wholesale)
- **B2B Sync to HubSpot:**
  - `contact_type` = "distributor" or "stockist"
  - `wholesale_account` = true
  - `source_business` = "teelixir"
  - `unleashed_customer_code` = [Unleashed code]
  - `shopify_customer_id` = NULL

### Elevate Wholesale Shopify (elevatewholesale.myshopify.com)
- **Type:** B2B Only (Wholesale buyers)
- **Sync to HubSpot:**
  - `contact_type` = "distributor"
  - `wholesale_account` = true
  - `source_business` = "elevate"
  - `shopify_customer_id` = [Shopify ID]

---

## HubSpot Segmentation

### Teelixir B2C (Retail Customers)
```
Filters:
- source_business = "teelixir"
- shopify_customer_id IS KNOWN
- wholesale_account = false
```

### Teelixir B2B (Distributors/Wholesale)
```
Filters:
- source_business = "teelixir"
- unleashed_customer_code IS KNOWN
- shopify_customer_id IS UNKNOWN
- wholesale_account = true
```

### Elevate B2B (Wholesale Platform)
```
Filters:
- source_business = "elevate"
- wholesale_account = true
```

### All B2B Customers (Across Both Brands)
```
Filters:
- wholesale_account = true
```

### Ambassador Prospects
```
Filters:
- contact_type = "ambassador"
- ambassador_status = "prospect"
- source_business = "teelixir"
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ TEELIXIR ECOSYSTEM                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Shopify (B2C)          Unleashed (B2C + B2B)                  │
│  ├─ Retail customers    ├─ Shopify-synced (B2C)               │
│  └─ Direct orders       └─ Direct orders (B2B)                 │
│         │                        │                              │
│         │                        │                              │
│         ▼                        ▼                              │
│    ┌─────────────────────────────────┐                         │
│    │         HubSpot CRM             │                         │
│    ├─────────────────────────────────┤                         │
│    │ Contacts with:                  │                         │
│    │ • shopify_customer_id (B2C)     │                         │
│    │ • unleashed_customer_code (B2B) │                         │
│    └─────────────────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ELEVATE WHOLESALE ECOSYSTEM                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Shopify (B2B)                                                  │
│  ├─ Wholesale customers                                         │
│  └─ Bulk orders                                                 │
│         │                                                       │
│         ▼                                                       │
│    ┌─────────────────────────────────┐                         │
│    │         HubSpot CRM             │                         │
│    ├─────────────────────────────────┤                         │
│    │ Contacts with:                  │                         │
│    │ • source_business = "elevate"   │                         │
│    │ • wholesale_account = true      │                         │
│    └─────────────────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ambassador Program Flow

### Application Source
- **Form:** https://teelixir.com.au/pages/teelixir-wholesale-support
- **Webhook:** Shopify customer creation with "wholesale" tag

### Journey
1. **Application** → Shopify customer created
2. **Webhook triggers** → n8n "Ambassador Application Handler"
3. **HubSpot contact created:**
   - `contact_type` = "ambassador"
   - `ambassador_status` = "prospect"
   - `source_business` = "teelixir"
4. **HubSpot deal created:**
   - Pipeline: "Ambassador Application Pipeline"
   - Stage: "Application Received"
5. **Team notified** → Slack alert
6. **Manual review** → Approve/reject in HubSpot
7. **On approval:**
   - Update `ambassador_status` = "active"
   - Grant access to Elevate Wholesale
   - Create discount code
   - Add to Klaviyo "Ambassador Program" segment

---

## Deduplication Strategy

### Priority Order (Source of Truth)
1. **Shopify** (primary for B2C contacts)
2. **Unleashed** (secondary for B2B-only contacts)
3. **Manual entry** (lowest priority)

### Matching Logic
When syncing from Unleashed:
```javascript
// Check if customer already exists from Shopify
const existingContact = await hubspotClient.search.contacts([
  {
    filters: [
      { propertyName: 'email', operator: 'EQ', value: customer.email }
    ]
  }
])

if (existingContact.total > 0 && existingContact.results[0].properties.shopify_customer_id) {
  // This is a B2C customer from Shopify
  // Don't create duplicate contact
  // Only sync the order as a deal
} else {
  // This is a B2B customer (doesn't exist in Shopify)
  // Create as distributor/wholesale contact
}
```

---

## Custom Property Usage Guide

### Contact Properties

**Identity Fields:**
- `shopify_customer_id` - Present if customer came from Shopify (B2C)
- `unleashed_customer_code` - Present if customer came from Unleashed (B2B)
- `klaviyo_subscriber_id` - Email subscriber tracking

**Classification Fields:**
- `contact_type` - "customer" (B2C) | "distributor" | "stockist" | "ambassador"
- `source_business` - "teelixir" | "elevate" | "boo" | "rhf"
- `wholesale_account` - true (B2B) | false (B2C)

**Ambassador Fields:**
- `ambassador_status` - "prospect" | "active" | "inactive" | "churned"
- `ambassador_tier` - "tier_1" | "tier_2" | "tier_3" | "vip"
- `application_date` - Date applied
- `approval_date` - Date approved
- `commission_rate` - Percentage rate
- `territory` - Geographic region

**Engagement Fields:**
- `engagement_score` - Calculated 0-100
- `last_campaign_engagement` - Last interaction date
- `campaign_opens_30d` - Opens in last 30 days
- `campaign_clicks_30d` - Clicks in last 30 days

**Shopify Sync Fields:**
- `shopify_total_spent` - Lifetime spend
- `shopify_order_count` - Total orders
- `shopify_customer_status` - "enabled" | "disabled" | "invited"

### Company Properties

**Classification Fields:**
- `company_type` - "distributor" | "stockist" | "retail_partner" | "supplier"
- `source_business` - "teelixir" | "elevate" | "boo" | "rhf"
- `account_status` - "prospect" | "active" | "inactive" | "suspended"

**B2B Fields:**
- `wholesale_discount_tier` - "tier_1" | "tier_2" | "tier_3" | "custom"
- `minimum_order_value` - AUD amount
- `payment_terms` - "Net 30" | "COD" | "Credit Card"
- `tax_id` - Australian Business Number (ABN)
- `preferred_delivery_schedule` - Day/time preferences

**Sync Fields:**
- `shopify_company_id` - For Elevate customers
- `unleashed_customer_code` - For B2B customers

### Deal Properties

**Classification Fields:**
- `deal_source` - "website_form" | "email_inquiry" | "referral" | "shopify_order"
- `source_business` - "teelixir" | "elevate" | "boo" | "rhf"

**Order Tracking:**
- `shopify_order_id` - Order ID from Shopify
- `shopify_order_name` - Order name (e.g., "#1001")
- `unleashed_order_id` - Sales order GUID
- `unleashed_order_number` - Order number
- `order_total` - Total order value
- `products_ordered` - JSON or text list

**Status Fields:**
- `fulfillment_status` - "pending" | "processing" | "shipped" | "delivered" | "cancelled"
- `payment_status` - "pending" | "partial" | "paid" | "refunded"

---

## Workflow Execution Order

### Real-time (Webhook-triggered)
1. **Shopify customer created** → "Shopify Customer Sync"
2. **Shopify order created** → "Shopify Order Sync"
3. **Ambassador application** → "Ambassador Application Handler"

### Scheduled (Polling)
1. **Hourly:** Unleashed order sync (once credentials available)
2. **Daily:** Engagement score calculation
3. **Weekly:** Ambassador performance tracking
4. **Weekly:** Data quality cleanup

---

## Implementation Status

### ✅ Phase 1 Complete (Shopify + HubSpot)
- Extended HubSpot connector (Deals, Associations, Batch, Search APIs)
- Supabase sync tracking schema
- 44 custom HubSpot properties defined
- 3 n8n workflows (customer sync, order sync, ambassador handler)
- Webhook registration automation
- Comprehensive documentation

### ⏳ Phase 2 Pending (Unleashed Integration)
- **Blocker:** Need Unleashed API credentials
- **Ready to build:** Connector exists, workflow templates ready
- **Logic defined:** B2C/B2B deduplication strategy documented

### ⏳ Phase 3 Pending (Klaviyo Integration)
- **Blocker:** Need Klaviyo API key
- **Purpose:** Email engagement tracking, list management

### ⏳ Phase 4 Pending (Smartlead Integration)
- **Blocker:** Need Smartlead API key
- **Purpose:** Cold outreach campaign management

---

## Next Steps

1. **Deploy Phase 1:**
   ```bash
   # Deploy Supabase schema
   # Run: infra/supabase/schema-hubspot-sync.sql

   # Create HubSpot properties
   npx tsx scripts/setup-hubspot-properties.ts

   # Import n8n workflows
   # Upload: infra/n8n-workflows/templates/*.json

   # Register webhooks
   npx tsx scripts/register-shopify-webhooks.ts
   ```

2. **Obtain Missing Credentials:**
   - Unleashed API ID and Key
   - Klaviyo API Key (optional)
   - Smartlead API Key (optional)

3. **Build Phase 2 (Unleashed):**
   - Create Unleashed connector (code exists)
   - Build "Unleashed Customer Sync" workflow
   - Build "Unleashed Order Sync" workflow
   - Implement B2C/B2B deduplication logic

4. **Monitor & Optimize:**
   - Track sync success rates in Supabase
   - Review HubSpot data quality
   - Adjust ambassador pipeline stages
   - Optimize engagement scoring formula

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Status:** Phase 1 Complete, Ready for Deployment
