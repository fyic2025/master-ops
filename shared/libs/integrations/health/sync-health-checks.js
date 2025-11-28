/**
 * Health Check Sync Script
 *
 * Runs health checks on all integrations and updates dashboard_health_checks table
 *
 * Usage:
 *   node sync-health-checks.js           # Run all health checks
 *   node sync-health-checks.js boo       # Run checks for specific business
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env'), override: true })
const { createClient } = require('@supabase/supabase-js')

// Dashboard Supabase (Master Hub)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Get stored refresh token from Supabase (if available)
 */
async function getStoredRefreshToken(businessKey) {
  try {
    const { data, error } = await supabase
      .from('xero_tokens')
      .select('refresh_token')
      .eq('business_key', businessKey)
      .single()

    if (error || !data) return null
    return data.refresh_token
  } catch {
    return null
  }
}

/**
 * Store new refresh token in Supabase
 */
async function storeRefreshToken(businessKey, refreshToken) {
  try {
    await supabase
      .from('xero_tokens')
      .upsert({
        business_key: businessKey,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_key',
      })
  } catch {
    // Ignore storage errors
  }
}

/**
 * Create Xero health check that uses stored tokens
 */
function createXeroCheck(businessKey, envPrefix) {
  return async () => {
    const clientId = process.env[`XERO_${envPrefix}_CLIENT_ID`]
    const clientSecret = process.env[`XERO_${envPrefix}_CLIENT_SECRET`]
    const envRefreshToken = process.env[`XERO_${envPrefix}_REFRESH_TOKEN`]

    if (!clientId) return { ok: false, error: 'Missing Xero credentials' }

    // Try stored token first, fall back to env
    const storedToken = await getStoredRefreshToken(businessKey)
    const refreshTokenToUse = storedToken || envRefreshToken

    if (!refreshTokenToUse) return { ok: false, error: 'No refresh token available' }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      const start = Date.now()
      const response = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshTokenToUse,
        }),
      })

      if (response.ok) {
        // Store the new token for next time (Xero tokens are single-use)
        const tokenData = await response.json()
        if (tokenData.refresh_token) {
          await storeRefreshToken(businessKey, tokenData.refresh_token)
        }
      }

      return { ok: response.ok, latency: Date.now() - start }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }
}

// Integration check configurations
const INTEGRATIONS = {
  // BOO
  boo_supabase: {
    business: 'boo',
    integration: 'supabase',
    check: async () => {
      const url = process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co'
      const apiKey = process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || process.env.BOO_SUPABASE_ANON_KEY
      if (!apiKey) return { ok: false, error: 'Missing Supabase API key' }
      const start = Date.now()
      const response = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': apiKey },
      })
      return { ok: response.ok, latency: Date.now() - start }
    },
  },
  boo_bigcommerce: {
    business: 'boo',
    integration: 'bigcommerce',
    check: async () => {
      // Check both env var naming conventions
      const storeHash = process.env.BC_BOO_STORE_HASH || process.env.BOO_BC_STORE_HASH
      const accessToken = process.env.BC_BOO_ACCESS_TOKEN || process.env.BOO_BC_ACCESS_TOKEN
      if (!storeHash || !accessToken) return { ok: false, error: 'Missing credentials' }

      const start = Date.now()
      const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/summary`, {
        headers: {
          'X-Auth-Token': accessToken,
          'Accept': 'application/json',
        },
      })
      return { ok: response.ok, latency: Date.now() - start }
    },
  },
  boo_xero: {
    business: 'boo',
    integration: 'xero',
    check: createXeroCheck('boo', 'BOO'),
  },

  // Teelixir
  teelixir_supabase: {
    business: 'teelixir',
    integration: 'supabase',
    check: async () => {
      // Master hub is the Teelixir project - use service key for health check
      const apiKey = SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!apiKey) return { ok: false, error: 'Missing Supabase API key' }
      const start = Date.now()
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': apiKey },
      })
      return { ok: response.ok, latency: Date.now() - start }
    },
  },
  elevate_shopify: {
    business: 'elevate',
    integration: 'shopify',
    check: async () => {
      const shopUrl = process.env.ELEVATE_SHOPIFY_STORE_URL || 'elevatewholesale.myshopify.com'
      const accessToken = process.env.ELEVATE_SHOPIFY_ACCESS_TOKEN
      if (!accessToken) return { ok: false, error: 'Missing Shopify credentials' }

      const start = Date.now()
      const response = await fetch(`https://${shopUrl}/admin/api/2024-10/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      })
      return { ok: response.ok, latency: Date.now() - start }
    },
  },
  teelixir_xero: {
    business: 'teelixir',
    integration: 'xero',
    check: createXeroCheck('teelixir', 'TEELIXIR'),
  },

  // Elevate
  elevate_supabase: {
    business: 'elevate',
    integration: 'supabase',
    check: async () => {
      const url = process.env.ELEVATE_SUPABASE_URL
      if (!url) return { ok: false, error: 'Missing Elevate Supabase URL' }
      const start = Date.now()
      const response = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': process.env.ELEVATE_SUPABASE_ANON_KEY || '' },
      })
      return { ok: response.ok, latency: Date.now() - start }
    },
  },
  elevate_xero: {
    business: 'elevate',
    integration: 'xero',
    check: createXeroCheck('elevate', 'ELEVATE'),
  },

  // RHF
  rhf_xero: {
    business: 'rhf',
    integration: 'xero',
    check: createXeroCheck('rhf', 'RHF'),
  },
}

