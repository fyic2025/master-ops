# Visual Testing Guide - Stage 2 Complete

**Date:** November 21, 2025
**Theme:** Cornerstone-BOO-Cust v4.9.0
**Purpose:** Visual regression testing checklist
**Time Required:** ~30-45 minutes

---

## Overview

This guide helps you systematically test all visual changes from Stage 2 optimizations. Use this after uploading to BigCommerce preview URL.

---

## 🎯 Critical Visual Tests (Must Complete)

### Test 1: Navigation Menu ⚠️ **HIGH PRIORITY**

**What Changed:** Removed `!important` from menu styles, extracted inline style

**Test Steps:**
1. Visit homepage
2. Check navigation menu background color
3. Verify menu items are styled correctly

**Expected Results:**
- ✅ Menu background: **#3c622a** (green)
- ✅ Menu text: **White** (#fff)
- ✅ Hover states work
- ✅ SVG icons display correctly

**Desktop View:**
```
✓ Menu background green
✓ Text white and readable
✓ Hover changes background
✓ Dropdown menus work
```

**Mobile View:**
```
✓ Menu hamburger displays
✓ Menu slides open
✓ Background white when open
✓ Text black when open (contrast)
```

**If Fails:** Check browser console (F12) for CSS specificity issues

**Screenshot:** Take before/after photos for comparison

---

### Test 2: Product Cards & Buttons ⚠️ **HIGH PRIORITY**

**What Changed:** Removed multiple `!important` from `.HideButtons`, `.card`, `.crd-button`

**Test Steps:**
1. Visit any category page
2. Inspect product cards
3. Check "Add to Cart" buttons
4. Check "Out of Stock" buttons

**Expected Results:**
- ✅ Product cards display correctly
- ✅ Card titles centered, uppercase
- ✅ Prices display properly
- ✅ "Add to Cart" button: Green background (#3c622a), white text
- ✅ "Out of Stock" button: Red background (#ff4333), white text
- ✅ Hover states work

**Visual Checklist:**
```
✓ Card images display (1px border #eee)
✓ Card titles: 1rem, uppercase, centered
✓ Prices centered and readable
✓ Green "Add to Cart" buttons
✓ Red "Out of Stock" buttons
✓ Button hover states functional
```

**If Fails:** Likely CSS specificity issue - may need to increase selector weight

---

### Test 3: Product Description Styling ⚠️ **HIGH PRIORITY**

**What Changed:** Removed `!important` from `.productView-description` font sizes

**Test Steps:**
1. Visit any product page
2. Scroll to product description
3. Check text formatting

**Expected Results:**
- ✅ Description text: **18px font size**
- ✅ Paragraphs, spans, lists, links all 18px
- ✅ Tables: 100% width
- ✅ Readable and consistent

**Visual Checklist:**
```
✓ Text large enough (18px)
✓ Lists formatted correctly
✓ Links styled properly
✓ Tables full width
✓ No text overflow
```

**If Fails:** Font size may have reverted to default (smaller)

---

### Test 4: Image Centering (Global)

**What Changed:** Extracted inline `img { margin: 0 auto; }` to CSS

**Test Steps:**
1. Visit multiple pages (home, category, product)
2. Check if images are centered

**Expected Results:**
- ✅ All images centered in their containers
- ✅ Product images centered
- ✅ Brand logos centered
- ✅ Category images centered

**Visual Checklist:**
```
✓ Home page images centered
✓ Category page images centered
✓ Product page images centered
✓ Brand page logos centered
```

**If Fails:** Images may be left-aligned instead of centered

---

### Test 5: Infinite Scroll Loading Status

**What Changed:** Extracted inline style `text-align: center` for loading indicator

**Test Steps:**
1. Visit category with multiple pages
2. Scroll to bottom
3. Watch loading indicator

**Expected Results:**
- ✅ Loading indicator **centered**
- ✅ Loading icon displays correctly
- ✅ More products load automatically
- ✅ Smooth transition

**Visual Checklist:**
```
✓ Loading spinner centered
✓ "Loading..." text centered
✓ Products append correctly
✓ No layout shift
```

**If Fails:** Loading indicator may be left-aligned

---

## 📱 Mobile Visual Tests

### Test 6: Mobile Navigation

**Test Steps:**
1. Open site on mobile device (or Chrome DevTools mobile view)
2. Test hamburger menu
3. Check menu styles

**Expected Results:**
- ✅ Hamburger icon displays
- ✅ Menu opens smoothly
- ✅ Menu background white when open
- ✅ Text readable (black on white)
- ✅ Touch targets large enough

**Mobile-Specific Checks:**
```
✓ Body padding-top: 125px (< 800px)
✓ Body padding-top: 145px (< 540px)
✓ Header height: 125px
✓ Quick search positioned correctly
✓ Logo centered
```

---

### Test 7: Mobile Product Cards

**Test Steps:**
1. View category on mobile
2. Check product card layout
3. Test touch interactions

**Expected Results:**
- ✅ Cards stack vertically
- ✅ Images responsive
- ✅ Buttons tap-able
- ✅ Text readable
- ✅ Proper spacing

---

## 🔍 Desktop Visual Tests

### Test 8: Header & Logo

**Test Steps:**
1. Check header layout
2. Verify logo displays
3. Check search bar

**Expected Results:**
- ✅ Logo displays correctly
- ✅ Logo height: auto (not fixed)
- ✅ Header border: 0 (removed)
- ✅ Search bar styled correctly

**Search Bar Checks:**
```
✓ Border: 1px solid #3c622a
✓ Border-radius: 50px
✓ Padding correct
✓ Search icon: green background (#3c622a)
✓ Search icon: white color
```

---

### Test 9: Footer

**Test Steps:**
1. Scroll to footer
2. Check styling
3. Verify reviews badge

**Expected Results:**
- ✅ Footer displays correctly
- ✅ Footer links work
- ✅ Reviews.io badge loads (with dns-prefetch)
- ✅ Proper spacing

---

### Test 10: Read More / Less Buttons

**Test Steps:**
1. Find category with description
2. Click "Read More" button
3. Click "Read Less" button

**Expected Results:**
- ✅ Button background: **#3c622a** (green)
- ✅ Button text: white
- ✅ Button hover: white background, green text
- ✅ Functionality works
- ✅ Text expands/collapses

**Visual Checks:**
```
✓ Button width: 100px
✓ Text centered
✓ Border-radius: 5px
✓ Hover state smooth
```

---

## ⚡ Performance Visual Tests

### Test 11: Page Load Speed (Perceived)

**Test Steps:**
1. Clear browser cache
2. Open DevTools Network tab
3. Load homepage
4. Observe visual loading

**Expected Results:**
- ✅ Content appears within **1-2 seconds**
- ✅ No flash of unstyled content (FOUC)
- ✅ Images lazy-load smoothly
- ✅ No layout shift during load

**Network Checks:**
```
✓ CSS loads early (in <head>)
✓ JavaScript loads with defer
✓ Images lazy-load
✓ No render blocking
```

---

### Test 12: External Resource Loading

**Test Steps:**
1. Open DevTools Network tab
2. Load product page
3. Check timing for external scripts

**Expected Results:**
- ✅ DNS lookups faster (dns-prefetch working)
- ✅ Reviews widget loads quickly
- ✅ Search API loads in background
- ✅ Page interactive quickly

**DNS Prefetch Verification:**
```
✓ searchserverapi.com - DNS resolved early
✓ widget.reviews.co.uk - DNS resolved early
✓ widget.reviews.io - DNS resolved early
✓ cdnjs.cloudflare.com - DNS resolved early
```

---

## 🎨 Color & Style Consistency

### Test 13: Brand Colors

**Test Steps:**
1. Review entire site
2. Check color consistency

**Expected Brand Colors:**
- **Primary Green:** #3c622a (or $qsearch-color)
- **Red (Out of Stock):** #ff4333
- **White:** #fff
- **Black:** #333

**Consistency Checks:**
```
✓ All green buttons same shade
✓ All red buttons same shade
✓ Consistent font sizes
✓ Consistent spacing
✓ No color mismatches
```

---

### Test 14: Typography

**Test Steps:**
1. Check text on various pages
2. Verify font consistency

**Expected Typography:**
- Product titles: 1rem, uppercase, centered
- Product descriptions: 18px
- Body text: inherit
- Buttons: 1rem, uppercase

**Typography Checks:**
```
✓ Headings consistent
✓ Body text readable
✓ Proper hierarchy
✓ No font loading issues
```

---

## 🐛 Bug Detection Tests

### Test 15: Browser Console

**Test Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate through site

**Expected Results:**
- ✅ **No JavaScript errors**
- ✅ No 404 errors (missing resources)
- ✅ No CSS warnings
- ✅ Clean console

**If Errors Found:**
- Document error messages
- Take screenshots
- Note which page causes error

---

### Test 16: Layout Integrity

**Test Steps:**
1. Resize browser window
2. Test various breakpoints
3. Check for layout breaks

**Breakpoints to Test:**
- 1261px+ (desktop)
- 801px - 1260px (tablet)
- 541px - 800px (mobile landscape)
- < 540px (mobile portrait)

**Layout Checks:**
```
✓ No horizontal scrolling
✓ Content fits viewport
✓ No overlapping elements
✓ Responsive images
✓ Proper breakpoint behavior
```

---

## 📋 Visual Testing Checklist Summary

### Desktop Tests (1920x1080)
- [ ] Navigation menu (colors, styles)
- [ ] Product cards (layout, buttons)
- [ ] Product descriptions (font size)
- [ ] Images centered
- [ ] Loading indicators centered
- [ ] Header & logo
- [ ] Footer
- [ ] Read More buttons
- [ ] Color consistency
- [ ] Typography consistency

### Tablet Tests (768x1024)
- [ ] Navigation responsive
- [ ] Product grid layout
- [ ] Touch interactions
- [ ] Breakpoint styles

### Mobile Tests (375x667)
- [ ] Hamburger menu
- [ ] Mobile navigation
- [ ] Product cards stack
- [ ] Touch targets
- [ ] Mobile-specific styles

### Performance Tests
- [ ] Page load speed
- [ ] External resources
- [ ] No FOUC
- [ ] Smooth interactions

### Bug Detection
- [ ] No console errors
- [ ] No 404s
- [ ] No CSS warnings
- [ ] Layout integrity

---

## 🎯 Pass/Fail Criteria

### Pass ✅
All critical visual tests pass:
- Menu colors correct
- Buttons styled properly
- Text sizes correct
- Images centered
- No console errors
- Responsive design intact

### Conditional Pass ⚠️
Minor visual issues that don't affect functionality:
- Slight spacing differences
- Non-critical color variations
- Minor alignment issues

**Action:** Document issues, decide if acceptable

### Fail ❌
Critical visual issues:
- Menu background wrong color
- Buttons missing/broken
- Text unreadable (too small)
- Layout completely broken
- Major console errors

**Action:** Revert theme, fix issues locally, re-upload

---

## 📸 Screenshot Documentation

### Recommended Screenshots

**Before Stage 2:**
(If you have screenshots of live site, use for comparison)

**After Stage 2:**
1. Homepage (desktop)
2. Homepage (mobile)
3. Category page (desktop)
4. Category page (mobile)
5. Product page (desktop)
6. Product page (mobile)
7. Brands page (desktop)
8. Navigation menu (open)
9. Product cards (close-up)
10. Footer

**Comparison:**
- Side-by-side before/after
- Note any differences
- Confirm improvements

---

## 🔧 Troubleshooting Visual Issues

### Issue: Menu Background Wrong Color

**Possible Causes:**
- CSS specificity conflict
- Browser cache not cleared

**Solutions:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for CSS errors
4. Inspect element, check computed styles

---

### Issue: Buttons Missing Styles

**Possible Causes:**
- CSS selector specificity too low
- Conflicting styles

**Solutions:**
1. Inspect element in DevTools
2. Check "Computed" tab for applied styles
3. Look for overriding styles
4. May need to increase selector specificity

---

### Issue: Text Too Small

**Possible Causes:**
- Font-size 18px not applying
- CSS specificity issue

**Solutions:**
1. Inspect element
2. Check if `.productView-description` styles apply
3. Verify no conflicting styles
4. May need more specific selector

---

### Issue: Images Not Centered

**Possible Causes:**
- `img { margin: 0 auto; }` not applying
- Parent container not `display: block`

**Solutions:**
1. Inspect image element
2. Check parent container
3. Verify CSS loaded
4. May need `display: block` on images

---

## ✅ Final Checklist

### Before Testing
- [ ] Theme uploaded to preview URL
- [ ] Browser cache cleared
- [ ] DevTools ready (F12)
- [ ] Screenshot tool ready
- [ ] This checklist printed/open

### During Testing
- [ ] Document all findings
- [ ] Take screenshots of issues
- [ ] Note error messages
- [ ] Test all breakpoints
- [ ] Check multiple browsers

### After Testing
- [ ] Complete summary report
- [ ] Decide pass/fail
- [ ] If pass: Apply to live
- [ ] If fail: Document issues for fix

---

## 📊 Visual Testing Report Template

```markdown
# Visual Testing Results

**Date:** [Date]
**Tester:** [Your Name]
**Theme:** Cornerstone-BOO-Cust v4.9.0
**Preview URL:** [URL]

## Desktop Results
- Navigation: [Pass/Fail]
- Product Cards: [Pass/Fail]
- Descriptions: [Pass/Fail]
- Images: [Pass/Fail]
- Overall: [Pass/Fail]

## Mobile Results
- Navigation: [Pass/Fail]
- Product Cards: [Pass/Fail]
- Touch Targets: [Pass/Fail]
- Overall: [Pass/Fail]

## Issues Found
1. [Issue description]
   - Severity: [High/Medium/Low]
   - Action: [Fix/Accept/Monitor]

## Screenshots
- [Attach screenshots]

## Recommendation
[ ] Pass - Apply to live
[ ] Conditional Pass - Apply with monitoring
[ ] Fail - Revert and fix

## Notes
[Additional observations]
```

---

## 🎉 Success Criteria

**Theme is ready for production when:**

✅ All critical visual tests pass
✅ No major console errors
✅ Responsive design intact
✅ Performance improvements visible
✅ User experience smooth
✅ No functional regressions

**Confidence after visual testing:** **100%** 🎯

---

**Testing Guide Created By:** Claude Code
**Date:** November 21, 2025
**Theme Version:** Cornerstone-BOO-Cust v4.9.0
**Stage:** 2 - Complete with Visual Testing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
