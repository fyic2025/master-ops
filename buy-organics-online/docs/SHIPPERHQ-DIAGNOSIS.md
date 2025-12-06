# Buy Organics Online - ShipperHQ Shipping Diagnosis

**Date:** 2025-11-21
**Issue:** "Unable to ship" errors at checkout
**Shipping System:** ShipperHQ (third-party app)

---

## Critical Information

Your store uses **ShipperHQ** to manage shipping rates, NOT BigCommerce's native shipping zones.

**What this means:**
- The BigCommerce shipping zones (Australia disabled, NZ enabled) are likely **not being used**
- ShipperHQ overrides native BigCommerce shipping
- The issue is in ShipperHQ configuration, not BigCommerce zones

---

## ShipperHQ vs Native Shipping

### BigCommerce Native Zones (NOT USED)
```
Zone 74: Aust - Default (DISABLED)
Zone 185: New Zealand (ENABLED)
```
**Status:** These zones are likely irrelevant since ShipperHQ is handling shipping

### ShipperHQ (ACTIVE SYSTEM)
```
Location: BigCommerce → Apps → ShipperHQ
Controls: All shipping rate calculations
Requires: Separate configuration in ShipperHQ dashboard
```

---

## How to Access ShipperHQ

1. **Login to BigCommerce:**
   - https://store-hhhi.mybigcommerce.com/manage/

2. **Navigate to Apps:**
   - Go to: **Apps** → **My Apps**
   - Find: **ShipperHQ**
   - Click: **Launch** (opens ShipperHQ dashboard)

3. **ShipperHQ Dashboard:**
   - This is where ALL shipping rules are managed
   - Separate from BigCommerce shipping settings

---

## Common ShipperHQ Issues Causing "Unable to Ship"

### Issue #1: ShipperHQ Connection Failed
**Symptoms:**
- "Unable to ship" at checkout
- No shipping rates appear
- Error in browser console

**Cause:** ShipperHQ API not connecting

**Check:**
1. ShipperHQ Dashboard → Settings → Connection Status
2. Look for "Connected" or "Disconnected" status
3. Check API credentials are valid

**Fix:** Reconnect ShipperHQ integration in BigCommerce

---

### Issue #2: No Shipping Rules for Australia
**Symptoms:**
- Checkout works for some addresses but not others
- Specific postcodes fail
- Rural areas fail

**Cause:** ShipperHQ rules don't cover all Australian addresses

**Check:**
1. ShipperHQ Dashboard → **Shipping Rules**
2. Review rules covering Australia
3. Check if postcodes/regions are included

**Fix:** Add shipping rules to cover all Australian postcodes

---

### Issue #3: Origin Address Not Set (or Wrong)
**Symptoms:**
- All shipping calculations fail
- Rates show $0.00
- Distance calculations incorrect

**Cause:** ShipperHQ doesn't know where to ship FROM

**Check:**
1. ShipperHQ Dashboard → **Settings** → **Origin**
2. Verify Australian warehouse address is set
3. Ensure postcode is correct

**Fix:** Set correct Australian origin address

---

### Issue #4: Products Missing Weight
**Symptoms:**
- Some products can't be shipped
- Shipping rates show $0 or error
- Specific products cause checkout to fail

**Cause:** ShipperHQ requires weight to calculate shipping

**Current Status:**
✅ All checked products (10/10) have weight set
⚠️ All products (10/10) missing dimensions

**Products Checked:**
- Biologika Live It Up Deodorant Roll On 70ml: 0.2 kg
- Invoke Prosperity Room Air Freshener 125ml: 0.35 kg
- Ecologic Citrus & Tea Tree Bathroom Spray: 0.85 kg
- Ecologic Pine & Lemon Eucalyptus Toilet Clean: 0.85 kg
- And 6 more...

**Impact:** Dimensions not critical for basic shipping, but may affect:
- Volumetric weight calculations
- Carrier selection
- Packaging size determination

---

### Issue #5: Carrier Integration Not Configured
**Symptoms:**
- Shipping works manually but not automatically
- Can't select live carrier rates
- Fallback to flat rates

