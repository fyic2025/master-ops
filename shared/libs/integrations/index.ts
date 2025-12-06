/**
 * Integration Layer - Main Export
 *
 * Centralized exports for all integration connectors and utilities.
 *
 * Usage:
 * ```typescript
 * import {
 *   hubspotClient,
 *   unleashedClient,
 *   n8nClient,
 *   logger,
 *   BaseConnector,
 *   ErrorHandler
 * } from '@/shared/libs/integrations'
 * ```
 */

// Service Clients - explicit exports to avoid naming conflicts
export {
  HubSpotConnector,
  hubspotClient,
  type HubSpotConfig,
  type HubSpotContact,
  type HubSpotCompany,
  type HubSpotDeal,
  type HubSpotProperty,
  type ListResponse as HubSpotListResponse,
} from './hubspot/client'

export {
  UnleashedConnector,
  unleashedClient,
  type UnleashedConfig,
  type UnleashedCustomer,
  type UnleashedProduct,
  type UnleashedSalesOrder,
  type ListResponse as UnleashedListResponse,
} from './unleashed/client'

export * from './n8n/client'
export * from './shopify/client'
export * from './xero/client'
export * from './smartlead/client'

// Shipping Carriers - explicit exports to avoid BusinessCode conflict
export {
  createAusPostClient,
  createCustomAusPostClient,
  createAusPostAddress,
  isDomestic,
  getDefaultProductCode,
  AusPostConnector,
  type AusPostConfig,
  type BusinessCode,
} from './auspost'
export * from './auspost/types'

export {
  createSendleClient,
  createCustomSendleClient,
  createSendleAddress,
  SendleConnector,
  type SendleConfig,
  type BusinessCode as SendleBusinessCode,
} from './sendle'
export * from './sendle/types'

// Base Infrastructure
export * from './base'

// Logger
export * from '../logger'
