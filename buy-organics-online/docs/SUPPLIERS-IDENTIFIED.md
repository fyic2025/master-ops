# Buy Organics Online - Suppliers Identified

**Date:** 2025-11-22
**Database:** c7c7buyorgdnxtl1 @ newsync6

---

## 🎯 Summary

**8 Active Suppliers** feeding ~27,000 products to Buy Organics Online

---

## 📊 Supplier Breakdown

### 1. **Obourne Health** (LARGEST - 16,735 products - 62% of inventory)

**Table:** `supplier_5f60cbb9e9dc5`
**Feed Type:** CSV (Remote URL)
**Feed URL:** `http://bigcupdate.fyic.com.au/oborne_new.csv`
**Encoding:** Windows-1252
**Visit URL:** https://www.obornehealth.com.au/

**Key Fields:**
- `brand` - Brand name
- `name` - Product SKU
- `display_name` - Product description
- `ws_ex_gst` - Wholesale price (ex GST)
- `rrp` - Recommended retail price
- `gst_status` - GST applies/exempt
- `availability` - In Stock / Out of Stock
- `to_be_discontinued` - Yes/No
- `barcode` - Product barcode (EAN/UPC)
- `size` - Product size/variant

**Business Rules:**
- GST Rule: `gst_status:GST applies`
- Available Expression: `availability:In Stock`
- Discontinued: `to_be_discontinued:Yes`
- Carton Only: `wholesale>rrp` (when wholesale higher than RRP)

---

### 2. **UHP** (5,472 products - 20%)

**Table:** `supplier_5f60e3088f652`
**Feed Type:** CSV (Remote URL)
**Feed URL:** `http://bigcupdate.fyic.com.au/uhp_prods.csv`
**Encoding:** ISO-8859-1

**Key Fields:** (37 columns - most complex feed!)
- Standard fields: barcode, brand, description, price, rrp, size, sku
- Availability: `in_stock` (Y/N)
- Tax status: `tax` (Y/N)
- Active status: `isactive` (Y/N)

**Business Rules:**
- GST Rule: `tax:Y`
- Available: `in_stock:Y`
- Discontinued: `isactive:N`
- Carton Only: `price>rrp`

---

### 3. **GlobalNature** (3,245 products - 12%)

**Table:** `supplier_5f60ac25ed34e`
**Feed Type:** CSV (Remote URL)
**Feed URL:** `http://bigcupdate.fyic.com.au/globalnature_new.csv`
**Encoding:** Windows-1252
**Visit URL:** https://www.globalbynature.com.au/products/{{sku}}

**Key Fields:**
- barcode, brand, description, stockstatus, wholesale, rrp, size, item_code (sku)

**Business Rules:**
- GST Rule: `gst:Y`
- Available: `stockstatus:available`
- Carton Only: `cartononly:Y`

---

### 4. **Kadac** (1,235 products - 4.5%)

**Table:** `supplier_5f60c4e0c0a1a`
**Feed Type:** CSV (API URL with UID)
**Feed URL:** `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv`
**Encoding:** Windows-1252
**Visit URL:** https://www.kadac.com.au/retailer-zone/product.php?sku={{sku}}

**Key Fields:**
- barcode, brand, description, stockstatus, wholesale, rrp, size, sku

**Business Rules:**
- GST Rule: `gst:Y`
- Available: `stockstatus:available`
- Discontinued: `stockstatus:deleted|stockstatus:discontinued`
- Carton Only: `cartononly:Y|wholesale>rrp`

---

### 5. **LateralFoods / LFC** (308 products - 1%)

**Table:** `supplier_5f60f3f78ba75`
**Feed Type:** CSV (Local File)
**Feed Path:** `/app/public/feeds/LateralFoodFinal.csv`
**Encoding:** Windows-1252

**Key Fields:**
- barcode, brand, product (description), ws_ex_gst, rrp_w_gst, size, sku

**Business Rules:**
- GST Rule: `gst:Y`
- Name Rule: `brand+product+type+size` (composite name)

