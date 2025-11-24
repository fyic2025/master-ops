# SUPABASE SETUP GUIDE

**Date:** 2025-11-24
**Purpose:** Apply schema and set up Supabase for BOO migration
**Database:** BOO Supabase (usibnysqelovfuctmkqw)

---

## 📋 OVERVIEW

This guide will help you apply the new Supabase schema for Buy Organics Online.

**Schema includes:**
- 14 core tables (bc_products, supplier tables, orders, etc.)
- Pricing rules system (dynamic % below RRP)
- Product matching system
- Stock history tracking (90-day retention)
- Sync logging
- Helpful views for reporting
- Row Level Security (RLS) policies

---

## 🚀 QUICK START

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql
   - Login with your Supabase credentials

2. **Load the schema file**
   - Open the file: `supabase-schema.sql`
   - Copy all contents (Ctrl+A, Ctrl+C)

3. **Paste and run**
   - Paste into the SQL Editor (Ctrl+V)
   - Click "Run" or press Ctrl+Enter

4. **Verify success**
   - Check for success messages in the output panel
   - Go to Table Editor to see your new tables
   - Should see: bc_products, oborne_products, uhp_products, kadac_products, etc.

### Method 2: Command Line (psql)

If you have PostgreSQL's `psql` client installed:

```bash
# Navigate to the directory
cd C:\Users\jayso\master-ops\buy-organics-online

# Apply schema using psql
psql "postgresql://postgres.usibnysqelovfuctmkqw:Welcome1A20301qaz@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres" -f supabase-schema.sql
```

Or use the connection string from .env:

```bash
psql $BOO_SUPABASE_CONNECTION_STRING -f supabase-schema.sql
```

---

## ✅ VERIFICATION STEPS

After applying the schema, verify everything is set up correctly:

### 1. Check Tables Exist

Run this SQL in the Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected output:** Should list 14 tables:
- bc_orders
- bc_products
- kadac_products
- kik_products
- klaviyo_profiles
- oborne_products
- pricing_rules
- product_matching_rules
- schema_version
- stock_history
- sync_logs
- uhp_products

### 2. Check Views Exist

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected output:**
- v_low_stock_products
- v_unmatched_bc_products
- v_unmatched_supplier_products

### 3. Check Default Pricing Rule

```sql
SELECT * FROM pricing_rules;
```

**Expected output:** 1 row with "Default 8% below RRP" rule

### 4. Check Schema Version

```sql
SELECT * FROM schema_version ORDER BY applied_at DESC LIMIT 1;
```

**Expected output:** Version 1.0.0

### 5. Test Triggers

```sql
-- Create a test product
INSERT INTO bc_products (bc_product_id, sku, name, price)
VALUES (999999, 'TEST-SKU', 'Test Product', 10.00);

-- Check updated_at was set
SELECT id, name, created_at, updated_at FROM bc_products WHERE sku = 'TEST-SKU';

-- Update it
UPDATE bc_products SET name = 'Test Product Updated' WHERE sku = 'TEST-SKU';

-- Check updated_at changed
SELECT id, name, created_at, updated_at FROM bc_products WHERE sku = 'TEST-SKU';

-- Clean up
DELETE FROM bc_products WHERE sku = 'TEST-SKU';
```

**Expected:** updated_at should change on update, but created_at stays the same

---

## 📊 SCHEMA OVERVIEW

### Core Tables

| Table | Purpose | Estimated Size |
|-------|---------|----------------|
| `bc_products` | BigCommerce product catalog | 11,357 rows |
| `oborne_products` | Oborne supplier feed | 8,570 rows |
| `uhp_products` | UHP supplier feed | 4,501 rows |
| `kadac_products` | Kadac supplier feed | 945 rows |
| `kik_products` | Kikai/Elevate supplier feed | 424 rows |
| `pricing_rules` | Dynamic pricing configuration | ~10 rows |
| `product_matching_rules` | Matching algorithm config | ~5 rows |
| `sync_logs` | Sync execution history | Grows daily |
| `stock_history` | Stock level changes (90d) | Grows daily |
| `bc_orders` | Historical orders | 157,126 rows |
| `klaviyo_profiles` | Email marketing profiles | 36,938 rows |
| `schema_version` | Database version tracking | 1 row |

