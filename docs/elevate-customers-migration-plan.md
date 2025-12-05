# Elevate Customers Dashboard - Data Migration Plan

## Executive Summary

Migrate the Elevate Customers Dashboard from live API calls (Shopify + Unleashed on every request) to a Supabase-backed architecture with unified, deduplicated customer and order data.

**Current Problems:**
1. Duplicate customers (same customer appearing 2-4 times)
2. Inaccurate date range filtering (3-month revenue wrong)
3. Slow page loads (hitting 2 APIs on every request)

**Solution:** Single source of truth in Supabase with scheduled sync jobs.

---

## Phase 1: Supabase Schema Design

### 1.1 New Tables Required

Create in: `/infra/supabase/migrations/YYYYMMDD_elevate_customers_unified.sql`

```sql
-- ============================================
-- ELEVATE UNIFIED CUSTOMERS TABLE
-- Single source of truth, deduplicated by email
-- ============================================
CREATE TABLE IF NOT EXISTS elevate_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Primary identifier (dedup key)
  email TEXT UNIQUE NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED,

  -- Customer details
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
  ) STORED,
  business_name TEXT,
  phone TEXT,

  -- Address
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',

  -- Integration IDs (for linking back to sources)
  shopify_customer_id TEXT,  -- e.g., "gid://shopify/Customer/123"
  unleashed_customer_code TEXT,
  unleashed_customer_guid TEXT,

  -- Shopify status
  shopify_state TEXT,  -- ENABLED, DISABLED, INVITED, etc.
  shopify_tags TEXT[],
  is_approved BOOLEAN DEFAULT false,  -- has 'approved' tag in Shopify

  -- Aggregated metrics (updated by sync job)
  total_orders INTEGER DEFAULT 0,
  total_spend DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,

  -- Brand breakdown (JSON for flexibility)
  brand_breakdown JSONB DEFAULT '{}',
  -- Format: {"Teelixir": {"amount": 1500.00, "order_count": 5}, "BOO": {...}}

  -- Source tracking
  primary_source TEXT DEFAULT 'shopify',  -- 'shopify' or 'unleashed'
  shopify_synced_at TIMESTAMPTZ,
  unleashed_synced_at TIMESTAMPTZ,
  metrics_calculated_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_elevate_customers_email_normalized ON elevate_customers(email_normalized);
CREATE INDEX idx_elevate_customers_shopify_id ON elevate_customers(shopify_customer_id);
CREATE INDEX idx_elevate_customers_unleashed_code ON elevate_customers(unleashed_customer_code);
CREATE INDEX idx_elevate_customers_is_approved ON elevate_customers(is_approved);
CREATE INDEX idx_elevate_customers_last_order ON elevate_customers(last_order_date DESC);
CREATE INDEX idx_elevate_customers_total_spend ON elevate_customers(total_spend DESC);

-- ============================================
-- ELEVATE ORDERS TABLE
-- All orders from both Shopify and Unleashed
-- ============================================
CREATE TABLE IF NOT EXISTS elevate_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to unified customer
  customer_id UUID REFERENCES elevate_customers(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,  -- Denormalized for quick lookups

  -- Order identifiers
  source TEXT NOT NULL,  -- 'shopify' or 'unleashed'
  source_order_id TEXT NOT NULL,  -- Shopify GID or Unleashed GUID
  order_number TEXT NOT NULL,

  -- Order details
  order_date TIMESTAMPTZ NOT NULL,
  order_status TEXT,

  -- Financials
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_total DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'AUD',

  -- Line items (stored as JSON)
  line_items JSONB DEFAULT '[]',
  -- Format: [{"title": "Product", "vendor": "Brand", "quantity": 2, "price": "10.00", "total": "20.00"}]

  -- Audit
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per source order
  UNIQUE(source, source_order_id)
);

-- Indexes for performance
CREATE INDEX idx_elevate_orders_customer ON elevate_orders(customer_id);
CREATE INDEX idx_elevate_orders_email ON elevate_orders(customer_email);
CREATE INDEX idx_elevate_orders_date ON elevate_orders(order_date DESC);
CREATE INDEX idx_elevate_orders_source ON elevate_orders(source);

-- ============================================
-- ELEVATE PRODUCTS TABLE (for brand lookup)
-- Already exists: elevate_products - may need ProductGroup added
-- ============================================
-- Check if ProductGroup column exists, add if not
ALTER TABLE elevate_products ADD COLUMN IF NOT EXISTS product_group TEXT;
CREATE INDEX IF NOT EXISTS idx_elevate_products_group ON elevate_products(product_group);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE elevate_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevate_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access customers" ON elevate_customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access orders" ON elevate_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read customers" ON elevate_customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read orders" ON elevate_orders
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_elevate_customers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_elevate_customers_timestamp
  BEFORE UPDATE ON elevate_customers
  FOR EACH ROW EXECUTE FUNCTION update_elevate_customers_timestamp();

-- ============================================
-- VIEW: Customer metrics with date filtering
-- ============================================
CREATE OR REPLACE VIEW elevate_customer_metrics AS
SELECT
  c.id,
  c.email,
  c.first_name,
  c.last_name,
  c.full_name,
  c.business_name,
  c.shopify_customer_id,
  c.unleashed_customer_code,
  c.shopify_state,
  c.shopify_tags,
  c.is_approved,
  c.total_orders,
  c.total_spend,
  c.avg_order_value,
  c.first_order_date,
  c.last_order_date,
  c.brand_breakdown,
  c.created_at
FROM elevate_customers c;
```

