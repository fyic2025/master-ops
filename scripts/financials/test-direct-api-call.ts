/**
 * Test Direct Xero API Call
 *
 * Since the apps show as "connected", let's test if we can make direct API calls
 */

const TEELIXIR_CLIENT_ID = process.env.XERO_TEELIXIR_CLIENT_ID || ''
const TEELIXIR_CLIENT_SECRET = process.env.XERO_TEELIXIR_CLIENT_SECRET || ''

// Known tenant IDs from the Xero URLs
const TEELIXIR_SHORT_CODE = '!9Tn41'

async function testDirectCall() {
  console.log('\n🧪 Testing Direct Xero API Access')
  console.log('='.repeat(80))

  console.log('\n📋 App Configuration:')
  console.log(`   Client ID: ${TEELIXIR_CLIENT_ID}`)
  console.log(`   Short Code: ${TEELIXIR_SHORT_CODE}`)

  console.log('\n💡 Since the app shows as "connected" in the portal,')
  console.log('   it might have been auto-authorized during creation.')
  console.log('   The OAuth flow may have completed in the background.')

  console.log('\n' + '='.repeat(80))
  console.log('📝 NEXT STEPS TO COMPLETE AUTHENTICATION:')
  console.log('='.repeat(80))

  console.log('\nOption 1: Use Postman/Manual OAuth (Recommended)')
  console.log('-'.repeat(80))
  console.log('1. Open Postman or similar REST client')
  console.log('2. Create a new OAuth 2.0 authorization request:')
  console.log(`   - Auth URL: https://identity.xero.com/connect/authorize`)
  console.log(`   - Token URL: https://identity.xero.com/connect/token`)
  console.log(`   - Client ID: ${TEELIXIR_CLIENT_ID}`)
  console.log(`   - Client Secret: ${TEELIXIR_CLIENT_SECRET}`)
  console.log(`   - Redirect URI: https://xero.com/`)
  console.log(`   - Scope: offline_access accounting.transactions.read accounting.journals.read accounting.reports.read accounting.contacts.read accounting.settings.read`)
  console.log('3. Complete OAuth flow and copy tokens')
  console.log('4. Provide tokens back to me')

  console.log('\n\nOption 2: Use Xero OAuth 2.0 Playground')
  console.log('-'.repeat(80))
  console.log('1. Go to: https://developer.xero.com/documentation/tools/oauth-2-playground/')
  console.log('2. Use your app credentials to test OAuth flow')
  console.log('3. Copy the tokens generated')

  console.log('\n\nOption 3: Contact Xero Support')
  console.log('-'.repeat(80))
  console.log('The apps showing "3 of 25 connections" suggests they might')
  console.log('already be connected. You could:')
  console.log('1. Check if there are existing connections to disconnect')
  console.log('2. Or contact Xero support to understand the connection status')

  console.log('\n' + '='.repeat(80))
  console.log('\n✅ Once you have valid access tokens, I can:')
  console.log('   - Create a credentials file manually')
  console.log('   - Continue with the data sync pipeline')
  console.log('   - Complete the consolidated financials setup')
  console.log('\n' + '='.repeat(80))
}

testDirectCall()
