#!/usr/bin/env npx tsx
/**
 * Red Hill Fresh - WooCommerce Data Sync
 *
 * Syncs all data from WooCommerce to Supabase (BOO database).
 * Captures complete API responses in raw_data JSONB fields.
 *
 * Usage:
 *   npx tsx red-hill-fresh/scripts/sync-woocommerce.ts [options]
 *
 * Options:
 *   --full          Full sync (all data, not just modified)
 *   --products      Sync products only
 *   --orders        Sync orders only
 *   --customers     Sync customers only
 *   --shipping      Sync shipping zones only
 *   --categories    Sync categories and tags only
 *   --config        Sync configuration (payment gateways, tax rates)
 *   --dry-run       Preview without writing to database
 *
 * Environment Variables Required:
 *   RHF_WC_URL              - WooCommerce site URL
 *   RHF_WC_CONSUMER_KEY     - WooCommerce API consumer key
 *   RHF_WC_CONSUMER_SECRET  - WooCommerce API consumer secret
 *   BOO_SUPABASE_URL        - Supabase URL (BOO project)
 *   BOO_SUPABASE_SERVICE_KEY - Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { WooCommerceConnector } from '../../shared/libs/integrations/woocommerce'
import type {
  WooCommerceProduct,
  WooCommerceOrder,
  WooCommerceCustomer,
  WooCommerceProductCategory,
  WooCommerceProductTag,
  WooCommerceShippingZone,
  WooCommerceCoupon,
  WooCommercePaymentGateway,
  WooCommerceTaxRate,
  SyncResult,
} from '../../shared/libs/integrations/woocommerce'
import * as dotenv from 'dotenv'

dotenv.config()

// ============================================================================
// CONFIGURATION
// ============================================================================

const BUSINESS = 'rhf'
const BATCH_SIZE = 50

interface SyncConfig {
  dryRun: boolean
  fullSync: boolean
  syncProducts: boolean
  syncOrders: boolean
  syncCustomers: boolean
  syncShipping: boolean
  syncCategories: boolean
  syncConfig: boolean
}

// ============================================================================
// PARSE CLI ARGUMENTS
// ============================================================================

function parseArgs(): SyncConfig {
  const args = process.argv.slice(2)

  const config: SyncConfig = {
    dryRun: args.includes('--dry-run'),
    fullSync: args.includes('--full'),
    syncProducts: args.includes('--products'),
    syncOrders: args.includes('--orders'),
    syncCustomers: args.includes('--customers'),
    syncShipping: args.includes('--shipping'),
    syncCategories: args.includes('--categories'),
    syncConfig: args.includes('--config'),
  }

  // If no specific sync type specified, sync everything
  const hasSpecificSync = config.syncProducts || config.syncOrders || config.syncCustomers ||
    config.syncShipping || config.syncCategories || config.syncConfig

  if (!hasSpecificSync) {
    config.syncProducts = true
    config.syncOrders = true
    config.syncCustomers = true
    config.syncShipping = true
    config.syncCategories = true
    config.syncConfig = true
  }

  return config
}

// ============================================================================
// SYNC LOG MANAGEMENT
// ============================================================================

async function startSyncLog(
  supabase: SupabaseClient,
  syncType: string,
  triggeredBy: string = 'manual'
): Promise<number | null> {
  const { data, error } = await supabase
    .from('rhf_sync_logs')
    .insert({
      business: BUSINESS,
      sync_type: syncType,
      status: 'running',
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error(`Failed to create sync log: ${error.message}`)
    return null
  }

  return data.id
}

async function completeSyncLog(
  supabase: SupabaseClient,
  logId: number,
  result: SyncResult
): Promise<void> {
  const { error } = await supabase
    .from('rhf_sync_logs')
    .update({
      status: result.success ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round(result.duration / 1000),
      records_fetched: result.recordsProcessed,
      records_created: result.recordsCreated,
      records_updated: result.recordsUpdated,
      records_failed: result.recordsFailed,
      error_message: result.errors.length > 0 ? result.errors[0].error : null,
      error_details: result.errors.length > 0 ? { errors: result.errors } : null,
      summary: {
        syncType: result.syncType,
        success: result.success,
        duration: result.duration,
      },
    })
    .eq('id', logId)

  if (error) {
    console.error(`Failed to update sync log: ${error.message}`)
  }
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

async function syncProducts(
  wc: WooCommerceConnector,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n📦 Syncing Products...')
  const startTime = Date.now()
  const errors: Array<{ id?: number; error: string }> = []
  let created = 0
  let updated = 0

  try {
    // Fetch all products from WooCommerce
    console.log('  Fetching products from WooCommerce...')
    const products = await wc.products.listAll({ status: 'any' })
    console.log(`  Found ${products.length} products`)

    if (config.dryRun) {
      console.log('  [DRY RUN] Would sync these products:')
      products.slice(0, 5).forEach(p => console.log(`    - ${p.id}: ${p.name}`))
      if (products.length > 5) console.log(`    ... and ${products.length - 5} more`)

      return {
        success: true,
        syncType: 'products',
        recordsProcessed: products.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Process in batches
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}...`)

      const records = batch.map(product => transformProduct(product))

      const { data, error } = await supabase
        .from('wc_products')
        .upsert(records, {
          onConflict: 'business,wc_product_id',
          ignoreDuplicates: false,
        })
        .select('id')

      if (error) {
        errors.push({ error: `Batch upsert failed: ${error.message}` })
      } else {
        // Count as updated for now (upsert doesn't distinguish)
        updated += batch.length
      }
    }

    // Sync variations for variable products
    const variableProducts = products.filter(p => p.type === 'variable' && p.variations.length > 0)
    console.log(`  Syncing variations for ${variableProducts.length} variable products...`)

    for (const product of variableProducts) {
      try {
        const variations = await wc.products.getAllVariations(product.id)
        if (variations.length > 0) {
          const variationRecords = variations.map(v => transformVariation(v, product.id))

          const { error } = await supabase
            .from('wc_product_variations')
            .upsert(variationRecords, {
              onConflict: 'business,wc_variation_id',
              ignoreDuplicates: false,
            })

          if (error) {
            errors.push({ id: product.id, error: `Variation sync failed: ${error.message}` })
          }
        }
      } catch (e) {
        errors.push({ id: product.id, error: `Failed to fetch variations: ${(e as Error).message}` })
      }
    }

    console.log(`  ✅ Products synced: ${updated} updated, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'products',
      recordsProcessed: products.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`  ❌ Products sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'products',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncOrders(
  wc: WooCommerceConnector,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n🛒 Syncing Orders...')
  const startTime = Date.now()
  const errors: Array<{ id?: number; error: string }> = []
  let created = 0
  let updated = 0

  try {
    // Fetch orders - for full sync get all, otherwise just recent
    console.log('  Fetching orders from WooCommerce...')
    const orders = config.fullSync
      ? await wc.orders.listAll()
      : await wc.orders.listAll({ after: getLastSyncDate(30) }) // Last 30 days

    console.log(`  Found ${orders.length} orders`)

    if (config.dryRun) {
      console.log('  [DRY RUN] Would sync these orders:')
      orders.slice(0, 5).forEach(o => console.log(`    - #${o.number}: ${o.status} - $${o.total}`))
      if (orders.length > 5) console.log(`    ... and ${orders.length - 5} more`)

      return {
        success: true,
        syncType: 'orders',
        recordsProcessed: orders.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Process in batches
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE)
      console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(orders.length / BATCH_SIZE)}...`)

      const records = batch.map(order => transformOrder(order))

      const { error } = await supabase
        .from('wc_orders')
        .upsert(records, {
          onConflict: 'business,wc_order_id',
          ignoreDuplicates: false,
        })

      if (error) {
        errors.push({ error: `Batch upsert failed: ${error.message}` })
      } else {
        updated += batch.length

        // Also sync line items
        for (const order of batch) {
          if (order.line_items && order.line_items.length > 0) {
            // First, get the order ID from our database
            const { data: orderData } = await supabase
              .from('wc_orders')
              .select('id')
              .eq('business', BUSINESS)
              .eq('wc_order_id', order.id)
              .single()

            if (orderData) {
              const lineItemRecords = order.line_items.map(item => ({
                business: BUSINESS,
                order_id: orderData.id,
                wc_order_id: order.id,
                wc_line_item_id: item.id,
                name: item.name,
                product_id: item.product_id,
                variation_id: item.variation_id || null,
                quantity: item.quantity,
                tax_class: item.tax_class || null,
                subtotal: parseFloat(item.subtotal) || null,
                subtotal_tax: parseFloat(item.subtotal_tax) || null,
                total: parseFloat(item.total) || null,
                total_tax: parseFloat(item.total_tax) || null,
                sku: item.sku || null,
                price: item.price || null,
                meta_data: item.meta_data || null,
                raw_data: item,
              }))

              await supabase
                .from('wc_order_line_items')
                .upsert(lineItemRecords, {
                  onConflict: 'business,wc_order_id,wc_line_item_id',
                  ignoreDuplicates: false,
                })
            }
          }
        }
      }
    }

    console.log(`  ✅ Orders synced: ${updated} updated, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'orders',
      recordsProcessed: orders.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`  ❌ Orders sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'orders',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncCustomers(
  wc: WooCommerceConnector,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n👥 Syncing Customers...')
  const startTime = Date.now()
  const errors: Array<{ id?: number; error: string }> = []
  let updated = 0

  try {
    console.log('  Fetching customers from WooCommerce...')
    const customers = await wc.customers.listAll()
    console.log(`  Found ${customers.length} customers`)

    if (config.dryRun) {
      console.log('  [DRY RUN] Would sync these customers:')
      customers.slice(0, 5).forEach(c => console.log(`    - ${c.id}: ${c.email}`))
      if (customers.length > 5) console.log(`    ... and ${customers.length - 5} more`)

      return {
        success: true,
        syncType: 'customers',
        recordsProcessed: customers.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Process in batches
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE)
      console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(customers.length / BATCH_SIZE)}...`)

      const records = batch.map(customer => transformCustomer(customer))

      const { error } = await supabase
        .from('wc_customers')
        .upsert(records, {
          onConflict: 'business,wc_customer_id',
          ignoreDuplicates: false,
        })

      if (error) {
        errors.push({ error: `Batch upsert failed: ${error.message}` })
      } else {
        updated += batch.length
      }
    }

    console.log(`  ✅ Customers synced: ${updated} updated, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'customers',
      recordsProcessed: customers.length,
      recordsCreated: 0,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`  ❌ Customers sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'customers',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncShippingZones(
  wc: WooCommerceConnector,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n🚚 Syncing Shipping Zones...')
  const startTime = Date.now()
  const errors: Array<{ id?: number; error: string }> = []
  let updated = 0

  try {
    console.log('  Fetching shipping zones from WooCommerce...')
    const zones = await wc.shipping.listZones()
    console.log(`  Found ${zones.length} shipping zones`)

    if (config.dryRun) {
      console.log('  [DRY RUN] Would sync these shipping zones:')
      zones.forEach(z => console.log(`    - ${z.id}: ${z.name}`))

      return {
        success: true,
        syncType: 'shipping_zones',
        recordsProcessed: zones.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        duration: Date.now() - startTime,
      }
    }

    // Sync each zone with its locations and methods
    for (const zone of zones) {
      try {
        // Sync zone
        const { data: zoneData, error: zoneError } = await supabase
          .from('wc_shipping_zones')
          .upsert({
            business: BUSINESS,
            wc_zone_id: zone.id,
            name: zone.name,
            zone_order: zone.order,
            raw_data: zone,
            synced_at: new Date().toISOString(),
          }, {
            onConflict: 'business,wc_zone_id',
          })
          .select('id')
          .single()

        if (zoneError) {
          errors.push({ id: zone.id, error: `Zone upsert failed: ${zoneError.message}` })
          continue
        }

        // Fetch and sync locations
        const locations = await wc.shipping.getZoneLocations(zone.id)
        if (locations.length > 0) {
          // Delete existing locations first
          await supabase
            .from('wc_shipping_zone_locations')
            .delete()
            .eq('business', BUSINESS)
            .eq('wc_zone_id', zone.id)

          // Insert new locations
          const locationRecords = locations.map(loc => ({
            business: BUSINESS,
            zone_id: zoneData.id,
            wc_zone_id: zone.id,
            code: loc.code,
            type: loc.type,
            raw_data: loc,
          }))

          await supabase
            .from('wc_shipping_zone_locations')
            .insert(locationRecords)
        }

        // Fetch and sync methods
        const methods = await wc.shipping.getZoneMethods(zone.id)
        if (methods.length > 0) {
          const methodRecords = methods.map(method => ({
            business: BUSINESS,
            zone_id: zoneData.id,
            wc_zone_id: zone.id,
            wc_instance_id: method.instance_id,
            method_id: method.method_id,
            method_title: method.method_title,
            method_description: method.method_description || null,
            enabled: method.enabled,
            method_order: method.order,
            settings: method.settings || null,
            raw_data: method,
          }))

          await supabase
            .from('wc_shipping_zone_methods')
            .upsert(methodRecords, {
              onConflict: 'business,wc_zone_id,wc_instance_id',
            })
        }

        updated++
      } catch (e) {
        errors.push({ id: zone.id, error: (e as Error).message })
      }
    }

    console.log(`  ✅ Shipping zones synced: ${updated} updated, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'shipping_zones',
      recordsProcessed: zones.length,
      recordsCreated: 0,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`  ❌ Shipping zones sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'shipping_zones',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncCategories(
  wc: WooCommerceConnector,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n🏷️ Syncing Categories & Tags...')
  const startTime = Date.now()
  const errors: Array<{ id?: number; error: string }> = []
  let updated = 0

  try {
    // Sync categories
    console.log('  Fetching categories...')
    const categories = await wc.categories.listAll()
    console.log(`  Found ${categories.length} categories`)

    if (!config.dryRun) {
      const categoryRecords = categories.map(cat => ({
        business: BUSINESS,
        wc_category_id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parent: cat.parent,
        description: cat.description || null,
        display: cat.display,
        image: cat.image,
        menu_order: cat.menu_order,
        count: cat.count,
        raw_data: cat,
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('wc_categories')
        .upsert(categoryRecords, {
          onConflict: 'business,wc_category_id',
        })

      if (error) {
        errors.push({ error: `Categories upsert failed: ${error.message}` })
      } else {
        updated += categories.length
      }
    }

    // Sync tags
    console.log('  Fetching tags...')
    const tags = await wc.tags.listAll()
    console.log(`  Found ${tags.length} tags`)

    if (!config.dryRun) {
      const tagRecords = tags.map(tag => ({
        business: BUSINESS,
        wc_tag_id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description || null,
        count: tag.count,
        raw_data: tag,
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('wc_tags')
        .upsert(tagRecords, {
          onConflict: 'business,wc_tag_id',
        })

      if (error) {
        errors.push({ error: `Tags upsert failed: ${error.message}` })
      } else {
        updated += tags.length
      }
    }

    // Sync attributes
    console.log('  Fetching product attributes...')
    const attributes = await wc.attributes.list()
    console.log(`  Found ${attributes.length} attributes`)

    if (!config.dryRun) {
      for (const attr of attributes) {
        const { data: attrData, error: attrError } = await supabase
          .from('wc_product_attributes')
          .upsert({
            business: BUSINESS,
            wc_attribute_id: attr.id,
            name: attr.name,
            slug: attr.slug,
            type: attr.type,
            order_by: attr.order_by,
            has_archives: attr.has_archives,
            raw_data: attr,
            synced_at: new Date().toISOString(),
          }, {
            onConflict: 'business,wc_attribute_id',
          })
          .select('id')
          .single()

        if (attrError) {
          errors.push({ id: attr.id, error: `Attribute upsert failed: ${attrError.message}` })
          continue
        }

        // Sync attribute terms
        const terms = await wc.attributes.getAllTerms(attr.id)
        if (terms.length > 0) {
          const termRecords = terms.map(term => ({
            business: BUSINESS,
            attribute_id: attrData.id,
            wc_attribute_id: attr.id,
            wc_term_id: term.id,
            name: term.name,
            slug: term.slug,
            description: term.description || null,
            menu_order: term.menu_order,
            count: term.count,
            raw_data: term,
          }))

          await supabase
            .from('wc_product_attribute_terms')
            .upsert(termRecords, {
              onConflict: 'business,wc_attribute_id,wc_term_id',
            })
        }

        updated++
      }
    }

    console.log(`  ✅ Categories & tags synced: ${updated} items, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'categories',
      recordsProcessed: categories.length + tags.length + attributes.length,
      recordsCreated: 0,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`  ❌ Categories sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'categories',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

async function syncConfiguration(
  wc: WooCommerceConnector,
  supabase: SupabaseClient,
  config: SyncConfig
): Promise<SyncResult> {
  console.log('\n⚙️ Syncing Configuration...')
  const startTime = Date.now()
  const errors: Array<{ id?: number; error: string }> = []
  let updated = 0

  try {
    // Sync payment gateways
    console.log('  Fetching payment gateways...')
    const gateways = await wc.paymentGateways.list()
    console.log(`  Found ${gateways.length} payment gateways`)

    if (!config.dryRun) {
      const gatewayRecords = gateways.map(gw => ({
        business: BUSINESS,
        gateway_id: gw.id,
        title: gw.title,
        description: gw.description || null,
        method_title: gw.method_title,
        method_description: gw.method_description || null,
        enabled: gw.enabled,
        order_num: gw.order,
        settings: gw.settings || null,
        raw_data: gw,
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('wc_payment_gateways')
        .upsert(gatewayRecords, {
          onConflict: 'business,gateway_id',
        })

      if (error) {
        errors.push({ error: `Payment gateways upsert failed: ${error.message}` })
      } else {
        updated += gateways.length
      }
    }

    // Sync tax rates
    console.log('  Fetching tax rates...')
    const taxRates = await wc.taxRates.listAll()
    console.log(`  Found ${taxRates.length} tax rates`)

    if (!config.dryRun) {
      const taxRecords = taxRates.map(tax => ({
        business: BUSINESS,
        wc_tax_rate_id: tax.id,
        country: tax.country || null,
        state: tax.state || null,
        postcode: tax.postcode || null,
        city: tax.city || null,
        postcodes: tax.postcodes.length > 0 ? tax.postcodes : null,
        cities: tax.cities.length > 0 ? tax.cities : null,
        rate: parseFloat(tax.rate) || null,
        name: tax.name,
        priority: tax.priority,
        compound: tax.compound,
        shipping: tax.shipping,
        tax_class: tax.class || null,
        order_num: tax.order,
        raw_data: tax,
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('wc_tax_rates')
        .upsert(taxRecords, {
          onConflict: 'business,wc_tax_rate_id',
        })

      if (error) {
        errors.push({ error: `Tax rates upsert failed: ${error.message}` })
      } else {
        updated += taxRates.length
      }
    }

    // Sync coupons
    console.log('  Fetching coupons...')
    const coupons = await wc.coupons.listAll()
    console.log(`  Found ${coupons.length} coupons`)

    if (!config.dryRun) {
      const couponRecords = coupons.map(coupon => ({
        business: BUSINESS,
        wc_coupon_id: coupon.id,
        code: coupon.code,
        amount: parseFloat(coupon.amount) || null,
        discount_type: coupon.discount_type,
        description: coupon.description || null,
        usage_count: coupon.usage_count,
        usage_limit: coupon.usage_limit,
        usage_limit_per_user: coupon.usage_limit_per_user,
        limit_usage_to_x_items: coupon.limit_usage_to_x_items,
        date_expires: coupon.date_expires,
        date_expires_gmt: coupon.date_expires_gmt,
        individual_use: coupon.individual_use,
        free_shipping: coupon.free_shipping,
        exclude_sale_items: coupon.exclude_sale_items,
        minimum_amount: coupon.minimum_amount ? parseFloat(coupon.minimum_amount) : null,
        maximum_amount: coupon.maximum_amount ? parseFloat(coupon.maximum_amount) : null,
        product_ids: coupon.product_ids.length > 0 ? coupon.product_ids : null,
        excluded_product_ids: coupon.excluded_product_ids.length > 0 ? coupon.excluded_product_ids : null,
        product_categories: coupon.product_categories.length > 0 ? coupon.product_categories : null,
        excluded_product_categories: coupon.excluded_product_categories.length > 0 ? coupon.excluded_product_categories : null,
        email_restrictions: coupon.email_restrictions.length > 0 ? coupon.email_restrictions : null,
        used_by: coupon.used_by.length > 0 ? coupon.used_by : null,
        meta_data: coupon.meta_data.length > 0 ? coupon.meta_data : null,
        date_created: coupon.date_created,
        date_created_gmt: coupon.date_created_gmt,
        date_modified: coupon.date_modified,
        date_modified_gmt: coupon.date_modified_gmt,
        raw_data: coupon,
        synced_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('wc_coupons')
        .upsert(couponRecords, {
          onConflict: 'business,wc_coupon_id',
        })

      if (error) {
        errors.push({ error: `Coupons upsert failed: ${error.message}` })
      } else {
        updated += coupons.length
      }
    }

    console.log(`  ✅ Configuration synced: ${updated} items, ${errors.length} errors`)

    return {
      success: errors.length === 0,
      syncType: 'configuration',
      recordsProcessed: gateways.length + taxRates.length + coupons.length,
      recordsCreated: 0,
      recordsUpdated: updated,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
    }
  } catch (e) {
    const error = e as Error
    console.error(`  ❌ Configuration sync failed: ${error.message}`)
    return {
      success: false,
      syncType: 'configuration',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 1,
      errors: [{ error: error.message }],
      duration: Date.now() - startTime,
    }
  }
}

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function transformProduct(product: WooCommerceProduct) {
  return {
    business: BUSINESS,
    wc_product_id: product.id,
    name: product.name,
    slug: product.slug,
    permalink: product.permalink,
    type: product.type,
    status: product.status,
    featured: product.featured,
    catalog_visibility: product.catalog_visibility,
    description: product.description || null,
    short_description: product.short_description || null,
    sku: product.sku || null,
    global_unique_id: product.global_unique_id || null,
    price: product.price ? parseFloat(product.price) : null,
    regular_price: product.regular_price ? parseFloat(product.regular_price) : null,
    sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
    price_html: product.price_html || null,
    on_sale: product.on_sale,
    date_on_sale_from: product.date_on_sale_from,
    date_on_sale_from_gmt: product.date_on_sale_from_gmt,
    date_on_sale_to: product.date_on_sale_to,
    date_on_sale_to_gmt: product.date_on_sale_to_gmt,
    purchasable: product.purchasable,
    total_sales: product.total_sales,
    virtual: product.virtual,
    downloadable: product.downloadable,
    manage_stock: product.manage_stock,
    stock_quantity: product.stock_quantity,
    stock_status: product.stock_status,
    backorders: product.backorders,
    backorders_allowed: product.backorders_allowed,
    backordered: product.backordered,
    sold_individually: product.sold_individually,
    low_stock_amount: product.low_stock_amount || null,
    weight: product.weight || null,
    length: product.dimensions?.length || null,
    width: product.dimensions?.width || null,
    height: product.dimensions?.height || null,
    shipping_required: product.shipping_required,
    shipping_taxable: product.shipping_taxable,
    shipping_class: product.shipping_class || null,
    shipping_class_id: product.shipping_class_id || null,
    tax_status: product.tax_status,
    tax_class: product.tax_class || null,
    downloads: product.downloads.length > 0 ? product.downloads : null,
    download_limit: product.download_limit,
    download_expiry: product.download_expiry,
    external_url: product.external_url || null,
    button_text: product.button_text || null,
    reviews_allowed: product.reviews_allowed,
    average_rating: product.average_rating ? parseFloat(product.average_rating) : null,
    rating_count: product.rating_count,
    parent_id: product.parent_id || null,
    related_ids: product.related_ids.length > 0 ? product.related_ids : null,
    upsell_ids: product.upsell_ids.length > 0 ? product.upsell_ids : null,
    cross_sell_ids: product.cross_sell_ids.length > 0 ? product.cross_sell_ids : null,
    grouped_products: product.grouped_products.length > 0 ? product.grouped_products : null,
    variations: product.variations.length > 0 ? product.variations : null,
    menu_order: product.menu_order,
    purchase_note: product.purchase_note || null,
    categories: product.categories.length > 0 ? product.categories : null,
    tags: product.tags.length > 0 ? product.tags : null,
    images: product.images.length > 0 ? product.images : null,
    attributes: product.attributes.length > 0 ? product.attributes : null,
    default_attributes: product.default_attributes.length > 0 ? product.default_attributes : null,
    meta_data: product.meta_data.length > 0 ? product.meta_data : null,
    date_created: product.date_created,
    date_created_gmt: product.date_created_gmt,
    date_modified: product.date_modified,
    date_modified_gmt: product.date_modified_gmt,
    raw_data: product,
    synced_at: new Date().toISOString(),
  }
}

function transformVariation(variation: any, parentId: number) {
  return {
    business: BUSINESS,
    wc_parent_id: parentId,
    wc_variation_id: variation.id,
    description: variation.description || null,
    permalink: variation.permalink || null,
    sku: variation.sku || null,
    price: variation.price ? parseFloat(variation.price) : null,
    regular_price: variation.regular_price ? parseFloat(variation.regular_price) : null,
    sale_price: variation.sale_price ? parseFloat(variation.sale_price) : null,
    on_sale: variation.on_sale,
    date_on_sale_from: variation.date_on_sale_from,
    date_on_sale_to: variation.date_on_sale_to,
    status: variation.status,
    purchasable: variation.purchasable,
    virtual: variation.virtual,
    downloadable: variation.downloadable,
    manage_stock: variation.manage_stock,
    stock_quantity: variation.stock_quantity,
    stock_status: variation.stock_status,
    backorders: variation.backorders,
    backorders_allowed: variation.backorders_allowed,
    backordered: variation.backordered,
    weight: variation.weight || null,
    length: variation.dimensions?.length || null,
    width: variation.dimensions?.width || null,
    height: variation.dimensions?.height || null,
    shipping_class: variation.shipping_class || null,
    shipping_class_id: variation.shipping_class_id || null,
    tax_status: variation.tax_status,
    tax_class: variation.tax_class || null,
    downloads: variation.downloads?.length > 0 ? variation.downloads : null,
    download_limit: variation.download_limit,
    download_expiry: variation.download_expiry,
    attributes: variation.attributes?.length > 0 ? variation.attributes : null,
    image: variation.image || null,
    meta_data: variation.meta_data?.length > 0 ? variation.meta_data : null,
    date_created: variation.date_created,
    date_created_gmt: variation.date_created_gmt,
    date_modified: variation.date_modified,
    date_modified_gmt: variation.date_modified_gmt,
    raw_data: variation,
    synced_at: new Date().toISOString(),
  }
}

function transformOrder(order: WooCommerceOrder) {
  return {
    business: BUSINESS,
    wc_order_id: order.id,
    parent_id: order.parent_id || null,
    order_number: order.number,
    order_key: order.order_key,
    created_via: order.created_via || null,
    version: order.version || null,
    status: order.status,
    currency: order.currency,
    currency_symbol: order.currency_symbol || null,
    prices_include_tax: order.prices_include_tax,
    discount_total: parseFloat(order.discount_total) || 0,
    discount_tax: parseFloat(order.discount_tax) || 0,
    shipping_total: parseFloat(order.shipping_total) || 0,
    shipping_tax: parseFloat(order.shipping_tax) || 0,
    cart_tax: parseFloat(order.cart_tax) || 0,
    total: parseFloat(order.total) || null,
    total_tax: parseFloat(order.total_tax) || 0,
    customer_id: order.customer_id || null,
    customer_ip_address: order.customer_ip_address || null,
    customer_user_agent: order.customer_user_agent || null,
    customer_note: order.customer_note || null,
    billing_first_name: order.billing?.first_name || null,
    billing_last_name: order.billing?.last_name || null,
    billing_company: order.billing?.company || null,
    billing_address_1: order.billing?.address_1 || null,
    billing_address_2: order.billing?.address_2 || null,
    billing_city: order.billing?.city || null,
    billing_state: order.billing?.state || null,
    billing_postcode: order.billing?.postcode || null,
    billing_country: order.billing?.country || null,
    billing_email: order.billing?.email || null,
    billing_phone: order.billing?.phone || null,
    billing_address: order.billing || null,
    shipping_first_name: order.shipping?.first_name || null,
    shipping_last_name: order.shipping?.last_name || null,
    shipping_company: order.shipping?.company || null,
    shipping_address_1: order.shipping?.address_1 || null,
    shipping_address_2: order.shipping?.address_2 || null,
    shipping_city: order.shipping?.city || null,
    shipping_state: order.shipping?.state || null,
    shipping_postcode: order.shipping?.postcode || null,
    shipping_country: order.shipping?.country || null,
    shipping_address: order.shipping || null,
    payment_method: order.payment_method || null,
    payment_method_title: order.payment_method_title || null,
    transaction_id: order.transaction_id || null,
    line_items: order.line_items || null,
    tax_lines: order.tax_lines || null,
    shipping_lines: order.shipping_lines || null,
    fee_lines: order.fee_lines || null,
    coupon_lines: order.coupon_lines || null,
    refunds: order.refunds || null,
    meta_data: order.meta_data?.length > 0 ? order.meta_data : null,
    cart_hash: order.cart_hash || null,
    date_created: order.date_created,
    date_created_gmt: order.date_created_gmt,
    date_modified: order.date_modified,
    date_modified_gmt: order.date_modified_gmt,
    date_completed: order.date_completed,
    date_completed_gmt: order.date_completed_gmt,
    date_paid: order.date_paid,
    date_paid_gmt: order.date_paid_gmt,
    raw_data: order,
    synced_at: new Date().toISOString(),
  }
}

function transformCustomer(customer: WooCommerceCustomer) {
  return {
    business: BUSINESS,
    wc_customer_id: customer.id,
    email: customer.email,
    username: customer.username || null,
    first_name: customer.first_name || null,
    last_name: customer.last_name || null,
    role: customer.role || null,
    is_paying_customer: customer.is_paying_customer,
    billing_first_name: customer.billing?.first_name || null,
    billing_last_name: customer.billing?.last_name || null,
    billing_company: customer.billing?.company || null,
    billing_address_1: customer.billing?.address_1 || null,
    billing_address_2: customer.billing?.address_2 || null,
    billing_city: customer.billing?.city || null,
    billing_state: customer.billing?.state || null,
    billing_postcode: customer.billing?.postcode || null,
    billing_country: customer.billing?.country || null,
    billing_email: customer.billing?.email || null,
    billing_phone: customer.billing?.phone || null,
    billing_address: customer.billing || null,
    shipping_first_name: customer.shipping?.first_name || null,
    shipping_last_name: customer.shipping?.last_name || null,
    shipping_company: customer.shipping?.company || null,
    shipping_address_1: customer.shipping?.address_1 || null,
    shipping_address_2: customer.shipping?.address_2 || null,
    shipping_city: customer.shipping?.city || null,
    shipping_state: customer.shipping?.state || null,
    shipping_postcode: customer.shipping?.postcode || null,
    shipping_country: customer.shipping?.country || null,
    shipping_address: customer.shipping || null,
    avatar_url: customer.avatar_url || null,
    meta_data: customer.meta_data?.length > 0 ? customer.meta_data : null,
    date_created: customer.date_created,
    date_created_gmt: customer.date_created_gmt,
    date_modified: customer.date_modified,
    date_modified_gmt: customer.date_modified_gmt,
    raw_data: customer,
    synced_at: new Date().toISOString(),
  }
}

function getLastSyncDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Red Hill Fresh - WooCommerce Data Sync')
  console.log('═══════════════════════════════════════════════════════════')

  const config = parseArgs()

  if (config.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n')
  }

  // Initialize WooCommerce connector
  // Credentials from vault: node creds.js load redhillfresh
  const wcUrl = process.env.REDHILLFRESH_WP_URL || 'https://redhillfresh.com.au'
  const wcKey = process.env.REDHILLFRESH_WC_CONSUMER_KEY
  const wcSecret = process.env.REDHILLFRESH_WC_CONSUMER_SECRET

  if (!wcKey || !wcSecret) {
    console.error('❌ Missing WooCommerce credentials!')
    console.error('   Load from vault: node creds.js load redhillfresh')
    console.error('   Required: REDHILLFRESH_WC_CONSUMER_KEY, REDHILLFRESH_WC_CONSUMER_SECRET')
    process.exit(1)
  }

  const wc = new WooCommerceConnector({
    url: wcUrl,
    consumerKey: wcKey,
    consumerSecret: wcSecret,
  })

  console.log(`📡 Connected to: ${wcUrl}`)

  // Initialize Supabase
  const supabaseUrl = process.env.BOO_SUPABASE_URL
  const supabaseKey = process.env.BOO_SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!')
    console.error('   Set BOO_SUPABASE_URL, BOO_SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log(`📦 Database: BOO Supabase`)

  const results: SyncResult[] = []
  const startTime = Date.now()

  // Run syncs
  if (config.syncCategories) {
    const logId = await startSyncLog(supabase, 'categories')
    const result = await syncCategories(wc, supabase, config)
    results.push(result)
    if (logId) await completeSyncLog(supabase, logId, result)
  }

  if (config.syncShipping) {
    const logId = await startSyncLog(supabase, 'shipping_zones')
    const result = await syncShippingZones(wc, supabase, config)
    results.push(result)
    if (logId) await completeSyncLog(supabase, logId, result)
  }

  if (config.syncProducts) {
    const logId = await startSyncLog(supabase, 'products')
    const result = await syncProducts(wc, supabase, config)
    results.push(result)
    if (logId) await completeSyncLog(supabase, logId, result)
  }

  if (config.syncCustomers) {
    const logId = await startSyncLog(supabase, 'customers')
    const result = await syncCustomers(wc, supabase, config)
    results.push(result)
    if (logId) await completeSyncLog(supabase, logId, result)
  }

  if (config.syncOrders) {
    const logId = await startSyncLog(supabase, 'orders')
    const result = await syncOrders(wc, supabase, config)
    results.push(result)
    if (logId) await completeSyncLog(supabase, logId, result)
  }

  if (config.syncConfig) {
    const logId = await startSyncLog(supabase, 'configuration')
    const result = await syncConfiguration(wc, supabase, config)
    results.push(result)
    if (logId) await completeSyncLog(supabase, logId, result)
  }

  // Summary
  const totalDuration = Date.now() - startTime
  const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.recordsFailed, 0)
  const allSuccess = results.every(r => r.success)

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  SYNC COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Status: ${allSuccess ? '✅ SUCCESS' : '⚠️ PARTIAL SUCCESS'}`)
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log(`  Records Processed: ${totalRecords}`)
  console.log(`  Errors: ${totalErrors}`)
  console.log('')

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌'
    console.log(`  ${icon} ${r.syncType}: ${r.recordsProcessed} records (${(r.duration / 1000).toFixed(1)}s)`)
  })

  console.log('═══════════════════════════════════════════════════════════\n')

  process.exit(allSuccess ? 0 : 1)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
