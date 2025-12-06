-- ============================================================================
-- Unleashed Typed Tables (Phase 1)
-- Created: 2025-12-06
-- Purpose: Typed tables designed from Phase 0 discovery analysis
-- Note: All tables include raw_data JSONB to preserve full API response
-- ============================================================================

-- =============================================================================
-- PRODUCTS
-- Based on discovery: 56 fields at ≥90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_description TEXT,

  -- Pricing
  default_sell_price DECIMAL(20,4) DEFAULT 0,
  default_purchase_price DECIMAL(20,4) DEFAULT 0,
  average_land_price DECIMAL(20,4) DEFAULT 0,

  -- Flags
  is_sellable BOOLEAN DEFAULT true,
  is_purchasable BOOLEAN DEFAULT true,
  is_assembled_product BOOLEAN DEFAULT false,
  is_component BOOLEAN DEFAULT false,
  is_batch_tracked BOOLEAN DEFAULT false,
  is_serialized BOOLEAN DEFAULT false,
  obsolete BOOLEAN DEFAULT false,
  never_diminishing BOOLEAN DEFAULT false,
  taxable_sales BOOLEAN DEFAULT true,
  taxable_purchase BOOLEAN DEFAULT true,

  -- Product Group (denormalized)
  product_group_guid TEXT,
  product_group_name TEXT,

  -- Unit of Measure (denormalized)
  unit_of_measure_guid TEXT,
  unit_of_measure_name TEXT,

  -- Supplier (denormalized - primary supplier)
  supplier_guid TEXT,
  supplier_code TEXT,
  supplier_name TEXT,
  supplier_product_price DECIMAL(20,4),

  -- Audit
  created_by TEXT,
  created_on TIMESTAMPTZ,
  last_modified_by TEXT,
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_products_store ON ul_products(store);
CREATE INDEX IF NOT EXISTS idx_ul_products_code ON ul_products(store, product_code);
CREATE INDEX IF NOT EXISTS idx_ul_products_group ON ul_products(store, product_group_guid);
CREATE INDEX IF NOT EXISTS idx_ul_products_supplier ON ul_products(store, supplier_guid);

-- =============================================================================
-- STOCK ON HAND
-- Based on discovery: 12 fields at ≥90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_stock_on_hand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Product reference
  product_guid TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_description TEXT,
  product_group_name TEXT,

  -- Stock quantities
  qty_on_hand DECIMAL(20,4) DEFAULT 0,
  available_qty DECIMAL(20,4) DEFAULT 0,
  allocated_qty DECIMAL(20,4) DEFAULT 0,
  on_purchase DECIMAL(20,4) DEFAULT 0,

  -- Costing
  avg_cost DECIMAL(20,4) DEFAULT 0,
  total_cost DECIMAL(20,4) DEFAULT 0,

  -- Warehouse (if available)
  warehouse_guid TEXT,
  warehouse_code TEXT,
  warehouse_name TEXT,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, product_guid, warehouse_guid)
);

-- Handle NULL warehouse_guid with a unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_ul_stock_unique ON ul_stock_on_hand(store, product_guid, COALESCE(warehouse_guid, ''));

CREATE INDEX IF NOT EXISTS idx_ul_stock_store ON ul_stock_on_hand(store);
CREATE INDEX IF NOT EXISTS idx_ul_stock_product ON ul_stock_on_hand(store, product_code);
CREATE INDEX IF NOT EXISTS idx_ul_stock_warehouse ON ul_stock_on_hand(store, warehouse_guid);
CREATE INDEX IF NOT EXISTS idx_ul_stock_available ON ul_stock_on_hand(store, available_qty);

