/**
 * Fix Unleashed Signature Calculation
 *
 * Per Unleashed API docs:
 * - Sign ONLY the query parameters (empty for POST)
 * - NOT the method or URL
 */

import { n8nClient } from './shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function fixUnleashedSignature() {
  console.log('🔧 Fixing Unleashed API Signature\n')

  try {
    console.log('1️⃣  Fetching workflow...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    const signatureNodeIndex = workflow.nodes.findIndex(n => n.name === 'Prepare Signature String')
    const httpNodeIndex = workflow.nodes.findIndex(n => n.name === 'Create in Unleashed')

    console.log(`   ✅ Found signature node at index ${signatureNodeIndex}`)
    console.log(`   ✅ Found HTTP node at index ${httpNodeIndex}\n`)

    // Fix signature calculation - sign empty string for POST
    console.log('2️⃣  Fixing signature calculation...')
    const signatureNode = workflow.nodes[signatureNodeIndex]

    // Get the existing code and replace the signature string calculation
    let code = (signatureNode.parameters as any).jsCode as string

    // Replace the signature string line
    code = code.replace(
      /const signatureString = method \+ url \+ queryString/,
      'const signatureString = queryString // Unleashed signs query params only, not method/URL'
    )

    // Also update the queryString to be empty for POST
    code = code.replace(
      /const queryString = ''/,
      "const queryString = '' // Empty for POST requests (no query params)"
    )

    workflow.nodes[signatureNodeIndex] = {
      ...signatureNode,
      parameters: { jsCode: code }
    }
    console.log('   ✅ Signature now calculated from query params only\n')

    // Fix HTTP headers
    console.log('3️⃣  Adding required HTTP headers...')
    const httpNode = workflow.nodes[httpNodeIndex]
    const httpParams = httpNode.parameters as any

    // Add Accept and client-type headers
    const existingHeaders = httpParams.headerParameters?.parameters || []

    // Check if Accept header exists
    if (!existingHeaders.some((h: any) => h.name === 'Accept')) {
      existingHeaders.push({
        name: 'Accept',
        value: 'application/json'
      })
    }

    // Check if client-type header exists
    if (!existingHeaders.some((h: any) => h.name === 'client-type')) {
      existingHeaders.push({
        name: 'client-type',
        value: 'growthcohq/n8n-sync'
      })
    }

    workflow.nodes[httpNodeIndex] = {
      ...httpNode,
      parameters: {
        ...httpParams,
        headerParameters: {
          parameters: existingHeaders
        }
      }
    }
    console.log('   ✅ Added Accept and client-type headers\n')

    // Upload changes
    console.log('4️⃣  Uploading fixes...')
    const workflowUpdate = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    }

    await n8nClient.updateWorkflow(WORKFLOW_ID, workflowUpdate)
    console.log('   ✅ Updated\n')

    console.log('═'.repeat(70))
    console.log('✅ UNLEASHED API FIX APPLIED')
    console.log('═'.repeat(70))
    console.log()
    console.log('Changes:')
    console.log('  ❌ Before: Signing "POSThttps://api.unleashedsoftware.com/SalesOrders"')
    console.log('  ✅ After:  Signing "" (empty query string)')
    console.log()
    console.log('  ✅ Added: Accept: application/json')
    console.log('  ✅ Added: client-type: growthcohq/n8n-sync')
    console.log()
    console.log('Per Unleashed API documentation:')
    console.log('  "Sign only the query parameters, not the method or URL"')
    console.log()

  } catch (error) {
    console.error('❌ Error:')
    console.error(error)
    process.exit(1)
  }
}

fixUnleashedSignature()
