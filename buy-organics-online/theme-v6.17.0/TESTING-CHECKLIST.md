# Testing Checklist - BOO Performance Optimizations

Use this checklist after deploying `Cornerstone-BOO-Optimized-20251125.zip`

---

## ✅ PHASE 1: Immediate Functionality Tests (5 minutes)

### Homepage Testing
- [ ] Homepage loads without errors
- [ ] Logo displays correctly
- [ ] Navigation menu works
- [ ] Search bar functional
- [ ] Featured products display
- [ ] Hero images load
- [ ] Footer displays correctly
- [ ] **Check browser console** (F12 → Console) - No red errors

### Product Page Testing
- [ ] Product page loads
- [ ] Product images display
- [ ] **Image lazy loading works** (scroll down, images load progressively)
- [ ] **Image placeholders appear** (smaller/blurrier initially - expected!)
- [ ] Main product image shows
- [ ] Thumbnail images work
- [ ] Add to cart button works
- [ ] Product description visible
- [ ] Reviews section loads (if applicable)
- [ ] **Check browser console** - No errors

### Category Page Testing
- [ ] Category page loads
- [ ] Product grid displays
- [ ] Product images lazy load
- [ ] Filters/facets work
- [ ] Sorting works (price, name, etc.)
- [ ] Pagination works
- [ ] **Check browser console** - No errors

### Cart & Checkout Testing
- [ ] Can add product to cart
- [ ] Cart page loads
- [ ] Can update quantities
- [ ] Can proceed to checkout
- [ ] Checkout page loads
- [ ] Payment methods display
- [ ] **DO NOT complete test order** (unless staging site)

---

## ✅ PHASE 2: Visual Regression Tests (5-10 minutes)

### Layout & Styling
- [ ] **Fonts load correctly**
  - Text appears immediately (may briefly show fallback font - good!)
  - No invisible text (FOIT)
  - Web fonts load within 1-2 seconds
- [ ] Colors match previous theme
- [ ] Spacing/padding looks correct
- [ ] Buttons styled correctly
- [ ] Forms display properly
- [ ] Mobile menu works (test on mobile/resize browser)

### Responsive Design (Mobile Testing)
- [ ] Open site on mobile device OR resize browser to 375px width
- [ ] Homepage displays correctly
- [ ] Product page readable
- [ ] Images responsive
- [ ] Navigation hamburger menu works
- [ ] Touch targets appropriate size
- [ ] No horizontal scrolling

---

## ✅ PHASE 3: Performance Verification (10-15 minutes)

### GTmetrix Testing

**Test These URLs:**
1. Homepage: `https://www.buyorganicsonline.com.au/`
2. Category: Pick any category page
3. Product: Pick any product page

**For each URL:**
1. Go to https://gtmetrix.com
2. Enter URL
3. Click **Analyze**
4. Wait for results

**Record Results:**

| Page Type | Grade | LCP | TBT | Notes |
|-----------|-------|-----|-----|-------|
| Homepage | _____ | _____ms | _____ms | Expected: A (90%+) |
| Category | _____ | _____ms | _____ms | Expected: A (93%+) |
| Product | _____ | _____ms | _____ms | Expected: A- (87%+), TBT < 350ms |

### Expected Improvements:
- **Product Page TBT:** From 409ms → ~350ms (50-100ms improvement)
- **Product Page Grade:** From B (82%) → A- (87%+)

### Browser DevTools Testing