---

## Phase 2: Initial Data Sync Script

### 2.1 Sync Script Location

Create: `/infra/scripts/elevate-customer-sync.ts`

### 2.2 Sync Logic (Pseudocode)

```typescript
// Step 1: Fetch ALL Shopify customers with tag:approved
// - Store in Map by email (lowercase, trimmed)
// - This is ~100-500 customers, paginate at 100/page

// Step 2: Fetch ALL Unleashed products (for brand lookup)
// - Build Map<ProductCode, ProductGroup>
// - Cache in memory for order processing

// Step 3: Fetch ALL Unleashed orders (all statuses except Deleted)
// - No date filter - get everything
// - Group by Customer.CustomerCode
// - Extract customer info (name, email if available)

// Step 4: Deduplicate customers
// Primary key: email (lowercase, trimmed)
// For each Unleashed customer:
//   - If email exists, match to Shopify customer
//   - If no email, try fuzzy name match (but flag for review)
//   - Create unified customer record

// Step 5: Insert/Update elevate_customers table
// - UPSERT on email
// - Merge Shopify + Unleashed data:
//   - Shopify provides: customer_id, state, tags, is_approved
//   - Unleashed provides: customer_code, guid
//   - Both may provide: name, address, phone

// Step 6: Insert elevate_orders table
// - For each Unleashed order:
//   - Find customer by email or unleashed_customer_code
//   - Insert order with line items
//   - Include brand from product lookup

// Step 7: Calculate aggregated metrics
// - Run UPDATE query to calculate:
//   - total_orders (COUNT)
//   - total_spend (SUM)
//   - avg_order_value (total_spend / total_orders)
//   - first_order_date (MIN)
//   - last_order_date (MAX)
//   - brand_breakdown (aggregate from line items)
```

### 2.3 Full Sync Script

```typescript
// /infra/scripts/elevate-customer-sync.ts

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

const SHOPIFY_STORE = 'elevatewholesale.myshopify.com'
const SHOPIFY_API_VERSION = '2024-10'
const UNLEASHED_API_URL = 'https://api.unleashedsoftware.com'

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Unleashed auth
function generateUnleashedSignature(queryString: string, apiKey: string): string {
  const hmac = crypto.createHmac('sha256', apiKey)
  hmac.update(queryString)
  return hmac.digest('base64')
}

// Parse Unleashed date format /Date(timestamp)/
function parseUnleashedDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) return new Date(parseInt(match[1]))
  return new Date(dateStr)
}

interface ShopifyCustomer {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  state: string
  tags: string[]
  createdAt: string
}

interface UnleashedOrder {
  Guid: string
  OrderNumber: string
  OrderStatus: string
  OrderDate: string
  Customer: {
    CustomerCode: string
    CustomerName: string
    Email?: string
    Guid?: string
  }
  SubTotal: number
  TaxTotal: number
  Total: number
  SalesOrderLines?: Array<{
    Product: { ProductCode: string; ProductDescription?: string }
    OrderQuantity: number
    UnitPrice: number
    LineTotal: number
  }>
}

async function fetchAllShopifyCustomers(): Promise<Map<string, ShopifyCustomer>> {
  const token = process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN!
  const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`

  const customersByEmail = new Map<string, ShopifyCustomer>()
  let cursor: string | null = null
  let hasNextPage = true

  const query = `
    query getCustomers($cursor: String) {
      customers(first: 100, after: $cursor, query: "tag:approved") {
        pageInfo { hasNextPage, endCursor }
        edges {
          node {
            id, email, firstName, lastName, state, tags, createdAt
          }
        }
      }
    }
  `

  while (hasNextPage) {
    const resp = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: { cursor } })
    })

    const data = await resp.json()
    const customers = data.data?.customers?.edges || []

    for (const { node } of customers) {
      if (node.email) {
        const normalizedEmail = node.email.toLowerCase().trim()
        customersByEmail.set(normalizedEmail, node)
      }
    }

    hasNextPage = data.data?.customers?.pageInfo?.hasNextPage || false
    cursor = data.data?.customers?.pageInfo?.endCursor || null
  }

  console.log(`Fetched ${customersByEmail.size} Shopify customers`)
  return customersByEmail
}

