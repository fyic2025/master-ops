# Supplier API/Integration Findings

**Date:** 2025-11-23
**Source:** AWS EC2 Server (13.55.46.130) - `/var/www/bigcupdate.fyic.com.au/web/`

---

## Summary

After thorough investigation of the AWS EC2 server, I found the actual integration methods for all three suppliers. All methods are **CSV-based**, not traditional REST APIs, but they provide programmatic access to supplier data.

---

## Supplier Integration Details

### 1. Oborne

**Method:** Automated CSV Feed (Email → HTTP Endpoint)

**CSV URL:** `http://bigcupdate.fyic.com.au/oborne_new.csv`

**How it works:**
1. Oborne sends automated NetSuite exports via email to `kylie@buyorganicsonline.com.au`
2. Email automation (IMAP script on EC2) extracts CSV attachment from `sent-via.netsuite.com` emails
3. CSV is saved to public HTTP endpoint
4. Script can fetch CSV directly from URL

**Code Reference:** `ec2-source-code/Oborne.php` (lines 1119-1200)

**CSV Columns:**
- Brand
- Name (supplier SKU)
- Display Name
- W/S ex gst (cost price)
- RRP
- GST Status
- Availability ('In Stock', 'Out of Stock')
- To Be Discontinued ('Yes', 'No')
- Barcode
- size

**Expected Products:** ~1,823

---

### 2. Kadac

**Method:** Direct API CSV Download

**API URL:** `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv`

**Authentication:** UID parameter in URL (`d83f42d2f1224d94856ea35c4323a94d`)

**Code Reference:** `ec2-source-code/SupplierFactory.php` (line 22)

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

---

### 3. UHP

**Method:** HTTPS Login + CSV Download

**Login URL:** `https://shop.uhp.com.au/login`

**Export URL:** `https://shop.uhp.com.au/uhp_products_export.php`

**Credentials:**
- Email: `sales@buyorganicsonline.com.au`
- Password: `10386`

**How it works:**
1. Perform HTTP login to UHP website
2. Maintain session cookies
3. Download CSV from export endpoint

**Note:** UHP used to have a direct API endpoint (`http://shop.uhp.com.au/uhp_products_export.php?format=csv&accno=10386&cuid=BUYORO0102`) but it was disabled. Now requires login.

**Code Reference:** 
- `ec2-source-code/SupplierFactory.php` (line 19-20, commented URL)
- `sync-uhp-to-supabase.ts` (full implementation)

**CSV Columns:**
- SKU
- Description
- Brand
- Barcode
- Size
- Price (cost price/wholesale)
- RRP
- In Stock ('Y'/'N')
- Tax ('Y'/'N' for GST)
- Imageurl

**Expected Products:** ~1,102

---

## Scripts Status

### ✅ Updated Scripts

1. **sync-oborne-to-supabase.ts**
   - Changed from local file to HTTP download
   - URL: `http://bigcupdate.fyic.com.au/oborne_new.csv`
   - Status: Ready to run

2. **sync-kadac-to-supabase.ts**
   - Updated with actual API URL
   - URL: `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv`
   - Status: Ready to run

3. **sync-uhp-to-supabase.ts**
   - Already implemented with login automation
   - Status: Ready to run

---

## Running the Syncs

### 1. Oborne Sync
```bash
cd c:\Users\jayso\master-ops\buy-organics-online
npx tsx sync-oborne-to-supabase.ts
```

Expected result: ~1,823 products synced

### 2. Kadac Sync
```bash
cd c:\Users\jayso\master-ops\buy-organics-online
npx tsx sync-kadac-to-supabase.ts
```

Expected result: ~945 products synced

### 3. UHP Sync
```bash
cd c:\Users\jayso\master-ops\buy-organics-online
npx tsx sync-uhp-to-supabase.ts
```

Expected result: ~1,102 products synced

### 4. Link Products to Suppliers
```bash
cd c:\Users\jayso\master-ops\buy-organics-online
npx tsx link-products-to-suppliers.ts
```

Expected result: ~3,000-5,000 product-supplier links created

---

## Terminology Clarification

**"API Access" vs CSV Files:**

When the user mentioned "API access," they were referring to **programmatic access** to supplier data, which includes:

1. **Oborne:** HTTP-accessible CSV endpoint (auto-updated via email)
2. **Kadac:** Direct CSV API endpoint with UID authentication
3. **UHP:** Web-based CSV export (requires login)

All three methods are CSV-based rather than JSON REST APIs, but they provide automated, programmatic access to supplier data without manual intervention.

---

## Next Steps

1. ✅ **Supplier sync scripts updated** - All scripts now have correct URLs/methods
2. ⏳ **Run supplier syncs** - Execute all 3 sync scripts
3. ⏳ **Run product linking** - Match BigCommerce products to suppliers
4. ⏳ **Verify data** - Check Supabase for expected product counts
5. 🚀 **Phase 3:** Build pricing/stock update workflows

---

## Files Modified

- [sync-oborne-to-supabase.ts](sync-oborne-to-supabase.ts) - Updated to fetch from HTTP URL
- [sync-kadac-to-supabase.ts](sync-kadac-to-supabase.ts) - Updated with actual API URL
- [sync-uhp-to-supabase.ts](sync-uhp-to-supabase.ts) - Already correct

---

## Source Files Reference

Downloaded from EC2 server for analysis:
- `ec2-source-code/SupplierFactory.php` - **Primary source of truth for URLs**
- `ec2-source-code/Oborne.php` - Email automation implementation
- `ec2-source-code/Kadac.php` - Kadac integration
- `ec2-source-code/Uhp.php` - UHP integration

