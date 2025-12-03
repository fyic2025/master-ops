# Wholesale Portal & Unleashed Replacement Project

## Project Overview

Replace Elevate Wholesale Shopify store AND Unleashed with a unified custom system that provides:
- Customer-facing wholesale portal (PWA)
- Inventory management with batch/lot tracking
- Barcode scanning for production and fulfillment
- Multi-business shipping (AusPost/Sendle)
- Xero integration
- Paperless operations

## Business Case

| Current | Proposed |
|---------|----------|
| Unleashed: $376+/mo ($4,500+/yr) | Custom system: ~$50/mo hosting |
| Shopify Elevate: Clunky B2B experience | Custom portal: Fast, tailored UX |
| Sync issues between systems | Single database, no sync |
| Limited customization | Full control |
| No rewards/loyalty | Built-in |
| No barcode scanning (web) | PWA barcode scanning |

**Annual savings: ~$4,000+ plus better functionality**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED SYSTEM                                │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Wholesale  │  │  Inventory  │  │  Shipping   │              │
│  │   Portal    │  │  + Orders   │  │   Labels    │              │
│  │   (PWA)     │  │  + Batches  │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │               │               │                        │
│         └───────────────┴───────────────┘                        │
│                         │                                        │
│                  SUPABASE (Database)                             │
│                         │                                        │
└─────────────────────────┼───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┬───────────────┐
          ▼               ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │   Xero   │    │  Shopify │    │BigCommerce│   │  AusPost │
    │          │    │(Teelixir)│    │   (BOO)   │   │  Sendle  │
    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## Key Features

### 1. Wholesale Portal (Customer-Facing)
- Social login (Google, Facebook, Apple)
- Customer-specific pricing
- Product catalog with search/filter
- Shopping cart (persists offline via PWA)
- Quick reorder from history
- Back-in-stock notifications
- Rewards/loyalty points
- Mobile-first PWA (works like native app)

### 2. Email PO Processing
- Customers email purchase orders (PDF/CSV/Excel)
- Auto-parse attachments
- One-time SKU mapping (their codes → our codes)
- Auto-create orders
- Confirmation email sent

### 3. Inventory Management
- Products with variants
- BOM (Bill of Materials) for assemblies
- Batch/lot tracking
- Expiry date tracking (FEFO - First Expiry First Out)
- Weighted average costing
- Stock adjustments with audit trail

### 4. Production (Assembly)
- Barcode scan to start work order
- Scan components as used (validates correct items)
- Auto-deduct from raw materials
- Create finished goods with batch number
- Assign expiry date
- Calculate assembled cost from components

### 5. Fulfillment (Paperless)
- Unified order queue (Shopify, BigCommerce, Wholesale, Email POs)
- Barcode scan to pick items
- FEFO enforced (pick earliest expiry first)
- Wrong item = error beep
- All items scanned = auto-generate shipping label
- Scan label = mark shipped + notify customer
- Tracking auto-synced to source platform

### 6. Shipping
- Multi-business AusPost accounts (Teelixir, BOO, Elevate)
- Sendle integration
- Label generation (PDF + ZPL for Zebra)
- Manifest generation
- Tracking sync to Shopify/BigCommerce
- **Already built** in dashboard

### 7. Xero Integration
- Sales → Invoice + COGS journal
- Purchases → Bill
- Assembly → Asset transfer journal
- Stock adjustments → Journal entries
- All automated on transaction

### 8. Reporting
- Stock valuation
- Sales by product/customer
- Margin/COGS analysis
- Expiry/waste reports
- Supplier performance

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Database | Supabase (PostgreSQL) |
| Backend | Next.js API routes |
| Frontend | Next.js + React |
| Mobile | PWA (Progressive Web App) |
| Auth | Supabase Auth (social login) |
| Hosting | Vercel or DigitalOcean App Platform |
| Barcode | PWA camera API |
| Shipping | AusPost + Sendle APIs (already built) |

---

## Data Migration

Using Unleashed API to export:
- Products + variants
- BOMs (Bill of Materials)
- Stock levels + batch details
- Costs (weighted average)
- Customers + pricing
- Suppliers
- Historical orders

**Unleashed API access = complete data migration in hours, not weeks**

---

## Security

| Layer | Protection |
|-------|------------|
| Auth | Supabase Auth + MFA |
| Data | Row Level Security (RLS) |
| Encryption | At rest + in transit (SSL) |
| Backups | Daily + point-in-time recovery |
| Audit | Full audit logging |
| DDoS | Edge protection (Vercel/Cloudflare) |
| Secrets | Environment variables / Supabase Vault |

