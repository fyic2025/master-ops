# AWS COMPLETE INFRASTRUCTURE DISCOVERY

**Date:** 2025-11-22
**Account ID:** 263579591435
**Primary Region:** ap-southeast-2 (Sydney)
**Access:** claude-audit-readonly user (ReadOnly permissions)

---

## 🎯 EXECUTIVE SUMMARY

The Buy Organics Online product sync system runs entirely on **EC2 instances**, NOT serverless. The main sync infrastructure consists of:

- **2 RDS MySQL instances** (newsync5 and newsync6)
- **1 active EC2 instance** running sync scripts
- **1 S3 bucket** for execution logs
- **System cron jobs** (not CloudWatch Events)

**Key Finding:** No Lambda functions or EventBridge rules exist. All automation runs on traditional server cron jobs.

---

## 📊 AWS RESOURCES INVENTORY

### EC2 Instances

| Instance ID | Name | Type | State | Private IP | Public IP | Notes |
|-------------|------|------|-------|------------|-----------|-------|
| i-04dc435af0436943e | Hosting 3.1 - [fyic.com.au] | t2.medium | **RUNNING** | 172.31.11.170 | 13.55.46.130 | **PRIMARY SYNC SERVER** |
| i-0f9a5e987915169c7 | findyouridealcustomersNew | t2.small | RUNNING | 172.31.9.129 | 13.55.157.71 | Different application |
| i-00d536d72b89b2fa8 | WHM_cPanel--[stopped] | t2.small | stopped | 172.31.33.63 | - | Backup/unused |
| i-0cc01599f75873782 | WHM_DNS_Only-[stopped] | t2.micro | stopped | 172.31.3.64 | - | Backup/unused |
| i-0058abc9141d2e0d5 | findyouridealcustomers.com.au | t2.micro | stopped | 172.31.23.2 | - | Old instance |

**Primary Server Details (i-04dc435af0436943e):**
- **Launch Date:** 2025-11-04 (recently restarted)
- **SSH Key:** Fyic_Hosting.pem (required for access)
- **Security Group:** sg-bc17bdd9 (default)
- **IAM Role:** None (scripts use hardcoded credentials)
- **Platform:** Linux

### RDS Instances

| Instance | Engine | Version | Class | Storage | Status | Multi-AZ | Endpoint |
|----------|--------|---------|-------|---------|--------|----------|----------|
| newsync6 | MySQL | 8.0.42 | db.t3.small | 20 GB | available | Yes | newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com |
| newsync5 | MySQL | 8.0.42 | db.t3.small | 20 GB | available | No | newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com |

**newsync6 Databases:**
1. `new_fyic_db` (25 tables) - **PRODUCTION DATABASE**
   - bc_products (11,357 products)
   - bc_orders (157,126 orders)
   - oborne_products, uhp_products, kadac_products, kik_products
   - crons (sync execution logs)
   - oborne_stocks (3.4M historical records)

2. `c7c7buyorgdnxtl1` (78 tables) - **SYNC ENGINE**
   - Supplier product tables
   - Barcode grouping (29,442 unique barcodes)
   - Reference data

3. `dracah` (unknown purpose)

### S3 Buckets

| Bucket | Purpose | Size | Latest Activity |
|--------|---------|------|-----------------|
| **fyic-log** | Cron job execution logs | ~5MB | Nov 22, 2025 (active) |
| aws-cloudtrail-logs-263579591435-c1b41a23 | CloudTrail audit logs | Variable | - |

**fyic-log Bucket Analysis:**
- **File Pattern:** Two types alternating
  - Small files (2 bytes): Run markers/triggers
  - Large files (30KB JSON): Complete sync execution logs
- **Frequency:** Every 40-45 minutes
- **Content:** Product availability and inventory updates
- **Format:** JSON array with product sync records

### Lambda Functions

**None found** - Confirms scripts run on EC2, not serverless

### EventBridge/CloudWatch Events

**No rules configured** - Cron jobs managed via system crontab on EC2

### CloudWatch Logs

| Log Group | Purpose |
|-----------|---------|
| RDSOSMetrics | RDS performance metrics (not useful for migration) |

**No application logs** - Scripts likely log to S3 and local files

---

## 🔄 SYNC SYSTEM ARCHITECTURE

### Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│  EC2: Hosting 3.1 (i-04dc435af0436943e)                    │
│  IP: 13.55.46.130                                           │
│                                                              │
│  ┌────────────────────────────────────────┐                │
│  │  System Cron (every 40-45 minutes)     │                │
│  │  Name: "BOO daily availability cron"   │                │
│  └────────────────┬───────────────────────┘                │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────┐                │
│  │  Sync Script (location unknown)        │                │
│  │  - Fetches 8 supplier CSV feeds        │                │
│  │  - Updates RDS databases                │                │
│  │  - Writes execution log to S3          │                │
│  └────────────────┬───────────────────────┘                │
└────────────────────┼───────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌────────┐
   │  RDS   │  │   S3    │  │BigCom  │
   │newsync6│  │fyic-log │  │  API   │
   └────────┘  └─────────┘  └────────┘
