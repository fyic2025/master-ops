# Buy Organics Online - Checkout Error Tracking System

This system captures ALL checkout-related errors that don't appear in normal BigCommerce store logs and sends email notifications with full customer details, cart contents, and shipping address.

## What Gets Captured

| Error Type | Examples |
|------------|----------|
| **Add to Cart** | "Cannot add product to cart", stock issues, invalid options |
| **Shipping Address** | Invalid postcode, unsupported region, address validation failures |
| **Shipping Method** | No shipping quotes available, shipping calculation errors |
| **Payment** | Card declined, payment gateway errors, validation failures |
| **Validation** | Missing required fields, form errors, checkout validation |
| **JavaScript Errors** | Script errors on checkout pages that break functionality |

## Email Notifications

Each error sends an email to:
- **To:** sales@buyorganicsonline.com.au
- **CC:** jayson@fyic.com.au

The email includes:
- Error message and type
- Customer name, email, and phone
- Full shipping address
- Complete cart contents with prices
- Cart total value
- Technical details (page URL, browser, session ID)

---

## Setup Instructions

### Step 1: Deploy Supabase Edge Function

1. **Navigate to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select the Buy Organics Online project

2. **Create the Edge Function**
   ```bash
   cd /home/user/master-ops/buy-organics-online/supabase
   supabase functions deploy checkout-error-collector
   ```

3. **Set Environment Variables**
   In Supabase Dashboard → Settings → Edge Functions, add:

   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   BOO_CHECKOUT_WEBHOOK_SECRET=your-random-secret-here
   ```

   For email sending (choose ONE):

   **Option A: Resend (Recommended)**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=alerts@buyorganicsonline.com.au
   ```

   **Option B: SendGrid**
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxx
   EMAIL_FROM=alerts@buyorganicsonline.com.au
   ```

4. **Get the Function URL**
   After deployment, note the URL:
   ```
   https://your-project.supabase.co/functions/v1/checkout-error-collector
   ```

### Step 2: Apply Database Schema

The `checkout_error_logs` table should already exist. If not:

```bash
cd /home/user/master-ops
psql $DATABASE_URL -f infra/supabase/schema-bigcommerce-checkout.sql
```

### Step 3: Install JavaScript on BigCommerce Storefront

1. **Edit the Storefront Script**

   Open `/home/user/master-ops/buy-organics-online/storefront/checkout-error-tracker.js`

   Update these values at the top:
   ```javascript
   const ENDPOINT_URL = 'https://your-project.supabase.co/functions/v1/checkout-error-collector';
   const WEBHOOK_SECRET = 'your-random-secret-here';  // Must match BOO_CHECKOUT_WEBHOOK_SECRET
   const DEBUG = false;  // Set to true for testing
   ```

2. **Add to BigCommerce Theme**

   **Option A: Via Script Manager (Easiest)**
   - Go to BigCommerce Admin → Storefront → Script Manager
   - Click "Create a Script"
   - Settings:
     - Name: `Checkout Error Tracker`
     - Location: `Footer`
     - Pages: `All Pages` (or at minimum: Cart, Checkout)
     - Script Type: `Script`
   - Paste the entire contents of `checkout-error-tracker.js`
   - Save

   **Option B: Via Theme Files**
   - Download your theme
   - Add the script to `templates/layout/base.html` before `</body>`:
     ```html
     <script src="{{cdn '/assets/js/checkout-error-tracker.js'}}"></script>
     ```
   - Upload `checkout-error-tracker.js` to `assets/js/`
   - Re-upload the theme

### Step 4: Configure Email Service

**Option A: Gmail / G Suite (Recommended - Uses Existing Setup)**

Since you already have G Suite connected, this is the easiest option.

1. **Use existing OAuth2 credentials** or create new ones:
   - Go to Google Cloud Console: https://console.cloud.google.com
   - Select your project (or create one)
   - Enable Gmail API: APIs & Services → Library → Gmail API → Enable
   - Create OAuth2 credentials: APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID

2. **Get a refresh token** (if not already available):
   - Use the OAuth2 Playground: https://developers.google.com/oauthplayground
   - Authorize `https://www.googleapis.com/auth/gmail.send` scope
   - Exchange authorization code for refresh token

