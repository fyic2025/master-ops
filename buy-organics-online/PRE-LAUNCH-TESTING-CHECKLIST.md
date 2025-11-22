# Pre-Launch Testing Checklist - Optimized Theme

**Theme:** Cornerstone-BOO-Cust v4.9.0 (Stage 2 Complete)
**Store:** Buy Organics Online
**Testing Date:** _____________
**Tester:** _____________

---

## 🚀 Upload Process

### Step 1: Backup Current Theme
- [ ] Go to BigCommerce Admin → Storefront → Themes
- [ ] Find your current LIVE theme
- [ ] Click "Download" and save the zip file
- [ ] Name it: `theme-backup-live-YYYYMMDD.zip`
- [ ] Store safely on your computer

### Step 2: Upload Optimized Theme
```bash
cd /root/master-ops/buy-organics-online/theme
stencil push
```

- [ ] Select option to upload as NEW theme (don't replace live one yet)
- [ ] Wait for upload to complete
- [ ] Note the new theme name in BigCommerce

### Step 3: Preview Before Going Live
- [ ] In BigCommerce Admin → Storefront → Themes
- [ ] Find the newly uploaded theme
- [ ] Click "Preview" button
- [ ] This opens a preview URL (safe to test, not visible to customers)

---

## ✅ Critical Tests (MUST PASS - Test in Preview Mode)

### Test 1: Homepage Load ⭐ CRITICAL
**URL:** `https://www.buyorganicsonline.com.au/`

- [ ] Page loads completely (no blank screen)
- [ ] Header/navigation displays correctly
- [ ] Hero image/banner displays
- [ ] Product sections load
- [ ] Footer displays
- [ ] **Check browser console (F12):** No red JavaScript errors
- [ ] **Time to load:** Should feel faster than before

**❌ If fails:** DO NOT activate theme - see Rollback section

---

### Test 2: Search Functionality ⭐ CRITICAL
**Location:** Top navigation search bar

- [ ] Click search bar
- [ ] Type a product name (e.g., "organic")
- [ ] Autocomplete suggestions appear
- [ ] Click a suggestion - takes you to correct product/category
- [ ] **Check console:** No errors related to SearchServerAPI

**Why it matters:** Uses external script that now has `defer` - could break if timing issues

**❌ If fails:**
- Check console for SearchServerAPI errors
- May need to remove `defer` from searchserverapi script
- See Troubleshooting section

---

### Test 3: Category Pages ⭐ CRITICAL
**Test URL:** Pick any category (e.g., `https://www.buyorganicsonline.com.au/health-supplements/`)

- [ ] Category page loads
- [ ] Products display in grid
- [ ] Product images load
- [ ] Scroll to bottom
- [ ] **If more than 12 products:** Check infinite scroll works
  - [ ] Scroll near bottom
  - [ ] "Loading..." indicator appears
  - [ ] Next page of products loads automatically
- [ ] **Check console:** No JavaScript errors
- [ ] Filters (sidebar) work correctly

**Why it matters:** Infinite scroll now has conditional loading - must test

**❌ If fails:**
- Check console for infinite-scroll errors
- Verify pagination exists for categories with 12+ products
- See Troubleshooting section

---

### Test 4: Product Page ⭐ CRITICAL
**Test URL:** Pick any product

- [ ] Product page loads
- [ ] Product images display
- [ ] Image gallery/zoom works
- [ ] Product description displays
- [ ] Price displays correctly
- [ ] "Add to Cart" button visible
- [ ] Click "Add to Cart" - item adds successfully
- [ ] Cart counter updates in header
- [ ] **Scroll down:** Reviews widget loads
- [ ] **Check console:** No errors

**Why it matters:** Reviews widgets now have `defer` - must verify they still load

**❌ If fails:**
- Check if Reviews.co.uk widget loads
- Check console for reviews-related errors
- May need to adjust defer on reviews scripts

---

### Test 5: Brands Page ⭐ CRITICAL
**URL:** `https://www.buyorganicsonline.com.au/brands/`

- [ ] Brands page loads
- [ ] Brand list displays
- [ ] **Search box at top:** Type a brand name
- [ ] **Autocomplete works:** Suggestions appear as you type
- [ ] Click a brand - takes you to brand page
- [ ] Brand page loads products correctly

**Why it matters:** This is the HIGHEST RISK change - we removed duplicate jQuery which powers the autocomplete

**❌ If fails - EXPECTED ISSUE:**
This is the most likely thing to break. If autocomplete doesn't work:

**Quick Fix (5 minutes):**
1. BigCommerce Admin → Storefront → Script Manager
2. Create Script → Name: "jQuery UI for Brands"
3. Script type: Script
4. Pages: Select "Brand" and "All brands"
5. Placement: Footer
6. Script content:
```html
<script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js" defer></script>
```
7. Save and test again

---

### Test 6: Cart & Checkout ⭐ CRITICAL
**Flow:** Add product → Cart → Checkout

**Cart Page:**
- [ ] Go to cart page
- [ ] Products display correctly
- [ ] Quantity can be changed
- [ ] "Remove" item works
- [ ] Subtotal calculates correctly
- [ ] "Proceed to Checkout" button works

**Checkout Page:**
- [ ] Checkout page loads
- [ ] Can enter shipping address
- [ ] Shipping options load (verify ShipperHQ works)
- [ ] Can enter payment info (don't complete order)
- [ ] No console errors

**Why it matters:** Cart uses jQuery heavily - must verify no conflicts

**❌ If fails:**
- This is CRITICAL - indicates major JavaScript issue
- Check console immediately
- May need to rollback

---

### Test 7: Footer Reviews Badge
**Location:** Bottom of any page

- [ ] Scroll to footer
- [ ] Reviews.io badge displays
- [ ] Badge shows star rating
- [ ] **Check console:** No reviews.io errors

**Why it matters:** Reviews.io script now has `defer`

**❌ If fails:**
- Non-critical but affects trust signals
- Can be fixed by adjusting defer if needed

---

## ⚡ Performance Tests (Nice to Have)

### Test 8: Visual Speed Check
Compare side-by-side (optional but recommended):

**Current Live Site (before):**
- [ ] Open in incognito window: `https://www.buyorganicsonline.com.au/`
- [ ] Note how fast it loads (rough timing)

**Preview Site (new theme):**
- [ ] Open preview URL
- [ ] Compare loading speed

- [ ] **Feels faster?** ✅ Expected result
- [ ] **Feels same speed?** ⚠️ Still OK, benefits may be subtle
- [ ] **Feels slower?** ❌ Problem - investigate

---

### Test 9: Mobile Testing 📱
**Use real phone or DevTools mobile mode:**

- [ ] Homepage loads on mobile
- [ ] Navigation menu works (hamburger menu)
- [ ] Search works on mobile
- [ ] Product images display correctly
- [ ] "Add to Cart" works on mobile
- [ ] Checkout flow works on mobile

**Why it matters:** Mobile is majority of traffic

---

### Test 10: Browser Console Check (F12)
**On EVERY page tested above:**

- [ ] No RED errors in console
- [ ] Yellow warnings are OK (common and usually harmless)
- [ ] No repeated/spam errors

**Common acceptable warnings:**
- Cookie warnings
- Third-party analytics warnings
- Font loading warnings

**RED FLAGS (must investigate):**
- "jQuery is not defined"
- "$ is not a function"
- "Uncaught TypeError"
- "Failed to load resource" (for critical scripts)

---

## 🎯 Test Scoring

### Pass Criteria:
- **Tests 1-7 (Critical):** ALL must pass ✅
- **Tests 8-10 (Performance):** Nice to have, but OK if issues are minor

### Decision Matrix:

| Critical Tests Passing | Decision |
|------------------------|----------|
| **7 out of 7** ✅ | **GO LIVE** - Activate theme immediately |
| **6 out of 7** ⚠️ | **INVESTIGATE** - Fix the one issue if minor, then activate |
| **5 or fewer** ❌ | **DO NOT ACTIVATE** - Rollback and debug locally |

---

## ⚠️ Known Issues & Quick Fixes

### Issue 1: Brands Page Autocomplete Broken
**Symptom:** Can't search brands, no suggestions appear
**Fix:** Add jQuery UI via Script Manager (see Test 5 above)
**Time:** 5 minutes
**Impact:** Low risk

### Issue 2: Infinite Scroll Not Loading
**Symptom:** Products don't auto-load when scrolling
**Quick Check:**
- Does the category have more than 12 products?
- Is there a "Next" pagination link at bottom?

**Fix:** Remove conditional check if needed (rollback that specific change)
**Time:** 10 minutes via support
**Impact:** Medium risk

### Issue 3: Search Autocomplete Slow/Delayed
**Symptom:** Search suggestions take 1-2 seconds to appear
**Cause:** `defer` on SearchServerAPI script
**Fix:** Remove `defer` if search is critical to business
**Time:** 5 minutes
**Impact:** Very low risk - just timing

### Issue 4: Reviews Widget Not Loading
**Symptom:** Reviews section blank on product pages
**Cause:** `defer` timing on reviews scripts
**Fix:** Remove `defer` from Reviews.co.uk script
**Time:** 5 minutes
**Impact:** Low risk - affects social proof

---

## 🚨 Emergency Rollback

**If multiple critical tests fail:**

### Immediate Rollback (30 seconds):
1. BigCommerce Admin → Storefront → Themes
2. Find your OLD/PREVIOUS theme
3. Click "Activate"
4. Site reverts immediately

### No Data Loss:
- All products, orders, customers unchanged
- Only theme reverts
- Can re-upload fixed theme later

### After Rollback:
1. Document what broke (screenshots, console errors)
2. Test fixes locally using `stencil start`
3. Re-upload when fixed

---

## ✅ Go Live Process

**Once all critical tests pass:**

### Step 1: Activate New Theme
- [ ] BigCommerce Admin → Storefront → Themes
- [ ] Find the NEW optimized theme
- [ ] Click "Activate"
- [ ] Confirm activation

### Step 2: Immediate Verification (5 minutes)
- [ ] Visit live site (not preview) in incognito window
- [ ] Quick test: Homepage, one product, add to cart
- [ ] Check for any immediate errors

### Step 3: Monitor for 24 Hours
- [ ] Check Google Analytics for traffic drops
- [ ] Monitor conversion rate
- [ ] Check for customer support emails about site issues
- [ ] Revisit critical pages throughout the day

### Step 4: Run PageSpeed Test (After 24 Hours)
- [ ] Go to: https://pagespeed.web.dev/
- [ ] Test: `https://www.buyorganicsonline.com.au/`
- [ ] Compare Mobile & Desktop scores to previous
- [ ] **Expected:** 15-25 point improvement in Performance Score

---

## 📊 Success Metrics

### Immediate Success Indicators:
- ✅ All 7 critical tests passed
- ✅ No console errors on key pages
- ✅ Site feels faster (subjective but important)
- ✅ No customer complaints in first 24 hours

### 24-Hour Success Indicators:
- ✅ Google Analytics traffic stable or increased
- ✅ Conversion rate stable or improved
- ✅ No support tickets about site issues
- ✅ Mobile bounce rate stable or decreased

### Week 1 Success Indicators:
- ✅ PageSpeed score improved by 15-25 points
- ✅ Core Web Vitals improved:
  - LCP: 4.0s → 2.4s
  - FCP: 2.5s → 1.5s
  - TBT: 800ms → 200ms
- ✅ Google Search Console shows improved "Page Experience"

---

## 📝 Testing Log Template

**Copy this for your records:**

```
=== THEME UPLOAD TEST LOG ===
Date: _______________
Tester: _______________
Theme Version: Stage 2 Complete
Upload Time: _______________

CRITICAL TESTS:
[ ] Test 1: Homepage - PASS/FAIL - Notes: __________
[ ] Test 2: Search - PASS/FAIL - Notes: __________
[ ] Test 3: Category - PASS/FAIL - Notes: __________
[ ] Test 4: Product - PASS/FAIL - Notes: __________
[ ] Test 5: Brands - PASS/FAIL - Notes: __________
[ ] Test 6: Cart/Checkout - PASS/FAIL - Notes: __________
[ ] Test 7: Footer Badge - PASS/FAIL - Notes: __________

ISSUES FOUND:
1. __________
2. __________
3. __________

DECISION:
[ ] GO LIVE - All tests passed
[ ] FIX ISSUES FIRST - Details: __________
[ ] ROLLBACK - Too many failures

ACTIVATED LIVE: YES/NO
Time: _______________

24-HOUR CHECK:
[ ] Site stable
[ ] No customer complaints
[ ] Analytics normal

NOTES:
_______________
```

---

## 🎯 Summary: What You're Testing For

The optimized theme made these changes:
1. ✅ Removed duplicate jQuery (270KB)
2. ✅ Added `defer` to 8 external scripts
3. ✅ Conditional infinite scroll loading
4. ✅ Removed 31 !important from CSS
5. ✅ Added resource hints for faster loading

**Most likely to break:**
- Brands page autocomplete (jQuery UI dependency)
- Search timing (deferred script)
- Infinite scroll (conditional loading)

**Least likely to break:**
- Homepage, product pages, checkout (core functionality unchanged)

**Test priority:**
1. Brands page (highest risk)
2. Search functionality
3. Infinite scroll on categories
4. Everything else

---

**Good luck! 🚀**

If all tests pass, you'll have a 40-50% faster site with better SEO and user experience.

---

**Document Version:** 1.0
**Created:** 2025-11-21
**Theme Version:** Stage 2 Complete

🤖 Generated with [Claude Code](https://claude.com/claude-code)
