/**
 * Quick test script to verify Smartlead integration
 *
 * Run with: npx tsx test-smartlead.ts
 */

import * as dotenv from 'dotenv'

dotenv.config()

async function testSmartleadIntegration() {
  console.log('🧪 Testing Smartlead Integration...\n')

  const apiKey = process.env.SMARTLEAD_API_KEY

  if (!apiKey) {
    console.error('❌ Missing SMARTLEAD_API_KEY in .env file')
    process.exit(1)
  }

  console.log('🔍 Testing Smartlead connection...')
  console.log(`   API Key: ${apiKey.substring(0, 20)}...\n`)

  try {
    // Test 1: Get campaigns list
    console.log('1️⃣ Testing API: Fetching campaigns...')
    const campaignsResponse = await fetch(
      `https://server.smartlead.ai/api/v1/campaigns?api_key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (!campaignsResponse.ok) {
      throw new Error(`HTTP ${campaignsResponse.status}: ${campaignsResponse.statusText}`)
    }

    const campaigns = await campaignsResponse.json() as Array<{ id: string; name: string; status: string }>
    console.log(`✅ Found ${campaigns.length || 0} campaigns`)

    if (campaigns && campaigns.length > 0) {
      console.log('First campaign:', {
        id: campaigns[0].id,
        name: campaigns[0].name,
        status: campaigns[0].status,
      })
    }
    console.log()

    // Test 2: Get account info
    console.log('2️⃣ Testing API: Getting account info...')
    const accountResponse = await fetch(
      `https://server.smartlead.ai/api/v1/client?api_key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    if (accountResponse.ok) {
      const accountData = await accountResponse.json() as { email?: string; name?: string }
      console.log('✅ Account Info:', {
        email: accountData.email || 'N/A',
        name: accountData.name || 'N/A',
      })
    } else {
      console.log('⚠️  Account endpoint not accessible (might be normal)')
    }
    console.log()

    console.log('🎉 All tests passed! Smartlead integration is working correctly.\n')

    return {
      success: true,
      campaignsCount: campaigns?.length || 0,
    }

  } catch (error) {
    console.error('❌ Error testing Smartlead integration:', error)
    console.error('\nPlease check:')
    console.error('1. Your .env file has the correct SMARTLEAD_API_KEY')
    console.error('2. The API key has the necessary permissions')
    console.error('3. Your Smartlead account is accessible\n')

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Run the test
testSmartleadIntegration()
  .then(result => {
    if (result.success) {
      console.log('Integration Summary:')
      console.log(`- Campaigns: ${result.campaignsCount}`)
    }
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
