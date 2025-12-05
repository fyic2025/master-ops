#!/usr/bin/env npx tsx
/**
 * List all Klaviyo segments for Teelixir
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

// Load credentials from vault
const credsPath = path.join(__dirname, '../creds.js')
const creds = require(credsPath)

async function listSegments() {
  console.log('\n🔍 Listing Klaviyo segments for Teelixir...\n')

  // Load Teelixir credentials
  await creds.load('teelixir')

  const apiKey = process.env.TEELIXIR_KLAVIYO_API_KEY ||
    await creds.get('teelixir', 'klaviyo_private_api_key') ||
    await creds.get('teelixir', 'klaviyo_api_key')

  if (!apiKey) {
    console.error('❌ Klaviyo API key not found')
    console.log('   Set TEELIXIR_KLAVIYO_API_KEY or add to vault')
    process.exit(1)
  }

  console.log('✅ API key loaded')

  // Fetch segments
  const response = await fetch('https://a.klaviyo.com/api/segments/', {
    headers: {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'revision': '2024-02-15',
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`❌ API error: ${response.status}`)
    console.error(error)
    process.exit(1)
  }

  const data = await response.json() as { data?: any[] }
  const segments = data.data || []

  console.log(`\n📋 Found ${segments.length} segments:\n`)
  console.log('─'.repeat(80))
  console.log(`${'ID'.padEnd(30)} ${'Name'.padEnd(40)} Created`)
  console.log('─'.repeat(80))

  for (const segment of segments) {
    const id = segment.id
    const name = segment.attributes?.name || 'Unknown'
    const created = segment.attributes?.created?.split('T')[0] || ''

    // Highlight segments that might be "unengaged"
    const isUnengaged = name.toLowerCase().includes('unengaged') ||
      name.toLowerCase().includes('inactive') ||
      name.toLowerCase().includes('lapsed') ||
      name.toLowerCase().includes('dormant')

    if (isUnengaged) {
      console.log(`⭐ ${id.padEnd(28)} ${name.padEnd(40)} ${created}`)
    } else {
      console.log(`   ${id.padEnd(28)} ${name.padEnd(40)} ${created}`)
    }
  }

  console.log('─'.repeat(80))
  console.log('\n⭐ = Likely unengaged segment candidates')
  console.log('\nTo use a segment, update the config in Supabase:')
  console.log('UPDATE tlx_automation_config SET config = config || \'{"klaviyo_segment_id": "YOUR_SEGMENT_ID"}\' WHERE automation_type = \'winback_40\';')
}

listSegments().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
