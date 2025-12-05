/**
 * Quick test script to verify Apify integration
 *
 * Run with: npx tsx test-apify.ts
 */

import * as dotenv from 'dotenv'

dotenv.config()

async function testApifyIntegration() {
  console.log('🧪 Testing Apify Integration...\n')

  const apiToken = process.env.APIFY_TOKEN

  if (!apiToken) {
    console.error('❌ Missing APIFY_TOKEN in .env file')
    process.exit(1)
  }

  console.log('🔍 Testing Apify connection...')
  console.log(`   API Token: ${apiToken.substring(0, 20)}...\n`)

  try {
    // Test 1: Get user info
    console.log('1️⃣ Testing API: Getting user info...')
    const userResponse = await fetch('https://api.apify.com/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`)
    }

    const userData = await userResponse.json() as { data?: { username?: string; email?: string; plan?: string } }
    console.log('✅ User Info:', {
      username: userData.data?.username,
      email: userData.data?.email,
      plan: userData.data?.plan,
    })
    console.log()

    // Test 2: List actors
    console.log('2️⃣ Testing API: Listing actors...')
    const actorsResponse = await fetch('https://api.apify.com/v2/acts?limit=10', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    })

    if (!actorsResponse.ok) {
      throw new Error(`HTTP ${actorsResponse.status}: ${actorsResponse.statusText}`)
    }

    const actorsData = await actorsResponse.json() as { data?: { items?: any[] } }
    const actors = actorsData.data?.items || []
    console.log(`✅ Found ${actors.length} actors`)

    if (actors.length > 0) {
      console.log('First actor:', {
        name: actors[0].name,
        username: actors[0].username,
        title: actors[0].title,
      })
    }
    console.log()

    console.log('🎉 All tests passed! Apify integration is working correctly.\n')

    return {
      success: true,
      username: userData.data?.username,
      actorsCount: actors.length,
    }

  } catch (error) {
    console.error('❌ Error testing Apify integration:', error)
    console.error('\nPlease check:')
    console.error('1. Your .env file has the correct APIFY_TOKEN')
    console.error('2. The token has the necessary permissions')
    console.error('3. Your Apify account is accessible\n')

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Run the test
testApifyIntegration()
  .then(result => {
    if (result.success) {
      console.log('Integration Summary:')
      console.log(`- Username: ${result.username}`)
      console.log(`- Actors: ${result.actorsCount}`)
    }
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
