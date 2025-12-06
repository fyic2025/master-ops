# Multi-Business Migration Architecture

**Status:** ✅ ARCHITECTURE FINALIZED
**Date:** 2025-11-23
**Businesses:** 3 (Buy Organics Online, Teelixir/Elevate, Red Hill)

---

## 🏗️ EXECUTIVE SUMMARY

**Current State:** All businesses share single AWS RDS database

**Target State:** Each business gets dedicated Supabase project

**Migration Strategy:** Split database tables during migration (not before)

**Timeline:** 4.5-6.5 weeks for Buy Organics Online + Teelixir/Elevate

**Cost Savings:** $62-87/month ($744-1,044/year)

---

## 🏢 BUSINESS STRUCTURE

### Business #1: Buy Organics Online

**Platform:** BigCommerce
**Store:** buyorganicsonline.com.au
**Operations:** E-commerce with 4 supplier integrations

**Database Tables (11 tables):**
- `oborne_products` - Oborne supplier feed
- `uhp_products` - UHP supplier feed
- `kadac_products` - Kadac supplier feed
- `globalnature_products` - GlobalNature supplier feed
- `bc_products` - BigCommerce products (11,357 products)
- `bc_orders` - BigCommerce orders (157,126 orders)
- `bc_categories` - Product categories
- `bc_brands` - Product brands
- `oborne_stocks` - Historical stock tracking
- `bc_ai_score` - AI content scores
- `bc_improved_ai_score` - Improved AI descriptions

**Integrations:**
- Oborne (FTP)
- UHP (HTTPS)
- Kadac (API)
- GlobalNature (Email/IMAP)
- BigCommerce API

**n8n Workflows Required:** 5
1. Oborne supplier sync
2. UHP supplier sync
3. Kadac supplier sync
4. GlobalNature supplier sync
5. BigCommerce price updates

---

### Business #2: Teelixir/Elevate/Kikai

**Platform:** Shopify + Unleashed
**Store:** teelixir.com.au
**Operations:** B2C e-commerce + B2B distribution + Manufacturing

**Business Names (All Same Entity):**
- **Teelixir** - Consumer brand (Shopify)
- **Elevate** - Company name
- **Kikai** - Distribution/fulfillment
- **KIK** - Code prefix

**Database Tables (6 tables):**
- `kik_products` - Unleashed product catalog
- `kik_products_stock` - Stock levels
- `kik_improved_ai_score` - AI descriptions
- `teelixir_stock_on_hand` - Teelixir inventory
- `shopify_orders` - Shopify order data
- `klaviyo_profiles` - Email subscribers (36,938) ✅ CONFIRMED

**Integrations:**
- Shopify API (teelixir.com.au)
- Unleashed Software (2 accounts: KIK + Teelixir)
- Klaviyo email marketing
- SendGrid transactional email
- Xero accounting

**n8n Workflows Required:** 5
6. Shopify order sync
7. Unleashed product sync (2 accounts)
8. Unleashed stock sync
9. Sales invoice reporting
10. Bill of Materials analysis

---

### Business #3: Red Hill

**Status:** SEPARATE BUSINESS (confirmed by user)
**Current State:** No references found in downloaded source code

**Possible Scenarios:**
1. **Future/Not Yet Launched** - Planned but not implemented
2. **Separate Codebase** - Not on EC2 #2, different infrastructure
3. **Legacy/Decommissioned** - Former business no longer active
4. **Different Name in Code** - Uses different technical naming

**Action Required:** User to clarify Red Hill status and requirements

---

## 🗄️ SUPABASE PROJECT ARCHITECTURE

### Supabase Project #1: Buy Organics Online

**Project Name:** `buy-organics-online`

**Plan:** Pro ($25/month)

**Tables to Migrate (11 tables):**
```sql
-- Supplier feeds
oborne_products
uhp_products
kadac_products
globalnature_products

-- BigCommerce data
bc_products (11,357 rows)
bc_orders (157,126 rows)
bc_categories
bc_brands

-- Supporting tables
oborne_stocks
bc_ai_score
bc_improved_ai_score
```

**Estimated Storage:** ~500MB

