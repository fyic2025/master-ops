/**
 * Xero Re-Authorization Helper
 *
 * Helps you re-authorize Xero connections when refresh tokens expire.
 * Generates authorization URLs for each business.
 *
 * Usage:
 *   npx tsx scripts/financials/xero-reauth.ts
 *
 * Then:
 * 1. Visit each URL and authorize
 * 2. Copy the 'code' parameter from the redirect URL
 * 3. Run: npx tsx scripts/financials/xero-reauth.ts --exchange <business_key> <code>
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath })

interface BusinessConfig {
  key: string
  name: string
  clientId: string
  clientSecret: string
  tenantId: string
}

const BUSINESSES: BusinessConfig[] = [
  {
    key: 'teelixir',
    name: 'Teelixir',
    clientId: process.env.XERO_TEELIXIR_CLIENT_ID || '',
    clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET || '',
    tenantId: process.env.XERO_TEELIXIR_TENANT_ID || '',
  },
  {
    key: 'elevate',
    name: 'Elevate Wholesale',
    clientId: process.env.XERO_ELEVATE_CLIENT_ID || '',
    clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET || '',
    tenantId: process.env.XERO_ELEVATE_TENANT_ID || '',
  },
  {
    key: 'boo',
    name: 'Buy Organics Online',
    clientId: process.env.XERO_BOO_CLIENT_ID || '',
    clientSecret: process.env.XERO_BOO_CLIENT_SECRET || '',
    tenantId: process.env.XERO_BOO_TENANT_ID || '',
  },
  {
    key: 'rhf',
    name: 'Red Hill Fresh',
    clientId: process.env.XERO_RHF_CLIENT_ID || '',
    clientSecret: process.env.XERO_RHF_CLIENT_SECRET || '',
    tenantId: process.env.XERO_RHF_TENANT_ID || '',
  },
]

const REDIRECT_URI = 'http://localhost:3000/callback'
const SCOPES = [
  'offline_access',
  'accounting.transactions.read',
  'accounting.reports.read',
  'accounting.settings',  // Full read/write for account updates
  'accounting.contacts.read',
].join(' ')

function generateAuthUrl(config: BusinessConfig): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: config.key,
  })
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`
}

// Update .env file with new refresh token
function updateEnvFile(envKey: string, newValue: string): void {
  const fs = require('fs')
  try {
    let envContent = fs.readFileSync(envPath, 'utf-8')
    const regex = new RegExp(`^${envKey}=.*$`, 'm')

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${envKey}=${newValue}`)
    } else {
      envContent += `\n${envKey}=${newValue}`
    }

    fs.writeFileSync(envPath, envContent)
    console.log(`💾 Auto-saved to .env file`)
  } catch (error: any) {
    console.error(`⚠️  Failed to auto-save: ${error.message}`)
    console.log(`Manual update needed: ${envKey}=${newValue}`)
  }
}

async function exchangeCode(config: BusinessConfig, code: string): Promise<void> {
  console.log(`\nExchanging code for ${config.name}...`)

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    }),
  })

  const text = await response.text()

  if (!response.ok) {
    console.error(`❌ Token exchange failed: ${response.status}`)
    console.error(text)
    return
  }

  const tokenData = JSON.parse(text)
  const envKey = `XERO_${config.key.toUpperCase()}_REFRESH_TOKEN`

  // Auto-save to .env
  updateEnvFile(envKey, tokenData.refresh_token)

  console.log(`\n✅ SUCCESS! ${config.name} is now authorized.`)
  console.log(`   Refresh token saved to .env\n`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args[0] === '--exchange' && args[1] && args[2]) {
    // Exchange mode: exchange code for tokens
    const businessKey = args[1].toLowerCase()
    const code = args[2]

    const config = BUSINESSES.find(b => b.key === businessKey)
    if (!config) {
      console.error(`Unknown business: ${businessKey}`)
      console.error(`Valid options: ${BUSINESSES.map(b => b.key).join(', ')}`)
      process.exit(1)
    }

    await exchangeCode(config, code)
    return
  }

  // Default: show authorization URLs
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║  XERO RE-AUTHORIZATION HELPER                                     ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

  console.log('Your Xero refresh tokens have expired. Follow these steps:\n')
  console.log('1. Visit each authorization URL below')
  console.log('2. Log in to Xero and authorize the app')
  console.log('3. You\'ll be redirected to localhost (which will fail)')
  console.log('4. Copy the "code" parameter from the URL')
  console.log('5. Run: npx tsx scripts/financials/xero-reauth.ts --exchange <key> <code>\n')

  console.log('═══════════════════════════════════════════════════════════════════\n')

  for (const biz of BUSINESSES) {
    if (!biz.clientId) {
      console.log(`⏭️  ${biz.name}: Missing CLIENT_ID\n`)
      continue
    }

    console.log(`📊 ${biz.name} (${biz.key})`)
    console.log(`   ${generateAuthUrl(biz)}`)
    console.log('')
  }

  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('\nAfter authorizing, run:')
  console.log('  npx tsx scripts/financials/xero-reauth.ts --exchange teelixir <CODE>')
  console.log('  npx tsx scripts/financials/xero-reauth.ts --exchange elevate <CODE>')
  console.log('  npx tsx scripts/financials/xero-reauth.ts --exchange boo <CODE>')
  console.log('  npx tsx scripts/financials/xero-reauth.ts --exchange rhf <CODE>\n')
}

main().catch(console.error)