async function fetchUnleashedProductBrands(): Promise<Map<string, string>> {
  const apiId = process.env.ELEVATE_UNLEASHED_API_ID!
  const apiKey = process.env.ELEVATE_UNLEASHED_API_KEY!
  const productBrands = new Map<string, string>()
  let page = 1

  while (page <= 20) {
    const params = new URLSearchParams({ pageSize: '500', page: page.toString() })
    const signature = generateUnleashedSignature(params.toString(), apiKey)

    const resp = await fetch(`${UNLEASHED_API_URL}/Products?${params}`, {
      headers: {
        'Accept': 'application/json',
        'api-auth-id': apiId,
        'api-auth-signature': signature
      }
    })

    if (!resp.ok) break

    const data = await resp.json()
    const products = data.Items || []

    for (const product of products) {
      if (product.ProductCode && product.ProductGroup?.GroupName) {
        productBrands.set(product.ProductCode, product.ProductGroup.GroupName)
      }
    }

    if (page >= (data.Pagination?.NumberOfPages || 1)) break
    page++
  }

  console.log(`Fetched ${productBrands.size} product -> brand mappings`)
  return productBrands
}

async function fetchAllUnleashedOrders(): Promise<UnleashedOrder[]> {
  const apiId = process.env.ELEVATE_UNLEASHED_API_ID!
  const apiKey = process.env.ELEVATE_UNLEASHED_API_KEY!
  const allOrders: UnleashedOrder[] = []
  let page = 1

  while (page <= 20) {
    const params = new URLSearchParams({ pageSize: '500', page: page.toString() })
    const signature = generateUnleashedSignature(params.toString(), apiKey)

    const resp = await fetch(`${UNLEASHED_API_URL}/SalesOrders?${params}`, {
      headers: {
        'Accept': 'application/json',
        'api-auth-id': apiId,
        'api-auth-signature': signature
      }
    })

    if (!resp.ok) break

    const data = await resp.json()
    const orders = data.Items || []

    for (const order of orders) {
      if (order.OrderStatus === 'Deleted') continue

      // Parse date
      const orderDate = parseUnleashedDate(order.OrderDate)
      if (orderDate) {
        order.OrderDate = orderDate.toISOString()
      }
      allOrders.push(order)
    }

    if (page >= (data.Pagination?.NumberOfPages || 1)) break
    page++
  }

  console.log(`Fetched ${allOrders.length} Unleashed orders`)
  return allOrders
}

