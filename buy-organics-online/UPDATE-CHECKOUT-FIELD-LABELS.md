# Update Checkout Field: Change "City" to "Suburb"

**Issue:** Checkout form shows "City" but Australia uses "Suburb"
**Solution:** Update BigCommerce checkout field labels

---

## How to Fix

### Option 1: BigCommerce Control Panel (Easiest - 5 minutes)

**Step 1: Access Checkout Settings**

1. Login to BigCommerce: https://store-hhhi.mybigcommerce.com/manage/
2. Go to: **Settings** → **Checkout**
3. Scroll to: **Checkout Fields**

**Step 2: Customize Field Label**

1. Find: **City** field
2. Click: **Edit** or **Customize**
3. Change label from: `City`
4. To: `Suburb`
5. Click: **Save**

**That's it!** The checkout will now show "Suburb" instead of "City".

---

### Option 2: Via Stencil Theme (More Control)

If you have a custom Stencil theme, you can update the language file:

**Location:** `/lang/en.json` in your theme

**Find:**
```json
{
  "address": {
    "city": "City",
    "city_label": "City"
  }
}
```

**Change to:**
```json
{
  "address": {
    "city": "Suburb",
    "city_label": "Suburb"
  }
}
```

Then re-upload your theme.

---

### Option 3: Using BigCommerce Script Manager (Advanced)

Add custom JavaScript to override the label:

**Location:** Settings → Advanced → Script Manager

**Script:**
```html
<script>
// Change City to Suburb on checkout
(function() {
  function updateCityLabel() {
    // Find all labels containing "City"
    const labels = document.querySelectorAll('label');

    labels.forEach(label => {
      if (label.textContent.trim() === 'City') {
        label.textContent = 'Suburb';
      }
    });

    // Also update placeholder if it exists
    const cityInputs = document.querySelectorAll('input[name*="city"]');
    cityInputs.forEach(input => {
      if (input.placeholder === 'City') {
        input.placeholder = 'Suburb';
      }
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCityLabel);
  } else {
    updateCityLabel();
  }

  // Run when checkout updates (for dynamic loading)
  const observer = new MutationObserver(updateCityLabel);
  observer.observe(document.body, { childList: true, subtree: true });
})();
</script>
```

**When to add:** Checkout page
**Placement:** Footer

---

## Recommended Approach

**Use Option 1** (Control Panel) - it's:
- ✅ Easiest to implement
- ✅ Officially supported by BigCommerce
- ✅ Won't be overwritten by theme updates
- ✅ No coding required
- ✅ Takes 5 minutes

---

## Additional Australian Localization

While you're at it, you might want to also update:

### State/Province
- Default: "State/Province"
- Better for AU: "State" or "State/Territory"

### Postal Code
- Default: "Postal Code"
- Better for AU: "Postcode" (one word)

### Phone Number Format
- Ensure it accepts: `04XX XXX XXX` (mobile)
- And: `(03) XXXX XXXX` (landline)

---

## Verification

After making the change:

1. Open checkout in incognito/private window
2. Clear cache (Ctrl+Shift+R)
3. Verify "Suburb" appears instead of "City"
4. Test on mobile as well

---

## Notes

- This is purely a **label change**
- The underlying field name stays as "city" in the database
- This is normal and expected
- BigCommerce and Australia Post understand "city" = "suburb"
- ShipperHQ will still work correctly

---

## BigCommerce Support

If you have trouble finding the Checkout Fields settings:

**Support:** https://support.bigcommerce.com/s/
**Documentation:** https://support.bigcommerce.com/s/article/Optimized-One-Page-Checkout

Search for: "customize checkout fields"

---

**Estimated Time:** 5 minutes
**Difficulty:** Easy
**Recommended Method:** Option 1 (Control Panel)
