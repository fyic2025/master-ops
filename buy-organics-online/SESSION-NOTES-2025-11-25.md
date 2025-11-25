# Session Notes - 2025-11-25

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
