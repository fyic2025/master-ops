#!/usr/bin/env npx tsx
/**
 * List all Klaviyo lists for Teelixir
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

const credsPath = path.join(__dirname, '../creds.js')
const creds = require(credsPath)

async function listLists() {
  console.log('\n🔍 Listing Klaviyo lists for Teelixir...\n')

  await creds.load('teelixir')

  const apiKey = process.env.TEELIXIR_KLAVIYO_API_KEY ||
    await creds.get('teelixir', 'klaviyo_private_api_key') ||
    await creds.get('teelixir', 'klaviyo_api_key')

  if (!apiKey) {
    console.error('❌ Klaviyo API key not found')
    process.exit(1)
  }

  const response = await fetch('https://a.klaviyo.com/api/lists/', {
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
  const lists = data.data || []

  console.log(`📋 Found ${lists.length} lists:\n`)
  console.log('─'.repeat(80))
  console.log(`${'ID'.padEnd(12)} ${'Name'.padEnd(50)} Created`)
  console.log('─'.repeat(80))

  for (const list of lists) {
    const id = list.id
    const name = list.attributes?.name || 'Unknown'
    const created = list.attributes?.created?.split('T')[0] || ''

    const isUnengaged = name.toLowerCase().includes('unengaged') ||
      name.toLowerCase().includes('inactive') ||
      name.toLowerCase().includes('lapsed') ||
      name.toLowerCase().includes('winback')

    if (isUnengaged) {
      console.log(`⭐ ${id.padEnd(10)} ${name.padEnd(50)} ${created}`)
    } else {
      console.log(`   ${id.padEnd(10)} ${name.padEnd(50)} ${created}`)
    }
  }
  console.log('─'.repeat(80))
}

listLists().catch(console.error)