-- =============================================================================
-- CUSTOMERS
-- Based on discovery: 32 fields at ≥90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,

  -- Contact info
  email TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  phone TEXT,
  mobile TEXT,

  -- Xero integration
  xero_contact_id TEXT,
  xero_sales_account TEXT,

  -- Currency
  currency_guid TEXT,
  currency_code TEXT,

  -- Status flags
  obsolete BOOLEAN DEFAULT false,
  taxable BOOLEAN DEFAULT true,
  stop_credit BOOLEAN DEFAULT false,
  has_credit_limit BOOLEAN DEFAULT false,
  credit_limit DECIMAL(20,4),

  -- Audit
  created_by TEXT,
  created_on TIMESTAMPTZ,
  last_modified_by TEXT,
  last_modified_on TIMESTAMPTZ,

  -- Full API response (includes Addresses[], Contacts[])
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_customers_store ON ul_customers(store);
CREATE INDEX IF NOT EXISTS idx_ul_customers_code ON ul_customers(store, customer_code);
CREATE INDEX IF NOT EXISTS idx_ul_customers_email ON ul_customers(store, email);
CREATE INDEX IF NOT EXISTS idx_ul_customers_xero ON ul_customers(store, xero_contact_id);

-- =============================================================================
-- SALES ORDERS
-- Based on discovery: 83 fields at ≥90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_status TEXT,

  -- Dates
  order_date TIMESTAMPTZ,
  required_date TIMESTAMPTZ,
  payment_due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,

  -- Customer (denormalized)
  customer_guid TEXT,
  customer_code TEXT,
  customer_name TEXT,

  -- Delivery contact
  delivery_email TEXT,
  delivery_first_name TEXT,

  -- Warehouse
  warehouse_guid TEXT,
  warehouse_code TEXT,
  warehouse_name TEXT,

  -- Currency
  currency_guid TEXT,
  currency_code TEXT,
  exchange_rate DECIMAL(20,6) DEFAULT 1,

  -- Amounts (base currency)
  sub_total DECIMAL(20,4) DEFAULT 0,
  tax_total DECIMAL(20,4) DEFAULT 0,
  total DECIMAL(20,4) DEFAULT 0,
  discount_rate DECIMAL(10,4) DEFAULT 0,

  -- BC amounts (business currency)
  bc_sub_total DECIMAL(20,4) DEFAULT 0,
  bc_tax_total DECIMAL(20,4) DEFAULT 0,
  bc_total DECIMAL(20,4) DEFAULT 0,

  -- Tax
  tax_rate DECIMAL(10,4) DEFAULT 0,
  xero_tax_code TEXT,

  -- Shipping
  total_weight DECIMAL(20,4) DEFAULT 0,
  total_volume DECIMAL(20,4) DEFAULT 0,

  -- Source tracking
  created_by TEXT,
  created_on TIMESTAMPTZ,
  last_modified_by TEXT,
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_sales_orders_store ON ul_sales_orders(store);
CREATE INDEX IF NOT EXISTS idx_ul_sales_orders_number ON ul_sales_orders(store, order_number);
CREATE INDEX IF NOT EXISTS idx_ul_sales_orders_customer ON ul_sales_orders(store, customer_guid);
CREATE INDEX IF NOT EXISTS idx_ul_sales_orders_date ON ul_sales_orders(store, order_date);
CREATE INDEX IF NOT EXISTS idx_ul_sales_orders_status ON ul_sales_orders(store, order_status);

-- =============================================================================
-- SALES ORDER LINES
-- Extracted from SalesOrders.SalesOrderLines[]
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Parent reference
  sales_order_id UUID REFERENCES ul_sales_orders(id) ON DELETE CASCADE,
  sales_order_guid TEXT NOT NULL,

  -- Line identifiers
  guid TEXT NOT NULL,
  line_number INTEGER,

  -- Product
  product_guid TEXT,
  product_code TEXT,
  product_description TEXT,

  -- Quantities
  order_quantity DECIMAL(20,4) DEFAULT 0,
  shipped_quantity DECIMAL(20,4) DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(20,4) DEFAULT 0,
  discount_rate DECIMAL(10,4) DEFAULT 0,
  line_total DECIMAL(20,4) DEFAULT 0,
  line_tax DECIMAL(20,4) DEFAULT 0,

  -- BC amounts
  bc_unit_price DECIMAL(20,4) DEFAULT 0,
  bc_line_total DECIMAL(20,4) DEFAULT 0,
  bc_line_tax DECIMAL(20,4) DEFAULT 0,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_so_lines_store ON ul_sales_order_lines(store);
