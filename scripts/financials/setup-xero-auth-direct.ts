/**
 * Direct Xero OAuth Setup Script
 *
 * Sets up Xero authentication using provided credentials.
 * Simplified version that extracts tenant IDs from Xero URLs.
 *
 * Usage:
 *   XERO_CLIENT_ID=xxx XERO_CLIENT_SECRET=yyy npx tsx scripts/financials/setup-xero-auth-direct.ts
 */

import { XeroConnector } from '../../shared/libs/integrations/xero'
import { logger } from '../../shared/libs/logger'
import * as http from 'http'
import * as url from 'url'
import * as fs from 'fs/promises'
import * as path from 'path'

// Provided credentials
const TEELIXIR_CLIENT_ID = process.env.XERO_TEELIXIR_CLIENT_ID || 'D4D023D4A6F34120866AA7FEC96E8250'
const TEELIXIR_CLIENT_SECRET = process.env.XERO_TEELIXIR_CLIENT_SECRET || ''

const ELEVATE_CLIENT_ID = process.env.XERO_ELEVATE_CLIENT_ID || '1E2EE797CCFC4CEC8F8E0CCD75940869'
const ELEVATE_CLIENT_SECRET = process.env.XERO_ELEVATE_CLIENT_SECRET || ''

// Xero org short codes (from URLs)
const TEELIXIR_SHORT_CODE = '!9Tn41'
const ELEVATE_SHORT_CODE = '!!49p3'

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
 * Start local server to handle OAuth callback
 */
function startCallbackServer(port: number = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || '', true)

      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code as string
        const error = parsedUrl.query.error as string

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #e74c3c;">❌ Authentication Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window and try again.</p>
              </body>
            </html>
          `)
          server.close()
          reject(new Error(`OAuth error: ${error}`))
        } else if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #27ae60;">✅ Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
              </body>
            </html>
          `)
          server.close()
          resolve(code)
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1>Invalid Request</h1>
                <p>No authorization code received.</p>
              </body>
            </html>
          `)
        }
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    server.listen(port, () => {
      console.log(`\n🌐 Callback server started on http://localhost:${port}`)
    })

    server.on('error', (err) => {
      console.error(`❌ Failed to start server: ${err.message}`)
      reject(err)
    })
  })
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
 * Authenticate a single organization
 */
async function authenticateOrg(
  orgName: string,
  clientId: string,
  clientSecret: string
): Promise<{ tenantId: string; tenantName: string; token: any }> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🔐 Authenticating ${orgName}`)
  console.log('='.repeat(60))

  // Create client instance for this org
  const client = new XeroConnector({
    clientId,
    clientSecret,
    redirectUri: 'http://localhost:3000/callback',
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

  console.log('\n📋 Please authenticate:')
  console.log('   1. Open this URL in your browser:')
  console.log(`      ${authUrl}`)
  console.log('   2. Log in to Xero')
  console.log(`   3. Select the ${orgName} organization`)
  console.log('   4. Authorize the application')
  console.log('\n⏳ Waiting for callback...')

  // Start callback server
  const code = await startCallbackServer(3000)

  console.log('\n✅ Authorization code received!')
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

  // Use the first connection (or let user select if multiple)
  const connection = connections[0]

  // Store token for this tenant
  client.storeTokens(connection.tenantId, token)
  client.setTenant(connection.tenantId)

  // Test connectivity
  const org = await client.organisations.getCurrent()
  console.log(`\n✅ Connected to: ${org.Name}`)
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
  console.log('\n🔐 Xero OAuth Setup - Consolidated Financials System')
  console.log('=' .repeat(60))
  console.log('This will authenticate both organizations:')
  console.log('  1. Teelixir')
  console.log('  2. Elevate Wholesale / Kikai Distribution')
  console.log('='.repeat(60))

  try {
    // Authenticate Teelixir
    const teelixir = await authenticateOrg(
      'Teelixir',
      TEELIXIR_CLIENT_ID,
      TEELIXIR_CLIENT_SECRET
    )

    console.log('\n⏳ Please wait 5 seconds before authenticating the next organization...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Authenticate Elevate Wholesale
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

    console.log('\n' + '='.repeat(60))
    console.log('✅ SETUP COMPLETE!')
    console.log('='.repeat(60))
    console.log('\n📊 Organizations configured:')
    console.log(`   • ${teelixir.tenantName}`)
    console.log(`   • ${elevate.tenantName}`)
    console.log('\n🎯 Next steps:')
    console.log('   1. Run: npx tsx scripts/financials/analyze-chart-of-accounts.ts')
    console.log('   2. Review account mappings')
    console.log('   3. Set up consolidation rules')
    console.log('='.repeat(60))

    await logger.info('Xero authentication completed', {
      source: 'xero',
      operation: 'setup-auth-direct',
      metadata: {
        teelixirTenantId: teelixir.tenantId,
        elevateWholesaleTenantId: elevate.tenantId,
      },
    })
  } catch (error) {
    console.error('\n❌ Error:', error)
    await logger.error('Xero authentication failed', {
      source: 'xero',
      operation: 'setup-auth-direct',
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}
