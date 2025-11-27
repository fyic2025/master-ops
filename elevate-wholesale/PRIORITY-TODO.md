# PRIORITY: Elevate Wholesale Prospect Onboarding Automation

**Status**: READY FOR DEPLOYMENT - Priority #1 for 2025-11-28

---

## Overview

This project automates the complete prospect-to-customer onboarding flow for Elevate Wholesale B2B.

### The Flow

```
Google Form Submission
        ↓
Supabase Edge Function (form-intake)
        ↓
HubSpot Contact + Company Created
        ↓
HubSpot Workflow Triggers
        ↓
Supabase Edge Function (hubspot-to-shopify-sync)
        ↓
Shopify B2B Account Created + Tags Added + Discount Code Generated
        ↓
HubSpot Updated with Shopify IDs + Coupon Code
        ↓
HubSpot Sends Welcome Email Sequence (with login + coupon)
```

**Duration**: 2-5 minutes (fully automated)

---

## What Gets Created Automatically

1. **HubSpot Contact** - With trial properties (status, dates, coupon)
2. **HubSpot Company** - Associated with contact
3. **Shopify B2B Customer** - With tags: `trial`, `wholesale`, `trial_expires_YYYY-MM-DD`
4. **Shopify B2B Company** - Associated with customer
5. **Trial Discount Code** - Unique per customer, auto-expires after 30 days
6. **Supabase Record** - For tracking and analytics
7. **Welcome Email** - Via HubSpot with login instructions and coupon code

---

## Deployment Checklist

### Supabase Setup
- [ ] Create Supabase project (or use existing)
- [ ] Deploy database schema: `supabase db push`
- [ ] Deploy Edge Functions:
  - [ ] `form-intake`
  - [ ] `hubspot-to-shopify-sync`
  - [ ] `shopify-to-unleashed-sync`
  - [ ] `sync-trial-expirations`
- [ ] Set environment secrets (see `docs/deployment.md`)

### HubSpot Setup
- [ ] Create custom contact properties (trial_status, trial_end_date, etc.)
- [ ] Create custom company properties
- [ ] Create "Trial Conversion" deal pipeline
- [ ] Create Private App and get API key
- [ ] Create "Trial Welcome Sequence" workflow
- [ ] Create "Trigger Shopify Account Creation" workflow (webhook)
- [ ] Create email templates (Welcome, Reminder, Expiration)

### Shopify Setup
- [ ] Enable B2B features (requires Shopify Plus)
- [ ] Create Custom App with required scopes
- [ ] Set up webhooks for order sync
- [ ] Test account creation flow

### Google Form Setup
- [ ] Install Apps Script from `scripts/google-apps-script.js`
- [ ] Configure field mapping
- [ ] Create form submit trigger
- [ ] Test form submission

---

## Quick Test

After deployment, test the full flow:

```bash
# Test form intake
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/form-intake \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstname": "Test",
    "lastname": "User",
    "business_name": "Test Business",
    "phone": "0400000000"
  }'
```

Expected: HubSpot contact created, Shopify account created, discount code generated.

---

## Key Files

| File | Purpose |
|------|---------|
| `README.md` | System overview and architecture |
| `QUICK_START.md` | 30-minute deployment guide |
| `docs/hubspot-setup.md` | HubSpot configuration guide |
| `docs/deployment.md` | Full deployment instructions |
| `supabase/functions/form-intake/` | Google Form webhook handler |
| `supabase/functions/hubspot-to-shopify-sync/` | Shopify account creator |
| `scripts/google-apps-script.js` | Google Form webhook code |

---

## System Review Notes (2025-11-27)

### Strengths
1. Well-documented with comprehensive setup guides
2. Full error logging to `integration_sync_log` table
3. Activity tracking in `customer_activity_log`
4. Correlation IDs for debugging
5. Automatic trial expiration with cron job
6. Complete email sequence (Day 0, 7, 15, 23, 30)

### Optimization Opportunities

1. **Error Handling Enhancement**
   - Consider adding retry logic for transient API failures
   - Add Slack/email alerts for repeated failures

2. **Rate Limit Protection**
   - HubSpot: 100 calls/10 seconds
   - Shopify: 2 calls/second (REST)
   - Unleashed: 300 calls/hour
   - Consider adding queue for high-volume periods

3. **Duplicate Prevention**
   - Add check for existing customer by email before creation
   - Currently relies on HubSpot/Shopify to reject duplicates

4. **Monitoring Dashboard**
   - Consider building a simple dashboard for:
     - Trial signups per day
     - Conversion rates
     - Failed syncs

### Not Blocking Deployment
All identified items are enhancements, not blockers. The system is ready for production use.

---

## Contact

For questions about this system, refer to the documentation in `/docs` or check the Supabase Edge Function logs.

---

**PRIORITY**: This is the #1 priority task for deployment. The system automates a critical business process that is currently manual.
