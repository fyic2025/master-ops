# Supplier API/Integration Findings (CORRECTED)

**Date:** 2025-11-23
**Source:** AWS EC2 Server (13.55.46.130) + Previous Analysis

---

## ⚠️ IMPORTANT CORRECTION: Oborne = CH2 FTP Access

**CH2** (the company that acquired Oborne) provides **direct FTP access** to Oborne's product catalog and inventory data.

---

## Summary

All three suppliers provide **programmatic access** to their product data:

1. **Oborne** → FTP from CH2 (parent company)
2. **Kadac** → Direct CSV API
3. **UHP** → HTTPS download (XLSX format)

---

## Supplier Integration Details

### 1. Oborne (via CH2 FTP) ⭐ BEST METHOD

**Method:** FTP download from CH2

**CH2 = Company that purchased/owns Oborne**

**FTP Credentials:**
```
Host: ftp3.ch2.net.au
User: retail_310
Password: am2SH6wWevAY&#+Q
```

**Files to Download:**
1. `prod_retail_310/inventory.csv` - Stock levels by branch (Branch 310)
2. `prod_retail_product/products.csv` - Full product catalog

**Format:** Pipe-delimited CSV (`|`)

**Process:**
1. Connect to CH2 FTP server
2. Download both CSV files
3. Parse with pipe delimiter
4. Join products with inventory by product ID
5. Transform to supplier_products format

**Data Fields:**

**Products CSV:**
- `id` - Internal product ID (for joining)
- `name` - Product name
- `brand` - Brand name
- `oborne_sku` - Oborne SKU identifier
- `upccode` - Barcode
- `baseprice` - Wholesale price ex GST
- `rrp` - Recommended retail price
- `taxschedule` - Tax info
- `obsolete` - Product status

**Inventory CSV:**
- `id` - Product ID (matches products.id)
- `branch` - Branch code (310)
- `availablequantity` - Stock quantity

**Transformed Output:**
```javascript
{
  supplier_name: 'Oborne',
  supplier_sku: oborne_sku,
  barcode: upccode,
  product_name: name,
  brand: brand,
  cost_price: baseprice,
  rrp: rrp,
  stock_level: availablequantity,
  metadata: {
    oborne_id: id,
    availability: availablequantity > 0 ? 'In Stock' : 'Out of Stock'
  }
}
```

**Expected Products:** ~1,823

**Sync Frequency:** Every 2 hours (recommended)

**Code Reference:** [oborne.helper.js](ec2-2-source-code/helpers/oborne.helper.js) (lines 259-358)

---

### 2. Kadac

**Method:** Direct API CSV Download

**API URL:** `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv`

**Authentication:** UID parameter in URL

**Format:** Standard comma-delimited CSV

**CSV Columns:**
- sku
- description
- brand
- barcode
- size
- wholesale (cost price)
- rrp
- stockstatus ('available', 'outofstock', 'deleted', 'discontinued')
- gst ('Y'/'N')
- imageurl

**Expected Products:** ~945

**Code Reference:** [SupplierFactory.php](ec2-source-code/SupplierFactory.php) (line 22)

---

### 3. UHP

**Method:** HTTPS Download (XLSX format)

**URL:** `https://www.uhp.com.au/media/wysiwyg/uhp_products_export.xlsx`

**Format:** Excel (.xlsx) file

**Process:**
1. Download XLSX file
2. Convert to CSV
3. Parse and transform

**CSV Columns:** 34 fields including:
- Stockcode (SKU)
- Brand
- Description
- Size
- W/S ex GST (wholesale price)
- RRP
- MOQ (minimum order quantity)
- APN Barcode
- IsActive, InStock, New, OnDeal, Clearance
- Certification flags (Organic, GlutenFree, Vegan, etc.)
- Images

**Expected Products:** ~1,102

**Code Reference:** [uhp.helper.js](ec2-2-source-code/helpers/uhp.helper.js)

---

## Scripts Status

### ✅ Updated Scripts

1. **sync-oborne-to-supabase-ftp.ts** ⭐ NEW - RECOMMENDED
   - Uses FTP from CH2 (ftp3.ch2.net.au)
   - Downloads both products and inventory CSVs
   - Joins data and syncs to Supabase
   - **Status:** Ready to run

2. **sync-oborne-to-supabase.ts** (Fallback)
   - Uses HTTP endpoint (bigcupdate.fyic.com.au)
   - Requires email automation to be running
   - **Status:** Works but FTP is better

3. **sync-kadac-to-supabase.ts**
   - Updated with actual API URL
   - **Status:** Ready to run

4. **sync-uhp-to-supabase.ts**
   - Already correct (HTTPS download)
   - **Status:** Ready to run

---

## Running the Syncs

### 1. Oborne Sync (FTP - RECOMMENDED)
```bash
cd c:\Users\jayso\master-ops\buy-organics-online
npx tsx sync-oborne-to-supabase-ftp.ts
```

Expected result: ~1,823 products synced directly from CH2 FTP

### 2. Kadac Sync
```bash
npx tsx sync-kadac-to-supabase.ts
```

Expected result: ~945 products synced

### 3. UHP Sync
```bash
npx tsx sync-uhp-to-supabase.ts
```

Expected result: ~1,102 products synced

### 4. Link Products to Suppliers
```bash
npx tsx link-products-to-suppliers.ts
```

Expected result: ~3,000-5,000 product-supplier links created

---

## Why FTP for Oborne is Better

**Old Method (HTTP endpoint):**
- Relies on email automation running on EC2
- Requires IMAP connection to Gmail
- CSV updated only when email arrives
- Additional point of failure

**New Method (FTP from CH2):**
- Direct access to CH2's systems
- Real-time product and inventory data
- No email dependency
- More reliable and faster
- Includes actual stock quantities (not just "In Stock"/"Out of Stock")

---

## CH2 Background

**CH2** is the company that acquired Oborne. They provide FTP access to their retail partners (like BOO) to download:
- Product catalog
- Live inventory levels
- Price updates

This is the **same data source** Oborne uses internally, giving you direct access without intermediaries.

---

## Next Steps

1. ✅ **FTP-based Oborne script created** - sync-oborne-to-supabase-ftp.ts
2. ⏳ **Run supplier syncs** - Use the FTP version for Oborne
3. ⏳ **Run product linking** - Match BigCommerce products to suppliers
4. ⏳ **Verify data** - Check Supabase for expected product counts
5. 🚀 **Phase 3:** Build pricing/stock update workflows

---

## Files Created/Modified

- [sync-oborne-to-supabase-ftp.ts](sync-oborne-to-supabase-ftp.ts) - ⭐ NEW FTP version
- [sync-oborne-to-supabase.ts](sync-oborne-to-supabase.ts) - HTTP fallback version
- [sync-kadac-to-supabase.ts](sync-kadac-to-supabase.ts) - Updated with API URL
- [sync-uhp-to-supabase.ts](sync-uhp-to-supabase.ts) - Already correct