**Connections Required:**
- n8n workflows (5)
- BigCommerce API webhook (optional)

---

### Supabase Project #2: Teelixir/Elevate

**Project Name:** `teelixir-elevate`

**Plan:** Pro ($25/month)

**Tables to Migrate (6 tables):**
```sql
-- Unleashed/KIK data
kik_products
kik_products_stock
kik_improved_ai_score
teelixir_stock_on_hand

-- Shopify data
shopify_orders

-- Email marketing
klaviyo_profiles (36,938 rows)
```

**Estimated Storage:** ~200MB

**Connections Required:**
- n8n workflows (5)
- Shopify webhook (optional)
- Unleashed API (2 accounts)
- Klaviyo API
- SendGrid API
- Xero API

---

### Supabase Project #3: Red Hill

**Project Name:** `red-hill` (TBD)

**Plan:** TBD based on requirements

**Tables to Migrate:** Unknown - awaiting user clarification

**Status:** ⏳ PENDING USER INPUT

---

## 💰 COST ANALYSIS

### Current AWS Costs (Monthly)

```
EC2 #1 (13.55.46.130 - Legacy)     $34
EC2 #2 (13.55.157.71 - Active)     $40
RDS Multi-AZ (newsync6)             $70
S3 (fyic-log)                       $1
CloudWatch                          $2
Data Transfer                       $10
─────────────────────────────────────────
TOTAL                               $157/month
```

**Annual:** $1,884

---

### Target Infrastructure Costs (Monthly)

**Supabase:**
```
Project #1: Buy Organics Online     $25
Project #2: Teelixir/Elevate        $25
Project #3: Red Hill (if needed)    $25 (optional)
─────────────────────────────────────────
TOTAL                               $50-75/month
```

**n8n:**
```
Cloud Plan (single instance)        $20/month
  OR
Self-hosted (DigitalOcean)          $12/month
─────────────────────────────────────────
RECOMMENDED                         $20/month
```

**Grand Total:** $70-95/month

**Annual:** $840-1,140

---

### Savings Calculation

**Without Red Hill:**
- Current: $157/month ($1,884/year)
- Target: $70/month ($840/year)
- **Savings: $87/month ($1,044/year) ✅**

**With Red Hill:**
- Current: $157/month ($1,884/year)
- Target: $95/month ($1,140/year)
- **Savings: $62/month ($744/year) ✅**

**ROI:** 3-4 months (migration time investment paid back)

---

## 📋 MIGRATION PHASES

### Phase 1: Infrastructure Setup (3-5 days)

**Week 1: Days 1-2**
1. Create Supabase Project #1: `buy-organics-online`
2. Create Supabase Project #2: `teelixir-elevate`
3. Create Supabase Project #3: `red-hill` (if confirmed)
4. Set up n8n Cloud account OR DigitalOcean droplet
5. Configure initial connections

**Deliverables:**
- 2-3 Supabase projects created
- n8n instance running
- Database connection strings documented

---

### Phase 2: Database Migration (2-3 days)

**Week 1: Days 3-5**

**Step 1: Export from RDS**
```bash
# Buy Organics Online tables
pg_dump \
  -h newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com \
  -U admin \
  -d new_fyic_db \
  --table=oborne_products \
  --table=uhp_products \
  --table=kadac_products \
  --table=globalnature_products \
  --table=bc_products \
  --table=bc_orders \
  --table=bc_categories \
  --table=bc_brands \
  --table=oborne_stocks \
  --table=bc_ai_score \
  --table=bc_improved_ai_score \
  > boo-export.sql

# Teelixir/Elevate tables
pg_dump \
  -h newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com \
  -U admin \
  -d new_fyic_db \
  --table=kik_products \
  --table=kik_products_stock \
  --table=kik_improved_ai_score \
  --table=teelixir_stock_on_hand \
  --table=shopify_orders \
  --table=klaviyo_profiles \
  > teelixir-export.sql
```

**Step 2: Import to Supabase**
```bash
# Import to Buy Organics Online project
psql \
  -h [supabase-boo-host] \
  -U postgres \
  -d postgres \
  < boo-export.sql

# Import to Teelixir/Elevate project
psql \
  -h [supabase-teelixir-host] \
  -U postgres \
  -d postgres \
  < teelixir-export.sql
```

