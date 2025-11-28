/**
 * Sync MTD Revenue from Xero
 *
 * Fetches Profit & Loss reports from all 4 Xero organizations
 * and stores MTD snapshots in Supabase for dashboard display.
 *
 * IMPORTANT: Automatically saves new refresh tokens to .env file
 *
 * Usage:
 *   npx tsx scripts/financials/sync-mtd-revenue.ts
 */

import * as path from 'path'
import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load .env directly to bypass dotenvx caching
const envPath = path.resolve(__dirname, '../../.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})
// Merge into process.env
Object.assign(process.env, envVars)

interface BusinessConfig {
  key: string
  name: string
  clientId: string
  clientSecret: string
  refreshToken: string
  tenantId: string
  envKey: string  // The .env variable name for refresh token
}

const BUSINESSES: BusinessConfig[] = [
  {
    key: 'teelixir',
    name: 'Teelixir',
    clientId: process.env.XERO_TEELIXIR_CLIENT_ID || '',
    clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_TEELIXIR_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_TEELIXIR_TENANT_ID || '',
    envKey: 'XERO_TEELIXIR_REFRESH_TOKEN',
  },
  {
    key: 'elevate',
    name: 'Elevate Wholesale',
    clientId: process.env.XERO_ELEVATE_CLIENT_ID || '',
    clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_ELEVATE_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_ELEVATE_TENANT_ID || '',
    envKey: 'XERO_ELEVATE_REFRESH_TOKEN',
  },
  {
    key: 'boo',
    name: 'Buy Organics Online',
    clientId: process.env.XERO_BOO_CLIENT_ID || '',
    clientSecret: process.env.XERO_BOO_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_BOO_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_BOO_TENANT_ID || '',
    envKey: 'XERO_BOO_REFRESH_TOKEN',
  },
  {
    key: 'rhf',
    name: 'Red Hill Fresh',
    clientId: process.env.XERO_RHF_CLIENT_ID || '',
    clientSecret: process.env.XERO_RHF_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_RHF_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_RHF_TENANT_ID || '',
    envKey: 'XERO_RHF_REFRESH_TOKEN',
  },
]

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface XeroToken {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface FinancialSnapshot {
  business_key: string
  period_type: string
  period_start: string
  period_end: string
  revenue: number | null
  cogs: number | null
  gross_profit: number | null
  operating_expenses: number | null
  net_profit: number | null
  gross_margin_pct: number | null
  net_margin_pct: number | null
  raw_report: any
}

// Update .env file with new refresh token
function updateEnvFile(envKey: string, newValue: string): void {
  try {
    let envContent = fs.readFileSync(envPath, 'utf-8')

    // Use regex to replace the specific key
    const regex = new RegExp(`^${envKey}=.*$`, 'm')

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${envKey}=${newValue}`)
    } else {
      // Key doesn't exist, append it
      envContent += `\n${envKey}=${newValue}`
    }

    fs.writeFileSync(envPath, envContent)
    console.log(`   💾 Saved new refresh token to .env`)
  } catch (error: any) {
    console.error(`   ⚠️  Failed to save token: ${error.message}`)
  }
}

async function refreshToken(config: BusinessConfig): Promise<XeroToken> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} - ${text.substring(0, 200)}`)
  }

  const tokenData = JSON.parse(text) as XeroToken

  // AUTOMATICALLY save the new refresh token
  if (tokenData.refresh_token && tokenData.refresh_token !== config.refreshToken) {
    updateEnvFile(config.envKey, tokenData.refresh_token)
    // Also update in memory for any subsequent calls
    config.refreshToken = tokenData.refresh_token
  }

  return tokenData
}

async function getProfitAndLoss(
  accessToken: string,
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<any> {
  const params = new URLSearchParams({
    fromDate,
    toDate,
  })

  const response = await fetch(
    `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'xero-tenant-id': tenantId,
        'Accept': 'application/json',
      },
    }
  )

  const text = await response.text()
  if (!response.ok) {
    throw new Error(`P&L fetch failed: ${response.status} - ${text.substring(0, 200)}`)
  }

  return JSON.parse(text)
}

function parseXeroReport(report: any): {
  revenue: number
  cogs: number
  grossProfit: number
  operatingExpenses: number
  netProfit: number
} {
  let revenue = 0
  let cogs = 0
  let grossProfit = 0
  let operatingExpenses = 0
  let netProfit = 0

  if (!report?.Reports?.[0]?.Rows) {
    return { revenue, cogs, grossProfit, operatingExpenses, netProfit }
  }

  const rows = report.Reports[0].Rows

  for (const section of rows) {
    if (section.RowType === 'Section') {
      const title = section.Title?.toLowerCase() || ''

      // Find the summary row for this section
      let sectionTotal = 0
      if (section.Rows) {
        for (const row of section.Rows) {
          if (row.RowType === 'SummaryRow' || row.RowType === 'Row') {
            const cells = row.Cells || []
            for (const cell of cells) {
              if (cell.Value && !isNaN(parseFloat(cell.Value))) {
                sectionTotal = parseFloat(cell.Value)
                break
              }
            }
          }
        }
      }

      if (title.includes('income') || title.includes('revenue') || title.includes('sales')) {
        revenue += Math.abs(sectionTotal)
      } else if (title.includes('cost of') || title.includes('direct cost') || title.includes('cogs')) {
        cogs += Math.abs(sectionTotal)
      } else if (title.includes('expense') || title.includes('overhead') || title.includes('operating')) {
        operatingExpenses += Math.abs(sectionTotal)
      } else if (title.includes('gross profit')) {
        grossProfit = sectionTotal
      } else if (title.includes('net profit') || title.includes('net income')) {
        netProfit = sectionTotal
      }
    } else if (section.RowType === 'SummaryRow') {
      const cells = section.Cells || []
      for (const cell of cells) {
        if (cell.Value && !isNaN(parseFloat(cell.Value))) {
          netProfit = parseFloat(cell.Value)
          break
        }
      }
    }
  }

  if (grossProfit === 0 && revenue > 0) {
    grossProfit = revenue - cogs
  }
  if (netProfit === 0 && grossProfit !== 0) {
    netProfit = grossProfit - operatingExpenses
  }

  return { revenue, cogs, grossProfit, operatingExpenses, netProfit }
}

function getMTDDates(): { fromDate: string; toDate: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const fromDate = new Date(year, month, 1)
  const toDate = now

  return {
    fromDate: fromDate.toISOString().split('T')[0],
    toDate: toDate.toISOString().split('T')[0],
  }
}

async function syncBusiness(config: BusinessConfig): Promise<FinancialSnapshot | null> {
  if (!config.clientId || !config.refreshToken || !config.tenantId) {
    console.log(`   ⏭️  Skipped: Missing credentials`)
    return null
  }

  try {
    console.log(`   Refreshing token...`)
    const token = await refreshToken(config)

    const { fromDate, toDate } = getMTDDates()
    console.log(`   Fetching P&L (${fromDate} to ${toDate})...`)

    const report = await getProfitAndLoss(token.access_token, config.tenantId, fromDate, toDate)
    const { revenue, cogs, grossProfit, operatingExpenses, netProfit } = parseXeroReport(report)

    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : null
    const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : null

    const snapshot: FinancialSnapshot = {
      business_key: config.key,
      period_type: 'mtd',
      period_start: fromDate,
      period_end: toDate,
      revenue: revenue || null,
      cogs: cogs || null,
      gross_profit: grossProfit || null,
      operating_expenses: operatingExpenses || null,
      net_profit: netProfit || null,
      gross_margin_pct: grossMarginPct ? Math.round(grossMarginPct * 100) / 100 : null,
      net_margin_pct: netMarginPct ? Math.round(netMarginPct * 100) / 100 : null,
      raw_report: report,
    }

    console.log(`   ✅ Revenue: $${revenue.toLocaleString()} | Net Profit: $${netProfit.toLocaleString()}`)

    return snapshot
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║  SYNC MTD REVENUE FROM XERO                                       ║')
  console.log('║  (Auto-saves new refresh tokens to .env)                          ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

  const { fromDate, toDate } = getMTDDates()
  console.log(`Period: ${fromDate} to ${toDate}\n`)

  const snapshots: FinancialSnapshot[] = []

  for (const biz of BUSINESSES) {
    console.log(`📊 ${biz.name}`)
    const snapshot = await syncBusiness(biz)
    if (snapshot) {
      snapshots.push(snapshot)
    }
    console.log('')
  }

  if (snapshots.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('SAVING TO SUPABASE')
    console.log('═══════════════════════════════════════════════════════════════════\n')

    for (const snapshot of snapshots) {
      const { error } = await supabase
        .from('financial_snapshots')
        .upsert(snapshot, {
          onConflict: 'business_key,period_type,period_start',
        })

      if (error) {
        console.log(`  ❌ ${snapshot.business_key}: ${error.message}`)
      } else {
        console.log(`  ✅ ${snapshot.business_key}: Saved`)
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════')
  console.log('MTD REVENUE SUMMARY')
  console.log('═══════════════════════════════════════════════════════════════════\n')

  let totalRevenue = 0
  let totalNetProfit = 0

  for (const s of snapshots) {
    const rev = s.revenue || 0
    const net = s.net_profit || 0
    totalRevenue += rev
    totalNetProfit += net
    console.log(`  ${s.business_key.padEnd(10)} Revenue: $${rev.toLocaleString().padStart(12)} | Net: $${net.toLocaleString().padStart(10)}`)
  }

  console.log('  ' + '─'.repeat(55))
  console.log(`  ${'TOTAL'.padEnd(10)} Revenue: $${totalRevenue.toLocaleString().padStart(12)} | Net: $${totalNetProfit.toLocaleString().padStart(10)}`)
  console.log('\n')
}

main().catch(console.error)
