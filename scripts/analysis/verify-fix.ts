/**
 * Verify the Fix Works
 *
 * Wait and check if new executions succeed
 */

import { n8nClient } from '../../shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function verifyFix() {
  console.log('🧪 Verifying Workflow Fix\n')

  try {
    console.log('1️⃣  Checking workflow code...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    const signatureNode = workflow.nodes.find(n => n.name === 'Prepare Signature String')
    const code = (signatureNode?.parameters as any)?.jsCode || ''

    if (code.includes('require("crypto")') || code.includes("require('crypto')")) {
      console.log('   ✅ Crypto import is present')
    } else {
      console.log('   ⚠️  Warning: crypto import not found in code')
    }

    if (code.includes('_authHeaders')) {
      console.log('   ✅ Auth headers code is present')
    } else {
      console.log('   ❌ Auth headers code missing!')
    }
    console.log()

    console.log('2️⃣  Waiting 10 seconds for next scheduled execution...')
    console.log('   (Workflow runs every 15 minutes)')
    await new Promise(resolve => setTimeout(resolve, 10000))
    console.log()

    console.log('3️⃣  Checking recent executions...')
    const { data: executions } = await n8nClient.listExecutions({
      workflowId: WORKFLOW_ID,
      limit: 3
    })

    console.log('   Recent executions:')
    executions.forEach((exec, idx) => {
      const status = exec.status || (exec.finished ? 'success' : 'error')
      const emoji = status === 'success' ? '✅' : '❌'
      const date = new Date(exec.startedAt).toLocaleString()
      const isNew = new Date(exec.startedAt) > new Date('2025-11-19T04:32:00Z')
      const newLabel = isNew ? ' [NEW EXECUTION]' : ''
      console.log(`   ${emoji} ${exec.id} - ${status.toUpperCase()} - ${date}${newLabel}`)
    })
    console.log()

    // Check if there's a new successful execution
    const latestExec = executions[0]
    const isAfterFix = new Date(latestExec.startedAt) > new Date('2025-11-19T04:32:00Z')
    const latestStatus = latestExec.status || (latestExec.finished ? 'success' : 'error')

    if (isAfterFix) {
      console.log('═'.repeat(70))
      if (latestStatus === 'success') {
        console.log('✅ FIX VERIFIED - WORKFLOW IS WORKING!')
        console.log('═'.repeat(70))
        console.log()
        console.log('The workflow executed successfully after the fix!')
        console.log()
      } else {
        console.log('⚠️  LATEST EXECUTION STILL FAILING')
        console.log('═'.repeat(70))
        console.log()
        console.log('The fix was applied but the workflow still has errors.')
        console.log('This may be due to:')
        console.log('  1. No orders with "Ready to Sync" status in Google Sheet')
        console.log('  2. Google Sheets permission issues')
        console.log('  3. Other workflow logic errors')
        console.log()
        console.log('View execution: https://automation.growthcohq.com/execution/' + latestExec.id)
        console.log()
      }
    } else {
      console.log('═'.repeat(70))
      console.log('ℹ️  WAITING FOR NEXT EXECUTION')
      console.log('═'.repeat(70))
      console.log()
      console.log('No new executions yet after the fix.')
      console.log('The workflow will run automatically in the next scheduled interval.')
      console.log()
      console.log('Check back in ~15 minutes or manually trigger it in n8n:')
      console.log('https://automation.growthcohq.com/workflow/' + WORKFLOW_ID)
      console.log()
    }

    // Get updated statistics
    const stats = await n8nClient.getWorkflowStats(WORKFLOW_ID)
    console.log('Current Statistics:')
    console.log(`  Total: ${stats.total}`)
    console.log(`  ✅ Success: ${stats.success}`)
    console.log(`  ❌ Errors: ${stats.error}`)
    if (stats.total > 0) {
      const rate = (stats.success / stats.total * 100).toFixed(2)
      console.log(`  Success rate: ${rate}%`)
    }
    console.log()

  } catch (error) {
    console.error('❌ Verification error:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

verifyFix()
