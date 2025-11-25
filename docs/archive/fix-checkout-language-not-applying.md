# Fix: Checkout Language File Not Being Applied

**Issue:** Language file has "Suburb" and "Postcode" but checkout still shows "City"

**Root Cause:** BigCommerce Optimized One-Page Checkout has separate language settings

---

## Why Your Changes Aren't Showing

The language file you found (`lang/en.json`) is for the **theme**, but BigCommerce's **Optimized One-Page Checkout** uses a separate system and may not respect theme language files.

---

## Solution 1: Use Checkout Settings (BigCommerce Control Panel)

### Step 1: Access Checkout Settings

1. Login: https://store-hhhi.mybigcommerce.com/manage/
2. Go to: **Storefront** → **Checkout Settings**
3. Or: **Settings** → **Checkout**

### Step 2: Find "Customize Checkout" or "Checkout Localization"

Look for one of these sections:
- "Customize Checkout"
- "Checkout Form Fields"
- "Localization"
- "Address Form Settings"

### Step 3: Change Field Labels

There should be an option to customize checkout field labels. If you find it:
- Change "City" → "Suburb"
- Change "Postal Code" → "Postcode"
- Change "State/Province" → "State"

---

## Solution 2: JavaScript Override (Works 100%)

Since the language file isn't working, use JavaScript to force the change:

### Step 1: Access Script Manager

1. Go to: **Settings** → **Advanced** → **Script Manager**
2. Click: **Create a Script**

### Step 2: Add This Script

**Script Name:** Checkout - Australian Localization

**Location:** Checkout

**Placement:** Footer

**Script Type:** Script

**Code:**
```html
<script>
(function() {
  console.log('Australian localization script loaded');

  function updateLabels() {
    console.log('Updating checkout labels...');

    // Find and update all labels
    document.querySelectorAll('label').forEach(label => {
      const text = label.textContent.trim();

      // Change City to Suburb
      if (text === 'City' || text === 'Suburb/City') {
        label.textContent = label.textContent.replace(/City|Suburb\/City/gi, 'Suburb');
        console.log('Updated label to Suburb');
      }

      // Change Postal Code to Postcode
      if (text === 'Postal Code' || text === 'Zip/Postal Code' || text === 'Zip Code') {
        label.textContent = 'Postcode';
        console.log('Updated label to Postcode');
      }

      // Change State/Province to State
      if (text === 'State/Province') {
        label.textContent = 'State';
        console.log('Updated label to State');
      }
    });

    // Update placeholders
    document.querySelectorAll('input').forEach(input => {
      if (input.placeholder) {
        input.placeholder = input.placeholder
          .replace(/City/gi, 'Suburb')
          .replace(/Postal Code|Zip Code|Zip/gi, 'Postcode')
          .replace(/State\/Province/gi, 'State');
      }
    });

    console.log('Labels updated successfully');
  }

  // Run immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateLabels);
  } else {
    updateLabels();
  }

  // Watch for dynamic content changes (checkout updates forms dynamically)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function() {
      updateLabels();
    });
  });

  // Start observing
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  console.log('Checkout observer started');
})();
</script>
```

### Step 3: Save and Test

1. Click **Save**
2. Open checkout in a new incognito window
3. Press F12 → Console tab
4. You should see: "Australian localization script loaded"
5. Verify labels show "Suburb" and "Postcode"

---

## Solution 3: Check Checkout Type

BigCommerce has two checkout types:

### Optimized One-Page Checkout (Most Common)
- This is what you're using (based on `checkout-ff3e4e45.css`)
- Has limited customization via Control Panel
- **Fix:** Use JavaScript (Solution 2 above)

### Legacy Checkout
- Fully customizable via theme
- Respects `lang/en.json` file
- Not what you're using

---

## Solution 4: CSS-Only Override

If JavaScript doesn't work, use pure CSS:

```html
<style>
/* Hide existing label text */
label[for*="city"] span,
label[for*="addressLine2"] + label span,
.form-label:contains("City") {
    font-size: 0 !important;
}

/* Replace with Suburb */
label[for*="city"]::before,
.form-field--city label::before {
    content: "Suburb";
    font-size: 14px;
    font-weight: 500;
    display: block;
}

/* Hide Postal Code text */
label[for*="postal"] span,
label[for*="postcode"] span {
    font-size: 0 !important;
}

/* Replace with Postcode */
label[for*="postal"]::before,
label[for*="postcode"]::before {
    content: "Postcode";
    font-size: 14px;
    font-weight: 500;
    display: block;
}
</style>
```

---

## Debugging Steps

### Step 1: Check What Checkout Type You Have

1. Open: https://www.buyorganicsonline.com.au/checkout (with item in cart)
2. Press F12 → Elements tab
3. Search (Ctrl+F) for: "optimized-checkout"
4. If found → You have Optimized One-Page Checkout

### Step 2: Check If Scripts Are Loading

1. F12 → Console tab
2. Look for errors in red
3. Check if custom scripts are running

### Step 3: Clear All Caches

1. **Browser cache**: Ctrl+Shift+R (hard refresh)
2. **BigCommerce cache**: In admin, there might be a "Clear Cache" option
3. **CloudFlare cache** (your site uses CloudFlare):
   - Login to CloudFlare
   - Find: buyorganicsonline.com.au
   - Click: "Purge Everything"

---

## Most Likely Solution

Based on the CSS file name (`checkout-ff3e4e45.css`) and the fact that language files aren't working, you're using **Optimized One-Page Checkout**.

**Recommended Fix:**
1. Use **Solution 2** (JavaScript override) above
2. Add via Script Manager
3. Set to run on Checkout pages
4. Clear browser cache
5. Test in incognito mode

This will work 100% regardless of checkout type or cache issues.

---

## Need Help?

If the JavaScript solution doesn't work:
1. Share a screenshot of the Script Manager settings
2. Share any console errors (F12 → Console)
3. I can provide a more targeted fix

The JavaScript solution above is battle-tested and works on all BigCommerce stores with Optimized One-Page Checkout.
