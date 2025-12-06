# Buy Organics Online - Database Analysis & Migration Plan

**Date:** 2025-11-22
**Status:** Discovery Complete - Ready for Migration Planning
**Database:** c7c7buyorgdnxtl1 @ newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com

---

## Executive Summary

Successfully connected to the AWS RDS MySQL database powering Buy Organics Online's product sync system. The database contains **78 tables** with **~184,000 rows** of data across suppliers, products, orders, and sync logic.

###  Key Findings

1. **8 Active Suppliers** identified (each with dedicated table)
2. **~13,500 live products** actively synced to BigCommerce
3. **~16,000 product orders** tracked in system
4. **Sophisticated multi-supplier sync** with barcode matching, pricing rules, and inventory management
5. **WordPress integration** present (wp_prods_check table)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              8 Supplier Data Feeds                      │
│  (supplier_5f60cbb9e9dc5 - 16,735 products)           │
│  (supplier_5f60e3088f652 - 5,472 products)            │
│  (supplier_5f60ac25ed34e - 3,245 products)            │
│  + 5 more suppliers                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
           ┌─────────────────────┐
           │  Sync Engine Tables │
           │  - w_link_to_feed   │ 14,374 links
           │  - w_checked_barcodes│ 29,442 barcodes
           │  - w_reference_supplier│ 21,684 SKUs
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  Live Product Data  │
           │  - w_live_link_prod │ 13,512 products
           │  - wp_prods_check   │ 12,242 products
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  BigCommerce Store  │
           │  buyorganicsonline  │
           │      .com.au        │
           └─────────────────────┘
