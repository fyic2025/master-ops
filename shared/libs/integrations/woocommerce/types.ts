/**
 * WooCommerce REST API Types
 *
 * Type definitions for WooCommerce REST API v3 responses.
 * Based on: https://woocommerce.github.io/woocommerce-rest-api-docs/
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface WooCommerceImage {
  id: number
  date_created: string
  date_created_gmt: string
  date_modified: string
  date_modified_gmt: string
  src: string
  name: string
  alt: string
}

export interface WooCommerceMetaData {
  id: number
  key: string
  value: string | number | boolean | object
}

export interface WooCommerceDimensions {
  length: string
  width: string
  height: string
}

export interface WooCommerceDownload {
  id: string
  name: string
  file: string
}

export interface WooCommerceCategory {
  id: number
  name: string
  slug: string
}

export interface WooCommerceTag {
  id: number
  name: string
  slug: string
}

export interface WooCommerceAttribute {
  id: number
  name: string
  position: number
  visible: boolean
  variation: boolean
  options: string[]
}

export interface WooCommerceDefaultAttribute {
  id: number
  name: string
  option: string
}

// ============================================================================
// PRODUCTS
// ============================================================================

export interface WooCommerceProduct {
  id: number
  name: string
  slug: string
  permalink: string
  date_created: string
  date_created_gmt: string
  date_modified: string
  date_modified_gmt: string
  type: 'simple' | 'grouped' | 'external' | 'variable'
  status: 'draft' | 'pending' | 'private' | 'publish'
  featured: boolean
  catalog_visibility: 'visible' | 'catalog' | 'search' | 'hidden'
  description: string
  short_description: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  date_on_sale_from: string | null
  date_on_sale_from_gmt: string | null
  date_on_sale_to: string | null
  date_on_sale_to_gmt: string | null
  price_html: string
  on_sale: boolean
  purchasable: boolean
  total_sales: number
  virtual: boolean
  downloadable: boolean
  downloads: WooCommerceDownload[]
  download_limit: number
  download_expiry: number
  external_url: string
  button_text: string
  tax_status: 'taxable' | 'shipping' | 'none'
  tax_class: string
  manage_stock: boolean
  stock_quantity: number | null
  stock_status: 'instock' | 'outofstock' | 'onbackorder'
  backorders: 'no' | 'notify' | 'yes'
  backorders_allowed: boolean
  backordered: boolean
  sold_individually: boolean
  weight: string
  dimensions: WooCommerceDimensions
  shipping_required: boolean
  shipping_taxable: boolean
  shipping_class: string
  shipping_class_id: number
  reviews_allowed: boolean
  average_rating: string
  rating_count: number
  related_ids: number[]
  upsell_ids: number[]
  cross_sell_ids: number[]
  parent_id: number
  purchase_note: string
  categories: WooCommerceCategory[]
  tags: WooCommerceTag[]
  images: WooCommerceImage[]
  attributes: WooCommerceAttribute[]
  default_attributes: WooCommerceDefaultAttribute[]
  variations: number[]
  grouped_products: number[]
  menu_order: number
  meta_data: WooCommerceMetaData[]
  global_unique_id?: string
  low_stock_amount?: number
}

// ============================================================================
// PRODUCT VARIATIONS
// ============================================================================

export interface WooCommerceVariation {
  id: number
  date_created: string
  date_created_gmt: string
  date_modified: string
  date_modified_gmt: string
  description: string
  permalink: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  date_on_sale_from: string | null
  date_on_sale_from_gmt: string | null
  date_on_sale_to: string | null
  date_on_sale_to_gmt: string | null
  on_sale: boolean
  status: string
  purchasable: boolean
  virtual: boolean
  downloadable: boolean
  downloads: WooCommerceDownload[]
  download_limit: number
  download_expiry: number
  tax_status: string
  tax_class: string
  manage_stock: boolean
  stock_quantity: number | null
  stock_status: string
  backorders: string
  backorders_allowed: boolean
  backordered: boolean
  weight: string
  dimensions: WooCommerceDimensions
  shipping_class: string
  shipping_class_id: number
  image: WooCommerceImage | null
  attributes: Array<{ id: number; name: string; option: string }>
  menu_order: number
  meta_data: WooCommerceMetaData[]
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface WooCommerceAddress {
  first_name: string
  last_name: string
  company: string
  address_1: string
  address_2: string
  city: string
  state: string
  postcode: string
  country: string
  email?: string
  phone?: string
}

export interface WooCommerceCustomer {
  id: number
  date_created: string
  date_created_gmt: string
  date_modified: string
  date_modified_gmt: string
  email: string
  first_name: string
  last_name: string
  role: string
  username: string
  billing: WooCommerceAddress
  shipping: Omit<WooCommerceAddress, 'email' | 'phone'>
  is_paying_customer: boolean
  avatar_url: string
  meta_data: WooCommerceMetaData[]
}

// ============================================================================
// ORDERS
// ============================================================================

export interface WooCommerceOrderLineItem {
  id: number
  name: string
  product_id: number
  variation_id: number
  quantity: number
  tax_class: string
  subtotal: string
  subtotal_tax: string
  total: string
  total_tax: string
  taxes: Array<{ id: number; total: string; subtotal: string }>
  meta_data: WooCommerceMetaData[]
  sku: string
  price: number
}

export interface WooCommerceOrderTaxLine {
  id: number
  rate_code: string
  rate_id: number
  label: string
  compound: boolean
  tax_total: string
  shipping_tax_total: string
  meta_data: WooCommerceMetaData[]
}

export interface WooCommerceOrderShippingLine {
  id: number
  method_title: string
  method_id: string
  total: string
  total_tax: string
  taxes: Array<{ id: number; total: string }>
  meta_data: WooCommerceMetaData[]
}

export interface WooCommerceOrderFeeLine {
  id: number
  name: string
  tax_class: string
  tax_status: string
  total: string
  total_tax: string
  taxes: Array<{ id: number; total: string }>
  meta_data: WooCommerceMetaData[]
}

export interface WooCommerceOrderCouponLine {
  id: number
  code: string
  discount: string
  discount_tax: string
  meta_data: WooCommerceMetaData[]
}

export interface WooCommerceOrderRefund {
  id: number
  reason: string
  total: string
}

export interface WooCommerceOrder {
  id: number
  parent_id: number
  number: string
  order_key: string
  created_via: string
  version: string
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed' | 'trash'
  currency: string
  date_created: string
  date_created_gmt: string
  date_modified: string
  date_modified_gmt: string
  discount_total: string
  discount_tax: string
  shipping_total: string
  shipping_tax: string
  cart_tax: string
  total: string
  total_tax: string
  prices_include_tax: boolean
  customer_id: number
  customer_ip_address: string
  customer_user_agent: string
  customer_note: string
  billing: WooCommerceAddress
  shipping: Omit<WooCommerceAddress, 'email' | 'phone'>
  payment_method: string
  payment_method_title: string
  transaction_id: string
  date_paid: string | null
  date_paid_gmt: string | null
  date_completed: string | null
  date_completed_gmt: string | null
  cart_hash: string
  meta_data: WooCommerceMetaData[]
  line_items: WooCommerceOrderLineItem[]
  tax_lines: WooCommerceOrderTaxLine[]
  shipping_lines: WooCommerceOrderShippingLine[]
  fee_lines: WooCommerceOrderFeeLine[]
  coupon_lines: WooCommerceOrderCouponLine[]
  refunds: WooCommerceOrderRefund[]
  currency_symbol?: string
}

// ============================================================================
// ORDER NOTES
// ============================================================================

export interface WooCommerceOrderNote {
  id: number
  author: string
  date_created: string
  date_created_gmt: string
  note: string
  customer_note: boolean
  added_by_user: boolean
}

// ============================================================================
// CATEGORIES & TAGS
// ============================================================================

export interface WooCommerceProductCategory {
  id: number
  name: string
  slug: string
  parent: number
  description: string
  display: 'default' | 'products' | 'subcategories' | 'both'
  image: WooCommerceImage | null
  menu_order: number
  count: number
}

export interface WooCommerceProductTag {
  id: number
  name: string
  slug: string
  description: string
  count: number
}

// ============================================================================
// PRODUCT ATTRIBUTES
// ============================================================================

export interface WooCommerceProductAttribute {
  id: number
  name: string
  slug: string
  type: 'select' | 'text'
  order_by: 'menu_order' | 'name' | 'name_num' | 'id'
  has_archives: boolean
}

export interface WooCommerceProductAttributeTerm {
  id: number
  name: string
  slug: string
  description: string
  menu_order: number
  count: number
}

// ============================================================================
// SHIPPING ZONES
// ============================================================================

export interface WooCommerceShippingZone {
  id: number
  name: string
  order: number
}

export interface WooCommerceShippingZoneLocation {
  code: string
  type: 'postcode' | 'state' | 'country' | 'continent'
}

export interface WooCommerceShippingZoneMethod {
  instance_id: number
  title: string
  order: number
  enabled: boolean
  method_id: string
  method_title: string
  method_description: string
  settings: Record<string, {
    id: string
    label: string
    description: string
    type: string
    value: string
    default: string
    tip: string
    placeholder: string
    options?: Record<string, string>
  }>
}

// ============================================================================
// COUPONS
// ============================================================================

export interface WooCommerceCoupon {
  id: number
  code: string
  amount: string
  date_created: string
  date_created_gmt: string
  date_modified: string
  date_modified_gmt: string
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product'
  description: string
  date_expires: string | null
  date_expires_gmt: string | null
  usage_count: number
  individual_use: boolean
  product_ids: number[]
  excluded_product_ids: number[]
  usage_limit: number | null
  usage_limit_per_user: number | null
  limit_usage_to_x_items: number | null
  free_shipping: boolean
  product_categories: number[]
  excluded_product_categories: number[]
  exclude_sale_items: boolean
  minimum_amount: string
  maximum_amount: string
  email_restrictions: string[]
  used_by: string[]
  meta_data: WooCommerceMetaData[]
}

// ============================================================================
// PAYMENT GATEWAYS
// ============================================================================

export interface WooCommercePaymentGateway {
  id: string
  title: string
  description: string
  order: number
  enabled: boolean
  method_title: string
  method_description: string
  method_supports: string[]
  settings: Record<string, {
    id: string
    label: string
    description: string
    type: string
    value: string
    default: string
    tip: string
    placeholder: string
  }>
}

// ============================================================================
// TAX RATES
// ============================================================================

export interface WooCommerceTaxRate {
  id: number
  country: string
  state: string
  postcode: string
  city: string
  postcodes: string[]
  cities: string[]
  rate: string
  name: string
  priority: number
  compound: boolean
  shipping: boolean
  order: number
  class: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface WooCommerceListOptions {
  page?: number
  per_page?: number
  search?: string
  after?: string
  before?: string
  modified_after?: string
  modified_before?: string
  exclude?: number[]
  include?: number[]
  offset?: number
  order?: 'asc' | 'desc'
  orderby?: string
}

export interface WooCommerceProductListOptions extends WooCommerceListOptions {
  status?: 'draft' | 'pending' | 'private' | 'publish' | 'any'
  type?: 'simple' | 'grouped' | 'external' | 'variable'
  sku?: string
  featured?: boolean
  category?: string
  tag?: string
  shipping_class?: string
  attribute?: string
  attribute_term?: string
  on_sale?: boolean
  min_price?: string
  max_price?: string
  stock_status?: 'instock' | 'outofstock' | 'onbackorder'
}

export interface WooCommerceOrderListOptions extends WooCommerceListOptions {
  status?: string
  customer?: number
  product?: number
  dp?: number
}

export interface WooCommerceCustomerListOptions extends WooCommerceListOptions {
  email?: string
  role?: string
}

// ============================================================================
// CONFIG
// ============================================================================

export interface WooCommerceConfig {
  url: string
  consumerKey: string
  consumerSecret: string
  version?: 'wc/v3' | 'wc/v2' | 'wc/v1'
  rateLimitPerWindow?: number
  timeout?: number
}

// ============================================================================
// SYNC TYPES
// ============================================================================

export interface SyncResult {
  success: boolean
  syncType: string
  recordsProcessed: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  errors: Array<{ id?: number; error: string }>
  duration: number
}

export interface SyncOptions {
  fullSync?: boolean
  modifiedAfter?: string
  batchSize?: number
  concurrency?: number
}
