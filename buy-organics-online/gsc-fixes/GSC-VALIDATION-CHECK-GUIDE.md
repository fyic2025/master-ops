# GSC Validation Status Check - Priority Actions

**Date:** November 25, 2025
**Store:** Buy Organics Online (www.buyorganicsonline.com.au)

---

## IMMEDIATE ACTION REQUIRED

Based on your GSC screenshot showing 36.6K pages not indexed with only 1.3K indexed, here's what you need to check and do TODAY:

---

## STEP 1: Check 404 Redirect Validation Status

### What to do in GSC:

1. Go to **Google Search Console**
2. Select property: `buyorganicsonline.com.au`
3. Click **Indexing → Pages** (left sidebar)
4. Scroll to "Why pages aren't indexed"
5. Click **"Not found (404)"**

### What to check:

**Current count from screenshot:** 489 pages (Started validation)

**Expected status after Nov 23 redirects:**
- If validation is complete: Count should be ~190-200 (299 fixed)
- If still validating: Count will still show 489 with "Validation started" badge
- If validation failed: Count unchanged + error messages

### Action based on status:

#### Scenario A: Validation Complete (count dropped)
✅ **Success!** The 299 redirects from `complete-404-redirects.csv` worked.

**Next steps:**
1. Export the REMAINING 404 URLs (should be ~190)
2. I'll analyze them and create Batch 2 redirects
3. Focus on Priority 2 (tracking parameters)

#### Scenario B: Still Validating
⏳ **In Progress** - Google is still checking the fixes

**Next steps:**
1. Check again in 24 hours
2. Meanwhile, move to Priority 2 (robots.txt updates)
3. Export Soft 404 and Server Error URLs

#### Scenario C: Validation Not Started OR No Redirects Found
⚠️ **Problem** - The redirects may not have been uploaded to BigCommerce

**Next steps:**
1. Verify if `complete-404-redirects.csv` was actually imported to BigCommerce
2. Go to: **Marketing → Redirects** in BigCommerce
3. Check total redirect count (should be ~23,456 if UHP upload was the latest)
4. If missing: Upload `complete-404-redirects.csv` NOW

---

## STEP 2: Export Soft 404 and Server Error URLs

### Soft 404 (1 page):

1. In GSC → **Indexing → Pages**
2. Click **"Soft 404"** (1 page, Started validation)
3. Click the row to expand
4. **Copy the URL** and paste it here: _______________

### Server Error (1 page):

1. In GSC → **Indexing → Pages**
2. Click **"Server error (5xx)"** (1 page, Started validation)
3. Click the row to expand
4. **Copy the URL** and paste it here: _______________

**I'll create fixes for these 2 URLs once you provide them.**

---

## STEP 3: Check BigCommerce Redirect Count

### Verify redirects were uploaded:

1. Go to **BigCommerce Admin**
2. Navigate to: **Marketing → Redirects**
3. Look at the count at top of page
4. Note the total: _______________

### Expected counts:

| Upload Batch | Date | Redirects Added | Expected Total |
|--------------|------|-----------------|----------------|
| Before UHP cleanup | Pre-Nov 23 | ~22,829 | 22,829 |
| UHP redirects | Nov 25 | +627 | 23,456 |
| 404 redirects | Nov 23? | +299 | 23,755 |

**If your count is:**
- **~23,456** → UHP redirects uploaded, but `complete-404-redirects.csv` NOT uploaded yet
- **~23,755** → Both UHP and 404 redirects uploaded ✅
- **<23,000** → Something went wrong, need to investigate

---

## STEP 4: Priority Quick Wins (Do These Today)

### Quick Win 1: Update robots.txt for Tracking Parameters

**Current issue:** 12,596 pages with tracking parameter duplicates (`sfdr_ptcid`, `sku`, `fullSite`)

**Fix:** Add these lines to your robots.txt

```txt
# Block tracking parameter variations
Disallow: /*?sfdr_ptcid=*
Disallow: /*&sfdr_ptcid=*
Disallow: /*?sfdr_hash=*
Disallow: /*&sfdr_hash=*
Disallow: /*?sku=*
Disallow: /*&sku=*
Disallow: /*?fullSite=*
Disallow: /*&fullSite=*
```

