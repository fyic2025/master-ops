# Conversation Notes - Wholesale Portal Replacement

## Session Date: 2024-12-03

---

## Key Insights from Discussion

### 1. Unleashed Replacement Feasibility

**Initial estimate:** 4-6 months
**Revised estimate:** 1-2 weeks (with Unleashed API data export)

**Why it's faster than expected:**
- Unleashed API allows complete data export (products, BOMs, stock, batches, costs)
- Not building from scratch - importing proven data structures
- Existing dashboard infrastructure ready
- AI-assisted development accelerates coding
- Supabase + n8n already in place

### 2. Xero Integration - Not Scary

User walked through actual accounting flow:
- Purchase raw materials → Inventory asset + GST
- Assembly → Asset-to-asset transfer (raw → finished)
- Sale → Revenue + GST + COGS journal
- All weighted average costing

**Conclusion:** Standard journal entries via Xero API. ~1 week to build, not months.

### 3. Off-the-Shelf Alternatives Considered

| Option | Verdict |
|--------|---------|
| Unleashed B2B Portal | 10-15 min sync, limited customization, extra fees |
| ERPNext | Good option but custom build is faster with API export |
| Odoo | Too heavy for needs |
| InvenTree | Inventory only, no accounting |

**Decision:** Custom build wins due to speed, cost savings, and full control.

### 4. Mobile App Strategy

**Native app:** $20-50K, 8-12 weeks
**PWA:** $0 extra, 1-2 days config

**Decision:** PWA - same experience, no app store, works offline for browsing.

### 5. Hosted vs Offline Portal

**Conclusion:** Hosted with PWA caching
- Real-time stock accuracy more important than offline ordering
- PWA caches catalog for offline browsing
- Orders require connection (prevents stock conflicts)
- B2B customers have internet

### 6. Email PO Processing

Wholesale customers can email purchase orders with their own SKU codes:
- One-time SKU mapping per customer (their code → our code)
- Auto-parse PDF/CSV/Excel attachments
- AI parsing for messy formats
- Draft order creation

### 7. Barcode Scanning Workflow

**Production:**
1. Scan work order
2. Scan each component (validates, deducts)
3. Scan finished product (creates batch, sets expiry)

**Fulfillment:**
1. Scan order
2. Scan items to pick (FEFO enforced)
3. All scanned → auto-generate label
4. Scan label → shipped + tracking synced

**Result:** Zero paperwork

### 8. Multi-Business Shipping

Already built in codebase:
- Different AusPost accounts per business (Teelixir, BOO, Elevate)
- Sendle integration
- Label generation (PDF + ZPL)
- Tracking sync to Shopify/BigCommerce

### 9. Security

Same security standards as Unleashed/Shopify:
- Supabase Auth with social login
- Row Level Security (data isolation)
- Encryption at rest + in transit
- Daily backups + point-in-time recovery
- Audit logging
- DDoS protection

### 10. Don't Replace Xero

**Unleashed:** High cost ($376/mo), low risk to replace, custom build faster
**Xero:** Low cost ($70/mo), high risk to replace (ATO compliance, bank feeds, payroll)

**Decision:** Keep Xero. The $70/mo buys compliance peace of mind.

---

## Architecture Decisions

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUILD (Replace Unleashed)                     │
│                                                                  │
│  • Products, BOMs, inventory                                    │
│  • Batch/lot tracking, expiry                                   │
│  • Weighted average costing                                     │
│  • Purchase orders, receiving                                   │
│  • Assembly/production                                          │
│  • Wholesale portal                                             │
│  • Barcode scanning (PWA)                                       │
│  • Shipping labels                                              │
│  • Order fulfillment                                            │
│  • Email PO processing                                          │
│  • Rewards/loyalty                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Push transactions
                              ▼
                    ┌───────────────────┐
                    │    KEEP (Xero)    │
                    │                   │
                    │  • Invoices       │
                    │  • Bills          │
                    │  • Journals       │
                    │  • Payroll        │
                    │  • BAS/GST        │
                    │  • Bank feeds     │
                    └───────────────────┘
```

---

## Timeline Evolution

| Stage | Estimate |
|-------|----------|
| Initial (replace Unleashed) | 4-6 months |
| After understanding Xero is simple | 6-8 weeks |
| After realizing data is imported | 2 weeks core |
| With all features | 5-6 weeks total |

---

## Cost Savings

| Current Annual | New Annual | Savings |
|----------------|------------|---------|
| Unleashed $4,500 | $0 | $4,500 |
| Shopify Elevate ~$1,000 | $0 | $1,000 |
| Hosting | $600 | ($600) |
| **Total** | **$600** | **~$4,900/year** |

5-year savings: **~$25,000**

---

## Required Answers Before Build

See TASKS.md "Blocked / Waiting for Answers" section:
- Returns process
- Stocktake frequency
- Payment terms usage
- Multi-warehouse needs
- Current Unleashed reports used

---

## Files Created This Session

1. `projects/wholesale-portal-replacement/PROJECT.md` - Full project overview
2. `projects/wholesale-portal-replacement/TASKS.md` - Detailed task breakdown
3. `projects/wholesale-portal-replacement/CONVERSATION-NOTES.md` - This file

---

## Next Action

Answer open questions in PROJECT.md, then start Phase 1 (Schema + Import).
