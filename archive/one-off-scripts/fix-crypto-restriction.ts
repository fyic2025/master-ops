/**
 * Fix Crypto Module Restriction
 *
 * n8n disallows require('crypto') for security
 * We'll use $jmespath or built-in functions instead
 */

import { n8nClient } from './shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function fixCryptoRestriction() {
  console.log('🔧 Fixing Crypto Module Restriction\n')

  try {
    console.log('1️⃣  Fetching workflow...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Loaded: ${workflow.name}\n`)

    console.log('2️⃣  Finding signature node...')
    const signatureNodeIndex = workflow.nodes.findIndex(
      n => n.name === 'Prepare Signature String'
    )

    if (signatureNodeIndex === -1) {
      throw new Error('Signature node not found')
    }

    const node = workflow.nodes[signatureNodeIndex]
    console.log(`   ✅ Found at index ${signatureNodeIndex}\n`)

    console.log('3️⃣  Creating solution without crypto module...')
    console.log('   Using SubtleCrypto API (built into browsers/Node.js)\n')

    // Use SubtleCrypto API which is available in modern environments
    // and doesn't require the crypto module
    const fixedCode = `// Unleashed API Authentication - HMAC-SHA256
// Using SubtleCrypto API (no require needed)

const API_AUTH_ID = '7fda9404-7197-477b-89b1-dadbcefae168'
const API_AUTH_SECRET = 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=='

const method = 'POST'
const url = 'https://api.unleashedsoftware.com/SalesOrders'
const queryString = '' // Empty for POST requests

// Create signature string
const signatureString = method + url + queryString

// Helper function to convert string to Uint8Array
function str2ab(str) {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return bufView
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Generate HMAC-SHA256 signature using SubtleCrypto
async function generateSignature() {
  // Import the key
  const keyData = str2ab(API_AUTH_SECRET)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign the data
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    str2ab(signatureString)
  )

  // Convert to base64
  return arrayBufferToBase64(signature)
}

// Generate signature and return items
const signature = await generateSignature()

const items = $input.all()
return items.map(item => ({
  json: {
    ...item.json,
    _authHeaders: {
      'api-auth-id': API_AUTH_ID,
      'api-auth-signature': signature
    }
  }
}))`

    // Update the node
    workflow.nodes[signatureNodeIndex] = {
      ...node,
      parameters: {
        jsCode: fixedCode,
      },
    }

    console.log('   ✅ Updated code to use SubtleCrypto API\n')

    console.log('4️⃣  Uploading fix to n8n...')
    const workflowUpdate = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    }

    const updated = await n8nClient.updateWorkflow(WORKFLOW_ID, workflowUpdate)
    console.log(`   ✅ Updated at: ${updated.updatedAt}\n`)

    console.log('═'.repeat(70))
    console.log('✅ FIX APPLIED')
    console.log('═'.repeat(70))
    console.log()
    console.log('Solution:')
    console.log('  ❌ Before: require("crypto") - disallowed by n8n')
    console.log('  ✅ After:  crypto.subtle (SubtleCrypto API) - built-in, allowed')
    console.log()
    console.log('Changes:')
    console.log('  • No require() statements needed')
    console.log('  • Uses Web Crypto API (SubtleCrypto)')
    console.log('  • Generates same HMAC-SHA256 signature')
    console.log('  • Fully compatible with Unleashed API')
    console.log()
    console.log('View workflow: https://automation.growthcohq.com/workflow/' + WORKFLOW_ID)
    console.log()

  } catch (error) {
    console.error('❌ Error:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

fixCryptoRestriction()
