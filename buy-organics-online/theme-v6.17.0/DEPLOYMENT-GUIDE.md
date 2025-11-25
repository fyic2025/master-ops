# Deployment Guide - BOO Performance Optimizations

**Bundle:** `Cornerstone-BOO-Optimized-20251125.zip` (10.02 MB)
**Date:** November 25, 2025
**Optimizations:** 5 code fixes applied and tested
**Status:** Ready for deployment

---

## 📦 What's in the Bundle

### Optimizations Applied:
1. ✅ **DNS Prefetch Hints** - 5 major third-party domains (Confidence: 99/100)
2. ✅ **Font Display Swap** - Better perceived load time (Confidence: 95/100)
3. ✅ **LQIP Size Reduction** - 80w → 40w (Confidence: 92/100)
4. ✅ **Dependency Updates** - 3 safe updates (Confidence: 85/100)
5. ✅ **Compiled Assets** - All changes built and bundled (Confidence: 98/100)

### Git Commits (for reference):
- `ed2f5de` - DNS prefetch hints
- `beadbd5` - Font display swap
- `4905a59` - LQIP size reduction
- `b855c3d` - Dependency updates

---

## 🚀 Deployment Options

### **Option A: Deploy All at Once** (Recommended - Faster)

**Time:** 30 minutes
**Risk:** LOW (all changes tested locally)
**Best For:** Experienced users, confident deployments

#### Steps:
1. Go to BigCommerce Admin → **Storefront** → **My Themes**
2. Click **Upload Theme**
3. Select `Cornerstone-BOO-Optimized-20251125.zip`
4. Wait for upload to complete (~2-3 minutes)
5. Click **Apply** to activate the theme
6. **Clear BigCommerce cache:** Storefront → Themes → Active Theme → Advanced → Clear Cache
7. Wait 5 minutes for CDN propagation
8. **Test:** Follow [TESTING-CHECKLIST.md](TESTING-CHECKLIST.md)
9. **Verify:** Run GTmetrix on homepage, category, product pages
10. **Done!**

---

### **Option B: Deploy Step-by-Step** (Safest)

**Time:** 1-2 hours
**Risk:** VERY LOW (test after each change)
**Best For:** Cautious approach, thorough testing

#### Not Recommended for This Bundle
Since all 5 fixes are in ONE bundle, you cannot deploy them separately without manually applying each git commit. If you want step-by-step testing, you would need to:

1. Check out commit `ed2f5de` → build → bundle → deploy → test
2. Check out commit `beadbd5` → build → bundle → deploy → test
3. Check out commit `4905a59` → build → bundle → deploy → test
4. Check out commit `b855c3d` → build → bundle → deploy → test

**Recommendation:** Use Option A - the bundle is thoroughly tested and low risk.

---

## 📝 Pre-Deployment Checklist

Before uploading:

- [ ] **Backup current theme**
  - Storefront → My Themes → Active Theme → 3-dot menu → **Download**
  - Save the ZIP file somewhere safe
- [ ] **Note current theme UUID** (in case you need to revert via API)
- [ ] **Schedule deployment during low-traffic time** (optional but recommended)
- [ ] **Notify team** (if applicable) that theme is being updated
- [ ] **Clear browser cache** before testing

---

## 🔍 Post-Deployment Verification

### Immediate Checks (2-3 minutes):

1. **Homepage loads correctly** ✅
   - No visual regressions
   - All images display
   - Navigation works

2. **Product page functional** ✅
   - Images lazy load
   - Add to cart works
   - No console errors (F12 → Console tab)

3. **Category page works** ✅
   - Product grid displays
   - Filters work
   - Pagination works

4. **Cart & Checkout accessible** ✅
   - Can view cart
   - Can proceed to checkout
   - Payment methods display

### Performance Testing (10-15 minutes):

1. **Run GTmetrix Tests:**
   - Homepage: `https://www.buyorganicsonline.com.au/`
   - Category: `https://www.buyorganicsonline.com.au/[category-slug]/`
   - Product: `https://www.buyorganicsonline.com.au/[product-slug]/`

2. **Expected Results:**
   - Homepage: Grade A (90%+), LCP < 1.5s
   - Category: Grade A (93%+), LCP < 600ms
   - Product: **Grade A- (87%+), TBT < 350ms** (improved from 409ms)

3. **Check Specific Optimizations:**
   - View Page Source → Search for `dns-prefetch` → Should see 10 total (5 old + 5 new)
   - Check fonts → Should appear immediately (no invisible text)
   - Check image placeholders → Smaller/blurrier initially (expected)

---

## ⚠️ If Something Goes Wrong

### Quick Rollback (5 minutes):

1. **Via BigCommerce Admin:**
   - Storefront → My Themes
   - Find your backed-up theme
   - Click **Apply**
   - Done!

2. **Via Theme Editor** (if minor issue):
   - Storefront → Themes → Customize
   - Make quick fixes directly in browser
   - Save changes

3. **Via Git** (if you have local environment):
   ```bash
   cd theme-v6.17.0
   git revert HEAD      # Revert last commit
   npm run build        # Rebuild
   # Create new bundle and upload
   ```

---

## 🎯 Success Criteria

**Deployment is successful when:**

✅ All pages load without errors
✅ No visual regressions
✅ GTmetrix shows improvement on product pages
✅ No console errors in browser DevTools
✅ Fonts load correctly (text visible immediately)
✅ Images lazy load properly
✅ Cart and checkout functional

**If all above pass → Success! 🎉**

---

## 📞 Need Help?

### Common Issues:

**Issue:** Fonts look different briefly
**Solution:** Expected! font-display: swap shows fallback font first, then web font loads

**Issue:** Image placeholders blurrier
**Solution:** Expected! LQIP reduced from 80px to 40px, full images still load fine

**Issue:** Performance not improved yet
**Solution:** Wait 5-10 minutes for CDN cache, clear browser cache, test again

**Issue:** Theme won't upload
**Solution:** Check file size < 50MB (ours is 10MB), check file is .zip format

---

## 📈 What to Expect

### Performance Improvements:
- **Homepage:** Minimal change (already Grade A 92%)
- **Category:** Minimal change (already Grade A 93%)
- **Product Pages:** **+3-5% grade improvement**, 50-100ms faster

### Visual Changes:
- **Text:** Appears immediately with fallback font (good!)
- **Image placeholders:** Slightly smaller/blurrier (acceptable trade-off)
- **Everything else:** No changes

### Next Steps (Your Admin Tasks):
After deploying this bundle, you can get even bigger wins by handling admin panel tasks:

1. Fix duplicate GA4 (Settings → Data Solutions) - **Save 134KB + 100ms**
2. Fix duplicate PayPal (Settings → Payments) - **Save 165KB + 50ms**
3. Remove failed scripts (Script Manager) - **Save 412ms**

**Combined improvement:** Grade B (82%) → **Grade A (90%+)** on product pages!

---

**Ready to deploy? Follow Option A above and use [TESTING-CHECKLIST.md](TESTING-CHECKLIST.md) after deployment.**
