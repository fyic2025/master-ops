/**
 * BigCommerce API Type Definitions
 *
 * Type-safe interfaces for BigCommerce V3 REST API
 * API Reference: https://developer.bigcommerce.com/docs/rest-management
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface BigCommerceResponse<T> {
  data: T
  meta?: {
    pagination?: {
      total: number
      count: number
      per_page: number
      current_page: number
      total_pages: number
      links?: {
        previous?: string
        current?: string
        next?: string
      }
    }
  }
}

export interface BigCommerceError {
  status: number
  title: string
  type: string
  errors?: Record<string, string>
}

// ============================================================================
// STORE
// ============================================================================

export interface BigCommerceStore {
  id: string
  domain: string
  secure_url: string
  name: string
  first_name: string
  last_name: string
  address: string
  country: string
  country_code: string
  phone: string
  admin_email: string
  order_email: string
  timezone: {
    name: string
    raw_offset: number
    dst_offset: number
    dst_correction: boolean
    date_format: {
      display: string
      export: string
      extended_display: string
    }
  }
  language: string
  currency: string
  currency_symbol: string
  decimal_separator: string
  thousands_separator: string
  decimal_places: number
  currency_symbol_location: string
  weight_units: string
  dimension_units: string
  dimension_decimal_places: number
  dimension_decimal_token: string
  dimension_thousands_token: string
  plan_name: string
  plan_level: string
  industry: string
  logo: {
    url: string
  }
  is_price_entered_with_tax: boolean
  active_comparison_modules: string[]
  features: {
    stencil_enabled: boolean
    sitewidehttps_enabled: string
    facebook_catalog_id: string
    checkout_type: string
  }
}

// ============================================================================
// PRODUCTS
// ============================================================================

export interface BigCommerceProduct {
  id: number
  name: string
  type: 'physical' | 'digital'
  sku: string
  description: string
  weight: number
  width: number
  depth: number
  height: number
  price: number
  cost_price: number
  retail_price: number
  sale_price: number
  map_price: number
  tax_class_id: number
  product_tax_code: string
  calculated_price: number
  categories: number[]
  brand_id: number
  option_set_id: number | null
  option_set_display: string
  inventory_level: number
  inventory_warning_level: number
  inventory_tracking: string
  reviews_rating_sum: number
  reviews_count: number
  total_sold: number
  fixed_cost_shipping_price: number
  is_free_shipping: boolean
  is_visible: boolean
  is_featured: boolean
  related_products: number[]
  warranty: string
  bin_picking_number: string
  layout_file: string
  upc: string
  mpn: string
  gtin: string
  search_keywords: string
  availability: string
  availability_description: string
  gift_wrapping_options_type: string
  gift_wrapping_options_list: number[]
  sort_order: number
  condition: string
  is_condition_shown: boolean
  order_quantity_minimum: number
  order_quantity_maximum: number
  page_title: string
  meta_keywords: string[]
  meta_description: string
  date_created: string
  date_modified: string
  view_count: number
  preorder_release_date: string | null
  preorder_message: string
  is_preorder_only: boolean
  is_price_hidden: boolean
  price_hidden_label: string
  custom_url: {
    url: string
    is_customized: boolean
  }
  base_variant_id: number | null
  open_graph_type: string
  open_graph_title: string
  open_graph_description: string
  open_graph_use_meta_description: boolean
  open_graph_use_product_name: boolean
  open_graph_use_image: boolean
}

// ============================================================================
// ORDERS
// ============================================================================

export interface BigCommerceOrder {
  id: number
  customer_id: number
  date_created: string
  date_modified: string
  date_shipped: string
  status_id: number
  status: string
  subtotal_ex_tax: number
  subtotal_inc_tax: number
  subtotal_tax: number
  base_shipping_cost: number
  shipping_cost_ex_tax: number
  shipping_cost_inc_tax: number
  shipping_cost_tax: number
  shipping_cost_tax_class_id: number
  base_handling_cost: number
  handling_cost_ex_tax: number
  handling_cost_inc_tax: number
  handling_cost_tax: number
  handling_cost_tax_class_id: number
  base_wrapping_cost: number
  wrapping_cost_ex_tax: number
  wrapping_cost_inc_tax: number
  wrapping_cost_tax: number
  wrapping_cost_tax_class_id: number
  total_ex_tax: number
  total_inc_tax: number
  total_tax: number
  items_total: number
  items_shipped: number
  payment_method: string
  payment_provider_id: string
  payment_status: string
  refunded_amount: number
  order_is_digital: boolean
  store_credit_amount: number
  gift_certificate_amount: number
  ip_address: string
  ip_address_v6: string
  geoip_country: string
  geoip_country_iso2: string
  currency_id: number
  currency_code: string
  currency_exchange_rate: number
  default_currency_id: number
  default_currency_code: string
  staff_notes: string
  customer_message: string
  discount_amount: number
  coupon_discount: number
  shipping_address_count: number
  is_deleted: boolean
  ebay_order_id: string
  cart_id: string
  billing_address: BigCommerceAddress
  is_email_opt_in: boolean
  credit_card_type: string | null
  order_source: string
  channel_id: number
  external_source: string | null
  products?: BigCommerceOrderProduct[]
  shipping_addresses?: BigCommerceShippingAddress[]
  coupons?: BigCommerceOrderCoupon[]
  external_id: string | null
  external_merchant_id: string | null
  tax_provider_id: string
  store_default_currency_code: string
  store_default_to_transactional_exchange_rate: number
  custom_status: string
}

export interface BigCommerceAddress {
  first_name: string
  last_name: string
  company: string
  street_1: string
  street_2: string
  city: string
  state: string
  zip: string
  country: string
  country_iso2: string
  phone: string
  email: string
}

export interface BigCommerceShippingAddress extends BigCommerceAddress {
  id: number
  order_id: number
  items_total: number
  items_shipped: number
  shipping_method: string
  base_cost: number
  cost_ex_tax: number
  cost_inc_tax: number
  cost_tax: number
  cost_tax_class_id: number
  base_handling_cost: number
  handling_cost_ex_tax: number
  handling_cost_inc_tax: number
  handling_cost_tax: number
  handling_cost_tax_class_id: number
  shipping_zone_id: number
  shipping_zone_name: string
  shipping_quotes?: BigCommerceShippingQuote[]
}

export interface BigCommerceOrderProduct {
  id: number
  order_id: number
  product_id: number
  order_address_id: number
  name: string
  name_customer: string
  name_merchant: string
  sku: string
  upc: string
  type: string
  base_price: number
  price_ex_tax: number
  price_inc_tax: number
  price_tax: number
  base_total: number
  total_ex_tax: number
  total_inc_tax: number
  total_tax: number
  weight: number
  width: number
  height: number
  depth: number
  quantity: number
  base_cost_price: number
  cost_price_inc_tax: number
  cost_price_ex_tax: number
  cost_price_tax: number
  is_refunded: boolean
  quantity_refunded: number
  refund_amount: number
  return_id: number
  wrapping_name: string
  base_wrapping_cost: number
  wrapping_cost_ex_tax: number
  wrapping_cost_inc_tax: number
  wrapping_cost_tax: number
  wrapping_message: string
  quantity_shipped: number
  event_name: string | null
  event_date: string | null
  fixed_shipping_cost: number
  ebay_item_id: string
  ebay_transaction_id: string
  option_set_id: number | null
  parent_order_product_id: number | null
  is_bundled_product: boolean
  bin_picking_number: string
  external_id: string | null
  fulfillment_source: string
  brand: string
  applied_discounts: any[]
  product_options: any[]
  configurable_fields: any[]
}

export interface BigCommerceOrderCoupon {
  id: number
  coupon_id: number
  order_id: number
  code: string
  amount: number
  type: number
  discount: number
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface BigCommerceCustomer {
  id: number
  company: string
  first_name: string
  last_name: string
  email: string
  phone: string
  date_created: string
  date_modified: string
  store_credit_amounts: Array<{
    amount: number
  }>
  registration_ip_address: string
  customer_group_id: number
  notes: string
  tax_exempt_category: string
  accepts_product_review_abandoned_cart_emails: boolean
  addresses: BigCommerceCustomerAddress[]
  form_fields: any[]
  authentication: {
    force_password_reset: boolean
  }
}

export interface BigCommerceCustomerAddress {
  id: number
  customer_id: number
  first_name: string
  last_name: string
  company: string
  address1: string
  address2: string
  city: string
  state_or_province: string
  postal_code: string
  country_code: string
  phone: string
  address_type: string
}

// ============================================================================
// SHIPPING
// ============================================================================

export interface BigCommerceShippingZone {
  id: number
  name: string
  type: 'country' | 'state' | 'zip' | 'global'
  locations: BigCommerceShippingLocation[]
  enabled: boolean
  handling_fees: {
    fixed_surcharge: number
    display_separately: boolean
  }
  free_shipping: {
    enabled: boolean
    minimum_sub_total: number
    exclude_fixed_shipping_products: boolean
  }
}

export interface BigCommerceShippingLocation {
  zip: string
  country_iso2: string
  state_iso2?: string
}

export interface BigCommerceShippingMethod {
  id: number
  name: string
  type: string
  settings: {
    rate: number
  }
  enabled: boolean
  handling_fees: {
    fixed_surcharge: number
  }
  is_fallback: boolean
}

export interface BigCommerceShippingQuote {
  id: string
  uuid: string
  timestamp: string
  shipping_provider_id: string
  shipping_provider_quote: any[]
  provider_code: string
  carrier_code: string
  rate_code: string
  rate_id: string
  method_id: number
}

// ============================================================================
// CHANNELS
// ============================================================================

export interface BigCommerceChannel {
  id: number
  name: string
  type: string
  platform: string
  external_id: string
  is_enabled: boolean
  is_listable_from_ui: boolean
  is_visible: boolean
  date_created: string
  date_modified: string
  config_meta: {
    app: {
      id: number
      sections: any[]
    }
  }
}

// ============================================================================
// CARTS & CHECKOUT
// ============================================================================

export interface BigCommerceCart {
  id: string
  customer_id: number
  channel_id: number
  email: string
  currency: {
    code: string
  }
  tax_included: boolean
  base_amount: number
  discount_amount: number
  cart_amount: number
  line_items: {
    physical_items: BigCommerceCartItem[]
    digital_items: BigCommerceCartItem[]
    gift_certificates: any[]
    custom_items: any[]
  }
  created_time: string
  updated_time: string
  locale: string
}

export interface BigCommerceCartItem {
  id: string
  parent_id: string | null
  variant_id: number
  product_id: number
  sku: string
  name: string
  url: string
  quantity: number
  taxable: boolean
  image_url: string
  discounts: any[]
  coupons: any[]
  discount_amount: number
  coupon_amount: number
  list_price: number
  sale_price: number
  extended_list_price: number
  extended_sale_price: number
  is_require_shipping: boolean
  is_mutable: boolean
}

export interface BigCommerceCheckout {
  id: string
  cart: BigCommerceCart
  billing_address: BigCommerceAddress | null
  consignments: any[]
  order_id: string | null
  shipping_cost_total_inc_tax: number
  shipping_cost_total_ex_tax: number
  handling_cost_total_inc_tax: number
  handling_cost_total_ex_tax: number
  tax_total: number
  subtotal_inc_tax: number
  subtotal_ex_tax: number
  grand_total: number
  created_time: string
  updated_time: string
  customer_message: string
  coupons: BigCommerceOrderCoupon[]
  taxes: any[]
}

// ============================================================================
// PAYMENT
// ============================================================================

export interface BigCommercePaymentMethod {
  id: string
  name: string
  test_mode: boolean
  type: string
  supported_instruments: string[]
  supported_countries: string[]
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ListOptions {
  limit?: number
  page?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface ProductListOptions extends ListOptions {
  name?: string
  sku?: string
  price?: number
  weight?: number
  condition?: string
  brand_id?: number
  date_modified?: string
  date_last_imported?: string
  is_visible?: boolean
  is_featured?: boolean
  inventory_level?: number
  total_sold?: number
  type?: 'physical' | 'digital'
  categories?: number
  keyword?: string
  include_fields?: string
  exclude_fields?: string
}

export interface OrderListOptions extends ListOptions {
  min_id?: number
  max_id?: number
  min_total?: number
  max_total?: number
  customer_id?: number
  email?: string
  status_id?: number
  cart_id?: string
  payment_method?: string
  min_date_created?: string
  max_date_created?: string
  min_date_modified?: string
  max_date_modified?: string
  is_deleted?: boolean
  channel_id?: number
}

export interface CustomerListOptions extends ListOptions {
  'id:in'?: number[]
  'id:not_in'?: number[]
  'id:min'?: number
  'id:max'?: number
  email?: string
  'name:in'?: string[]
  'name:like'?: string
  'date_created:min'?: string
  'date_created:max'?: string
  'date_modified:min'?: string
  'date_modified:max'?: string
  customer_group_id?: number
  registration_ip_address?: string
  authentication_type?: string
}

// ============================================================================
// STORE LOGS
// ============================================================================

export interface BigCommerceStoreLog {
  id: number
  type: string
  module: string
  severity: number
  summary: string
  message: string
  date_created: string
  staff_id?: number
  staff_name?: string
}

export interface StoreLogOptions extends ListOptions {
  type?: 'general' | 'payment' | 'shipping' | 'tax' | 'notification' |
         'emailintegration' | 'ordersettings' | 'design'
  module?: string
  severity?: number
}
