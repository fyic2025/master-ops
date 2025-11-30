/**
 * Supabase Client for Unleashed-Shopify Sync
 *
 * Handles logging, duplicate checking, and bundle mapping lookups.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { BundleMapping, SyncLogEntry, OrderSyncResult } from './types.js'

// Load environment variables
dotenv.config({ path: '../.env' })
dotenv.config({ path: '.env' })

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.warn('⚠️  Supabase not configured - logging disabled')
    return null
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}

/**
 * Check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null
}

// ============================================
// Bundle Mappings
// ============================================

/**
 * Fetch bundle mappings for a store
 */
export async function fetchBundleMappings(store: string): Promise<BundleMapping[]> {
  const client = getSupabaseClient()
  if (!client) return []

  const { data, error } = await client
    .from('unleashed_shopify_bundle_mappings')
    .select('*')
    .eq('store', store)
    .eq('is_active', true)

  if (error) {
    console.error(`Failed to fetch bundle mappings: ${error.message}`)
    return []
  }

  return data || []
}

/**
 * Add or update a bundle mapping
 */
export async function upsertBundleMapping(mapping: Partial<BundleMapping>): Promise<void> {
  const client = getSupabaseClient()
  if (!client) return

  const { error } = await client
    .from('unleashed_shopify_bundle_mappings')
    .upsert(mapping, {
      onConflict: 'store,shopify_sku,unleashed_product_code',
    })

  if (error) {
    throw new Error(`Failed to upsert bundle mapping: ${error.message}`)
  }
}

// ============================================
// Order Sync Tracking
// ============================================

/**
 * Check if a Shopify order has already been synced
 */
export async function isOrderSynced(store: string, shopifyOrderId: number): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  const { data, error } = await client
    .from('unleashed_shopify_synced_orders')
    .select('id, sync_status')
    .eq('store', store)
    .eq('shopify_order_id', shopifyOrderId)
    .single()

  if (error) {
    // Not found is expected
    return false
  }

  return data?.sync_status === 'synced'
}

/**
 * Record a synced order
 */
export async function recordSyncedOrder(
  store: string,
  result: OrderSyncResult,
  order: { email: string; total_price: string; line_items: any[]; created_at: string }
): Promise<void> {
  const client = getSupabaseClient()
  if (!client) return

  const record = {
    store,
    shopify_order_id: result.shopifyOrderId,
    shopify_order_number: result.shopifyOrderNumber,
    shopify_order_name: `#${result.shopifyOrderNumber}`,
    unleashed_order_guid: result.unleashedOrderGuid,
    sync_status: result.status === 'success' ? 'synced' : result.status,
    error_message: result.error,
    customer_email: order.email,
    total_amount: parseFloat(order.total_price),
    line_items_count: order.line_items.length,
    bundles_expanded: result.bundlesExpanded || 0,
    shopify_created_at: order.created_at,
    synced_at: result.status === 'success' ? new Date().toISOString() : null,
  }

  const { error } = await client
    .from('unleashed_shopify_synced_orders')
    .upsert(record, {
      onConflict: 'store,shopify_order_id',
    })

  if (error) {
    console.error(`Failed to record synced order: ${error.message}`)
  }
}

// ============================================
// Sync Logging
// ============================================

/**
 * Start a sync log entry
 */
export async function startSyncLog(
  store: string,
  syncType: 'inventory' | 'orders',
  triggeredBy: string = 'manual'
): Promise<string | null> {
  const client = getSupabaseClient()
  if (!client) return null

  const entry: Partial<SyncLogEntry> = {
    store,
    sync_type: syncType,
    status: 'started',
    items_processed: 0,
    items_succeeded: 0,
    items_failed: 0,
    started_at: new Date(),
  }

  const { data, error } = await client
    .from('unleashed_shopify_sync_log')
    .insert({ ...entry, triggered_by: triggeredBy })
    .select('id')
    .single()

  if (error) {
    console.error(`Failed to start sync log: ${error.message}`)
    return null
  }

  return data.id
}

/**
 * Complete a sync log entry
 */
export async function completeSyncLog(
  logId: string | null,
  stats: {
    items_processed: number
    items_succeeded: number
    items_failed: number
  },
  details?: Record<string, any>,
  errorMessage?: string
): Promise<void> {
  if (!logId) return

  const client = getSupabaseClient()
  if (!client) return

  const startedAt = await getSyncLogStartTime(logId)
  const completedAt = new Date()
  const durationMs = startedAt ? completedAt.getTime() - startedAt.getTime() : 0

  const update = {
    status: errorMessage ? 'failed' : 'completed',
    items_processed: stats.items_processed,
    items_succeeded: stats.items_succeeded,
    items_failed: stats.items_failed,
    error_message: errorMessage,
    details,
    completed_at: completedAt.toISOString(),
    duration_ms: durationMs,
  }

  const { error } = await client
    .from('unleashed_shopify_sync_log')
    .update(update)
    .eq('id', logId)

  if (error) {
    console.error(`Failed to complete sync log: ${error.message}`)
  }
}

async function getSyncLogStartTime(logId: string): Promise<Date | null> {
  const client = getSupabaseClient()
  if (!client) return null

  const { data } = await client
    .from('unleashed_shopify_sync_log')
    .select('started_at')
    .eq('id', logId)
    .single()

  return data?.started_at ? new Date(data.started_at) : null
}

/**
 * Get recent sync logs for a store
 */
export async function getRecentSyncLogs(
  store: string,
  syncType?: 'inventory' | 'orders',
  limit: number = 10
): Promise<SyncLogEntry[]> {
  const client = getSupabaseClient()
  if (!client) return []

  let query = client
    .from('unleashed_shopify_sync_log')
    .select('*')
    .eq('store', store)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (syncType) {
    query = query.eq('sync_type', syncType)
  }

  const { data, error } = await query

  if (error) {
    console.error(`Failed to fetch sync logs: ${error.message}`)
    return []
  }

  return data || []
}

// ============================================
// SKU Mappings (for edge cases)
// ============================================

/**
 * Get SKU mapping overrides for a store
 */
export async function getSkuMappings(store: string): Promise<Map<string, string>> {
  const client = getSupabaseClient()
  if (!client) return new Map()

  const { data, error } = await client
    .from('unleashed_shopify_sku_mappings')
    .select('shopify_sku, unleashed_product_code')
    .eq('store', store)
    .eq('is_active', true)

  if (error) {
    console.error(`Failed to fetch SKU mappings: ${error.message}`)
    return new Map()
  }

  const map = new Map<string, string>()
  for (const row of data || []) {
    map.set(row.shopify_sku, row.unleashed_product_code)
  }
  return map
}