**Step 3: Verify Data Integrity**
```sql
-- Check row counts match
SELECT COUNT(*) FROM bc_products;    -- Should be 11,357
SELECT COUNT(*) FROM bc_orders;      -- Should be 157,126
SELECT COUNT(*) FROM klaviyo_profiles; -- Should be 36,938
```

**Deliverables:**
- All tables migrated to correct Supabase projects
- Row counts verified
- Indexes recreated
- Foreign keys restored

---

### Phase 3: Build n8n Workflows (3-4 weeks)

**Week 2: Buy Organics Online Workflows**

**Workflow #1: Oborne Supplier Sync (2 days)**
```
Schedule: Every 2 hours
├─ FTP: Connect to ftp3.ch2.net.au
├─ Download: inventory.csv + products.csv
├─ Parse: Pipe-delimited CSV
├─ Transform: Map to schema
├─ Supabase: Truncate oborne_products
└─ Supabase: Batch insert (50 rows)
```

**Workflow #2: UHP Supplier Sync (1 day)**
```
Schedule: Every 2 hours
├─ HTTP: Download uhp_products_export.xlsx
├─ Excel to CSV: Convert format
├─ Parse: CSV with 34 fields
├─ Transform: Map to schema
├─ Supabase: Truncate uhp_products
└─ Supabase: Batch insert (50 rows)
```

**Workflow #3: Kadac Supplier Sync (1 day)**
```
Schedule: Every 2 hours
├─ HTTP: GET Kadac API (with UID)
├─ Parse: CSV response
├─ Transform: Map to schema
├─ Supabase: Truncate kadac_products
└─ Supabase: Batch insert (50 rows)
```

**Workflow #4: GlobalNature Supplier Sync (2 days)**
```
Schedule: Every 2 hours at :45
├─ IMAP: Connect to Gmail
├─ Search: Emails from yiyi.lu@globalbynature.com.au (since yesterday)
├─ Download: Excel attachments
├─ Excel to CSV: Convert format
├─ Parse: CSV data
├─ Transform: Map to schema
├─ Supabase: Truncate globalnature_products
└─ Supabase: Batch insert (50 rows)
```

**Workflow #5: BigCommerce Price Updates (2 days)**
```
Schedule: After supplier syncs complete
├─ Supabase: JOIN all supplier tables
├─ Calculate: Apply 3 pricing formulas
│   ├─ Formula 1: Carton (price = moq × rrp)
│   ├─ Formula 2: Markup (price = 1.4 × cost)
│   └─ Formula 3: Discount (sale = rrp - (rrp × perc/100))
├─ Transform: Prepare BigCommerce format
└─ BigCommerce API: Batch update (10 products)
```

---

**Week 3-4: Teelixir/Elevate Workflows**

**Workflow #6: Shopify Order Sync (2 days)**
```
Schedule: Daily at 5am
├─ File: Read last order ID (since_id)
├─ Shopify API: GET /orders (250 per page)
├─ Loop: Paginate until no more orders
│   ├─ Shopify API: GET product details (cache)
│   ├─ Transform: Parse line items
│   └─ Supabase: Upsert shopify_orders (50 per batch)
├─ File: Save last order ID
└─ File: Save product cache
```

**Workflow #7: Unleashed Product Sync (2 days)**
```
Schedule: Manual/On-demand
├─ Switch: KIK or Teelixir account
├─ Unleashed API: GET /Products (200 per page)
│   ├─ Headers: api-auth-id + signature
│   └─ Loop: Paginate all pages
├─ Transform: Map to schema (26 fields)
├─ Supabase: Truncate kik_products
└─ Supabase: Batch insert (50 rows)
```

**Workflow #8: Unleashed Stock Sync (1 day)**
```
Schedule: Manual/On-demand
├─ Switch: KIK or Teelixir account
├─ Unleashed API: GET /StockOnHand (200 per page)
├─ Transform: Map to schema
└─ Supabase: UPDATE kik_products (stock fields)
    OR
    Supabase: Upsert kik_products_stock
    OR
    Supabase: Upsert teelixir_stock_on_hand
```

