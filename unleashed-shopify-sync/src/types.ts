/**
 * Types for Unleashed-Shopify Sync
 */

// Store configuration
export interface StoreConfig {
  name: string
  displayName: string
  shopify: {
    shopDomain: string
    accessToken: string
    apiVersion: string
    locationId: number
  }
  unleashed: {
    apiId: string
    apiKey: string
    apiUrl: string
  }
}

// Unleashed types
export interface UnleashedStockItem {
  ProductCode: string
  ProductGuid: string
  ProductDescription: string
  QtyOnHand: number
  AvailableQty: number
  AllocatedQty: number
  WarehouseCode: string
  WarehouseName: string
}

export interface UnleashedProduct {
  Guid: string
  ProductCode: string
  ProductDescription: string
  Barcode: string
  DefaultSellPrice: number
  LastCost: number
}

export interface UnleashedSalesOrderLine {
  ProductCode: string
  ProductDescription?: string
  OrderQuantity: number
  UnitPrice: number
  LineTotal?: number
}

export interface UnleashedSalesOrder {
  CustomerCode: string
  OrderDate: string
  RequiredDate: string
  Comments: string
  ExternalReference: string
  OrderStatus: string
  DeliveryMethod: string
  SalesOrderLines: UnleashedSalesOrderLine[]
  DeliveryName?: string
  DeliveryStreetAddress?: string
  DeliveryStreetAddress2?: string
  DeliveryCity?: string
  DeliveryRegion?: string
  DeliveryPostalCode?: string
  DeliveryCountry?: string
}

// Shopify types
export interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  sku: string
  inventory_item_id: number
  inventory_quantity: number
  inventory_policy: 'deny' | 'continue'
}

export interface ShopifyProduct {
  id: number
  title: string
  handle: string
  variants: ShopifyVariant[]
}

export interface ShopifyLineItem {
  id: number
  title: string
  sku: string
  quantity: number
  price: string
  product_id: number
  variant_id: number
}

export interface ShopifyOrder {
  id: number
  order_number: number
  email: string
  created_at: string
  total_price: string
  financial_status: string
  fulfillment_status: string | null
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  line_items: ShopifyLineItem[]
  shipping_address?: {
    address1: string
    address2?: string
    city: string
    province: string
    zip: string
    country: string
    name: string
  }
}

export interface ShopifyLocation {
  id: number
  name: string
  address1: string
  city: string
  province: string
  country: string
  zip: string
  active: boolean
}

// Bundle mapping (from Supabase)
export interface BundleMapping {
  id: string
  store: string
  shopify_product_id: number | null
  shopify_variant_id: number | null
  shopify_sku: string
  bundle_name: string | null
  unleashed_product_code: string
  unleashed_product_guid: string | null
  component_quantity: number
  is_active: boolean
}

// Sync result types
export interface InventorySyncResult {
  store: string
  timestamp: Date
  duration: number
  stats: {
    totalUnleashedProducts: number
    totalShopifyProducts: number
    matched: number
    updated: number
    skipped: number
    bundlesProcessed: number
    errors: number
  }
  errors: Array<{
    sku: string
    error: string
  }>
  mismatches: {
    notInShopify: string[]
    notInUnleashed: string[]
  }
}

export interface OrderSyncResult {
  store: string
  shopifyOrderId: number
  shopifyOrderNumber: number
  unleashedOrderGuid: string | null
  status: 'success' | 'failed' | 'skipped'
  error?: string
  bundlesExpanded?: number
  lineItems?: number
}

// Sync log entry (for Supabase)
export interface SyncLogEntry {
  id?: string
  store: string
  sync_type: 'inventory' | 'orders'
  status: 'started' | 'completed' | 'failed'
  items_processed: number
  items_succeeded: number
  items_failed: number
  error_message?: string
  details?: Record<string, any>
  started_at: Date
  completed_at?: Date
  duration_ms?: number
}
