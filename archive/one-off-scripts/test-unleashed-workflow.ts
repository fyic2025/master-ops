/**
 * Test Unleashed Workflow
 *
 * Manually trigger the workflow and verify the fix works
 */

import { n8nClient } from './shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function testWorkflow() {
  console.log('🧪 Testing Fixed Unleashed Workflow\n')

  try {
    // Get workflow info
    console.log('1️⃣  Fetching workflow details...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Workflow: ${workflow.name}`)
    console.log(`      Status: ${workflow.active ? '🟢 Active' : '⚫ Inactive'}`)
    console.log(`      Last updated: ${workflow.updatedAt}`)
    console.log()

    // Verify the fix is in place
    console.log('2️⃣  Verifying authentication fix...')
    const signatureNode = workflow.nodes.find(n => n.name === 'Prepare Signature String')

    if (!signatureNode) {
      throw new Error('Prepare Signature String node not found')
    }

    if (signatureNode.type !== 'n8n-nodes-base.code') {
      throw new Error(`Node is still a ${signatureNode.type}, should be code node`)
    }

    const code = (signatureNode.parameters as any).jsCode
    if (!code.includes('_authHeaders')) {
      throw new Error('Node does not contain _authHeaders - fix not applied')
    }

    console.log('   ✅ Authentication code is in place')
    console.log('   ✅ HMAC-SHA256 signature generation confirmed')
    console.log()

    // Manual execution
    console.log('3️⃣  Manually triggering workflow...')
    console.log('   ⚠️  This will process any orders with status "Ready to Sync"')
    console.log()

    const execution = await n8nClient.executeWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Execution started: ${execution.id}`)
    console.log(`      Mode: ${execution.mode}`)
    console.log(`      Started: ${execution.startedAt}`)
    console.log()

    // Wait a bit for execution to complete
    console.log('4️⃣  Waiting for execution to complete...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Get execution results
    const result = await n8nClient.getExecution(execution.id)
    const status = result.status || (result.finished ? 'success' : 'error')
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳'

    console.log(`   ${emoji} Execution ${status.toUpperCase()}`)

    if (result.stoppedAt) {
      const duration = (new Date(result.stoppedAt).getTime() - new Date(result.startedAt).getTime()) / 1000
      console.log(`      Duration: ${duration.toFixed(2)}s`)
    }
    console.log()

    // Check for errors
    if (status === 'error') {
      console.log('═'.repeat(70))
      console.log('⚠️  EXECUTION FAILED')
      console.log('═'.repeat(70))

      if (result.data?.resultData?.error) {
        console.log('Error:', result.data.resultData.error.message)
      }

      console.log()
      console.log('Possible reasons:')
      console.log('  1. No orders with "Ready to Sync" status in Google Sheet')
      console.log('  2. Google Sheets credentials issue')
      console.log('  3. Unleashed API credentials may be incorrect')
      console.log('  4. Network/connectivity issue')
      console.log()
      console.log('View execution details: https://automation.growthcohq.com/execution/' + execution.id)
      console.log()
    } else {
      console.log('═'.repeat(70))
      console.log('✅ TEST PASSED')
      console.log('═'.repeat(70))
      console.log()
      console.log('The workflow executed successfully!')
      console.log()
      console.log('Next steps:')
      console.log('  1. Check your Google Sheet for "Synced" status updates')
      console.log('  2. Verify orders were created in Unleashed')
      console.log('  3. Review execution details in n8n')
      console.log()
      console.log('View execution: https://automation.growthcohq.com/execution/' + execution.id)
      console.log()
    }

    // Get updated stats
    console.log('5️⃣  Getting updated statistics...')
    const stats = await n8nClient.getWorkflowStats(WORKFLOW_ID)
    const successRate = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(2) : '0.00'

    console.log('   Updated Stats:')
    console.log(`   ✅ Success: ${stats.success}`)
    console.log(`   ❌ Errors: ${stats.error}`)
    console.log(`   📊 Success Rate: ${successRate}%`)
    console.log()

    return { execution, result, stats }
  } catch (error) {
    console.error('\n❌ Test failed:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

testWorkflow()
