# BOO Operations Hub - Project Plan

**Created:** 2025-11-25
**Status:** Planning Complete - Ready to Build

---

## Executive Summary

Build a custom Operations Hub to replace manual processes, reduce errors, and improve customer service across Buy Organics Online (and potentially Teelixir, Elevate).

### Current Pain Points
- Manual copy/paste ordering from suppliers (India team, errors, costs money)
- EFT payments missed (orders sit unpaid)
- Customer service spread across LiveChat, email
- No visibility into "where's my order" without manual lookup
- Starship IT costs for shipping labels

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOO OPERATIONS HUB                           │
├────────────────────────────┬────────────────────────────────────┤
│   📦 INVENTORY MODULE      │   💬 CUSTOMER SERVICE MODULE       │
│                            │                                    │
│  • What needs ordering     │  • LiveChat inbox                  │
│  • Supplier order tracking │  • Email inbox                     │
│  • Shelf stock levels      │  • AI order lookup                 │
│  • Photo inventory         │  • "Where's my order?" automation  │
│  • Shipping queue          │  • Shipping rules & expectations   │
├────────────────────────────┴────────────────────────────────────┤
│   🚚 SHIPPING MODULE                                            │
│  • AusPost + Sendle rate comparison                            │
│  • Direct label printing (Zebra)                               │
│  • 3 AusPost sub-accounts (BOO, Teelixir, Elevate)            │
│  • Tracking auto-updates                                        │
├─────────────────────────────────────────────────────────────────┤
│   💰 PAYMENTS MODULE                                            │
│  • Bendigo Bank EFT auto-matching                              │
│  • Order status auto-update when paid                          │
│  • Staff notification for printing                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module 1: Inventory Management

### Features
- Track what's physically on shelf (independent of supplier stock)
- Mobile photo entry for stock counts
- See what needs ordering based on customer orders
- Group by supplier for easy ordering
- Low stock alerts

### Mobile Stock Entry
- Phone-friendly web page
- Scan barcode or take photo
- Enter quantity on shelf
- Saves to Supabase

### Database Tables
```sql
boo_inventory (
    sku TEXT PRIMARY KEY,
    product_name TEXT,
    supplier_code TEXT,
    supplier_sku TEXT,
    on_shelf_qty INTEGER,
    last_stock_check TIMESTAMP,
    stock_photo_url TEXT,
    min_stock_level INTEGER,
    needs_ordering BOOLEAN
)
```

---

## Module 2: Supplier Ordering

### Current Process (Manual)
1. Orders come into BigCommerce
2. India team copy/pastes SKUs to supplier carts
3. Records in Google Sheets
4. Errors, things fall through cracks

### New Process (Automated)
1. Orders sync to Supabase automatically
2. Dashboard shows items needing ordering, grouped by supplier
3. One-click to generate supplier order
4. Track: ordered → shipped → received

### Order Lifecycle
```
Customer Order → Supplier Order → Supplier Ships → We Receive → We Ship → Delivered
     ↓                ↓                ↓              ↓            ↓          ↓
  [Pending]      [Ordered]        [In Transit]   [In Stock]   [Shipped]  [Complete]
```

### Database Tables
```sql
customer_orders (
    order_id TEXT PRIMARY KEY,
    customer_email TEXT,
    customer_name TEXT,
    order_date TIMESTAMP,
    status TEXT,
    shipping_address JSONB
)

order_items (
    id SERIAL PRIMARY KEY,
    order_id TEXT REFERENCES customer_orders,
    sku TEXT,
    product_name TEXT,
    qty INTEGER,
    status TEXT, -- pending_supplier, ordered, received, shipped
    supplier_order_id INTEGER,
    shipped_at TIMESTAMP,
    tracking_number TEXT
)

supplier_orders (
    id SERIAL PRIMARY KEY,
    supplier_code TEXT,
    order_date TIMESTAMP,
    expected_delivery DATE,
    actual_delivery DATE,
    status TEXT, -- placed, shipped, received
    supplier_reference TEXT
)
```

---

## Module 3: Shipping

### Carriers
- **Australia Post** (3 sub-accounts: BOO, Teelixir, Elevate)
- **Sendle**

### Hardware
- **Zebra label printer** (ZPL format)

### Features
- Rate comparison (AusPost vs Sendle)
- Auto-select cheapest option
- Print labels directly to Zebra
- Batch printing
- Tracking number saved to order
- Customer gets tracking email

### Offline Resilience
- Pre-generate labels in morning while internet stable
- Cache locally on warehouse computer
- Print from cache even if internet drops

### Credentials Needed
- [ ] AusPost API key (from developers.auspost.com.au)
- [ ] AusPost Account Numbers (3 sub-accounts)
- [ ] Sendle API key (from Sendle dashboard)
- [ ] Sendle ID

---

## Module 4: Customer Service Dashboard

### Unified Inbox
- LiveChat messages (already connected)
- Email (to be connected)
- All linked to customer record

### AI Capabilities
- Auto-lookup order status
- Draft responses for common questions
- Flag urgent issues (medicine, frustrated customers)
- "Where's my order?" automation

### Response Flow
```
Customer: "Where's my order?"
    ↓
AI Lookup:
  • Order ID
  • Supplier ETA
  • Shipping rule
    ↓
Draft Response:
  "Your order is expected to ship Friday"
    ↓
[Auto-send] or [Agent Review]
```

