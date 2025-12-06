# Post-Deployment Testing Checklist

## ✅ Critical Functionality Tests

Open your store: https://buyorganicsonline.com.au (or store-hhhi.mybigcommerce.com)

### Basic Tests
- [ ] Homepage loads without errors
- [ ] Navigation menu works
- [ ] Product pages display correctly
- [ ] Add to cart works
- [ ] Cart and checkout functional
- [ ] Brands page loads
- [ ] Search works

### Stage 2 Verification

#### 1. Check Console (F12)
- [ ] Open DevTools (F12)
- [ ] Go to **Console** tab
- [ ] Should see **NO errors**
- [ ] No 404s or missing resources

#### 2. Verify Resource Hints (F12 → Network)
- [ ] Clear cache and reload
- [ ] Check Network tab
- [ ] External domains should load faster:
  - searchserverapi.com
  - widget.reviews.co.uk
  - cdnjs.cloudflare.com

#### 3. Test Infinite Scroll
- [ ] Go to a category with >12 products
- [ ] Scroll down
- [ ] More products should auto-load
- [ ] No console errors during scroll

#### 4. Check CSS (No !important)
- [ ] Visual appearance matches expected
- [ ] Styles applied correctly
- [ ] No broken layouts

#### 5. Performance Check
- [ ] Run Lighthouse (F12 → Lighthouse → Analyze)
- [ ] Performance score should be >85
- [ ] Page load time ~2.5s (vs previous ~5s)

## 🐛 If Issues Found

### Minor Issues
- Document them
- Continue testing
- Fix after full testing

### Major Issues (Site Broken)
**Rollback immediately:**
1. Go to **Storefront → My Themes**
2. Find previous theme
3. Click **Apply** to restore

## 📊 Expected Improvements

- **Page Load:** ~5s → ~2.5s (-50%)
- **JavaScript:** 450KB → 180KB (-270KB)
- **Blocking Scripts:** 8 → 0 (-100%)
- **!important:** 31 → 0 (-100%)

---

**After testing, report results so we can document the deployment!**