async function syncElevateCustomers() {
  console.log('Starting Elevate customer sync...')

  // Step 1: Fetch Shopify customers
  const shopifyCustomers = await fetchAllShopifyCustomers()

  // Step 2: Fetch product brands
  const productBrands = await fetchUnleashedProductBrands()

  // Step 3: Fetch all Unleashed orders
  const unleashedOrders = await fetchAllUnleashedOrders()

  // Step 4: Group orders by customer and extract customer info
  const unleashedCustomerInfo = new Map<string, {
    code: string
    name: string
    email?: string
    guid?: string
    orders: UnleashedOrder[]
  }>()

  for (const order of unleashedOrders) {
    const code = order.Customer?.CustomerCode || 'UNKNOWN'

    if (!unleashedCustomerInfo.has(code)) {
      unleashedCustomerInfo.set(code, {
        code,
        name: order.Customer?.CustomerName || code,
        email: order.Customer?.Email,
        guid: order.Customer?.Guid,
        orders: []
      })
    }

    unleashedCustomerInfo.get(code)!.orders.push(order)
  }

  console.log(`Found ${unleashedCustomerInfo.size} unique Unleashed customers`)

  // Step 5: Build unified customer list
  const unifiedCustomers = new Map<string, {
    email: string
    firstName: string | null
    lastName: string | null
    businessName: string | null
    shopifyCustomerId: string | null
    shopifyState: string | null
    shopifyTags: string[]
    isApproved: boolean
    unleashedCode: string | null
    unleashedGuid: string | null
    orders: UnleashedOrder[]
  }>()

  // First, add all Shopify customers
  for (const [email, customer] of shopifyCustomers) {
    unifiedCustomers.set(email, {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      businessName: null,
      shopifyCustomerId: customer.id,
      shopifyState: customer.state,
      shopifyTags: customer.tags || [],
      isApproved: (customer.tags || []).includes('approved') && customer.state !== 'DISABLED',
      unleashedCode: null,
      unleashedGuid: null,
      orders: []
    })
  }

  // Then, match Unleashed customers to Shopify or create new
  for (const [code, info] of unleashedCustomerInfo) {
    const email = info.email?.toLowerCase().trim()

    if (email && unifiedCustomers.has(email)) {
      // Match found - add Unleashed data
      const existing = unifiedCustomers.get(email)!
      existing.unleashedCode = code
      existing.unleashedGuid = info.guid || null
      existing.orders = info.orders
    } else if (email) {
      // New customer from Unleashed with email
      unifiedCustomers.set(email, {
        email: info.email!,
        firstName: info.name?.split(' ')[0] || null,
        lastName: info.name?.split(' ').slice(1).join(' ') || null,
        businessName: info.name,
        shopifyCustomerId: null,
        shopifyState: null,
        shopifyTags: [],
        isApproved: false,
        unleashedCode: code,
        unleashedGuid: info.guid || null,
        orders: info.orders
      })
    } else {
      // No email - use customer code as identifier
      const syntheticEmail = `unleashed-${code}@elevate.internal`
      unifiedCustomers.set(syntheticEmail, {
        email: syntheticEmail,
        firstName: info.name?.split(' ')[0] || null,
        lastName: info.name?.split(' ').slice(1).join(' ') || null,
        businessName: info.name,
        shopifyCustomerId: null,
        shopifyState: null,
        shopifyTags: [],
        isApproved: false,
        unleashedCode: code,
        unleashedGuid: info.guid || null,
        orders: info.orders
      })
    }
  }

  console.log(`Unified customer count: ${unifiedCustomers.size}`)

  // Step 6: Insert customers into Supabase
  const customerInserts = []
  for (const [email, data] of unifiedCustomers) {
    customerInserts.push({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      business_name: data.businessName,
      shopify_customer_id: data.shopifyCustomerId,
      shopify_state: data.shopifyState,
      shopify_tags: data.shopifyTags,
      is_approved: data.isApproved,
      unleashed_customer_code: data.unleashedCode,
      unleashed_customer_guid: data.unleashedGuid,
      shopify_synced_at: data.shopifyCustomerId ? new Date().toISOString() : null,
      unleashed_synced_at: data.unleashedCode ? new Date().toISOString() : null
    })
  }

  // Batch upsert customers
  const { error: customerError } = await supabase
    .from('elevate_customers')
    .upsert(customerInserts, { onConflict: 'email' })

  if (customerError) {
    console.error('Error inserting customers:', customerError)
    return
  }

  console.log(`Upserted ${customerInserts.length} customers`)

  // Step 7: Get customer IDs for order linking
  const { data: customers } = await supabase
    .from('elevate_customers')
    .select('id, email, unleashed_customer_code')

  const customerByEmail = new Map(customers?.map(c => [c.email.toLowerCase(), c]) || [])
  const customerByCode = new Map(customers?.filter(c => c.unleashed_customer_code).map(c => [c.unleashed_customer_code, c]) || [])

  // Step 8: Insert orders
  const orderInserts = []
  for (const order of unleashedOrders) {
    const customerCode = order.Customer?.CustomerCode
    const customerEmail = order.Customer?.Email?.toLowerCase().trim()

    // Find customer
    let customer = customerEmail ? customerByEmail.get(customerEmail) : null
    if (!customer && customerCode) {
      customer = customerByCode.get(customerCode)
    }
    if (!customer) {
      customer = customerByEmail.get(`unleashed-${customerCode}@elevate.internal`)
    }

    if (!customer) {
      console.warn(`No customer found for order ${order.OrderNumber}`)
      continue
    }

    // Build line items with brand info
    const lineItems = (order.SalesOrderLines || []).map(line => ({
      title: line.Product?.ProductDescription || line.Product?.ProductCode || 'Unknown',
      vendor: productBrands.get(line.Product?.ProductCode || '') || 'Unknown',
      quantity: line.OrderQuantity,
      price: line.UnitPrice?.toString() || '0',
      total: line.LineTotal?.toString() || '0'
    }))

    orderInserts.push({
      customer_id: customer.id,
      customer_email: customer.email,
      source: 'unleashed',
      source_order_id: order.Guid,
      order_number: order.OrderNumber,
      order_date: order.OrderDate,
      order_status: order.OrderStatus,
      subtotal: order.SubTotal || 0,
      tax_total: order.TaxTotal || 0,
      total: order.Total || 0,
      line_items: lineItems
    })
  }

  // Batch upsert orders
  const { error: orderError } = await supabase
    .from('elevate_orders')
    .upsert(orderInserts, { onConflict: 'source,source_order_id' })

  if (orderError) {
    console.error('Error inserting orders:', orderError)
    return
  }

  console.log(`Upserted ${orderInserts.length} orders`)

  // Step 9: Calculate aggregated metrics
  await calculateCustomerMetrics()

  console.log('Sync completed successfully!')
}