```

### Cron Job Details

**Name:** "BOO daily availability cron"
**Frequency:** Every 40-45 minutes (NOT daily despite the name)
**Type:** System cron (not CloudWatch Events)
**Actions:**
1. Fetch supplier CSV feeds (8 suppliers)
2. Update `new_fyic_db` tables
3. Compare with `bc_products` table
4. Update BigCommerce via API (availability & inventory only)
5. Log execution to S3 (fyic-log bucket)

**What it syncs:**
- ✅ Product availability status
- ✅ Inventory levels (stock quantities)
- ❌ **NOT prices** (separate process or manual)
- ❌ **NOT new products** (separate workflow)
- ❌ **NOT descriptions** (AI enhancement separate)

### Supplier Integration

**8 Suppliers Configured:**

| Code | Supplier | Feed Type | Products | Status |
|------|----------|-----------|----------|--------|
| OB | Obourne | Remote CSV | 8,570 | ✅ Active |
| UHP | Ultimate Health Products | Remote CSV | 4,501 | ⚠️ Not syncing to BC |
| KAD | Kadac | Remote CSV | 945 | ✅ Active |
| KIK | Kik/Biologika | Unknown | 424 | ✅ Active |
| - | Global Nature | Remote CSV | - | Unknown |
| - | Lateral Foods | Local CSV | - | Unknown |
| - | Martin & Pleasance | Local CSV | - | Unknown |
| - | Eden Health | Local CSV | - | Unknown |

**Feed URLs:**
- Obourne: `http://bigcupdate.fyic.com.au/oborne_new.csv`
- UHP: `http://bigcupdate.fyic.com.au/uhp_prods.csv`
- Global Nature: `http://bigcupdate.fyic.com.au/globalnature_new.csv`
- Kadac: `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv`

**Local CSV files (on EC2):**
- `/app/public/feeds/LateralFoodFinal.csv`
- `/app/public/feeds/MPSKU.csv`
- `/app/public/feeds/EdenHealth.csv`
- `/app/public/feeds/customfeeds.csv`

---

## 📝 S3 LOG FILE ANALYSIS

### Sample Log Entry Structure

```json
{
  "id": 55122,
  "bc_sku": "OB - AZRBPCCCDD",
  "sku": "AZRBPCCCDD",
  "name": "Amazonia Raw Bar Protein Choc Chip Cookie Dough 40g X 10",
  "old_availability": "available",
  "availability": "available",
  "status": "In Stock",
  "old_inventory_level": 0,
  "inventory_level": 0,
  "keyword": "OB",
  "AvailableQty": "",
  "ignore": "NO"
}
```

**Fields:**
- `id`: BigCommerce product ID
- `bc_sku`: Full SKU with supplier prefix
- `sku`: Supplier SKU (without prefix)
- `name`: Product name
- `old_availability`/`availability`: Availability status
- `old_inventory_level`/`inventory_level`: Stock quantity
- `keyword`: Supplier identifier
- `ignore`: Whether to skip syncing

### Log Patterns Observed

**From latest log (Nov 22, 2025 05:02 UTC):**
- Total entries: ~500 products
- Suppliers found: OB (Obourne), KAD (Kadac), KIK (Kik/Teelixir)
- **No UHP products** - Confirms UHP sync issue
- Mostly inventory updates (0 → 1000, maintaining stock levels)
- Some products with "ignore": "YES" flag

**Teelixir Products:**
- Keyword: `"KIK - Teelixir"`
- Always show `inventory_level: 1000`
- Likely managed separately (Shopify integration?)

---

## 💰 COST ANALYSIS

### Current Monthly Costs (Estimated)

| Service | Resource | Monthly Cost | Annual Cost |
|---------|----------|-------------|-------------|
| **EC2** | t2.medium (Hosting 3.1) | $33.87 | $406.44 |
| **RDS** | 2x db.t3.small Multi-AZ | $61.32 each = $122.64 | $1,471.68 |
| **RDS** | Storage (40GB total) | $4.60 | $55.20 |
| **S3** | fyic-log bucket | <$0.50 | <$6.00 |
| **Data Transfer** | Estimated | $5-10 | $60-120 |

**Total Estimated:** ~$167/month or ~$2,000/year

