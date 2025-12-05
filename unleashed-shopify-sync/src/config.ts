/**
 * Multi-tenant configuration for Unleashed-Shopify Sync
 *
 * Stores: Teelixir, Elevate Wholesale
 */

import * as dotenv from 'dotenv'
import { StoreConfig } from './types.js'

// Load environment variables from parent directory
dotenv.config({ path: '../.env' })
dotenv.config({ path: '.env' })

export interface SyncConfig {
  stores: Record<string, StoreConfig>
  supabase: {
    url: string
    serviceRoleKey: string
  }
  sync: {
    inventoryIntervalMinutes: number
    dryRun: boolean
    logToSupabase: boolean
    /** Minimum order date - orders before this date will not be synced */
    minOrderDate: Date | null
  }
}

/**
 * Get store configuration by name
 */
export function getStoreConfig(storeName: string): StoreConfig | null {
  const config = loadConfig()
  return config.stores[storeName] || null
}

/**
 * Get all store names
 */
export function getStoreNames(): string[] {
  const config = loadConfig()
  return Object.keys(config.stores)
}

/**
 * Load full configuration
 */
export function loadConfig(): SyncConfig {
  return {
    stores: {
      teelixir: {
        name: 'teelixir',
        displayName: 'Teelixir',
        shopify: {
          shopDomain: process.env.TEELIXIR_SHOPIFY_STORE_URL || 'teelixir-au.myshopify.com',
          accessToken: process.env.TEELIXIR_SHOPIFY_ACCESS_TOKEN || '',
          apiVersion: process.env.TEELIXIR_SHOPIFY_API_VERSION || '2024-01',
          locationId: parseInt(process.env.TEELIXIR_SHOPIFY_LOCATION_ID || '78624784659'),
        },
        unleashed: {
          apiId: process.env.TEELIXIR_UNLEASHED_API_ID || '7fda9404-7197-477b-89b1-dadbcefae168',
          apiKey: process.env.TEELIXIR_UNLEASHED_API_KEY || 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==',
          apiUrl: process.env.TEELIXIR_UNLEASHED_API_URL || 'https://api.unleashedsoftware.com',
        },
      },
      elevate: {
        name: 'elevate',
        displayName: 'Elevate Wholesale',
        shopify: {
          shopDomain: process.env.ELEVATE_SHOPIFY_STORE_URL || 'elevatewholesale.myshopify.com',
          accessToken: process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN || '',
          apiVersion: process.env.ELEVATE_SHOPIFY_API_VERSION || '2024-10',
          locationId: parseInt(process.env.ELEVATE_SHOPIFY_LOCATION_ID || '69425791219'),
        },
        unleashed: {
          // Elevate uses KIK Unleashed account
          apiId: process.env.ELEVATE_UNLEASHED_API_ID || '336a6015-eae0-43ab-83eb-e08121e7655d',
          apiKey: process.env.ELEVATE_UNLEASHED_API_KEY || 'SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ==',
          apiUrl: process.env.ELEVATE_UNLEASHED_API_URL || 'https://api.unleashedsoftware.com',
        },
      },
    },
    supabase: {
      url: process.env.SUPABASE_URL || '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    sync: {
      inventoryIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '30'),
      dryRun: process.env.SYNC_DRY_RUN === 'true',
      logToSupabase: process.env.SYNC_LOG_TO_SUPABASE !== 'false',
      // December 1, 2025 cutoff - prevents syncing historical orders that may create duplicates
      minOrderDate: process.env.SYNC_MIN_ORDER_DATE
        ? new Date(process.env.SYNC_MIN_ORDER_DATE)
        : new Date('2025-12-01T00:00:00Z'),
    },
  }
}

/**
 * Validate store configuration
 */
export function validateStoreConfig(config: StoreConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.shopify.shopDomain) {
    errors.push('Missing Shopify shop domain')
  }
  if (!config.shopify.accessToken) {
    errors.push('Missing Shopify access token')
  }
  if (!config.shopify.locationId || config.shopify.locationId === 0) {
    errors.push('Missing Shopify location ID (will be fetched if not set)')
  }
  if (!config.unleashed.apiId) {
    errors.push('Missing Unleashed API ID')
  }
  if (!config.unleashed.apiKey) {
    errors.push('Missing Unleashed API key')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