async function calculateCustomerMetrics() {
  console.log('Calculating customer metrics...')

  // Get all customers
  const { data: customers } = await supabase
    .from('elevate_customers')
    .select('id, email')

  if (!customers) return

  for (const customer of customers) {
    // Get orders for this customer
    const { data: orders } = await supabase
      .from('elevate_orders')
      .select('total, order_date, line_items')
      .eq('customer_id', customer.id)

    if (!orders || orders.length === 0) continue

    // Calculate metrics
    const totalOrders = orders.length
    const totalSpend = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const avgOrderValue = totalSpend / totalOrders
    const orderDates = orders.map(o => new Date(o.order_date).getTime())
    const firstOrderDate = new Date(Math.min(...orderDates))
    const lastOrderDate = new Date(Math.max(...orderDates))

    // Calculate brand breakdown
    const brandBreakdown: Record<string, { amount: number; order_count: number }> = {}
    for (const order of orders) {
      const orderBrands = new Set<string>()
      for (const item of (order.line_items as any[] || [])) {
        const vendor = item.vendor || 'Unknown'
        if (!brandBreakdown[vendor]) {
          brandBreakdown[vendor] = { amount: 0, order_count: 0 }
        }
        brandBreakdown[vendor].amount += parseFloat(item.total || '0')
        orderBrands.add(vendor)
      }
      orderBrands.forEach(brand => {
        brandBreakdown[brand].order_count += 1
      })
    }

    // Update customer
    await supabase
      .from('elevate_customers')
      .update({
        total_orders: totalOrders,
        total_spend: totalSpend,
        avg_order_value: avgOrderValue,
        first_order_date: firstOrderDate.toISOString(),
        last_order_date: lastOrderDate.toISOString(),
        brand_breakdown: brandBreakdown,
        metrics_calculated_at: new Date().toISOString()
      })
      .eq('id', customer.id)
  }

  console.log(`Updated metrics for ${customers.length} customers`)
}

