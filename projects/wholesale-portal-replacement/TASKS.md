# Wholesale Portal Replacement - Tasks

## Status Legend
- ⬜ Not started
- 🔄 In progress
- ✅ Complete
- ⏸️ Blocked/Waiting

---

## Phase 1: Core System (Week 1)

### 1.1 Database Schema
- ⬜ Create products table (variants, SKUs, costs)
- ⬜ Create inventory_batches table (lot tracking, expiry, costs)
- ⬜ Create bom_components table (bill of materials)
- ⬜ Create suppliers table
- ⬜ Create customers table (wholesale accounts)
- ⬜ Create customer_pricing table (price tiers per customer)
- ⬜ Create customer_sku_mappings table (their codes → our codes)
- ⬜ Create orders table (unified order queue)
- ⬜ Create order_items table
- ⬜ Create stock_movements table (audit trail)
- ⬜ Create rewards_points table (loyalty)
- ⬜ Apply RLS policies to all tables

### 1.2 Unleashed Data Import
- ⬜ Build Unleashed API client
- ⬜ Export products + variants
- ⬜ Export BOMs
- ⬜ Export stock levels + batch details
- ⬜ Export costs (weighted average)
- ⬜ Export customers + pricing
- ⬜ Export suppliers
- ⬜ Validate imported data against Unleashed

### 1.3 Inventory Core
- ⬜ Weighted average cost calculation function
- ⬜ Stock level queries (by product, by batch)
- ⬜ Expiry date queries (FEFO ordering)
- ⬜ Low stock detection function

---

## Phase 2: Operations (Week 2)

### 2.1 Purchase Orders & Receiving
- ⬜ Create purchase_orders table
- ⬜ Create purchase_order_items table
- ⬜ PO creation UI
- ⬜ Receive stock function (creates batch, updates avg cost)
- ⬜ Barcode scan to receive UI (PWA)
- ⬜ Push bill to Xero on receive

### 2.2 Production / Assembly
- ⬜ Create work_orders table
- ⬜ Work order creation (from BOM)
- ⬜ Barcode scan production UI (PWA)
- ⬜ Component validation (scan checks correct item)
- ⬜ Component deduction (reduce raw materials)
- ⬜ Finished goods creation (new batch with summed cost)
- ⬜ Expiry date assignment
- ⬜ Push journal to Xero (asset transfer)

### 2.3 Fulfillment Scanning
- ⬜ Order queue UI (all sources: Shopify, BC, Wholesale, Email)
- ⬜ Pick screen UI (shows items to pick)
- ⬜ Barcode scan to pick (PWA camera)
- ⬜ FEFO enforcement (suggest correct batch)
- ⬜ Wrong item alert (beep + message)
- ⬜ Pick progress tracking (3 of 5 items)
- ⬜ Auto-complete when all scanned
- ⬜ Auto-generate shipping label
- ⬜ Scan label to mark shipped
- ⬜ Update source platform (Shopify/BC) with tracking

---

## Phase 3: Integrations (Week 3)

### 3.1 Xero Integration
- ⬜ Xero OAuth token management (refresh)
- ⬜ Create invoice on sale (revenue + GST)
- ⬜ Create COGS journal on sale
- ⬜ Create bill on purchase receive
- ⬜ Create journal on assembly (asset transfer)
- ⬜ Create journal on stock adjustment
- ⬜ Error handling + retry logic

### 3.2 Shopify Sync
- ⬜ Webhook: orders/create → unified queue (update existing)
- ⬜ Push tracking on fulfillment (already built, integrate)
- ⬜ Inventory level sync (optional, Shopify → our system)

### 3.3 BigCommerce Sync
- ⬜ Webhook: orders/create → unified queue
- ⬜ Push tracking on fulfillment (already built, integrate)

---

## Phase 4: Wholesale Portal (Week 4)

### 4.1 Authentication
- ⬜ Supabase Auth setup for customers
- ⬜ Google OAuth provider
- ⬜ Facebook OAuth provider
- ⬜ Apple OAuth provider
- ⬜ Link auth to customer record
- ⬜ New customer registration flow

### 4.2 Catalog & Search
- ⬜ Product listing page
- ⬜ Product detail page
- ⬜ Category filtering
- ⬜ Search functionality
- ⬜ Customer-specific pricing display
- ⬜ Stock availability display
- ⬜ "Out of stock" / "Back in stock" notifications

### 4.3 Cart & Checkout
- ⬜ Add to cart functionality
- ⬜ Cart persistence (localStorage + Supabase)
- ⬜ Cart page with quantities
- ⬜ Checkout flow
- ⬜ Shipping address selection
- ⬜ Shipping method selection
- ⬜ Order placement → create in system
- ⬜ Order confirmation page
- ⬜ Order confirmation email