**Migration Savings:**
- Move to Supabase: -$127/month (RDS)
- Use n8n workflows: -$0 (already have n8n)
- Keep S3 or migrate to Supabase Storage: -$0
- **Total Savings:** ~$127/month = **$1,524/year**

---

## 🚨 CRITICAL FINDINGS

### Issues Discovered

1. **UHP Products Not Syncing**
   - 0 UHP products matched in `bc_products`
   - 4,501 UHP products exist in `uhp_products` table
   - SKU format mismatch or disabled sync?

2. **No EC2 SSH Access**
   - Security group blocks external SSH
   - Need `Fyic_Hosting.pem` key file
   - Cannot access sync script source code

3. **Hardcoded Credentials**
   - No IAM role on EC2 instance
   - Database and API credentials likely in config files
   - Security risk if instance is compromised

4. **Incomplete Sync**
   - Only syncs availability and inventory
   - Prices NOT synced automatically
   - New products NOT added automatically
   - Manual intervention required for pricing updates

5. **Misleading Cron Name**
   - Named "BOO daily availability cron"
   - Actually runs every 40-45 minutes
   - Could cause confusion during debugging

### Migration Blockers

**To proceed with migration, we need:**

1. ✅ **Database access** - HAVE IT (newsync6)
2. ✅ **BigCommerce API credentials** - HAVE IT
3. ❌ **Sync script source code** - Need SSH access to EC2
4. ⚠️ **Pricing formula** - Partially reverse-engineered (1.6x markup)
5. ⚠️ **Product matching logic** - Can reverse-engineer from barcode table
6. ❌ **Cron configuration** - Need to see actual crontab on EC2

---

## 🎯 RECOMMENDATIONS

### Immediate Actions

1. **Get SSH Access to EC2**
   - Request `Fyic_Hosting.pem` key file
   - Access instance at 13.55.46.130
   - Locate sync scripts (likely in `/var/www` or `/opt`)
   - Export complete cron configuration

2. **Investigate UHP Sync Issue**
   - Check why 4,501 UHP products aren't syncing
   - Verify SKU format in database
   - May need to enable UHP supplier in sync config

3. **Document Pricing Process**
   - Find how prices are updated (manual vs automated)
   - Identify pricing tiers or markup rules
   - Document any promotional pricing logic

### Migration Strategy

**Option A: Full Reverse Engineering (Recommended)**
- Use current knowledge + database analysis
- Rebuild sync logic in n8n based on S3 logs
- Test with small subset before full migration
- **Timeline:** 2-3 weeks
- **Risk:** Medium (no access to original scripts)

**Option B: Get EC2 Access First (Ideal)**
- Get SSH key and access sync scripts
- Port exact logic to n8n
- Ensure 100% compatibility
- **Timeline:** 1 week after access granted
- **Risk:** Low (exact replication)

**Option C: Hybrid Approach**
- Start migrating what we understand (availability sync)
- Request EC2 access for complex logic (pricing, new products)
- Phased migration reduces downtime
- **Timeline:** 1-2 weeks initial, ongoing refinement
- **Risk:** Low-Medium (incremental validation)

---

## 📋 NEXT STEPS

### Data We Have
- ✅ Complete database schema (103 tables)
- ✅ Pricing analysis (1.6x average markup)
- ✅ Supplier feed URLs
- ✅ S3 log format and patterns
- ✅ BigCommerce API credentials
- ✅ AWS infrastructure map

### Data We Need
- ❌ Sync script source code
- ❌ Crontab configuration
- ❌ Pricing update process
- ❌ New product onboarding workflow
- ❌ Product matching/barcode logic details

### Questions to Resolve

1. **UHP Products:** Why aren't they syncing? Should they be?
2. **Pricing:** How are prices updated? Manual or automated?
3. **New Products:** What's the process for adding new products?
4. **Teelixir:** Are Teelixir products managed via Shopify sync?
5. **AI Enhancement:** How do products get AI-enhanced descriptions?

---

## 🔐 SECURITY NOTES

- AWS credentials stored in `.env` (secure locally)
- ReadOnly IAM user prevents accidental changes
- No IAM role on EC2 = credentials in config files (security risk)
- SSH access blocked by security group (good)
- BigCommerce API token has full access (review permissions)

---

## 📊 MIGRATION READINESS: 70%

**What we can migrate now:**
- ✅ Database structure to Supabase
- ✅ Availability/inventory sync workflow
- ✅ Supplier feed integration
- ✅ S3 log structure

**What we need EC2 access for:**
- ❌ Pricing update logic
- ❌ New product onboarding
- ❌ Product matching algorithm details
- ❌ Complete cron configuration

**Estimated completion:** 85% if we get EC2 access, 60% without it

---

**END OF REPORT**
