/**
 * Manual Xero OAuth Setup Script
 *
 * Sets up Xero authentication with manual callback URL entry.
 * Perfect for remote server environments without browser access.
 *
 * Usage:
 *   npx tsx scripts/financials/setup-xero-auth-manual.ts
 */

import { XeroConnector } from '../../shared/libs/integrations/xero'
import { logger } from '../../shared/libs/logger'
import * as readline from 'readline'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as url from 'url'

// Credentials from environment
const TEELIXIR_CLIENT_ID = process.env.XERO_TEELIXIR_CLIENT_ID || 'D4D023D4A6F34120866AA7FEC96E8250'
const TEELIXIR_CLIENT_SECRET = process.env.XERO_TEELIXIR_CLIENT_SECRET || ''

const ELEVATE_CLIENT_ID = process.env.XERO_ELEVATE_CLIENT_ID || '1E2EE797CCFC4CEC8F8E0CCD75940869'
const ELEVATE_CLIENT_SECRET = process.env.XERO_ELEVATE_CLIENT_SECRET || ''

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

const CREDENTIALS_FILE = path.join(__dirname, '..', '..', '.xero-credentials.json')

/**
 * Prompt user for input
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * Extract authorization code from callback URL
 */
function extractCodeFromUrl(callbackUrl: string): string | null {
  try {
    const parsedUrl = url.parse(callbackUrl, true)
    return parsedUrl.query.code as string || null
  } catch (error) {
    return null
  }
}

/**
 * Save credentials to file
 */
async function saveCredentials(credentials: StoredCredentials): Promise<void> {
  await fs.writeFile(
    CREDENTIALS_FILE,
    JSON.stringify(credentials, null, 2),
    'utf-8'
  )
  console.log(`\n✅ Credentials saved to: ${CREDENTIALS_FILE}`)
}

/**
 * Authenticate a single organization with manual callback
 */
async function authenticateOrg(
  orgName: string,
  clientId: string,
  clientSecret: string
): Promise<{ tenantId: string; tenantName: string; token: any }> {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`🔐 Authenticating ${orgName}`)
  console.log('='.repeat(80))

  // Create client instance for this org
  const client = new XeroConnector({
    clientId,
    clientSecret,
    redirectUri: 'https://xero.com/',
    scopes: [
      'offline_access',
      'accounting.transactions.read',
      'accounting.journals.read',
      'accounting.reports.read',
      'accounting.contacts.read',
      'accounting.settings.read',
    ],
  })

  // Generate authorization URL
  const state = Math.random().toString(36).substring(7)
  const authUrl = client.getAuthorizationUrl(state)

  console.log('\n📋 STEP 1: Open this URL in your browser:')
  console.log('─'.repeat(80))
  console.log(authUrl)
  console.log('─'.repeat(80))
  console.log('\n📋 STEP 2: Complete the following:')
  console.log(`   1. Log in to Xero`)
  console.log(`   2. Select the "${orgName}" organization`)
  console.log(`   3. Click "Authorize"`)
  console.log(`   4. You'll be redirected to a Xero page`)
  console.log(`   5. Copy the ENTIRE URL from your browser address bar`)
  console.log(`   6. Paste it below`)

  // Get callback URL from user
  let code: string | null = null
  let attempts = 0
  const maxAttempts = 3

  while (!code && attempts < maxAttempts) {
    attempts++
    console.log(`\n📋 STEP 3: Paste the callback URL (attempt ${attempts}/${maxAttempts}):`)
    const callbackUrl = await prompt('Callback URL: ')

    code = extractCodeFromUrl(callbackUrl)

    if (!code) {
      console.log('❌ Could not extract authorization code from URL.')
      console.log('   Make sure you copied the entire URL from your browser.')
      if (attempts < maxAttempts) {
        console.log('   Let\'s try again...')
      }
    }
  }

  if (!code) {
    throw new Error('Failed to get authorization code after multiple attempts.')
  }

  console.log('\n✅ Authorization code extracted!')
  console.log('🔄 Exchanging code for access token...')

  // Exchange code for token
  const token = await client.exchangeCodeForToken(code)

  console.log('✅ Access token received!')
  console.log('🔍 Fetching organization details...')

  // Store token temporarily to fetch connections
  client.storeTokens('temp', token)
  client.setTenant('temp')

  // Get connections
  const connections = await client.getConnections()

  if (connections.length === 0) {
    throw new Error('No Xero organizations found.')
  }

  console.log(`\n📊 Found ${connections.length} organization(s):`)
  connections.forEach((conn, index) => {
    console.log(`   ${index + 1}. ${conn.tenantName} (ID: ${conn.tenantId.substring(0, 8)}...)`)
  })

  // Use the first connection
  const connection = connections[0]

  // Store token for this tenant
  client.storeTokens(connection.tenantId, token)
  client.setTenant(connection.tenantId)

  // Test connectivity
  const org = await client.organisations.getCurrent()
  console.log(`\n✅ Successfully connected to: ${org.Name}`)
  console.log(`   Tenant ID: ${connection.tenantId}`)
  console.log(`   Currency: ${org.BaseCurrency}`)
  console.log(`   Country: ${org.CountryCode}`)

  return {
    tenantId: connection.tenantId,
    tenantName: org.Name,
    token,
  }
}

