/**
 * Analyze Chart of Accounts
 *
 * Fetches and analyzes the chart of accounts from both Xero organizations.
 * Generates a comparison report and suggests initial mappings.
 *
 * Usage:
 *   npx tsx scripts/financials/analyze-chart-of-accounts.ts
 */

import { XeroConnector } from '../../shared/libs/integrations/xero'
import { logger } from '../../shared/libs/logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import { XeroAccount, AccountType, AccountClass } from '../../shared/libs/integrations/xero/types'

interface StoredCredentials {
  teelixir: {
    tenantId: string
    tenantName: string
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
  elevateWholesale: {
    tenantId: string
    tenantName: string
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
  updatedAt: string
}

interface AccountAnalysis {
  organization: string
  tenantId: string
  accounts: XeroAccount[]
  summary: {
    total: number
    active: number
    archived: number
    byType: Record<AccountType, number>
    byClass: Record<string, number>
  }
}

interface ComparisonReport {
  teelixir: AccountAnalysis
  elevateWholesale: AccountAnalysis
  comparison: {
    commonAccountCodes: string[]
    commonAccountNames: string[]
    teelixirOnly: string[]
    elevateOnly: string[]
    potentialMappings: Array<{
      elevateAccount: {
        code: string
        name: string
        type: AccountType
      }
      teelixirAccount: {
        code: string
        name: string
        type: AccountType
      }
      confidence: 'high' | 'medium' | 'low'
      reason: string
    }>
  }
}

const CREDENTIALS_FILE = path.join(__dirname, '..', '..', '.xero-credentials.json')
const ANALYSIS_FILE = path.join(__dirname, '..', '..', 'account-analysis.json')

/**
 * Load credentials from file
 */
async function loadCredentials(): Promise<StoredCredentials> {
  try {
    const data = await fs.readFile(CREDENTIALS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    throw new Error(
      'Credentials not found. Please run setup-xero-auth-direct.ts first.'
    )
  }
}

/**
 * Fetch and analyze accounts for an organization
 */
async function analyzeOrganization(
  client: XeroConnector,
  orgName: string,
  tenantId: string
): Promise<AccountAnalysis> {
  console.log(`\n📊 Analyzing ${orgName}...`)

  client.setTenant(tenantId)

  // Fetch all accounts
  const accounts = await client.accounts.list({ includeArchived: true })

  console.log(`   Found ${accounts.length} accounts`)

  // Calculate summary statistics
  const active = accounts.filter(a => a.Status === 'ACTIVE').length
  const archived = accounts.filter(a => a.Status === 'ARCHIVED').length

  const byType: Record<string, number> = {}
  const byClass: Record<string, number> = {}

  accounts.forEach(account => {
    // Count by type
    byType[account.Type] = (byType[account.Type] || 0) + 1

    // Count by class
    if (account.Class) {
      byClass[account.Class] = (byClass[account.Class] || 0) + 1
    }
  })

  return {
    organization: orgName,
    tenantId,
    accounts,
    summary: {
      total: accounts.length,
      active,
      archived,
      byType: byType as Record<AccountType, number>,
      byClass,
    },
  }
}

/**
 * Compare two organizations' chart of accounts
 */
function compareAccounts(
  teelixir: AccountAnalysis,
  elevate: AccountAnalysis
): ComparisonReport['comparison'] {
  console.log('\n🔍 Comparing accounts...')

  const teelixirCodes = new Set(teelixir.accounts.map(a => a.Code))
  const elevateCodes = new Set(elevate.accounts.map(a => a.Code))

  const teelixirNames = new Set(
    teelixir.accounts.map(a => a.Name.toLowerCase().trim())
  )
  const elevateNames = new Set(
    elevate.accounts.map(a => a.Name.toLowerCase().trim())
  )

  // Find common codes
  const commonAccountCodes = Array.from(teelixirCodes).filter(code =>
    elevateCodes.has(code)
  )

  // Find common names
  const commonAccountNames = Array.from(teelixirNames).filter(name =>
    elevateNames.has(name)
  )

  // Find unique codes
  const teelixirOnly = Array.from(teelixirCodes).filter(
    code => !elevateCodes.has(code)
  )
  const elevateOnly = Array.from(elevateCodes).filter(
    code => !teelixirCodes.has(code)
  )

  console.log(`   Common codes: ${commonAccountCodes.length}`)
  console.log(`   Common names: ${commonAccountNames.length}`)
  console.log(`   Teelixir only: ${teelixirOnly.length}`)
  console.log(`   Elevate only: ${elevateOnly.length}`)

  // Generate potential mappings
  const potentialMappings: ComparisonReport['comparison']['potentialMappings'] = []

  // Only process active accounts from Elevate
  const elevateActiveAccounts = elevate.accounts.filter(a => a.Status === 'ACTIVE')

  elevateActiveAccounts.forEach(elevateAccount => {
    let bestMatch: {
      account: XeroAccount
      confidence: 'high' | 'medium' | 'low'
      reason: string
    } | null = null

    // Strategy 1: Exact code match
    const exactCodeMatch = teelixir.accounts.find(
      t => t.Code === elevateAccount.Code && t.Status === 'ACTIVE'
    )
    if (exactCodeMatch) {
      bestMatch = {
        account: exactCodeMatch,
        confidence: 'high',
        reason: 'Exact account code match',
      }
    }

    // Strategy 2: Exact name match (case-insensitive)
    if (!bestMatch) {
      const exactNameMatch = teelixir.accounts.find(
        t =>
          t.Name.toLowerCase().trim() === elevateAccount.Name.toLowerCase().trim() &&
          t.Status === 'ACTIVE'
      )
      if (exactNameMatch) {
        bestMatch = {
          account: exactNameMatch,
          confidence: 'high',
          reason: 'Exact account name match',
        }
      }
    }

    // Strategy 3: Similar name and same type
    if (!bestMatch) {
      const similarNameMatch = teelixir.accounts.find(t => {
        if (t.Status !== 'ACTIVE' || t.Type !== elevateAccount.Type) {
          return false
        }

        const elevateNameLower = elevateAccount.Name.toLowerCase()
        const teelixirNameLower = t.Name.toLowerCase()

        // Check if names contain significant common words
        const elevateWords = elevateNameLower.split(/\s+/).filter(w => w.length > 3)
        const teelixirWords = teelixirNameLower.split(/\s+/).filter(w => w.length > 3)

        const commonWords = elevateWords.filter(w => teelixirWords.includes(w))

        return commonWords.length >= 2
      })

      if (similarNameMatch) {
        bestMatch = {
          account: similarNameMatch,
          confidence: 'medium',
          reason: `Similar name, same type (${elevateAccount.Type})`,
        }
      }
    }

    // Strategy 4: Same type and class, first match
    if (!bestMatch) {
      const typeClassMatch = teelixir.accounts.find(
        t =>
          t.Type === elevateAccount.Type &&
          t.Class === elevateAccount.Class &&
          t.Status === 'ACTIVE'
      )
      if (typeClassMatch) {
        bestMatch = {
          account: typeClassMatch,
          confidence: 'low',
          reason: `Same type (${elevateAccount.Type}) and class (${elevateAccount.Class})`,
        }
      }
    }

    if (bestMatch) {
      potentialMappings.push({
        elevateAccount: {
          code: elevateAccount.Code,
          name: elevateAccount.Name,
          type: elevateAccount.Type,
        },
        teelixirAccount: {
          code: bestMatch.account.Code,
          name: bestMatch.account.Name,
          type: bestMatch.account.Type,
        },
        confidence: bestMatch.confidence,
        reason: bestMatch.reason,
      })
    }
  })

  console.log(`   Generated ${potentialMappings.length} potential mappings`)
  console.log(
    `     High confidence: ${potentialMappings.filter(m => m.confidence === 'high').length}`
  )
  console.log(
    `     Medium confidence: ${potentialMappings.filter(m => m.confidence === 'medium').length}`
  )
  console.log(
    `     Low confidence: ${potentialMappings.filter(m => m.confidence === 'low').length}`
  )

  return {
    commonAccountCodes,
    commonAccountNames,
    teelixirOnly,
    elevateOnly,
    potentialMappings,
  }
}

/**
 * Print analysis report
 */
function printReport(report: ComparisonReport): void {
  console.log('\n' + '='.repeat(80))
  console.log('CHART OF ACCOUNTS ANALYSIS REPORT')
  console.log('='.repeat(80))

  // Teelixir Summary
  console.log(`\n📊 ${report.teelixir.organization}`)
  console.log('-'.repeat(80))
  console.log(`Total Accounts: ${report.teelixir.summary.total}`)
  console.log(`  Active: ${report.teelixir.summary.active}`)
  console.log(`  Archived: ${report.teelixir.summary.archived}`)
  console.log('\nBy Type:')
  Object.entries(report.teelixir.summary.byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)}: ${count}`)
    })

  // Elevate Summary
  console.log(`\n📊 ${report.elevateWholesale.organization}`)
  console.log('-'.repeat(80))
  console.log(`Total Accounts: ${report.elevateWholesale.summary.total}`)
  console.log(`  Active: ${report.elevateWholesale.summary.active}`)
  console.log(`  Archived: ${report.elevateWholesale.summary.archived}`)
  console.log('\nBy Type:')
  Object.entries(report.elevateWholesale.summary.byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)}: ${count}`)
    })

  // Comparison
  console.log('\n🔍 COMPARISON')
  console.log('-'.repeat(80))
  console.log(`Common Account Codes: ${report.comparison.commonAccountCodes.length}`)
  console.log(`Common Account Names: ${report.comparison.commonAccountNames.length}`)
  console.log(`Teelixir Only: ${report.comparison.teelixirOnly.length}`)
  console.log(`Elevate Only: ${report.comparison.elevateOnly.length}`)

  // Sample mappings
  console.log('\n🎯 SAMPLE POTENTIAL MAPPINGS (High Confidence)')
  console.log('-'.repeat(80))
  const highConfidenceMappings = report.comparison.potentialMappings
    .filter(m => m.confidence === 'high')
    .slice(0, 10)

  if (highConfidenceMappings.length === 0) {
    console.log('No high confidence mappings found.')
  } else {
    highConfidenceMappings.forEach(mapping => {
      console.log(`\n${mapping.elevateAccount.code} - ${mapping.elevateAccount.name}`)
      console.log(`  → ${mapping.teelixirAccount.code} - ${mapping.teelixirAccount.name}`)
      console.log(`  Reason: ${mapping.reason}`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log(`Full analysis saved to: ${ANALYSIS_FILE}`)
  console.log('='.repeat(80))
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Chart of Accounts Analysis')
  console.log('='.repeat(80))

  try {
    // Load credentials
    console.log('📂 Loading credentials...')
    const credentials = await loadCredentials()

    // Create Xero client instances
    const teelixirClient = new XeroConnector({
      clientId: process.env.XERO_TEELIXIR_CLIENT_ID || '',
      clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET || '',
    })

    const elevateClient = new XeroConnector({
      clientId: process.env.XERO_ELEVATE_CLIENT_ID || '',
      clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET || '',
    })

    // Store tokens
    const teelixirToken = {
      access_token: credentials.teelixir.accessToken,
      refresh_token: credentials.teelixir.refreshToken,
      expires_in: Math.max(0, Math.floor((credentials.teelixir.expiresAt - Date.now()) / 1000)),
      token_type: 'Bearer' as const,
      scope: 'offline_access',
    }

    const elevateToken = {
      access_token: credentials.elevateWholesale.accessToken,
      refresh_token: credentials.elevateWholesale.refreshToken,
      expires_in: Math.max(0, Math.floor((credentials.elevateWholesale.expiresAt - Date.now()) / 1000)),
      token_type: 'Bearer' as const,
      scope: 'offline_access',
    }

    teelixirClient.storeTokens(credentials.teelixir.tenantId, teelixirToken)
    elevateClient.storeTokens(credentials.elevateWholesale.tenantId, elevateToken)

    // Analyze both organizations
    const teelixirAnalysis = await analyzeOrganization(
      teelixirClient,
      credentials.teelixir.tenantName,
      credentials.teelixir.tenantId
    )

    const elevateAnalysis = await analyzeOrganization(
      elevateClient,
      credentials.elevateWholesale.tenantName,
      credentials.elevateWholesale.tenantId
    )

    // Compare accounts
    const comparison = compareAccounts(teelixirAnalysis, elevateAnalysis)

    // Build report
    const report: ComparisonReport = {
      teelixir: teelixirAnalysis,
      elevateWholesale: elevateAnalysis,
      comparison,
    }

    // Save report
    await fs.writeFile(ANALYSIS_FILE, JSON.stringify(report, null, 2), 'utf-8')

    // Print report
    printReport(report)

    // Log to Supabase
    await logger.info('Chart of accounts analysis completed', {
      source: 'xero',
      operation: 'analyze-coa',
      metadata: {
        teelixirAccounts: teelixirAnalysis.summary.total,
        elevateAccounts: elevateAnalysis.summary.total,
        potentialMappings: comparison.potentialMappings.length,
      },
    })

    console.log('\n✅ Analysis complete!')
    console.log('\n🎯 Next steps:')
    console.log('   1. Review the analysis file: account-analysis.json')
    console.log('   2. Run: npx tsx scripts/financials/suggest-mappings.ts')
    console.log('   3. Approve or modify suggested mappings')
  } catch (error) {
    console.error('\n❌ Error:', error)
    await logger.error('Chart of accounts analysis failed', {
      source: 'xero',
      operation: 'analyze-coa',
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { analyzeOrganization, compareAccounts }
