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

// Service Clients
export * from './hubspot/client'
export * from './unleashed/client'
export * from './n8n/client'
export * from './shopify/client'
export * from './xero/client'
export * from './smartlead/client'

// Shipping Carriers
export * from './auspost'
export * from './sendle'

// Base Infrastructure
export * from './base'

// Logger
export * from '../logger'
