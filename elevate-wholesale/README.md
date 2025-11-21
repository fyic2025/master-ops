# Elevate Wholesale B2B Automation System

Automated trial account management system integrating HubSpot CRM, Shopify B2B, Unleashed Inventory, and Google Workspace.

## Architecture Overview

```
Google Form → Supabase Edge Functions → HubSpot (CRM) ↔ Shopify B2B + Unleashed Inventory
                                             ↓
                                      Gmail (via HubSpot)
```

### Tech Stack

- **HubSpot CRM**: Central customer database, email automation, deal pipelines
- **Supabase**: Orchestration layer, Edge Functions, database
- **Shopify B2B**: Customer-facing ecommerce platform
- **Unleashed Inventory**: Inventory and stock management
- **Google Workspace**: Forms, email (Gmail API)

## Project Structure

```
elevate-wholesale/
├── supabase/
│   ├── functions/
│   │   ├── form-intake/              # Google Form → HubSpot
│   │   ├── hubspot-to-shopify-sync/  # Create Shopify B2B accounts
│   │   ├── shopify-to-unleashed-sync/ # Sync orders to inventory
│   │   ├── sync-trial-expirations/   # Daily cleanup (cron)
│   │   └── sync-existing-customers/   # One-time migration
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # Database schema
│   └── config.toml                   # Supabase configuration
├── docs/
│   ├── hubspot-setup.md              # HubSpot custom properties
│   ├── shopify-setup.md              # Shopify B2B configuration
│   ├── unleashed-setup.md            # Unleashed API setup
│   └── deployment.md                 # Deployment guide
├── scripts/
│   └── google-apps-script.js         # Form webhook code
├── .env.example                      # Environment variables template
└── README.md
```

## Core Workflows

### 1. New Trial Account Creation

1. Customer fills Google Form at elevatewholesale.com.au/pages/retailer-signup
2. Google Apps Script webhook → Supabase `form-intake` function
3. Create HubSpot Contact + Company with trial properties
4. Enroll in HubSpot workflow → triggers webhook to Supabase
5. `hubspot-to-shopify-sync`: Create Shopify B2B customer + company
6. Generate 30-day trial discount code in Shopify
7. Create Unleashed customer record
8. Update HubSpot with integration IDs (Shopify, Unleashed, coupon)
9. HubSpot sends welcome email (login instructions + coupon)

**Duration**: 2-5 minutes (fully automated)

### 2. Order Processing

1. Customer places order in Shopify
2. Shopify webhook (`orders/create`) → Supabase
3. `shopify-to-unleashed-sync`: Create sales order in Unleashed
4. Update HubSpot contact (order count, total spend)
5. If first order: Create HubSpot Deal in trial conversion pipeline
6. Trigger HubSpot engagement workflow

### 3. Trial Expiration

1. Daily cron (2 AM): `sync-trial-expirations` runs
2. Query HubSpot for trials expiring today
3. For each expired trial:
   - Disable Shopify discount code
   - Update HubSpot trial_status = "expired"
   - Trigger expiration email workflow

## HubSpot Integration

### Custom Properties (Contact)

| Property | Type | Description |
|----------|------|-------------|
| `trial_status` | Dropdown | pending, active, logged_in, converted, expired |
| `trial_start_date` | Date | Trial activation date |
| `trial_end_date` | Date | Trial expiration (30 days from start) |
| `trial_coupon_code` | Text | Unique Shopify discount code |
| `trial_orders_count` | Number | Number of orders placed during trial |
| `trial_total_spent` | Number | Total spend during trial |
| `shopify_customer_id` | Text | Shopify customer ID |
| `unleashed_customer_code` | Text | Unleashed customer code |
| `business_name` | Text | Business/company name |
| `abn` | Text | Australian Business Number |
| `business_type` | Dropdown | Retail Store, Online Store, Both |

### Deal Pipeline: Trial Conversion

1. **New Trial (0%)**: Just signed up
2. **Active Trial (25%)**: Placed ≥1 order
3. **High Intent (50%)**: Multiple orders, high spend
4. **Negotiation (75%)**: Discussing trading terms
5. **Closed Won (100%)**: Converted to customer
6. **Closed Lost (0%)**: Trial expired, no conversion

### Email Workflows (HubSpot)

- **Day 0**: Welcome email (login + coupon)
- **Day 7**: Reminder if no login
- **Day 15**: Mid-trial check-in
- **Day 23**: Expiry warning (7 days left)
- **Day 30**: Trial expired (conversion offer)

## Shopify B2B Integration

### Company & Customer Creation

Uses GraphQL API to:
- Create B2B Company with business name
- Create Customer Contact associated to company
- Apply tags: `trial`, `wholesale`, `trial_expires_YYYY-MM-DD`
- Add metafields for HubSpot contact ID

### Discount Code Management

