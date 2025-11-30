/**
 * Sendle Integration
 *
 * Shipping API client for Sendle courier services.
 * Used by Teelixir and BOO for domestic shipping.
 *
 * @example
 * ```typescript
 * import { createSendleClient, createSendleAddress } from '@/shared/libs/integrations/sendle'
 *
 * const sendle = createSendleClient('teelixir')
 *
 * // Create an order
 * const order = await sendle.orders.create({
 *   sender: createSendleAddress({ ... }),
 *   receiver: createSendleAddress({ ... }),
 *   description: 'Organic supplements',
 *   weight: { value: 1.5, units: 'kg' },
 *   product_code: 'STANDARD-PICKUP',
 * })
 *
 * // Get label URL
 * const labelUrl = await sendle.orders.getLabel(order.order_id)
 *
 * // Track shipment
 * const tracking = await sendle.orders.track(order.order_id)
 * ```
 */

export {
  createSendleClient,
  createCustomSendleClient,
  createSendleAddress,
  SendleConnector,
} from './client'

export type {
  SendleConfig,
  BusinessCode,
} from './client'

export * from './types'
