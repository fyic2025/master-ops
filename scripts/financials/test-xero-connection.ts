/**
 * Test Xero API Connection
 *
 * Tests if we can connect to Xero using client credentials
 */

const TEELIXIR_CLIENT_ID = process.env.XERO_TEELIXIR_CLIENT_ID || ''
const TEELIXIR_CLIENT_SECRET = process.env.XERO_TEELIXIR_CLIENT_SECRET || ''

async function testConnection() {
  console.log('\n🔍 Testing Xero API Connection')
  console.log('='.repeat(80))

  console.log('\n📋 Configuration:')
  console.log(`   Client ID: ${TEELIXIR_CLIENT_ID}`)
  console.log(`   Client Secret: ${TEELIXIR_CLIENT_SECRET.substring(0, 10)}...`)

  try {
    // Try to get a token using client credentials
    console.log('\n🔐 Attempting client credentials flow...')

    const authString = Buffer.from(`${TEELIXIR_CLIENT_ID}:${TEELIXIR_CLIENT_SECRET}`).toString('base64')

    const response = await fetch(
      'https://identity.xero.com/connect/token',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=accounting.transactions.read accounting.settings.read',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw { response: { status: response.status, data } }
    }

    console.log('✅ Client credentials flow successful!')
    console.log('   Access token received')
    console.log(`   Token type: ${data.token_type}`)
    console.log(`   Expires in: ${data.expires_in} seconds`)

    // Try to get connections
    console.log('\n🔍 Fetching connections...')
    const connectionsResponse = await fetch(
      'https://api.xero.com/connections',
      {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const connections = await connectionsResponse.json()

    console.log('✅ Connections retrieved!')
    console.log(`   Found ${connections.length} organization(s):`)

    for (const conn of connections) {
      console.log(`\n   📊 ${conn.tenantName}`)
      console.log(`      Tenant ID: ${conn.tenantId}`)
      console.log(`      Type: ${conn.tenantType}`)
    }

  } catch (error: any) {
    console.log('\n❌ Error testing connection:')
    if (error.response) {
      console.log(`   Status: ${error.response.status}`)
      console.log(`   Error: ${error.response.data.error}`)
      console.log(`   Description: ${error.response.data.error_description || 'N/A'}`)

      if (error.response.status === 400 && error.response.data.error === 'invalid_client') {
        console.log('\n💡 This means the client credentials flow is not supported.')
        console.log('   Custom connection apps require standard OAuth 2.0 flow.')
        console.log('\n   You need to add redirect URI to the app:')
        console.log('   1. Go to https://developer.xero.com/app/manage')
        console.log('   2. Edit your app')
        console.log('   3. Add redirect URI: https://xero.com/')
        console.log('   4. Save changes')
      }
    } else {
      console.log(`   ${error.message}`)
    }
  }
}

testConnection()
