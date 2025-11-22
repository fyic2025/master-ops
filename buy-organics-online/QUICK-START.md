# Buy Organics Online - Quick Start Guide

**Store:** Buy Organics Online (buyorganicsonline.com.au)
**Platform:** BigCommerce
**Store Hash:** hhhi

---

## Current Status: 🟡 BLOCKED - API Permissions Required

**What's Working:**
- ✅ Products API
- ✅ Channels API
- ✅ Cart creation

**What's Missing:**
- ❌ Orders API (403 Forbidden)
- ❌ Customers API (403 Forbidden)
- ❌ Shipping Zones API (404 Not Found)
- ❌ Store Information API (404 Not Found)

---

## IMMEDIATE ACTION REQUIRED

### Update API Permissions (30 minutes)

1. **Login to BigCommerce:**
   - URL: https://store-hhhi.mybigcommerce.com/manage/

2. **Go to API Settings:**
   - Settings → API → Store-level API Accounts

3. **Find Existing Account:**
   - Client ID: `io4rk2k6us06szl2qfcmj23iayvge20`

4. **Enable These Scopes:**
   - ✅ Information & Settings (Read-only)
   - ✅ Orders (Modify)
   - ✅ Order Transactions (Read-only)
   - ✅ Customers (Modify)
   - ✅ Carts (Modify)
   - ✅ Checkouts (Modify)

5. **Save Changes**

---

## After Permissions Are Updated

### Step 1: Validate API Access (5 minutes)

```bash
cd /root/master-ops
npx tsx validate-bigcommerce-credentials.ts
```

**Expected Output:**
```
Tests Passed: 7/7
Success Rate: 100.0%
✅ All validation tests passed!
```

### Step 2: Run Integration Tests (5 minutes)

```bash
npx tsx test/bigcommerce-boo-integration-test.ts
```

**Expected Output:**
```
Total Tests: 15
✅ Passed: 15
❌ Failed: 0
✅ All tests passed!
```

### Step 3: Diagnose Checkout Issues (2-4 hours)

Use the BigCommerce integration library to:

1. **Check Shipping Configuration**
   ```typescript
   import { bigcommerceClient } from './shared/libs/integrations/bigcommerce'

   // List shipping zones
   const zones = await bigcommerceClient.shipping.listZones()

   // Get shipping methods for each zone
   for (const zone of zones) {
     const methods = await bigcommerceClient.shipping.listMethods(zone.id)
     console.log(`Zone: ${zone.name}`)
     console.log(`Methods:`, methods)
   }
   ```

2. **Analyze Recent Orders**
   ```typescript
   // Get recent orders
   const orders = await bigcommerceClient.orders.list({
     limit: 100,
     sort: 'date_created',
     direction: 'desc',
   })

   // Check for patterns in failed/abandoned orders
   const failedOrders = orders.filter(o => o.status_id === 0)
   ```

3. **Test Checkout Flow**
   ```typescript
   // Create test cart
   const cart = await bigcommerceClient.carts.create({
     line_items: [{ product_id: 123, quantity: 1 }]
   })

   // Get checkout
   const checkout = await bigcommerceClient.checkouts.get(cart.id)

   // Add billing address
   await bigcommerceClient.checkouts.addBillingAddress(checkout.id, {
     billing_address: { /* address data */ }
   })
   ```

---

## Key Documentation

1. **[TASK-2-REVIEW-REPORT.md](../TASK-2-REVIEW-REPORT.md)** - Full task review and status
2. **[BIGCOMMERCE-API-SETUP.md](../BIGCOMMERCE-API-SETUP.md)** - API setup instructions
3. **[Integration Library README](../shared/libs/integrations/bigcommerce/README.md)** - API usage guide

---

## Quick Commands

```bash
# Validate API credentials
npx tsx validate-bigcommerce-credentials.ts

# Run integration tests
npx tsx test/bigcommerce-boo-integration-test.ts

# Check integration library metrics
npx tsx -e "import { bigcommerceClient } from './shared/libs/integrations/bigcommerce'; console.log(bigcommerceClient.getMetrics())"
```

---

## Support

- **BigCommerce Admin:** https://store-hhhi.mybigcommerce.com/manage/
- **API Documentation:** https://developer.bigcommerce.com/docs/rest-management
- **Store Website:** https://buyorganicsonline.com.au

---

**Last Updated:** 2025-11-21
**Status:** Waiting for API permission update
**Next Action:** Update BigCommerce API permissions
