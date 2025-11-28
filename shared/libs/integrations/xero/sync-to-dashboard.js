/**
 * Xero to Dashboard Sync Script
 *
 * Syncs MTD P&L data from all 4 Xero accounts to the Master Dashboard Supabase
 *
 * Usage:
 *   node sync-to-dashboard.js           # Sync all businesses
 *   node sync-to-dashboard.js teelixir  # Sync specific business
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env'), override: true })
const { createClient } = require('@supabase/supabase-js')

// Dashboard Supabase (Master Hub)
const SUPABASE_URL = 'https://qcvfxxsnqvdfmpbcgdni.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.MASTER_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdmZ4eHNucXZkZm1wYmNnZG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU2NzIyNywiZXhwIjoyMDY0MTQzMjI3fQ.JLTj1pOvZLoWUKfCV5NtctNI-lkEBhCzF7C9Axm6nf8'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Business configurations
const BUSINESSES = {
  teelixir: {
    name: 'Teelixir',
    clientId: process.env.XERO_TEELIXIR_CLIENT_ID,
    clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET,
    refreshToken: process.env.XERO_TEELIXIR_REFRESH_TOKEN,
    tenantId: process.env.XERO_TEELIXIR_TENANT_ID,
  },
  elevate: {
    name: 'Elevate Wholesale',
    clientId: process.env.XERO_ELEVATE_CLIENT_ID,
    clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET,
    refreshToken: process.env.XERO_ELEVATE_REFRESH_TOKEN,
    tenantId: process.env.XERO_ELEVATE_TENANT_ID,
  },
  boo: {
    name: 'Buy Organics Online',
    clientId: process.env.XERO_BOO_CLIENT_ID,
    clientSecret: process.env.XERO_BOO_CLIENT_SECRET,
    refreshToken: process.env.XERO_BOO_REFRESH_TOKEN,
    tenantId: process.env.XERO_BOO_TENANT_ID,
  },
  rhf: {
    name: 'Red Hill Fresh',
    clientId: process.env.XERO_RHF_CLIENT_ID,
    clientSecret: process.env.XERO_RHF_CLIENT_SECRET,
    refreshToken: process.env.XERO_RHF_REFRESH_TOKEN,
    tenantId: process.env.XERO_RHF_TENANT_ID,
  },
}

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
    // Table may not exist yet
    return null
  }
}

/**
 * Store new refresh token in Supabase
 */
async function storeRefreshToken(businessKey, refreshToken) {
  try {
    const { error } = await supabase
      .from('xero_tokens')
      .upsert({
        business_key: businessKey,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_key',
      })

    if (error) {
      console.log(`  [Warning] Could not store new refresh token: ${error.message}`)
    } else {
      console.log(`  [Info] Stored new refresh token for ${businessKey}`)
    }
  } catch (e) {
    console.log(`  [Warning] Token storage not available: ${e.message}`)
  }
}

/**
 * Refresh Xero access token
 * Note: Xero refresh tokens are single-use. We save the new token for future use.
 */
async function refreshToken(config, businessKey) {
  // Try stored token first, fall back to env
  const storedToken = await getStoredRefreshToken(businessKey)
  const refreshTokenToUse = storedToken || config.refreshToken

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

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

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const tokenData = await response.json()

  // Store the new refresh token for next time (Xero tokens are single-use)
  if (tokenData.refresh_token) {
    await storeRefreshToken(businessKey, tokenData.refresh_token)
  }

  return tokenData
}

/**
 * Fetch P&L report from Xero
 */
async function fetchProfitAndLoss(accessToken, tenantId, fromDate, toDate) {
  const url = new URL('https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss')
  url.searchParams.set('fromDate', fromDate)
  url.searchParams.set('toDate', toDate)

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`P&L fetch failed: ${error}`)
  }

  return response.json()
}

/**
 * Parse P&L report to extract key metrics
 */
function parseProfitAndLoss(report) {
  const result = {
    revenue: 0,
    cogs: 0,
    gross_profit: 0,
    operating_expenses: 0,
    net_profit: 0,
  }

  if (!report.Reports || !report.Reports[0] || !report.Reports[0].Rows) {
    return result
  }

  const rows = report.Reports[0].Rows

  for (const section of rows) {
    if (section.RowType === 'Section' && section.Rows) {
      const title = section.Title || ''

      // Find the total row in this section
      for (const row of section.Rows) {
        if (row.RowType === 'SummaryRow' && row.Cells) {
          const value = parseFloat(row.Cells[1]?.Value || 0)

          if (title.toLowerCase().includes('income') || title.toLowerCase().includes('revenue')) {
            result.revenue = Math.abs(value)
          } else if (title.toLowerCase().includes('cost of sales') || title.toLowerCase().includes('cost of goods')) {
            result.cogs = Math.abs(value)
          } else if (title.toLowerCase().includes('gross profit')) {
            result.gross_profit = value
          } else if (title.toLowerCase().includes('operating expenses') || title.toLowerCase().includes('expenses')) {
            result.operating_expenses = Math.abs(value)
          }
        }
      }
    } else if (section.RowType === 'SummaryRow' && section.Cells) {
      // Net Profit is usually at the root level
      const title = section.Cells[0]?.Value || ''
      if (title.toLowerCase().includes('net profit') || title.toLowerCase().includes('net income')) {
        result.net_profit = parseFloat(section.Cells[1]?.Value || 0)
      }
    }
  }

  // Calculate gross profit if not found
  if (result.gross_profit === 0 && result.revenue > 0) {
    result.gross_profit = result.revenue - result.cogs
  }

  // Calculate net profit if not found
  if (result.net_profit === 0 && result.gross_profit !== 0) {
    result.net_profit = result.gross_profit - result.operating_expenses
  }

  return result
}

