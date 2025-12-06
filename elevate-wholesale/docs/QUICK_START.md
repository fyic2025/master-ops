# Quick Start Guide

Get the Elevate Wholesale B2B automation system up and running in 30 minutes.

## What You'll Build

An automated system that:
- ✅ Captures form submissions from your website
- ✅ Creates trial accounts in HubSpot, Shopify, and Unleashed
- ✅ Sends welcome emails with login credentials and discount codes
- ✅ Tracks customer engagement and orders
- ✅ Automatically expires trials after 30 days
- ✅ Syncs all customer data across platforms

## Prerequisites (5 minutes)

Make sure you have:
- [ ] Supabase account created
- [ ] HubSpot account with API access
- [ ] Shopify Plus account (B2B features)
- [ ] Unleashed Inventory account
- [ ] Google Form set up

## Step 1: Set Up Supabase (10 minutes)

### Create Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `elevate-wholesale`
4. Generate strong database password → Save it!
5. Region: Sydney (or closest to you)
6. Wait 2 minutes for project creation

### Install CLI
```bash
npm install -g supabase
```

### Deploy Database and Functions
```bash
cd c:/Users/jayso/master-ops/elevate-wholesale

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy database schema
supabase db push

# Deploy all Edge Functions
supabase functions deploy form-intake --no-verify-jwt
supabase functions deploy hubspot-to-shopify-sync --no-verify-jwt
supabase functions deploy shopify-to-unleashed-sync --no-verify-jwt
supabase functions deploy sync-trial-expirations --no-verify-jwt
supabase functions deploy sync-existing-customers --no-verify-jwt
```

### Set Environment Variables
```bash
supabase secrets set \
  HUBSPOT_API_KEY="your_key" \
  SHOPIFY_STORE_URL="your-store.myshopify.com" \
  SHOPIFY_ACCESS_TOKEN="your_token" \
  UNLEASHED_API_ID="your_id" \
  UNLEASHED_API_KEY="your_key"
```

**Get your API keys:**
- HubSpot: Settings → Integrations → Private Apps
- Shopify: Settings → Apps → Develop apps
- Unleashed: Settings → Integration → API Access

## Step 2: Configure HubSpot (10 minutes)

### Create Custom Properties
In HubSpot → Settings → Properties → Contact Properties, create:

| Property Name | Type | Internal Name |
|--------------|------|---------------|
| Trial Status | Dropdown | `trial_status` |
| Trial Start Date | Date | `trial_start_date` |
| Trial End Date | Date | `trial_end_date` |
| Trial Coupon Code | Text | `trial_coupon_code` |
| Shopify Customer ID | Text | `shopify_customer_id` |
| Business Name | Text | `business_name` |
| ABN | Text | `abn` |

**Trial Status options:** pending, active, logged_in, converted, expired

Full list in [docs/hubspot-setup.md](docs/hubspot-setup.md)

### Create Workflow

1. Navigate to: Automation → Workflows
2. Create workflow: "Trigger Shopify Account Creation"
3. Trigger: Contact property "trial_status" changes to "active"
4. Action: Webhook
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/hubspot-to-shopify-sync`
   - Method: POST
   - Body: `{"hubspotContactId": "{{ contact.hs_object_id }}"}`
5. Save and activate

## Step 3: Configure Shopify (5 minutes)

### Create Custom App
1. Settings → Apps → Develop apps
2. Create app: "Elevate Wholesale Automation"
3. Configure scopes:
   - `read_customers`, `write_customers`
   - `read_companies`, `write_companies`
   - `read_orders`, `write_orders`
   - `read_price_rules`, `write_price_rules`
4. Install app → Copy access token

### Create Webhook
1. Settings → Notifications → Webhooks
2. Create webhook:
   - Event: Order creation
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/shopify-to-unleashed-sync`
   - Format: JSON
3. Save → Copy webhook secret

## Step 4: Connect Google Form (5 minutes)

1. Open your Google Form
2. Click ⋮ → Script editor
3. Copy code from `scripts/google-apps-script.js`
4. Update these lines:
   ```javascript
   const SUPABASE_PROJECT_URL = 'https://YOUR_PROJECT.supabase.co'
   const WEBHOOK_SECRET = 'your_secret_key'
   ```
5. Save
6. Click Triggers (clock icon) → Add Trigger
7. Function: `onFormSubmit`
8. Event: On form submit
9. Save and authorize

## Step 5: Test! (5 minutes)

### Test Form Submission
1. Fill out your Google Form
2. Submit
3. Check HubSpot → Should see new contact within 1 minute
4. Check contact properties → trial_status should be "pending"

### Test Shopify Sync
1. In HubSpot, change trial_status to "active"
2. Workflow should trigger
3. Wait 30 seconds
4. Check Shopify → Customers → Should see new B2B customer
5. Check Discounts → Should see trial coupon code
6. Check HubSpot contact → shopify_customer_id populated

### Test Order Sync
1. Login to Shopify storefront with trial customer email
2. Add product to cart
3. Apply trial discount code
4. Complete order (use test payment)
5. Check Unleashed → Orders → Should see new sales order
6. Check HubSpot → trial_orders_count should be 1

## What's Next?

### Set Up Automation
- [ ] Create email templates in HubSpot
- [ ] Set up trial welcome email sequence
- [ ] Configure trial conversion deal pipeline
- [ ] Set up cron job for trial expirations

### Migrate Existing Customers
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sync-existing-customers
```

This syncs all existing HubSpot contacts with Shopify customers.

### Monitor the System
- **Supabase Logs**: Dashboard → Edge Functions → Logs
- **Database**: Dashboard → Table Editor → integration_sync_log
- **HubSpot**: Check workflow history and contact activity

## Troubleshooting

**Form not creating contact?**
- Check Google Apps Script execution log
- Verify Supabase function URL is correct
- Check Supabase function logs

**Shopify customer not created?**
- Verify HubSpot workflow fired
- Check Supabase hubspot-to-shopify-sync logs
- Verify Shopify API token has correct scopes

**Order not syncing?**
- Check Shopify webhook delivery status
- Verify Shopify webhook secret matches Supabase secret
- Check Unleashed API credentials

## Full Documentation

For detailed setup and configuration:
- [README.md](README.md) - Complete system overview
- [docs/hubspot-setup.md](docs/hubspot-setup.md) - HubSpot configuration
- [docs/deployment.md](docs/deployment.md) - Full deployment guide

## Support

Check the logs first:
```bash
supabase functions logs form-intake --tail
```

Then review the troubleshooting section in [docs/deployment.md](docs/deployment.md)

---

**You're all set!** 🎉 Your B2B trial automation system is now running.
