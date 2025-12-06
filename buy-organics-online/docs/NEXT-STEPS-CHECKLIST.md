# Next Steps Checklist
## Buy Organics Online: AWS → Supabase Migration

**Created:** November 24, 2025
**Status:** Ready to Begin Implementation
**Migration Readiness:** 85%

---

## Quick Start: Immediate Actions

🚨 **Before anything else, complete these 4 critical tasks:**

1. [ ] SSH to production server (`dev.growthcohq.com` / `170.64.223.141`)
2. [ ] Locate and extract `.env` file contents
3. [ ] Verify which system is actively running (PHP vs Node.js)
4. [ ] Compare local MySQL vs RDS databases

**Estimated Time:** 2-4 hours
**Blocker Status:** These MUST be completed before migration can proceed

---

## Migration Timeline Options

### Option A: Quick Migration (3-4 weeks)

**Best for:** Moving fast, accepting some unknowns
- Week 1: Critical investigation + Supabase setup
- Week 2: Core supplier workflows in n8n
- Week 3: Testing + parallel run
- Week 4: Cutover + monitoring

**Risk Level:** Medium
**Confidence:** 80%

### Option B: Thorough Migration (6-8 weeks)

**Best for:** Complete understanding, minimal risk
- Weeks 1-2: Complete investigation + documentation
- Weeks 3-4: All workflows + advanced features
- Weeks 5-6: Comprehensive testing
- Week 7: Cutover
- Week 8: Optimization + decommission

**Risk Level:** Low
**Confidence:** 95%

---

## Priority 1: Critical Investigation (Days 1-3)

### Task 1.1: Server Access & Process Verification

**Objective:** Identify active system and deployment method

**Commands to Run:**

```bash
# Connect to production server
ssh user@dev.growthcohq.com
# OR
ssh user@170.64.223.141

# Check for Node.js processes
ps aux | grep node
ps aux | grep fyic

# Check for PHP processes
ps aux | grep php

# List all running services
systemctl list-units --type=service | grep -E 'fyic|bigcommerce|sync'

# Check PM2 (common Node.js process manager)
pm2 list
pm2 logs

# Check Docker containers
docker ps

# Check cron jobs
crontab -l
sudo crontab -l

# Check systemd services
systemctl status fyic-portal
systemctl status bigcommerce-sync
```

**What to Document:**
- [ ] Active process name and PID
- [ ] Process manager (PM2, systemd, Docker)
- [ ] Working directory
- [ ] Log file locations
- [ ] User account running the service

**Expected Outcome:** Confirm Node.js system is running, identify deployment method

**Time Estimate:** 1 hour

---

### Task 1.2: Environment Variables Extraction

**Objective:** Get all production configuration values

**Method 1: Find .env file**

```bash
# Search for .env files
find /var/www -name ".env" 2>/dev/null
find /home -name ".env" 2>/dev/null
find /opt -name ".env" 2>/dev/null

# Common locations to check
ls -la /var/www/fyic-portal/.env
ls -la /home/fyic/.env
ls -la /opt/fyic-portal/.env

# Read contents (if found)
cat /path/to/.env
```

**Method 2: Extract from running process**

```bash
# Get PID of Node.js process
PID=$(ps aux | grep "node.*fyic" | grep -v grep | awk '{print $2}')

# View environment variables
sudo cat /proc/$PID/environ | tr '\0' '\n' | grep -E 'DB_|AWS_|NODE_ENV'

# Alternative using ps
ps eww $PID | tr ' ' '\n' | grep -E 'DB_|AWS_|NODE_ENV'
```

**Method 3: Check systemd service**

```bash
# If running as systemd service
systemctl cat fyic-portal

# Look for EnvironmentFile= directive
grep EnvironmentFile /etc/systemd/system/fyic-portal.service
```

**Variables to Extract:**

```bash
# Database
DB_HOST=___________
DB_PORT=___________
DB_USER=___________
DB_PASSWORD=___________
DB_NAME=___________

# AWS
AWS_BUCKET_NAME=___________
AWS_BUCKET_REGION=___________
AWS_ACCESS_KEY=___________
AWS_SECRET_KEY=___________

# Environment
NODE_ENV=___________
PORT=___________
```

**Security Note:** Store credentials securely, do not commit to git

**Time Estimate:** 30 minutes

---

### Task 1.3: Database Comparison

**Objective:** Determine which database is source of truth

**Connect to Databases:**

```bash
# EC2 Local MySQL
mysql -u root -p c0bigc

# AWS RDS (from EC2 or local machine)
mysql -h newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com \
      -u admin -p new_fyic_db
```

**Comparison Queries:**

```sql
-- Run on BOTH databases, compare results

-- 1. Table counts
SELECT 'bc_products' as tbl, COUNT(*) as count FROM bc_products
UNION ALL
SELECT 'oborne_products', COUNT(*) FROM oborne_products
UNION ALL
SELECT 'kadac_products', COUNT(*) FROM kadac_products
UNION ALL
SELECT 'uhp_products', COUNT(*) FROM uhp_products
UNION ALL
SELECT 'globalnature_products', COUNT(*) FROM globalnature_products
UNION ALL
SELECT 'oborne_stocks', COUNT(*) FROM oborne_stocks;

-- 2. Recent activity
SELECT
  'bc_products' as table_name,
  MAX(date_modified) as last_modified,
  COUNT(*) as total_records
FROM bc_products;

SELECT
  'oborne_stocks' as table_name,
  MAX(date_time) as last_activity,
  COUNT(*) as total_records
FROM oborne_stocks;

-- 3. Check for oborne_stocks table (Node.js feature)
SHOW TABLES LIKE 'oborne_stocks';

-- 4. Check for AI tables (Node.js feature)
SHOW TABLES LIKE 'bc_ai_score';
SHOW TABLES LIKE 'bc_improved_ai_score';
```

**Decision Matrix:**

| Scenario | Interpretation | Action |
|----------|----------------|--------|
| RDS has more records | RDS is active | Use RDS as source |
| RDS has recent timestamps | RDS is updated | Use RDS as source |
| RDS has `oborne_stocks` table | Node.js writing to RDS | Use RDS as source |
| Local MySQL more current | PHP system active | Investigate why |
| Counts identical | Synchronized | Either works, prefer RDS |
| Local has no `oborne_stocks` | PHP only writes to local | RDS is production |

**Checklist:**
- [ ] Table count comparison documented
- [ ] Last modified timestamps recorded
- [ ] Feature tables identified (oborne_stocks, bc_ai_score)
- [ ] Source of truth determined
- [ ] Decision documented with reasoning

**Time Estimate:** 1 hour

---

### Task 1.4: API Credential Testing

**Objective:** Verify which BigCommerce credentials are active

**Test Script:**