CREATE INDEX IF NOT EXISTS idx_ul_so_lines_order ON ul_sales_order_lines(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_ul_so_lines_product ON ul_sales_order_lines(store, product_code);

-- =============================================================================
-- INVOICES
-- Based on discovery: 50 fields at ≥90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  order_number TEXT,
  invoice_status TEXT,

  -- Dates
  invoice_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,

  -- Customer (denormalized)
  customer_guid TEXT,
  customer_code TEXT,
  customer_name TEXT,

  -- Currency
  currency_guid TEXT,
  currency_code TEXT,
  exchange_rate DECIMAL(20,6) DEFAULT 1,

  -- Amounts
  sub_total DECIMAL(20,4) DEFAULT 0,
  tax_total DECIMAL(20,4) DEFAULT 0,
  total DECIMAL(20,4) DEFAULT 0,

  -- BC amounts
  bc_sub_total DECIMAL(20,4) DEFAULT 0,
  bc_tax_total DECIMAL(20,4) DEFAULT 0,
  bc_total DECIMAL(20,4) DEFAULT 0,

  -- Payment
  payment_received BOOLEAN DEFAULT false,

  -- Addresses (denormalized key fields)
  postal_address_city TEXT,
  postal_address_country TEXT,
  postal_address_postal_code TEXT,
  postal_address_region TEXT,
  postal_address_street TEXT,

  -- Audit
  created_by TEXT,
  last_modified_by TEXT,
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_invoices_store ON ul_invoices(store);
CREATE INDEX IF NOT EXISTS idx_ul_invoices_number ON ul_invoices(store, invoice_number);
CREATE INDEX IF NOT EXISTS idx_ul_invoices_order ON ul_invoices(store, order_number);
CREATE INDEX IF NOT EXISTS idx_ul_invoices_customer ON ul_invoices(store, customer_guid);
CREATE INDEX IF NOT EXISTS idx_ul_invoices_date ON ul_invoices(store, invoice_date);

-- =============================================================================
-- INVOICE LINES
-- Extracted from Invoices.InvoiceLines[]
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Parent reference
  invoice_id UUID REFERENCES ul_invoices(id) ON DELETE CASCADE,
  invoice_guid TEXT NOT NULL,

  -- Line identifiers
  guid TEXT NOT NULL,
  line_number INTEGER,

  -- Product
  product_guid TEXT,
  product_code TEXT,
  product_description TEXT,

  -- Quantities
  invoice_quantity DECIMAL(20,4) DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(20,4) DEFAULT 0,
  discount_rate DECIMAL(10,4) DEFAULT 0,
  line_total DECIMAL(20,4) DEFAULT 0,
  line_tax DECIMAL(20,4) DEFAULT 0,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_inv_lines_store ON ul_invoice_lines(store);
CREATE INDEX IF NOT EXISTS idx_ul_inv_lines_invoice ON ul_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ul_inv_lines_product ON ul_invoice_lines(store, product_code);

-- =============================================================================
-- SUPPLIERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  supplier_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,

  -- Contact info
  email TEXT,
  phone TEXT,
  mobile TEXT,
  contact_name TEXT,

  -- Currency
  currency_guid TEXT,
  currency_code TEXT,

  -- Status
  obsolete BOOLEAN DEFAULT false,

  -- Audit
  created_by TEXT,
  created_on TIMESTAMPTZ,
  last_modified_by TEXT,
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_suppliers_store ON ul_suppliers(store);
CREATE INDEX IF NOT EXISTS idx_ul_suppliers_code ON ul_suppliers(store, supplier_code);

-- =============================================================================
-- PURCHASE ORDERS
-- Based on discovery: 84 fields at ≥90% population
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_status TEXT,

  -- Dates
  order_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  supplier_invoice_date TIMESTAMPTZ,

  -- Supplier (denormalized)
  supplier_guid TEXT,
  supplier_code TEXT,
  supplier_name TEXT,

  -- Warehouse
  warehouse_guid TEXT,
  warehouse_code TEXT,
  warehouse_name TEXT,

  -- Currency
  currency_guid TEXT,
  currency_code TEXT,
  exchange_rate DECIMAL(20,6) DEFAULT 1,

  -- Amounts
  sub_total DECIMAL(20,4) DEFAULT 0,
  tax_total DECIMAL(20,4) DEFAULT 0,
  total DECIMAL(20,4) DEFAULT 0,
  discount_rate DECIMAL(10,4) DEFAULT 0,

  -- BC amounts
  bc_sub_total DECIMAL(20,4) DEFAULT 0,
  bc_tax_total DECIMAL(20,4) DEFAULT 0,
  bc_total DECIMAL(20,4) DEFAULT 0,

  -- Tax
  tax_code TEXT,
  tax_rate DECIMAL(10,4) DEFAULT 0,
  xero_tax_code TEXT,

  -- Shipping
  total_weight DECIMAL(20,4) DEFAULT 0,
  total_volume DECIMAL(20,4) DEFAULT 0,

  -- Audit
  created_by TEXT,
  created_on TIMESTAMPTZ,
  last_modified_by TEXT,
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_po_store ON ul_purchase_orders(store);
CREATE INDEX IF NOT EXISTS idx_ul_po_number ON ul_purchase_orders(store, order_number);
CREATE INDEX IF NOT EXISTS idx_ul_po_supplier ON ul_purchase_orders(store, supplier_guid);
CREATE INDEX IF NOT EXISTS idx_ul_po_date ON ul_purchase_orders(store, order_date);
CREATE INDEX IF NOT EXISTS idx_ul_po_status ON ul_purchase_orders(store, order_status);

-- =============================================================================
-- PURCHASE ORDER LINES
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Parent reference
  purchase_order_id UUID REFERENCES ul_purchase_orders(id) ON DELETE CASCADE,
  purchase_order_guid TEXT NOT NULL,

  -- Line identifiers
  guid TEXT NOT NULL,
  line_number INTEGER,

  -- Product
  product_guid TEXT,
  product_code TEXT,
  product_description TEXT,

  -- Quantities
  order_quantity DECIMAL(20,4) DEFAULT 0,
  received_quantity DECIMAL(20,4) DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(20,4) DEFAULT 0,
  discount_rate DECIMAL(10,4) DEFAULT 0,
  line_total DECIMAL(20,4) DEFAULT 0,
  line_tax DECIMAL(20,4) DEFAULT 0,

  -- BC amounts
  bc_unit_price DECIMAL(20,4) DEFAULT 0,
  bc_line_total DECIMAL(20,4) DEFAULT 0,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_po_lines_store ON ul_purchase_order_lines(store);
CREATE INDEX IF NOT EXISTS idx_ul_po_lines_order ON ul_purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_ul_po_lines_product ON ul_purchase_order_lines(store, product_code);

-- =============================================================================
-- WAREHOUSES
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  warehouse_code TEXT NOT NULL,
  warehouse_name TEXT,

  -- Address
  address_line1 TEXT,
  street_no TEXT,
  suburb TEXT,
  city TEXT,
  region TEXT,
  post_code TEXT,
  country TEXT,

  -- Contact
  contact_name TEXT,
  ddi_number TEXT,

  -- Status
  is_default BOOLEAN DEFAULT false,
  obsolete BOOLEAN DEFAULT false,

  -- Audit
  last_modified_on TIMESTAMPTZ,

  -- Full API response
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_warehouses_store ON ul_warehouses(store);
CREATE INDEX IF NOT EXISTS idx_ul_warehouses_code ON ul_warehouses(store, warehouse_code);

-- =============================================================================
-- BILL OF MATERIALS
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Product this BOM is for
  product_guid TEXT NOT NULL,
  product_code TEXT,
  product_description TEXT,

  -- Audit
  created_on TIMESTAMPTZ,
  last_modified_on TIMESTAMPTZ,

  -- Full API response (includes BillOfMaterialsLines[])
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, product_guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_bom_store ON ul_bill_of_materials(store);
CREATE INDEX IF NOT EXISTS idx_ul_bom_product ON ul_bill_of_materials(store, product_code);

-- =============================================================================
-- BOM LINES (Components)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Parent reference
  bom_id UUID REFERENCES ul_bill_of_materials(id) ON DELETE CASCADE,
  parent_product_guid TEXT NOT NULL,

  -- Line identifiers
  guid TEXT NOT NULL,

  -- Component product
  component_product_guid TEXT,
  component_product_code TEXT,
  component_product_description TEXT,

  -- Quantity & Cost
  quantity DECIMAL(20,4) DEFAULT 0,
  wastage DECIMAL(10,4) DEFAULT 0,
  line_total_cost DECIMAL(20,4) DEFAULT 0,

  -- Audit
  created_on TIMESTAMPTZ,
  last_modified_on TIMESTAMPTZ,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_bom_lines_store ON ul_bom_lines(store);
CREATE INDEX IF NOT EXISTS idx_ul_bom_lines_bom ON ul_bom_lines(bom_id);
CREATE INDEX IF NOT EXISTS idx_ul_bom_lines_component ON ul_bom_lines(store, component_product_code);

-- =============================================================================
-- STOCK ADJUSTMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Core identifiers
  guid TEXT NOT NULL,
  adjustment_number TEXT,
  adjustment_reason TEXT,
  adjustment_status TEXT,

  -- Date
  adjustment_date TIMESTAMPTZ,

  -- Warehouse
  warehouse_guid TEXT,
  warehouse_code TEXT,

  -- Audit
  created_by TEXT,
  created_on TIMESTAMPTZ,
  last_modified_by TEXT,
  last_modified_on TIMESTAMPTZ,

  -- Full API response (includes StockAdjustmentLines[])
  raw_data JSONB NOT NULL,

  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, guid)
);