### 4.4 Customer Account
- ⬜ Order history page
- ⬜ Order detail page
- ⬜ Quick reorder button
- ⬜ Saved addresses
- ⬜ Account settings
- ⬜ Rewards points display

### 4.5 Email PO Processing
- ⬜ Gmail inbox monitoring (dedicated orders@ address)
- ⬜ Attachment extraction
- ⬜ PDF parsing (structured)
- ⬜ CSV/Excel parsing
- ⬜ AI parsing for messy formats
- ⬜ SKU mapping lookup
- ⬜ Draft order creation
- ⬜ Confirmation email

### 4.6 PWA Configuration
- ⬜ Web app manifest
- ⬜ Service worker for offline
- ⬜ Cache product catalog
- ⬜ Offline cart storage
- ⬜ Push notification setup (back in stock)

---

## Phase 5: Additional Features (Week 5)

### 5.1 Returns & Refunds
- ⬜ Create returns table
- ⬜ Return request UI
- ⬜ Return processing (stock back or write off)
- ⬜ Credit note to Xero

### 5.2 Stocktake
- ⬜ Create stocktake table
- ⬜ Stocktake session UI
- ⬜ Barcode scan to count
- ⬜ Variance calculation
- ⬜ Adjustment creation
- ⬜ Adjustment → Xero journal

### 5.3 Alerts & Notifications
- ⬜ Low stock alerts (dashboard + email)
- ⬜ Expiring stock alerts
- ⬜ Overdue payment alerts
- ⬜ Back in stock notifications (customers)

### 5.4 Reporting
- ⬜ Stock valuation report
- ⬜ Sales by product report
- ⬜ Sales by customer report
- ⬜ Margin/COGS report
- ⬜ Expiry/waste report

### 5.5 User Roles & Permissions
- ⬜ Define role types (admin, manager, picker, viewer)
- ⬜ Role assignment UI
- ⬜ Permission checks in API routes
- ⬜ UI element visibility by role

---

## Phase 6: Testing & Cutover (Week 6)

### 6.1 Parallel Run
- ⬜ Both systems receiving orders
- ⬜ Compare order processing
- ⬜ Compare stock levels
- ⬜ Compare Xero entries
- ⬜ Fix discrepancies

### 6.2 Validation
- ⬜ Stock valuation matches Unleashed
- ⬜ Customer pricing matches
- ⬜ BOM costs calculate correctly
- ⬜ COGS calculates correctly
- ⬜ Xero entries are correct

### 6.3 Cutover
- ⬜ Final data sync from Unleashed
- ⬜ Switch webhooks to new system
- ⬜ Disable Unleashed sync
- ⬜ Monitor for issues
- ⬜ Cancel Unleashed subscription

### 6.4 Documentation & Training
- ⬜ User guide for wholesale portal
- ⬜ Staff training on fulfillment app
- ⬜ Staff training on production app
- ⬜ Admin documentation

---

## Already Complete ✅

- ✅ AusPost API client (`shared/libs/integrations/auspost/`)
- ✅ Sendle API client (`shared/libs/integrations/sendle/`)
- ✅ Shipping label API (`dashboard/src/app/api/shipping/label/`)
- ✅ Shipping manifest API (`dashboard/src/app/api/shipping/manifest/`)
- ✅ Shopify tracking sync
- ✅ BigCommerce tracking sync
- ✅ Shipping database schema
- ✅ Dashboard infrastructure
- ✅ Supabase setup
- ✅ n8n workflow infrastructure

---

## Blocked / Waiting for Answers

- ⏸️ Returns module - need confirmation on returns process
- ⏸️ Stocktake module - need confirmation on stocktake frequency
- ⏸️ Credit limits - need confirmation on payment terms usage
- ⏸️ Multi-warehouse - need confirmation on locations
- ⏸️ Reporting - need list of current Unleashed reports used

---

## Priority Order

1. **Schema + Import** - Foundation for everything
2. **Fulfillment Scanning** - Immediate operational benefit
3. **Xero Integration** - Financial accuracy
4. **Wholesale Portal** - Customer-facing value
5. **Production Scanning** - Paperless manufacturing
6. **Extras** - Based on answers to open questions

---

## Quick Reference

| Action | Command |
|--------|---------|
| Run dashboard locally | `cd dashboard && npm run dev` |
| Run migrations | `npx supabase db push` |
| Deploy dashboard | `doctl apps create-deployment 1a0eed70-aef6-415e-953f-d2b7f0c7c832 --force-rebuild` |

---

## Notes

- Xero integration is straightforward - just invoices, bills, journals
- Unleashed API gives us complete data export capability
- PWA barcode scanning works on any modern phone
- Start with phones, upgrade to dedicated scanners if needed
- Parallel run is critical - don't cut over until validated