---

## Build Timeline

| Phase | Days | Deliverables |
|-------|------|--------------|
| **Week 1: Core** | 5 | Schema, Unleashed import, inventory, costing |
| **Week 2: Operations** | 5 | Receiving, assembly, fulfillment scanning |
| **Week 3: Integrations** | 3 | Xero, Shopify, BigCommerce sync |
| **Week 4: Portal** | 4 | Wholesale portal UI + email PO processing |
| **Week 5: Extras** | 6 | Returns, stocktake, alerts, reports, roles |
| **Week 6: Testing** | 3 | Parallel run, validation, cutover |
| **Total** | ~26 days | Complete system |

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Replace Unleashed? | Yes | High cost, sync issues, limited customization |
| Replace Xero? | No | Low cost ($70/mo), compliance critical, accountant access |
| Native app or PWA? | PWA | Same experience, no app store, offline capable |
| Redis or Supabase cache? | Supabase | Already in stack, n8n syncs real-time |
| Full offline ordering? | No | Real-time stock more important for B2B |
| ERPNext or custom? | Custom | Faster with AI assistance, tailored to needs |

---

## Open Questions (Need Answers)

### Returns & Refunds
- [ ] Do customers return products?
- [ ] Put stock back into inventory?
- [ ] Credit notes to Xero?
- [ ] Damaged returns (write off)?

### Stocktakes
- [ ] How often do you stocktake?
- [ ] Full count or cycle count?
- [ ] Variance reports needed?
- [ ] Adjustments → Xero journals?

### Low Stock & Reordering
- [ ] Alerts when stock low?
- [ ] Auto-suggest purchase orders?
- [ ] Reorder points per product?
- [ ] Lead time tracking?

### Reporting
- [ ] What reports do you run from Unleashed currently?
- [ ] Stock valuation report format?
- [ ] Sales by product/customer?
- [ ] Margin/COGS reports?
- [ ] Expiry/waste reports?

### Customer Credit & Terms
- [ ] Credit limits per customer?
- [ ] Payment terms (NET 7/14/30)?
- [ ] Block orders if overdue?
- [ ] Pay on account vs prepay?

### Pricing & Promotions
- [ ] Multiple price tiers?
- [ ] Customer-specific pricing?
- [ ] Volume discounts?
- [ ] Time-limited promos?

### User Roles & Permissions
- [ ] Who can adjust stock?
- [ ] Who can see costs/margins?
- [ ] Who can process refunds?
- [ ] Approval workflows needed?

### Multi-Warehouse
- [ ] Multiple warehouse locations?
- [ ] Transfer between locations?
- [ ] Pick from specific location?

### Landed Cost
- [ ] Add freight to product cost?
- [ ] Import duties?
- [ ] Other costs on purchase?

---

## What's Already Built

| Component | Location | Status |
|-----------|----------|--------|
| AusPost client | `shared/libs/integrations/auspost/` | ✅ Complete |
| Sendle client | `shared/libs/integrations/sendle/` | ✅ Complete |
| Shipping API routes | `dashboard/src/app/api/shipping/` | ✅ Complete |
| Shipping schema | `infra/supabase/migrations/20251201_shipping_platform_schema.sql` | ✅ Complete |
| Shopify order sync | `dashboard/src/app/api/shipping/label/route.ts` | ✅ Complete |
| BigCommerce order sync | `dashboard/src/app/api/shipping/label/route.ts` | ✅ Complete |
| Dashboard infrastructure | `dashboard/` | ✅ Complete |
| Supabase setup | `infra/supabase/` | ✅ Complete |
| n8n workflows | Droplet | ✅ Running |

---

## Cost Comparison

| Item | Current (Annual) | Proposed (Annual) |
|------|------------------|-------------------|
| Unleashed | $4,500+ | $0 |
| Shopify (Elevate) | ~$1,000 | $0 |
| Hosting (Supabase + Vercel) | - | $600 |
| Xero | $840 | $840 (keep) |
| **Total** | ~$6,340 | ~$1,440 |
| **Savings** | - | **~$4,900/year** |

---

## Next Steps

1. Answer open questions above
2. Build schema and import scripts
3. Run Unleashed data migration
4. Build core features
5. Parallel run with Unleashed
6. Cutover and cancel Unleashed subscription

---

## Project Created
- Date: 2024-12-03
- Session: Wholesale Portal Replacement Planning