CREATE INDEX IF NOT EXISTS idx_ul_adjustments_store ON ul_stock_adjustments(store);
CREATE INDEX IF NOT EXISTS idx_ul_adjustments_date ON ul_stock_adjustments(store, adjustment_date);

-- =============================================================================
-- SYNC TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Run info
  sync_type TEXT NOT NULL,  -- 'full', 'incremental', 'stock', 'orders'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',  -- 'running', 'completed', 'failed', 'partial'

  -- Tables synced
  tables_synced TEXT[],

  -- Statistics
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Errors
  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ul_sync_runs_store ON ul_sync_runs(store);
CREATE INDEX IF NOT EXISTS idx_ul_sync_runs_status ON ul_sync_runs(status);

-- =============================================================================
-- COMPARISON / ACCURACY TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS ul_accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Date for this metric
  metric_date DATE NOT NULL,

  -- Inventory accuracy
  total_skus INTEGER DEFAULT 0,
  matching_skus INTEGER DEFAULT 0,
  mismatched_skus INTEGER DEFAULT 0,
  missing_in_unleashed INTEGER DEFAULT 0,
  missing_in_shopify INTEGER DEFAULT 0,

  -- Quantity accuracy
  qty_accuracy_pct DECIMAL(5,2),
  qty_total_variance DECIMAL(20,4) DEFAULT 0,

  -- Value accuracy
  value_accuracy_pct DECIMAL(5,2),
  value_total_variance DECIMAL(20,4) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_ul_accuracy_store ON ul_accuracy_metrics(store);
