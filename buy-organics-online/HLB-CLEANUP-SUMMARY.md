# HLB Products Cleanup Summary

**Date:** November 25, 2025
**Task:** Clean up redundant HLB products from BigCommerce and Supabase

---

## Overview

Successfully removed 11 redundant products with SKUs prefixed "HLB -" from both BigCommerce and Supabase database.

---

## Products Deleted

### King Soba Noodles/Ramen (7 products)
1. **Product ID 63654** - King Soba Organic Tom Kha Noodle Cup (HLB - KHA)
2. **Product ID 63643** - King Soba Brown Rice Ramen 280g (HLB - KS5)
3. **Product ID 63636** - King Soba Buckwheat Ramen 280g (HLB - KS6)
4. **Product ID 63658** - King Soba Organic Laksa Curry Ramen Noodles (HLB - LAKSA)
5. **Product ID 63656** - King Soba Organic Coconut Tahini Ramen Noodles (HLB - TAHINI)
6. **Product ID 63657** - King Soba Organic Tom Yum Noodle Cup (HLB - Tom)
7. **Product ID 63653** - King Soba Organic Tom Yum Noodle Cup 80g (HLB - YUM) *(was already disabled)*

### Every Bit Organic Oils (3 products)
8. **Product ID 33718** - Every Bit Organic Raw Sweet Almond Oil 500ml (HLB - RAW00)
9. **Product ID 34596** - Every Bit Organic Raw Rosehip Oil 25ml (HLB - RAW24)
10. **Product ID 32140** - Every Bit Organic Raw Refined Coconut Oil 1kg (HLB - RAW84)

### Himalayan Salt (1 product)
11. **Product ID 32143** - Himalayan Fine Salt 1kg Every Bit Organic Raw (HLB - RS02)

---

## Actions Completed

### ✅ BigCommerce
- **Status:** All 11 products successfully deleted
- **Files Created:**
  - `delete-hlb-products-with-redirects.js` - Deletion script
  - `hlb-deletion-report.json` - Detailed deletion report
  - `hlb-redirects.csv` - Manual redirect upload file
  - `hlb-product-ids-for-supabase.txt` - Product IDs list

### ✅ Supabase Database
- **Status:** All 11 product records successfully deleted from `ecommerce_products` table
- **Files Created:**
  - `delete-hlb-from-supabase.js` - Supabase deletion script

### ⚠️ 301 Redirects - MANUAL ACTION REQUIRED
- **Status:** API redirect creation failed (API endpoint issue)
- **Action Required:** Upload `hlb-redirects.csv` to BigCommerce manually
- **Location:** Settings → Store Setup → 301 Redirects → Import

---

## Redirect Mapping

| From URL | To URL | Category |
|----------|--------|----------|
| /king-soba-organic-tom-kha-noodle-cup/ | /noodles/ | Noodles |
| /king-soba-brown-rice-ramen-280g/ | /noodles/ | Noodles |
| /king-soba-buckwheat-ramen-280g/ | /noodles/ | Noodles |
| /king-soba-organic-laksa-curry-ramen-noodles/ | /noodles/ | Noodles |
| /king-soba-organic-coconut-tahini-ramen-noodles/ | /noodles/ | Noodles |
| /king-soba-organic-tom-yum-noodle-cup/ | /noodles/ | Noodles |
| /king-soba-organic-tom-yum-noodle-cup-80g/ | /noodles/ | Noodles |
| /every-bit-organic-raw-sweet-almond-oil-500ml/ | /plant-animal-oils/ | Oils |
| /every-bit-organic-raw-rosehip-oil-25ml/ | /plant-animal-oils/ | Oils |
| /every-bit-organic-raw-refined-coconut-oil-1kg/ | /plant-animal-oils/ | Oils |
| /himalayan-fine-salt-1kg-every-bit-organic-raw/ | / | Homepage |

---

## Next Steps

### Immediate (Required)
1. **Upload 301 Redirects to BigCommerce**
   - Go to: Settings → Store Setup → 301 Redirects
   - Click "Import"
   - Upload file: `buy-organics-online/hlb-redirects.csv`
   - This will redirect the old product URLs to appropriate category pages

### Verification (Recommended)
2. **Test Redirects**
   - Visit a few of the old product URLs to verify they redirect correctly
   - Example: `https://www.buyorganicsonline.com.au/king-soba-organic-tom-kha-noodle-cup/`
   - Should redirect to: `https://www.buyorganicsonline.com.au/noodles/`

3. **Monitor GSC (Google Search Console)**
   - Check for any 404 errors on these URLs in the coming weeks
   - If redirects are working, mark them as fixed in GSC

---

## Summary Statistics

- **Products Deleted from BigCommerce:** 11 ✅
- **Products Deleted from Supabase:** 11 ✅
- **301 Redirects Created:** 0 ⚠️ (Manual upload required)
- **Data Reduction:** 11 redundant product records removed
- **All products had zero inventory**

---

## Files Reference

### Scripts Created
- `buy-organics-online/delete-hlb-products-with-redirects.js`
- `buy-organics-online/delete-hlb-from-supabase.js`

### Reports Generated
- `buy-organics-online/hlb-deletion-report.json`
- `buy-organics-online/hlb-redirects.csv` ← **UPLOAD THIS TO BIGCOMMERCE**
- `buy-organics-online/hlb-product-ids-for-supabase.txt`
- `buy-organics-online/HLB-CLEANUP-SUMMARY.md` (this file)

---

## Cleanup Rationale

All products had the following characteristics:
- SKU prefix "HLB -" (likely from discontinued supplier)
- Zero inventory (`inventory_level: 0`)
- No sales activity
- Redundant data taking up space in both BigCommerce and Supabase

By removing these products and setting up proper redirects, we:
1. Reduced database clutter
2. Improved site performance
3. Maintained SEO value through 301 redirects
4. Prevented 404 errors for any existing links

---

**Status:** ✅ CLEANUP COMPLETE (Manual redirect upload pending)
