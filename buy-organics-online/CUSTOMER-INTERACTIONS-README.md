# Customer Interactions System

Unified system for tracking, analyzing, and automating customer communications for Buy Organics Online.

## Overview

This system pulls customer interactions from:
- **LiveChat** - Real-time chat conversations
- **Email** - sales@buyorganicsonline.com.au (G Suite)

And stores them in **Supabase** for:
- Analysis of top customer queries
- Identification of automation opportunities
- Historical search and reporting
- Future AI agent training data

---

## Quick Start

### 1. Apply Database Schema

Open Supabase Dashboard → SQL Editor and run:
```sql
-- File: buy-organics-online/supabase/customer-interactions-schema.sql
```

### 2. Configure Credentials

Add to your credentials file:

```bash
# LiveChat
BOO_LIVECHAT_ACCOUNT_ID=19fb8d83-75ec-4419-8b98-ed4f64766cd0
BOO_LIVECHAT_PAT=<your-personal-access-token>
BOO_LIVECHAT_PAT_BASE64=<base64 encoded accountId:token>

# Email (G Suite)
BOO_SALES_IMAP_HOST=imap.gmail.com
BOO_SALES_IMAP_PORT=993
BOO_SALES_IMAP_USER=sales@buyorganicsonline.com.au
BOO_SALES_IMAP_PASS=<16-char app password>

# Supabase
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 3. Test Setup

```bash
cd /home/user/master-ops
npx tsx buy-organics-online/scripts/test-customer-interactions-setup.ts
```

### 4. Sync Data

```bash
# Pull 12 months of LiveChat history
npx tsx buy-organics-online/scripts/sync-livechat-to-supabase.ts --full

# Pull 12 months of email
npx tsx buy-organics-online/scripts/sync-email-to-supabase.ts --full

# Categorize interactions
npx tsx buy-organics-online/scripts/categorize-interactions.ts

# View analytics
npx tsx buy-organics-online/scripts/analyze-customer-interactions.ts
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `sync-livechat-to-supabase.ts` | Pull LiveChat conversations into Supabase |
| `sync-email-to-supabase.ts` | Pull emails into Supabase |
| `categorize-interactions.ts` | Auto-categorize using pattern matching |
| `analyze-customer-interactions.ts` | Generate insights and reports |
| `test-customer-interactions-setup.ts` | Validate credentials and connections |

### Script Options

```bash
# Sync options
--full          # Full 12-month sync
--days=30       # Last N days only

# Analysis options
--days=30       # Analyze last N days
--export        # Export to CSV

# Categorization options
--reprocess     # Re-categorize all (not just new)
--show          # Show distribution only
```

---

## Database Schema

### Main Tables

**customer_interactions** - Unified view of all interactions
- `source` - 'livechat' or 'email'
- `customer_email`, `customer_name`
- `subject`, `transcript`
- `category`, `subcategory`
- `status` - open, pending, resolved
- `sentiment` - positive, neutral, negative, urgent
- `priority` - low, medium, high, urgent

**interaction_messages** - Individual messages within conversations
- Links to parent interaction
- Tracks sender (customer/agent/bot)

**interaction_categories** - Reference table
- Pre-defined categories with suggested auto-responses

### Analytics Views

- `interaction_daily_summary` - Volume by day/source
- `interaction_category_summary` - Issue breakdown
- `recent_top_issues` - Last 30 days patterns
- `urgent_interactions` - Needs attention

---

## Categories

The system automatically categorizes interactions:

| Category | Examples |
|----------|----------|
| `order_tracking` | "Where is my order?", tracking queries |
| `order_issue` | Missing items, wrong items, damaged |
| `payment` | Failed payments, EFT, refunds |
| `returns` | Return requests, exchanges |
| `order_change` | Cancel, address change, modify |
| `product_inquiry` | Stock, ingredients, usage |
| `shipping` | Costs, delivery options |
| `technical` | Website issues, login problems |
| `pricing` | Discounts, price match |
| `complaint` | Negative feedback, escalations |
| `feedback` | Positive feedback, thanks |
| `wholesale` | Business inquiries |

---

## Credential Setup

### LiveChat PAT

1. Go to: https://developers.livechat.com/console/tools/personal-access-tokens
2. Create token with scopes:
   - `chats--all:ro` (read chats)
   - `agents--all:ro` (read agents)
   - `customers--all:ro` (read customers)
3. Base64 encode: `echo -n "accountId:token" | base64`
4. Set `BOO_LIVECHAT_PAT_BASE64`

### G Suite App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Name it "BOO Customer Sync"
4. Copy the 16-character password
5. Set `BOO_SALES_IMAP_PASS`

**Note:** Requires 2FA enabled on the Google account.

---

## Analytics Output

Running `analyze-customer-interactions.ts` shows:

```
═══════════════════════════════════════════════════════════════
📊 Customer Interactions Analysis
📅 Period: Last 30 days
═══════════════════════════════════════════════════════════════

📈 OVERVIEW STATISTICS
──────────────────────────────────────
Total interactions: 360
  └─ LiveChat: 240
  └─ Email: 120
Status:
  └─ Open: 15
  └─ Resolved: 345
  └─ Resolution rate: 95.8%

🏷️  TOP ISSUE CATEGORIES
──────────────────────────────────────
 1. order_tracking         120 ████████████████████
 2. product_inquiry         80 █████████████
 3. payment                 45 ███████
 ...

🤖 AUTOMATION OPPORTUNITIES
──────────────────────────────────────
Queries that could be automated with AI:

  Where is my order           85 (23.6%)
  Order tracking              62 (17.2%)
  Stock availability          34 (9.4%)
  ...

Total automatable: 220 (61.1% of all interactions)
```

---

## Future Enhancements

1. **AI Agent** - Use Claude to auto-respond to common queries
2. **Real-time Sync** - n8n webhook for instant processing
3. **Sentiment Analysis** - ML-based sentiment detection
4. **Order Lookup** - Direct BigCommerce integration
5. **Response Templates** - Auto-suggest responses to agents

---

## Troubleshooting

### LiveChat API Errors

```
Error: 401 Unauthorized
```
→ Check PAT is valid and base64 encoded correctly

```
Error: 403 Forbidden
```
→ PAT missing required scopes

### Email IMAP Errors

```
Error: Invalid credentials
```
→ Use app password, not regular password

```
Error: IMAP not enabled
```
→ Enable IMAP in G Suite Admin Console

### Supabase Errors

```
Error: relation "customer_interactions" does not exist
```
→ Run the schema SQL in Supabase SQL Editor

---

## Files

```
buy-organics-online/
├── supabase/
│   └── customer-interactions-schema.sql    # Database schema
├── scripts/
│   ├── sync-livechat-to-supabase.ts       # LiveChat sync
│   ├── sync-email-to-supabase.ts          # Email sync
│   ├── categorize-interactions.ts         # Auto-categorization
│   ├── analyze-customer-interactions.ts   # Analytics
│   └── test-customer-interactions-setup.ts # Setup validation
├── CUSTOMER-INTERACTIONS-README.md        # This file
├── BOO-OPERATIONS-HUB-PLAN.md            # Full project plan
└── SESSION-NOTES-2025-11-25.md           # Session notes
```

---

**Created:** 2025-11-25
**Status:** Ready for deployment
**Next:** Apply schema, configure credentials, run initial sync