CREATE INDEX IF NOT EXISTS idx_ul_accuracy_date ON ul_accuracy_metrics(metric_date);

CREATE TABLE IF NOT EXISTS ul_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,

  -- Product
  product_code TEXT NOT NULL,
  product_guid TEXT,

  -- Discrepancy details
  discrepancy_type TEXT NOT NULL,  -- 'quantity', 'cost', 'missing_unleashed', 'missing_shopify'
  severity TEXT DEFAULT 'medium',  -- 'critical', 'high', 'medium', 'low'

  -- Values
  unleashed_value DECIMAL(20,4),
  shopify_value DECIMAL(20,4),
  variance DECIMAL(20,4),
  variance_pct DECIMAL(10,2),

  -- Resolution
  status TEXT DEFAULT 'open',  -- 'open', 'investigating', 'resolved', 'ignored'
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ul_discrepancies_store ON ul_discrepancies(store);
CREATE INDEX IF NOT EXISTS idx_ul_discrepancies_product ON ul_discrepancies(store, product_code);
CREATE INDEX IF NOT EXISTS idx_ul_discrepancies_status ON ul_discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_ul_discrepancies_severity ON ul_discrepancies(severity);

-- =============================================================================
-- USEFUL VIEWS
-- =============================================================================

-- View: Current stock summary
CREATE OR REPLACE VIEW v_ul_stock_summary AS
SELECT
  store,
  COUNT(*) as total_products,
  SUM(CASE WHEN qty_on_hand > 0 THEN 1 ELSE 0 END) as in_stock,
  SUM(CASE WHEN qty_on_hand = 0 THEN 1 ELSE 0 END) as out_of_stock,
  SUM(CASE WHEN qty_on_hand < 0 THEN 1 ELSE 0 END) as negative_stock,
  SUM(qty_on_hand) as total_qty,
  SUM(total_cost) as total_value