**Cause:** Australia Post API not connected to ShipperHQ

**Check:**
1. ShipperHQ Dashboard → **Carriers**
2. Look for: Australia Post integration
3. Check: API credentials configured

**Fix:** Set up Australia Post API integration with ShipperHQ

---

### Issue #6: ShipperHQ Disabled at Checkout
**Symptoms:**
- Shipping worked before, now doesn't
- No rates returned
- BigCommerce tries to use native zones

**Cause:** ShipperHQ not active at checkout level

**Check:**
1. BigCommerce → Settings → Checkout
2. Look for ShipperHQ in shipping options
3. Ensure it's enabled/selected

**Fix:** Re-enable ShipperHQ at checkout

---

## Diagnostic Steps

### Step 1: Verify ShipperHQ Connection

```bash
# Run our diagnostic script
cd /root/master-ops
npx tsx check-shipperhq-integration.ts
```

### Step 2: Access ShipperHQ Dashboard

1. BigCommerce → Apps → My Apps → ShipperHQ → Launch
2. Check connection status (top right corner)
3. Should show "Connected" with green indicator

### Step 3: Test Shipping Calculation

**In ShipperHQ Dashboard:**
1. Go to: **Dashboard** → **Test Rates**
2. Enter test data:
   - Product weight: 1 kg
   - Destination: Sydney, NSW 2000, Australia
   - Origin: Your warehouse address
3. Click: **Calculate**

**Expected Result:**
- Should return Australia Post rates
- Should show delivery options
- Should show costs

**If it fails:**
- Check origin address is set
- Check shipping rules cover Sydney
- Check carrier integration

### Step 4: Check Shipping Rules

1. ShipperHQ Dashboard → **Shipping → Rules**
2. Look for rules covering Australia
3. Check rule conditions:
   - Destination country: Australia
   - Weight range: Appropriate for your products
   - Zone/Region: All of AU or specific states

**Common issues:**
- Rules only cover certain states (NSW, VIC)
- Rules have weight limits that exclude products
- Rules have postcode restrictions

### Step 5: Review Origin Configuration

1. ShipperHQ Dashboard → **Settings → Origin**
2. Verify:
   - Full Australian address entered
   - Correct postcode
   - State correctly selected
   - Country: Australia

**This is critical:** If origin is wrong, all distance calculations fail.

---

## Quick Fixes (Most Common Solutions)

### Fix #1: Reconnect ShipperHQ (If Disconnected)

1. BigCommerce → Apps → My Apps
2. Find ShipperHQ → Uninstall
3. Visit BigCommerce App Marketplace
4. Search: ShipperHQ
5. Reinstall and reconnect
6. Re-enter API credentials

### Fix #2: Add Universal Australia Rule

**In ShipperHQ Dashboard:**

1. Go to: **Shipping → Rules → Add Rule**
2. Set:
   - Name: "Australia Standard Shipping"
   - Destination: Country = Australia
   - Method: Australia Post (or Flat Rate)
   - Rate: $9.95 (or your standard rate)
3. Save

This ensures ALL Australian addresses have at least one shipping option.

### Fix #3: Set Origin Address

1. ShipperHQ → Settings → Origin
2. Enter your warehouse address:
   ```
   Street: [Your warehouse street]
   City: [Your city]
   State: [NSW/VIC/QLD etc]
   Postcode: [Your postcode]
   Country: Australia
   ```
3. Save

---

## Testing After Fixes

### Test Case 1: Sydney Metro
```
Address: 123 George St, Sydney NSW 2000
Expected: Should return shipping rates
```

### Test Case 2: Melbourne Metro
```
Address: 456 Collins St, Melbourne VIC 3000
Expected: Should return shipping rates
```

### Test Case 3: Brisbane Suburb
```
Address: 789 Queen St, Brisbane QLD 4000
Expected: Should return shipping rates
```

### Test Case 4: Rural NSW
```
Address: 10 Main St, Dubbo NSW 2830
Expected: Should return shipping rates (may be higher)
```

