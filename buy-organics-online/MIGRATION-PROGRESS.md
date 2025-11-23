# Buy Organics Online - Migration Progress

**Date:** 2025-11-23
**Status:** Phase 1 - Database Schema Created ✅

---

## ✅ Completed Tasks

### 1. Database Schema Design
Created complete Supabase schema with the following tables:

**Core Tables:**
- ✅ `ecommerce_products` - BigCommerce product data
- ✅ `supplier_products` - All supplier products (Oborne, UHP, Kadac)
- ✅ `product_supplier_links` - Junction table for product-supplier relationships

**Helper Tables:**
- ✅ `automation_logs` - Workflow execution monitoring
- ✅ `pricing_rules` - Configurable pricing formulas
- ✅ `supplier_priority_changes` - Audit log
- ✅ `sync_history` - Sync status tracking

**Views Created:**
- ✅ `products_with_multiple_suppliers` - Products needing review
- ✅ `products_without_supplier` - Products with no supplier links
- ✅ `active_product_supplier_pairs` - Active product-supplier relationships
- ✅ `recent_automation_activity` - Monitoring dashboard data

**Location:** [c:\Users\jayso\master-ops\buy-organics-online\supabase-migrations\](supabase-migrations/)

---

## 🔧 Your Next Steps

### Step 1: Run Supabase Migrations (15 minutes)

1. **Open Supabase SQL Editor:**
   - URL: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

2. **Run each migration file in order:**
   - Copy content from `supabase-migrations/001_create_ecommerce_products.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Repeat for files 002, 003, 004

3. **Verify tables created:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   **Expected output:**
   - automation_logs
   - ecommerce_products
   - pricing_rules
   - product_supplier_links
   - supplier_priority_changes
   - supplier_products
   - sync_history

### Step 2: Set up n8n (30-60 minutes)

**Choose one option:**

**Option A: n8n Cloud (Recommended)**
- Cost: $20/month
- URL: https://n8n.io/cloud/
- Pros: Managed, no maintenance, auto-scaling
- Setup: 5 minutes

**Option B: Self-Hosted**
- Cost: $12/month (DigitalOcean droplet)
- Pros: Lower cost, full control
- Setup: 30-60 minutes

**Need help setting up n8n?** Let me know which option you prefer!

### Step 3: Configure n8n Credentials

Once n8n is running, add these credentials:

1. **Supabase - BOO**
   - Type: Supabase
   - Host: `https://usibnysqelovfuctmkqw.supabase.co`
   - Service Role Key: (already have)

2. **BigCommerce - BOO**
   - Store Hash: `hhhi`
   - Client ID: `nvmcwck5yr15lob1q911z68d4r6erxy`
   - Access Token: `d9y2srla3treynpbtmp4f3u1bomdna2`

3. **FTP - Oborne**
   - Host: `ftp3.ch2.net.au`
   - User: `retail_310`
   - Password: (already have)

### Step 4: Import n8n Workflows

**Coming next:** I'll create the workflow JSON files for:
1. BigCommerce → Supabase product sync
2. Oborne supplier sync
3. UHP supplier sync
4. Kadac supplier sync
5. Product linking workflow

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│  BigCommerce Store (buyorganicsonline)  │
│  ~11,357 products                        │
└─────────────────┬───────────────────────┘
                  │
                  │ n8n Workflow #1 (Daily)
                  ↓
         ┌────────────────────┐
         │  Supabase - BOO    │
         │  ecommerce_products│ ←─┐
         └────────────────────┘   │
                  ↑                │
                  │                │
         ┌────────┴────────┐      │
         │ product_supplier│      │
         │     _links      │      │
         └────────┬────────┘      │
                  │                │
                  │                │
         ┌────────┴────────┐      │
         │ supplier_products│ ←───┼── n8n Workflow #2: Oborne (Every 2h)
         │                 │ ←───┼── n8n Workflow #3: UHP (Every 2h)
         │ - oborne: 1,823│ ←───┼── n8n Workflow #4: Kadac (Every 2h)
         │ - uhp: 1,102   │      │
         │ - kadac: 945   │      │
         └─────────────────┘      │
                                  │
              n8n Workflow #5: Product Linking (Manual)
              │
              └── Matches products by:
                  1. SKU (direct)
                  2. Barcode (cross-supplier)
```

---

## 🎯 Key Features Implemented

### Flexible Supplier Linking
- One product can have multiple suppliers
- Barcode matching links same product from different suppliers
- Manual priority management (via UI - coming next)

### Automatic Fallback
- If primary supplier out of stock → use priority 2
- If priority 2 out of stock → use priority 3
- Configurable priority order

### Pricing Rules (Pre-configured)
1. **Carton Only:** `price = moq × rrp`
2. **Default Markup:** `price = cost × 1.4` (40% margin)
3. **Supplier Discounts:**
   - Oborne: 7% off RRP
   - Kadac: 10% off RRP
   - UHP: 10% off RRP

### Audit Trail
- All supplier changes logged
- Workflow execution history
- Sync status monitoring

---

## 📝 Schema Highlights

### Multi-Supplier Support
```sql
-- Example: One BC product with 3 suppliers
ecommerce_products: SKU "OB - ABC123"
  ├── product_supplier_links (Oborne) - is_active=TRUE, priority=1
  ├── product_supplier_links (UHP)    - is_active=FALSE, priority=2
  └── product_supplier_links (Kadac)  - is_active=FALSE, priority=3
```

### Barcode Matching
```sql
-- Example: Same product from multiple suppliers
BC Product: Barcode "9123456789"
  ↓ (matched by barcode)
Supplier Products:
  - Oborne: SKU "ABC", Barcode "9123456789"
  - UHP: SKU "XYZ", Barcode "9123456789"
  - Kadac: SKU "DEF", Barcode "9123456789"
```

---

## 🚀 What's Next

**Immediate (This Week):**
1. ⏳ Run Supabase migrations
2. ⏳ Set up n8n instance
3. ⏳ Import and activate workflows

**Short-term (Next Week):**
1. Build pricing update workflow
2. Build stock availability workflow
3. Test end-to-end data flow

**Medium-term (Weeks 3-4):**
1. Build management UI (React/Next.js)
2. Bulk supplier priority management
3. Analytics dashboard

**Long-term (Weeks 5+):**
1. Add Teelixir workflows
2. Cross-site management features
3. Advanced automation rules

---

## 📞 Questions?

Let me know when you're ready for the next step, or if you need help with:
- Running the Supabase migrations
- Setting up n8n
- Creating the workflow templates
- Anything else!

**Status:** Ready to proceed with n8n setup! 🚀
