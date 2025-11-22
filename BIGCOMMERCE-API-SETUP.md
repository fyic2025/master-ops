# BigCommerce API Setup for Buy Organics Online

## Current Status

### ✅ Working Endpoints
- **Products** - Can read product catalog
- **Channels** - Can read sales channels (4 found)

### ❌ Missing Permissions
The current API account needs additional scopes:

1. **Orders** - 403 Forbidden
   - Required for: Testing checkout completion, monitoring order success
   - Scope needed: `Orders` (Read/Modify)

2. **Customers** - 403 Forbidden
   - Required for: Testing logged-in checkout, customer data validation
   - Scope needed: `Customers` (Read/Modify)

3. **Store Information** - Route error
   - Required for: Store configuration, currency, timezone
   - Scope needed: `Information & Settings` (Read-only)

4. **Shipping Zones** - Route error
   - Required for: Testing shipping calculations, debugging shipping errors
   - Scope needed: `Information & Settings` (Read-only)

5. **Payment Methods** - 422 Unprocessable
   - Required for: Payment gateway validation
   - Scope needed: `Create Payments` (Read-only)

## How to Fix

### Option 1: Update Existing API Account (Recommended)

1. **Log into BigCommerce Admin**: https://store-hhhi.mybigcommerce.com/manage/

2. **Navigate to API Accounts**:
   - Settings → API → Store-level API Accounts
   - Find the existing API account (Client ID: `io4rk2k6us06szl2qfcmj23iayvge20`)

3. **Edit Permissions** and enable these scopes:

   | Scope | Permission | Reason |
   |-------|-----------|---------|
   | **Information & Settings** | Read-only | Store info, shipping zones |
   | **Orders** | Modify | Read/test order data |
   | **Order Transactions** | Read-only | Payment verification |
   | **Customers** | Modify | Test customer checkout flows |
   | **Carts** | Modify | Create test carts |
   | **Checkouts** | Modify | Test checkout process |
   | **Products** | Read-only | Already working ✅ |
   | **Marketing** | Read-only | Coupon/discount testing |
   | **Storefront API** | Modify | Frontend integration testing |

4. **Save Changes** - The Access Token will remain the same

### Option 2: Create New API Account

If you prefer to create a dedicated testing account:

1. **Go to**: Settings → API → Store-level API Accounts → **Create API Account**

2. **Name**: "Master-Ops Checkout Testing"

3. **OAuth Scopes**: Select all scopes listed in Option 1 above

4. **Save** and copy the new credentials:
   - Client ID
   - Client Secret
   - Access Token

5. **Update `.env`** file with new credentials

## Verification

After updating permissions, run the validation script again:

\`\`\`bash
npx tsx validate-bigcommerce-credentials.ts
\`\`\`

You should see:
\`\`\`
Tests Passed: 7/7
Success Rate: 100.0%
✅ All validation tests passed!
\`\`\`

## Why These Permissions Are Critical

### For Checkout Testing System
- **Orders + Checkouts**: Monitor real checkout success/failure rates
- **Customers**: Test guest vs logged-in checkout flows
- **Carts**: Create test checkout scenarios
- **Shipping**: Debug "unable to ship" errors (your main issue)
- **Information & Settings**: Read shipping zone configurations

### For Automated Monitoring
- **Orders**: Real-time checkout success tracking
- **Customers**: Track checkout abandonment by customer type
- **Order Transactions**: Payment gateway failure detection

### For Troubleshooting
- **Shipping Zones**: Analyze shipping calculation logic
- **Products**: Verify product shipping requirements
- **Information & Settings**: Check store configuration issues

## Security Notes

- Access Token is server-side only (never expose client-side)
- Stored in `.env` (gitignored)
- Used for testing and monitoring (not customer-facing)
- Rate limit: 450 requests per 30 seconds (BigCommerce standard)

## Next Steps

1. Update API permissions (Option 1 or 2 above)
2. Run validation script
3. Once 100% validated, proceed with:
   - BigCommerce integration library
   - E2E checkout testing suite
   - Shipping error diagnosis
   - Real-time monitoring

---

**Current Credentials** (stored in `.env`):
- Store Hash: `hhhi`
- API Path: `https://api.bigcommerce.com/stores/hhhi/v3/`
- Client ID: `io4rk2k6us06szl2qfcmj23iayvge20`
- Access Token: `mobbbrozgih039l5igigyyqj6eqvvhj`