**How to update:**
1. Go to **BigCommerce Admin**
2. **Server Settings → Robots.txt** (or use FTP)
3. Add the 8 lines above to the existing robots.txt
4. Save

**Impact:** Reduces "Alternate page with proper canonical tag" from 12,596 to ~6,000-8,000 over 2-3 months

---

### Quick Win 2: Configure GSC URL Parameters

Tell Google to ignore tracking parameters:

1. Go to **Google Search Console**
2. Click **Settings** (bottom left)
3. Scroll to **Crawl rate**
4. Click **URL Parameters** (if available - this feature may be deprecated)
5. Add these parameters as "Passive" (doesn't change content):
   - `sfdr_ptcid`
   - `sfdr_hash`
   - `sku`
   - `fullSite`

**Note:** If URL Parameters setting is not available, the robots.txt update above will handle it.

---

## STEP 5: Data Collection for Next Steps

### Export "Crawled - currently not indexed" URLs (1,930 pages)

This is for Priority 3 work (next week).

1. Go to GSC → **Indexing → Pages**
2. Click **"Crawled - currently not indexed"** (1,930 pages)
3. Click **Export** (top right)
4. Choose **"Export all 1,930 rows"**
5. Save as: `crawled-not-indexed-2025-11-25.csv`
6. Place in: `c:\Users\jayso\master-ops\buy-organics-online\gsc-fixes\`

**I'll create a script to analyze these and categorize them for cleanup.**

---

## Priority Summary

| Priority | Action | Time Required | Impact |
|----------|--------|---------------|--------|
| 🔴 **URGENT** | Check 404 validation status | 2 min | Know if 299 redirects worked |
| 🔴 **URGENT** | Export Soft 404 + Server Error URLs | 3 min | Fix 2 critical pages |
| 🟡 **HIGH** | Verify BigCommerce redirect count | 2 min | Confirm redirects uploaded |
| 🟡 **HIGH** | Update robots.txt (tracking params) | 5 min | Fix 12,596 duplicates |
| 🟢 **MEDIUM** | Configure GSC URL Parameters | 5 min | Reinforce robots.txt |
| 🟢 **MEDIUM** | Export "Crawled - not indexed" list | 3 min | Prep for Priority 3 |

**Total time:** ~20 minutes

---

## What I Need From You

Please check GSC and provide:

1. ✅ **404 validation status:** [Complete / In Progress / Not Started]
2. ✅ **Current 404 count:** _______________
3. ✅ **Soft 404 URL:** _______________
4. ✅ **Server Error URL:** _______________
5. ✅ **BigCommerce redirect count:** _______________
6. ✅ **Did you upload complete-404-redirects.csv?** [Yes / No / Don't Remember]

---

## Next Steps After Data Collection

### If 404 redirects worked (count dropped):
→ Create Batch 2 redirects for remaining ~190 404s

### If 404 redirects NOT uploaded:
→ Upload `complete-404-redirects.csv` NOW

### For Soft 404 + Server Error:
→ Create specific fixes once I have the URLs

### For tracking parameters:
→ Update robots.txt (you can do this now)

### For crawled-not-indexed:
→ Analyze the export and create redirect batch (Priority 3)

---

## Files You'll Need

All files are in: `c:\Users\jayso\master-ops\buy-organics-online\gsc-fixes\`

- `complete-404-redirects.csv` (299 redirects - may need to upload)
- `FINAL-robots.txt` (updated robots.txt - reference for changes)

## Contact

Once you've collected the data above, paste it back and I'll:
1. Create fixes for the 2 critical URLs
2. Prepare Batch 2 404 redirects
3. Create analysis script for crawled-not-indexed URLs
4. Set up monitoring dashboard

---

**REMEMBER:** The biggest issue is NOT the 14,441 "Blocked by robots.txt" - that's CORRECT and protecting you. Focus on:
1. ✅ Finishing the 404 fixes
2. ✅ Blocking tracking parameters
3. ✅ Fixing the 2 critical pages