/**
 * Run a single health check
 */
async function runCheck(key, config) {
  console.log(`  Checking ${config.business}/${config.integration}...`)

  try {
    const result = await Promise.race([
      config.check(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)),
    ])

    const status = result.ok ? 'healthy' : 'degraded'
    const errorMessage = result.error || null

    return {
      business: config.business,
      integration: config.integration,
      status,
      latency_ms: result.latency || null,
      error_message: errorMessage,
    }
  } catch (err) {
    return {
      business: config.business,
      integration: config.integration,
      status: 'down',
      latency_ms: null,
      error_message: err.message,
    }
  }
}

/**
 * Update health check in database
 */
async function updateHealthCheck(check) {
  const { error } = await supabase
    .from('dashboard_health_checks')
    .upsert({
      business: check.business,
      integration: check.integration,
      status: check.status,
      latency_ms: check.latency_ms,
      last_check: new Date().toISOString(),
      error_message: check.error_message,
    }, {
      onConflict: 'business,integration',
    })

  if (error) {
    console.error(`    Failed to update ${check.business}/${check.integration}:`, error.message)
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const targetBusiness = args[0]

  console.log('='.repeat(60))
  console.log('Health Check Sync')
  console.log('='.repeat(60))
  console.log(`Time: ${new Date().toISOString()}`)
  console.log(`Target: ${targetBusiness || 'all businesses'}`)
  console.log('')

  const results = []

  for (const [key, config] of Object.entries(INTEGRATIONS)) {
    if (targetBusiness && config.business !== targetBusiness) {
      continue
    }

    const result = await runCheck(key, config)
    results.push(result)

    const statusEmoji = result.status === 'healthy' ? '✓' : result.status === 'degraded' ? '!' : '✗'
    console.log(`    ${statusEmoji} ${result.status} (${result.latency_ms || '--'}ms)${result.error_message ? ` - ${result.error_message}` : ''}`)

    await updateHealthCheck(result)
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))

  const healthy = results.filter(r => r.status === 'healthy').length
  const degraded = results.filter(r => r.status === 'degraded').length
  const down = results.filter(r => r.status === 'down').length

  console.log(`  Healthy: ${healthy}`)
  console.log(`  Degraded: ${degraded}`)
  console.log(`  Down: ${down}`)
  console.log(`  Total: ${results.length}`)
}

main().catch(console.error)
