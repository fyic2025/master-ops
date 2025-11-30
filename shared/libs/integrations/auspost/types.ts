/**
 * Australia Post eParcel API Types
 *
 * Type definitions for Australia Post Shipping & Tracking APIs
 * API Docs: https://developers.auspost.com.au/apis/shipping-and-tracking
 */

// ============================================
// Address Types
// ============================================

export interface AusPostAddress {
  name?: string
  business_name?: string
  lines: string[]  // Address lines (1-3)
  suburb: string
  state: string  // e.g., 'VIC', 'NSW', 'QLD'
  postcode: string
  country?: string  // ISO 3166-1 alpha-2 (default 'AU')
  phone?: string
  email?: string
}

export interface AusPostAddressValidation {
  is_valid: boolean
  is_deliverable?: boolean
  address_id?: string
  normalized_address?: AusPostAddress
  suggestions?: AusPostAddress[]
  errors?: string[]
}

// ============================================
// Shipment Types
// ============================================

export interface AusPostShipmentCreate {
  shipment_reference?: string
  customer_reference_1?: string
  customer_reference_2?: string
  email_tracking_enabled?: boolean
  from: AusPostAddress
  to: AusPostAddress
  items: AusPostShipmentItem[]
}

export interface AusPostShipmentItem {
  item_reference?: string
  product_id: string  // e.g., '3D85', '3J85', 'PTI8'
  length: number  // cm
  width: number  // cm
  height: number  // cm
  weight: number  // kg
  authority_to_leave?: boolean
  safe_drop_enabled?: boolean
  allow_partial_delivery?: boolean
  contains_dangerous_goods?: boolean
  features?: AusPostItemFeatures
  commercial_value?: boolean
  export_declaration_number?: string
  description_of_other?: string
  item_contents?: AusPostItemContent[]
}

export interface AusPostItemFeatures {
  signature_on_delivery?: {
    required: boolean
  }
  delivery_confirmation?: {
    required: boolean
  }
  transit_cover?: {
    type: 'basic' | 'extra'
    cover_amount?: number
  }
}

export interface AusPostItemContent {
  description: string
  quantity: number
  value: number  // AUD
  weight: number  // kg
  country_of_origin?: string  // ISO 3166-1 alpha-2
  tariff_code?: string
}

export interface AusPostShipment {
  shipment_id: string
  shipment_reference?: string
  shipment_creation_date: string
  email_tracking_enabled: boolean
  items: AusPostShipmentItemResponse[]
  sender_references?: {
    customer_reference_1?: string
    customer_reference_2?: string
  }
}

export interface AusPostShipmentItemResponse {
  item_id: string
  item_reference?: string
  product_id: string
  tracking_details: {
    article_id: string
    consignment_id: string
    barcode_id?: string
  }
  item_summary?: {
    total_cost: number
    status: string
  }
}

// ============================================
// Label Types
// ============================================

export type AusPostLabelFormat =
  | 'PDF'           // A4 PDF with multiple labels per page
  | 'PDF_A6'        // A6 PDF
  | 'PDF_100x150'   // 100x150mm thermal label (Zebra)
  | 'ZPL_100x150'   // ZPL format for Zebra
  | 'ZPL_100x150_DPI_200'
  | 'ZPL_100x150_DPI_300'
  | 'PNG_100x150_DPI_200'
  | 'PNG_100x150_DPI_300'

export type AusPostLabelGroup = 'Parcel Post' | 'Express Post' | 'StarTrack' | 'International'

export interface AusPostLabelRequest {
  shipments: Array<{
    shipment_id: string
    items?: Array<{ item_id: string }>
  }>
  preferences: AusPostLabelPreferences
}

export interface AusPostLabelPreferences {
  type: 'PRINT'
  format: AusPostLabelFormat
  groups?: AusPostLabelGroup[]
  branded?: boolean  // Include AusPost branding
  left_offset?: number  // mm
  top_offset?: number  // mm
}

export interface AusPostLabelResponse {
  labels: Array<{
    request_id: string
    status: 'PENDING' | 'OK' | 'ERROR'
    request_date?: string
    url?: string  // URL to download label PDF
    errors?: AusPostLabelError[]
  }>
}

export interface AusPostLabelError {
  code: string
  name: string
  message: string
  field?: string
}

// ============================================
// Manifest Types
// ============================================

export interface AusPostManifestCreate {
  despatch_date?: string  // ISO 8601 date
}

export interface AusPostManifest {
  manifest_id: string
  manifest_number?: string
  status: 'PENDING' | 'CREATED' | 'CLOSED' | 'ERROR'
  despatch_date: string
  item_count: number
  shipment_count: number
  lodgement_location?: string
  manifest_pdf_url?: string
  manifest_summary_pdf_url?: string
}

// ============================================
// Tracking Types
// ============================================

