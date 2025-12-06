# BigCommerce API Permissions Required for Buy Organics Online

## Current Status: BLOCKED ❌

The BigCommerce API integration for Buy Organics Online is currently blocked due to insufficient permissions.

## Store Details
- **Store Hash:** `hhhi`
- **Store URL:** https://store-hhhi.mybigcommerce.com
- **Client ID:** `io4rk2k6us06szl2qfcmj23iayvge20`

## How to Fix Permissions

### Step 1: Login to BigCommerce Admin
Navigate to: https://store-hhhi.mybigcommerce.com/manage/

### Step 2: Access API Settings
1. Go to **Settings** → **API** → **Store-level API Accounts**
2. Find the API account with Client ID: `io4rk2k6us06szl2qfcmj23iayvge20`
3. Click **Edit**

### Step 3: Enable Required Scopes

Enable the following OAuth scopes:

#### Currently Working ✅
- [x] **Products** (Modify)
- [x] **Channels** (Read-only)
- [x] **Carts** (Modify)

#### Need to Enable ❌
- [ ] **Orders** (Modify) - Currently returning 403 Forbidden
- [ ] **Customers** (Modify) - Currently returning 403 Forbidden
- [ ] **Information & Settings** (Read-only) - Currently returning 404
- [ ] **Checkouts** (Modify) - Required for checkout monitoring
- [ ] **Order Transactions** (Read-only) - Optional but recommended
- [ ] **Marketing** (Read-only) - Optional for promotions

#### Recommended Additional Scopes
- [ ] **Content** (Modify) - For managing product descriptions/content
- [ ] **Store Inventory** (Modify) - For inventory sync
- [ ] **Themes** (Read-only) - For theme audits (already done)

### Step 4: Save and Test

After saving:
1. Wait 2-3 minutes for permissions to propagate
2. Run validation script: `npx tsx validate-bigcommerce-credentials.ts`
3. Confirm all API endpoints return data (not 403/404)

## Why These Permissions Are Needed

### Orders (Modify)
- Read order data for HubSpot CRM sync
- Track customer purchase history
- Monitor order fulfillment
- Required for n8n workflow: `bigcommerce-order-sync.json`

### Customers (Modify)
- Sync customer data to HubSpot
- Track customer lifetime value
- Segment customers for marketing
- Required for n8n workflow: `bigcommerce-customer-sync.json`

### Information & Settings (Read-only)
- Read store configuration
- Validate shipping zones
- Access store metadata
- Required for health checks

### Checkouts (Modify)
- Monitor checkout errors
- Track cart abandonment
- Debug shipping/payment issues
- Populate `checkout_error_logs` table in Supabase

## Current API Client Status

### Working Endpoints ✅
```typescript
✅ bigcommerceClient.products.list()
✅ bigcommerceClient.products.get(id)
✅ bigcommerceClient.products.update(id, data)
✅ bigcommerceClient.channels.list()
✅ bigcommerceClient.carts.create(data)
```

### Blocked Endpoints ❌
```typescript
❌ bigcommerceClient.orders.list() // 403 Forbidden
❌ bigcommerceClient.customers.list() // 403 Forbidden
❌ bigcommerceClient.store.get() // 404 Not Found
❌ bigcommerceClient.shipping.listZones() // 404 Not Found
```

## Testing After Permissions Update

Run this command to validate:

```bash
npx tsx validate-bigcommerce-credentials.ts
```

Expected output after fix:
```
BigCommerce API Validation Results:

Store Information:
✅ Store Name: Buy Organics Online
✅ Domain: buyorganicsonline.com.au
✅ Store Hash: hhhi

Products API:
✅ Total Products: 10,234
✅ Sample Product: [Product Name]

Orders API:
✅ Total Orders: 5,678
✅ Recent Orders: 12

Customers API:
✅ Total Customers: 3,456
✅ Sample Customer: [Customer Name]

Shipping API:
✅ Shipping Zones: 3
✅ Methods Configured: 8

Channels API:
✅ Active Channels: 2

All permissions validated successfully! ✅
```

## Impact on Migration Plan

**⚠️ CRITICAL:** These permissions MUST be enabled before:
- Phase 3: Building n8n sync workflows
- Phase 4: Testing supplier integrations
- Phase 5: Cutover from AWS

Without these permissions, we cannot:
- Sync orders to HubSpot CRM
- Track customer purchase history
- Monitor checkout errors
- Validate product inventory updates
- Build automated product sync workflows

## Next Steps

1. **You:** Update BigCommerce API permissions (5 minutes)
2. **Me:** Run validation script to confirm
3. **Me:** Proceed with AWS infrastructure audit (Phase 1)

## Questions?

If you encounter issues updating permissions:
- Check if you have admin access to BigCommerce
- Ensure the API account isn't locked
- Try creating a new API account if needed
- Contact BigCommerce support if permissions are greyed out

---

**Status:** Waiting for permission updates
**Blocker:** Cannot proceed with Phase 3-5 until resolved
**Priority:** HIGH - Required before migration can begin
