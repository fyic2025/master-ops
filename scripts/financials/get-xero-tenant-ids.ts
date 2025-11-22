/**
 * Get Xero Tenant IDs
 *
 * Helper script to discover tenant IDs for custom connection apps
 */

import { XeroConnector } from '../../shared/libs/integrations/xero'
import { logger } from '../../shared/libs/logger'

const TEELIXIR_CLIENT_ID = process.env.XERO_TEELIXIR_CLIENT_ID || ''
const TEELIXIR_CLIENT_SECRET = process.env.XERO_TEELIXIR_CLIENT_SECRET || ''

const ELEVATE_CLIENT_ID = process.env.XERO_ELEVATE_CLIENT_ID || ''
const ELEVATE_CLIENT_SECRET = process.env.XERO_ELEVATE_CLIENT_SECRET || ''

async function discoverTenantIds() {
  console.log('\n🔍 Xero Tenant ID Discovery')
  console.log('='.repeat(80))

  console.log('\nFor custom connection apps, tenant IDs can be found in:')
  console.log('  1. Xero Developer Portal > Your App > Configuration')
  console.log('  2. Or by looking at the Xero dashboard URL')
  console.log('\n' + '='.repeat(80))

  console.log('\n📌 INSTRUCTIONS:')
  console.log('\n1. Go to your Xero dashboard for Teelixir:')
  console.log('   https://go.xero.com/organisationlogin/selectorganisation')
  console.log('\n2. After selecting Teelixir, look at the URL in your browser.')
  console.log('   It will look like: https://go.xero.com/app/!9Tn41/dashboard')
  console.log('   The part after "/app/" is your short code (!9Tn41)')
  console.log('\n3. Or, look in the developer portal Configuration page')
  console.log('   for "Connected organisation" or similar section')

  console.log('\n' + '='.repeat(80))
  console.log('\n💡 ALTERNATIVE: Manual Credential File Creation')
  console.log('='.repeat(80))
  console.log('\nIf your apps are "Custom connections" (already connected),')
  console.log('you may need to create the credentials file manually.')
  console.log('\nI can help you create a .xero-credentials.json file if you provide:')
  console.log('  - Teelixir Tenant ID')
  console.log('  - Elevate Wholesale Tenant ID')
  console.log('\n' + '='.repeat(80))
}

discoverTenantIds().catch(console.error)