export interface AusPostTrackingRequest {
  tracking_ids: string[]  // Article IDs (up to 10)
}

export interface AusPostTrackingResponse {
  tracking_results: AusPostTrackingResult[]
}

export interface AusPostTrackingResult {
  tracking_id: string
  status: AusPostTrackingStatus
  consignment_id?: string
  trackable_items?: AusPostTrackableItem[]
  events?: AusPostTrackingEvent[]
}

export interface AusPostTrackableItem {
  article_id: string
  product_type?: string
  events?: AusPostTrackingEvent[]
}

export interface AusPostTrackingEvent {
  location: string
  description: string
  date: string  // ISO 8601
}

export type AusPostTrackingStatus =
  | 'Created'
  | 'Picked up'
  | 'In transit'
  | 'Out for delivery'
  | 'Delivered'
  | 'Delivery attempted'
  | 'Awaiting collection'
  | 'Return to sender'
  | 'Unable to deliver'
  | 'Cancelled'

// ============================================
// Product/Service Types
// ============================================

export interface AusPostProduct {
  product_id: string  // e.g., '3D85', '3J85'
  name: string
  type: 'domestic' | 'international'
  group: AusPostLabelGroup
  max_weight: number  // kg
  max_length?: number  // cm
  max_width?: number
  max_height?: number
  max_girth?: number  // 2*(width+height) for cylinders
  features?: {
    signature_on_delivery: boolean
    authority_to_leave: boolean
    transit_cover: boolean
    dangerous_goods: boolean
    tracking: boolean
  }
}

// ============================================
// Quote/Rate Types
// ============================================

export interface AusPostQuoteRequest {
  from_postcode: string
  to_postcode: string
  length: number  // cm
  width: number  // cm
  height: number  // cm
  weight: number  // kg
  service_code?: string  // Specific service to quote
}

export interface AusPostQuoteRequestInternational {
  country_code: string  // ISO 3166-1 alpha-2
  weight: number  // kg
  service_code?: string
}

export interface AusPostQuote {
  service: {
    code: string
    name: string
    price?: number
    max_extra_cover?: number
    options?: AusPostQuoteOption[]
  }
  postage_result?: {
    service: string
    delivery_time: string
    total_cost: number
    costs: AusPostCostItem[]
  }
}

export interface AusPostQuoteOption {
  code: string
  name: string
  price?: number
}

export interface AusPostCostItem {
  item: string
  cost: number
}

// ============================================
// Error Types
// ============================================

export interface AusPostError {
  code: string
  name: string
  message: string
  field?: string
}

export interface AusPostApiError {
  errors: AusPostError[]
}

// ============================================
// API Response Types
// ============================================

export interface AusPostApiResponse<T> {
  data: T
  status: number
}

// ============================================
// Product Codes Reference
// ============================================

export const AUSPOST_DOMESTIC_PRODUCTS = {
  // Parcel Post
  PP_SIGNATURE: '3D85',      // Parcel Post + Signature
  PP_ATL: '3D35',            // Parcel Post (ATL enabled)

  // Express Post
  EXP_SIGNATURE: '3J85',     // Express Post + Signature
  EXP_ATL: '3J55',           // Express Post (ATL enabled)

  // Satchels
  PP_500G_SATCHEL: '7E55',   // Parcel Post 500g Satchel
  PP_1KG_SATCHEL: '7D55',    // Parcel Post 1kg Satchel
  PP_3KG_SATCHEL: '7B55',    // Parcel Post 3kg Satchel
  PP_5KG_SATCHEL: '7A55',    // Parcel Post 5kg Satchel

  EXP_500G_SATCHEL: '7C85',  // Express Post 500g Satchel
  EXP_1KG_SATCHEL: '7G85',   // Express Post 1kg Satchel
  EXP_3KG_SATCHEL: '7F85',   // Express Post 3kg Satchel
} as const

export const AUSPOST_INTERNATIONAL_PRODUCTS = {
  // Pack & Track
  PACK_TRACK: 'PTI8',        // Pack & Track International

  // Standard
  STANDARD_SIG: 'PTI7',      // International Standard + Signature

  // Registered Post
  REG_POST: 'RPI8',          // Registered Post International

  // Express Courier International
  ECI_MERCH: 'ECM8',         // ECI Merchandise
  ECI_DOCS: 'ECD8',          // ECI Documents

  // Economy Air
  AIRMAIL: 'AIR8',           // Economy Air
} as const

export type AusPostDomesticProduct = typeof AUSPOST_DOMESTIC_PRODUCTS[keyof typeof AUSPOST_DOMESTIC_PRODUCTS]
export type AusPostInternationalProduct = typeof AUSPOST_INTERNATIONAL_PRODUCTS[keyof typeof AUSPOST_INTERNATIONAL_PRODUCTS]
export type AusPostProductCode = AusPostDomesticProduct | AusPostInternationalProduct