**Workflow #9: Sales Invoice Reporting (2 days)**
```
Schedule: Daily 6am (Teelixir), 6:15am (KIK)
├─ Switch: Teelixir or KIK account
├─ Unleashed API: GET /Invoices (200 per page)
├─ Loop: Paginate all invoices
├─ Transform: Generate sales report
│   ├─ Group by: Product SKU
│   ├─ Sum: Quantities + Revenue
│   └─ Format: Excel/CSV
├─ SendGrid: Email report
└─ File: Save report archive
```

**Workflow #10: Bill of Materials Analysis (2 days)**
```
Schedule: Manual/On-demand
├─ Unleashed API: GET /BillOfMaterials
├─ Unleashed API: GET /StockOnHand
├─ Transform: Calculate stock needs
│   ├─ Components required
│   ├─ Available stock
│   └─ Shortage analysis
├─ Generate: Excel reports
│   ├─ Stock analysis
│   ├─ Stock on hand
│   └─ Stock needs forecast
└─ File: Save reports
```

---

### Phase 4: Testing & Validation (5-7 days)

**Week 5: Parallel Run**

**Day 1-3: Dual Operation**
```
├─ EC2 system continues running
├─ n8n workflows run in parallel
└─ Compare outputs hourly
```

**Validation Checklist:**
- [ ] Supplier feed data matches (row-by-row comparison)
- [ ] Pricing calculations identical
- [ ] BigCommerce updates successful
- [ ] Shopify orders syncing correctly
- [ ] Unleashed data accurate
- [ ] No data loss or corruption
- [ ] Performance acceptable (<2min per workflow)
- [ ] Error handling works (test FTP failure, API errors)

**Day 4-5: Edge Case Testing**
```
Test Scenarios:
├─ FTP connection failure
├─ Email attachment missing
├─ API rate limiting
├─ Duplicate products
├─ Invalid pricing data
├─ Partial feed downloads
└─ Network interruptions
```

**Day 6-7: User Acceptance Testing**
```
├─ Admin reviews data accuracy
├─ Test BigCommerce price updates live
├─ Verify Shopify orders processing
└─ Check sales reports accuracy
```

---

### Phase 5: Cutover (1 day)

**Cutover Day Schedule:**

**8:00 AM - Final Sync**
```
1. Run all EC2 sync jobs one last time
2. Verify all data current in RDS
3. Export latest data from RDS
4. Import to Supabase (final update)
5. Verify row counts match exactly
```

**10:00 AM - Switch to n8n**
```
1. Disable all EC2 CRON jobs
2. Enable all n8n workflows
3. Monitor first runs in real-time
4. Verify data flowing correctly
```

**12:00 PM - Verification**
```
1. Check supplier syncs completed
2. Verify BigCommerce prices updated
3. Confirm Shopify orders syncing
4. Test all n8n workflows manually
```

**2:00 PM - Monitoring Period**
```
1. Watch for errors/failures
2. Monitor n8n execution logs
3. Check Supabase query performance
4. Verify data integrity
```

**5:00 PM - Go/No-Go Decision**
```
IF all systems operational:
  ├─ Declare migration successful
  ├─ Stop EC2 instances (keep for 1 week)
  └─ Monitor for 48 hours
ELSE:
  ├─ Rollback to EC2
  ├─ Investigate issues
  └─ Reschedule cutover
```

---

### Phase 6: Decommission (1 week later)

**Day 1-7: Monitoring**
```
Monitor n8n workflows:
├─ All syncs successful?
├─ Data accuracy maintained?
├─ Performance acceptable?
└─ No business disruption?
```

**After 7 Days Success:**
```
1. Take final RDS snapshot
2. Stop EC2 #1 (13.55.46.130)
3. Stop EC2 #2 (13.55.157.71)
4. Snapshot RDS newsync6
5. Keep snapshots for 30 days
6. Delete EC2 instances after 30 days
7. Delete RDS after 60 days
```

**Cost Savings Begin:** Immediately after EC2/RDS stopped

---

## 🔐 CREDENTIALS SUMMARY

