# HubSpot Setup Guide

Complete guide to configuring HubSpot CRM for Elevate Wholesale B2B trial automation.

## Table of Contents

1. [Custom Properties Setup](#custom-properties-setup)
2. [Deal Pipeline Configuration](#deal-pipeline-configuration)
3. [Workflow Setup](#workflow-setup)
4. [API Access Configuration](#api-access-configuration)
5. [Webhook Configuration](#webhook-configuration)

---

## Custom Properties Setup

### Contact Properties

Navigate to: **Settings → Data Management → Properties → Contact Properties**

Create the following custom properties:

#### Trial Management Properties

| Property Name | Internal Name | Field Type | Description |
|--------------|---------------|------------|-------------|
| Trial Status | `trial_status` | Dropdown | Current trial status |
| Trial Start Date | `trial_start_date` | Date picker | Date trial was activated |
| Trial End Date | `trial_end_date` | Date picker | Date trial expires (30 days from start) |
| Trial Coupon Code | `trial_coupon_code` | Single-line text | Unique Shopify discount code |
| Trial Orders Count | `trial_orders_count` | Number | Number of orders placed during trial |
| Trial Total Spent | `trial_total_spent` | Number | Total spend during trial (AUD) |

**Trial Status Dropdown Options:**
- `pending` - Trial account created, awaiting Shopify sync
- `active` - Trial account active, Shopify account created
- `logged_in` - Customer has logged in and/or placed order
- `converted` - Trial converted to paying customer
- `expired` - Trial ended without conversion
- `deactivated` - Trial ended and account deactivated

#### Integration ID Properties

| Property Name | Internal Name | Field Type | Description |
|--------------|---------------|------------|-------------|
| Shopify Customer ID | `shopify_customer_id` | Single-line text | Shopify customer ID for sync |
| Shopify Company ID | `shopify_company_id` | Single-line text | Shopify B2B company ID |
| Unleashed Customer Code | `unleashed_customer_code` | Single-line text | Unleashed customer code |

#### Business Information Properties

| Property Name | Internal Name | Field Type | Description |
|--------------|---------------|------------|-------------|
| Business Name | `business_name` | Single-line text | Business/company name |
| ABN | `abn` | Single-line text | Australian Business Number |
| Business Type | `business_type` | Dropdown | Type of business |
| Product Interests | `product_interests` | Multiple checkboxes | Product categories of interest |
| Estimated Order Volume | `estimated_order_volume` | Dropdown | Expected monthly order volume |

**Business Type Dropdown Options:**
- `Retail Store` - Physical retail location
- `Online Store` - E-commerce only
- `Both` - Both physical and online

**Estimated Order Volume Dropdown Options:**
- `<$1000` - Less than $1000/month
- `$1000-$5000` - $1000 to $5000/month
- `$5000+` - More than $5000/month

### Company Properties

Navigate to: **Settings → Data Management → Properties → Company Properties**

| Property Name | Internal Name | Field Type | Description |
|--------------|---------------|------------|-------------|
| Company ABN | `company_abn` | Single-line text | Australian Business Number |
| Credit Limit | `credit_limit` | Number | Approved credit limit (AUD) |
| Payment Terms | `payment_terms` | Dropdown | Payment terms agreement |
| Wholesale Discount Tier | `wholesale_discount_tier` | Dropdown | Discount tier level |
| Primary Contact Email | `primary_contact_email` | Email | Main contact email address |

**Payment Terms Dropdown Options:**
- `Pay Now` - Immediate payment required
- `Net 30` - Payment due in 30 days
- `Net 60` - Payment due in 60 days

**Wholesale Discount Tier Dropdown Options:**
- `Bronze` - 5% discount
- `Silver` - 10% discount
- `Gold` - 15% discount
- `Platinum` - 20% discount

---

## Deal Pipeline Configuration

### Create Trial Conversion Pipeline

Navigate to: **Settings → Objects → Deals → Pipelines**

Click "Create Pipeline" and name it: **Trial Conversion**

### Deal Stages

| Stage Name | Probability | Purpose |
|------------|-------------|---------|
| New Trial | 0% | Just signed up via form |
| Active Trial | 25% | Placed at least 1 order |
| High Intent | 50% | Multiple orders (3+), high spend (>$500) |
| Negotiation | 75% | Discussing ongoing trading terms |
| Closed Won | 100% | Converted to paying customer |
| Closed Lost | 0% | Trial expired without conversion |

### Deal Properties

Ensure these default properties are visible:
- Deal Name
- Amount (estimated annual value)
- Close Date (set to trial_end_date)
- Deal Stage
- Pipeline

---

## Workflow Setup

### Workflow 1: Trial Welcome Sequence

**Name:** Trial Welcome Sequence
**Trigger:** Contact property "trial_status" is any of "active"

**Actions:**

1. **Day 0 - Welcome Email**
   - Template: Trial Welcome
   - Subject: "Welcome to Your 30-Day Trial - Elevate Wholesale"
   - Personalization tokens:
     - `{{ contact.firstname }}`
     - `{{ contact.business_name }}`
     - `{{ contact.trial_coupon_code }}`
     - `{{ contact.trial_end_date }}`
   - Include:
     - Login link: https://elevatewholesale.com.au/account/login
     - Coupon code
     - Trial duration
     - How to place first order

2. **Delay 7 days**

3. **Day 7 - Reminder Email (if no login)**
   - Branch: If "trial_orders_count" equals 0
   - Template: Trial Reminder 1
   - Subject: "Haven't seen you yet! Your trial is waiting"
   - Content:
     - Highlight popular products
     - Quick start guide
     - Customer support offer

4. **Delay 8 days (15 days total)**

5. **Day 15 - Mid-Trial Check-in**
   - Template: Trial Check-in
   - Subject: "How's your trial going?"
   - Content:
     - Product recommendations
     - Success stories
     - Upgrade to trading terms CTA

6. **Delay 8 days (23 days total)**

7. **Day 23 - Expiry Warning**
   - Template: Trial Expiring Soon
   - Subject: "7 days left in your trial"
   - Content:
     - Urgency messaging
     - Special conversion offer
     - Testimonials from customers

8. **Delay 7 days (30 days total)**

9. **Day 30 - Trial Expired**
   - Branch: If "trial_status" equals "active" (not converted)
   - Template: Trial Expired
   - Subject: "Your trial has ended - Here's how to continue"
   - Content:
     - Account deactivated notice
     - Re-activation instructions
     - Upgrade to full account CTA

### Workflow 2: Shopify Sync Trigger

**Name:** Trigger Shopify Account Creation
**Trigger:** Contact property "trial_status" changes to "active"
**Enrollment:** Re-enrollment disabled

**Actions:**

1. **Webhook Action**
   - Method: POST
   - URL: `https://[your-project].supabase.co/functions/v1/hubspot-to-shopify-sync`
   - Headers:
     ```
     Authorization: Bearer [SUPABASE_ANON_KEY]
     Content-Type: application/json
     ```
   - Body:
     ```json
     {
       "hubspotContactId": "{{ contact.hs_object_id }}",
       "email": "{{ contact.email }}"
     }
     ```

2. **Wait 5 minutes** (allow Shopify sync to complete)

3. **Send Email** (Trial account ready)

### Workflow 3: First Order Deal Creation

**Name:** Create Trial Conversion Deal
**Trigger:** Contact property "trial_orders_count" changes to any value greater than 0
**Enrollment:** Only once per contact

**Actions:**

1. **Create Deal**
   - Deal name: `Trial Conversion - {{ contact.business_name }}`
   - Pipeline: Trial Conversion
   - Deal stage: Active Trial
   - Amount: `{{ contact.trial_total_spent }}` × 12 (estimated annual value)
   - Close date: `{{ contact.trial_end_date }}`
   - Associate to: Contact and Company

2. **Create Task**
   - Title: "Check in with trial customer"
   - Due date: 2 business days
   - Assign to: Round-robin (or specific owner)
   - Description: "Customer placed their first order. Follow up to ensure smooth experience."

3. **Send Internal Notification**
   - To: Sales team
   - Subject: "New trial lead - First order placed!"

### Workflow 4: High Intent Lead Identification

**Name:** Flag High Intent Trials
**Trigger:** Contact property "trial_orders_count" is greater than or equal to 3
**Enrollment:** Re-enrollment enabled

**Actions:**

1. **Update Deal Stage**
   - Pipeline: Trial Conversion
   - New stage: High Intent

2. **Create Task**
   - Title: "Call high-intent trial customer - conversion opportunity"
   - Due date: 1 business day
   - Priority: High

3. **Send Email to Sales Rep**
   - Subject: "Hot trial lead: {{ contact.business_name }}"
   - Body: Details about customer engagement

---

## API Access Configuration

### Create Private App

Navigate to: **Settings → Integrations → Private Apps**

1. Click "Create private app"
2. Name: `Elevate Wholesale Automation`
3. Description: `Automation system for trial account management`

### Required Scopes

**CRM Scopes:**
- `crm.objects.contacts.read` - Read contact data
- `crm.objects.contacts.write` - Create/update contacts
- `crm.objects.companies.read` - Read company data
- `crm.objects.companies.write` - Create/update companies
- `crm.objects.deals.read` - Read deal data
- `crm.objects.deals.write` - Create/update deals

**Additional Scopes:**
- `crm.schemas.contacts.read` - Read contact properties
- `crm.schemas.companies.read` - Read company properties
- `automation` - Enroll contacts in workflows

### Generate API Key

1. Click "Show token" after creating the private app
2. Copy the API key (starts with `pat-na1-`)
3. Store securely in `.env` file as `HUBSPOT_API_KEY`

**⚠️ Security Warning:** Never expose this key in client-side code or public repositories.

---

## Webhook Configuration

### Outgoing Webhooks (HubSpot → Supabase)

Configure in workflows as described in [Workflow 2](#workflow-2-shopify-sync-trigger).

### Webhook Security

All webhooks to Supabase Edge Functions should include:
- `Authorization` header with Supabase anon key
- JSON body with contact/deal IDs
- Payload validation in Edge Function

---

## Lead Status Property

Update the default "Lead Status" property with trial-specific values:

Navigate to: **Settings → Data Management → Properties → Contact Properties → Lead Status**

### Add Custom Values:

- `NEW` - Just submitted form
- `TRIAL_PENDING` - Manual approval needed
- `TRIAL_ACTIVE` - Trial account created, discount code active
- `TRIAL_INACTIVE` - Trial active but no orders yet (7+ days)
- `TRIAL_EXPIRED` - 30 days passed, trial ended
- `CONVERTED` - Now a paying customer
- `CHURNED` - Was customer, stopped ordering

---

## Lifecycle Stages

Ensure the following lifecycle stages are configured:

Navigate to: **Settings → Data Management → Properties → Contact Properties → Lifecycle Stage**

- `Lead` - Submitted form, not yet in trial
- `Marketing Qualified Lead` (optional)
- `Sales Qualified Lead` (optional)
- `Opportunity` - Active trial (map to this from "trial" custom value)
- `Customer` - Converted from trial
- `Evangelist` - High-value customer, referrals

**Custom Lifecycle Stage (if available in your HubSpot tier):**
- `Trial` - Active trial account (between Lead and Customer)

---

## Email Templates

Create the following email templates:

### 1. Trial Welcome Email

**Subject:** Welcome to Your 30-Day Trial - Elevate Wholesale

**Body:**
```
Hi {{ contact.firstname }},

Welcome to Elevate Wholesale! Your 30-day trial account is now active.

LOGIN DETAILS:
Email: {{ contact.email }}
Login URL: https://elevatewholesale.com.au/account/login
(You'll receive a 6-digit code via email when you log in)

YOUR EXCLUSIVE TRIAL OFFER:
Use coupon code: {{ contact.trial_coupon_code }}
Valid until: {{ contact.trial_end_date | date_format: "%B %d, %Y" }}

GET STARTED:
1. Click the login link above
2. Enter your email address
3. Check your inbox for the verification code
4. Browse our catalog and place your first order

Your trial account is set to "Pay Now" only. If you'd like to apply for trading terms (Net 30/60), please fill out our credit application: [Link]

Questions? Reply to this email or call us at [Phone].

Best regards,
The Elevate Wholesale Team
```

### 2. Trial Reminder 1 (Day 7)

**Subject:** Haven't seen you yet! Your trial is waiting

**Body:**
```
Hi {{ contact.firstname }},

We noticed you haven't placed an order yet. Your trial is still active with {{ contact.trial_end_date | time_until }} remaining!

POPULAR PRODUCTS TO TRY:
- [Product 1]
- [Product 2]
- [Product 3]

REMEMBER YOUR DISCOUNT:
Code: {{ contact.trial_coupon_code }}
Login: https://elevatewholesale.com.au/account/login

Need help getting started? Reply to this email and we'll guide you through your first order.

Cheers,
[Your Name]
Elevate Wholesale
```

### 3. Trial Check-in (Day 15)

### 4. Trial Expiring Soon (Day 23)

### 5. Trial Expired (Day 30+)

---

## Reports & Dashboards

### Create Custom Reports

Navigate to: **Reports → Analytics Tools → Custom Report Builder**

#### 1. Trial Conversion Funnel

**Report Type:** Single object (Contacts)
**Filters:**
- `trial_status` is any of: active, logged_in, converted, expired
- `Create date` is in last 30 days

**Metrics:**
- Count of contacts (by trial_status)
- Average trial_total_spent
- Conversion rate (formula: converted / total)

#### 2. Trial Performance Dashboard

**Metrics to track:**
- Active trials (trial_status = active or logged_in)
- Trials with orders (trial_orders_count > 0)
- Average orders per trial
- Average spend per trial
- Conversion rate (converted / (converted + expired))
- Deal pipeline value (Trial Conversion pipeline)

#### 3. Email Engagement Report

**Metrics:**
- Email open rates (by email type)
- Click-through rates
- Unsubscribe rates

---

## Testing the Setup

### Verification Checklist

- [ ] All custom contact properties created
- [ ] All custom company properties created
- [ ] Trial Conversion pipeline created with all stages
- [ ] Private app created with API key saved
- [ ] Trial Welcome Sequence workflow active
- [ ] Shopify Sync Trigger workflow active
- [ ] First Order Deal Creation workflow active
- [ ] Email templates created and published
- [ ] Test form submission creates contact correctly
- [ ] Webhook to Supabase functions correctly

---

## Troubleshooting

### Common Issues

**Issue:** Webhook to Supabase not firing
**Solution:** Check workflow enrollment criteria, verify Supabase function URL is correct, check Authorization header

**Issue:** Custom properties not showing in forms
**Solution:** Navigate to Settings → Properties → Manage properties → Make properties visible in forms

**Issue:** Contacts not enrolling in workflows
**Solution:** Check enrollment criteria, verify contact meets all conditions, check re-enrollment settings

---

## Support

For HubSpot-specific questions:
- HubSpot Academy: https://academy.hubspot.com/
- HubSpot Community: https://community.hubspot.com/
- HubSpot Support: In-app chat or support@hubspot.com

For integration issues:
- Check Supabase Edge Function logs
- Review integration_sync_log table in Supabase
- Verify API credentials in .env file
