# Session Notes - 2025-11-25

---

## 🚨 ACTION REQUIRED - Customer Interactions System Ready

**Status:** Code complete, awaiting credentials to run initial sync

### What Was Built (This Session)
Full system for syncing LiveChat + Email to Supabase for customer intelligence:

| Component | File | Status |
|-----------|------|--------|
| Database Schema | `supabase/customer-interactions-schema.sql` | ✅ Ready to apply |
| LiveChat Sync | `scripts/sync-livechat-to-supabase.ts` | ✅ Code complete |
| Email Sync | `scripts/sync-email-to-supabase.ts` | ✅ Code complete |
| Categorization | `scripts/categorize-interactions.ts` | ✅ 20+ patterns |
| Analytics | `scripts/analyze-customer-interactions.ts` | ✅ Code complete |
| Setup Test | `scripts/test-customer-interactions-setup.ts` | ✅ Code complete |
| n8n Workflow | `infra/n8n-workflows/templates/customer-interactions-sync.json` | ✅ Template ready |
| Documentation | `CUSTOMER-INTERACTIONS-README.md` | ✅ Complete guide |

### Your Action Items

```bash
# 1. Apply schema to Supabase (BOO database: usibnysqelovfuctmkqw)
#    Run in SQL Editor: buy-organics-online/supabase/customer-interactions-schema.sql

# 2. Set up credentials in your .env file:
BOO_LIVECHAT_PAT_BASE64=<base64 of 19fb8d83-75ec-4419-8b98-ed4f64766cd0:YOUR_PAT>
BOO_SALES_IMAP_PASS=<16-char Gmail app password for sales@buyorganicsonline.com.au>

# 3. Test setup
npx tsx buy-organics-online/scripts/test-customer-interactions-setup.ts

# 4. Run initial sync (12 months of history)
npx tsx buy-organics-online/scripts/sync-livechat-to-supabase.ts --full
npx tsx buy-organics-online/scripts/sync-email-to-supabase.ts --full

# 5. Analyze results
npx tsx buy-organics-online/scripts/categorize-interactions.ts
npx tsx buy-organics-online/scripts/analyze-customer-interactions.ts
```

### Goal
Identify top customer queries to understand what AI agent needs to handle for automated responses.

---

## LiveChat Integration

### Connection Status: ✅ WORKING

Successfully connected to LiveChat API for Buy Organics Online.

### Credentials
- Account ID: `19fb8d83-75ec-4419-8b98-ed4f64766cd0`
- Entity ID: `jayson@fyic.com.au`
- Token: Saved in `BOO-CREDENTIALS.env`

### Agent
- Name: Kylie
- Role: Owner
- Status: Not accepting chats (at time of check)

### Recent Activity
- ~12 messages/day average
- Last 200+ messages span ~19 days
- Recent chat from Jun (Sydney) - order tracking issue, medicine order

---

## Supabase Databases Found

| Database | Project Ref | Status |
|----------|-------------|--------|
| Shared/Main | qcvfxxsnqvdfmpbcgdni | ✅ Connected |
| Buy Organics Online | usibnysqelovfuctmkqw | ✅ Connected |
| Elevate Wholesale | xioudaqfmkdpkgujxehv | ⚠️ Need service key |

---

## Operations Hub Plan

### Core Modules Agreed

1. **Inventory Management**
   - Track shelf stock independent of suppliers
   - Mobile photo entry for stock counts
   - Replace Google Sheets tracking

2. **Supplier Ordering**
   - Replace manual copy/paste process (India team)
   - Group orders by supplier
   - Track order lifecycle

3. **Shipping**
   - AusPost + Sendle integration
   - Direct Zebra label printing (ZPL)
   - 3 AusPost sub-accounts (BOO, Teelixir, Elevate)
   - Replace Starship IT (cost savings)

4. **Customer Service Dashboard**
   - Unified inbox (LiveChat + Email)
   - AI-powered order lookup
   - "Where's my order?" automation

5. **EFT Payment Matching**
   - Bendigo Bank email alerts
   - n8n workflow for auto-matching
   - Auto-update order status when paid

6. **LiveChat Intelligence**
   - Pull 12 months of chat history
   - AI categorization of issues
   - Identify patterns and automation opportunities

---

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| App Type | Web App | Works everywhere, easier maintenance |
| Database | Supabase | Already have it, no extra cost |
| Hosting | DigitalOcean | User preference, low cost |
| Shipping | Direct API | Cut out Starship IT fees |
| EFT Matching | Bendigo email + n8n | Free, automated |
| Label Printer | Zebra (ZPL) | Already have hardware |

---

## Offline Considerations

- Warehouse internet can be flaky
- Solution: Pre-generate labels while online, cache locally
- Print from cache even when offline
- Queue new orders, generate when connection returns

---

## Credentials Still Needed

| Service | How to Get |
|---------|------------|
| AusPost API | developers.auspost.com.au |
| Sendle API | Sendle Dashboard → Settings → API |
| BigCommerce | Store admin → API accounts |
| Elevate Supabase | Supabase dashboard → Settings → API |

---

## Future Considerations

1. **AI Voice Agent** - Take phone orders, send payment links
2. **Returns Processing** - Self-service returns
3. **Expiry Tracking** - FIFO picking, alerts
4. **Supplier Price Monitoring** - Auto-detect cost changes

---

## Recent LiveChat Issues Identified

From sample of recent chats:

| Customer | Issue | Status |
|----------|-------|--------|
| Jun (Sydney) | Order H241606215199 not shipped after 6 days, medicine for mother | URGENT - unanswered |
| Franca (Adelaide) | Payment not working | No response from customer |
| Anna (Melbourne) | Tracking query | Resolved - tracking provided |
| Vivian (Sydney) | Checkout issue | Resolved next day |
| Champaka (Sydney) | Order dispatch query | Unanswered |

### Key Insight
Multiple unanswered chats when agent offline. Opportunity for:
- Auto-response for common questions
- AI order lookup
- Better coverage alerts

---

## Files Created This Session

| File | Location | Purpose |
|------|----------|---------|
| BOO-CREDENTIALS.env | buy-organics-online/ | All BOO credentials (gitignored) |
| BOO-OPERATIONS-HUB-PLAN.md | buy-organics-online/ | Full project plan |
| SESSION-NOTES-2025-11-25.md | buy-organics-online/ | This file |
| sync-credentials.sh | scripts/ | Sync credentials to local |

---

## Next Steps

1. [ ] Get AusPost API credentials
2. [ ] Get Sendle API credentials
3. [ ] Get BigCommerce API credentials
4. [ ] Enable Bendigo Bank email alerts
5. [ ] Create Supabase schema
6. [ ] Pull 12 months LiveChat data
7. [ ] Start building Operations Hub UI
