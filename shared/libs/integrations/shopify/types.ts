/**
 * Shopify Types
 *
 * Type definitions for Shopify API responses
 */

export interface ShopifyProduct {
  id: number
  title: string
  body_html: string | null
  vendor: string
  product_type: string
  created_at: string
  handle: string
  updated_at: string
  published_at: string | null
  template_suffix: string | null
  status: 'active' | 'archived' | 'draft'
  published_scope: string
  tags: string
  admin_graphql_api_id: string
  variants: ShopifyVariant[]
  options: ShopifyProductOption[]
  images: ShopifyImage[]
  image: ShopifyImage | null
}

export interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  price: string
  sku: string
  position: number
  inventory_policy: string
  compare_at_price: string | null
  fulfillment_service: string
  inventory_management: string | null
  option1: string | null
  option2: string | null
  option3: string | null
  created_at: string
  updated_at: string
  taxable: boolean
  barcode: string | null
  grams: number
  image_id: number | null
  weight: number
  weight_unit: string
  inventory_item_id: number
  inventory_quantity: number
  old_inventory_quantity: number
  requires_shipping: boolean
  admin_graphql_api_id: string
}

export interface ShopifyProductOption {
  id: number
  product_id: number
  name: string
  position: number
  values: string[]
}

export interface ShopifyImage {
  id: number
  product_id: number
  position: number
  created_at: string
  updated_at: string
  alt: string | null
  width: number
  height: number
  src: string
  variant_ids: number[]
  admin_graphql_api_id: string
}

export interface ShopifyOrder {
  id: number
  admin_graphql_api_id: string
  app_id: number
  browser_ip: string | null
  buyer_accepts_marketing: boolean
  cancel_reason: string | null
  cancelled_at: string | null
  cart_token: string | null
  checkout_id: number | null
  checkout_token: string | null
  closed_at: string | null
  confirmed: boolean
  contact_email: string | null
  created_at: string
  currency: string
  current_subtotal_price: string
  current_total_discounts: string
  current_total_duties_set: any | null
  current_total_price: string
  current_total_tax: string
  customer_locale: string | null
  device_id: number | null
  discount_codes: ShopifyDiscountCode[]
  email: string
  estimated_taxes: boolean
  financial_status: string
  fulfillment_status: string | null
  gateway: string
  landing_site: string | null
  landing_site_ref: string | null
  location_id: number | null
  name: string
  note: string | null
  note_attributes: Array<{ name: string; value: string }>
  number: number
  order_number: number
  order_status_url: string
  original_total_duties_set: any | null
  payment_gateway_names: string[]
  phone: string | null
  presentment_currency: string
  processed_at: string
  processing_method: string
  reference: string | null
  referring_site: string | null
  source_identifier: string | null
  source_name: string
  source_url: string | null
  subtotal_price: string
  tags: string
  tax_lines: ShopifyTaxLine[]
  taxes_included: boolean
  test: boolean
  token: string
  total_discounts: string
  total_line_items_price: string
  total_outstanding: string
  total_price: string
  total_price_usd: string
  total_shipping_price_set: any
  total_tax: string
  total_tip_received: string
  total_weight: number
  updated_at: string
  user_id: number | null
  billing_address: ShopifyAddress | null
  customer: ShopifyCustomer
  discount_applications: any[]
  fulfillments: any[]
  line_items: ShopifyLineItem[]
  payment_details: any | null
  refunds: any[]
  shipping_address: ShopifyAddress | null
  shipping_lines: ShopifyShippingLine[]
}

export interface ShopifyCustomer {
  id: number
  email: string
  accepts_marketing: boolean
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  orders_count: number
  state: string
  total_spent: string
  last_order_id: number | null
  note: string | null
  verified_email: boolean
  multipass_identifier: string | null
  tax_exempt: boolean
  phone: string | null
  tags: string
  last_order_name: string | null
  currency: string
  addresses: ShopifyAddress[]
  accepts_marketing_updated_at: string
  marketing_opt_in_level: string | null
  tax_exemptions: any[]
  admin_graphql_api_id: string
  default_address: ShopifyAddress | null
}

export interface ShopifyAddress {
  id?: number
  customer_id?: number
  first_name: string | null
  last_name: string | null
  company: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  country: string | null
  zip: string | null
  phone: string | null
  name: string | null
  province_code: string | null
  country_code: string | null
  country_name: string | null
  default?: boolean
}

export interface ShopifyLineItem {
  id: number
  variant_id: number | null
  title: string
  quantity: number
  sku: string | null
  variant_title: string | null
  vendor: string | null
  fulfillment_service: string
  product_id: number | null
  requires_shipping: boolean
  taxable: boolean
  gift_card: boolean
  name: string
  variant_inventory_management: string | null
  properties: Array<{ name: string; value: string }>
  product_exists: boolean
  fulfillable_quantity: number
  grams: number
  price: string
  total_discount: string
  fulfillment_status: string | null
  price_set: any
  total_discount_set: any
  discount_allocations: any[]
  duties: any[]
  admin_graphql_api_id: string
  tax_lines: ShopifyTaxLine[]
}

export interface ShopifyDiscountCode {
  code: string
  amount: string
  type: string
}

export interface ShopifyTaxLine {
  price: string
  rate: number
  title: string
  price_set: any
}

export interface ShopifyShippingLine {
  id: number
  carrier_identifier: string | null
  code: string | null
  delivery_category: string | null
  discounted_price: string
  discounted_price_set: any
  phone: string | null
  price: string
  price_set: any
  requested_fulfillment_service_id: string | null
  source: string
  title: string
  tax_lines: ShopifyTaxLine[]
  discount_allocations: any[]
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number
  location_id: number
  available: number
  updated_at: string
  admin_graphql_api_id: string
}

export interface ShopifyCollection {
  id: number
  handle: string
  title: string
  updated_at: string
  body_html: string | null
  published_at: string
  sort_order: string
  template_suffix: string | null
  published_scope: string
  admin_graphql_api_id: string
}

export interface ListResponse<T> {
  [key: string]: T[]
}

export interface ShopifyPaginationInfo {
  limit?: number
  since_id?: number
  created_at_min?: string
  created_at_max?: string
  updated_at_min?: string
  updated_at_max?: string
  page_info?: string
  fields?: string
}