### Key Features

**1. Flexible Product Matching**
- Match by barcode (highest confidence)
- Match by SKU (medium confidence)
- Fuzzy name matching (lowest confidence)
- Manual overrides supported

**2. Dynamic Pricing**
- Percentage below RRP (e.g., 8% default)
- Never price below cost
- Supplier-level rules
- Brand-level rules
- Product-level overrides
- Priority system for rule conflicts

**3. Stock Management**
- Auto-sync from supplier feeds
- 1000/0 inventory levels
- Manual override support
- 90-day history tracking
- Low stock alerts

**4. Reporting Views**
- Unmatched BC products (need stock count)
- Unmatched supplier products (approval queue)
- Low stock products

---

## 🔧 TROUBLESHOOTING

### Issue: "permission denied for schema public"

**Solution:** You need service_role permissions. Use the service role key from .env:

```env
BOO_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue: "table already exists"

**Solution:** Schema was partially applied. Either:

1. **Drop and recreate (CAUTION - loses data!):**
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   -- Then re-run schema
   ```

2. **Skip existing tables:** Manually run only the CREATE TABLE statements that failed

### Issue: "extension does not exist"

**Solution:** Enable extensions first:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

Then re-run the schema.

### Issue: SQL syntax errors

**Solution:** PostgreSQL version mismatch. Check your Supabase PostgreSQL version:

```sql
SELECT version();
```

Expected: PostgreSQL 15+

---

## 📝 NEXT STEPS AFTER SCHEMA APPLICATION

Once the schema is applied successfully:

1. ✅ Schema applied
2. ⏭️ Load BigCommerce products (next script)
3. ⏭️ Load supplier feeds (Oborne, UHP, Kadac)
4. ⏭️ Run product matching algorithm
5. ⏭️ Generate match reports
6. ⏭️ Create n8n workflows

---

## 🔐 SECURITY NOTES

**Row Level Security (RLS):**
- All tables have RLS enabled
- Service role can access everything
- API/client access requires authenticated user
- Customize policies based on your needs

**Credentials:**
- Never commit .env files
- Use service role key for backend operations
- Use anon key for client-side operations
- Rotate keys if exposed

---

## 📚 USEFUL QUERIES

### Count all records

```sql
SELECT
  'bc_products' AS table_name,
  COUNT(*) AS row_count
FROM bc_products

UNION ALL

SELECT 'oborne_products', COUNT(*) FROM oborne_products
UNION ALL SELECT 'uhp_products', COUNT(*) FROM uhp_products
UNION ALL SELECT 'kadac_products', COUNT(*) FROM kadac_products
UNION ALL SELECT 'kik_products', COUNT(*) FROM kik_products
UNION ALL SELECT 'bc_orders', COUNT(*) FROM bc_orders
UNION ALL SELECT 'klaviyo_profiles', COUNT(*) FROM klaviyo_profiles
UNION ALL SELECT 'sync_logs', COUNT(*) FROM sync_logs
UNION ALL SELECT 'stock_history', COUNT(*) FROM stock_history

ORDER BY table_name;
```

### Check last sync times

```sql
SELECT
  sync_type,
  supplier_name,
  status,
  started_at,
  completed_at,
  records_processed,
  records_created,
  records_updated
FROM sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

### View unmatched products

```sql
-- BC products without supplier
SELECT * FROM v_unmatched_bc_products LIMIT 10;

-- Supplier products not in BC
SELECT * FROM v_unmatched_supplier_products LIMIT 10;
```

### Low stock alerts

```sql
SELECT * FROM v_low_stock_products LIMIT 20;
```

---

**Last Updated:** 2025-11-24
**Schema Version:** 1.0.0
**Status:** Ready to apply
