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
  GoogleAdsConnectorConfig,
  createGoogleAdsConnector,
  googleAdsBoo,
  googleAdsTeelixir,
  googleAdsRhf,
} from './client'

// Sync service
export {
  GoogleAdsSyncService,
  SyncResult,
  syncAllBusinesses,
} from './sync-service'

// Types
export * from './types'