/**
 * Sync a single business
 */
async function syncBusiness(businessKey, config) {
  console.log(`\n[${businessKey}] Starting sync for ${config.name}...`)

  if (!config.clientId || !config.refreshToken || !config.tenantId) {
    console.log(`[${businessKey}] Missing credentials, skipping`)
    return { success: false, error: 'Missing credentials' }
  }

  try {
    // 1. Refresh access token
    console.log(`[${businessKey}] Refreshing access token...`)
    const tokenResponse = await refreshToken(config, businessKey)
    const accessToken = tokenResponse.access_token

    // 2. Calculate MTD date range
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = now

    const fromDate = periodStart.toISOString().split('T')[0]
    const toDate = periodEnd.toISOString().split('T')[0]

    console.log(`[${businessKey}] Fetching P&L for ${fromDate} to ${toDate}...`)

    // 3. Fetch P&L report
    const plReport = await fetchProfitAndLoss(accessToken, config.tenantId, fromDate, toDate)
    const metrics = parseProfitAndLoss(plReport)

    console.log(`[${businessKey}] Metrics:`, metrics)

    // 4. Calculate margins (capped to avoid overflow)
    let grossMarginPct = metrics.revenue > 0
      ? (metrics.gross_profit / metrics.revenue) * 100
      : 0
    let netMarginPct = metrics.revenue > 0
      ? (metrics.net_profit / metrics.revenue) * 100
      : 0

    // Cap margins to prevent numeric overflow (DB field is DECIMAL(5,2) = max 999.99)
    grossMarginPct = Math.max(-999.99, Math.min(999.99, grossMarginPct))
    netMarginPct = Math.max(-999.99, Math.min(999.99, netMarginPct))

    // 5. Upsert to Supabase
    const { error: upsertError } = await supabase
      .from('financial_snapshots')
      .upsert({
        business_key: businessKey,
        period_type: 'mtd',
        period_start: fromDate,
        period_end: toDate,
        revenue: metrics.revenue,
        cogs: metrics.cogs,
        gross_profit: metrics.gross_profit,
        operating_expenses: metrics.operating_expenses,
        net_profit: metrics.net_profit,
        gross_margin_pct: grossMarginPct,
        net_margin_pct: netMarginPct,
        raw_report: plReport,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_key,period_type,period_start',
      })

    if (upsertError) {
      throw new Error(`Supabase upsert failed: ${upsertError.message}`)
    }

    console.log(`[${businessKey}] Sync completed successfully`)
    return { success: true, metrics }

  } catch (error) {
    console.error(`[${businessKey}] Sync failed:`, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Main sync function
 */
async function main() {
  const args = process.argv.slice(2)
  const targetBusiness = args[0]

  console.log('='.repeat(60))
  console.log('Xero to Dashboard Sync')
  console.log('='.repeat(60))
  console.log(`Time: ${new Date().toISOString()}`)
  console.log(`Target: ${targetBusiness || 'all businesses'}`)

  const results = {}

  if (targetBusiness && BUSINESSES[targetBusiness]) {
    // Sync single business
    results[targetBusiness] = await syncBusiness(targetBusiness, BUSINESSES[targetBusiness])
  } else if (targetBusiness) {
    console.error(`Unknown business: ${targetBusiness}`)
    console.log('Available:', Object.keys(BUSINESSES).join(', '))
    process.exit(1)
  } else {
    // Sync all businesses
    for (const [key, config] of Object.entries(BUSINESSES)) {
      results[key] = await syncBusiness(key, config)
      // Small delay between businesses to avoid rate limits
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Sync Summary')
  console.log('='.repeat(60))

  for (const [key, result] of Object.entries(results)) {
    const status = result.success ? 'OK' : 'FAILED'
    console.log(`  ${key}: ${status}`)
    if (result.metrics) {
      console.log(`    Revenue: $${result.metrics.revenue.toLocaleString()}`)
      console.log(`    Net Profit: $${result.metrics.net_profit.toLocaleString()}`)
    }
    if (result.error) {
      console.log(`    Error: ${result.error}`)
    }
  }

  const successCount = Object.values(results).filter(r => r.success).length
  console.log(`\nCompleted: ${successCount}/${Object.keys(results).length} businesses synced`)
}

main().catch(console.error)