---

## Module 5: EFT Payment Matching

### Problem
Customer pays via bank transfer → Not noticed → Order sits unpaid

### Solution: Bendigo Bank Email Alerts + n8n

### Workflow
```
1. Bendigo sends deposit email
2. n8n monitors inbox
3. Parses: amount, reference, sender
4. Matches to pending orders in Supabase
5. Marks order as PAID
6. Notifies staff: "Order #12345 ready to ship"
7. Updates BigCommerce order status
```

### Matching Logic
1. Exact reference match (ORDER12345)
2. Amount + similar name
3. Amount only (flag for review)

---

## Module 6: LiveChat Intelligence

### Objective
Pull 12 months of chat history, analyze patterns, understand issues

### Volume
- ~12 messages/day
- ~4,300 chats over 12 months

### AI Analysis
For each conversation, extract:
- Category (order_status, shipping, payment, product, returns, etc.)
- Sentiment (positive, neutral, negative, frustrated)
- Urgency (low, medium, high, urgent)
- Summary (1-line description)
- Resolution status

### Expected Insights
- Top issues customers contact about
- Unanswered chat rate
- Response time trends
- Automation opportunities

### Database Tables
```sql
livechat_conversations (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_email TEXT,
    customer_city TEXT,
    started_at TIMESTAMP,
    was_replied BOOLEAN,
    response_time_seconds INTEGER,
    issue_category TEXT,
    sentiment TEXT,
    urgency TEXT,
    summary TEXT,
    resolution_status TEXT
)

livechat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    author_type TEXT,
    message_text TEXT,
    created_at TIMESTAMP
)
```

---

## Future Modules (Phase 2)

### AI Voice Agent
- Answer phone calls
- Take orders
- Send payment link via SMS (PayPal/Braintree)
- Estimated cost: ~$0.05-0.10/min (Vapi.ai or Retell.ai)

### Returns & Refunds
- Customer self-service return request
- Track returned items back to stock
- Process refunds

### Product Expiry Tracking
- FIFO picking
- Alert when stock nearing expiry
- Batch/lot numbers for recalls

### Supplier Price Monitoring
- Detect when supplier changes prices
- Flag for margin review
- Auto-update website pricing

### Reporting Dashboard
- Daily sales
- Top sellers
- Profit margins
- Staff performance

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Database | Supabase (BOO instance) |
| Web UI | Next.js or Retool |
| Hosting | DigitalOcean |
| AI | Claude API |
| Workflows | n8n |
| Shipping APIs | AusPost, Sendle |
| Label Printing | Zebra (ZPL) |

---

## Credentials Status

### ✅ Connected
| Service | Status |
|---------|--------|
| LiveChat | ✅ Working |
| Supabase (Shared) | ✅ Working |
| Supabase (BOO) | ✅ Working |

### ❓ Needed
| Service | Action Required |
|---------|-----------------|
| Supabase (Elevate) | Need service role key |
| AusPost API | Register at developers.auspost.com.au |
| Sendle API | Get from Sendle dashboard |
| BigCommerce | Need API credentials |
| Bendigo Bank | Enable email alerts for deposits |

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Supabase schema
- [ ] Sync LiveChat messages to Supabase
- [ ] Sync BigCommerce orders to Supabase
- [ ] Basic inventory entry (mobile web)

### Phase 2: Order Tracking (Week 2)
- [ ] Supplier order tracking UI
- [ ] Receiving workflow
- [ ] Shipping queue view
- [ ] Shipping rules engine

### Phase 3: Customer Service (Week 3)
- [ ] Unified inbox (LiveChat + Email)
- [ ] Order lookup by customer/order ID
- [ ] Timeline view per order

### Phase 4: Shipping (Week 3-4)
- [ ] AusPost API integration
- [ ] Sendle API integration
- [ ] Rate comparison
- [ ] Zebra label printing

### Phase 5: Payments & AI (Week 4)
- [ ] Bendigo EFT matching (n8n)
- [ ] AI order status automation
- [ ] AI response drafting

### Phase 6: Intelligence (Week 5)
- [ ] Pull 12 months LiveChat history
- [ ] AI categorization
- [ ] Insights dashboard

---

## Files & Resources

### Credentials
- `/home/user/master-ops/MASTER-CREDENTIALS-COMPLETE.env` (not in git)
- `/home/user/master-ops/.env.template` (template in git)

### Sync Script
- `/home/user/master-ops/scripts/sync-credentials.sh`

---

## Notes from Planning Session

### Key Decisions
1. **Web app** (not desktop) - works everywhere, easier to maintain
2. **Supabase** as central database - already have it, no extra cost
3. **Direct AusPost/Sendle** - cut out Starship IT costs
4. **Zebra printer** - ZPL labels, pre-generate for offline resilience
5. **Bendigo email alerts** - free solution for EFT matching
6. **Multi-business** - switch between BOO, Teelixir, Elevate

### Hosting
- DigitalOcean preferred
- No extra ongoing costs beyond hosting (~$5-10/mo)

### Recent LiveChat Activity
- ~12 messages/day average
- Last 200+ messages span ~19 days
- Common issues: order tracking, shipping, payment
- Some chats go unanswered (agent offline)
