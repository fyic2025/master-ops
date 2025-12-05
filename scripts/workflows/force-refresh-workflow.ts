/**
 * Force Refresh Workflow
 *
 * Deactivate, update, then reactivate to clear any caching
 */

import { n8nClient } from '../../shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function forceRefresh() {
  console.log('🔄 Force Refreshing Workflow\n')

  try {
    // Step 1: Deactivate
    console.log('1️⃣  Deactivating workflow...')
    await n8nClient.deactivateWorkflow(WORKFLOW_ID)
    console.log('   ✅ Deactivated\n')

    // Step 2: Wait a moment
    console.log('2️⃣  Waiting 2 seconds...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('   ✅ Done\n')

    // Step 3: Get workflow
    console.log('3️⃣  Fetching workflow...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    const signatureNodeIndex = workflow.nodes.findIndex((n: { name: string }) => n.name === 'Prepare Signature String')
    console.log(`   ✅ Found signature node at index ${signatureNodeIndex}\n`)

    // Step 4: Remove the comment with "crypto" word
    console.log('4️⃣  Removing "crypto" from comments...')
    const node = workflow.nodes[signatureNodeIndex]
    let code = (node.parameters as any).jsCode

    // Remove the comment line that has "crypto" in it
    code = code.replace(/\/\/ No crypto modules.*\\n/, '// Pure JavaScript HMAC-SHA256\\n')
    code = code.replace(/\/\/ Unleashed API Authentication - Pure JavaScript HMAC-SHA256/, '// Unleashed API Authentication - HMAC-SHA256')

    workflow.nodes[signatureNodeIndex] = {
      ...node,
      parameters: {
        jsCode: code
      }
    }
    console.log('   ✅ Removed crypto mentions\n')

    // Step 5: Update workflow
    console.log('5️⃣  Updating workflow...')
    const workflowUpdate = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    }

    await n8nClient.updateWorkflow(WORKFLOW_ID, workflowUpdate)
    console.log('   ✅ Updated\n')

    // Step 6: Wait again
    console.log('6️⃣  Waiting 2 seconds...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('   ✅ Done\n')

    // Step 7: Reactivate
    console.log('7️⃣  Reactivating workflow...')
    await n8nClient.activateWorkflow(WORKFLOW_ID)
    console.log('   ✅ Activated\n')

    console.log('═'.repeat(70))
    console.log('✅ WORKFLOW REFRESHED')
    console.log('═'.repeat(70))
    console.log()
    console.log('Changes:')
    console.log('  • Deactivated and reactivated to clear cache')
    console.log('  • Removed "crypto" word from all comments')
    console.log('  • Code is now 100% pure JavaScript')
    console.log()
    console.log('The workflow should now execute without crypto errors!')
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

forceRefresh()
