/**
 * Quick test script to verify Brave Search integration
 *
 * Run with: npx tsx test-brave-search.ts
 */

import * as dotenv from 'dotenv'

dotenv.config()

async function testBraveSearchIntegration() {
  console.log('🧪 Testing Brave Search Integration...\n')

  const apiKey = process.env.BRAVE_API_KEY

  if (!apiKey) {
    console.error('❌ Missing BRAVE_API_KEY in .env file')
    process.exit(1)
  }

  console.log('🔍 Testing Brave Search connection...')
  console.log(`   API Key: ${apiKey.substring(0, 10)}...\n`)

  try {
    // Test: Search for something simple
    console.log('1️⃣ Testing API: Performing test search...')
    const searchResponse = await fetch(
      'https://api.search.brave.com/res/v1/web/search?q=test&count=1',
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    )

    if (!searchResponse.ok) {
      throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json() as { type: string; web?: { results?: Array<{ title: string; url: string }> } }
    console.log('✅ Search API Response:', {
      type: searchData.type,
      resultsCount: searchData.web?.results?.length || 0,
    })

    if (searchData.web?.results && searchData.web.results.length > 0) {
      console.log('First result:', {
        title: searchData.web.results[0].title,
        url: searchData.web.results[0].url,
      })
    }
    console.log()

    console.log('🎉 All tests passed! Brave Search integration is working correctly.\n')

    return {
      success: true,
      resultsCount: searchData.web?.results?.length || 0,
    }

  } catch (error) {
    console.error('❌ Error testing Brave Search integration:', error)
    console.error('\nPlease check:')
    console.error('1. Your .env file has the correct BRAVE_API_KEY')
    console.error('2. The API key has the necessary permissions')
    console.error('3. Your Brave Search subscription is active\n')

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Run the test
testBraveSearchIntegration()
  .then(result => {
    if (result.success) {
      console.log('Integration Summary:')
      console.log(`- Search Results: ${result.resultsCount}`)
    }
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