```javascript
// test-bc-credentials.js
const BigCommerce = require('node-bigcommerce');

const credentials = [
  {
    name: 'Set 1 (PHP + Node.js Primary)',
    clientId: 'nvmcwck5yr15lob1q911z68d4r6erxy',
    accessToken: 'd9y2srla3treynpbtmp4f3u1bomdna2'
  },
  {
    name: 'Set 2 (Migration Docs)',
    clientId: '884idaio0t8l28wd84u06swrqnj619e',
    accessToken: 'ttf2mji7i912znhbue9gauvu7fbiiyo'
  }
];

async function testCredentials(cred) {
  console.log(`\nTesting: ${cred.name}`);
  console.log('='.repeat(50));

  const bc = new BigCommerce({
    clientId: cred.clientId,
    accessToken: cred.accessToken,
    storeHash: 'hhhi',
    responseType: 'json',
    apiVersion: 'v3'
  });

  try {
    // Test read permission
    const products = await bc.get('/catalog/products?limit=1');
    console.log('✓ READ permission: OK');
    console.log(`  - Products accessible: ${products.data.length}`);

    // Test write permission (no actual change)
    if (products.data.length > 0) {
      const productId = products.data[0].id;
      const testUpdate = await bc.put(`/catalog/products/${productId}`, {
        name: products.data[0].name // Same value, no change
      });
      console.log('✓ WRITE permission: OK');
    }

    // Test rate limit info
    console.log('✓ Credentials VALID and ACTIVE');
    return true;

  } catch (error) {
    console.log('✗ FAILED:', error.message);
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Message:', error.response.statusText);
    }
    return false;
  }
}

async function main() {
  console.log('BigCommerce API Credential Test\n');

  for (const cred of credentials) {
    await testCredentials(cred);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
}

main();
```

**Run Test:**

```bash
# Install dependencies
npm install node-bigcommerce

# Run test script
node test-bc-credentials.js
```

**Document Results:**

```
Credential Set 1: ✓ Active / ✗ Invalid
Credential Set 2: ✓ Active / ✗ Invalid

Recommended: ___________
Reason: ___________
```

**Time Estimate:** 30 minutes

---

### Task 1.5: Investigate Product Update Mechanism

**Objective:** Understand how products/inventory/prices currently update in BigCommerce

**Step 1: Check BigCommerce Admin**

Login to BigCommerce admin panel:
- [ ] Navigate to Products
- [ ] Check last modified dates on sample products
- [ ] Check recent activity log
- [ ] Check webhook settings (Settings → API → Webhooks)
- [ ] Check scheduled tasks (if any)

**Step 2: Check for Additional Sync Scripts**

```bash
# Search for other sync scripts
find /var/www -name "*sync*" -type f
find /var/www -name "*bigcommerce*" -type f
find /home -name "*sync*" -type f

# Check for other cron jobs
crontab -l
sudo crontab -l
ls /etc/cron.d/
ls /etc/cron.daily/
ls /etc/cron.hourly/

# Check recent logs
tail -100 /var/log/cron
journalctl -u cron -n 100
```

**Step 3: Search Code for Uncommented Update Functions**

```bash
# In fyic-portal repository
cd C:\Users\jayso\fyic-portal

# Search for inventory update calls (NOT commented)
grep -r "updateBCInvTracProducts" src/ | grep -v "//"

# Search for price update calls (NOT commented)
grep -r "updateBCPrices" src/ | grep -v "//"

# Search for product update calls
grep -r "bigCommerce.put" src/
```

**Possible Findings:**

| Finding | Interpretation | Next Action |
|---------|----------------|-------------|
| No active updates | Manual admin updates | Document manual process |
| Webhook found | External trigger | Document webhook config |
| Different script found | Undiscovered system | Analyze new script |
| Recent BC timestamps | Something is updating | Continue investigating |
| Old BC timestamps | Updates disabled | Verify with stakeholder |

**Interview Questions for Stakeholder:**
- [ ] How do product prices get updated in BigCommerce?
- [ ] How does inventory sync to BigCommerce?
- [ ] Are updates manual or automated?
- [ ] When was the last time products were updated?
- [ ] Is there another system/script not documented?

**Time Estimate:** 2 hours

---

## Priority 2: Supabase Setup (Days 4-6)

### Task 2.1: Create Supabase Project

**Objective:** Set up Supabase infrastructure

**Steps:**

1. [ ] Sign up / login to Supabase (supabase.com)
2. [ ] Create new project
   - Name: `buy-organics-online-production`
   - Region: `ap-southeast-2` (Sydney - same as RDS)
   - Database Password: Generate strong password
3. [ ] Save credentials:
   ```
   Project URL: _________________
   API URL: _________________
   Anon Key: _________________
   Service Role Key: _________________
   Database Password: _________________
   ```
4. [ ] Configure project settings
   - Enable Auto Schema Diff
   - Set up daily backups
   - Configure alerts

**Time Estimate:** 30 minutes

---

### Task 2.2: Convert and Create Database Schema

**Objective:** Migrate MySQL schema to PostgreSQL

**Step 1: Export MySQL Schema**

```bash
# From RDS (determined as source in Task 1.3)
mysqldump -h newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com \
          -u admin -p \
          --no-data \
          --skip-add-drop-table \
          new_fyic_db > mysql_schema.sql
```

**Step 2: Convert MySQL → PostgreSQL**

Use tool or manual conversion:

```sql
-- MySQL Example
CREATE TABLE bc_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  categories JSON,
  date_created DATETIME
);

-- PostgreSQL Conversion
CREATE TABLE bc_products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  categories JSONB,
  date_created TIMESTAMPTZ
);
```

