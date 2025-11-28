/**
 * Test All Xero Connections
 *
 * Tests refresh token authentication for all 4 Xero business accounts:
 * - Teelixir
 * - Elevate Wholesale
 * - Buy Organics Online (BOO)
 * - Red Hill Fresh (RHF)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Explicitly load .env from project root
const envPath = path.resolve(__dirname, '../../.env')
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('Error loading .env:', result.error)
}
console.log(`Loaded ${Object.keys(result.parsed || {}).length} env vars from ${envPath}`)

interface BusinessConfig {
  key: string
  name: string
  clientId: string
  clientSecret: string
  refreshToken: string
  tenantId: string
}

const BUSINESSES: BusinessConfig[] = [
  {
    key: 'teelixir',
    name: 'Teelixir',
    clientId: process.env.XERO_TEELIXIR_CLIENT_ID || '',
    clientSecret: process.env.XERO_TEELIXIR_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_TEELIXIR_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_TEELIXIR_TENANT_ID || '',
  },
  {
    key: 'elevate',
    name: 'Elevate Wholesale',
    clientId: process.env.XERO_ELEVATE_CLIENT_ID || '',
    clientSecret: process.env.XERO_ELEVATE_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_ELEVATE_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_ELEVATE_TENANT_ID || '',
  },
  {
    key: 'boo',
    name: 'Buy Organics Online',
    clientId: process.env.XERO_BOO_CLIENT_ID || '',
    clientSecret: process.env.XERO_BOO_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_BOO_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_BOO_TENANT_ID || '',
  },
  {
    key: 'rhf',
    name: 'Red Hill Fresh',
    clientId: process.env.XERO_RHF_CLIENT_ID || '',
    clientSecret: process.env.XERO_RHF_CLIENT_SECRET || '',
    refreshToken: process.env.XERO_RHF_REFRESH_TOKEN || '',
    tenantId: process.env.XERO_RHF_TENANT_ID || '',
  },
]

interface TestResult {
  business: string
  status: 'success' | 'failed' | 'skipped'
  orgName?: string
  baseCurrency?: string
  error?: string
  newRefreshToken?: string
}

async function refreshToken(config: BusinessConfig): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
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

  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`)
  }
}

async function getOrganisation(accessToken: string, tenantId: string): Promise<any> {
  const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      'Accept': 'application/json',
    },
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} - ${text.substring(0, 200)}`)
  }

  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`Invalid JSON from API: ${text.substring(0, 200)}`)
  }
}

async function testConnection(config: BusinessConfig): Promise<TestResult> {
  // Check if credentials are configured
  if (!config.clientId || !config.clientSecret || !config.refreshToken || !config.tenantId) {
    const missing = []
    if (!config.clientId) missing.push('CLIENT_ID')
    if (!config.clientSecret) missing.push('CLIENT_SECRET')
    if (!config.refreshToken) missing.push('REFRESH_TOKEN')
    if (!config.tenantId) missing.push('TENANT_ID')

    return {
      business: config.name,
      status: 'skipped',
      error: `Missing: ${missing.join(', ')}`,
    }
  }

  try {
    console.log(`   Refreshing token for ${config.name}...`)
    console.log(`   Client ID: ${config.clientId.substring(0, 10)}...`)
    console.log(`   Refresh token: ${config.refreshToken.substring(0, 15)}...`)

    // Step 1: Refresh the token
    const tokenResponse = await refreshToken(config)
    console.log(`   Token refreshed successfully, getting org...`)

    // Step 2: Get organisation details
    const orgResponse = await getOrganisation(tokenResponse.access_token, config.tenantId)
    const org = orgResponse.Organisations?.[0]

    return {
      business: config.name,
      status: 'success',
      orgName: org?.Name || 'Unknown',
      baseCurrency: org?.BaseCurrency || 'Unknown',
      newRefreshToken: tokenResponse.refresh_token,
    }
  } catch (error: any) {
    console.error(`   Error details:`, error.message)
    return {
      business: config.name,
      status: 'failed',
      error: error.message,
    }
  }
}

async function main() {
  console.log('\n🔍 Testing All Xero Connections')
  console.log('='.repeat(60))

  const results: TestResult[] = []
  const newTokens: Record<string, string> = {}

  for (const business of BUSINESSES) {
    console.log(`\n📊 Testing ${business.name}...`)

    const result = await testConnection(business)
    results.push(result)

    if (result.status === 'success') {
      console.log(`   ✅ SUCCESS`)
      console.log(`   Organization: ${result.orgName}`)
      console.log(`   Currency: ${result.baseCurrency}`)
      console.log(`   Tenant ID: ${business.tenantId}`)

      if (result.newRefreshToken && result.newRefreshToken !== business.refreshToken) {
        newTokens[business.key] = result.newRefreshToken
        console.log(`   ⚠️  New refresh token received (update .env)`)
      }
    } else if (result.status === 'skipped') {
      console.log(`   ⏭️  SKIPPED: ${result.error}`)
    } else {
      console.log(`   ❌ FAILED: ${result.error}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'failed').length
  const skipped = results.filter(r => r.status === 'skipped').length

  console.log(`   ✅ Successful: ${successful}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)

  // Show new tokens if any
  if (Object.keys(newTokens).length > 0) {
    console.log('\n⚠️  NEW REFRESH TOKENS RECEIVED')
    console.log('Update your .env file with these new tokens:')
    console.log('-'.repeat(60))
    for (const [key, token] of Object.entries(newTokens)) {
      const envVar = `XERO_${key.toUpperCase()}_REFRESH_TOKEN`
      console.log(`${envVar}=${token}`)
    }
  }

  console.log('\n')

  // Exit with error code if any failed
  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(console.error)
