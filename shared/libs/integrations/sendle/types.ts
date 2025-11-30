/**
 * Sendle API Types
 *
 * Type definitions for Sendle shipping API
 * API Docs: https://developers.sendle.com
 */

// ============================================
// Address Types
// ============================================

export interface SendleAddress {
  contact?: {
    name?: string
    email?: string
    phone?: string
    company?: string
  }
  address_line1: string
  address_line2?: string
  suburb: string
  state_name: string
  postcode: string
  country: string  // ISO 3166-1 alpha-2 (e.g., 'AU')
}

// ============================================
// Order Types
// ============================================

export interface SendleOrderCreate {
  sender: SendleAddress
  receiver: SendleAddress
  description: string
  weight: {
    value: number  // in kg
    units: 'kg'
  }
  dimensions?: {
    length: number  // in cm
    width: number
    height: number
    units: 'cm'
  }
  product_code?: string  // e.g., 'STANDARD-PICKUP', 'EXPRESS-PICKUP'
  customer_reference?: string
  metadata?: Record<string, string>
  first_mile_option?: 'pickup' | 'drop off'
  contents?: SendleOrderContents
  pickup_date?: string  // ISO 8601 date
}

export interface SendleOrderContents {
  description: string
  country_of_origin?: string
  value?: number  // in AUD
  currency?: string
}

export interface SendleOrder {
  order_id: string
  state: SendleOrderState
  order_url: string
  sendle_reference: string
  tracking_url: string
  labels: SendleLabel[]
  customer_reference?: string
  metadata?: Record<string, string>
  sender: SendleAddress
  receiver: SendleAddress
  description: string
  weight: {
    value: number
    units: 'kg'
  }
  dimensions?: {
    length: number
    width: number
    height: number
    units: 'cm'
  }
  product?: SendleProduct
  price?: SendlePrice
  route?: SendleRoute
  scheduling?: SendleScheduling
  created_at?: string
}

export type SendleOrderState =
  | 'Created'
  | 'Pickup'
  | 'Pickup Attempted'
  | 'Unable to Book'
  | 'Transit'
  | 'In Transit'
  | 'Delivered'
  | 'Delivery Attempted'
  | 'Cancelled'
  | 'Return to Sender'
  | 'Lost'
  | 'Damaged'

export interface SendleLabel {
  format: 'pdf' | 'zpl'
  size: 'a4' | 'cropped'
  url: string
}

export interface SendleProduct {
  code: string
  name: string
  first_mile_option: 'pickup' | 'drop off'
}

export interface SendlePrice {
  gross: {
    amount: number
    currency: string
  }
  net: {
    amount: number
    currency: string
  }
  tax: {
    amount: number
    currency: string
  }
}

export interface SendleRoute {
  description: string
  type: string
  delivery_guarantee_status?: string
}

export interface SendleScheduling {
  pickup_date: string
  picked_up_on?: string
  delivered_on?: string
  estimated_delivery_date_minimum?: string
  estimated_delivery_date_maximum?: string
}

// ============================================
// Quote Types
// ============================================

export interface SendleQuoteRequest {
  sender_suburb: string
  sender_postcode: string
  sender_country?: string
  receiver_suburb: string
  receiver_postcode: string
  receiver_country?: string
  weight_value: number
  weight_units: 'kg' | 'g' | 'oz' | 'lb'
  length_value?: number
  width_value?: number
  height_value?: number
  dimension_units?: 'cm' | 'mm' | 'in'
  pickup_date?: string
}

export interface SendleQuote {
  quote_id: string
  plan_name: string
  eta: {
    days_range: number[]
    date_range: string[]
    for_pickup_date: string
  }
  route: SendleRoute
  price_breakdown: {
    base: SendlePriceBreakdownItem
    base_tax: SendlePriceBreakdownItem
    cover?: SendlePriceBreakdownItem
    cover_tax?: SendlePriceBreakdownItem
    discount?: SendlePriceBreakdownItem
    discount_tax?: SendlePriceBreakdownItem
    fuel_surcharge?: SendlePriceBreakdownItem
    fuel_surcharge_tax?: SendlePriceBreakdownItem
  }
  gross: SendlePriceAmount
  net: SendlePriceAmount
  tax: SendlePriceAmount
}

export interface SendlePriceBreakdownItem {
  amount: number
  currency: string
}

export interface SendlePriceAmount {
  amount: number
  currency: string
}

// ============================================
// Tracking Types
// ============================================

export interface SendleTrackingEvent {
  event_type: string
  scan_time: string
  description: string
  origin_location?: string
  destination_location?: string
  reason?: string
}

export interface SendleTracking {
  state: SendleOrderState
  tracking_events: SendleTrackingEvent[]
  origin: SendleAddress
  destination: SendleAddress
  scheduling?: SendleScheduling
}

// ============================================
// Product Types (available services)
// ============================================

export interface SendleProductOption {
  code: string
  name: string
  first_mile_option: 'pickup' | 'drop off'
  service_type: 'standard' | 'express'
}

// ============================================
// Error Types
// ============================================

export interface SendleError {
  error: string
  error_description: string
  messages?: Record<string, string[]>
}

// ============================================
// API Response Types
// ============================================

export interface SendleApiResponse<T> {
  data: T
  status: number
  headers: Record<string, string>
}

// ============================================
// Sendle Product Codes (for reference)
// ============================================
export const SENDLE_PRODUCT_CODES = {
  STANDARD_PICKUP: 'STANDARD-PICKUP',
  STANDARD_DROPOFF: 'STANDARD-DROPOFF',
  EXPRESS_PICKUP: 'EXPRESS-PICKUP',
  STANDARD_PICKUP_UNLIMITED_SATCHEL: 'STANDARD-PICKUP-UNLIMITED-SATCHEL',
  STANDARD_DROPOFF_UNLIMITED_SATCHEL: 'STANDARD-DROPOFF-UNLIMITED-SATCHEL',
} as const

export type SendleProductCode = typeof SENDLE_PRODUCT_CODES[keyof typeof SENDLE_PRODUCT_CODES]