### Test Case 5: Western Australia
```
Address: 22 Hay St, Perth WA 6000
Expected: Should return shipping rates
```

**If any test fails:**
- Check ShipperHQ rules cover that state/region
- Check postcodes aren't excluded
- Check weight limits aren't exceeded

---

## Integration Check Results

✅ **Products have weight configured**
- All 10 sampled products have weight set
- Weight range: 0.2kg - 17.9kg
- ShipperHQ can calculate rates

⚠️ **Products missing dimensions**
- All 10 products missing width/height/depth
- Not critical for basic shipping
- May affect volumetric calculations

---

## What We Cannot Check from API

BigCommerce API **does not expose** ShipperHQ configuration. We cannot check:
- ❌ ShipperHQ connection status
- ❌ ShipperHQ shipping rules
- ❌ ShipperHQ origin address
- ❌ ShipperHQ carrier integrations
- ❌ ShipperHQ API credentials

**You must check these manually** in the ShipperHQ dashboard.

---

## Tools Created

### 1. ShipperHQ Integration Checker
```bash
npx tsx check-shipperhq-integration.ts
```
- Checks product weights/dimensions
- Lists shipping zones
- Provides diagnostic guidance

### 2. BigCommerce API Integration
- Full access to products, orders, customers
- Can monitor orders for shipping failures
- Can check product configurations

---

## Recommended Next Actions

### Immediate (Today)
1. ✅ **Access ShipperHQ dashboard** (5 mins)
   - BigCommerce → Apps → ShipperHQ → Launch

2. ✅ **Check connection status** (2 mins)
   - Look for "Connected" indicator
   - If disconnected, reconnect integration

3. ✅ **Verify origin address** (3 mins)
   - Settings → Origin
   - Ensure correct Australian warehouse address

4. ✅ **Test rate calculation** (5 mins)
   - Dashboard → Test Rates
   - Try Sydney NSW 2000 address
   - Verify rates are returned

### Short Term (This Week)
1. **Review shipping rules** (30 mins)
   - Ensure all Australian states covered
   - Check postcode exclusions
   - Verify weight limits appropriate

2. **Test with real checkout** (15 mins)
   - Add product to cart
   - Try multiple AU addresses
   - Verify shipping options appear

3. **Monitor failed checkouts** (Ongoing)
   - Check for patterns in addresses
   - Identify specific postcodes failing
   - Adjust ShipperHQ rules accordingly

---

## Support Resources

### ShipperHQ Support
- **Help Center:** https://docs.shipperhq.com/
- **Support:** support@shipperhq.com
- **Phone:** Check your ShipperHQ account for support number

### Australia Post Integration
- **ShipperHQ Australia Post Guide:** https://docs.shipperhq.com/australia-post/
- **API Setup:** Required for live rates
- **Fallback:** Manual rate tables if API not configured

### BigCommerce + ShipperHQ
- **Integration Guide:** https://support.bigcommerce.com/s/article/ShipperHQ
- **App Marketplace:** https://www.bigcommerce.com/apps/shipperhq/

---

## Summary

**Key Finding:** Your shipping is managed by ShipperHQ, not BigCommerce native zones.

**Root Cause Possibilities:**
1. ShipperHQ connection issue
2. ShipperHQ rules don't cover all of Australia
3. Origin address not configured
4. Carrier integration not working

**Cannot Diagnose from API:**
- ShipperHQ configuration is not accessible via BigCommerce API
- Must check manually in ShipperHQ dashboard

**Immediate Action:**
Access ShipperHQ dashboard and verify:
- ✅ Connected status
- ✅ Origin address set
- ✅ Shipping rules for Australia
- ✅ Test rate calculation works

**Tools Available:**
- `check-shipperhq-integration.ts` - Product/zone checker
- Full BigCommerce API integration
- Comprehensive documentation

---

**Report Created:** 2025-11-21
**Status:** Requires ShipperHQ dashboard access to complete diagnosis
**API Integration:** ✅ 100% Working
**Next Step:** Access ShipperHQ dashboard
