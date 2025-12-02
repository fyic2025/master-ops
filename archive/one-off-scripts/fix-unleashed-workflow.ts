/**
 * Fix Unleashed Workflow Authentication
 *
 * This script will update the "Prepare Signature String" node
 * to properly generate Unleashed API authentication headers
 */

import { n8nClient } from './shared/libs/n8n'
import * as crypto from 'crypto'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function fixUnleashedWorkflow() {
  console.log('🔧 Fixing Unleashed Workflow Authentication\n')

  try {
    // Get the workflow
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    console.log(`📋 Workflow: ${workflow.name}`)
    console.log(`   Nodes: ${workflow.nodes.length}`)
    console.log()

    // Find the "Prepare Signature String" node
    const signatureNodeIndex = workflow.nodes.findIndex(
      (node) => node.name === 'Prepare Signature String'
    )

    if (signatureNodeIndex === -1) {
      throw new Error('Could not find "Prepare Signature String" node')
    }

    console.log('✅ Found "Prepare Signature String" node')
    console.log()

    // Create the fixed node with proper HMAC authentication
    const fixedSignatureNode = {
      ...workflow.nodes[signatureNodeIndex],
      parameters: {
        jsCode: `
// Unleashed API Authentication
// Requires HMAC-SHA256 signature

// IMPORTANT: Set these as environment variables or n8n credentials
const API_AUTH_ID = 'YOUR_UNLEASHED_API_KEY'     // Replace with your API key
const API_AUTH_SECRET = 'YOUR_UNLEASHED_API_SECRET' // Replace with your API secret

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
}))
        `.trim(),
      },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
    }

    // Update the workflow with the fixed node
    workflow.nodes[signatureNodeIndex] = fixedSignatureNode

    console.log('🔨 Updated "Prepare Signature String" node with proper authentication')
    console.log()

    // Ask user before applying the fix
    console.log('═'.repeat(70))
    console.log('READY TO APPLY FIX')
    console.log('═'.repeat(70))
    console.log()
    console.log('The following changes will be made:')
    console.log()
    console.log('1. Convert "Prepare Signature String" from Set node to Code node')
    console.log('2. Add HMAC-SHA256 signature generation')
    console.log('3. Create _authHeaders object with api-auth-id and api-auth-signature')
    console.log()
    console.log('⚠️  IMPORTANT: After applying this fix, you need to:')
    console.log('   1. Open the workflow in n8n')
    console.log('   2. Edit the "Prepare Signature String" node')
    console.log('   3. Replace YOUR_UNLEASHED_API_KEY with your actual API key')
    console.log('   4. Replace YOUR_UNLEASHED_API_SECRET with your actual API secret')
    console.log('   5. Test the workflow manually before activating')
    console.log()
    console.log('═'.repeat(70))
    console.log()

    // Uncomment the following lines to apply the fix:
    // const updated = await n8nClient.updateWorkflow(WORKFLOW_ID, workflow)
    // console.log('✅ Workflow updated successfully!')
    // console.log(\`   View: \${process.env.N8N_BASE_URL}/workflow/\${WORKFLOW_ID}\`)

    console.log('🔍 To apply this fix, uncomment the lines at the bottom of this script')
    console.log('   and run it again.')
    console.log()

    // Create a documentation file with the fix
    const fixDoc = `
# Unleashed Workflow Authentication Fix

## Problem
The workflow was missing proper authentication headers for the Unleashed API.

## Solution
Updated the "Prepare Signature String" node to generate HMAC-SHA256 signatures.

## Required Credentials

You need to get these from Unleashed:

1. **API Auth ID** (API Key) - Get from: Unleashed → Setup → Integration
2. **API Auth Secret** - Get from: Unleashed → Setup → Integration

## Code for "Prepare Signature String" Node

\`\`\`javascript
// Unleashed API Authentication
// Requires HMAC-SHA256 signature

// IMPORTANT: Set these as environment variables or n8n credentials
const API_AUTH_ID = 'YOUR_UNLEASHED_API_KEY'     // Replace with your API key
const API_AUTH_SECRET = 'YOUR_UNLEASHED_API_SECRET' // Replace with your API secret

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
}))
\`\`\`

## Steps to Apply Fix

1. Open workflow in n8n: https://automation.growthcohq.com/workflow/lj35rsDvrz5LK9Ox
2. Delete the "Prepare Signature String" Set node
3. Add a new Code node named "Prepare Signature String"
4. Paste the code above
5. Replace YOUR_UNLEASHED_API_KEY and YOUR_UNLEASHED_API_SECRET
6. Reconnect: Prepare Unleashed Data → Prepare Signature String → Create in Unleashed
7. Test manually with one order
8. Once working, activate the workflow

## Testing

After applying the fix:

1. Manually trigger the workflow
2. Check execution logs
3. Verify the API response has a "Guid" field (success indicator)
4. Check Google Sheet for "Synced" status update

## Expected Results

- Success rate should improve from 56% to 95%+
- Failed executions should drop significantly
- Unleashed orders should be created successfully
    `.trim()

    const fs = await import('fs')
    fs.writeFileSync('UNLEASHED-FIX-GUIDE.md', fixDoc, 'utf-8')
    console.log('📝 Created UNLEASHED-FIX-GUIDE.md with detailed instructions')
    console.log()

  } catch (error) {
    console.error('❌ Error:')
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(String(error))
    }
    process.exit(1)
  }
}

fixUnleashedWorkflow()
