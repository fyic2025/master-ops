/**
 * Australia Post eParcel Integration
 *
 * Shipping API client for Australia Post eParcel services.
 * Used by BOO, Teelixir, and Elevate for domestic and international shipping.
 *
 * @example
 * ```typescript
 * import { createAusPostClient, createAusPostAddress } from '@/shared/libs/integrations/auspost'
 *
 * const auspost = createAusPostClient('teelixir')
 *
 * // Create a shipment
 * const shipment = await auspost.shipments.create({
 *   from: createAusPostAddress({ ... }),
 *   to: createAusPostAddress({ ... }),
 *   items: [{
 *     product_id: '3D85',  // Parcel Post + Signature
 *     length: 30,
 *     width: 20,
 *     height: 10,
 *     weight: 1.5,
 *   }],
 * })
 *
 * // Generate label
 * const labelUrl = await auspost.labels.getUrl(shipment.shipment_id)
 *
 * // Create manifest (end of day)
 * const manifest = await auspost.manifests.create()
 *
 * // Track shipment
 * const tracking = await auspost.tracking.track(articleId)
 * ```
 */

export {
  createAusPostClient,
  createCustomAusPostClient,
  createAusPostAddress,
  isDomestic,
  getDefaultProductCode,
  AusPostConnector,
} from './client'

export type {
  AusPostConfig,
  BusinessCode,
} from './client'

export * from './types'