/**
 * Main authentication flow
 */
async function main() {
  console.log('\n🔐 Xero Manual OAuth Setup - Consolidated Financials System')
  console.log('='.repeat(80))
  console.log('This will authenticate both organizations:')
  console.log('  1. Teelixir')
  console.log('  2. Elevate Wholesale / Kikai Distribution')
  console.log('='.repeat(80))

  try {
    // Authenticate Teelixir
    console.log('\n\n' + '█'.repeat(80))
    console.log('AUTHENTICATING ORGANIZATION 1 OF 2: TEELIXIR')
    console.log('█'.repeat(80))
    const teelixir = await authenticateOrg(
      'Teelixir',
      TEELIXIR_CLIENT_ID,
      TEELIXIR_CLIENT_SECRET
    )

    console.log('\n\n⏸️  First organization complete!')
    console.log('Press Enter to continue to the second organization...')
    await prompt('')

    // Authenticate Elevate Wholesale
    console.log('\n\n' + '█'.repeat(80))
    console.log('AUTHENTICATING ORGANIZATION 2 OF 2: ELEVATE WHOLESALE')
    console.log('█'.repeat(80))
    const elevate = await authenticateOrg(
      'Elevate Wholesale / Kikai Distribution',
      ELEVATE_CLIENT_ID,
      ELEVATE_CLIENT_SECRET
    )

    // Save credentials
    const credentials: StoredCredentials = {
      teelixir: {
        tenantId: teelixir.tenantId,
        tenantName: teelixir.tenantName,
        accessToken: teelixir.token.access_token,
        refreshToken: teelixir.token.refresh_token,
        expiresAt: Date.now() + teelixir.token.expires_in * 1000,
      },
      elevateWholesale: {
        tenantId: elevate.tenantId,
        tenantName: elevate.tenantName,
        accessToken: elevate.token.access_token,
        refreshToken: elevate.token.refresh_token,
        expiresAt: Date.now() + elevate.token.expires_in * 1000,
      },
      updatedAt: new Date().toISOString(),
    }

    await saveCredentials(credentials)

    console.log('\n' + '█'.repeat(80))
    console.log('✅ SETUP COMPLETE!')
    console.log('█'.repeat(80))
    console.log('\n📊 Organizations configured:')
    console.log(`   ✓ ${teelixir.tenantName}`)
    console.log(`   ✓ ${elevate.tenantName}`)
    console.log('\n📁 Credentials stored in:')
    console.log(`   ${CREDENTIALS_FILE}`)
    console.log('\n🎯 Next steps:')
    console.log('   1. Run: npx tsx scripts/financials/analyze-chart-of-accounts.ts')
    console.log('   2. Review account mappings')
    console.log('   3. Run consolidation sync')
    console.log('='.repeat(80))

    await logger.info('Xero authentication completed', {
      source: 'xero',
      operation: 'setup-auth-manual',
      metadata: {
        teelixirTenantId: teelixir.tenantId,
        elevateWholesaleTenantId: elevate.tenantId,
      },
    })
  } catch (error) {
    console.error('\n❌ Error:', error)
    await logger.error('Xero authentication failed', {
      source: 'xero',
      operation: 'setup-auth-manual',
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}
