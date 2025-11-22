/**
 * Xero OAuth Setup Script
 *
 * Interactive script to authenticate with Xero and set up connections
 * for both Teelixir and Elevate Wholesale organizations.
 *
 * Usage:
 *   npx tsx scripts/financials/setup-xero-auth.ts
 */

import { xeroClient } from '../../shared/libs/integrations/xero'
import { logger } from '../../shared/libs/logger'
import * as readline from 'readline'
import * as http from 'http'
import * as url from 'url'
import * as fs from 'fs/promises'
import * as path from 'path'

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
              <body>
                <h1>Authentication Failed</h1>
                <p>Error: ${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `)
          server.close()
          reject(new Error(`OAuth error: ${error}`))
        } else if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <body>
                <h1>Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </body>
            </html>
          `)
          server.close()
          resolve(code)
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' })
          res.end(`
            <html>
              <body>
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

    server.on('error', reject)
  })
}

/**
 * Prompt user for input
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
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
 * Load existing credentials
 */
async function loadCredentials(): Promise<StoredCredentials | null> {
  try {
    const data = await fs.readFile(CREDENTIALS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * Main authentication flow
 */
async function main() {
  console.log('🔐 Xero OAuth Setup - Consolidated Financials System')
  console.log('=' .repeat(60))

  try {
    // Check for existing credentials
    const existing = await loadCredentials()
    if (existing) {
      console.log('\n⚠️  Existing credentials found:')
      console.log(`   Teelixir: ${existing.teelixir.tenantName}`)
      console.log(`   Elevate Wholesale: ${existing.elevateWholesale.tenantName}`)
      console.log(`   Last updated: ${existing.updatedAt}`)

      const overwrite = await prompt('\nDo you want to re-authenticate? (yes/no): ')
      if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
        console.log('\n✅ Using existing credentials.')

        // Load tokens into client
        const token = {
          access_token: existing.teelixir.accessToken,
          refresh_token: existing.teelixir.refreshToken,
          expires_in: Math.floor((existing.teelixir.expiresAt - Date.now()) / 1000),
          token_type: 'Bearer' as const,
          scope: 'offline_access accounting.transactions.read',
        }
        xeroClient.storeTokens(existing.teelixir.tenantId, token)

        const token2 = {
          access_token: existing.elevateWholesale.accessToken,
          refresh_token: existing.elevateWholesale.refreshToken,
          expires_in: Math.floor((existing.elevateWholesale.expiresAt - Date.now()) / 1000),
          token_type: 'Bearer' as const,
          scope: 'offline_access accounting.transactions.read',
        }
        xeroClient.storeTokens(existing.elevateWholesale.tenantId, token2)

        console.log('\n✅ Credentials loaded successfully!')
        return
      }
    }

    console.log('\n📋 Starting OAuth flow...')
    console.log('   This will open your browser for authentication.')

    // Generate authorization URL
    const state = Math.random().toString(36).substring(7)
    const authUrl = xeroClient.getAuthorizationUrl(state)

    console.log('\n🔗 Authorization URL:')
    console.log(authUrl)
    console.log('\n📌 Please:')
    console.log('   1. Copy the URL above and paste it into your browser')
    console.log('   2. Log in to Xero and authorize the application')
    console.log('   3. You will be redirected back automatically')

    // Start callback server
    const serverPromise = startCallbackServer(3000)

    // Wait for user to authorize
    const code = await serverPromise

    console.log('\n✅ Authorization code received!')
    console.log('🔄 Exchanging code for access token...')

    // Exchange code for token
    const token = await xeroClient.exchangeCodeForToken(code)

    console.log('✅ Access token received!')
    console.log('🔍 Fetching available organizations...')

    // Store token temporarily to fetch connections
    xeroClient.storeTokens('temp', token)
    xeroClient.setTenant('temp')

    // Get connections
    const connections = await xeroClient.getConnections()

    if (connections.length === 0) {
      throw new Error('No Xero organizations found. Please connect at least one organization.')
    }

    console.log(`\n📊 Found ${connections.length} organization(s):`)
    connections.forEach((conn, index) => {
      console.log(`   ${index + 1}. ${conn.tenantName} (ID: ${conn.tenantId})`)
    })

    // Identify Teelixir and Elevate Wholesale
    let teelixirConn = connections.find(c =>
      c.tenantName?.toLowerCase().includes('teelixir')
    )
    let elevateConn = connections.find(c =>
      c.tenantName?.toLowerCase().includes('kikai') ||
      c.tenantName?.toLowerCase().includes('elevate')
    )

    // If not found automatically, prompt user
    if (!teelixirConn) {
      console.log('\n❓ Could not automatically identify Teelixir organization.')
      const index = await prompt('Enter the number for Teelixir: ')
      teelixirConn = connections[parseInt(index) - 1]
    }

    if (!elevateConn) {
      console.log('\n❓ Could not automatically identify Elevate Wholesale/Kikai organization.')
      const index = await prompt('Enter the number for Elevate Wholesale: ')
      elevateConn = connections[parseInt(index) - 1]
    }

    if (!teelixirConn || !elevateConn) {
      throw new Error('Failed to identify both organizations.')
    }

    console.log('\n✅ Organizations identified:')
    console.log(`   Teelixir: ${teelixirConn.tenantName}`)
    console.log(`   Elevate Wholesale: ${elevateConn.tenantName}`)

    // Store tokens for both tenants
    xeroClient.storeTokens(teelixirConn.tenantId, token)
    xeroClient.storeTokens(elevateConn.tenantId, token)

    // Test connectivity
    console.log('\n🧪 Testing connectivity...')

    xeroClient.setTenant(teelixirConn.tenantId)
    const teelixirOrg = await xeroClient.organisations.getCurrent()
    console.log(`   ✅ Teelixir: ${teelixirOrg.Name}`)

    xeroClient.setTenant(elevateConn.tenantId)
    const elevateOrg = await xeroClient.organisations.getCurrent()
    console.log(`   ✅ Elevate Wholesale: ${elevateOrg.Name}`)

    // Save credentials
    const credentials: StoredCredentials = {
      teelixir: {
        tenantId: teelixirConn.tenantId,
        tenantName: teelixirConn.tenantName || teelixirOrg.Name,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: Date.now() + token.expires_in * 1000,
      },
      elevateWholesale: {
        tenantId: elevateConn.tenantId,
        tenantName: elevateConn.tenantName || elevateOrg.Name,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: Date.now() + token.expires_in * 1000,
      },
      updatedAt: new Date().toISOString(),
    }

    await saveCredentials(credentials)

    console.log('\n' + '='.repeat(60))
    console.log('✅ Setup Complete!')
    console.log('\nYou can now use the Xero API to:')
    console.log('  - Fetch chart of accounts')
    console.log('  - Pull trial balance data')
    console.log('  - Analyze transactions')
    console.log('  - Generate consolidated reports')
    console.log('\nNext steps:')
    console.log('  1. Run: npx tsx scripts/financials/analyze-chart-of-accounts.ts')
    console.log('  2. Review account mappings')
    console.log('  3. Set up consolidation rules')
    console.log('='.repeat(60))

    await logger.info('Xero authentication completed', {
      source: 'xero',
      operation: 'setup-auth',
      metadata: {
        teelixirTenantId: teelixirConn.tenantId,
        elevateWholesaleTenantId: elevateConn.tenantId,
      },
    })
  } catch (error) {
    console.error('\n❌ Error:', error)
    await logger.error('Xero authentication failed', {
      source: 'xero',
      operation: 'setup-auth',
    }, error as Error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { loadCredentials, saveCredentials }