FROM ul_stock_on_hand
GROUP BY store;

-- View: Recent orders summary
CREATE OR REPLACE VIEW v_ul_orders_summary AS
SELECT
  store,
  DATE(order_date) as order_day,
  COUNT(*) as order_count,
  SUM(total) as total_revenue,
  AVG(total) as avg_order_value
FROM ul_sales_orders
WHERE order_date >= NOW() - INTERVAL '30 days'
GROUP BY store, DATE(order_date)
ORDER BY store, order_day DESC;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE ul_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_stock_on_hand ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_accuracy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ul_discrepancies ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to ul_products" ON ul_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_stock_on_hand" ON ul_stock_on_hand FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_customers" ON ul_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_sales_orders" ON ul_sales_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_sales_order_lines" ON ul_sales_order_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_invoices" ON ul_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_invoice_lines" ON ul_invoice_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_suppliers" ON ul_suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_purchase_orders" ON ul_purchase_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_purchase_order_lines" ON ul_purchase_order_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_warehouses" ON ul_warehouses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_bill_of_materials" ON ul_bill_of_materials FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_bom_lines" ON ul_bom_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_stock_adjustments" ON ul_stock_adjustments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_sync_runs" ON ul_sync_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_accuracy_metrics" ON ul_accuracy_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ul_discrepancies" ON ul_discrepancies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read access
CREATE POLICY "Authenticated read access to ul_products" ON ul_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_stock_on_hand" ON ul_stock_on_hand FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_customers" ON ul_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_sales_orders" ON ul_sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_sales_order_lines" ON ul_sales_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_invoices" ON ul_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_invoice_lines" ON ul_invoice_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_suppliers" ON ul_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_purchase_orders" ON ul_purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_purchase_order_lines" ON ul_purchase_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_warehouses" ON ul_warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_bill_of_materials" ON ul_bill_of_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_bom_lines" ON ul_bom_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_stock_adjustments" ON ul_stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_sync_runs" ON ul_sync_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_accuracy_metrics" ON ul_accuracy_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read access to ul_discrepancies" ON ul_discrepancies FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE ul_products IS 'Unleashed products with typed columns and raw_data JSONB for full API response';
COMMENT ON TABLE ul_stock_on_hand IS 'Current inventory levels from Unleashed';
COMMENT ON TABLE ul_customers IS 'Unleashed customer master data';
COMMENT ON TABLE ul_sales_orders IS 'Unleashed sales order headers';
COMMENT ON TABLE ul_sales_order_lines IS 'Unleashed sales order line items';
COMMENT ON TABLE ul_invoices IS 'Unleashed invoice headers';
COMMENT ON TABLE ul_invoice_lines IS 'Unleashed invoice line items';
COMMENT ON TABLE ul_suppliers IS 'Unleashed supplier master data';
COMMENT ON TABLE ul_purchase_orders IS 'Unleashed purchase order headers';
COMMENT ON TABLE ul_purchase_order_lines IS 'Unleashed purchase order line items';
COMMENT ON TABLE ul_warehouses IS 'Unleashed warehouse definitions';
COMMENT ON TABLE ul_bill_of_materials IS 'Unleashed BOM headers for assembled products';
COMMENT ON TABLE ul_bom_lines IS 'Unleashed BOM component lines';
COMMENT ON TABLE ul_stock_adjustments IS 'Unleashed manual stock adjustments';
COMMENT ON TABLE ul_sync_runs IS 'Tracking of Unleashed sync operations';
COMMENT ON TABLE ul_accuracy_metrics IS 'Daily accuracy metrics comparing Unleashed to Shopify';
COMMENT ON TABLE ul_discrepancies IS 'Tracked inventory discrepancies between systems';