REST API to:
- Create price rule (30-day validity, customer-specific)
- Generate unique code: `TRIAL{TIMESTAMP}`
- Set usage limit: 1 per customer
- Auto-expire on trial_end_date

## Unleashed Inventory Integration

### Customer Sync

- Create customer with CustomerCode: `TRIAL-{ID}`
- Sync business details (name, email, phone, ABN)
- Tag with: `trial_account`, `shopify_sync`

### Order Processing

- Receive Shopify order via webhook
- Create Sales Order in Unleashed
- Map Shopify SKUs to Unleashed ProductCodes
- Sync quantities and pricing

## Database Schema (Supabase)

### Tables

**trial_customers**
- Master customer tracking table
- Stores integration IDs, trial status, engagement metrics

**customer_activity_log**
- Audit trail of all customer actions
- Event types: login, order_placed, email_sent, status_change

**email_queue**
- Scheduled email management (if not using HubSpot native)

**integration_sync_log**
- API call tracking for debugging
- Request/response payloads

See [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) for full schema.

## Environment Variables

Required environment variables (see `.env.example`):

```
# HubSpot
HUBSPOT_API_KEY=your_private_app_key
HUBSPOT_TRIAL_WORKFLOW_ID=workflow_id

# Shopify
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_API_VERSION=2024-10

# Unleashed
UNLEASHED_API_ID=your_api_id
UNLEASHED_API_KEY=your_api_key

# Gmail (optional, if not using HubSpot for emails)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Deployment

### Prerequisites

1. Supabase account and project
2. HubSpot account (with API access)
3. Shopify Plus/B2B account
4. Unleashed Inventory account
5. Google Workspace account

### Initial Setup

1. **Clone and configure**
   ```bash
   cd master-ops/elevate-wholesale
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Set up Supabase**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Run migrations
   supabase db push

   # Deploy Edge Functions
   supabase functions deploy form-intake
   supabase functions deploy hubspot-to-shopify-sync
   supabase functions deploy shopify-to-unleashed-sync
   supabase functions deploy sync-trial-expirations
   ```

3. **Configure HubSpot**
   - Create custom properties (see [docs/hubspot-setup.md](docs/hubspot-setup.md))
   - Create trial conversion deal pipeline
   - Set up email workflows
   - Create webhook to trigger Shopify sync

4. **Configure Shopify**
   - Enable B2B features (Shopify Plus required)
   - Create webhooks for `orders/create`, `customers/update`
   - Set webhook URL to Supabase function endpoint

5. **Configure Google Form**
   - Add Apps Script webhook code (see [scripts/google-apps-script.js](scripts/google-apps-script.js))
   - Set up form trigger on submit

6. **Migrate existing customers**
   ```bash
   # Run one-time sync
   curl -X POST https://your-project.supabase.co/functions/v1/sync-existing-customers \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

### Monitoring

- **Supabase Dashboard**: View Edge Function logs
- **HubSpot**: Monitor workflow enrollments, deal progression
- **Database**: Query `integration_sync_log` for errors

## Testing

### Test New Trial Flow

1. Submit test form at Google Form URL
2. Check HubSpot for new contact with trial properties
3. Check Shopify for new B2B customer + discount code
4. Check Unleashed for new customer record
5. Verify welcome email sent from HubSpot
6. Place test order in Shopify
7. Verify order synced to Unleashed
8. Check HubSpot for updated order count/spend

### Test Expiration Flow

1. Manually set trial_end_date to today in HubSpot
2. Run sync-trial-expirations function manually
3. Verify discount code disabled in Shopify
4. Verify trial_status updated to "expired" in HubSpot
5. Check for expiration email sent

## Maintenance

### Daily Operations

- Monitor Supabase Edge Function logs for errors
- Check `integration_sync_log` table for failed syncs
- Review HubSpot workflow performance

### Weekly Review

- Trial conversion rate analytics (HubSpot reports)
- Identify stuck trials (no orders, no engagement)
- Review and optimize email workflows

### Monthly Audit

- Data integrity check (HubSpot ↔ Shopify ↔ Unleashed sync)
- Cleanup old activity logs (retention policy)
- Performance optimization

## Troubleshooting

### Common Issues

**Issue**: Form submission not creating HubSpot contact
- Check Google Apps Script execution log
- Verify Supabase function endpoint is accessible
- Check HubSpot API key permissions

**Issue**: Shopify discount code not generated
- Verify Shopify API token has `write_price_rules` scope
- Check Edge Function logs for error details
- Ensure B2B features enabled in Shopify

**Issue**: Orders not syncing to Unleashed
- Check Unleashed API rate limits (300 req/hour)
- Verify SKU mapping (Shopify ↔ Unleashed)
- Review `integration_sync_log` for failed requests

## Support

For questions or issues:
1. Check Edge Function logs in Supabase dashboard
2. Review `integration_sync_log` table in database
3. Consult detailed setup guides in `/docs` directory

## License

Proprietary - Elevate Wholesale