**Note:** Local feed - likely uploaded manually or via SFTP

---

### 6. **Martin & Pleasance** (97 products - 0.4%)

**Table:** `supplier_5f60f84d103c7`
**Feed Type:** CSV (Local File)
**Feed Path:** `/app/public/feeds/MPSKU.csv`
**Encoding:** Windows-1252

**Key Fields:**
- barcodes, brand_name, product, stock_with_supplier, price, rrp, size, sku

**Business Rules:**
- GST Rule: `plus_gst:value*100` (dynamic GST calculation)
- Available: `stock_with_supplier:IN STOCK|stock_with_supplier:value>10`
- Discontinued: `stock_with_supplier:~OOS`

**Note:** Uses stock quantity threshold (>10 units) for availability

---

### 7. **CustomSupplier** (81 products - 0.3%)

**Table:** `supplier_5fbd02db9b5a6`
**Feed Type:** CSV (Local File)
**Feed Path:** `/app/public/feeds/customfeeds.csv`
**Encoding:** Windows-1252

**Key Fields:**
- barcode, brand, name, in_stock, wholesale, rrp, sku, size

**Business Rules:**
- Available: `in_stock:TRUE`

---

### 8. **EdenHealth** (22 products - 0.1%)

**Table:** `supplier_5f61f5100c4f0`
**Feed Type:** CSV (Local File)
**Feed Path:** `/app/public/feeds/EdenHealth.csv`
**Encoding:** Windows-1252

**Key Fields:**
- ean_number (barcode), assignee (brand), product_name, availability, price, size, sku

**Business Rules:**
- Available: `availability:Y`
- Discontinued: `availability:N`

---

## 📡 Feed Delivery Methods

### Remote CSV URLs (4 suppliers - ~26,700 products - 99%)

These are fetched via HTTP:

1. **Obourne:** `http://bigcupdate.fyic.com.au/oborne_new.csv`
2. **UHP:** `http://bigcupdate.fyic.com.au/uhp_prods.csv`
3. **GlobalNature:** `http://bigcupdate.fyic.com.au/globalnature_new.csv`
4. **Kadac:** `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv`

**Note:** First 3 feeds are hosted on `bigcupdate.fyic.com.au` - likely the EC2 instance or a custom aggregation service

### Local CSV Files (4 suppliers - ~500 products - 1%)

These are stored locally in `/app/public/feeds/`:

1. **LateralFoods:** `LateralFoodFinal.csv`
2. **Martin & Pleasance:** `MPSKU.csv`
3. **EdenHealth:** `EdenHealth.csv`
4. **CustomSupplier:** `customfeeds.csv`

**Note:** Likely uploaded manually, via SFTP, or email attachment processing

---

## 🔄 Sync Process (Inferred)

### Step 1: Download/Load Feeds
```bash
# Remote feeds
curl http://bigcupdate.fyic.com.au/oborne_new.csv > /tmp/oborne.csv

# Local feeds (already present)
/app/public/feeds/LateralFoodFinal.csv
```

### Step 2: Parse & Import to Supplier Tables
```sql
TRUNCATE TABLE supplier_5f60cbb9e9dc5;
LOAD DATA LOCAL INFILE '/tmp/oborne.csv'
INTO TABLE supplier_5f60cbb9e9dc5
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
IGNORE 1 LINES;
```

### Step 3: Barcode Matching & Grouping
```sql
-- Group products by barcode
INSERT INTO w_checked_barcodes_group (barcode, uniqcode, size)
SELECT DISTINCT barcode, UUID(), size
FROM supplier_5f60cbb9e9dc5
WHERE barcode IS NOT NULL;
```

### Step 4: Link to BigCommerce Products
```sql
-- Create or update product links
INSERT INTO w_link_to_feed (prod_id, feed_id, barcode_feed, sku_feed, brand_feed)
SELECT bc.id, 28, s.barcode, s.name, s.brand
FROM supplier_5f60cbb9e9dc5 s
LEFT JOIN wp_prods_check bc ON bc.barcode_feed = s.barcode;
```