**Conversion Checklist:**
- [ ] `AUTO_INCREMENT` → `SERIAL` or `BIGSERIAL`
- [ ] `DATETIME` → `TIMESTAMPTZ`
- [ ] `JSON` → `JSONB` (better performance)
- [ ] `TINYINT(1)` → `BOOLEAN`
- [ ] Backticks (`) → Double quotes (") for identifiers

**Step 3: Create Tables in Supabase**

```bash
# Connect to Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run converted schema
\i postgresql_schema.sql
```

**Or use Supabase SQL Editor:**
- Navigate to SQL Editor in dashboard
- Paste converted schema
- Run query

**Tables to Create (Priority Order):**

**Phase 1 - Core Tables:**
1. [ ] `bc_products` - BigCommerce product mirror
2. [ ] `oborne_products` - Oborne catalog
3. [ ] `kadac_products` - Kadac catalog
4. [ ] `uhp_products` - UHP catalog
5. [ ] `globalnature_products` - GlobalNature catalog
6. [ ] `oborne_stocks` - Stock history

**Phase 2 - AI Tables:**
7. [ ] `bc_ai_score` - Quality metrics
8. [ ] `bc_improved_ai_score` - AI descriptions
9. [ ] `bc_cat_improved_ai_score` - Category AI

**Phase 3 - New Monitoring Tables:**
10. [ ] `sync_logs` - Execution tracking
11. [ ] `sync_errors` - Error logging

**Time Estimate:** 4 hours

---

### Task 2.3: Create Indexes

**Objective:** Optimize query performance

```sql
-- Product lookups
CREATE INDEX idx_bc_products_sku ON bc_products(sku);
CREATE INDEX idx_bc_products_product_id ON bc_products(product_id);
CREATE INDEX idx_bc_products_date_modified ON bc_products(date_modified);

-- Supplier SKU lookups
CREATE INDEX idx_oborne_sku ON oborne_products(sku);
CREATE INDEX idx_oborne_new_sku ON oborne_products(new_sku);
CREATE INDEX idx_kadac_sku ON kadac_products(sku);
CREATE INDEX idx_uhp_sku ON uhp_products(sku);
CREATE INDEX idx_gn_sku ON globalnature_products(sku);

-- Barcode lookups
CREATE INDEX idx_oborne_barcode ON oborne_products(barcode);
CREATE INDEX idx_kadac_barcode ON kadac_products(barcode);
CREATE INDEX idx_uhp_barcode ON uhp_products(apn_barcode);

-- Stock history queries
CREATE INDEX idx_oborne_stocks_date ON oborne_stocks(date_time DESC);
CREATE INDEX idx_oborne_stocks_sku ON oborne_stocks(new_sku);
CREATE INDEX idx_oborne_stocks_sku_date ON oborne_stocks(new_sku, date_time DESC);

-- JSONB indexes for category searches
CREATE INDEX idx_bc_products_categories ON bc_products USING GIN (categories);
CREATE INDEX idx_bc_products_meta_keywords ON bc_products USING GIN (meta_keywords);

-- Sync log queries
CREATE INDEX idx_sync_logs_type_date ON sync_logs(sync_type, started_at DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status, started_at DESC);
```

**Checklist:**
- [ ] All primary indexes created
- [ ] Foreign key columns indexed
- [ ] Date/timestamp columns indexed for sorting
- [ ] JSONB columns indexed with GIN
- [ ] Query performance tested

**Time Estimate:** 1 hour

---

### Task 2.4: Implement Row Level Security (RLS)

**Objective:** Secure data access

```sql
-- Enable RLS on all tables
ALTER TABLE bc_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE oborne_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kadac_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE uhp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE globalnature_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE oborne_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bc_ai_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE bc_improved_ai_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE bc_cat_improved_ai_score ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (for n8n workflows)
CREATE POLICY "Service role full access" ON bc_products
  FOR ALL
  USING (auth.role() = 'service_role');

-- Repeat for all tables
-- ... (same policy for each table)

-- Policy: Authenticated users can read
CREATE POLICY "Authenticated read access" ON bc_products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Repeat for all tables
```

**Checklist:**
- [ ] RLS enabled on all tables
- [ ] Service role policies created
- [ ] Read-only policies for dashboards
- [ ] Policies tested with different roles

**Time Estimate:** 1 hour

---

### Task 2.5: Test Data Import

**Objective:** Verify schema works with real data

**Step 1: Export Sample Data**

```sql
-- Export 100 records from each table
SELECT * FROM oborne_products LIMIT 100 INTO OUTFILE '/tmp/oborne_sample.csv'
  FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';

-- Repeat for other tables
```

**Step 2: Import to Supabase**

```sql
-- Import sample data
COPY oborne_products FROM '/path/to/oborne_sample.csv'
  WITH (FORMAT csv, HEADER true);
```

**Step 3: Verify**

```sql
-- Check counts
SELECT COUNT(*) FROM oborne_products;

-- Verify data integrity
SELECT * FROM oborne_products LIMIT 5;

-- Test queries from application
SELECT * FROM oborne_products WHERE sku = 'TEST-SKU';
```

**Checklist:**
- [ ] Sample data imported successfully
- [ ] Data types correct
- [ ] JSON fields parsed correctly
- [ ] Queries return expected results
- [ ] No import errors

**Time Estimate:** 2 hours

---

## Priority 3: n8n Workflow Development (Days 7-14)

### Task 3.1: Set Up n8n Instance

**Objective:** Deploy n8n for workflow automation

**Option A: n8n Cloud (Recommended)**

1. [ ] Sign up at n8n.cloud
2. [ ] Choose plan (Pro recommended for production)
3. [ ] Create workspace: `buy-organics-online`
4. [ ] Configure timezone: Australia/Sydney
5. [ ] Set up alerts email

**Option B: Self-Hosted**

```bash
# Using Docker
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e GENERIC_TIMEZONE="Australia/Sydney" \
  -e TZ="Australia/Sydney" \
  n8nio/n8n

# Or using npm
npm install -g n8n
n8n start
```

**Initial Configuration:**
- [ ] Set up credentials storage
- [ ] Configure execution logs
- [ ] Set up error notifications (Slack/Email)
- [ ] Configure workflow versioning

**Time Estimate:** 1 hour

---

### Task 3.2: Configure n8n Credentials

**Objective:** Store all integration credentials securely

**Credentials to Add:**

1. [ ] **Supabase**
   - Name: `Supabase - BOO Production`
   - Host: `db.[PROJECT-REF].supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: [From Task 2.1]
   - Port: `5432`
   - SSL: Enabled

2. [ ] **FTP (Oborne/CH2)**
   - Name: `CH2 FTP - Oborne`
   - Host: `ftp3.ch2.net.au`
   - User: `retail_310`
   - Password: `am2SH6wWevAY&#+Q`

3. [ ] **Gmail IMAP (GlobalNature)**
   - Name: `Gmail - Kylie BOO`
   - Email: `kylie@buyorganicsonline.com.au`
   - Password: `mLmZAWeeex2N%Q4m`
   - IMAP Host: `imap.gmail.com`
   - IMAP Port: `993`

4. [ ] **AWS S3** (if needed for archiving)
   - Name: `AWS S3 - BOO`
   - Access Key: [From Task 1.2]
   - Secret Key: [From Task 1.2]
   - Region: [From Task 1.2]

5. [ ] **SendGrid** (for reports)
   - Name: `SendGrid - BOO`
   - API Key: `SG.Z3fMrMSuTPS0UwSQJE1vkg...`

6. [ ] **BigCommerce API** (if needed)
   - Name: `BigCommerce - BOO`
   - Client ID: [From Task 1.4]
   - Access Token: [From Task 1.4]
   - Store Hash: `hhhi`

**Checklist:**
- [ ] All credentials stored
- [ ] Credentials tested
- [ ] No credentials in workflow code
- [ ] Backup of credential names documented

**Time Estimate:** 30 minutes

---

### Task 3.3: Build Workflow 1 - Oborne/CH2 FTP Sync

**Objective:** Automate Oborne product sync via FTP

**Workflow Nodes:**

```
1. Cron Trigger
   ↓
2. FTP Download (inventory.csv)
   ↓
3. FTP Download (products.csv)
   ↓
4. CSV Parser (inventory)
   ↓
5. CSV Parser (products)
   ↓
6. Data Transform (Map fields)
   ↓
7. Supabase - Truncate oborne_products
   ↓
8. Supabase - Batch Insert (Loop)
   ↓
9. Supabase - Insert stock history
   ↓
10. Supabase - Insert sync_logs
   ↓
11. Slack/Email Notification (Success)
   ↓
12. Error Handler → Slack Alert
```

**Implementation Steps:**

1. [ ] Create new workflow: `Oborne FTP Sync`
2. [ ] Add Cron trigger: `0 */2 * * *` (every 2 hours)
3. [ ] Add FTP node:
   - Operation: `Download`
   - Path: `prod_retail_310/inventory.csv`
   - Credential: `CH2 FTP - Oborne`
4. [ ] Add second FTP node:
   - Path: `prod_retail_product/products.csv`
5. [ ] Add CSV Parser:
   - Delimiter: `|` (pipe)
   - Columns: Auto-detect
6. [ ] Add Function node for transformation:
   ```javascript
   // Map CSV to database schema
   return items.map(item => ({
     json: {
       sku: item.json.sku,
       new_sku: item.json.oborne_sku,
       name: item.json.name,
       brand: item.json.brand,
       ws_ex_gst: parseFloat(item.json.baseprice),
       rrp: parseFloat(item.json.rrp),
       gst_status: 'GST applies',
       availability: parseInt(item.json.stock) > 0 ? 'In Stock' : 'Out of Stock',
       stock_qty: parseInt(item.json.stock),
       barcode: item.json.upccode
     }
   }));
   ```
7. [ ] Add Supabase node:
   - Operation: `Execute Query`
   - Query: `TRUNCATE TABLE oborne_products;`
8. [ ] Add Supabase node (in loop):
   - Operation: `Insert`
   - Table: `oborne_products`
   - Batch size: 50
9. [ ] Add sync logging
10. [ ] Add error handler
11. [ ] Test with sample data
12. [ ] Activate workflow

**Validation:**
- [ ] Workflow executes successfully
- [ ] CSV files downloaded
- [ ] Data parsed correctly
- [ ] Inserted to Supabase
- [ ] Stock history recorded
- [ ] Notifications sent
- [ ] Error handling works

**Time Estimate:** 4 hours

---

### Task 3.4: Build Workflow 2 - Kadac API Sync

**Objective:** Automate Kadac product sync via API

**Workflow Nodes:**

```
1. Cron Trigger (0 */2 * * *)
   ↓
2. HTTP Request (Download CSV)
   ↓
3. CSV Parser
   ↓
4. Data Transform
   ↓
5. Supabase - Truncate kadac_products
   ↓
6. Supabase - Batch Insert (50 at a time)
   ↓
7. Sync Logging
   ↓
8. Notification
```

**Implementation:**

1. [ ] Create workflow: `Kadac API Sync`
2. [ ] Add Cron trigger: `0 */2 * * *`
3. [ ] Add HTTP Request node:
   - Method: `GET`
   - URL: `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv`
   - Response Format: `File`
4. [ ] Add CSV Parser
5. [ ] Transform data:
   ```javascript
   return items.map(item => ({
     json: {
       sku: item.json.sku,
       brand: item.json.brand,
       description: item.json.description,
       size: item.json.size,
       gst: item.json.gst,
       wholesale: parseFloat(item.json.wholesale),
       rrp: parseFloat(item.json.rrp),
       percarton: parseInt(item.json.percarton),
       cartononly: item.json.cartononly,
       barcode: item.json.barcode,
       stockstatus: item.json.stockstatus,
       imageurl: item.json.imageurl
     }
   }));
   ```
6. [ ] Add database operations
7. [ ] Test and activate

**Time Estimate:** 3 hours

---

### Task 3.5: Build Workflow 3 - UHP HTTPS Sync

**Objective:** Automate UHP product sync via HTTPS download

**Workflow Nodes:**

```
1. Cron Trigger (0 */2 * * *)
   ↓
2. HTTP Download (XLSX)
   ↓
3. Convert Excel to CSV
   ↓
4. CSV Parser (34 fields)
   ↓
5. Data Transform
   ↓
6. Supabase Operations
   ↓
7. Logging & Notifications
```

**Implementation:**

1. [ ] Create workflow: `UHP HTTPS Sync`
2. [ ] Add Cron trigger: `0 */2 * * *`
3. [ ] Add HTTP Request:
   - URL: `https://www.uhp.com.au/media/wysiwyg/uhp_products_export.xlsx`
   - Response Format: `File`
4. [ ] Add Spreadsheet File node:
   - Operation: `Read`
   - Format: `XLSX`
5. [ ] Transform 34 fields to match schema
6. [ ] Add database operations
7. [ ] Test and activate

**Time Estimate:** 3 hours

---

### Task 3.6: Build Workflow 4 - GlobalNature Email Sync

**Objective:** Automate GlobalNature product sync via email attachments

**Workflow Nodes:**

```
1. Cron Trigger (45 */2 * * *)
   ↓
2. IMAP Email Check
   ↓
3. Filter (From: yiyi.lu@globalbynature.com.au)
   ↓
4. Download Attachments (.xlsx)
   ↓
5. Convert Excel to CSV
   ↓
6. Parse & Transform
   ↓
7. Supabase Insert
   ↓
8. Mark Email as Read
   ↓
9. Logging & Notifications
```

**Implementation:**

1. [ ] Create workflow: `GlobalNature Email Sync`
2. [ ] Add Cron trigger: `45 */2 * * *` (offset from others)
3. [ ] Add Email (IMAP) node:
   - Credential: `Gmail - Kylie BOO`
   - Operation: `Get Many`
   - Filters:
     - From: `yiyi.lu@globalbynature.com.au`
     - Unseen: `true`
     - Since: `1 day ago`
4. [ ] Add IF node:
   - Condition: Has attachments
   - Format: `.xlsx`
5. [ ] Add Extract Attachment node
6. [ ] Add Spreadsheet File node (read XLSX)
7. [ ] Transform data
8. [ ] Database operations
9. [ ] Mark email as read
10. [ ] Test and activate

**Time Estimate:** 4 hours

---

### Task 3.7: Build Workflow 5 - Stock History Tracking

**Objective:** Record Oborne stock levels for historical analysis

**Workflow Nodes:**

```
1. Cron Trigger (0 */8 * * *)
   ↓
2. Supabase Query (Get current oborne_products)
   ↓
3. Transform (Extract SKU + Stock)
   ↓
4. Supabase Insert (oborne_stocks)
   ↓
5. Logging
```

**Implementation:**

1. [ ] Create workflow: `Oborne Stock History`
2. [ ] Add Cron trigger: `0 */8 * * *` (every 8 hours)
3. [ ] Add Supabase node:
   - Operation: `Execute Query`
   - Query: `SELECT new_sku, stock_qty FROM oborne_products WHERE stock_qty IS NOT NULL`
4. [ ] Transform to stock history format:
   ```javascript
   return items.map(item => ({
     json: {
       new_sku: item.json.new_sku,
       stock_qty: item.json.stock_qty,
       date_time: new Date().toISOString()
     }
   }));
   ```
5. [ ] Insert to `oborne_stocks`
6. [ ] Test and activate

**Time Estimate:** 2 hours

---

### Task 3.8: Build Workflow 6 - Daily Reports

**Objective:** Generate and email daily sales reports

**Workflow Nodes:**

```
1. Cron Trigger (0 6 * * *)
   ↓
2. Supabase Query (Sales data)
   ↓
3. Generate Report (CSV/Excel)
   ↓
4. Email via SendGrid
   ↓
5. Upload to S3 (Archive)
```

**Implementation:**

1. [ ] Create workflow: `Daily Sales Report`
2. [ ] Add Cron trigger: `0 6 * * *` (6 AM)
3. [ ] Query sales data from Supabase
4. [ ] Format as CSV/Excel
5. [ ] Email to stakeholders
6. [ ] Archive to S3
7. [ ] Test and activate

**Time Estimate:** 3 hours

---

### Task 3.9: Implement Error Handling & Monitoring

**Objective:** Ensure reliability and quick error detection

**Error Handling Pattern:**

```
Main Workflow
  ├─ Try Block
  │   └─ Normal operations
  └─ Error Handler
      ├─ Log to sync_errors table
      ├─ Slack/Email alert
      └─ Retry logic (if applicable)
```

**Implementation for Each Workflow:**

1. [ ] Add Error Trigger node
2. [ ] Add Function node to format error:
   ```javascript
   return [{
     json: {
       sync_type: 'oborne',
       error_message: $input.item.json.error.message,
       stack_trace: $input.item.json.error.stack,
       occurred_at: new Date().toISOString(),
       workflow_id: $workflow.id,
       execution_id: $execution.id
     }
   }];
   ```
3. [ ] Insert to `sync_errors` table
4. [ ] Send Slack/Email notification:
   ```
   🚨 BOO Sync Error

   Workflow: Oborne FTP Sync
   Error: Connection timeout to FTP server
   Time: 2025-11-24 14:23:10 AEST
   Execution ID: abc123

   Action Required: Check FTP credentials and server status
   ```
5. [ ] Add retry logic for transient errors:
   - FTP connection errors → Retry 3 times with 5min delay
   - API rate limits → Backoff and retry
   - Database locks → Retry after delay

**Monitoring Dashboard:**

Create workflow: `Sync Health Monitor`
- Runs every hour
- Queries `sync_logs` for last 24 hours
- Checks for:
  - Failed syncs
  - Long-running syncs
  - Missing syncs (should have run but didn't)
- Sends daily summary report

**Checklist:**
- [ ] Error handlers on all workflows
- [ ] Errors logged to database
- [ ] Slack alerts configured
- [ ] Retry logic implemented
- [ ] Health monitor workflow created
- [ ] Daily summary report working

**Time Estimate:** 4 hours

---

## Priority 4: Testing & Validation (Days 15-21)

### Task 4.1: Parallel Run Setup

**Objective:** Run old and new systems simultaneously to validate

**Setup:**

1. [ ] Keep existing system running
2. [ ] Activate all n8n workflows
3. [ ] Let both run for 7 days
4. [ ] Compare outputs daily

**Comparison Script:**

```sql
-- Compare record counts
SELECT
  'RDS' as source,
  'oborne_products' as table_name,
  COUNT(*) as count
FROM rds.oborne_products
UNION ALL
SELECT
  'Supabase',
  'oborne_products',
  COUNT(*)
FROM supabase.oborne_products;

-- Compare specific products
SELECT
  r.sku,
  r.rrp as rds_rrp,
  s.rrp as supabase_rrp,
  r.stock_qty as rds_stock,
  s.stock_qty as supabase_stock
FROM rds.oborne_products r
FULL OUTER JOIN supabase.oborne_products s ON r.sku = s.sku
WHERE r.rrp <> s.rrp OR r.stock_qty <> s.stock_qty;
```

**Daily Checklist:**
- [ ] Record counts match (within acceptable delta)
- [ ] Sample products verified
- [ ] Prices match
- [ ] Stock levels match
- [ ] No missing SKUs
- [ ] Timestamps recent in both systems

**Time Estimate:** 1 hour per day for 7 days

---

### Task 4.2: Data Validation Tests

**Objective:** Ensure data integrity

**Test Cases:**

1. [ ] **Test: Product Count Accuracy**
   ```sql
   -- Should match within ±10 (new products added during day)
   SELECT COUNT(*) FROM oborne_products;
   ```
   - Expected: ~11,357 products
   - Tolerance: ±50

2. [ ] **Test: No Duplicate SKUs**
   ```sql
   SELECT sku, COUNT(*)
   FROM oborne_products
   GROUP BY sku
   HAVING COUNT(*) > 1;
   ```
   - Expected: 0 results

3. [ ] **Test: No NULL Critical Fields**
   ```sql
   SELECT COUNT(*)
   FROM oborne_products
   WHERE sku IS NULL OR name IS NULL OR rrp IS NULL;
   ```
   - Expected: 0

4. [ ] **Test: Price Range Validation**
   ```sql
   SELECT *
   FROM oborne_products
   WHERE rrp < 0 OR rrp > 10000 OR ws_ex_gst < 0 OR ws_ex_gst > rrp;
   ```
   - Expected: 0 or flagged for review

5. [ ] **Test: Stock Levels Reasonable**
   ```sql
   SELECT *
   FROM oborne_products
   WHERE stock_qty < 0 OR stock_qty > 100000;
   ```
   - Expected: 0 or flagged for review

6. [ ] **Test: Recent Sync Timestamps**
   ```sql
   SELECT sync_type, MAX(completed_at)
   FROM sync_logs
   WHERE status = 'completed'
   GROUP BY sync_type;
   ```
   - Expected: All within last 2 hours

7. [ ] **Test: Stock History Recording**
   ```sql
   SELECT COUNT(*)
   FROM oborne_stocks
   WHERE date_time > NOW() - INTERVAL '24 hours';
   ```
   - Expected: ~3 records per SKU (8-hour cron)

**Validation Report Template:**

```
Data Validation Report - [Date]
================================

✓ Product count: 11,423 (within tolerance)
✓ No duplicate SKUs found
✓ No NULL critical fields
✗ ISSUE: 3 products with negative stock (-1, -2, -5)
✓ All prices in valid range
✓ Last sync: 23 minutes ago
✓ Stock history recording: 34,269 records today

Issues Requiring Action:
1. Investigate negative stock products (SKUs: ABC123, DEF456, GHI789)
```

**Time Estimate:** 3 hours initial setup + 1 hour per day

---

### Task 4.3: Performance Testing

**Objective:** Ensure system performs at scale

**Test Cases:**

1. [ ] **Test: Sync Execution Time**
   ```sql
   SELECT
     sync_type,
     AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds
   FROM sync_logs
   WHERE status = 'completed'
     AND started_at > NOW() - INTERVAL '7 days'
   GROUP BY sync_type;
   ```
   - Expected: <5 minutes per supplier sync

2. [ ] **Test: Query Performance**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM oborne_products WHERE sku = 'TEST123';
   ```
   - Expected: <10ms execution time
   - Verify index usage

3. [ ] **Test: Batch Insert Performance**
   - Insert 1000 records
   - Expected: <2 seconds

4. [ ] **Test: Concurrent Workflow Execution**
   - Trigger multiple workflows simultaneously
   - Expected: No deadlocks, all complete successfully

5. [ ] **Test: Database Connection Pool**
   - Monitor active connections during peak
   - Expected: <10 concurrent connections

**Performance Benchmarks:**

| Metric | Current System | Target | Actual |
|--------|---------------|--------|--------|
| Oborne sync time | ~3 min | <5 min | _____ |
| Kadac sync time | ~2 min | <5 min | _____ |
| UHP sync time | ~4 min | <5 min | _____ |
| GN sync time | ~3 min | <5 min | _____ |
| SKU lookup query | <10ms | <10ms | _____ |
| Stock history insert | <1s | <2s | _____ |

**Time Estimate:** 4 hours

---

### Task 4.4: Error Scenario Testing

**Objective:** Verify error handling works

**Test Scenarios:**

1. [ ] **Test: FTP Connection Failure**
   - Temporarily block FTP access
   - Expected: Error logged, Slack alert, retry attempted

2. [ ] **Test: Invalid CSV Format**
   - Inject malformed CSV
   - Expected: Parsing error caught, no partial data inserted

3. [ ] **Test: API Rate Limit**
   - Trigger rapid API calls
   - Expected: Backoff and retry logic activates

4. [ ] **Test: Database Connection Loss**
   - Disconnect database mid-sync
   - Expected: Transaction rolled back, error logged

5. [ ] **Test: Email Attachment Missing**
   - Test with email that has no attachment
   - Expected: Graceful skip, logged as warning

6. [ ] **Test: Duplicate Key Violation**
   - Insert duplicate SKU
   - Expected: Error caught, reported, sync continues

**Error Handling Checklist:**
- [ ] All errors logged to `sync_errors` table
- [ ] Slack alerts sent for critical errors
- [ ] No partial data inserted (transactions work)
- [ ] Retry logic activates appropriately
- [ ] Graceful degradation (one failed sync doesn't break others)

**Time Estimate:** 4 hours

---

## Priority 5: Cutover Planning (Days 22-24)

### Task 5.1: Create Cutover Runbook

**Objective:** Document exact steps for production cutover

**Cutover Runbook:**

```
BUY ORGANICS ONLINE - SUPABASE MIGRATION CUTOVER
================================================

Pre-Cutover Checklist (T-24 hours):
[ ] All validation tests passing
[ ] Parallel run data matches 100%
[ ] Stakeholder approval received
[ ] Rollback plan tested
[ ] Backup verified
[ ] Team on standby

Cutover Steps (Maintenance Window: 2 AM - 4 AM AEST):

T-0:00 - Disable Old System
  [ ] SSH to dev.growthcohq.com
  [ ] Stop Node.js process: sudo systemctl stop fyic-portal
  [ ] Disable EC2 cron: crontab -e (comment out sync jobs)
  [ ] Verify: ps aux | grep fyic (should show no running processes)

T-0:10 - Final Data Sync
  [ ] Manually trigger all n8n workflows
  [ ] Wait for completion
  [ ] Verify: Check sync_logs for success

T-0:30 - Enable Production Workflows
  [ ] Activate all n8n workflows
  [ ] Verify cron schedules active
  [ ] Test: Manually trigger one sync, verify success

T-0:45 - Monitoring
  [ ] Watch Supabase dashboard for activity
  [ ] Monitor n8n execution logs
  [ ] Check Slack for error alerts

T-1:00 - Validation
  [ ] Run all data validation queries
  [ ] Compare counts with pre-cutover snapshot
  [ ] Verify: Recent timestamps in all tables

T-2:00 - 24 Hour Monitoring
  [ ] Monitor every 2 hours
  [ ] Check sync completion
  [ ] Verify no errors

T+24:00 - Success Confirmation
  [ ] All syncs running
  [ ] Error rate < 1%
  [ ] Stakeholder approval
  [ ] Document any issues

Rollback Trigger Conditions:
- Error rate > 5%
- Data validation failures
- Missing syncs (>2 consecutive failures)
- BigCommerce integration broken
- Critical bug discovered

Rollback Steps:
  [ ] Disable n8n workflows
  [ ] Re-enable old system
  [ ] Verify old system syncing
  [ ] Investigate issue
  [ ] Schedule retry
```

**Time Estimate:** 2 hours to create, 4 hours to execute

---

### Task 5.2: Create Rollback Plan

**Objective:** Be able to revert quickly if needed

**Rollback Plan:**

```
EMERGENCY ROLLBACK PROCEDURE
============================

Trigger Decision:
Execute rollback if ANY of these occur within first 48 hours:
- Data validation failure
- >5% error rate
- Missing syncs (2+ consecutive)
- Critical production issue

Steps:

1. DISABLE NEW SYSTEM (Immediate - 5 minutes)
   [ ] Login to n8n
   [ ] Deactivate all workflows
   [ ] Verify: No executions running

2. RE-ENABLE OLD SYSTEM (10 minutes)
   [ ] SSH to dev.growthcohq.com
   [ ] Start Node.js: sudo systemctl start fyic-portal
   [ ] Enable cron: crontab -e (uncomment jobs)
   [ ] Verify: ps aux | grep fyic (process running)
   [ ] Test: curl localhost:PORT/health

3. VERIFY OLD SYSTEM (15 minutes)
   [ ] Wait for next cron execution
   [ ] Check database for new data
   [ ] Verify sync logs
   [ ] Test API endpoints

4. NOTIFICATION (5 minutes)
   [ ] Alert stakeholders
   [ ] Document issue
   [ ] Schedule investigation

5. POST-ROLLBACK (24 hours)
   [ ] Root cause analysis
   [ ] Fix issues in n8n
   [ ] Re-test in staging
   [ ] Schedule new cutover

Total Rollback Time: 35 minutes
Data Loss Risk: Minimal (only syncs during rollback window)
```

**Rollback Testing:**
- [ ] Test rollback in non-production environment
- [ ] Verify old system starts correctly
- [ ] Document any issues
- [ ] Time the process

**Time Estimate:** 2 hours

---

### Task 5.3: Stakeholder Communication Plan

**Objective:** Keep everyone informed

**Communication Timeline:**

**T-7 days:**
```
Subject: Buy Organics Online - Supabase Migration Starting

Hi team,

We're beginning the migration from AWS to Supabase for the Buy Organics Online supplier sync system.

Timeline:
- Nov 24-30: Parallel run and testing
- Dec 1-2: Cutover (tentative)
- Dec 2-3: Monitoring

Expected Benefits:
- 70% cost reduction ($111/month savings)
- Better reliability
- Easier maintenance

No action required from you. I'll send updates every 2 days.

Questions? Reply to this email.
```

**T-2 days:**
```
Subject: BOO Migration - Cutover Scheduled

Cutover scheduled for Dec 2, 2 AM - 4 AM AEST.

Status:
✓ All tests passing
✓ Data validation complete
✓ Rollback plan ready

During cutover:
- 2-hour maintenance window
- No impact to BigCommerce storefront
- Supplier syncs paused briefly

I'll send confirmation when complete.
```

**T+0 (Cutover Complete):**
```
Subject: BOO Migration - Successfully Completed

Migration completed successfully at 3:47 AM AEST.

Results:
✓ All supplier syncs active
✓ 11,423 products migrated
✓ Zero data loss
✓ First sync completed at 4:00 AM

Monitoring:
- Watching for 48 hours
- All metrics normal
- No errors detected

Next sync: 6:00 AM AEST (Oborne)
```

**Time Estimate:** 1 hour

---

## Priority 6: Post-Migration (Days 25-30)

### Task 6.1: Monitor for 7 Days

**Objective:** Ensure stability

**Daily Monitoring Checklist:**

```
Day 1: [Date]
  [ ] Check sync_logs - all syncs completed
  [ ] Review sync_errors - no errors
  [ ] Verify product counts unchanged
  [ ] Test sample SKU lookups
  [ ] Check n8n execution times
  [ ] Review Slack alerts (should be none)
  Status: ✓ Normal / ⚠ Warning / ✗ Issue
  Notes: _______________________

Day 2-7: (Repeat daily)
```

**Weekly Report:**

```
BOO Supabase Migration - Week 1 Report
======================================

Uptime: 99.9%
Total Syncs: 84 (4 suppliers × 3 per day × 7 days)
Success Rate: 100%
Average Sync Time: 3.2 minutes
Errors: 0

Metrics:
- Oborne: 42 syncs, 0 errors, avg 3.1 min
- Kadac: 42 syncs, 0 errors, avg 2.8 min
- UHP: 42 syncs, 0 errors, avg 4.2 min
- GlobalNature: 42 syncs, 0 errors, avg 2.9 min

Issues: None

Recommendations: Monitor for another week, then decommission old system.
```

**Time Estimate:** 30 minutes per day

---

### Task 6.2: Optimize Performance

**Objective:** Fine-tune system based on real usage

**Optimization Areas:**

1. [ ] **Database Indexes**
   - Review slow query log
   - Add indexes for common queries
   - Remove unused indexes

2. [ ] **Batch Sizes**
   - Experiment with different batch sizes (25, 50, 100)
   - Find optimal balance of speed vs memory

3. [ ] **Cron Timing**
   - Adjust if conflicts detected
   - Spread out for better resource utilization

4. [ ] **Connection Pooling**
   - Tune Supabase connection pool size
   - Monitor for connection exhaustion

5. [ ] **Workflow Efficiency**
   - Combine operations where possible
   - Remove redundant transformations
   - Cache frequently accessed data

**Performance Improvements:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Oborne sync time | 3.1 min | _____ | _____ |
| Database query time | 15ms | _____ | _____ |
| Error rate | 0% | _____ | _____ |

**Time Estimate:** 4 hours

---

### Task 6.3: Documentation Finalization

**Objective:** Complete documentation for future maintenance

**Documents to Create/Update:**

1. [ ] **SYSTEM-ARCHITECTURE.md**
   - Supabase schema diagram
   - n8n workflow overview
   - Data flow diagrams
   - Integration points

2. [ ] **RUNBOOK.md**
   - How to handle common issues
   - Troubleshooting guide
   - Contact information

3. [ ] **API-DOCUMENTATION.md**
   - If exposing APIs
   - Authentication
   - Endpoints
   - Examples

4. [ ] **MAINTENANCE-GUIDE.md**
   - Regular maintenance tasks
   - Backup procedures
   - Monitoring checklist

5. [ ] **ONBOARDING-GUIDE.md**
   - For new team members
   - System overview
   - Access setup
   - First tasks

**Time Estimate:** 6 hours

---

### Task 6.4: Decommission Old System

**Objective:** Clean up and reduce costs

**Decommission Checklist:**

```
⚠ WAIT 30 DAYS POST-MIGRATION BEFORE DECOMMISSIONING

After 30 days of stable operation:

1. [ ] Backup Old System
   [ ] Export all databases
   [ ] Archive application code
   [ ] Save configuration files
   [ ] Store in S3 (1 year retention)

2. [ ] Stop Services
   [ ] Stop Node.js application
   [ ] Disable all cron jobs
   [ ] Stop EC2 instance (don't terminate yet)

3. [ ] Test New System Without Old
   [ ] Run for 1 week with old system stopped
   [ ] Verify no dependencies
   [ ] Confirm no errors

4. [ ] Terminate Resources
   [ ] Terminate EC2 instance
   [ ] Delete RDS database (after final backup)
   [ ] Remove S3 buckets (if empty/migrated)
   [ ] Delete unused IAM roles
   [ ] Remove Route53 DNS entries (if any)

5. [ ] Update Documentation
   [ ] Mark old system as decommissioned
   [ ] Update architecture diagrams
   [ ] Remove old credentials from password manager

6. [ ] Calculate Savings
   [ ] Final AWS bill comparison
   [ ] Document total savings
   [ ] Report to stakeholders

Expected Monthly Savings:
- EC2: $XX
- RDS: $XX
- Data Transfer: $XX
- Total: ~$111/month
```

**Time Estimate:** 4 hours

---

## Cost Breakdown & Savings

### Current AWS Costs (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| EC2 t3.small | $15 | Application server |
| RDS db.t3.micro | $12 | MySQL database |
| RDS Storage (50GB) | $7 | Database storage |
| Data Transfer | $5 | Outbound data |
| S3 Storage | $2 | File archives |
| **Subtotal** | **$41** | Current infrastructure |
| Hidden Costs | $70 | Maintenance, monitoring, overhead |
| **Total** | **$111** | **Current monthly cost** |

### New Supabase Costs (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Free Tier | $0 | 500MB DB, 1GB egress |
| n8n Cloud Starter | $20 | 2,500 executions/month |
| **Total** | **$20** | **New monthly cost** |

### Savings

- **Monthly Savings:** $111 - $20 = **$91 (82% reduction)**
- **Annual Savings:** $91 × 12 = **$1,092**
- **3-Year Savings:** $1,092 × 3 = **$3,276**

**Note:** If Supabase free tier is exceeded, Pro plan is $25/month, still saving $86/month

---

## Risk Mitigation Strategies

### Risk 1: Data Loss During Migration
**Mitigation:**
- Full backup before cutover
- Parallel run to verify
- Transaction-based inserts (all-or-nothing)
- Rollback plan ready

### Risk 2: Downtime Impact
**Mitigation:**
- Cutover during low-traffic window (2-4 AM)
- Maintenance window notification
- Rollback in <35 minutes if issues

### Risk 3: Integration Failures
**Mitigation:**
- Test all integrations in parallel run
- Monitor for 7 days before cutover
- Keep old system ready for quick rollback

### Risk 4: Performance Degradation
**Mitigation:**
- Load testing before cutover
- Monitor query times
- Optimize indexes
- Supabase has auto-scaling

### Risk 5: Unforeseen Dependencies
**Mitigation:**
- Thorough investigation phase
- Parallel run reveals dependencies
- Staged rollout (supplier by supplier if needed)
- Documentation of all integrations

---

## Success Metrics

### Technical Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Uptime | >99.5% | n8n execution logs |
| Sync Success Rate | >99% | sync_logs table |
| Average Sync Time | <5 min | sync_logs duration |
| Error Rate | <1% | sync_errors count |
| Data Accuracy | 100% | Validation queries |
| Query Performance | <50ms | Explain analyze |

### Business Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Cost Reduction | >70% | AWS vs Supabase bills |
| Maintenance Time | -50% | Hours spent on system |
| Time to Fix Issues | <1 hour | Incident logs |
| Stakeholder Satisfaction | Positive feedback | Survey |

### Migration Timeline Metrics

| Phase | Target Duration | Actual Duration |
|-------|----------------|-----------------|
| Investigation | 3 days | _____ |
| Supabase Setup | 3 days | _____ |
| n8n Development | 7 days | _____ |
| Testing | 7 days | _____ |
| Cutover | 1 day | _____ |
| Monitoring | 7 days | _____ |
| **Total** | **28 days** | **_____** |

---

## Emergency Contacts

**During Migration (24/7 availability):**

- **Project Lead:** _________________
  - Email: _________________
  - Phone: _________________
  - Slack: _________________

- **Technical Support:**
  - Supabase Support: support@supabase.io
  - n8n Support: support@n8n.io
  - BigCommerce: support.bigcommerce.com

**Escalation Path:**
1. Check runbook for known issues
2. Review error logs and sync_errors table
3. Check Slack #boo-migration channel
4. Contact project lead
5. Execute rollback if critical

---

## Appendix: Quick Reference Commands

### Supabase

```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Check recent syncs
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10;

# Check errors
SELECT * FROM sync_errors WHERE occurred_at > NOW() - INTERVAL '24 hours';

# Product counts
SELECT
  'oborne' as supplier, COUNT(*) FROM oborne_products
UNION ALL
SELECT 'kadac', COUNT(*) FROM kadac_products
UNION ALL
SELECT 'uhp', COUNT(*) FROM uhp_products
UNION ALL
SELECT 'globalnature', COUNT(*) FROM globalnature_products;
```

### n8n

```bash
# Check workflow status (via API)
curl -X GET https://[YOUR-N8N].app.n8n.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: [API-KEY]"

# Trigger workflow manually
curl -X POST https://[YOUR-N8N].app.n8n.cloud/api/v1/workflows/[ID]/activate \
  -H "X-N8N-API-KEY: [API-KEY]"
```

### Production Server

```bash
# SSH
ssh user@dev.growthcohq.com

# Check old system status
ps aux | grep fyic
systemctl status fyic-portal

# View logs
journalctl -u fyic-portal -f
tail -f /var/log/fyic-portal.log
```

---

## Checklist Summary

**Phase 1: Investigation** ☐ Not Started / ⏳ In Progress / ✅ Complete
- [ ] Server access & process verification
- [ ] Environment variables extracted
- [ ] Database comparison completed
- [ ] API credentials tested
- [ ] Product update mechanism identified

**Phase 2: Supabase Setup** ☐ Not Started / ⏳ In Progress / ✅ Complete
- [ ] Supabase project created
- [ ] Database schema converted & created
- [ ] Indexes created
- [ ] Row Level Security implemented
- [ ] Test data imported successfully

**Phase 3: n8n Development** ☐ Not Started / ⏳ In Progress / ✅ Complete
- [ ] n8n instance set up
- [ ] All credentials configured
- [ ] Oborne FTP workflow complete
- [ ] Kadac API workflow complete
- [ ] UHP HTTPS workflow complete
- [ ] GlobalNature email workflow complete
- [ ] Stock history workflow complete
- [ ] Daily reports workflow complete
- [ ] Error handling implemented

**Phase 4: Testing** ☐ Not Started / ⏳ In Progress / ✅ Complete
- [ ] Parallel run for 7 days
- [ ] Data validation passing
- [ ] Performance testing complete
- [ ] Error scenarios tested

**Phase 5: Cutover** ☐ Not Started / ⏳ In Progress / ✅ Complete
- [ ] Cutover runbook created
- [ ] Rollback plan tested
- [ ] Stakeholder communication sent
- [ ] Cutover executed successfully

**Phase 6: Post-Migration** ☐ Not Started / ⏳ In Progress / ✅ Complete
- [ ] 7-day monitoring complete
- [ ] Performance optimizations done
- [ ] Documentation finalized
- [ ] Old system decommissioned (after 30 days)

---

**Document Status:** Complete
**Last Updated:** November 24, 2025
**Next Review:** After Phase 1 completion
**Estimated Total Time:** 28-56 days (depending on path chosen)
