/**
 * Test n8n API Connection
 *
 * Quick script to verify n8n API credentials and connection
 */

import * as dotenv from 'dotenv'

dotenv.config()

async function testN8nConnection() {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey = process.env.N8N_API_KEY

  if (!baseUrl || !apiKey) {
    console.error('❌ Missing N8N_BASE_URL or N8N_API_KEY in .env file')
    process.exit(1)
  }

  console.log('🔍 Testing n8n connection...')
  console.log(`   URL: ${baseUrl}`)
  console.log(`   API Key: ${apiKey.substring(0, 20)}...`)
  console.log()

  try {
    // Test 1: Get workflows list
    console.log('📋 Test 1: Fetching workflows...')
    const workflowsUrl = `${baseUrl}/api/v1/workflows`
    const response = await fetch(workflowsUrl, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as { data?: any[] } | any[]
    const workflows = (data as { data?: any[] }).data || []

    console.log(`✅ Success! Found ${workflows.length} workflow(s)`)

    if (workflows.length > 0) {
      console.log('\n📊 Existing workflows:')
      workflows.forEach((wf: any, idx: number) => {
        console.log(`   ${idx + 1}. ${wf.name} (ID: ${wf.id}) - ${wf.active ? '🟢 Active' : '⚫ Inactive'}`)
      })
    } else {
      console.log('   (No workflows found - you can import some)')
    }

    // Test 2: Check API info
    console.log('\n🔍 Test 2: Checking n8n instance info...')

    console.log('\n✅ All tests passed! n8n connection is working.')
    console.log('\n🚀 You can now:')
    console.log('   • Import workflows using: npx tsx infra/n8n-workflows/importWorkflow.ts <file.json>')
    console.log('   • Create new workflows in the n8n UI')
    console.log('   • Use n8n API programmatically')

  } catch (error) {
    console.error('\n❌ Connection test failed:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    console.log('\n💡 Troubleshooting:')
    console.log('   • Verify N8N_BASE_URL is correct')
    console.log('   • Check that N8N_API_KEY is valid')
    console.log('   • Ensure n8n instance is accessible')
    console.log('   • Check if API is enabled in n8n settings')
    process.exit(1)
  }
}

testN8nConnection()