**Check DNS Prefetch (Verify Fix #1):**
1. Right-click page → **View Page Source**
2. Search for `dns-prefetch`
3. Should see **10 total hints**: 5 original + 5 new
4. New ones: googletagmanager.com, connect.facebook.net, paypal.com, cdn.livechatinc.com, static.klaviyo.com

**Check Font Loading (Verify Fix #2):**
1. Open DevTools (F12) → **Network tab**
2. Filter: **Font**
3. Reload page
4. Fonts should start downloading immediately
5. Text should appear right away (not invisible)

**Check Image Lazy Loading (Verify Fix #3):**
1. Go to product page
2. Open DevTools (F12) → **Network tab**
3. Filter: **Img**
4. Scroll page slowly
5. Images should load as you scroll (not all at once)
6. LQIP placeholders should be smaller (~40px blurry preview)

---

## ✅ PHASE 4: Optimization-Specific Tests

### Fix #1: DNS Prefetch Verification
```
✓ View Source → Search "dns-prefetch" → Count: 10 (5 original + 5 new)
✓ New hints present: googletagmanager, facebook, paypal, livechat, klaviyo
```

### Fix #2: Font Display Verification
```
✓ Text visible immediately (no FOIT)
✓ Fallback font may show briefly (< 1 second) - GOOD!
✓ Web fonts load and replace fallback - GOOD!
```

### Fix #3: LQIP Size Verification
```
✓ Product image placeholders smaller/blurrier than before
✓ Full images still load correctly when scrolled into view
✓ No broken images
```

### Fix #4: Dependency Update Verification
```
✓ Site functions normally (all features work)
✓ No console errors related to outdated packages
✓ Bundle size reasonable (~10MB theme ZIP)
```

### Fix #5: Compiled Assets Verification
```
✓ JavaScript bundles load (theme-bundle.main.js, etc.)
✓ CSS loads correctly (theme.css)
✓ No 404 errors for missing assets
```

---

## ⚠️ RED FLAGS (Stop & Investigate)

If you see any of these, something is wrong:

❌ **White screen of death** - Theme upload failed
❌ **500 errors** - Server issue, check BigCommerce status
❌ **Missing images everywhere** - Asset path issue
❌ **Console full of red errors** - JavaScript broken
❌ **Text invisible for > 3 seconds** - Font loading issue
❌ **Layout completely broken** - CSS not loading
❌ **Can't add to cart** - Critical functionality broken
❌ **Performance WORSE than before** - Something wrong with build

**If any red flags:** Immediately rollback to previous theme (see DEPLOYMENT-GUIDE.md)

---

## ✅ GREEN LIGHTS (All Good!)

You can confidently proceed if:

✅ All pages load and look correct
✅ No console errors (or only minor warnings)
✅ Text appears immediately (even if different font briefly)
✅ Images lazy load properly
✅ Add to cart works
✅ GTmetrix shows stable or improved scores
✅ Mobile site works properly

**If all green:** Success! Theme deployed successfully 🎉

---

## 📊 Success Metrics

### Minimum Acceptable:
- All pages load without errors ✅
- No visual regressions ✅
- Performance same or better ✅
- All functionality works ✅

### Target Goals:
- Product page Grade: B (82%) → **A- (87%)**
- Product page TBT: 409ms → **< 350ms**
- Fonts appear immediately ✅
- Images lazy load smoothly ✅

### Stretch Goals (After Admin Panel Fixes):
- Product page Grade: **A (90%+)**
- Product page TBT: **< 200ms**
- Total improvements: **1-2 seconds faster**

---

## 📝 Test Results Template

**Copy and fill out:**

```
DEPLOYMENT TEST RESULTS
Date: _______________
Tester: _______________
Theme: Cornerstone-BOO-Optimized-20251125.zip

FUNCTIONALITY TESTS:
[ ] Homepage - PASS / FAIL
[ ] Product pages - PASS / FAIL
[ ] Category pages - PASS / FAIL
[ ] Cart/Checkout - PASS / FAIL

VISUAL TESTS:
[ ] Layout correct - PASS / FAIL
[ ] Fonts load - PASS / FAIL
[ ] Mobile responsive - PASS / FAIL

PERFORMANCE TESTS:
Homepage GTmetrix: Grade _____ | LCP _____ms | TBT _____ms
Category GTmetrix: Grade _____ | LCP _____ms | TBT _____ms
Product GTmetrix: Grade _____ | LCP _____ms | TBT _____ms

OPTIMIZATION CHECKS:
[ ] DNS prefetch hints (10 total) - VERIFIED / NOT FOUND
[ ] Font display swap - VERIFIED / NOT FOUND
[ ] LQIP placeholders smaller - VERIFIED / NOT FOUND

CONSOLE ERRORS: _______________ (none / list errors)

OVERALL: SUCCESS / NEEDS INVESTIGATION / ROLLBACK

Notes:
_______________________________________
_______________________________________
```

---

**Next Steps:**
- ✅ All tests pass → Celebrate! Consider admin panel fixes next
- ⚠️ Minor issues → Document and monitor, may fix later
- ❌ Major issues → Rollback immediately, review logs

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for rollback instructions.
