/**
 * Fix Crypto Import in Workflow
 *
 * The crypto module needs to be required in n8n Code nodes
 */

import { n8nClient } from './shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function fixCryptoImport() {
  console.log('🔧 Fixing Crypto Module Import\n')

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

    console.log('3️⃣  Updating code with proper crypto import...')

    // Fixed code with require() for crypto
    const fixedCode = `// Unleashed API Authentication - HMAC-SHA256
// API Credentials configured by Claude Code

// Import crypto module (required in n8n)
const crypto = require('crypto')

const API_AUTH_ID = '7fda9404-7197-477b-89b1-dadbcefae168'
const API_AUTH_SECRET = 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=='

const method = 'POST'
const url = 'https://api.unleashedsoftware.com/SalesOrders'
const queryString = '' // Empty for POST requests

// Create signature string: <method><url><query_string>
const signatureString = method + url + queryString

// Generate HMAC-SHA256 signature
const signature = crypto
  .createHmac('sha256', API_AUTH_SECRET)
  .update(signatureString)
  .digest('base64')

// Return the current item data plus auth headers
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

    console.log('   ✅ Code updated with require("crypto")\n')

    console.log('4️⃣  Uploading fix to n8n...')
    const workflowUpdate = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    }

    const updated = await n8nClient.updateWorkflow(WORKFLOW_ID, workflowUpdate)
    console.log(`   ✅ Workflow updated at: ${updated.updatedAt}\n`)

    console.log('═'.repeat(70))
    console.log('✅ FIX APPLIED')
    console.log('═'.repeat(70))
    console.log()
    console.log('Changed:')
    console.log('  ❌ Before: crypto.createHmac() - undefined')
    console.log('  ✅ After:  const crypto = require("crypto") - properly imported')
    console.log()
    console.log('The workflow should now execute successfully!')
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

fixCryptoImport()