3. **Add to Supabase Edge Function secrets:**
   ```
   BOO_GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   BOO_GMAIL_CLIENT_SECRET=your-client-secret
   BOO_GMAIL_REFRESH_TOKEN=your-refresh-token
   BOO_GMAIL_USER_EMAIL=alerts@buyorganicsonline.com.au
   BOO_GMAIL_FROM_NAME=Buy Organics Online Alerts
   ```

   Or use shared credentials (will fall back to these):
   ```
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   GMAIL_USER_EMAIL=...
   ```

**Option B: Resend (Fallback)**

1. Sign up at https://resend.com
2. Verify your domain (buyorganicsonline.com.au)
3. Create an API key
4. Add to Supabase Edge Function secrets:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

**Option C: SendGrid (Fallback)**

1. Sign up at https://sendgrid.com
2. Verify sender identity
3. Create an API key with "Mail Send" permission
4. Add to Supabase Edge Function secrets:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxx
   ```

**Priority Order:** Gmail → Resend → SendGrid (first configured option is used)

---

## Testing

### Test the Edge Function

```bash
curl -X POST https://your-project.supabase.co/functions/v1/checkout-error-collector \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "error_type": "add_to_cart",
    "error_message": "Test error - Cannot add product to cart",
    "customer_email": "test@example.com",
    "customer_name": "Test Customer",
    "products": [
      {"name": "Organic Coconut Oil", "quantity": 2, "price": 24.95}
    ],
    "cart_value": 49.90,
    "shipping_address": {
      "first_name": "Test",
      "last_name": "Customer",
      "address1": "123 Test Street",
      "city": "Melbourne",
      "state": "VIC",
      "postcode": "3000",
      "country": "Australia"
    }
  }'
```

### Test on Storefront

1. Enable debug mode in the script:
   ```javascript
   const DEBUG = true;
   ```

2. Open browser console on your store

3. Manually trigger an error:
   ```javascript
   BOOErrorTracker.reportAddToCartError('Test Product', 'Test error message');
   ```

4. Check:
   - Browser console for `[BOO Error Tracker]` messages
   - Supabase dashboard for new rows in `checkout_error_logs`
   - Email inbox for notification

---

## Viewing Errors

### In Supabase Dashboard

1. Go to Table Editor → `checkout_error_logs`
2. Use the `recent_checkout_errors` view for unresolved errors
3. Use `shipping_error_hotspots` view to see geographic patterns

### Via SQL

```sql
-- Recent unresolved errors
SELECT * FROM recent_checkout_errors;

-- Errors by type (last 7 days)
SELECT error_type, COUNT(*), MAX(occurred_at) as last_seen
FROM checkout_error_logs
WHERE occurred_at > NOW() - INTERVAL '7 days'
GROUP BY error_type
ORDER BY count DESC;

-- Shipping hotspots
SELECT * FROM shipping_error_hotspots;

-- Mark error as resolved
UPDATE checkout_error_logs
SET resolved = true, resolved_at = NOW(), resolved_by = 'jayson', resolution_notes = 'Fixed shipping zone config'
WHERE id = 'error-uuid-here';
```

---

## Troubleshooting

### Errors not being captured

1. Check browser console for JavaScript errors
2. Verify the ENDPOINT_URL is correct
3. Ensure CORS is working (check Network tab for blocked requests)
4. Enable DEBUG mode to see logging

### Emails not sending

1. Check Supabase Edge Function logs for errors
2. Verify email service API key is correct
3. Check email service dashboard for delivery status
4. Ensure sender domain is verified

### Database errors

1. Verify the `checkout_error_logs` table exists
2. Check RLS policies allow insert via service role
3. Verify SUPABASE_SERVICE_ROLE_KEY is correct

---

## Files Reference

| File | Description |
|------|-------------|
| `supabase/functions/checkout-error-collector/index.ts` | Edge function that receives errors, stores in DB, sends emails |
| `storefront/checkout-error-tracker.js` | JavaScript to add to BigCommerce theme |
| `../../infra/supabase/schema-bigcommerce-checkout.sql` | Database schema |

---

## Security Notes

1. **Webhook Secret**: Always use a strong random secret to prevent unauthorized submissions
2. **Email Addresses**: Customer emails are stored - ensure GDPR/privacy compliance
3. **RLS Policies**: The table uses Row Level Security; only service role can insert
4. **Data Retention**: Old resolved errors are cleaned up after 90 days (see `cleanup_old_checkout_data()`)