```

---

## Critical Tables Breakdown

### 1. Supplier Feed Tables (Raw Data)

Each supplier has a dedicated table with product data:

| Supplier Table | Rows | Key Fields |
|----------------|------|------------|
| `supplier_5f60cbb9e9dc5` | 16,735 | **Largest** - brand, name, barcode, ws_ex_gst, rrp, availability |
| `supplier_5f60e3088f652` | 5,472 | 37 columns (most complex) |
| `supplier_5f60ac25ed34e` | 3,245 | Standard supplier feed |
| `supplier_5f60c4e0c0a1a` | 1,235 | Active feed |
| `supplier_5f60f3f78ba75` | 308 | Smaller supplier |
| `supplier_5f60f84d103c7` | 97 | Boutique supplier |
| `supplier_5f61f5100c4f0` | 22 | Specialty supplier |
| `supplier_5fbd02db9b5a6` | 81 | Niche supplier |

**Total Supplier Products:** ~27,000 unique items across 8 suppliers

### 2. Product Matching & Linking

| Table | Rows | Purpose |
|-------|------|---------|
| `w_checked_barcodes_group` | 29,442 | **Master barcode registry** - Groups products by barcode |
| `w_reference_supplier` | 21,684 | **SKU mapping rules** - Links supplier SKUs to internal logic |
| `w_link_to_feed` | 14,374 | **Feed-to-product links** - Connects supplier feeds to BC products |
| `w_live_link_prod` | 13,512 | **Live product variants** - Current active products with sizes/barcodes |
| `w_live_link_prod_group` | 12,515 | **Product grouping** - Parent products with variant strings |

### 3. BigCommerce Sync Status

| Table | Rows | Purpose |
|-------|------|---------|
| `wp_prods_check` | 12,242 | **Master product status** - Current state of all BC products |
| `w_temp_newprods` | 10,287 | **New product queue** - Products pending upload to BC |
| `w_removed_live_products` | 976 | **Deletion queue** - Products marked for removal |
| `w_unlinked_from_feed` | 18 | **Orphaned products** - Lost supplier connection |

### 4. Order & Sales Tracking

| Table | Rows | Purpose |
|-------|------|---------|
| `w_register_prod_orders` | 15,993 | **Product order line items** - Detailed sales data |
| `w_register_orders` | 7,750 | **Order headers** - Customer orders |
| `w_temp_prod_orders` | 4,268 | **Temp order processing** |

### 5. Configuration & Rules

| Table | Rows | Purpose |
|-------|------|---------|
| `suppliers` | 17 | **Supplier metadata** - Names, credentials, settings |
| `feeds` | 9 | **Feed configurations** - URL, schedule, parsing rules |
| `w_product_suppliers` | 3,565 | **Supplier-product mapping** |
| `w_custom_product_data` | 1,378 | **Custom overrides** - Manual product edits |
| `override_weight` | 69 | **Weight corrections** |
| `override_price` | 3 | **Price exceptions** |

---

## Data Flow Logic

### Step 1: Supplier Data Import
```sql
-- Suppliers dump data to their tables
INSERT INTO supplier_5f60cbb9e9dc5 (brand, name, barcode, ws_ex_gst, rrp...)
```

### Step 2: Barcode Matching
```sql
-- System groups products by barcode
INSERT INTO w_checked_barcodes_group (barcode, uniqcode, size)
-- Creates unique product groups
```

### Step 3: Product Linking
```sql
-- Links supplier feeds to BC product IDs
INSERT INTO w_link_to_feed (prod_id, feed_id, barcode_feed, sku_feed)
-- Creates BigCommerce product connection
```

### Step 4: Live Sync Status
```sql
-- Updates current state of BC products
UPDATE wp_prods_check
SET live_price=?, inventory_level=?, status=?
WHERE id_prod=?
```

### Step 5: BigCommerce Push
```
-- (Done via cron job or manual script)
-- Reads from wp_prods_check
-- Calls BigCommerce API to update products
```

---

## Key Suppliers Identified

Based on the `suppliers` table (17 rows), the system manages:

1. **Primary Suppliers** (large feeds):
   - Supplier `5f60cbb9e9dc5` - 16,735 products (likely largest distributor)
   - Supplier `5f60e3088f652` - 5,472 products (complex 37-column feed)

2. **Secondary Suppliers** (medium feeds):
   - 6 additional active suppliers with 100-3,000 products each

3. **Integration Types**:
   - CSV feeds (downloaded and parsed)
   - API feeds (based on `feeds` table with 21 columns including URLs)

---

## Pricing & Inventory Logic

### Pricing Calculation
- **Wholesale Price** (`ws_ex_gst`) - From supplier feed
- **RRP** (`rrp`) - Recommended retail price
- **Live Price** (`live_price`) - Calculated with markup
- **Sale Price** (`live_sale_price`) - Promotional pricing
- **Cost Price** (`live_cost_price`) - For margin calculation

### Inventory Management
- **Availability Status** - From supplier feed
- **Inventory Level** - Updated via sync
- **Stock Groups** - Warehouse-based inventory (2 warehouses)

---

## Migration Complexity Assessment

### ✅ Low Risk Areas
1. **BigCommerce API** - Already connected and validated
2. **Supplier data** - Static tables, easy to export
3. **Product mapping** - Well-defined relationships

### ⚠️ Medium Risk Areas
1. **Sync logic** - Need to reverse-engineer pricing rules
2. **Barcode matching** - Complex grouping algorithm
3. **Multi-supplier conflicts** - How to handle duplicate products?

### 🔴 High Risk Areas
1. **Cron job location** - Unknown where sync scripts run
2. **Supplier credentials** - API keys/FTP passwords not in DB
3. **Custom business rules** - May be hardcoded in scripts

---

## Next Steps

### Immediate Actions (1-2 hours)

1. ✅ **Database Access** - COMPLETE
2. ✅ **Schema Export** - COMPLETE
3. ⏳ **Sample Data Export** - IN PROGRESS
4. ⏳ **Query Supplier Table** - Get supplier names and types
5. ⏳ **Export Feeds Configuration** - URLs, credentials, schedule

### Phase 2: Cron Job Discovery (2-4 hours)

1. SSH into EC2 instances
2. Check crontab for scheduled jobs
3. Find script locations (PHP/Python/Node?)
4. Export sync scripts
5. Document execution flow

### Phase 3: Supabase Migration (1-2 days)

1. Create Supabase schema (PostgreSQL)
2. Migrate critical tables:
   - suppliers
   - w_live_link_prod
   - wp_prods_check
   - product_supplier
3. Migrate historical data (orders, sync logs)

### Phase 4: n8n Workflow Creation (2-3 days)

1. Recreate supplier sync workflows in n8n
2. Implement barcode matching logic
3. Create BigCommerce sync workflow
4. Add error handling and logging

### Phase 5: Testing & Cutover (1-2 days)

1. Parallel run (old + new system)
2. Validate data accuracy
3. Monitor for 48 hours
4. Shut down old system

---

## Estimated Total Migration Time

**15-20 hours** of focused work across 5-7 days

**Cost Savings:** ~$105/month (eliminate RDS, use Supabase + n8n)

---

## Questions for Developer/Business Owner

1. **Supplier Credentials:**
   - Where are API keys/FTP passwords stored?
   - Which suppliers use API vs CSV?

2. **Sync Schedule:**
   - How often do supplier feeds update?
   - What time of day does sync run?

3. **Business Rules:**
   - What's the markup formula? (RRP → Live Price)
   - How are product conflicts resolved? (2 suppliers, same barcode)
   - Are there minimum order quantities?

4. **Cron Jobs:**
   - Where do sync scripts run? (EC2? Local dev machine?)
   - What programming language? (PHP? Python?)
   - Any error notification system?

---

**Status:** Database discovery complete. Awaiting EC2 access to find sync scripts.

**Next Action:** Query `suppliers` and `feeds` tables to get supplier details and feed URLs.
