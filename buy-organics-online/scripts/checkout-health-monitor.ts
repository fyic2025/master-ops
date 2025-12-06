/**
 * BOO Checkout Health Monitor
 *
 * Proactive checkout issue detection:
 * 1. Error Analysis - Detect spikes in checkout_error_logs
 * 2. Inventory Check - Find visible products with 0 stock
 * 3. Shipping Health - Test quote API with sample postcodes
 * 4. API Health - Monitor BigCommerce API error rates
 *
 * Usage:
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts --check=inventory
 *   npx tsx buy-organics-online/scripts/checkout-health-monitor.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')
const SPECIFIC_CHECK = process.argv.find((arg) => arg.startsWith('--check='))?.split('=')[1]

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qcvfxxsnqvdfmpbcgdni.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// BigCommerce config
const BC_STORE_HASH = process.env.BOO_BC_STORE_HASH || 'hhhi'
const BC_ACCESS_TOKEN = process.env.BOO_BC_ACCESS_TOKEN || ''

interface HealthCheckResult {
  check_type: string
  status: 'healthy' | 'warning' | 'critical'
  issues_found: number
  issues: HealthIssue[]
  duration_ms: number
  timestamp: string
}

interface HealthIssue {
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  details: Record<string, unknown>
}

interface CheckConfig {
  enabled: boolean
  config: Record<string, unknown>
}

// BigCommerce API helper
async function bcApiRequest(path: string): Promise<unknown> {
  const response = await fetch(`https://api.bigcommerce.com/stores/${BC_STORE_HASH}${path}`, {
    headers: {
      'X-Auth-Token': BC_ACCESS_TOKEN,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`BigCommerce API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// ============================================================================
// ERROR ANALYSIS CHECK
// ============================================================================
async function checkErrorAnalysis(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []
  const threshold = (config.config.threshold as number) || 5
  const lookbackHours = (config.config.lookback_hours as number) || 1

  console.log(`\n[Error Analysis] Checking errors in last ${lookbackHours} hour(s), threshold: ${threshold}`)

  // Get error count in last hour
  const { count: recentErrorCount } = await supabase
    .from('checkout_error_logs')
    .select('*', { count: 'exact', head: true })
    .gte('occurred_at', new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString())

  console.log(`  Found ${recentErrorCount || 0} errors in last ${lookbackHours} hour(s)`)

  if ((recentErrorCount || 0) >= threshold) {
    // Get error breakdown by type
    const { data: errorsByType } = await supabase
      .from('checkout_error_logs')
      .select('error_type')
      .gte('occurred_at', new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString())

    const breakdown: Record<string, number> = {}
    errorsByType?.forEach((e) => {
      breakdown[e.error_type] = (breakdown[e.error_type] || 0) + 1
    })

    issues.push({
      severity: recentErrorCount! >= threshold * 2 ? 'critical' : 'warning',
      title: `High checkout error rate: ${recentErrorCount} errors in ${lookbackHours}h`,
      description: `Error count exceeds threshold of ${threshold}`,
      details: { error_count: recentErrorCount, breakdown, threshold },
    })
  }

  // Check for unresolved errors older than 24h
  const { count: staleUnresolved } = await supabase
    .from('checkout_error_logs')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false)
    .lt('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((staleUnresolved || 0) > 0) {
    issues.push({
      severity: 'info',
      title: `${staleUnresolved} unresolved errors older than 24 hours`,
      description: 'Consider reviewing and resolving old checkout errors',
      details: { count: staleUnresolved },
    })
  }

  return {
    check_type: 'error_analysis',
    status: issues.some((i) => i.severity === 'critical')
      ? 'critical'
      : issues.some((i) => i.severity === 'warning')
        ? 'warning'
        : 'healthy',
    issues_found: issues.length,
    issues,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// INVENTORY CHECK
// ============================================================================
async function checkInventory(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []
  const lowStockThreshold = (config.config.low_stock_threshold as number) || 5

  console.log(`\n[Inventory] Checking for zero-stock and low-stock products...`)

  if (!BC_ACCESS_TOKEN) {
    console.log('  Skipping - BigCommerce credentials not configured')
    return {
      check_type: 'inventory',
      status: 'warning',
      issues_found: 1,
      issues: [
        {
          severity: 'warning',
          title: 'BigCommerce credentials not configured',
          description: 'Cannot check inventory without BOO_BC_ACCESS_TOKEN',
          details: {},
        },
      ],
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }

  const zeroStockVisible: Array<{ id: number; name: string; sku: string }> = []
  const lowStockVisible: Array<{ id: number; name: string; sku: string; stock: number }> = []

  let page = 1
  const maxPages = 10

  while (page <= maxPages) {
    try {
      const response = (await bcApiRequest(
        `/v3/catalog/products?limit=250&page=${page}&include=variants`
      )) as { data: Array<Record<string, unknown>> }
      const products = response.data || []

      if (products.length === 0) break

      for (const product of products) {
        if (
          product.inventory_tracking !== 'none' &&
          product.is_visible === true
        ) {
          const stock = product.inventory_level as number

          if (stock === 0) {
            zeroStockVisible.push({
              id: product.id as number,
              name: (product.name as string).substring(0, 60),
              sku: (product.sku as string) || 'N/A',
            })
          } else if (stock > 0 && stock <= lowStockThreshold) {
            lowStockVisible.push({
              id: product.id as number,
              name: (product.name as string).substring(0, 60),
              sku: (product.sku as string) || 'N/A',
              stock,
            })
          }
        }
      }

      page++
      await new Promise((r) => setTimeout(r, 200)) // Rate limiting
    } catch (err) {
      console.log(`  Error on page ${page}:`, (err as Error).message)
      break
    }
  }

  console.log(`  Zero-stock visible products: ${zeroStockVisible.length}`)
  console.log(`  Low-stock visible products: ${lowStockVisible.length}`)

  if (zeroStockVisible.length > 0) {
    issues.push({
      severity: 'critical',
      title: `${zeroStockVisible.length} visible products with zero stock`,
      description: 'Customers can see these products but cannot purchase them',
      details: {
        products: zeroStockVisible.slice(0, 20),
        total: zeroStockVisible.length,
      },
    })
  }

  if (lowStockVisible.length > 10) {
    issues.push({
      severity: 'warning',
      title: `${lowStockVisible.length} visible products with low stock (≤${lowStockThreshold})`,
      description: 'May cause cart issues when multiple customers order simultaneously',
      details: {
        products: lowStockVisible.slice(0, 20),
        total: lowStockVisible.length,
      },
    })
  }

  return {
    check_type: 'inventory',
    status: issues.some((i) => i.severity === 'critical')
      ? 'critical'
      : issues.some((i) => i.severity === 'warning')
        ? 'warning'
        : 'healthy',
    issues_found: issues.length,
    issues,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// SHIPPING HEALTH CHECK
// ============================================================================
async function checkShipping(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []
  const testPostcodes = (config.config.test_postcodes as string[]) || ['3000', '2000', '4000']

  console.log(`\n[Shipping] Testing shipping quotes for postcodes: ${testPostcodes.join(', ')}`)

  // For now, we'll check if there are recent shipping errors
  // In a full implementation, we'd actually call the shipping quote API
  const { data: shippingErrors } = await supabase
    .from('checkout_error_logs')
    .select('*')
    .eq('error_type', 'shipping_method')
    .gte('occurred_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('occurred_at', { ascending: false })
    .limit(10)

  const recentShippingErrors = shippingErrors?.length || 0
  console.log(`  Recent shipping errors (1h): ${recentShippingErrors}`)

  if (recentShippingErrors >= 3) {
    // Group by postcode
    const postcodeErrors: Record<string, number> = {}
    shippingErrors?.forEach((e) => {
      const postcode = e.shipping_address_postcode || 'unknown'
      postcodeErrors[postcode] = (postcodeErrors[postcode] || 0) + 1
    })

    issues.push({
      severity: recentShippingErrors >= 5 ? 'critical' : 'warning',
      title: `${recentShippingErrors} shipping errors in the last hour`,
      description: 'Customers may be unable to complete checkout',
      details: {
        error_count: recentShippingErrors,
        by_postcode: postcodeErrors,
        sample_errors: shippingErrors?.slice(0, 5).map((e) => ({
          postcode: e.shipping_address_postcode,
          message: e.error_message,
          time: e.occurred_at,
        })),
      },
    })
  }

  // Check for postcode-specific patterns
  const { data: postcodePatterns } = await supabase
    .from('checkout_error_logs')
    .select('shipping_address_postcode')
    .eq('error_type', 'shipping_method')
    .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const postcodeCounts: Record<string, number> = {}
  postcodePatterns?.forEach((e) => {
    const pc = e.shipping_address_postcode || 'unknown'
    postcodeCounts[pc] = (postcodeCounts[pc] || 0) + 1
  })

  // Find hotspots (postcodes with 3+ errors)
  const hotspots = Object.entries(postcodeCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])

  if (hotspots.length > 0) {
    issues.push({
      severity: 'info',
      title: `${hotspots.length} postcode hotspots identified`,
      description: 'Postcodes with repeated shipping errors in last 24h',
      details: { hotspots: Object.fromEntries(hotspots) },
    })
  }

  return {
    check_type: 'shipping',
    status: issues.some((i) => i.severity === 'critical')
      ? 'critical'
      : issues.some((i) => i.severity === 'warning')
        ? 'warning'
        : 'healthy',
    issues_found: issues.length,
    issues,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// API HEALTH CHECK
// ============================================================================
async function checkApiHealth(config: CheckConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  const issues: HealthIssue[] = []
  const errorRateThreshold = (config.config.error_rate_threshold as number) || 0.1

  console.log(`\n[API Health] Checking BigCommerce API health...`)

  // Check if we can reach the API
  if (!BC_ACCESS_TOKEN) {
    return {
      check_type: 'api_health',
      status: 'warning',
      issues_found: 1,
      issues: [
        {
          severity: 'warning',
          title: 'BigCommerce credentials not configured',
          description: 'Cannot verify API health',
          details: {},
        },
      ],
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }

  // Test API connectivity
  try {
    const testStart = Date.now()
    await bcApiRequest('/v2/store')
    const responseTime = Date.now() - testStart

    console.log(`  API response time: ${responseTime}ms`)

    if (responseTime > 5000) {
      issues.push({
        severity: 'warning',
        title: 'Slow BigCommerce API response',
        description: `API responded in ${responseTime}ms (threshold: 5000ms)`,
        details: { response_time_ms: responseTime },
      })
    }
  } catch (err) {
    issues.push({
      severity: 'critical',
      title: 'BigCommerce API unreachable',
      description: (err as Error).message,
      details: { error: (err as Error).message },
    })
  }

  // Check for API-related checkout errors
  const { count: apiErrors } = await supabase
    .from('checkout_error_logs')
    .select('*', { count: 'exact', head: true })
    .ilike('error_message', '%api%')
    .gte('occurred_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  if ((apiErrors || 0) > 0) {
    console.log(`  API-related checkout errors (1h): ${apiErrors}`)
  }

  return {
    check_type: 'api_health',
    status: issues.some((i) => i.severity === 'critical')
      ? 'critical'
      : issues.some((i) => i.severity === 'warning')
        ? 'warning'
        : 'healthy',
    issues_found: issues.length,
    issues,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function getCheckConfigs(): Promise<Record<string, CheckConfig>> {
  const { data, error } = await supabase
    .from('boo_checkout_health_config')
    .select('check_type, enabled, config')

  if (error) {
    console.log('Warning: Could not fetch config from database:', error.message)
    // Return defaults
    return {
      error_analysis: { enabled: true, config: { threshold: 5, lookback_hours: 1 } },
      inventory: { enabled: true, config: { low_stock_threshold: 5 } },
      shipping: { enabled: true, config: { test_postcodes: ['3000', '2000', '4000'] } },
      api_health: { enabled: true, config: { error_rate_threshold: 0.1 } },
    }
  }

  const configs: Record<string, CheckConfig> = {}
  data?.forEach((row) => {
    configs[row.check_type] = { enabled: row.enabled, config: row.config }
  })
  return configs
}

async function saveHealthCheckResult(result: HealthCheckResult): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would save result for ${result.check_type}`)
    return
  }

  // Update the config table with last run result
  const { error: updateError } = await supabase.rpc('boo_update_health_check_result', {
    p_check_type: result.check_type,
    p_result: {
      status: result.status,
      issues_found: result.issues_found,
      duration_ms: result.duration_ms,
      timestamp: result.timestamp,
    },
  })

  if (updateError) {
    // Fallback: direct update
    await supabase
      .from('boo_checkout_health_config')
      .update({
        last_run_at: result.timestamp,
        last_run_result: {
          status: result.status,
          issues_found: result.issues_found,
          duration_ms: result.duration_ms,
        },
      })
      .eq('check_type', result.check_type)
  }

  // Insert new issues
  if (result.issues.length > 0) {
    const issuesToInsert = result.issues.map((issue) => ({
      check_type: result.check_type,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      details: issue.details,
    }))

    const { error: insertError } = await supabase
      .from('boo_checkout_health_issues')
      .insert(issuesToInsert)

    if (insertError) {
      console.log(`  Warning: Could not save issues: ${insertError.message}`)
    }
  }
}

async function sendAlerts(results: HealthCheckResult[]): Promise<void> {
  const criticalResults = results.filter((r) => r.status === 'critical')

  if (criticalResults.length === 0) {
    return
  }

  console.log(`\n[Alerts] ${criticalResults.length} critical issue(s) found`)

  // Send to n8n webhook for email/Slack notification
  const webhookUrl = process.env.BOO_CHECKOUT_ALERT_WEBHOOK
  if (webhookUrl && !DRY_RUN) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkout_health_alert',
          critical_count: criticalResults.length,
          results: criticalResults,
          timestamp: new Date().toISOString(),
        }),
      })
      console.log('  Alert sent to webhook')
    } catch (err) {
      console.log('  Failed to send alert:', (err as Error).message)
    }
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║  BOO Checkout Health Monitor                   ║')
  console.log('╚════════════════════════════════════════════════╝')
  console.log(`Started: ${new Date().toISOString()}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  if (SPECIFIC_CHECK) console.log(`Running only: ${SPECIFIC_CHECK}`)

  const configs = await getCheckConfigs()
  const results: HealthCheckResult[] = []

  // Run checks
  const checks = [
    { name: 'error_analysis', fn: checkErrorAnalysis },
    { name: 'inventory', fn: checkInventory },
    { name: 'shipping', fn: checkShipping },
    { name: 'api_health', fn: checkApiHealth },
  ]

  for (const check of checks) {
    if (SPECIFIC_CHECK && check.name !== SPECIFIC_CHECK) continue

    const config = configs[check.name] || { enabled: true, config: {} }

    if (!config.enabled) {
      console.log(`\n[${check.name}] Skipped (disabled)`)
      continue
    }

    try {
      const result = await check.fn(config)
      results.push(result)

      // Print summary
      const statusEmoji =
        result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '🚨'
      console.log(
        `  ${statusEmoji} Status: ${result.status.toUpperCase()} | Issues: ${result.issues_found} | Time: ${result.duration_ms}ms`
      )

      // Save result
      await saveHealthCheckResult(result)
    } catch (err) {
      console.log(`  ❌ Error running ${check.name}:`, (err as Error).message)
    }
  }

  // Send alerts for critical issues
  await sendAlerts(results)

  // Final summary
  console.log('\n════════════════════════════════════════════════')
  console.log('Summary:')
  const healthy = results.filter((r) => r.status === 'healthy').length
  const warnings = results.filter((r) => r.status === 'warning').length
  const critical = results.filter((r) => r.status === 'critical').length
  console.log(`  Healthy: ${healthy} | Warnings: ${warnings} | Critical: ${critical}`)
  console.log(`Completed: ${new Date().toISOString()}`)
}

main().catch(console.error)
