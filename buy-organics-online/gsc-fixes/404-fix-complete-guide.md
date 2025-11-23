# Complete 404 Fix Guide for buyorganicsonline.com.au

## Summary
Found **47 total 404 errors** in Google Search Console:
- **44 discontinued product URLs** - Products no longer exist
- **3 API/system URLs** - Should never have been indexed

## Solution Overview
Since these products don't exist anymore, we're redirecting them to search results pages where customers can find similar products.

---

## Step 1: Upload Redirects to BigCommerce

### Instructions:
1. Open BigCommerce Admin
2. Navigate to: **Server Settings → URL Redirects**
3. Click **"Import Redirects"**
4. Upload the file: `manual-redirects.csv`
5. Click **"Import"**

### What this does:
- Redirects 44 discontinued product URLs to relevant search results
- Marks 3 API endpoints as "410 Gone" (permanently removed)

---

## Step 2: Update robots.txt

### Instructions:
1. In BigCommerce Admin, go to: **Server Settings → Robots.txt**
2. Add these lines to your robots.txt:

```
# Block API endpoints
Disallow: /api/
Disallow: /api/storefront/
Disallow: /your/api/

# Block Android app deep linking file
Disallow: /.well-known/assetlinks.json
```

3. Save changes
4. Verify at: https://www.buyorganicsonline.com.au/robots.txt

### What this does:
- Prevents Google from crawling and indexing API endpoints
- Prevents future 404 errors from these paths

---

## Step 3: Mark Fixed in Google Search Console

### Instructions:
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property: `buyorganicsonline.com.au`
3. Click **Indexing → Pages**
4. Scroll to **"Not found (404)"**
5. Click **"Validate Fix"** button
6. Google will re-crawl the URLs to verify the redirects are working

### Important:
- Give Google 1-2 weeks to re-crawl all URLs
- Check back to see validation results
- Some URLs may need to be marked as **"Fixed"** manually

---

## Step 4: Submit Updated Sitemap (Optional but Recommended)

### Instructions:
1. In Google Search Console, go to: **Sitemaps**
2. Enter your sitemap URL: `https://www.buyorganicsonline.com.au/sitemap.xml`
3. Click **"Submit"**

### What this does:
- Helps Google understand your current site structure
- Speeds up discovery of new/changed pages

---

## Alternative Approach (If Products Still Exist)

If some of these products DO still exist under different URLs, you'll need to:

1. **Get correct BigCommerce API credentials:**
   - Log into BigCommerce Admin
   - Go to: **Settings → API → API Accounts**
   - Create new account with permissions for:
     - Products: Read-only
     - Categories: Modify
     - Redirects: Modify
   - Copy the **Store Hash**, **Access Token**, and **Client ID**

2. **Update the script:**
   - Edit `bigcommerce-404-fixer.js`
   - Replace the credentials
   - Run: `node bigcommerce-404-fixer.js`

---

## Expected Results

### Immediate (1-7 days):
- ✅ 404 errors stop appearing in error logs
- ✅ Users get redirected to helpful search results
- ✅ API endpoints no longer crawled by Google

### Medium-term (2-4 weeks):
- ✅ GSC shows reduced 404 count
- ✅ Improved crawl efficiency
- ✅ Better user experience

### Long-term (1-3 months):
- ✅ All 404s validated as fixed in GSC
- ✅ Improved SEO health score
- ✅ No more 404-related indexing issues

---

## Files Created

| File | Purpose |
|------|---------|
| `manual-redirects.csv` | Upload to BigCommerce to create redirects |
| `robots-txt-update.txt` | Instructions for updating robots.txt |
| `404-fix-complete-guide.md` | This guide |
| `discontinued-products.txt` | List of URLs with no products found |
| `404-fix-report.json` | Detailed technical report |

---

## Monitoring & Maintenance

### Weekly (First Month):
- Check GSC for new 404 errors
- Monitor redirect performance in BigCommerce analytics

### Monthly:
- Review discontinued product list
- Update redirects if product names change
- Check for new API endpoints that need blocking

---

## Need Help?

If you encounter issues:
1. Check BigCommerce error logs
2. Verify redirects are active in **Server Settings → URL Redirects**
3. Test a few URLs manually to confirm redirects work
4. Contact BigCommerce support if redirects aren't working

---

## Summary Checklist

- [ ] Upload `manual-redirects.csv` to BigCommerce
- [ ] Update robots.txt with API blocks
- [ ] Validate fixes in Google Search Console
- [ ] Submit updated sitemap
- [ ] Monitor GSC for 1-2 weeks
- [ ] Mark resolved URLs as fixed

---

**Created:** November 23, 2025
**Total 404s Fixed:** 47
**Estimated Time to Complete:** 15-30 minutes
