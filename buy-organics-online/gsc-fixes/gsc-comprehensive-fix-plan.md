# Google Search Console - Comprehensive Fix Plan

Based on your Coverage report from 2025-11-23

---

## Critical Issues to Fix

### 🔴 Issue 1: 489 Not Found (404) Errors
**Status:** Validation Started
**Action Required:** High Priority

**What to do:**
1. Export the detailed list of 404 URLs from GSC:
   - Go to GSC → Indexing → Pages
   - Click "Not found (404)" (489 pages)
   - Click Export → "Export all rows"
   - Save as `current-404-list.csv`

2. Compare with our existing fix:
   - We already created `complete-404-redirects.csv` with 299 redirects for 416 URLs
   - The new list has 489 URLs (+73 more)
   - We need to identify the 73 new 404s

3. Once you have the export, I'll:
   - Compare old vs new 404 lists
   - Create redirects for the 73 new URLs
   - Update the complete redirect CSV

**Questions:**
- Have you uploaded `complete-404-redirects.csv` to BigCommerce yet?
- When was it uploaded? (Validation can take 24-48 hours)

---

### 🟡 Issue 2: 498 Pages "Indexed, though blocked by robots.txt"
**Status:** Not Started
**Action Required:** Medium Priority
**Problem:** Pages are blocked in robots.txt but Google already indexed them

**What this means:**
- These pages were indexed before you added robots.txt rules
- Google can't re-crawl them to remove from index
- This creates a "stuck" state

**What to do:**
1. Export the detailed list:
   - GSC → Indexing → Pages
   - Click "Indexed, though blocked by robots.txt" (498 pages)
   - Export → "Export all rows"
   - Save as `indexed-but-blocked.csv`

2. Decision needed for each page:
   - **Option A:** Want them indexed? → Remove from robots.txt
   - **Option B:** Don't want them indexed? → Keep in robots.txt AND submit removal request

3. For Option B (recommended for API/RSS/system files):
   - Keep in robots.txt
   - Submit URL removal requests in GSC
   - Google will de-index them within a few days

**Likely candidates for blocking:**
- RSS feeds (rss.php)
- API endpoints (/api/)
- System files (.well-known)
- Checkout pages
- Admin pages

---

### 🔴 Issue 3: 1 Soft 404 Error
**Status:** Not Started
**Action Required:** Medium Priority
**Problem:** Page returns 200 OK but appears empty or has "not found" content

**What to do:**
1. Export the URL:
   - GSC → Indexing → Pages
   - Click "Soft 404" (1 page)
   - Identify the URL

2. Fix options:
   - If page should exist: Add real content
   - If page shouldn't exist: Return proper 404 status code
   - If it's a redirect: Change to 301 redirect

---

### 🔴 Issue 4: 1 Server Error (5xx)
**Status:** Not Started
**Action Required:** High Priority
**Problem:** Page is returning a server error

**What to do:**
1. Export the URL:
   - GSC → Indexing → Pages
   - Click "Server error (5xx)" (1 page)
   - Identify the URL

2. Investigate:
   - Check server logs for errors on this URL
   - Test the URL directly in browser
   - Fix the underlying error (could be database, script timeout, etc.)

---

### 🟢 Issue 5: 14,441 Pages Blocked by robots.txt
**Status:** Not Started
**Action Required:** Review Needed
**Problem:** Large number of blocked pages

**What to do:**
1. Review what's being blocked:
   - Check your current robots.txt file
   - Ensure these are pages you WANT blocked

2. Common intentional blocks:
   - /checkout/
   - /cart/
   - /account/
   - /search.php (to prevent duplicate content)
   - Internal search results
   - Filter/sort URLs

3. If this is intentional: ✅ No action needed
4. If unintentional: Update robots.txt to unblock

**Action:** Let me check your current robots.txt to review

---

### 🟡 Issue 6: 6,817 Pages with Redirects
**Status:** Not Started
**Action Required:** Verify
**Problem:** Large number of redirects (need to verify they're working correctly)

**What to do:**
1. This is NORMAL if you have:
   - Old product URLs redirecting to new ones
   - Category restructuring
   - Domain migrations
   - Canonical redirects

2. Verify a sample:
   - Export a few URLs from this category
   - Test that redirects are working correctly
   - Ensure they're 301 redirects (permanent) not 302 (temporary)

**Action:** Export sample list for verification

---

### 🟡 Issue 7: 1,850 "Crawled - currently not indexed"
**Status:** Not Started
**Action Required:** Review
**Problem:** Google crawled but chose not to index

**Common reasons:**
- Low quality / thin content
- Duplicate content
- Pages too similar to others
- Low priority pages

**What to do:**
1. Export the list
2. Review sample URLs
3. Determine if these NEED to be indexed:
   - **If YES:** Improve content quality, add more unique content
   - **If NO:** This is normal, ignore

**Typical pages in this category:**
- Old blog posts
- Product variants
- Filtered search results
- Pagination pages

---

## Step-by-Step Action Plan

### Immediate Actions (Do First):

1. **Export 404 list** (489 URLs)
   ```
   GSC → Pages → "Not found (404)" → Export
   Save as: current-404-list.csv
   ```

2. **Export robots.txt blocked list** (498 URLs)
   ```
   GSC → Pages → "Indexed, though blocked by robots.txt" → Export
   Save as: indexed-but-blocked.csv
   ```

3. **Identify the Soft 404** (1 URL)
   ```
   GSC → Pages → "Soft 404" → Export
   Save as: soft-404.csv
   ```

4. **Identify the Server Error** (1 URL)
   ```
   GSC → Pages → "Server error (5xx)" → Export
   Save as: server-error.csv
   ```

### Then I'll Create:

1. Updated redirect CSV for all 489 404s
2. robots.txt removal requests list
3. Soft 404 fix instructions
4. Server error investigation script

---

## Files to Export and Share with Me:

Please export these from Google Search Console and save them:

- [ ] `current-404-list.csv` - All 489 404 URLs
- [ ] `indexed-but-blocked.csv` - All 498 conflicted URLs
- [ ] `soft-404.csv` - The 1 soft 404 URL
- [ ] `server-error.csv` - The 1 server error URL

Once you've exported these, I'll analyze them and create comprehensive fixes for everything.

---

## Questions to Answer:

1. **Did you upload `complete-404-redirects.csv` to BigCommerce?**
   - [ ] Yes - when?
   - [ ] No - why not?

2. **Do you have access to your robots.txt file?**
   - [ ] Yes
   - [ ] No - need to find it

3. **Do you want me to check your live robots.txt now?**
   - I can fetch it from your site to review

---

## Expected Results After Fixes:

- ✅ 489 404 errors → 0 (all redirected)
- ✅ 498 blocked but indexed → 0 (removed from index)
- ✅ 1 Soft 404 → Fixed
- ✅ 1 Server error → Fixed
- ✅ 14,441 blocked pages → Verified as intentional
- ✅ 6,817 redirects → Verified as working

**Total impact:** Clean up all critical issues, improve SEO health score