### Step 5: Update Live Product Status
```sql
-- Update prices and inventory
UPDATE wp_prods_check wp
JOIN supplier_5f60cbb9e9dc5 s ON wp.barcode_feed = s.barcode
SET
  wp.live_price = CALCULATE_PRICE(s.ws_ex_gst),
  wp.live_retail_price = s.rrp,
  wp.inventory_level = IF(s.availability = 'In Stock', 999, 0),
  wp.is_visible = IF(s.availability = 'In Stock', 'true', 'false');
```

### Step 6: Push to BigCommerce API
```php
// (Cron job script - location unknown)
$products = query("SELECT * FROM wp_prods_check WHERE updatable_by_sync = 'true'");

foreach ($products as $product) {
  bigcommerceApi->updateProduct($product->id_prod, [
    'price' => $product->live_price,
    'inventory_level' => $product->inventory_level,
    'is_visible' => $product->is_visible == 'true',
  ]);
}
```

---

## 🛠 Migration Strategy

### Phase 1: Recreate Feed Download (n8n)

**Create 8 n8n workflows** (one per supplier):

#### Remote Feeds (HTTP Fetch)
```
Schedule Trigger (daily 6am)
  → HTTP Request (download CSV)
  → CSV Parser
  → Supabase: Upsert to supplier table
  → Log result
```

#### Local Feeds (Manual Upload)
```
Webhook Trigger (/upload-feed/lateralfoods)
  → File Upload Handler
  → CSV Parser
  → Supabase: Upsert to supplier table
  → Notify admin
```

### Phase 2: Barcode Matching Engine (Supabase Function)

```sql
CREATE OR REPLACE FUNCTION match_products_by_barcode()
RETURNS void AS $$
BEGIN
  -- Group all supplier products by barcode
  TRUNCATE boo_product_groups;

  INSERT INTO boo_product_groups (barcode, group_id, size_variants)
  SELECT
    barcode,
    uuid_generate_v4(),
    jsonb_agg(DISTINCT size)
  FROM (
    SELECT barcode, size FROM supplier_obourne
    UNION
    SELECT barcode, size FROM supplier_uhp
    UNION
    SELECT barcode, size FROM supplier_globalnature
    -- ... etc
  ) all_products
  WHERE barcode IS NOT NULL
  GROUP BY barcode;
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: BigCommerce Sync (n8n)

```
Schedule Trigger (every 4 hours)
  → Supabase: Get updated products
  → For Each Product:
    → Calculate Price (markup rules)
    → Check Inventory (supplier availability)
    → BigCommerce API: Update Product
    → Log sync status
  → Send summary report
```

---

## 🔐 Security Notes

### Credentials to Migrate

1. **Kadac API UID:** `d83f42d2f1224d94856ea35c4323a94d`
2. **Custom feed upload credentials** (if SFTP/FTP)
3. **BigCommerce API tokens** (already have in .env)

### Access to `bigcupdate.fyic.com.au`

This domain hosts 3 of 4 remote feeds. Need to identify:
- Is this the EC2 instance `13.55.46.130`?
- Are feeds generated dynamically or static CSV files?
- Can we migrate to direct supplier feeds?

---

## 📦 Next Actions

1. ✅ **Database discovered**
2. ✅ **Suppliers identified**
3. ⏳ **Export sample product data** (verify pricing logic)
4. ⏳ **SSH into EC2** (`13.55.46.130`) to find cron jobs
5. ⏳ **Map `bigcupdate.fyic.com.au`** to EC2 or separate service
6. ⏳ **Test feed downloads** (verify CSV URLs still work)
7. ⏳ **Document pricing formulas** (ws_ex_gst → live_price calculation)

---

**Status:** Supplier discovery complete. Ready to map sync logic and cron jobs.

**Next Step:** Need SSH access to EC2 instances to find sync scripts.
