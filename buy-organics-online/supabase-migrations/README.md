# Supabase Database Migrations - Buy Organics Online

## Quick Start

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

2. **Run migrations in order:**
   - `001_create_ecommerce_products.sql` - BigCommerce products table
   - `002_create_supplier_products.sql` - Supplier products table
   - `003_create_product_supplier_links.sql` - Product-supplier linking table
   - `004_create_helper_tables.sql` - Automation logs, pricing rules, audit trails

3. **Verify installation:**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Expected tables:
   -- - ecommerce_products
   -- - supplier_products
   -- - product_supplier_links
   -- - automation_logs
   -- - pricing_rules
   -- - supplier_priority_changes
   -- - sync_history
   ```

## Database Schema Overview

### Core Tables

**ecommerce_products**
- Stores all BigCommerce product data
- Primary key: `id` (UUID)
- Unique constraint: `sku`
- Indexes: sku, barcode, gtin, upc, product_id

**supplier_products**
- Stores all supplier product data (Oborne, UHP, Kadac)
- Primary key: `id` (UUID)
- Unique constraint: `(supplier_name, supplier_sku)`
- Indexes: barcode, supplier_name, (supplier_name + supplier_sku)

**product_supplier_links**
- Many-to-many relationship between ecommerce and supplier products
- Supports multiple suppliers per product
- Tracks active supplier and priority order
- Constraint: Only ONE active supplier per ecommerce product

### Helper Tables

**automation_logs**
- Tracks all n8n workflow executions
- Used for monitoring and debugging

**pricing_rules**
- Configurable pricing formulas
- Pre-populated with BOO pricing rules:
  1. Carton Only: `price = moq * rrp`
  2. Default Markup: `price = cost * 1.4`
  3. Supplier Discounts: Oborne (7%), Kadac (10%), UHP (10%)

**supplier_priority_changes**
- Audit log of supplier priority changes
- Tracks who changed what and when

**sync_history**
- Tracks last successful sync times
- Monitors sync status for all integrations

## Useful Views

**products_with_multiple_suppliers**
- Shows products that have more than one supplier
- Use for manual review and priority setting

**products_without_supplier**
- Shows products with no supplier links
- Potential stock availability issues

**active_product_supplier_pairs**
- Shows all products with their active supplier details
- Includes pricing and stock information

**recent_automation_activity**
- Last 100 workflow executions
- Use for monitoring dashboard

## Sample Queries

### Check product-supplier matches
```sql
SELECT
  e.sku,
  e.name,
  COUNT(l.id) as supplier_count,
  ARRAY_AGG(s.supplier_name) as suppliers
FROM ecommerce_products e
LEFT JOIN product_supplier_links l ON e.id = l.ecommerce_product_id
LEFT JOIN supplier_products s ON l.supplier_product_id = s.id
GROUP BY e.sku, e.name
ORDER BY supplier_count DESC
LIMIT 20;
```

### Find products with barcode but no supplier match
```sql
SELECT
  e.sku,
  e.name,
  e.barcode
FROM ecommerce_products e
WHERE e.barcode IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM product_supplier_links l WHERE l.ecommerce_product_id = e.id
);
```

### Check supplier stock levels
```sql
SELECT
  supplier_name,
  COUNT(*) as total_products,
  SUM(CASE WHEN stock_level > 0 THEN 1 ELSE 0 END) as in_stock,
  SUM(CASE WHEN stock_level = 0 THEN 1 ELSE 0 END) as out_of_stock
FROM supplier_products
GROUP BY supplier_name;
```

## Next Steps

After running migrations:
1. Build n8n workflows to populate data
2. Sync BigCommerce products → ecommerce_products
3. Sync supplier data → supplier_products
4. Run product linking workflow → product_supplier_links
5. Build management UI for supplier priority management
