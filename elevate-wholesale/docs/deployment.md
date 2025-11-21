# Deployment and Testing Guide

Complete guide to deploying and testing the Elevate Wholesale B2B automation system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Supabase Deployment](#supabase-deployment)
4. [HubSpot Configuration](#hubspot-configuration)
5. [Shopify Configuration](#shopify-configuration)
6. [Unleashed Configuration](#unleashed-configuration)
7. [Google Form Integration](#google-form-integration)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- [ ] Supabase account (free tier works for testing)
- [ ] HubSpot account (Professional or higher recommended)
- [ ] Shopify Plus account (B2B features required)
- [ ] Unleashed Inventory account
- [ ] Google Workspace account

### Development Tools
- [ ] Node.js 18+ (for Supabase CLI)
- [ ] Git
- [ ] Text editor (VS Code recommended)
- [ ] Command line/terminal access

### API Access
- [ ] HubSpot Private App API key
- [ ] Shopify Admin API access token
- [ ] Unleashed API ID and key
- [ ] Gmail API credentials (optional)

---

## Initial Setup

### 1. Clone the Repository

```bash
cd c:/Users/jayso/master-ops/elevate-wholesale
```

### 2. Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and fill in all required values:
```bash
# Use a text editor to update .env
code .env  # or notepad .env
```

**Critical variables to configure:**
- `HUBSPOT_API_KEY`
- `SHOPIFY_STORE_URL`
- `SHOPIFY_ACCESS_TOKEN`
- `UNLEASHED_API_ID`
- `UNLEASHED_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Supabase Deployment

### 1. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `elevate-wholesale`
4. Database Password: Generate strong password (save securely)
5. Region: Choose closest to Australia (Sydney if available)
6. Click "Create project" and wait ~2 minutes

### 2. Get Project Credentials

From Supabase Dashboard → Settings → API:
- **Project URL**: Copy to `.env` as `SUPABASE_URL`
- **Anon/Public Key**: Copy to `.env` as `SUPABASE_ANON_KEY`
- **Service Role Key**: Copy to `.env` as `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

### 3. Link Local Project to Supabase

```bash
# Navigate to project directory
cd c:/Users/jayso/master-ops/elevate-wholesale

# Link to your Supabase project
supabase link --project-ref your-project-ref

# When prompted, enter your database password
```

Get your `project-ref` from the Project URL:
`https://your-project-ref.supabase.co`

### 4. Deploy Database Schema

```bash
supabase db push
```

Verify tables were created:
```bash
supabase db diff
```

Or check in Supabase Dashboard → Table Editor. You should see:
- `trial_customers`
- `customer_activity_log`
- `email_queue`
- `integration_sync_log`
- `system_config`

### 5. Deploy Edge Functions

Deploy all functions:

```bash
# Deploy form-intake
supabase functions deploy form-intake --no-verify-jwt

# Deploy hubspot-to-shopify-sync
supabase functions deploy hubspot-to-shopify-sync --no-verify-jwt

# Deploy shopify-to-unleashed-sync
supabase functions deploy shopify-to-unleashed-sync --no-verify-jwt

# Deploy sync-trial-expirations
supabase functions deploy sync-trial-expirations --no-verify-jwt

# Deploy sync-existing-customers
supabase functions deploy sync-existing-customers --no-verify-jwt
```

**Note:** `--no-verify-jwt` allows public access to these endpoints. We'll secure them with webhook secrets instead.

### 6. Set Function Environment Variables

For each function, set the required environment variables:

```bash
# Set secrets for all functions
supabase secrets set \
  HUBSPOT_API_KEY="your_hubspot_key" \
  HUBSPOT_TRIAL_WORKFLOW_ID="your_workflow_id" \
  SHOPIFY_STORE_URL="your-store.myshopify.com" \
  SHOPIFY_ACCESS_TOKEN="your_shopify_token" \
  SHOPIFY_API_VERSION="2024-10" \
  SHOPIFY_STOREFRONT_URL="https://elevatewholesale.com.au" \
  UNLEASHED_API_ID="your_unleashed_id" \
  UNLEASHED_API_KEY="your_unleashed_key" \
  UNLEASHED_API_URL="https://api.unleashedsoftware.com" \
  GOOGLE_FORM_WEBHOOK_SECRET="generate_random_string" \
  SHOPIFY_WEBHOOK_SECRET="your_shopify_webhook_secret" \
  TRIAL_DURATION_DAYS="30" \
  TRIAL_DISCOUNT_VALUE="10"
```

Verify secrets:
```bash
supabase secrets list
```

### 7. Get Function URLs

After deployment, note the function URLs:

```
Form Intake: https://your-project-ref.supabase.co/functions/v1/form-intake
HubSpot Sync: https://your-project-ref.supabase.co/functions/v1/hubspot-to-shopify-sync
Shopify Sync: https://your-project-ref.supabase.co/functions/v1/shopify-to-unleashed-sync
Trial Expiration: https://your-project-ref.supabase.co/functions/v1/sync-trial-expirations
Existing Customers: https://your-project-ref.supabase.co/functions/v1/sync-existing-customers
```

### 8. Set Up Cron Job for Trial Expirations

In Supabase Dashboard → Database → Cron Jobs:

Click "Create a new cron job":
```sql
SELECT cron.schedule(
  'expire-trials-daily',
  '0 2 * * *',  -- 2 AM daily
  $$
  SELECT net.http_post(
    url:='https://your-project-ref.supabase.co/functions/v1/sync-trial-expirations',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )
  $$
);
```

Replace `your-project-ref` and `YOUR_SERVICE_ROLE_KEY` with actual values.

---

## HubSpot Configuration

Follow the detailed guide: [HubSpot Setup Guide](./hubspot-setup.md)

**Quick checklist:**
1. [ ] Create all custom contact properties
2. [ ] Create all custom company properties
3. [ ] Create Trial Conversion deal pipeline
4. [ ] Create Private App and get API key
5. [ ] Create email templates
6. [ ] Create workflows (Trial Welcome, Shopify Sync Trigger, etc.)
7. [ ] Test workflow webhook to Supabase

**Get Workflow ID:**
After creating the "Trigger Shopify Account Creation" workflow:
1. Open the workflow in HubSpot
2. Look at the URL: `https://app.hubspot.com/workflows/PORTAL_ID/flow/WORKFLOW_ID/edit`
3. Copy the `WORKFLOW_ID` number
4. Update in Supabase secrets: `HUBSPOT_TRIAL_WORKFLOW_ID`

---

## Shopify Configuration

### 1. Enable B2B Features

Navigate to: **Settings → Markets → Preferences**
- Enable "B2B checkout" (requires Shopify Plus)

### 2. Create Custom App for API Access

Navigate to: **Settings → Apps and sales channels → Develop apps**

1. Click "Create an app"
2. Name: `Elevate Wholesale Automation`
3. Click "Configure Admin API scopes"

**Required Scopes:**
- `read_customers`
- `write_customers`
- `read_companies` (B2B)
- `write_companies` (B2B)
- `read_orders`
- `write_orders`
- `read_price_rules`
- `write_price_rules`
- `read_discounts`
- `write_discounts`
- `read_products`

4. Click "Install app"
5. Reveal and copy the "Admin API access token"
6. Update `.env`: `SHOPIFY_ACCESS_TOKEN=shpat_xxxxx`

### 3. Create Webhooks

Navigate to: **Settings → Notifications → Webhooks**

Create the following webhooks:

#### Order Created Webhook
- **Event**: Order creation
- **Format**: JSON
- **URL**: `https://your-project-ref.supabase.co/functions/v1/shopify-to-unleashed-sync`
- **API Version**: `2024-10`

#### Customer Updated Webhook (Optional)
- **Event**: Customer update
- **Format**: JSON
- **URL**: `https://your-project-ref.supabase.co/functions/v1/shopify-customer-updated`
- **API Version**: `2024-10`

**Get Webhook Secret:**
After creating webhooks, Shopify will show a signing secret.
Copy and update in Supabase secrets: `SHOPIFY_WEBHOOK_SECRET`

### 4. Configure B2B Settings

Navigate to: **Settings → Checkout → B2B**
- Enable "Company locations"
- Enable "Payment terms" (for non-trial customers)
- Set default payment terms: "Pay Now"

---

## Unleashed Configuration

### 1. Get API Credentials

1. Login to Unleashed: [https://app.unleashedsoftware.com/](https://app.unleashedsoftware.com/)
2. Navigate to: **Settings → Integration → API Access**
3. Click "Add API Access"
4. Name: `Elevate Wholesale Automation`
5. Copy:
   - **API ID**: Update `.env` as `UNLEASHED_API_ID`
   - **API Key**: Update `.env` as `UNLEASHED_API_KEY`

### 2. Configure Product Codes

Ensure all products in Unleashed have SKUs that match Shopify:
- Unleashed `ProductCode` = Shopify `sku`
- This mapping is critical for order sync

### 3. Test API Access

Run a test API call:
```bash
curl "https://api.unleashedsoftware.com/Customers" \
  -H "Accept: application/json" \
  -H "api-auth-id: YOUR_API_ID" \
  -H "api-auth-signature: YOUR_SIGNATURE"
```

If you get a 200 response with customer data, API access is working.

---

## Google Form Integration

### 1. Access Your Google Form

Go to: [https://elevatewholesale.com.au/pages/retailer-signup](https://elevatewholesale.com.au/pages/retailer-signup)

Or create a new Google Form with these questions:
- Email Address (required)
- First Name (required)
- Last Name (required)
- Phone Number
- Business Name (required)
- ABN
- Business Type (dropdown: Retail Store, Online Store, Both)
- Website
- Street Address
- City
- State/Territory (dropdown: NSW, VIC, QLD, SA, WA, TAS, NT, ACT)
- Postcode
- How did you hear about us?
- Products interested in (checkboxes)
- Estimated monthly order volume

### 2. Add Apps Script

1. In Google Form, click ⋮ (three dots) → Script editor
2. Delete any existing code
3. Copy entire contents of `scripts/google-apps-script.js`
4. Paste into the script editor
5. Update configuration variables:
   ```javascript
   const SUPABASE_PROJECT_URL = 'https://your-project-ref.supabase.co'
   const WEBHOOK_SECRET = 'your_secret_key_here'
   ```
6. Update `FIELD_MAPPING` to match your exact form questions
7. Save (Ctrl+S or Cmd+S)

### 3. Create Trigger

1. Click Triggers icon (clock) in left sidebar
2. Click "+ Add Trigger"
3. Choose function: `onFormSubmit`
4. Event source: `From form`
5. Event type: `On form submit`
6. Click "Save"
7. Authorize the script (follow prompts)

### 4. Test the Integration

In Apps Script editor, run:
1. Select function: `verifyInstallation`
2. Click "Run"
3. Check logs for verification results

Then test with sample data:
1. Select function: `testWebhook`
2. Click "Run"
3. Check logs and Supabase function logs

---

## Testing

### Phase 1: Unit Testing

#### Test 1: Database Schema
```bash
# Connect to database
supabase db remote psql

# Verify tables exist
\dt

# Check trial_customers table structure
\d trial_customers

# Insert test customer
INSERT INTO trial_customers (email, firstname, lastname, business_name, trial_status)
VALUES ('test@example.com', 'Test', 'User', 'Test Business', 'pending');

# Verify insert
SELECT * FROM trial_customers WHERE email = 'test@example.com';
```

#### Test 2: Edge Functions (Local)

Test form-intake:
```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/form-intake \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstname": "John",
    "lastname": "Smith",
    "business_name": "Test Boutique",
    "phone": "0400000000",
    "abn": "12 345 678 901"
  }'
```

Expected response:
```json
{
  "success": true,
  "customerId": "uuid-here",
  "hubspotContactId": "12345",
  "hubspotCompanyId": "67890",
  "correlationId": "form-xxxxx"
}
```

#### Test 3: HubSpot Integration

1. Check HubSpot Contacts for new test contact
2. Verify custom properties are populated:
   - trial_status = "pending"
   - trial_start_date = today
   - trial_end_date = today + 30 days
3. Check company was created and associated

#### Test 4: Shopify Sync

Manually trigger Shopify sync:
```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/hubspot-to-shopify-sync \
  -H "Content-Type: application/json" \
  -d '{
    "hubspotContactId": "12345"
  }'
```

Then check:
1. Shopify → Customers → Find test customer
2. Verify B2B company created
3. Verify customer associated to company
4. Shopify → Discounts → Find trial discount code
5. HubSpot contact updated with:
   - shopify_customer_id
   - trial_coupon_code

### Phase 2: Integration Testing

#### End-to-End Test: New Trial Account

**Step 1: Submit Form**
1. Fill out Google Form with test data
2. Submit form
3. Verify Google Apps Script executes (check Executions tab)

**Step 2: Verify HubSpot**
1. Check HubSpot Contacts within 1 minute
2. Find test contact by email
3. Verify all properties populated
4. Check Trial Welcome workflow enrollment

**Step 3: Verify Shopify**
1. Check workflow "Trigger Shopify Account Creation" fired
2. Wait 30 seconds for sync
3. Check Shopify Customers for new customer
4. Verify B2B company and discount code created

**Step 4: Test Order**
1. Login to Shopify storefront as test customer
2. Use email login (6-digit code)
3. Add products to cart
4. Apply trial discount code at checkout
5. Complete order (use Shopify test payment)

**Step 5: Verify Order Sync**
1. Check Supabase logs for shopify-to-unleashed-sync execution
2. Check Unleashed for new sales order
3. Check HubSpot contact updated:
   - trial_orders_count = 1
   - trial_total_spent = order total
4. Check HubSpot Deal created in Trial Conversion pipeline

**Step 6: Test Expiration**
1. Manually set trial_end_date to yesterday in HubSpot
2. Manually trigger expiration function:
   ```bash
   curl -X POST \
     https://your-project-ref.supabase.co/functions/v1/sync-trial-expirations
   ```
3. Verify:
   - Shopify discount code disabled
   - HubSpot trial_status = "expired"
   - Expiration email sent

### Phase 3: Load Testing

Test with 10 concurrent form submissions:
```bash
# Create test script
for i in {1..10}; do
  curl -X POST https://your-project-ref.supabase.co/functions/v1/form-intake \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"firstname\":\"Test\",\"lastname\":\"User$i\",\"business_name\":\"Test Business $i\"}" &
done
wait
```

Check:
- All 10 contacts created in HubSpot
- All 10 customers in Supabase
- No errors in Supabase logs

---

## Monitoring

### Supabase Logs

View real-time function logs:
```bash
supabase functions logs form-intake --tail
supabase functions logs hubspot-to-shopify-sync --tail
```

Or in Supabase Dashboard → Edge Functions → Select function → Logs

### Database Monitoring

Check integration health:
```sql
-- View recent sync operations
SELECT * FROM integration_sync_log
ORDER BY created_at DESC
LIMIT 100;

-- Check for failed syncs
SELECT * FROM integration_sync_log
WHERE status = 'failed'
ORDER BY created_at DESC;

-- View customer activity
SELECT * FROM customer_activity_log
ORDER BY created_at DESC
LIMIT 100;

-- Trial conversion metrics
SELECT * FROM trial_conversion_funnel;

-- Active trials
SELECT * FROM active_trials_summary;
```

### HubSpot Monitoring

Create dashboards for:
- Active trials count
- Trial conversion rate
- Average orders per trial
- Deal pipeline value

### Error Alerts

Set up alerts (optional) using Supabase database webhooks or scheduled functions:

```sql
-- Create function to check for errors
CREATE OR REPLACE FUNCTION check_integration_errors()
RETURNS void AS $$
DECLARE
  error_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO error_count
  FROM integration_sync_log
  WHERE status = 'failed'
    AND created_at > NOW() - INTERVAL '1 hour';

  IF error_count > 5 THEN
    -- Send alert (implement via HTTP request to Slack/email service)
    PERFORM net.http_post(
      url := 'YOUR_SLACK_WEBHOOK_URL',
      body := json_build_object(
        'text', format('⚠️ %s integration errors in the last hour', error_count)
      )::text
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## Troubleshooting

### Common Issues

#### Issue: Form submission not creating HubSpot contact

**Diagnosis:**
1. Check Google Apps Script execution log
2. Check Supabase function logs
3. Verify HubSpot API key valid

**Solutions:**
- Verify `HUBSPOT_API_KEY` in Supabase secrets
- Check form field mapping in Apps Script
- Verify HubSpot custom properties exist

#### Issue: Shopify customer not created

**Diagnosis:**
1. Check HubSpot workflow fired
2. Check Supabase hubspot-to-shopify-sync logs
3. Verify Shopify API token scopes

**Solutions:**
- Verify workflow webhook URL correct
- Check Shopify API token has B2B scopes
- Verify customer email not already in Shopify

#### Issue: Order not syncing to Unleashed

**Diagnosis:**
1. Check Shopify webhook delivery (Settings → Notifications → Webhooks)
2. Check Supabase shopify-to-unleashed-sync logs
3. Verify Unleashed API credentials

**Solutions:**
- Verify Shopify webhook secret matches Supabase secret
- Check Unleashed API rate limits (300 req/hour)
- Verify product SKUs match between Shopify and Unleashed

#### Issue: Trial not expiring automatically

**Diagnosis:**
1. Check cron job configured
2. Manually trigger expiration function
3. Check Supabase logs

**Solutions:**
- Verify cron job created: `SELECT * FROM cron.job;`
- Check trial_end_date format in database
- Manually run: `SELECT check_expired_trials();`

### Debugging Tools

**View all Supabase secrets:**
```bash
supabase secrets list
```

**View function environment:**
```bash
supabase functions logs form-intake --tail
```

**Test HubSpot API:**
```bash
curl https://api.hubapi.com/crm/v3/objects/contacts?limit=1 \
  -H "Authorization: Bearer YOUR_HUBSPOT_API_KEY"
```

**Test Shopify API:**
```bash
curl https://your-store.myshopify.com/admin/api/2024-10/customers.json?limit=1 \
  -H "X-Shopify-Access-Token: YOUR_SHOPIFY_TOKEN"
```

### Support Channels

- **Supabase**: [Discord](https://discord.supabase.com)
- **HubSpot**: [Community](https://community.hubspot.com)
- **Shopify**: [Community](https://community.shopify.com)
- **Unleashed**: support@unleashedsoftware.com

---

## Post-Deployment Checklist

- [ ] All Edge Functions deployed successfully
- [ ] Database schema created with all tables
- [ ] HubSpot custom properties created
- [ ] HubSpot workflows active
- [ ] Shopify webhooks configured
- [ ] Google Form Apps Script installed
- [ ] Test form submission successful
- [ ] Test Shopify order sync successful
- [ ] Trial expiration cron job running
- [ ] Monitoring dashboards created
- [ ] Error alerts configured
- [ ] Documentation accessible to team

Congratulations! Your Elevate Wholesale automation system is now live. 🎉
