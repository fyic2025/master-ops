/**
 * Google Ads Integration
 *
 * Complete Google Ads API integration for BOO, Teelixir, and Red Hill Fresh.
 *
 * @module google-ads
 */

// Core connector
export {
  GoogleAdsConnector,
  createGoogleAdsConnector,
  googleAdsBoo,
  googleAdsTeelixir,
  googleAdsRhf,
} from './client'

export type { GoogleAdsConnectorConfig } from './client'

// Sync service
export {
  GoogleAdsSyncService,
  syncAllBusinesses,
} from './sync-service'

export type { SyncResult } from './sync-service'

// Types
export * from './types'