// Run sync
syncElevateCustomers().catch(console.error)
```

---

## Phase 3: Updated API Endpoints

### 3.1 New Orders API (reads from Supabase)

Replace `/dashboard/src/app/api/elevate/customers/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Fetch all customers with their pre-calculated metrics
    let query = supabase
      .from('elevate_customers')
      .select('*')
      .order('last_order_date', { ascending: false, nullsFirst: false })

    const { data: customers, error: customerError } = await query

    if (customerError) throw customerError

    // If date filter, recalculate metrics from orders table
    let customersWithOrders = []

    if (startDate || endDate) {
      // Need to calculate metrics for the date range
      for (const customer of customers || []) {
        let ordersQuery = supabase
          .from('elevate_orders')
          .select('*')
          .eq('customer_id', customer.id)

        if (startDate) {
          ordersQuery = ordersQuery.gte('order_date', `${startDate}T00:00:00`)
        }
        if (endDate) {
          ordersQuery = ordersQuery.lte('order_date', `${endDate}T23:59:59`)
        }

        const { data: orders } = await ordersQuery

        if (!orders || orders.length === 0) {
          // Include customer but with zero metrics for this period
          customersWithOrders.push({
            id: customer.shopify_customer_id || `unleashed-${customer.unleashed_customer_code}`,
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name,
            state: customer.shopify_state || 'ENABLED',
            tags: customer.shopify_tags || [],
            createdAt: customer.created_at,
            isApproved: customer.is_approved,
            orders: [],
            metrics: {
              totalSpend: 0,
              orderCount: 0,
              avgOrderValue: 0,
              lastOrderDate: null,
              brandBreakdown: {}
            }
          })
          continue
        }

        // Calculate metrics for this date range
        const totalSpend = orders.reduce((sum, o) => sum + (o.total || 0), 0)
        const orderCount = orders.length
        const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0
        const lastOrderDate = orders.sort((a, b) =>
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        )[0]?.order_date || null

        // Calculate brand breakdown
        const brandBreakdown: Record<string, { amount: number; orderCount: number }> = {}
        for (const order of orders) {
          const orderBrands = new Set<string>()
          for (const item of (order.line_items as any[] || [])) {
            const vendor = item.vendor || 'Unknown'
            if (!brandBreakdown[vendor]) {
              brandBreakdown[vendor] = { amount: 0, orderCount: 0 }
            }
            brandBreakdown[vendor].amount += parseFloat(item.total || '0')
            orderBrands.add(vendor)
          }
          orderBrands.forEach(brand => {
            brandBreakdown[brand].orderCount += 1
          })
        }

        // Convert orders to expected format
        const formattedOrders = orders.map(o => ({
          id: o.source_order_id,
          name: o.order_number,
          createdAt: o.order_date,
          totalPrice: o.total.toString(),
          source: o.source,
          lineItems: o.line_items || []
        }))

        customersWithOrders.push({
          id: customer.shopify_customer_id || `unleashed-${customer.unleashed_customer_code}`,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          state: customer.shopify_state || 'ENABLED',
          tags: customer.shopify_tags || [],
          createdAt: customer.created_at,
          isApproved: customer.is_approved,
          orders: formattedOrders,
          metrics: {
            totalSpend,
            orderCount,
            avgOrderValue,
            lastOrderDate,
            brandBreakdown
          }
        })
      }
    } else {
      // No date filter - use pre-calculated metrics (fastest path)
      for (const customer of customers || []) {
        // Fetch orders for this customer
        const { data: orders } = await supabase
          .from('elevate_orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('order_date', { ascending: false })

        const formattedOrders = (orders || []).map(o => ({
          id: o.source_order_id,
          name: o.order_number,
          createdAt: o.order_date,
          totalPrice: o.total.toString(),
          source: o.source,
          lineItems: o.line_items || []
        }))

        customersWithOrders.push({
          id: customer.shopify_customer_id || `unleashed-${customer.unleashed_customer_code}`,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          state: customer.shopify_state || 'ENABLED',
          tags: customer.shopify_tags || [],
          createdAt: customer.created_at,
          isApproved: customer.is_approved,
          orders: formattedOrders,
          metrics: {
            totalSpend: customer.total_spend || 0,
            orderCount: customer.total_orders || 0,
            avgOrderValue: customer.avg_order_value || 0,
            lastOrderDate: customer.last_order_date,
            brandBreakdown: customer.brand_breakdown || {}
          }
        })
      }
    }

    // Calculate summary
    const summary = {
      totalCustomers: customersWithOrders.length,
      customersWithOrders: customersWithOrders.filter(c => c.metrics.orderCount > 0).length,
      totalRevenue: customersWithOrders.reduce((sum, c) => sum + c.metrics.totalSpend, 0),
      totalOrders: customersWithOrders.reduce((sum, c) => sum + c.metrics.orderCount, 0),
      shopifyOrders: 0,  // All orders are from Unleashed currently
      unleashedOrders: customersWithOrders.reduce((sum, c) => sum + c.metrics.orderCount, 0),
      unleashedCustomers: customersWithOrders.filter(c =>
        c.id?.toString().startsWith('unleashed-')
      ).length
    }

    return NextResponse.json({
      customers: customersWithOrders,
      summary,
      dateRange: { startDate, endDate }
    })

  } catch (error: any) {
    console.error('Error fetching customer orders:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Phase 4: Sync Job Scheduling

### 4.1 n8n Workflow Setup

Create workflow: `Elevate Customer Sync`

**Trigger:** Cron - Every 6 hours (0 */6 * * *)

**Steps:**
1. Execute Script node - Run `elevate-customer-sync.ts`
2. On success - Log to integration_sync_log
3. On failure - Alert via Slack/Email

### 4.2 Alternative: Vercel Cron

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/elevate-sync",
    "schedule": "0 */6 * * *"
  }]
}
```

---

## Phase 5: Testing & Verification

### 5.1 Pre-Migration Baseline

**Before running migration, capture:**
```sql
-- Current customer count from live APIs
-- Save these numbers for comparison

