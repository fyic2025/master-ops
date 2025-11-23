# Immediate GSC Fix - Action Plan

Based on your Coverage export and current site analysis

---

## Issues Identified from ZIP File:

### 🔴 Critical Issues:
1. **489 Not Found (404)** - Validation Started
2. **1 Soft 404** - Not Started
3. **1 Server error (5xx)** - Not Started

### 🟡 Non-Critical Issues:
4. **498 Indexed, though blocked by robots.txt** - Not Started

### ℹ️ Other Stats:
- 14,441 pages blocked by robots.txt (intentional)
- 6,817 pages with redirects (normal)
- 1,850 crawled but not indexed (normal)

---

## IMMEDIATE ACTIONS - Do These Now:

### Action 1: Upload Redirect CSV to BigCommerce ⚡
**Status:** Ready to upload
**File:** `complete-404-redirects.csv` (299 redirects)

**Steps:**
1. Go to BigCommerce Admin
2. Navigate to: **Server Settings → Redirects**
3. Click **"Import"**
4. Upload: `complete-404-redirects.csv`
5. Review preview
6. Click **"Import"**

**This fixes:** Up to 299 of the 489 404 errors

---

### Action 2: Update robots.txt ⚡
**Status:** Ready to implement

**Current robots.txt analysis:**
✅ Already blocking appropriate pages:
- `/search.php` - Good (prevents duplicate content)
- `/cart.php`, `/checkout.php` - Good (no SEO value)
- `/account.php`, `/login.php` - Good (private pages)
- API endpoints - Good
- AI bots - Good (prevents scraping)

**Add these lines to robots.txt:**
```
# Block RSS feeds (not needed in search results)
Disallow: /rss.php

# Block API endpoints
Disallow: /api/

# Block asset links
Disallow: /.well-known/assetlinks.json
```

**How to update:**
1. Go to BigCommerce Admin
2. **Storefront → Script Manager** or use FTP
3. Edit robots.txt
4. Add the 3 new Disallow rules above
5. Save

---

### Action 3: Fix "Indexed but Blocked" Pages (498 URLs) 🔧

**The Problem:**
- 498 pages are in Google's index
- But they're blocked in robots.txt
- Google can't re-crawl to remove them (catch-22)

**The Solution - Two Options:**

#### Option A: Remove from Index (Recommended)
Since these are likely search/cart/account pages you DON'T want indexed:

1. Go to **Google Search Console**
2. Click **Removals** (left sidebar)
3. Click **New Request**
4. Click **Temporarily remove URL**
5. For each category, submit removal for:
   - All URLs matching pattern: `buyorganicsonline.com.au/search.php*`
   - All URLs matching pattern: `buyorganicsonline.com.au/cart.php*`
   - All URLs matching pattern: `buyorganicsonline.com.au/account*`
   - All URLs matching pattern: `buyorganicsonline.com.au/checkout*`

**Result:** Google will remove them within 24-48 hours

#### Option B: Unblock in robots.txt
If you WANT some of these indexed, remove those paths from robots.txt.
(Not recommended for search/cart/account pages)

---

### Action 4: Identify and Fix Soft 404 🔍

**What is it:**
- 1 page returns HTTP 200 (success)
- But the page appears empty or shows "not found"
- Google flags it as "soft" 404

**To find it:**
1. Go to GSC → **Indexing → Pages**
2. Scroll to "Why pages aren't indexed"
3. Click **"Soft 404"** (should show 1 URL)
4. Note the URL

**Common causes:**
- Product out of stock with empty page
- Page template missing content
- JavaScript loading issue

**How to fix:**
- If product should exist: Add content
- If product deleted: Return proper 404 status code
- If it's a redirect: Make it a 301 redirect

---

### Action 5: Identify and Fix Server Error 🔍

**What is it:**
- 1 page returning 5xx error (server error)
- Could be 500, 502, 503, 504

**To find it:**
1. Go to GSC → **Indexing → Pages**
2. Click **"Server error (5xx)"** (should show 1 URL)
3. Note the URL

**How to fix:**
1. Visit the URL directly in browser
2. Check if error still occurs
3. Check server logs: BigCommerce Admin → **Server Settings → System Logs**
4. Common causes:
   - Database timeout
   - Script error
   - Resource limit exceeded
   - Third-party integration failure

**Fix depends on error type - let me know the URL and I'll help debug**

---

## Expected Impact:

### After Action 1 (Upload redirects):
- 404 errors: 489 → ~190 (remove 299)
- Redirect coverage: +299 new redirects

### After Action 2 (Update robots.txt):
- Prevent 3 new types of URLs from being indexed
- Future-proof against API/RSS indexing

### After Action 3 (Remove blocked pages):
- "Indexed but blocked" errors: 498 → 0
- Cleaner search index

### After Actions 4 & 5 (Fix soft 404 and server error):
- Critical issues: 3 → 0
- Perfect technical health score

---

## Timeline:

**Day 1 (Today):**
- ✅ Upload complete-404-redirects.csv (5 minutes)
- ✅ Update robots.txt (5 minutes)
- ✅ Submit removal requests for blocked pages (10 minutes)
- ✅ Identify soft 404 and server error URLs (5 minutes)

**Day 2-3:**
- 🔄 Google validates redirects
- 🔄 Google removes blocked pages from index
- 🔄 404 count drops in GSC

**Day 4-7:**
- ✅ All redirects validated
- ✅ 404 errors reduced by ~60%
- ✅ Remaining 190 404s = genuinely deleted products

---

## Remaining 404s After This Fix:

After uploading the 299 redirects, you'll have ~190 404s left.

**These are likely:**
1. Genuinely deleted products with no replacement
2. URLs we haven't processed yet
3. New 404s discovered by Google

**Next step for remaining 404s:**
Once GSC validates the current redirects, export the updated 404 list and I'll create redirects for those too.

---

## Priority Order:

1. **HIGHEST:** Upload complete-404-redirects.csv (fixes 299 errors immediately)
2. **HIGH:** Update robots.txt (prevents future issues)
3. **MEDIUM:** Submit removal requests (cleans up index)
4. **MEDIUM:** Fix soft 404 and server error (affects 2 URLs)

---

## Questions?

Let me know when you've completed each action and I'll help with the next step!
