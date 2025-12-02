/**
 * Apply Unleashed Workflow Fix
 *
 * Updates the workflow with proper HMAC-SHA256 authentication
 */

import { n8nClient } from './shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'
const API_AUTH_ID = '7fda9404-7197-477b-89b1-dadbcefae168'
const API_AUTH_SECRET = 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=='

async function applyFix() {
  console.log('🔧 Applying Unleashed Workflow Fix\n')

  try {
    // Get the workflow
    console.log('1️⃣  Fetching workflow...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Loaded: ${workflow.name}`)
    console.log()

    // Find the "Prepare Signature String" node
    console.log('2️⃣  Locating "Prepare Signature String" node...')
    const signatureNodeIndex = workflow.nodes.findIndex(
      (node) => node.name === 'Prepare Signature String'
    )

    if (signatureNodeIndex === -1) {
      throw new Error('Could not find "Prepare Signature String" node')
    }

    const oldNode = workflow.nodes[signatureNodeIndex]
    console.log(`   ✅ Found node at index ${signatureNodeIndex}`)
    console.log(`      Type: ${oldNode.type}`)
    console.log(`      Position: [${oldNode.position.join(', ')}]`)
    console.log()

    // Create the fixed node with proper authentication
    console.log('3️⃣  Creating fixed node with HMAC authentication...')

    const fixedCode = `// Unleashed API Authentication - HMAC-SHA256
// API Credentials configured by Claude Code

const API_AUTH_ID = '${API_AUTH_ID}'
const API_AUTH_SECRET = '${API_AUTH_SECRET}'

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

    const fixedNode = {
      ...oldNode,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      parameters: {
        jsCode: fixedCode,
      },
    }

    workflow.nodes[signatureNodeIndex] = fixedNode
    console.log('   ✅ Node updated with authentication code')
    console.log()

    // Sanitize workflow for update - only send updatable fields
    console.log('4️⃣  Preparing workflow for upload...')
    const workflowUpdate = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    }
    console.log('   ✅ Workflow sanitized (removed read-only fields)')
    console.log()

    // Apply the update
    console.log('5️⃣  Uploading fixed workflow to n8n...')
    const updated = await n8nClient.updateWorkflow(WORKFLOW_ID, workflowUpdate)
    console.log('   ✅ Workflow updated successfully!')
    console.log(`      Updated at: ${updated.updatedAt}`)
    console.log()

    // Display summary
    console.log('═'.repeat(70))
    console.log('✅ FIX APPLIED SUCCESSFULLY')
    console.log('═'.repeat(70))
    console.log()
    console.log('Changes made:')
    console.log('  ✅ Converted "Prepare Signature String" from Set node → Code node')
    console.log('  ✅ Added HMAC-SHA256 signature generation')
    console.log('  ✅ Configured Unleashed API credentials')
    console.log('  ✅ Created _authHeaders object for authentication')
    console.log()
    console.log('View workflow: https://automation.growthcohq.com/workflow/' + WORKFLOW_ID)
    console.log()

    return updated
  } catch (error) {
    console.error('\n❌ Error applying fix:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

applyFix()