### Supabase Project #1: Buy Organics Online

**Database Connection:**
```
Host: [supabase-boo-host].supabase.co
Database: postgres
User: postgres
Password: [generated-by-supabase]
Port: 5432
```

**API Keys:**
- Anon Key: [for n8n workflows]
- Service Role Key: [for admin operations]

---

### Supabase Project #2: Teelixir/Elevate

**Database Connection:**
```
Host: [supabase-teelixir-host].supabase.co
Database: postgres
User: postgres
Password: [generated-by-supabase]
Port: 5432
```

**API Keys:**
- Anon Key: [for n8n workflows]
- Service Role Key: [for admin operations]

---

### n8n Cloud/Self-Hosted

**Connections Required:**

**Buy Organics Online:**
- FTP: ftp3.ch2.net.au (retail_310 / am2SH6wWevAY&#+Q)
- IMAP: kylie@buyorganicsonline.com.au (mLmZAWeeex2N%Q4m)
- HTTP: UHP feed URL
- HTTP: Kadac API (UID: d83f42d2f1224d94856ea35c4323a94d)
- BigCommerce API: [credentials in .env]
- Supabase: [project #1 connection string]

**Teelixir/Elevate:**
- Shopify API: teelixir.com.au (configured in .env)
- Unleashed API KIK: configured in .env (ELEVATE_UNLEASHED_API_ID)
- Unleashed API Teelixir: configured in .env (TEELIXIR_UNLEASHED_API_ID)
- Klaviyo API: configured in .env (KLAVIYO_API_KEY)
- SendGrid API: configured in .env (SENDGRID_API_KEY)
- Supabase: [project #2 connection string]

---

## 📊 DATA VOLUME ANALYSIS

### Buy Organics Online

**Total Rows:** ~168,500
```
bc_products:           11,357
bc_orders:            157,126
oborne_products:        8,570
uhp_products:           4,501
kadac_products:           945
globalnature_products:     50 (estimated)
bc_categories:            100 (estimated)
bc_brands:                 50 (estimated)
oborne_stocks:          5,000 (historical)
bc_ai_score:           11,000 (estimated)
bc_improved_ai_score:  11,000 (estimated)
```

**Storage Estimate:** 500MB

**Growth Rate:** ~500 orders/month

---

### Teelixir/Elevate

**Total Rows:** ~40,000
```
klaviyo_profiles:      36,938
shopify_orders:         2,000 (estimated)
kik_products:           1,000 (estimated)
kik_products_stock:     1,000 (estimated)
teelixir_stock_on_hand:  500 (estimated)
kik_improved_ai_score:   500 (estimated)
```

**Storage Estimate:** 200MB

**Growth Rate:** ~100 orders/month

---

## 🚨 RISK ASSESSMENT

### Low Risk ✅

**Database Split During Migration**
- No pre-migration database changes
- Clean separation by table
- Each business gets isolated project
- Easy rollback if needed

**n8n Workflow Reliability**
- Visual workflow builder (easy to debug)
- Built-in error handling
- Retry mechanisms
- Extensive logging

**Supabase Stability**
- Enterprise-grade PostgreSQL
- Automatic backups
- 99.9% uptime SLA
- Real-time monitoring

---

### Medium Risk 🔶

**Learning Curve**
- Team needs to learn n8n (visual, user-friendly)
- Supabase admin panel (similar to RDS)
- New monitoring tools

**Mitigation:**
- Comprehensive documentation
- Training sessions
- Support contracts available

---

### High Risk ❌

**None Identified**

---

## ✅ SUCCESS CRITERIA

### Migration Success

**Data Integrity:**
- [ ] All tables migrated with 100% row counts
- [ ] No data corruption or loss
- [ ] All relationships preserved
- [ ] Indexes recreated

**Workflow Functionality:**
- [ ] All 10 n8n workflows running successfully
- [ ] Supplier syncs completing on schedule
- [ ] Price updates reflecting correctly
- [ ] Orders syncing from Shopify
- [ ] Sales reports generating accurately

**Performance:**
- [ ] Workflow execution < 2 minutes (supplier syncs)
- [ ] Database queries < 500ms (average)
- [ ] No downtime for end users
- [ ] API rate limits not exceeded

**Business Operations:**
- [ ] No orders missed or lost
- [ ] Pricing updates timely and accurate
- [ ] Inventory syncing correctly
- [ ] Email reports delivering on time
- [ ] No customer-facing issues

---

## 📞 DECISION POINTS

### Before Starting

**Q1: Red Hill Business**
- What is Red Hill?
- Is migration needed?
- Same Supabase project as Teelixir or separate?

**Q2: n8n Hosting**
- Cloud ($20/month) - Recommended for simplicity
- Self-hosted ($12/month) - More control, requires maintenance

**Q3: Migration Timeline**
- Fast track: 4 weeks (aggressive)
- Standard: 5 weeks (recommended)
- Conservative: 6.5 weeks (with buffer)

**Q4: Parallel Run Duration**
- Minimum: 48 hours
- Recommended: 5 days
- Conservative: 7 days

---

### During Migration

**Q5: Rollback Threshold**
- What % of errors trigger rollback?
- Who makes go/no-go decision?
- Rollback procedure testing?

**Q6: Monitoring & Alerts**
- Email alerts for workflow failures?
- Slack/Discord integration?
- On-call rotation?

---

## 📁 DELIVERABLES

### Documentation

1. ✅ **MULTI-BUSINESS-MIGRATION-ARCHITECTURE.md** (this document)
2. ⏳ **SUPABASE-SETUP-GUIDE.md** (to be created)
3. ⏳ **N8N-WORKFLOW-TEMPLATES.md** (to be created)
4. ⏳ **TESTING-CHECKLIST.md** (to be created)
5. ⏳ **CUTOVER-RUNBOOK.md** (to be created)
6. ⏳ **ROLLBACK-PROCEDURE.md** (to be created)

### Infrastructure

1. Supabase Project #1: Buy Organics Online
2. Supabase Project #2: Teelixir/Elevate
3. Supabase Project #3: Red Hill (if confirmed)
4. n8n Cloud account OR self-hosted instance

### Workflows

1. n8n workflow exports (JSON) for all 10+ workflows
2. Workflow documentation with screenshots
3. Credential management guide
4. Monitoring & alerting setup

---

## 🎯 NEXT STEPS

### Immediate Actions

1. **User to confirm:**
   - Red Hill business details
   - Migration timeline preference
   - n8n hosting preference (Cloud vs Self-hosted)

2. **Create Supabase accounts:**
   - Set up Project #1: Buy Organics Online
   - Set up Project #2: Teelixir/Elevate
   - Document connection strings

3. **Set up n8n:**
   - Create Cloud account OR provision DigitalOcean droplet
   - Install n8n (if self-hosted)
   - Configure initial credentials

4. **Export RDS schema:**
   - Document all table structures
   - Map to Supabase projects
   - Plan migration scripts

### Week 1 Tasks

1. Infrastructure setup (Supabase + n8n)
2. Database schema migration
3. Data export and import
4. Verification and validation

### Week 2-4 Tasks

1. Build all 10 n8n workflows
2. Test each workflow individually
3. Integration testing
4. Performance optimization

### Week 5 Tasks

1. Parallel run (EC2 + n8n)
2. Data validation
3. Edge case testing
4. User acceptance testing

### Week 6 Tasks

1. Final preparation
2. Cutover execution
3. Monitoring period
4. Success verification

---

## 💬 OPEN QUESTIONS

### Red Hill Business

1. What is Red Hill?
2. Is it active or future/legacy?
3. Does it need Supabase migration?
4. Shared with Teelixir or separate project?
5. Any database tables we haven't seen?

### Klaviyo (RESOLVED ✅)

- ✅ Belongs to Teelixir/Elevate
- ✅ 36,938 subscribers
- ✅ Joins with shopify_orders
- ✅ No BigCommerce integration
- ✅ Goes to Supabase Project #2

---

**Last Updated:** 2025-11-23 02:00 UTC
**Analyzed By:** Claude (Sonnet 4.5)
**Status:** ✅ ARCHITECTURE COMPLETE - Awaiting Red Hill clarification