-- After migration, verify:
SELECT COUNT(*) as customer_count FROM elevate_customers;
SELECT COUNT(*) as order_count FROM elevate_orders;
SELECT SUM(total_spend) as total_revenue FROM elevate_customers;
```

### 5.2 Deduplication Verification

```sql
-- Check for any remaining duplicates (should be 0)
SELECT email_normalized, COUNT(*)
FROM elevate_customers
GROUP BY email_normalized
HAVING COUNT(*) > 1;

-- Check customers that appeared in both systems
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE shopify_customer_id IS NOT NULL AND unleashed_customer_code IS NOT NULL) as matched,
  COUNT(*) FILTER (WHERE shopify_customer_id IS NOT NULL AND unleashed_customer_code IS NULL) as shopify_only,
  COUNT(*) FILTER (WHERE shopify_customer_id IS NULL AND unleashed_customer_code IS NOT NULL) as unleashed_only
FROM elevate_customers;
```

### 5.3 Date Range Accuracy Test

```sql
-- Test 3-month revenue calculation
SELECT
  SUM(total) as revenue,
  COUNT(*) as order_count
FROM elevate_orders
WHERE order_date >= NOW() - INTERVAL '3 months';

-- Compare to dashboard total
```

---

## Phase 6: Rollout Plan

### Step 1: Create Migration Branch
```bash
git checkout -b claude/elevate-customers-migration-01L59t77v1adikpspR2ovSwn
```

### Step 2: Run Supabase Migration
```bash
# Apply schema changes
npx supabase db push
```

### Step 3: Run Initial Sync
```bash
# Execute sync script
npx tsx infra/scripts/elevate-customer-sync.ts
```

### Step 4: Verify Data
- Check customer count matches expected
- Check revenue totals match
- Check no duplicates exist

### Step 5: Update API Endpoint
- Replace orders/route.ts with Supabase version
- Test locally with dashboard

### Step 6: Deploy
```bash
git add .
git commit -m "Migrate Elevate customers to Supabase-backed architecture"
git push -u origin claude/elevate-customers-migration-01L59t77v1adikpspR2ovSwn
```

### Step 7: Monitor
- Check dashboard loads correctly
- Verify date filters work
- Confirm no duplicates in UI

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `infra/supabase/migrations/YYYYMMDD_elevate_customers_unified.sql` | CREATE | Supabase schema |
| `infra/scripts/elevate-customer-sync.ts` | CREATE | Sync script |
| `dashboard/src/app/api/elevate/customers/orders/route.ts` | REPLACE | New API reading from Supabase |
| `vercel.json` or n8n workflow | UPDATE | Schedule sync job |

---

## Cost Analysis

### Current (API-only)
- Every page load: ~10 API calls to Shopify + ~20 API calls to Unleashed
- High latency: 5-10 seconds per page load
- Rate limit risk on heavy usage

### After Migration (Supabase-backed)
- Page load: 1-3 Supabase queries
- Sync job: ~30 API calls every 6 hours = 120/day
- Sub-second page loads
- 98% reduction in external API calls

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1 | Schema design | Low |
| Phase 2 | Sync script | Medium |
| Phase 3 | API updates | Medium |
| Phase 4 | Scheduling | Low |
| Phase 5 | Testing | Medium |
| Phase 6 | Deployment | Low |

**Total:** Can be completed in a single focused session.
